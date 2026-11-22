// Melayani hasil build halaman web (game/dist) dari server yang sama dengan API dan game,
// supaya bisa di-hosting di satu alamat (misalnya lewat Cloudflare Tunnel).
// Hanya aktif kalau folder game/dist ada (jalankan: npm run build --prefix game).
import { createReadStream, existsSync, statSync, readFileSync } from "node:fs";
import { join, normalize, extname, dirname, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = normalize(process.env.WEB_DIST || join(here, "..", "game", "dist"));

export const staticAktif = existsSync(join(ROOT, "index.html"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
};

// Teks (JS/CSS/HTML/JSON/SVG) dikompres sekali lalu disimpan di memori, supaya hemat unggahan lewat tunnel.
const BISA_GZIP = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".gltf", ".wasm"]);
const cacheGzip = new Map(); // file -> { mtime, buf }
function gzipFile(file, st) {
  const c = cacheGzip.get(file);
  if (c && c.mtime === st.mtimeMs) return c.buf;
  const buf = gzipSync(readFileSync(file), { level: 6 });
  cacheGzip.set(file, { mtime: st.mtimeMs, buf });
  return buf;
}

// Mengembalikan true kalau permintaan sudah dilayani.
export function serveStatic(req, res) {
  if (!staticAktif || (req.method !== "GET" && req.method !== "HEAD")) return false;
  let path;
  try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return false; }
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  // Cegah keluar dari folder dist (../).
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return false;
  let st;
  try { st = statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const ext = extname(file).toLowerCase();
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": st.size,
    "X-Content-Type-Options": "nosniff",
    // File di /assets diberi hash oleh Vite, jadi aman disimpan lama; HTML selalu dicek ulang.
    "Cache-Control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  };
  if (BISA_GZIP.has(ext)) headers["Vary"] = "Accept-Encoding";
  if (BISA_GZIP.has(ext) && /gzip/.test(String(req.headers["accept-encoding"] || ""))) {
    const buf = gzipFile(file, st);
    res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": buf.length });
    res.end(req.method === "HEAD" ? undefined : buf);
    return true;
  }
  res.writeHead(200, headers);
  if (req.method === "HEAD") return res.end(), true;
  createReadStream(file).pipe(res);
  return true;
}

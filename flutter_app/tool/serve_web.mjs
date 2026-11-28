// Menyajikan versi web aplikasi Flutter (build/web) dan meneruskan /api/... ke server Bimbel Pro,
// supaya halaman dan API berada di alamat yang sama (cookie sesi HttpOnly tetap bekerja).
// Server Bimbel Pro sendiri tidak diubah.
//   flutter build web
//   node tool/serve_web.mjs                       -> http://localhost:8080, API ke http://localhost:2567
//   node tool/serve_web.mjs --port 8090 --api http://localhost:2600
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : bawaan;
};
const PORT = Number(arg("--port", 8080));
const API = new URL(arg("--api", "http://localhost:2567"));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "web");

const TIPE = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".ttf": "font/ttf", ".otf": "font/otf", ".woff2": "font/woff2", ".bin": "application/octet-stream",
};

function teruskan(req, res) {
  const target = new URL(req.url, API);
  const headers = { ...req.headers, host: target.host };
  const keluar = http.request(target, { method: req.method, headers }, (jawab) => {
    res.writeHead(jawab.statusCode || 502, jawab.headers);
    jawab.pipe(res);
  });
  keluar.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Server Bimbel Pro tidak bisa dihubungi." }));
  });
  req.pipe(keluar);
}

async function berkas(req, res) {
  const jalur = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(ROOT, jalur));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    file = join(ROOT, "index.html"); // jalur aplikasi -> index.html
  }
  try {
    const isi = await readFile(file);
    res.writeHead(200, { "Content-Type": TIPE[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(isi);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("build/web belum ada. Jalankan dulu: flutter build web");
  }
}

http
  .createServer((req, res) => (req.url.startsWith("/api/") ? teruskan(req, res) : berkas(req, res)))
  .listen(PORT, () => console.log(`Bimbel Pro (Flutter web): http://localhost:${PORT}  ->  API ${API.origin}`));

// Menjalankan Bimbel Pro untuk tester lewat Cloudflare Tunnel (gratis, tanpa akun).
//   npm run online            -> build halaman web, buka tunnel, jalankan server
//   npm run online -- --no-build   -> lewati build (kalau kode tidak berubah)
// Alamat https://....trycloudflare.com berganti setiap kali dijalankan, dan hanya
// bisa dibuka selama laptop menyala dan jendela ini terbuka. Tekan Ctrl+C untuk berhenti.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.GAME_SERVER_PORT || "2567";
const isWin = process.platform === "win32";

function cariCloudflared() {
  const kandidat = [
    process.env.CLOUDFLARED,
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
  ].filter(Boolean);
  for (const k of kandidat) if (existsSync(k)) return k;
  const r = spawnSync(isWin ? "where" : "which", ["cloudflared"], { encoding: "utf8" });
  if (r.status === 0) return r.stdout.split(/\r?\n/)[0].trim();
  return null;
}

const cloudflared = cariCloudflared();
if (!cloudflared) {
  console.error("cloudflared belum terpasang. Pasang dulu dengan:\n  winget install --id Cloudflare.cloudflared\nlalu buka terminal baru dan jalankan lagi: npm run online");
  process.exit(1);
}

if (!process.argv.includes("--no-build")) {
  console.log("Membangun halaman web (game/dist)...");
  const b = spawnSync("npm run build --prefix game", { cwd: root, stdio: "inherit", shell: true });
  if (b.status !== 0) process.exit(b.status || 1);
}

console.log("Membuka Cloudflare Tunnel...");
const tunnel = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`], { cwd: root });
let server = null;

function mulaiServer(appUrl) {
  server = spawn(process.execPath, ["index.js"], {
    cwd: join(root, "server"),
    stdio: "inherit",
    env: { ...process.env, GAME_SERVER_PORT: PORT, APP_URL: appUrl, COOKIE_SECURE: "1", TRUST_PROXY: "1" },
  });
  server.on("exit", (code) => { console.log(`Server berhenti (kode ${code}).`); berhenti(); });
  console.log(`\n========================================================\n  Bimbel Pro online untuk tester:\n  ${appUrl}\n  Halaman orang tua: ${appUrl}/orangtua.html\n========================================================\n`);
}

let buffer = "";
const bacaLog = (chunk) => {
  const teks = chunk.toString();
  if (server) return;
  buffer += teks;
  const m = buffer.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com\b/);
  if (m) mulaiServer(m[0]);
};
tunnel.stdout.on("data", bacaLog);
tunnel.stderr.on("data", bacaLog);
tunnel.on("exit", (code) => {
  if (!server) console.error("Tunnel gagal dibuka:\n" + buffer.slice(-2000));
  else console.log(`Tunnel tertutup (kode ${code}).`);
  berhenti();
});

let selesai = false;
function berhenti() {
  if (selesai) return;
  selesai = true;
  try { tunnel.kill(); } catch {}
  try { server?.kill(); } catch {}
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", berhenti);
process.on("SIGTERM", berhenti);

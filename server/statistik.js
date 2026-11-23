import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db.js";
import { akunOnlineArena } from "./social.js";

const DURASI_AKTIF = 120_000;
const aktivitas = new Map();
const digest = (value) => createHash("sha256").update(value).digest();
const tokenAdmin = process.env.BIMBEL_ADMIN_TOKEN?.trim();
const hashAdmin = tokenAdmin?.length >= 32 ? digest(tokenAdmin) : null;

export function aksesStatistik(token) {
  return Boolean(hashAdmin && typeof token === "string" && timingSafeEqual(hashAdmin, digest(token)));
}

export function catatAktivitas(sesi) {
  if (sesi) aktivitas.set(sesi.token_hash, Date.now() + DURASI_AKTIF);
}

function bersihkanAktivitas() {
  const sekarang = Date.now();
  for (const [hash, batas] of aktivitas) {
    if (batas <= sekarang) aktivitas.delete(hash);
  }
}

setInterval(bersihkanAktivitas, DURASI_AKTIF).unref();

export function statistikAdmin(jenis, halaman) {
  bersihkanAktivitas();
  const arena = akunOnlineArena();
  const aktif = new Set(arena);
  const sesiAktif = db.prepare("SELECT role, parent_id, child_id FROM sessions WHERE token_hash = ? AND expires_at > ?");
  const sekarang = Date.now();
  for (const hash of aktivitas.keys()) {
    const sesi = sesiAktif.get(hash, sekarang);
    if (!sesi) aktivitas.delete(hash);
    else aktif.add(sesi.role === "anak" ? `a${sesi.child_id}` : `o${sesi.parent_id}`);
  }
  const jumlah = {
    orangTua: db.prepare("SELECT COUNT(*) AS jumlah FROM parents").get().jumlah,
    anak: db.prepare("SELECT COUNT(*) AS jumlah FROM children").get().jumlah,
    aktif: aktif.size,
    arena: arena.size,
  };
  if (jenis !== "orangTua" && jenis !== "anak") return jumlah;

  const ukuran = 25;
  const totalHalaman = Math.max(1, Math.ceil(jumlah[jenis] / ukuran));
  const halamanAktif = Number.isSafeInteger(halaman) ? Math.min(Math.max(halaman, 1), totalHalaman) : 1;
  const kueri = jenis === "anak"
    ? "SELECT id, name, login_anak AS login, negara, created_at AS dibuat FROM children ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
    : `SELECT p.id, p.name, l.login, p.negara, p.created_at AS dibuat
       FROM parents p LEFT JOIN login_id_ortu l ON l.parent_id = p.id
       ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`;
  const awalan = jenis === "anak" ? "a" : "o";
  const daftar = db.prepare(kueri).all(ukuran, (halamanAktif - 1) * ukuran).map(({ id, ...akun }) => {
    const uid = awalan + id;
    return { ...akun, status: arena.has(uid) ? "Online di Arena" : aktif.has(uid) ? "Aktif" : "Offline" };
  });
  return { ...jumlah, akun: { daftar, halaman: halamanAktif, totalHalaman } };
}

import { db } from "./db.js";
import { avatarOr } from "../shared/avatars.js";
import { posisiMuridBelajar } from "../shared/kursi-bimbel.js";

const MASA_AKTIF = 90_000;
const sesiBelajar = new Map();
const pemantauBelajar = new Set();
const ambilAnak = db.prepare(`
  SELECT c.id, c.name, c.avatar, c.color, c.aksesori_pakai, c.xp, c.aura_pakai
  FROM sessions s JOIN children c ON c.id = s.child_id
  WHERE s.token_hash = ? AND s.role = 'anak' AND s.expires_at > ? AND c.kelas > 0
`);

export function ubahStatusBelajar(sesi, tab, mulai) {
  const hash = sesi.token_hash;
  const tabs = sesiBelajar.get(hash) || new Map();
  tabs.delete(tab);
  if (mulai) {
    if (tabs.size >= 8) tabs.delete(tabs.keys().next().value);
    tabs.set(tab, Date.now() + MASA_AKTIF);
  }
  if (tabs.size) sesiBelajar.set(hash, tabs);
  else sesiBelajar.delete(hash);
}

export function pantauStatusBelajar(segarkan) {
  pemantauBelajar.add(segarkan);
  return () => pemantauBelajar.delete(segarkan);
}

export function akhiriBelajarDashboard(sesi) {
  if (!sesiBelajar.delete(sesi.token_hash)) return;
  for (const segarkan of pemantauBelajar) segarkan();
}

export function daftarMuridBelajar(sekarang = Date.now()) {
  const murid = new Map();
  for (const [hash, tabs] of sesiBelajar) {
    for (const [tab, batas] of tabs) {
      if (batas <= sekarang) tabs.delete(tab);
    }
    const anak = tabs.size ? ambilAnak.get(hash, sekarang) : null;
    if (anak) murid.set(`a${anak.id}`, anak);
    else sesiBelajar.delete(hash);
  }
  return murid;
}

export function muridBelajarPublik() {
  return Array.from(daftarMuridBelajar().values(), ({ avatar, color }, indeks) => ({
    avatar: avatarOr(avatar),
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#4f9cf0",
    ...posisiMuridBelajar(indeks),
  }));
}

setInterval(daftarMuridBelajar, MASA_AKTIF).unref();

// Aura avatar menurut level anak. Level naik setiap XP_PER_LEVEL XP dari Ruang Pintar.
// PENGATURAN PUSAT: ubah tingkatan aura di daftar AURA (level awal, nama, warna).
// Level 1–10 tidak punya aura.
export const XP_PER_LEVEL = 100;

export const AURA = [
  { dari: 11, id: "perunggu", nama: "Aura Perunggu", warna: ["#f0a463", "#b8692e"] },
  { dari: 21, id: "perak",    nama: "Aura Perak",    warna: ["#eef3fb", "#9aa7bd"] },
  { dari: 31, id: "emas",     nama: "Aura Emas",     warna: ["#ffe27a", "#e0a400"] },
  { dari: 41, id: "berlian",  nama: "Aura Berlian",  warna: ["#b5f4ff", "#36b8e0"] },
  { dari: 51, id: "pelangi",  nama: "Aura Pelangi",  warna: ["#ff6b8b", "#ffcf40", "#5fd38d", "#4fa3ff", "#b07cff"] },
];

export const levelDariXp = (xp) => Math.floor(Math.max(0, Math.floor(Number(xp) || 0)) / XP_PER_LEVEL) + 1;

// Aura untuk level tertentu, atau null (level 1–10).
export function auraUntukLevel(level) {
  let a = null;
  for (const x of AURA) if (level >= x.dari) a = x;
  return a;
}

export const auraById = (id) => AURA.find((x) => x.id === id) || null;

// Urutan 0 (perunggu) … 4 (pelangi): makin tinggi makin besar dan ramai.
export const auraUrutan = (id) => AURA.findIndex((x) => x.id === id);

// Aura berikutnya yang belum didapat (untuk motivasi), atau null bila sudah tertinggi.
export const auraBerikutnya = (level) => AURA.find((x) => x.dari > level) || null;

// Aksesori avatar yang dibeli anak di Toko Aksesori (kios di alun-alun arena) dengan bintang dari Ruang Pintar.
// Satu aksesori per tempat: kepala, wajah, leher. Dipakai bersama oleh server, arena, dan Ruang Pintar.

export const SLOT = [
  { id: "kepala", name: "Kepala" },
  { id: "wajah", name: "Wajah" },
  { id: "leher", name: "Leher" },
];

export const AKSESORI = [
  { id: "pita", name: "Pita besar", slot: "kepala", harga: 8 },
  { id: "topi-pesta", name: "Topi pesta", slot: "kepala", harga: 10 },
  { id: "topi-penyihir", name: "Topi penyihir", slot: "kepala", harga: 20 },
  { id: "mahkota", name: "Mahkota", slot: "kepala", harga: 25 },
  { id: "kacamata", name: "Kacamata", slot: "wajah", harga: 12 },
  { id: "kacamata-hitam", name: "Kacamata hitam", slot: "wajah", harga: 15 },
  { id: "syal", name: "Syal", slot: "leher", harga: 10 },
  { id: "medali", name: "Medali emas", slot: "leher", harga: 30 },
];

export const aksesoriById = (id) => AKSESORI.find((a) => a.id === id) || null;

// Daftar id aksesori yang sah, paling banyak satu per tempat. Menerima array atau "a,b".
export function rapikanAksesori(list) {
  const arr = Array.isArray(list) ? list : String(list || "").split(",");
  const per = {};
  for (const id of arr) {
    const a = aksesoriById(String(id).trim());
    if (a) per[a.slot] = a.id;
  }
  return SLOT.map((s) => per[s.id]).filter(Boolean);
}

export const slotDipakai = (list) => new Set(rapikanAksesori(list).map((id) => aksesoriById(id).slot));

// ---------- gambar 2D (SVG, kotak 0..100) ----------
// p = { top, eyeY, gap } dari gambar hewan: titik atas kepala, tinggi mata, jarak mata dari tengah.
const INK = "#2b2f3a";
export function aksesoriSvg(id, p) {
  const T = Math.min(p.top, p.eyeY - 12) + 2;   // kodok: mata di atas kepala, topi sedikit lebih tinggi
  const g = p.gap, E = p.eyeY;
  switch (id) {
    case "pita":
      return `<path d="M50 ${T} l-13 -9 v18 z M50 ${T} l13 -9 v18 z" fill="#ff5c8a" stroke="#0002"/><circle cx="50" cy="${T}" r="4" fill="#ff8fb0" stroke="#0002"/>`;
    case "topi-pesta":
      return `<path d="M38 ${T + 4} L62 ${T + 4} L50 ${T - 22} Z" fill="#4fb3f0"/>
              <path d="M41 ${T - 3} L59 ${T - 3} M44 ${T - 11} L56 ${T - 11}" stroke="#ffd34d" stroke-width="3"/>
              <circle cx="50" cy="${T - 23}" r="4" fill="#ff5c8a"/>`;
    case "topi-penyihir":
      return `<ellipse cx="50" cy="${T + 4}" rx="24" ry="5" fill="#5b3f9e"/>
              <path d="M37 ${T + 4} L63 ${T + 4} L58 ${T - 28} Z" fill="#7a55c7"/>
              <path d="M53 ${T - 10} l1.6 3.4 3.7 .4 -2.8 2.5 .8 3.7 -3.3 -1.9 -3.3 1.9 .8 -3.7 -2.8 -2.5 3.7 -.4z" fill="#ffd34d"/>`;
    case "mahkota":
      return `<path d="M36 ${T + 5} L36 ${T - 7} L43 ${T - 1} L50 ${T - 11} L57 ${T - 1} L64 ${T - 7} L64 ${T + 5} Z" fill="#f5c542" stroke="#c9952a" stroke-width="1.2"/>
              <circle cx="50" cy="${T + 1}" r="2.6" fill="#ef4f6e"/><circle cx="41" cy="${T + 2}" r="1.8" fill="#4fb3f0"/><circle cx="59" cy="${T + 2}" r="1.8" fill="#4fb3f0"/>`;
    case "kacamata":
      return `<circle cx="${50 - g}" cy="${E}" r="7.5" fill="#fff3" stroke="#3a6fd8" stroke-width="2.2"/><circle cx="${50 + g}" cy="${E}" r="7.5" fill="#fff3" stroke="#3a6fd8" stroke-width="2.2"/>
              <path d="M${50 - g + 7.5} ${E} H${50 + g - 7.5}" stroke="#3a6fd8" stroke-width="2.2"/>`;
    case "kacamata-hitam":
      return `<rect x="${50 - g - 8}" y="${E - 6}" width="16" height="11" rx="4" fill="#1f232b"/><rect x="${50 + g - 8}" y="${E - 6}" width="16" height="11" rx="4" fill="#1f232b"/>
              <path d="M${50 - g + 8} ${E - 2} H${50 + g - 8}" stroke="#1f232b" stroke-width="2.5"/>
              <path d="M${50 - g - 4} ${E - 3} l4 -1" stroke="#fff8" stroke-width="1.5" stroke-linecap="round"/>`;
    case "syal":
      return `<path d="M30 60 Q50 70 70 60 L70 66 Q50 76 30 66 Z" fill="#ef4f6e"/>
              <path d="M58 66 L62 84 L54 84 L52 68 Z" fill="#ef4f6e"/><path d="M54 84 h8 M55 80 h6" stroke="#fff8" stroke-width="1.5"/>`;
    case "medali":
      return `<path d="M42 58 L50 72 L58 58" stroke="#4f7fe0" stroke-width="4" fill="none"/>
              <circle cx="50" cy="75" r="7" fill="#f5c542" stroke="#c9952a" stroke-width="1.5"/><path d="M50 71 v8" stroke="#c9952a" stroke-width="1.5"/>`;
    default:
      return "";
  }
}

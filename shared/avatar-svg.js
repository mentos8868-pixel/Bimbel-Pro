// Gambar avatar 2D (SVG) untuk pemilih avatar dan daftar pemain.
// accent = warna pilihan pemain, dipakai untuk aksesori (dasi kupu-kupu, bunga, pita, topi).
import { parseAvatar, DEFAULT_AVATAR, DINO_AVATAR } from "./avatars.js";
import { rapikanAksesori, aksesoriById, aksesoriSvg } from "./aksesori.js";

const INK = "#2b2f3a";

function eyes(cx, cy, gap = 9, r = 4) {
  return [-gap, gap].map((d) => `<circle cx="${cx + d}" cy="${cy}" r="${r}" fill="${INK}"/><circle cx="${cx + d + 1.3}" cy="${cy - 1.4}" r="${r * 0.35}" fill="#fff"/>`).join("");
}
const cheeks = (cy, gap = 15) => `<ellipse cx="${50 - gap}" cy="${cy}" rx="4.5" ry="2.8" fill="#ff8fa8" opacity=".55"/><ellipse cx="${50 + gap}" cy="${cy}" rx="4.5" ry="2.8" fill="#ff8fa8" opacity=".55"/>`;
const smile = (cy, w = 6) => `<path d="M${50 - w} ${cy} Q50 ${cy + w * 0.9} ${50 + w} ${cy}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

// Bagian per jenis hewan. Mengembalikan { back, body, head, face, top } (y titik atas kepala untuk aksesori).
function familyParts(f) {
  const { body: c, belly: b, accent: a } = f;
  switch (f.id) {
    case "ulat":
      return {
        back: [28, 72].map((x) => `<circle cx="${x}" cy="80" r="13" fill="${c}"/><circle cx="${x}" cy="80" r="5" fill="${b}"/>`).join(""),
        body: `<circle cx="50" cy="78" r="16" fill="${c}"/><ellipse cx="50" cy="81" rx="9" ry="8" fill="${b}"/>`,
        head: `<path d="M41 22 L33 8" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/><path d="M59 22 L67 8" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/>
               <circle cx="33" cy="8" r="4" fill="${a}"/><circle cx="67" cy="8" r="4" fill="${a}"/><circle cx="50" cy="44" r="25" fill="${c}"/>`,
        face: eyes(50, 42) + cheeks(51) + smile(52),
        top: 20, eyeY: 42, gap: 9,
      };
    case "robo":
      return {
        back: "",
        body: `<rect x="29" y="62" width="42" height="32" rx="12" fill="${c}"/><rect x="38" y="70" width="24" height="15" rx="5" fill="${b}"/><circle cx="44" cy="77" r="2.5" fill="${a}"/><circle cx="56" cy="77" r="2.5" fill="#ef6f5e"/>`,
        head: `<path d="M50 18 V8" stroke="${a}" stroke-width="2.5"/><circle cx="50" cy="7" r="4.5" fill="#ef6f5e"/>
               <rect x="22" y="17" width="56" height="48" rx="18" fill="${c}"/><rect x="17" y="34" width="6" height="14" rx="3" fill="${a}"/><rect x="77" y="34" width="6" height="14" rx="3" fill="${a}"/>
               <rect x="30" y="27" width="40" height="30" rx="11" fill="${b}"/>`,
        face: eyes(50, 40, 9, 4.5) + cheeks(49, 13) + smile(48, 5),
        top: 18, eyeY: 40, gap: 9,
      };
    case "beruang":
      return {
        back: "",
        body: `<ellipse cx="50" cy="78" rx="24" ry="18" fill="${c}"/><ellipse cx="50" cy="81" rx="14" ry="11" fill="${b}"/>`,
        head: `<circle cx="29" cy="22" r="9" fill="${c}"/><circle cx="71" cy="22" r="9" fill="${c}"/><circle cx="29" cy="22" r="4.5" fill="${b}"/><circle cx="71" cy="22" r="4.5" fill="${b}"/>
               <circle cx="50" cy="42" r="25" fill="${c}"/><ellipse cx="50" cy="51" rx="10" ry="7.5" fill="${b}"/><ellipse cx="50" cy="47.5" rx="3.5" ry="2.5" fill="${INK}"/>`,
        face: eyes(50, 38, 10) + cheeks(48, 17) + smile(51, 4),
        top: 18, eyeY: 38, gap: 10,
      };
    case "kelinci":
      return {
        back: "",
        body: `<ellipse cx="50" cy="78" rx="22" ry="18" fill="${c}"/><ellipse cx="50" cy="81" rx="12" ry="11" fill="${b}"/>`,
        head: `<ellipse cx="38" cy="14" rx="7" ry="17" fill="${c}"/><ellipse cx="62" cy="14" rx="7" ry="17" fill="${c}"/><ellipse cx="38" cy="15" rx="3.5" ry="12" fill="${b}"/><ellipse cx="62" cy="15" rx="3.5" ry="12" fill="${b}"/>
               <circle cx="50" cy="44" r="24" fill="${c}"/><path d="M47 49 L53 49 L50 52 Z" fill="${a}"/>`,
        face: eyes(50, 41) + cheeks(50) + `<path d="M50 52 V55 M46 56 Q50 58 54 56" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
        top: 22, eyeY: 41, gap: 9,
      };
    case "penguin":
      return {
        back: `<ellipse cx="25" cy="74" rx="6" ry="14" fill="${c}" transform="rotate(20 25 74)"/><ellipse cx="75" cy="74" rx="6" ry="14" fill="${c}" transform="rotate(-20 75 74)"/>`,
        body: `<ellipse cx="50" cy="76" rx="24" ry="20" fill="${c}"/><ellipse cx="50" cy="79" rx="16" ry="15" fill="${b}"/><ellipse cx="41" cy="95" rx="7" ry="3" fill="${a}"/><ellipse cx="59" cy="95" rx="7" ry="3" fill="${a}"/>`,
        head: `<circle cx="50" cy="42" r="26" fill="${c}"/><path d="M50 30 C 30 24, 24 50, 34 58 Q50 66 66 58 C 76 50, 70 24, 50 30 Z" fill="${b}"/><path d="M45 48 L55 48 L50 54 Z" fill="${a}"/>`,
        face: eyes(50, 41, 8, 3.8) + cheeks(51, 14),
        top: 17, eyeY: 41, gap: 8,
      };
    case "kodok":
    default:
      return {
        back: "",
        body: `<ellipse cx="50" cy="78" rx="24" ry="17" fill="${c}"/><ellipse cx="50" cy="80" rx="15" ry="11" fill="${b}"/>`,
        head: `<circle cx="35" cy="26" r="11" fill="${c}"/><circle cx="65" cy="26" r="11" fill="${c}"/><ellipse cx="50" cy="46" rx="29" ry="21" fill="${c}"/>
               <circle cx="35" cy="26" r="7" fill="#fff"/><circle cx="65" cy="26" r="7" fill="#fff"/>`,
        face: eyes(50, 26, 15, 4) + cheeks(50, 18) + `<path d="M36 50 Q50 61 64 50" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
        top: 17, eyeY: 26, gap: 15,
      };
  }
}

// Aksesori yang membedakan ayah, ibu, anak perempuan, dan anak laki-laki, per tempat
// (kepala, wajah, leher) supaya bisa diganti aksesori dari Toko.
function memberParts(m, p, accent) {
  switch (m.id) {
    case "ayah":
      return {
        wajah: `<path d="M50 ${p.eyeY + 14} q-7 -4 -13 2 q6 3 13 -1 q7 4 13 1 q-6 -6 -13 -2z" fill="#4a3426"/>`,
        leher: `<path d="M50 64 L39 58 L39 70 Z M50 64 L61 58 L61 70 Z" fill="${accent}"/><circle cx="50" cy="64" r="3.2" fill="${accent}" stroke="#0002"/>`,
      };
    case "ibu": {
      const cx = 68, cy = p.top + 6;
      const petals = [0, 72, 144, 216, 288].map((d) => {
        const r = (d * Math.PI) / 180;
        return `<circle cx="${(cx + Math.cos(r) * 5.5).toFixed(1)}" cy="${(cy + Math.sin(r) * 5.5).toFixed(1)}" r="4.5" fill="${accent}"/>`;
      }).join("");
      const lash = (x) => `<path d="M${x - 4} ${p.eyeY - 4} l-3 -3 M${x} ${p.eyeY - 5} v-4 M${x + 4} ${p.eyeY - 4} l3 -3" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
      return {
        kepala: petals + `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#ffd34d"/>`,
        bulu: lash(50 - p.gap) + lash(50 + p.gap),   // bulu mata tetap tampil walau memakai kacamata
        leher: `<path d="M43 64 Q50 70 57 64" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      };
    }
    case "putri": {
      const bow = (x) => `<path d="M${x} ${p.top + 4} l-8 -6 v12 z M${x} ${p.top + 4} l8 -6 v12 z" fill="${accent}"/><circle cx="${x}" cy="${p.top + 4}" r="2.6" fill="${accent}" stroke="#0002"/>`;
      return { kepala: bow(29) + bow(71) };
    }
    case "putra":
    default:
      return {
        kepala: `<path d="M28 ${p.top + 10} Q50 ${p.top - 12} 72 ${p.top + 10} Z" fill="${accent}"/><path d="M60 ${p.top + 9} Q76 ${p.top + 7} 82 ${p.top + 12} Q70 ${p.top + 13} 60 ${p.top + 11}z" fill="${accent}" stroke="#0002"/>
              <circle cx="50" cy="${p.top - 1}" r="2.5" fill="#fff8"/>`,
      };
  }
}

// Mengembalikan string <svg>. sized = true: anak digambar lebih kecil daripada orang tua.
// aksesori = id aksesori dari Toko (array atau "a,b"); menggantikan hiasan bawaan di tempat yang sama.
export function avatarSvg(id, accent = "#4f9cf0", { sized = false, aksesori = [] } = {}) {
  if (id === DINO_AVATAR) {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="25" y="65" width="50" height="31" rx="13" fill="#e6d7bd"/>
      <path d="M37 82l7 2h8l4-8h5l3 4-5 2-2 7h-3v-3h-7v3h-3v-3z" fill="#527f8e"/>
      <ellipse cx="50" cy="39" rx="28" ry="32" fill="#33241f"/>
      <ellipse cx="50" cy="43" rx="23" ry="25" fill="#efae80"/>
      <path d="M24 42Q22 10 46 8Q70 7 74 35Q62 34 58 20Q44 37 24 42Z" fill="#33241f"/>
      ${eyes(50, 44, 9, 3.7)}${cheeks(52)}${smile(54)}
    </svg>`;
  }
  const a = parseAvatar(id) || parseAvatar(DEFAULT_AVATAR);
  const p = familyParts(a.family);
  const s = sized ? a.member.scale / 1.15 : 1;
  const pakai = rapikanAksesori(aksesori);
  const slots = new Set(pakai.map((x) => aksesoriById(x).slot));
  const mp = memberParts(a.member, p, accent);
  const bawaan = ["wajah", "bulu", "leher", "kepala"].filter((k) => mp[k] && !slots.has(k)).map((k) => mp[k]).join("");
  // Urutan: hiasan leher dulu (di atas badan), lalu wajah, lalu kepala paling atas.
  const urut = ["leher", "wajah", "kepala"];
  const beli = pakai.slice().sort((x, y) => urut.indexOf(aksesoriById(x).slot) - urut.indexOf(aksesoriById(y).slot)).map((x) => aksesoriSvg(x, p)).join("");
  const inner = p.back + p.body + p.head + p.face + bawaan + beli;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="97" rx="${22 * s}" ry="3" fill="#0002"/>
    <g transform="translate(50 98) scale(${s}) translate(-50 -98)">${inner}</g></svg>`;
}

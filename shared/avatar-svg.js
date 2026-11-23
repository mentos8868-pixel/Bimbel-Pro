// Gambar avatar 2D (SVG) untuk pemilih avatar dan daftar pemain.
// accent = warna pilihan pemain, dipakai untuk aksesori (dasi kupu-kupu, bunga, pita, topi).
import { parseAvatar, DEFAULT_AVATAR } from "./avatars.js";
import { rapikanAksesori, aksesoriById, aksesoriSvg } from "./aksesori.js";
import { auraById, auraUrutan } from "./aura.js";

// Aura di belakang avatar (lihat shared/aura.js). Makin tinggi tingkatnya, makin besar dan ramai:
// perunggu/perak = cahaya lembut; emas = + sinar; berlian = + kilau; pelangi = cincin warna-warni.
let auraNo = 0;
function auraSvg(id) {
  const a = auraById(id);
  if (!a) return "";
  const u = auraUrutan(id), g = `aura${++auraNo}`, [c1, c2] = a.warna;
  const r = 40 + u * 2.5;
  let s = `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${c1}" stop-opacity=".95"/>
    <stop offset=".6" stop-color="${c2}" stop-opacity=".45"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="50" cy="56" r="${r}" fill="url(#${g})"/>`;
  if (u >= 2) {   // sinar
    s += Array.from({ length: 12 }, (_, i) => {
      const t = (i * 30 * Math.PI) / 180, x1 = 50 + Math.cos(t) * 30, y1 = 56 + Math.sin(t) * 30, x2 = 50 + Math.cos(t) * (r - 2), y2 = 56 + Math.sin(t) * (r - 2);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c1}" stroke-width="${i % 2 ? 1.5 : 3}" stroke-linecap="round" opacity=".7"/>`;
    }).join("");
  }
  if (u >= 3) {   // kilau bintang kecil
    const star = (x, y, k) => `<path d="M${x} ${y - k} L${x + k * 0.3} ${y - k * 0.3} L${x + k} ${y} L${x + k * 0.3} ${y + k * 0.3} L${x} ${y + k} L${x - k * 0.3} ${y + k * 0.3} L${x - k} ${y} L${x - k * 0.3} ${y - k * 0.3}Z" fill="#fff"/>`;
    s += star(14, 22, 5) + star(87, 30, 4) + star(10, 70, 3.5) + star(90, 76, 5);
  }
  if (a.warna.length > 2) {   // cincin pelangi
    const n = a.warna.length, keliling = 2 * Math.PI * 44;
    s += a.warna.map((w, i) => `<circle cx="50" cy="56" r="44" fill="none" stroke="${w}" stroke-width="3.5" stroke-dasharray="${keliling / n} ${keliling}" stroke-dashoffset="${(-keliling * i) / n}" opacity=".9"/>`).join("");
  }
  return s;
}

const INK = "#2b2f3a";

function eyes(cx, cy, gap = 9, r = 4) {
  return [-gap, gap].map((d) => `<circle cx="${cx + d}" cy="${cy}" r="${r}" fill="${INK}"/><circle cx="${cx + d + 1.3}" cy="${cy - 1.4}" r="${r * 0.35}" fill="#fff"/>`).join("");
}
const cheeks = (cy, gap = 15) => `<ellipse cx="${50 - gap}" cy="${cy}" rx="4.5" ry="2.8" fill="#ff8fa8" opacity=".55"/><ellipse cx="${50 + gap}" cy="${cy}" rx="4.5" ry="2.8" fill="#ff8fa8" opacity=".55"/>`;
const smile = (cy, w = 6) => `<path d="M${50 - w} ${cy} Q50 ${cy + w * 0.9} ${50 + w} ${cy}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

// Badan bulat biasa (dipakai sebagian besar shio).
const badan = (c, b) => `<ellipse cx="50" cy="78" rx="22" ry="18" fill="${c}"/><ellipse cx="50" cy="81" rx="13" ry="11" fill="${b}"/>`;

// Bagian per jenis hewan. Mengembalikan { back, body, head, face, top } (y titik atas kepala untuk aksesori).
function familyParts(f) {
  const { body: c, belly: b, accent: a } = f;
  switch (f.id) {
    case "dino":
      return {
        back: `<path d="M64 49 Q85 55 75 75 Q72 80 66 78 Q72 66 60 62Z" fill="${a}"/>
          <path d="M69 55 L75 58" stroke="#cf8596" stroke-width="3" stroke-linecap="round"/>`,
        body: `<rect x="27" y="62" width="46" height="31" rx="12" fill="${b}"/>
          <path d="M46 83 Q41 82 41 77 L39 73 Q34 74 35 70 Q38 66 42 69 L46 77 Q55 74 61 80 L68 78 Q66 82 60 84 L59 88 H55 V85 H50 V88 H46Z" fill="#4d798b"/>
          <path d="M30 78 l3 2 3-2-1 3 2 2-3-1-2 2v-3z M62 69 l2 2 3-1-2 2 1 3-2-2-3 1 2-2z" fill="#bd955e"/>`,
        head: `<ellipse cx="50" cy="41" rx="26" ry="27" fill="${a}"/>
          <circle cx="28" cy="46" r="5" fill="${c}"/><circle cx="72" cy="46" r="5" fill="${c}"/>
          <ellipse cx="50" cy="44" rx="22" ry="23" fill="${c}"/>
          <path d="M25 45 Q21 16 47 15 Q76 13 75 42 Q64 35 57 25 Q45 38 27 41Z" fill="${a}"/>`,
        face: eyes(50, 44, 9, 4) + cheeks(52) + `<path d="M43 52 Q50 55 57 52 Q55 61 50 61 Q45 61 43 52Z" fill="#843f37"/>
          <path d="M45 53 Q50 54 55 53 L54 55 H46Z" fill="#fffaf4"/>`,
        top: 15, eyeY: 44, gap: 9,
      };
    case "manusia":
      return {
        back: "",
        body: `<rect x="31" y="62" width="38" height="31" rx="14" fill="${b}"/><path d="M42 65 L50 73 L58 65" fill="none" stroke="#edf4ff" stroke-width="3"/>`,
        head: `<circle cx="28" cy="43" r="5" fill="${c}"/><circle cx="72" cy="43" r="5" fill="${c}"/>
          <ellipse cx="50" cy="42" rx="22" ry="24" fill="${c}"/><path d="M27 41 Q23 16 49 15 Q75 16 73 38 Q61 35 55 26 Q45 39 27 41Z" fill="${a}"/>`,
        face: eyes(50, 44, 8, 3.5) + cheeks(52) + smile(53, 5),
        top: 16, eyeY: 44, gap: 8,
      };
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
    // ---------- 12 shio ----------
    case "tikus":
      return {
        back: `<path d="M68 88 Q90 90 88 70" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        body: badan(c, b),
        head: `<circle cx="29" cy="25" r="12" fill="${c}"/><circle cx="71" cy="25" r="12" fill="${c}"/><circle cx="29" cy="25" r="7" fill="${a}"/><circle cx="71" cy="25" r="7" fill="${a}"/>
               <circle cx="50" cy="45" r="23" fill="${c}"/><circle cx="50" cy="52" r="3" fill="${a}"/>
               <path d="M38 52 H27 M38 55 L28 58 M62 52 H73 M62 55 L72 58" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`,
        face: eyes(50, 43, 9, 3.8) + cheeks(51, 15) + smile(56, 3),
        top: 20, eyeY: 43, gap: 9,
      };
    case "kerbau":
      return {
        back: "",
        body: badan(c, b),
        head: `<path d="M31 28 Q13 26 14 9 Q22 22 37 21Z" fill="${a}"/><path d="M69 28 Q87 26 86 9 Q78 22 63 21Z" fill="${a}"/>
               <ellipse cx="25" cy="38" rx="8" ry="4.5" fill="${c}" transform="rotate(-20 25 38)"/><ellipse cx="75" cy="38" rx="8" ry="4.5" fill="${c}" transform="rotate(20 75 38)"/>
               <circle cx="50" cy="42" r="24" fill="${c}"/><ellipse cx="50" cy="54" rx="14" ry="9" fill="${b}"/>
               <ellipse cx="45" cy="54" rx="2" ry="2.8" fill="${INK}"/><ellipse cx="55" cy="54" rx="2" ry="2.8" fill="${INK}"/>`,
        face: eyes(50, 38, 10) + cheeks(46, 18),
        top: 19, eyeY: 38, gap: 10,
      };
    case "macan":
      return {
        back: "",
        body: badan(c, b) + `<path d="M30 72 q5 3 3 8 M70 72 q-5 3 -3 8" stroke="${a}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
        head: `<circle cx="31" cy="23" r="8" fill="${c}"/><circle cx="69" cy="23" r="8" fill="${c}"/><circle cx="31" cy="23" r="4" fill="${b}"/><circle cx="69" cy="23" r="4" fill="${b}"/>
               <circle cx="50" cy="43" r="24" fill="${c}"/>
               <path d="M50 20 v7 M43 21 l1.5 6 M57 21 l-1.5 6 M27 40 h6 M28 46 h5 M73 40 h-6 M72 46 h-5" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/>
               <ellipse cx="50" cy="53" rx="11" ry="7.5" fill="${b}"/><path d="M46.5 49 h7 l-3.5 3.5z" fill="#e2687e"/>`,
        face: eyes(50, 40, 10) + smile(55, 4),
        top: 19, eyeY: 40, gap: 10,
      };
    case "naga":
      return {
        back: `<path d="M70 82 Q88 84 90 70 Q84 76 78 74Z" fill="${c}"/>`,
        body: badan(c, b) + `<path d="M36 64 l4 -6 l4 6 M46 62 l4 -6 l4 6 M56 64 l4 -6 l4 6" fill="${a}" stroke="${a}" stroke-width="1"/>`,
        head: `<path d="M38 24 L31 6 M33 14 L26 12 M62 24 L69 6 M67 14 L74 12" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
               <ellipse cx="50" cy="43" rx="24" ry="23" fill="${c}"/><ellipse cx="50" cy="54" rx="13" ry="8.5" fill="${b}"/>
               <circle cx="45" cy="52" r="1.6" fill="${INK}"/><circle cx="55" cy="52" r="1.6" fill="${INK}"/>
               <path d="M38 56 Q26 58 22 50 M62 56 Q74 58 78 50" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
        face: eyes(50, 39, 10) + smile(57, 4),
        top: 20, eyeY: 39, gap: 10,
      };
    case "ular":
      return {
        back: "",
        body: `<ellipse cx="50" cy="88" rx="30" ry="9" fill="${c}"/><ellipse cx="50" cy="77" rx="22" ry="8" fill="${c}"/>
               <path d="M26 88 h48 M33 77 h34" stroke="${b}" stroke-width="2.5" stroke-dasharray="4 5" stroke-linecap="round"/>`,
        head: `<rect x="44" y="56" width="12" height="16" fill="${c}"/><ellipse cx="50" cy="44" rx="23" ry="20" fill="${c}"/>
               <path d="M50 58 v7 l-3 4 M50 65 l3 4" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>
               <path d="M40 28 q10 -6 20 0" stroke="${b}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        face: eyes(50, 42, 9) + cheeks(50, 16) + smile(52, 5),
        top: 24, eyeY: 42, gap: 9,
      };
    case "kuda":
      return {
        back: "",
        body: badan(c, b),
        head: `<path d="M33 26 L37 8 L44 22Z M67 26 L63 8 L56 22Z" fill="${c}"/>
               <ellipse cx="50" cy="44" rx="21" ry="25" fill="${c}"/><ellipse cx="50" cy="58" rx="14" ry="9.5" fill="${b}"/>
               <ellipse cx="45" cy="58" rx="2" ry="2.6" fill="${INK}"/><ellipse cx="55" cy="58" rx="2" ry="2.6" fill="${INK}"/>
               <path d="M42 20 Q50 13 58 20 Q55 26 50 23 Q45 27 42 20Z" fill="${a}"/><path d="M68 28 Q76 40 70 56 Q66 44 63 32Z" fill="${a}"/>`,
        face: eyes(50, 38, 10) + cheeks(48, 17),
        top: 18, eyeY: 38, gap: 10,
      };
    case "kambing":
      return {
        back: "",
        body: badan(c, b),
        head: `<path d="M39 24 Q26 6 18 20 Q24 16 31 28Z" fill="${a}"/><path d="M61 24 Q74 6 82 20 Q76 16 69 28Z" fill="${a}"/>
               <ellipse cx="25" cy="40" rx="9" ry="4.5" fill="${c}" transform="rotate(15 25 40)"/><ellipse cx="75" cy="40" rx="9" ry="4.5" fill="${c}" transform="rotate(-15 75 40)"/>
               <circle cx="50" cy="42" r="23" fill="${c}"/><path d="M45 63 L50 74 L55 63Z" fill="${a}"/><path d="M47 50 h6 l-3 3z" fill="#e2687e"/>`,
        face: eyes(50, 40, 9) + cheeks(49, 16) + smile(55, 4),
        top: 20, eyeY: 40, gap: 9,
      };
    case "monyet":
      return {
        back: `<path d="M70 86 Q92 84 86 66 Q82 60 78 66" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
        body: badan(c, b),
        head: `<circle cx="25" cy="44" r="9" fill="${c}"/><circle cx="75" cy="44" r="9" fill="${c}"/><circle cx="25" cy="44" r="5" fill="${b}"/><circle cx="75" cy="44" r="5" fill="${b}"/>
               <circle cx="50" cy="43" r="24" fill="${c}"/>
               <circle cx="42" cy="40" r="9.5" fill="${b}"/><circle cx="58" cy="40" r="9.5" fill="${b}"/><ellipse cx="50" cy="52" rx="14" ry="10" fill="${b}"/>
               <circle cx="47" cy="49" r="1.4" fill="${INK}"/><circle cx="53" cy="49" r="1.4" fill="${INK}"/>`,
        face: eyes(50, 40, 8, 3.6) + smile(54, 5),
        top: 19, eyeY: 40, gap: 8,
      };
    case "ayam":
      return {
        back: `<ellipse cx="28" cy="76" rx="7" ry="11" fill="${b}" transform="rotate(25 28 76)"/><ellipse cx="72" cy="76" rx="7" ry="11" fill="${b}" transform="rotate(-25 72 76)"/>`,
        body: badan(c, b) + `<path d="M42 95 v-5 M58 95 v-5" stroke="#f5a524" stroke-width="3" stroke-linecap="round"/>`,
        head: `<circle cx="44" cy="20" r="5.5" fill="${a}"/><circle cx="50" cy="17" r="6" fill="${a}"/><circle cx="56" cy="20" r="5.5" fill="${a}"/>
               <circle cx="50" cy="43" r="23" fill="${c}"/><path d="M44 47 L56 47 L50 55Z" fill="#f5a524"/><ellipse cx="50" cy="58" rx="3" ry="4" fill="${a}"/>`,
        face: eyes(50, 40, 9) + cheeks(48, 15),
        top: 20, eyeY: 40, gap: 9,
      };
    case "anjing":
      return {
        back: "",
        body: badan(c, b),
        head: `<circle cx="50" cy="43" r="24" fill="${c}"/><circle cx="60" cy="36" r="7" fill="${a}" opacity=".35"/>
               <ellipse cx="27" cy="42" rx="7.5" ry="15" fill="${a}" transform="rotate(18 27 42)"/><ellipse cx="73" cy="42" rx="7.5" ry="15" fill="${a}" transform="rotate(-18 73 42)"/>
               <ellipse cx="50" cy="53" rx="11" ry="8" fill="${b}"/><ellipse cx="50" cy="49" rx="4" ry="3" fill="${INK}"/>
               <path d="M50 57 q0 6 4 5" stroke="#e2687e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        face: eyes(50, 39, 10) + smile(55, 5),
        top: 19, eyeY: 39, gap: 10,
      };
    case "babi":
      return {
        back: `<path d="M71 82 q8 -2 6 -7 q-2 -4 -6 0" stroke="${a}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
        body: badan(c, b),
        head: `<path d="M28 30 L30 14 L42 22Z M72 30 L70 14 L58 22Z" fill="${a}"/>
               <circle cx="50" cy="43" r="25" fill="${c}"/><ellipse cx="50" cy="51" rx="10" ry="7" fill="${a}"/>
               <ellipse cx="46.5" cy="51" rx="2" ry="3" fill="#b8506a"/><ellipse cx="53.5" cy="51" rx="2" ry="3" fill="#b8506a"/>`,
        face: eyes(50, 38, 11) + cheeks(47, 19) + smile(59, 4),
        top: 18, eyeY: 38, gap: 11,
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
// aura = id aura dari level anak ("" = tanpa aura).
export function avatarSvg(id, accent = "#4f9cf0", { sized = false, aksesori = [], aura = "" } = {}) {
  const a = parseAvatar(id) || parseAvatar(DEFAULT_AVATAR);
  const p = familyParts(a.family);
  const s = sized ? a.member.scale / 1.15 : 1;
  const pakai = rapikanAksesori(aksesori);
  const slots = new Set(pakai.map((x) => aksesoriById(x).slot));
  const mp = a.family.id === "dino" ? {} : memberParts(a.member, p, accent);
  const bawaan = ["wajah", "bulu", "leher", "kepala"].filter((k) => mp[k] && !slots.has(k)).map((k) => mp[k]).join("");
  // Urutan: hiasan leher dulu (di atas badan), lalu wajah, lalu kepala paling atas.
  const urut = ["leher", "wajah", "kepala"];
  const beli = pakai.slice().sort((x, y) => urut.indexOf(aksesoriById(x).slot) - urut.indexOf(aksesoriById(y).slot)).map((x) => aksesoriSvg(x, p)).join("");
  const inner = p.back + p.body + p.head + p.face + bawaan + beli;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${auraSvg(aura)}
    <ellipse cx="50" cy="97" rx="${22 * s}" ry="3" fill="#0002"/>
    <g transform="translate(50 98) scale(${s}) translate(-50 -98)">${inner}</g></svg>`;
}

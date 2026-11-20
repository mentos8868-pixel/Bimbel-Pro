// Daftar negara yang bisa dipilih orang tua untuk anak, beserta gambar benderanya.
// Bendera digambar sendiri di <canvas> (emoji bendera tidak tampil di Windows).
export const NEGARA = [
  { id: "ID", name: "Indonesia" }, { id: "SG", name: "Singapura" }, { id: "MY", name: "Malaysia" },
  { id: "BN", name: "Brunei" }, { id: "TH", name: "Thailand" }, { id: "PH", name: "Filipina" },
  { id: "VN", name: "Vietnam" }, { id: "AU", name: "Australia" }, { id: "JP", name: "Jepang" },
  { id: "KR", name: "Korea Selatan" }, { id: "CN", name: "Tiongkok" }, { id: "IN", name: "India" },
  { id: "GB", name: "Inggris" }, { id: "US", name: "Amerika Serikat" },
];
export const DEFAULT_NEGARA = "ID";
export const isNegara = (id) => NEGARA.some((n) => n.id === id);
export const negaraOr = (id, fallback = DEFAULT_NEGARA) => (isNegara(id) ? id : fallback);
export const negaraName = (id) => NEGARA.find((n) => n.id === id)?.name || "";

// Kelas 1–12 menentukan jenjang (dipakai untuk mencari lawan sejenjang).
export const jenjangDariKelas = (k) => (k <= 6 ? "SD" : k <= 9 ? "SMP" : "SMA");

// Kurikulum yang dipilih orang tua, dan nama kelas menurut kurikulum itu.
// Nilai kelas tetap 1–12; hanya namanya yang berbeda (Merdeka: Kelas 1 SD, Cambridge/Singapore: P1, ...).
export const KURIKULUM = [
  { id: "merdeka", name: "Kurikulum Merdeka" },
  { id: "cam", name: "Cambridge International" },
  { id: "sgp", name: "Singapore MOE" },
];
export const kurikulumName = (id) => (KURIKULUM.find((k) => k.id === id) || KURIKULUM[0]).name;
// short = true: label ringkas untuk papan nama avatar ("Kelas 4", "P4", "S2", "JC1").
export function namaKelas(k, kur = "merdeka", short = false) {
  if (kur === "cam") {
    if (k <= 6) return short ? `P${k}` : `Primary ${k} (P${k})`;
    if (k <= 9) return short ? `Stage ${k}` : `Lower Secondary Stage ${k}`;
    if (k <= 11) return short ? `IGCSE Y${k - 9}` : `IGCSE Year ${k - 9}`;
    return short ? "AS Level" : "AS Level";
  }
  if (kur === "sgp") {
    if (k <= 6) return short ? `P${k}` : `Primary ${k} (P${k})`;
    if (k <= 10) return short ? `S${k - 6}` : `Secondary ${k - 6} (S${k - 6})`;
    return short ? `JC${k - 10}` : `Junior College ${k - 10} (JC${k - 10})`;
  }
  return short ? `Kelas ${k}` : `Kelas ${k} ${jenjangDariKelas(k)}`;
}

// ---------- gambar bendera (ctx = CanvasRenderingContext2D) ----------
function star(ctx, cx, cy, r, color, points = 5, inner = 0.4, rot = -Math.PI / 2) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / points;
    ctx[i ? "lineTo" : "moveTo"](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}
const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
const circle = (ctx, color, cx, cy, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
function stripes(ctx, x, y, w, h, colors, weights = colors.map(() => 1)) {
  const tot = weights.reduce((a, b) => a + b, 0);
  let yy = y;
  colors.forEach((c, i) => { const hh = (h * weights[i]) / tot; rect(ctx, c, x, yy, w, hh + 0.5); yy += hh; });
}
function crescent(ctx, cx, cy, r, color, bg, shift) {
  circle(ctx, color, cx, cy, r);
  circle(ctx, bg, cx + shift, cy, r * 0.82);
}
function unionJack(ctx, x, y, w, h) {
  rect(ctx, "#012169", x, y, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const line = (c, lw, ...pts) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.lineTo(pts[2], pts[3]); ctx.stroke(); };
  const d = Math.min(w, h);
  for (const c of [["#fff", d * 0.2], ["#C8102E", d * 0.07]]) {
    line(c[0], c[1], x, y, x + w, y + h);
    line(c[0], c[1], x + w, y, x, y + h);
  }
  rect(ctx, "#fff", x + w / 2 - d * 0.17, y, d * 0.34, h);
  rect(ctx, "#fff", x, y + h / 2 - d * 0.17, w, d * 0.34);
  rect(ctx, "#C8102E", x + w / 2 - d * 0.1, y, d * 0.2, h);
  rect(ctx, "#C8102E", x, y + h / 2 - d * 0.1, w, d * 0.2);
  ctx.restore();
}

const DRAW = {
  ID: (c, x, y, w, h) => stripes(c, x, y, w, h, ["#CE1126", "#fff"]),
  SG: (c, x, y, w, h) => {
    stripes(c, x, y, w, h, ["#EF3340", "#fff"]);
    crescent(c, x + w * 0.2, y + h * 0.25, h * 0.16, "#fff", "#EF3340", h * 0.06);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      star(c, x + w * 0.3 + Math.cos(a) * h * 0.08, y + h * 0.25 + Math.sin(a) * h * 0.08, h * 0.03, "#fff");
    }
  },
  MY: (c, x, y, w, h) => {
    stripes(c, x, y, w, h, Array.from({ length: 14 }, (_, i) => (i % 2 ? "#fff" : "#CC0001")));
    rect(c, "#010066", x, y, w * 0.5, h * (8 / 14));
    crescent(c, x + w * 0.2, y + h * 0.29, h * 0.19, "#FFCC00", "#010066", h * 0.07);
    star(c, x + w * 0.37, y + h * 0.29, h * 0.13, "#FFCC00", 14, 0.45);
  },
  BN: (c, x, y, w, h) => {
    rect(c, "#F7E017", x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.translate(x, y);
    c.fillStyle = "#fff";
    c.beginPath(); c.moveTo(0, h * 0.18); c.lineTo(w, h * 0.6); c.lineTo(w, h * 0.78); c.lineTo(0, h * 0.36); c.fill();
    c.fillStyle = "#000";
    c.beginPath(); c.moveTo(0, h * 0.36); c.lineTo(w, h * 0.78); c.lineTo(w, h * 0.96); c.lineTo(0, h * 0.54); c.fill();
    c.restore();
    circle(c, "#CF1126", x + w / 2, y + h / 2, h * 0.16);
  },
  TH: (c, x, y, w, h) => stripes(c, x, y, w, h, ["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"], [1, 1, 2, 1, 1]),
  PH: (c, x, y, w, h) => {
    stripes(c, x, y, w, h, ["#0038A8", "#CE1126"]);
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + h * 0.866, y + h / 2); c.lineTo(x, y + h); c.fill();
    star(c, x + h * 0.29, y + h / 2, h * 0.13, "#FCD116", 8, 0.5);
  },
  VN: (c, x, y, w, h) => { rect(c, "#DA251D", x, y, w, h); star(c, x + w / 2, y + h / 2, h * 0.3, "#FFFF00"); },
  AU: (c, x, y, w, h) => {
    rect(c, "#012169", x, y, w, h);
    unionJack(c, x, y, w / 2, h / 2);
    star(c, x + w * 0.25, y + h * 0.75, h * 0.14, "#fff", 7, 0.45);
    for (const [sx, sy] of [[0.75, 0.25], [0.65, 0.5], [0.85, 0.42], [0.75, 0.82]]) star(c, x + w * sx, y + h * sy, h * 0.07, "#fff", 7, 0.45);
  },
  JP: (c, x, y, w, h) => { rect(c, "#fff", x, y, w, h); circle(c, "#BC002D", x + w / 2, y + h / 2, h * 0.3); },
  KR: (c, x, y, w, h) => {
    rect(c, "#fff", x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2, r = h * 0.25;
    c.fillStyle = "#CD2E3A"; c.beginPath(); c.arc(cx, cy, r, Math.PI, 0); c.fill();
    c.fillStyle = "#0047A0"; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI); c.fill();
    circle(c, "#CD2E3A", cx - r / 2, cy, r / 2);
    circle(c, "#0047A0", cx + r / 2, cy, r / 2);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      for (let i = 0; i < 3; i++) rect(c, "#000", cx + dx * w * 0.3 - w * 0.06, cy + dy * h * 0.3 - h * 0.08 + i * h * 0.06, w * 0.12, h * 0.035);
    }
  },
  CN: (c, x, y, w, h) => {
    rect(c, "#EE1C25", x, y, w, h);
    star(c, x + w * 0.17, y + h * 0.27, h * 0.15, "#FFFF00");
    for (const [sx, sy] of [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]]) star(c, x + w * sx, y + h * sy, h * 0.05, "#FFFF00");
  },
  IN: (c, x, y, w, h) => {
    stripes(c, x, y, w, h, ["#FF9933", "#fff", "#138808"]);
    c.strokeStyle = "#000080"; c.lineWidth = Math.max(1, h * 0.03);
    c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.13, 0, Math.PI * 2); c.stroke();
    circle(c, "#000080", x + w / 2, y + h / 2, h * 0.03);
  },
  GB: (c, x, y, w, h) => unionJack(c, x, y, w, h),
  US: (c, x, y, w, h) => {
    stripes(c, x, y, w, h, Array.from({ length: 13 }, (_, i) => (i % 2 ? "#fff" : "#B22234")));
    rect(c, "#3C3B6E", x, y, w * 0.4, h * (7 / 13));
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) circle(c, "#fff", x + w * (0.05 + k * 0.075), y + h * (0.07 + r * 0.12), h * 0.025);
  },
};

// Menggambar bendera dengan bingkai tipis. Mengembalikan false bila kode tidak dikenal.
export function drawFlag(ctx, id, x, y, w, h) {
  const fn = DRAW[id];
  if (!fn) return false;
  ctx.save();
  fn(ctx, x, y, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  return true;
}

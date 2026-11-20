// Dunia 3D: arena terbuka dengan alun-alun, ruang bimbel, ruang game, dan lahan cadangan.
// Utara = +z, timur = +x.
import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight,
  MeshBuilder, StandardMaterial, Color3, Color4, DynamicTexture, TransformNode, Mesh,
} from "@babylonjs/core";
import { buildAvatar3d, buildManekin } from "./avatar3d.js";
import { drawFlag, namaKelas } from "../../shared/negara.js";

export const ARENA_RADIUS = 38;

const mats = new Map();
function mat(scene, hex) {
  if (mats.has(hex)) return mats.get(hex);
  const m = new StandardMaterial("m" + hex, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  mats.set(hex, m);
  return m;
}

// Papan tulisan (selalu menghadap kamera bila billboard = true).
// flag (opsional) = kode negara; benderanya digambar di depan baris kedua.
export function makeSign(scene, lines, { width = 4, height = 1.4, bg = "#ffffff", fg = "#1f2a37", billboard = true, flag = "" } = {}) {
  const texW = 512;
  const texH = Math.round((texW * height) / width);
  const tex = new DynamicTexture("signTex", { width: texW, height: texH }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, texW, texH);
  ctx.fillStyle = bg;
  const r = 28;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(texW - r, 0); ctx.quadraticCurveTo(texW, 0, texW, r);
  ctx.lineTo(texW, texH - r); ctx.quadraticCurveTo(texW, texH, texW - r, texH);
  ctx.lineTo(r, texH); ctx.quadraticCurveTo(0, texH, 0, texH - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const n = lines.length;
  lines.forEach((t, i) => {
    const size = i === 0 ? Math.round(texH / (n + 0.6)) : Math.round(texH / (n + 1.6));
    ctx.font = `bold ${size}px Nunito, Segoe UI, sans-serif`;
    const y = (texH / (n + 1)) * (i + 1);
    if (flag && i === 1) {
      // Bendera + teks, ditengahkan bersama.
      const fh = Math.round(size * 0.9), fw = Math.round(fh * 1.5), gap = Math.round(size * 0.35);
      const tw = Math.min(ctx.measureText(t).width, texW - 60 - fw - gap);
      const x0 = (texW - (fw + gap + tw)) / 2;
      drawFlag(ctx, flag, x0, y - fh / 2, fw, fh);
      ctx.fillStyle = fg;
      ctx.textAlign = "left";
      ctx.fillText(t, x0 + fw + gap, y, tw);
      ctx.textAlign = "center";
      return;
    }
    ctx.fillText(t, texW / 2, y, texW - 30);
  });
  tex.update();
  const m = new StandardMaterial("signMat", scene);
  m.diffuseTexture = tex;
  m.emissiveColor = new Color3(1, 1, 1);
  m.disableLighting = true;
  m.useAlphaFromDiffuseTexture = true;
  m.backFaceCulling = false;
  const plane = MeshBuilder.CreatePlane("sign", { width, height }, scene);
  plane.material = m;
  plane.isPickable = false;
  if (billboard) plane.billboardMode = Mesh.BILLBOARDMODE_Y;
  return plane;
}

function box(scene, name, { w, h, d, x, y = h / 2, z, color, walls }) {
  const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  b.position.set(x, y, z);
  b.material = mat(scene, color);
  if (walls) walls.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return b;
}

// Ruangan berdinding rendah, pintu menghadap ke alun-alun.
function room(scene, walls, { cx, cz, w, d, door, floor, wall }) {
  box(scene, "floor", { w, h: 0.1, d, x: cx, y: 0.05, z: cz, color: floor });
  const t = 0.4, h = 1.3, gap = 4;
  const sides = {
    n: { x: cx, z: cz + d / 2, len: w, horiz: true },
    s: { x: cx, z: cz - d / 2, len: w, horiz: true },
    e: { x: cx + w / 2, z: cz, len: d, horiz: false },
    w: { x: cx - w / 2, z: cz, len: d, horiz: false },
  };
  for (const [k, s] of Object.entries(sides)) {
    const parts = k === door ? [-1, 1] : [0];
    for (const p of parts) {
      const len = p === 0 ? s.len : (s.len - gap) / 2;
      const off = p === 0 ? 0 : p * (gap / 2 + len / 2);
      if (s.horiz) box(scene, "wall", { w: len, h, d: t, x: s.x + off, z: s.z, color: wall, walls });
      else box(scene, "wall", { w: t, h, d: len, x: s.x, z: s.z + off, color: wall, walls });
    }
  }
}

function tree(scene, x, z, s = 1) {
  const trunk = MeshBuilder.CreateCylinder("trunk", { height: 1.2 * s, diameter: 0.35 * s, tessellation: 6 }, scene);
  trunk.position.set(x, 0.6 * s, z);
  trunk.material = mat(scene, "#8d6e4a");
  const top = MeshBuilder.CreateCylinder("leaf", { height: 2.4 * s, diameterTop: 0, diameterBottom: 2 * s, tessellation: 6 }, scene);
  top.position.set(x, 2.3 * s, z);
  top.material = mat(scene, "#3e9b4f");
}

function chessTable(scene, x, z, walls) {
  const leg = MeshBuilder.CreateCylinder("leg", { height: 0.8, diameter: 0.3, tessellation: 8 }, scene);
  leg.position.set(x, 0.4, z);
  leg.material = mat(scene, "#6d5036");
  const top = MeshBuilder.CreateBox("chessTop", { width: 1.8, height: 0.12, depth: 1.8 }, scene);
  top.position.set(x, 0.86, z);
  const tex = new DynamicTexture("chessTex", { width: 256, height: 256 }, scene, false);
  const ctx = tex.getContext();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    ctx.fillStyle = (r + c) % 2 ? "#8b6b4a" : "#f0ead6";
    ctx.fillRect(c * 32, r * 32, 32, 32);
  }
  tex.update();
  const m = new StandardMaterial("chessMat", scene);
  m.diffuseTexture = tex;
  top.material = m;
  walls.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.9, maxZ: z + 0.9 });
}

function plainTable(scene, x, z, color, walls) {
  const leg = MeshBuilder.CreateCylinder("leg", { height: 0.8, diameter: 0.3, tessellation: 8 }, scene);
  leg.position.set(x, 0.4, z);
  leg.material = mat(scene, "#6d5036");
  const top = MeshBuilder.CreateCylinder("tableTop", { height: 0.12, diameter: 1.9, tessellation: 16 }, scene);
  top.position.set(x, 0.86, z);
  top.material = mat(scene, color);
  walls.push({ minX: x - 0.95, maxX: x + 0.95, minZ: z - 0.95, maxZ: z + 0.95 });
}

// ---------- Ruang kelas (Ruang Bimbel) ----------
function tabung(scene, h, d, color, x, y, z) {
  const m = MeshBuilder.CreateCylinder("kelas", { height: h, diameter: d, tessellation: 10 }, scene);
  m.position.set(x, y, z);
  m.material = mat(scene, color);
  return m;
}

// Meja murid dengan kursi di sisi selatan (murid menghadap papan tulis di utara).
function mejaMurid(scene, x, z, warnaKursi, walls) {
  box(scene, "mejaMurid", { w: 1.3, h: 0.07, d: 0.75, x, y: 0.75, z, color: "#d9a66b" });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(scene, "kakiMeja", { w: 0.07, h: 0.72, d: 0.07, x: x + sx * 0.56, y: 0.36, z: z + sz * 0.3, color: "#6d5036" });
  box(scene, "bukuMeja", { w: 0.35, h: 0.04, d: 0.26, x: x - 0.25, y: 0.8, z: z + 0.05, color: "#4f9cf0" });
  box(scene, "pensil", { w: 0.25, h: 0.03, d: 0.03, x: x + 0.2, y: 0.8, z: z + 0.1, color: "#f5c542" });
  const cz = z - 0.7;
  box(scene, "dudukKursi", { w: 0.5, h: 0.06, d: 0.48, x, y: 0.45, z: cz, color: warnaKursi });
  box(scene, "sandaranKursi", { w: 0.5, h: 0.5, d: 0.06, x, y: 0.73, z: cz - 0.22, color: warnaKursi });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(scene, "kakiKursi", { w: 0.05, h: 0.43, d: 0.05, x: x + sx * 0.2, y: 0.21, z: cz + sz * 0.19, color: "#5d6b7a" });
  walls.push({ minX: x - 0.65, maxX: x + 0.65, minZ: cz - 0.3, maxZ: z + 0.38 });
}

// Papan tulis hijau berkaki dengan tulisan kapur.
function papanTulis(scene, x, z, walls) {
  for (const sx of [-1, 1]) box(scene, "kakiPapan", { w: 0.12, h: 2.9, d: 0.12, x: x + sx * 3.1, y: 1.45, z, color: "#8d6e4a" });
  box(scene, "bingkaiPapan", { w: 6.3, h: 2.2, d: 0.1, x, y: 1.95, z: z + 0.02, color: "#8d6e4a" });
  const papan = MeshBuilder.CreatePlane("papanTulis", { width: 6, height: 1.95 }, scene);
  papan.position.set(x, 1.95, z - 0.04);
  // Bidang Babylon menghadap -Z, yaitu ke selatan (ke murid), jadi tidak perlu diputar.
  const tex = new DynamicTexture("tulisanPapan", { width: 768, height: 250 }, scene, true);
  const ctx = tex.getContext();
  ctx.fillStyle = "#2f5d3a"; ctx.fillRect(0, 0, 768, 250);
  ctx.fillStyle = "#f4f1e8"; ctx.textAlign = "center";
  ctx.font = "bold 54px sans-serif"; ctx.fillText("Selamat Belajar!", 384, 70);
  ctx.font = "40px sans-serif";
  ctx.fillText("2 + 3 = 5      A B C      H₂O", 384, 135);
  ctx.fillText("½ + ¼ = ¾      △ □ ○", 384, 195);
  ctx.fillStyle = "#f5c542"; ctx.font = "bold 34px sans-serif"; ctx.fillText("★", 60, 60); ctx.fillText("★", 708, 60);
  tex.update();
  const m = new StandardMaterial("papanMat", scene);
  m.diffuseTexture = tex;
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  papan.material = m;
  box(scene, "tempatKapur", { w: 6, h: 0.06, d: 0.18, x, y: 0.95, z: z - 0.1, color: "#8d6e4a" });
  box(scene, "kapur", { w: 0.18, h: 0.04, d: 0.04, x: x + 1.5, y: 1.0, z: z - 0.12, color: "#ffffff" });
  box(scene, "penghapus", { w: 0.3, h: 0.08, d: 0.1, x: x - 1.6, y: 1.02, z: z - 0.12, color: "#3b2a05" });
  walls.push({ minX: x - 3.25, maxX: x + 3.25, minZ: z - 0.2, maxZ: z + 0.15 });
}

// Rak buku berisi buku warna-warni.
function rakBuku(scene, x, z, walls) {
  box(scene, "rakBuku", { w: 0.5, h: 1.8, d: 1.8, x, y: 0.9, z, color: "#a87b51" });
  const warna = ["#ef4f6e", "#4f9cf0", "#f5c542", "#5fc29a", "#9b7bd8", "#ff9f43"];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 7; i++) {
      const h = 0.32 + ((i * 7 + r * 3) % 4) * 0.04;
      box(scene, "buku", { w: 0.1, h, d: 0.2, x: x + 0.27, y: 0.25 + r * 0.55 + h / 2, z: z - 0.7 + i * 0.22, color: warna[(i + r) % warna.length] });
    }
  }
  walls.push({ minX: x - 0.25, maxX: x + 0.4, minZ: z - 0.9, maxZ: z + 0.9 });
}

function ruangKelas(scene, walls) {
  // Papan tulis di depan kelas (utara), meja guru di depannya.
  papanTulis(scene, 0, 30.2, walls);
  const gx = 0, gz = 28.3;
  box(scene, "mejaGuru", { w: 2.4, h: 0.85, d: 0.9, x: gx, y: 0.43, z: gz, color: "#b07a4f", walls });
  box(scene, "mejaGuruAtas", { w: 2.5, h: 0.06, d: 1.0, x: gx, y: 0.88, z: gz, color: "#d9a66b" });
  box(scene, "kursiGuru", { w: 0.6, h: 0.06, d: 0.55, x: gx, y: 0.5, z: gz + 0.9, color: "#5b6b7c" });
  box(scene, "sandaranGuru", { w: 0.6, h: 0.6, d: 0.06, x: gx, y: 0.82, z: gz + 1.15, color: "#5b6b7c" });
  // Di meja guru: bola dunia, tumpukan buku, apel.
  tabung(scene, 0.25, 0.06, "#8d6e4a", gx - 0.8, 1.02, gz);
  const bola = MeshBuilder.CreateSphere("bolaDunia", { diameter: 0.38, segments: 16 }, scene);
  bola.position.set(gx - 0.8, 1.32, gz);
  bola.material = mat(scene, "#4fb3f0");
  box(scene, "benuaA", { w: 0.14, h: 0.14, d: 0.06, x: gx - 0.78, y: 1.36, z: gz - 0.17, color: "#5fc29a" });
  for (let i = 0; i < 3; i++) box(scene, "bukuGuru", { w: 0.5, h: 0.07, d: 0.35, x: gx + 0.6, y: 0.95 + i * 0.07, z: gz, color: ["#ef4f6e", "#f5c542", "#4f9cf0"][i] });
  const apel = MeshBuilder.CreateSphere("apel", { diameter: 0.18, segments: 10 }, scene);
  apel.position.set(gx + 0.05, 1.0, gz - 0.2);
  apel.material = mat(scene, "#e0453a");
  // Meja dan kursi murid: 2 baris x 4 meja, lorong di tengah menuju meja guru.
  const kursi = ["#4f9cf0", "#ef6f5e", "#5fc29a", "#f5a524"];
  for (const z of [24.8, 22.2]) [-5.4, -2.7, 2.7, 5.4].forEach((x, i) => mejaMurid(scene, x, z, kursi[i], walls));
  // Rak buku, tanaman, dan tempat sampah di sudut kelas.
  rakBuku(scene, -7.45, 27.5, walls);
  rakBuku(scene, -7.45, 24.8, walls);
  for (const [x, z] of [[7.1, 30.1], [7.1, 20]]) {
    tabung(scene, 0.5, 0.5, "#c97b4f", x, 0.25, z);
    const daun = MeshBuilder.CreateSphere("daun", { diameter: 0.8, segments: 10 }, scene);
    daun.position.set(x, 0.85, z);
    daun.material = mat(scene, "#3e9b4f");
    walls.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
  }
  tabung(scene, 0.45, 0.4, "#5d6b7a", -7.2, 0.23, 20);
  // Meja guru adalah tempat membuka Ruang Pintar (tab baru); titik aksi di depan meja.
  makeSign(scene, ["Ruang Pintar"], { width: 2.2, height: 0.6 }).position.set(gx, 1.7, gz - 0.7);
  return { id: "bimbel", x: gx, z: gz - 1.3, label: "Ruang Pintar", action: "Belajar di Ruang Pintar", ready: true };
}

// Kios Toko Avatar: lapak beratap belang dengan manekin berhias aksesori. Bagian depan menghadap selatan.
function kiosToko(scene, x, z, walls) {
  const W = 3.4, D = 1.8;
  const front = z - D / 2;
  box(scene, "kiosLantai", { w: W + 0.4, h: 0.12, d: D + 0.4, x, y: 0.06, z, color: "#f3d9e4" });
  box(scene, "kiosMeja", { w: W, h: 0.95, d: 0.6, x, y: 0.47, z: front + 0.3, color: "#ff8fb0" });
  box(scene, "kiosMejaAtas", { w: W + 0.1, h: 0.08, d: 0.7, x, y: 0.98, z: front + 0.3, color: "#fff4f8" });
  box(scene, "kiosBelakang", { w: W, h: 2.4, d: 0.15, x, y: 1.2, z: z + D / 2, color: "#ffd1e0" });
  box(scene, "kiosRak", { w: W - 0.4, h: 0.08, d: 0.35, x, y: 1.65, z: z + D / 2 - 0.25, color: "#c97b9b" });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = MeshBuilder.CreateCylinder("kiosTiang", { height: 2.7, diameter: 0.14, tessellation: 8 }, scene);
    post.position.set(x + sx * (W / 2 - 0.05), 1.35, z + sz * (D / 2 - 0.05));
    post.material = mat(scene, "#ffffff");
  }
  // Atap belang miring ke depan.
  const atap = MeshBuilder.CreateBox("kiosAtap", { width: W + 0.6, height: 0.08, depth: D + 0.8 }, scene);
  atap.position.set(x, 2.85, z - 0.15);
  atap.rotation.x = -0.18;
  const tex = new DynamicTexture("kiosBelang", { width: 256, height: 64 }, scene, false);
  const ctx = tex.getContext();
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#ef4f6e"; ctx.fillRect(i * 32, 0, 32, 64); }
  tex.update();
  const am = new StandardMaterial("kiosAtapMat", scene);
  am.diffuseTexture = tex;
  am.specularColor = new Color3(0.05, 0.05, 0.05);
  atap.material = am;
  // Pajangan: manekin di meja dan di rak belakang.
  const pajang = [
    [-1.1, 1.02, front + 0.3, ["mahkota"]],
    [0, 1.02, front + 0.3, ["topi-penyihir"]],
    [1.1, 1.02, front + 0.3, ["pita", "kacamata"]],
    [-0.7, 1.69, z + D / 2 - 0.25, ["topi-pesta", "kacamata-hitam"]],
    [0.7, 1.69, z + D / 2 - 0.25, ["medali", "syal"]],
  ];
  for (const [dx, y, pz, aks] of pajang) {
    const n = new TransformNode("manekin", scene);
    n.position.set(x + dx, y, pz);
    n.rotation.y = Math.PI;   // menghadap ke depan (selatan)
    n.scaling.setAll(0.8);
    buildManekin(scene, n, aks);
  }
  walls.push({ minX: x - W / 2 - 0.2, maxX: x + W / 2 + 0.2, minZ: front - 0.05, maxZ: z + D / 2 + 0.2 });
  const s = makeSign(scene, ["Toko Avatar", "Topi · Pita · Kacamata"], { width: 3.2, height: 1.1, bg: "#ef4f6e", fg: "#ffffff" });
  s.position.set(x, 3.75, z);
  return { id: "toko", x, z: front - 0.9, label: "Toko Avatar", action: "Buka Toko Avatar", ready: true };
}

export function createArena(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false }, true);
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#bfe6ffff");

  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  hemi.groundColor = new Color3(0.55, 0.6, 0.55);
  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, 0.3), scene);
  sun.intensity = 0.45;

  const camera = new ArcRotateCamera("cam", -Math.PI / 2, 1.05, 14, new Vector3(0, 1, 0), scene);
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 26;
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = 1.35;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 0;

  const walls = [];

  // Tanah dan alun-alun
  const ground = MeshBuilder.CreateCylinder("ground", { diameter: ARENA_RADIUS * 2 + 6, height: 0.5, tessellation: 64 }, scene);
  ground.position.y = -0.25;
  ground.material = mat(scene, "#8fd16a");
  const plaza = MeshBuilder.CreateCylinder("plaza", { diameter: 16, height: 0.06, tessellation: 48 }, scene);
  plaza.position.y = 0.03;
  plaza.material = mat(scene, "#e8dcc2");
  const plazaSign = makeSign(scene, ["Alun-alun", "Bimbel ke utara · Game ke timur"], { width: 5, height: 1.5 });
  plazaSign.position.set(0, 3, 0);
  // Kios Toko Avatar di sisi barat laut alun-alun (terlihat dari tempat muncul).
  const kios = kiosToko(scene, -5, 4.6, walls);

  // Jalan setapak
  box(scene, "pathN", { w: 3, h: 0.04, d: 11, x: 0, y: 0.02, z: 13.5, color: "#e8dcc2" });
  box(scene, "pathE", { w: 9, h: 0.04, d: 3, x: 12, y: 0.02, z: 0, color: "#e8dcc2" });
  box(scene, "pathW", { w: 9, h: 0.04, d: 3, x: -12, y: 0.02, z: 0, color: "#efe7d4" });
  box(scene, "pathS", { w: 3, h: 0.04, d: 11, x: 0, y: 0.02, z: -13.5, color: "#efe7d4" });

  // Ruang Bimbel (utara)
  room(scene, walls, { cx: 0, cz: 25, w: 16, d: 12, door: "s", floor: "#fff3d6", wall: "#f2b134" });
  const bimbelSign = makeSign(scene, ["Ruang Bimbel", "Ruang Pintar"], { width: 5, height: 1.6, bg: "#f2b134", fg: "#3b2a05" });
  bimbelSign.position.set(0, 3.2, 18.6);
  // Ruang kelas: papan tulis, meja guru (membuka Ruang Pintar di tab baru), meja-kursi murid, rak buku.
  const studyDesk = ruangKelas(scene, walls);

  // Ruang Game (timur)
  room(scene, walls, { cx: 25, cz: 0, w: 14, d: 18, door: "w", floor: "#e3efff", wall: "#4f9cf0" });
  const gameSign = makeSign(scene, ["Ruang Game"], { width: 4.5, height: 1.2, bg: "#4f9cf0", fg: "#ffffff" });
  gameSign.position.set(17.6, 3.2, 0);

  const tables = [
    { id: "catur", x: 27, z: -5, label: "Catur", ready: true },
    { id: "scramble", x: 27, z: 0, label: "Scramble", ready: true },
    { id: "kartu", x: 27, z: 5, label: "Kartu Kilat", ready: true },
  ];
  chessTable(scene, tables[0].x, tables[0].z, walls);
  plainTable(scene, tables[1].x, tables[1].z, "#9b7bd8", walls);
  plainTable(scene, tables[2].x, tables[2].z, "#ef6f5e", walls);
  for (const t of tables) {
    const s = makeSign(scene, t.ready ? [t.label] : [t.label, "Segera hadir"], { width: 2.6, height: t.ready ? 0.7 : 1 });
    s.position.set(t.x, 2.3, t.z);
  }

  // Lahan cadangan (barat dan selatan)
  for (const [x, z] of [[-24, 0], [0, -24]]) {
    box(scene, "plot", { w: 12, h: 0.05, d: 12, x, y: 0.025, z, color: "#d9c7a0" });
    const s = makeSign(scene, ["Lahan cadangan"], { width: 3.6, height: 0.9, bg: "#f7f1e3" });
    s.position.set(x, 1.6, z);
  }

  // Pepohonan di pinggir arena
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.11;
    const r = ARENA_RADIUS - 1 + (i % 3) * 0.8;
    tree(scene, Math.cos(a) * r, Math.sin(a) * r, 0.9 + (i % 4) * 0.12);
  }
  for (const [x, z] of [[-9, 9], [9, 9], [-9, -9], [9, -9]]) tree(scene, x, z, 0.8);
  for (const [x, z] of [[-9, 9], [9, 9], [-9, -9], [9, -9]]) walls.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });

  window.addEventListener("resize", () => engine.resize());
  return { engine, scene, camera, walls, tables: [...tables, studyDesk, kios] };
}

// Gelembung chat di atas kepala avatar (hilang setelah 5 detik).
export function showBubble(scene, avatar, text) {
  avatar.bubble?.dispose(false, true);
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > 22) { lines.push(cur.trim()); cur = w; } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const shown = lines.slice(0, 3);
  const b = makeSign(scene, shown, { width: 2.6, height: 0.42 * shown.length + 0.25, bg: "#fffbe6", fg: "#1f2a37" });
  b.position.y = (avatar.height ?? 2.2) + 0.65 + shown.length * 0.2;
  b.parent = avatar.root;
  b.billboardMode = Mesh.BILLBOARDMODE_ALL;
  avatar.bubble = b;
  clearTimeout(avatar.bubbleTimer);
  avatar.bubbleTimer = setTimeout(() => { b.dispose(false, true); if (avatar.bubble === b) avatar.bubble = null; }, 5000);
}

// Avatar lucu (lihat avatar3d.js) dengan papan nama di atas kepala.
// sid (opsional) disimpan di mesh supaya avatar bisa diketuk untuk membuka profil.
// body = simpul yang dinaikturunkan saat berjalan (posisi dasar y = 0).
// Baris kedua papan nama: bendera negara + "Kelas N" (anak), atau jenjang bila kelas belum diisi.
export function createAvatar(scene, { color, avatar, aksesori = "", aura = "", name, jenjang, negara = "", kelas = 0, kurikulum = "merdeka", sid }) {
  const root = new TransformNode("avatar", scene);
  const { bob, meshes, height } = buildAvatar3d(scene, root, avatar, color, aksesori, aura);
  const sub = kelas ? namaKelas(kelas, kurikulum, true) : jenjang;
  const tag = makeSign(scene, [name, sub], { width: 1.8, height: 0.6, bg: "rgba(255,255,255,0.9)", flag: negara });
  tag.position.y = height + 0.3;
  tag.parent = root;
  tag.billboardMode = Mesh.BILLBOARDMODE_ALL;
  if (sid) for (const m of meshes) m.metadata = { sid };
  return { root, body: bob, height };
}

// Buang avatar (figur, papan nama, gelembung chat) tanpa menghapus material warna bersama
// yang juga dipakai avatar lain.
export function disposeAvatar(av) {
  clearTimeout(av.bubbleTimer);
  for (const m of av.root.getChildMeshes(false)) {
    const mt = m.material;
    m.dispose();
    if (mt && !mt.metadata?.bersama) { mt.diffuseTexture?.dispose(); mt.dispose(); }
  }
  av.root.dispose();
  av.bubble = null;
}

// Gerak dengan tabrakan sederhana terhadap dinding dan meja (geser di sepanjang dinding).
export function moveWithCollision(pos, dx, dz, walls, radius = 0.4) {
  const hits = (x, z) =>
    walls.some((w) => x + radius > w.minX && x - radius < w.maxX && z + radius > w.minZ && z - radius < w.maxZ);
  let x = pos.x, z = pos.z;
  if (!hits(x + dx, z)) x += dx;
  if (!hits(x, z + dz)) z += dz;
  const d = Math.hypot(x, z);
  if (d > ARENA_RADIUS) { x = (x / d) * ARENA_RADIUS; z = (z / d) * ARENA_RADIUS; }
  pos.x = x;
  pos.z = z;
}

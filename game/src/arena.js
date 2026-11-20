// Dunia 3D: arena terbuka dengan alun-alun, ruang bimbel, ruang game, dan lahan cadangan.
// Utara = +z, timur = +x.
import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight,
  MeshBuilder, StandardMaterial, Color3, Color4, DynamicTexture, TransformNode, Mesh,
} from "@babylonjs/core";
import { buildAvatar3d } from "./avatar3d.js";
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

  // Jalan setapak
  box(scene, "pathN", { w: 3, h: 0.04, d: 11, x: 0, y: 0.02, z: 13.5, color: "#e8dcc2" });
  box(scene, "pathE", { w: 9, h: 0.04, d: 3, x: 12, y: 0.02, z: 0, color: "#e8dcc2" });
  box(scene, "pathW", { w: 9, h: 0.04, d: 3, x: -12, y: 0.02, z: 0, color: "#efe7d4" });
  box(scene, "pathS", { w: 3, h: 0.04, d: 11, x: 0, y: 0.02, z: -13.5, color: "#efe7d4" });

  // Ruang Bimbel (utara)
  room(scene, walls, { cx: 0, cz: 25, w: 16, d: 12, door: "s", floor: "#fff3d6", wall: "#f2b134" });
  const bimbelSign = makeSign(scene, ["Ruang Bimbel", "Ruang Pintar"], { width: 5, height: 1.6, bg: "#f2b134", fg: "#3b2a05" });
  bimbelSign.position.set(0, 3.2, 18.6);
  // Meja belajar: membuka aplikasi Ruang Pintar (game/public/bimbel) di tab baru.
  const studyDesk = { id: "bimbel", x: 0, z: 25, label: "Ruang Pintar", action: "Belajar di Ruang Pintar", ready: true };
  plainTable(scene, studyDesk.x, studyDesk.z, "#f2b134", walls);
  makeSign(scene, ["Ruang Pintar"], { width: 2.6, height: 0.7 }).position.set(studyDesk.x, 2.3, studyDesk.z);

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
  return { engine, scene, camera, walls, tables: [...tables, studyDesk] };
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
export function createAvatar(scene, { color, avatar, aksesori = "", name, jenjang, negara = "", kelas = 0, kurikulum = "merdeka", sid }) {
  const root = new TransformNode("avatar", scene);
  const { bob, meshes, height } = buildAvatar3d(scene, root, avatar, color, aksesori);
  const sub = kelas ? namaKelas(kelas, kurikulum, true) : jenjang;
  const tag = makeSign(scene, [name, sub], { width: 1.8, height: 0.6, bg: "rgba(255,255,255,0.9)", flag: negara });
  tag.position.y = height + 0.3;
  tag.parent = root;
  tag.billboardMode = Mesh.BILLBOARDMODE_ALL;
  if (sid) for (const m of meshes) m.metadata = { sid };
  return { root, body: bob, height };
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

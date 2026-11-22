// Avatar 3D di arena: hewan/robot lucu dari bentuk sederhana (bola, kotak, tabung).
// Ukuran mengikuti anggota keluarga (ayah paling besar, anak lebih kecil).
import { MeshBuilder, StandardMaterial, Color3, TransformNode, FresnelParameters, DynamicTexture } from "@babylonjs/core";
import { parseAvatar, DEFAULT_AVATAR } from "../../shared/avatars.js";
import { rapikanAksesori, aksesoriById } from "../../shared/aksesori.js";
import { auraById, auraUrutan } from "../../shared/aura.js";

// Aura di kaki avatar menurut level (lihat shared/aura.js): lingkaran bercahaya yang berdenyut.
// Emas ke atas: + cincin berputar; berlian ke atas: + bola cahaya yang mengorbit; pelangi: warnanya berganti.
function buildAura(scene, parent, id) {
  const a = auraById(id);
  if (!a) return;
  const u = auraUrutan(id);
  const glowMat = (hex, alpha) => {
    const m = new StandardMaterial("aura", scene);
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = Color3.FromHexString(hex);
    m.alpha = alpha;
    m.disableLighting = true;
    m.backFaceCulling = false;
    return m;
  };
  const node = new TransformNode("aura", scene);
  node.parent = parent;
  const piring = MeshBuilder.CreateDisc("aura", { radius: 0.75 + u * 0.08, tessellation: 40 }, scene);
  piring.rotation.x = Math.PI / 2;
  piring.position.y = 0.03;
  piring.material = glowMat(a.warna[1], 0.35);
  piring.isPickable = false;
  piring.parent = node;
  const cincin = MeshBuilder.CreateTorus("aura", { diameter: 1.5 + u * 0.16, thickness: 0.05 + u * 0.01, tessellation: 40 }, scene);
  cincin.position.y = 0.05;
  cincin.material = glowMat(a.warna[0], 0.85);
  cincin.isPickable = false;
  cincin.parent = node;
  const orbit = [];
  if (u >= 2) {   // cincin kedua yang miring dan berputar
    const c2 = MeshBuilder.CreateTorus("aura", { diameter: 1.2 + u * 0.12, thickness: 0.035, tessellation: 40 }, scene);
    c2.position.y = 0.5;
    c2.rotation.x = 0.35;
    c2.material = glowMat(a.warna[0], 0.6);
    c2.isPickable = false;
    c2.parent = node;
    orbit.push(c2);
  }
  const bola = [];
  if (u >= 3) {   // bola cahaya mengorbit
    for (let i = 0; i < 3 + (u - 3) * 2; i++) {
      const b = MeshBuilder.CreateSphere("aura", { diameter: 0.12, segments: 8 }, scene);
      b.material = glowMat(a.warna[i % a.warna.length], 0.95);
      b.isPickable = false;
      b.parent = node;
      bola.push(b);
    }
  }
  const warna = a.warna.map((w) => Color3.FromHexString(w));
  let t = Math.random() * 10;
  const obs = scene.onBeforeRenderObservable.add(() => {
    t += scene.getEngine().getDeltaTime() / 1000;
    const denyut = 1 + Math.sin(t * 2.5) * 0.06;
    piring.scaling.set(denyut, denyut, denyut);
    piring.material.alpha = 0.28 + Math.sin(t * 2.5) * 0.08;
    for (const o of orbit) o.rotation.y = t * 0.9;
    bola.forEach((b, i) => {
      const s = t * 1.4 + (i * Math.PI * 2) / bola.length;
      b.position.set(Math.cos(s) * 0.85, 0.35 + Math.sin(t * 2 + i) * 0.25, Math.sin(s) * 0.85);
    });
    if (warna.length > 2) {   // pelangi: warna cincin berganti pelan-pelan
      const k = (t * 0.6) % warna.length, i = Math.floor(k);
      Color3.LerpToRef(warna[i], warna[(i + 1) % warna.length], k - i, cincin.material.emissiveColor);
      piring.material.emissiveColor.copyFrom(cincin.material.emissiveColor);
    }
  });
  node.onDisposeObservable.add(() => scene.onBeforeRenderObservable.remove(obs));
}

const INK = "#2b2f3a";
const mats = new Map();
function mat(scene, hex) {
  const key = scene.uid + hex;
  if (mats.has(key)) return mats.get(key);
  const m = new StandardMaterial("av" + hex, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  if (hex === INK) {
    // Mata/hidung: mengilap supaya terlihat hidup.
    m.specularColor = new Color3(0.7, 0.7, 0.7);
    m.specularPower = 64;
  } else {
    // Kilau lembut seperti boneka plastik halus, plus cahaya tepi tipis supaya bentuknya terasa bulat.
    m.specularColor = new Color3(0.16, 0.16, 0.16);
    m.specularPower = 22;
    const tepi = new FresnelParameters();
    tepi.leftColor = m.diffuseColor.scale(0.35).add(new Color3(0.12, 0.12, 0.12));
    tepi.rightColor = Color3.Black();
    tepi.bias = 0.55;
    tepi.power = 2.5;
    m.emissiveFresnelParameters = tepi;
  }
  m.metadata = { bersama: true };   // dipakai banyak avatar: jangan dibuang bersama satu avatar
  mats.set(key, m);
  return m;
}

// Bayangan lembut di bawah kaki (satu material bersama per adegan).
const bayangMat = new Map();
function bayangan(scene, parent) {
  let m = bayangMat.get(scene.uid);
  if (!m) {
    const tex = new DynamicTexture("bayang", 64, scene, false);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,0.42)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex.hasAlpha = true;
    tex.update();
    m = new StandardMaterial("bayang", scene);
    m.diffuseTexture = tex;
    m.useAlphaFromDiffuseTexture = true;
    m.specularColor = Color3.Black();
    m.disableLighting = true;
    m.emissiveColor = Color3.White();
    m.metadata = { bersama: true };
    bayangMat.set(scene.uid, m);
  }
  const d = MeshBuilder.CreateGround("bayang", { width: 1.25, height: 1.1 }, scene);
  d.material = m;
  d.position.y = 0.015;
  d.isPickable = false;
  d.parent = parent;
}

// Pembuat bentuk yang langsung ditempel ke induk.
function kit(scene, parent) {
  const place = (mesh, color, [x, y, z], s, rot) => {
    mesh.material = mat(scene, color);
    mesh.position.set(x, y, z);
    if (s) mesh.scaling.set(...s);
    if (rot) mesh.rotation.set(...rot);
    mesh.parent = parent;
    return mesh;
  };
  // Bola besar lebih banyak segi supaya mulus; bola kecil (mata, hiasan) cukup sedikit.
  const seg = (d) => (d >= 0.3 ? 24 : 12);
  const mata = [];   // mesh mata, dikecilkan sebentar saat berkedip
  return {
    mata,
    ball: (d, color, pos, s, rot) => place(MeshBuilder.CreateSphere("av", { diameter: d, segments: seg(d) }, scene), color, pos, s, rot),
    box: (w, h, d, color, pos, rot) => place(MeshBuilder.CreateBox("av", { width: w, height: h, depth: d }, scene), color, pos, null, rot),
    rod: (h, d, color, pos, rot) => place(MeshBuilder.CreateCylinder("av", { height: h, diameter: d, tessellation: 20 }, scene), color, pos, null, rot),
    dome: (d, color, pos, s) => place(MeshBuilder.CreateSphere("av", { diameter: d, segments: 24, slice: 0.5 }, scene), color, pos, s),
    cone: (h, d, color, pos, rot) => place(MeshBuilder.CreateCylinder("av", { height: h, diameterTop: 0, diameterBottom: d, tessellation: 20 }, scene), color, pos, null, rot),
    ring: (d, t, color, pos, rot) => place(MeshBuilder.CreateTorus("av", { diameter: d, thickness: t, tessellation: 28 }, scene), color, pos, null, rot),
  };
}

function eyesAndCheeks(k, { y, z, gap = 0.14, cheekY = y - 0.12 }) {
  for (const sx of [-1, 1]) {
    k.mata.push(k.ball(0.11, INK, [sx * gap, y, z], [1, 1.12, 1]));
    k.mata.push(k.ball(0.035, "#ffffff", [sx * gap + 0.02, y + 0.028, z + 0.045]));
    k.mata.push(k.ball(0.018, "#ffffff", [sx * gap - 0.018, y - 0.022, z + 0.05]));
    k.ball(0.11, "#ff9fb4", [sx * (gap + 0.11), cheekY, z - 0.04], [1.2, 0.6, 0.4]);
  }
}

// Tangan kecil untuk hewan yang belum punya tangan/sayap/sirip. x = jarak dari tengah badan.
const TANGAN = { manusia: 0.31, beruang: 0.43, kelinci: 0.41, kodok: 0.44, robo: 0.4, tikus: 0.41, kerbau: 0.41, macan: 0.41, naga: 0.41,
  kuda: 0.41, kambing: 0.41, monyet: 0.41, anjing: 0.41, babi: 0.41, dino: 0.3 };
function tangan(k, f, scene, induk) {
  const x = TANGAN[f.id];
  if (!x) return [];
  return [-1, 1].map((sx) => {
    const pivot = new TransformNode("tangan", scene);
    pivot.parent = induk;
    pivot.position.set(sx * x, 0.74, 0.04);
    const warna = f.id === "dino" ? f.belly : f.id === "robo" ? f.accent : f.body;
    const m = k.ball(0.2, warna, [0, -0.13, 0], [0.75, 1.4, 0.75]);
    m.parent = pivot;
    if (f.id === "dino") k.ball(0.105, f.body, [0, -0.26, 0.02]).parent = pivot;
    pivot.rotation.z = sx * 0.28;
    return pivot;
  });
}

// Badan dan kepala bulat dasar untuk shio; ciri khas tiap hewan ditambahkan di buildFamily.
function dasar(k, c, b, kaki, feet) {
  k.ball(0.88, c, [0, 0.5, 0], [1, 0.95, 0.9]); k.ball(0.52, b, [0, 0.5, 0.24], [1, 1, 0.5]);
  feet(c);
  const h = { y: 1.28, r: 0.42, z: 0, front: 0.42, neck: 0.9, eye: { y: 1.36, z: 0.36, gap: 0.14 } };
  k.ball(0.84, c, [0, h.y, 0]);
  return h;
}

// Bentuk badan per jenis. Mengembalikan info kepala untuk aksesori anggota keluarga.
function buildFamily(k, f, kaki) {
  const { body: c, belly: b, accent: a } = f;
  const feet = (col = a) => {
    for (const sx of [-1, 1]) kaki.push(k.ball(0.22, col, [sx * 0.18, 0.06, 0.12], [1, 0.5, 1.3]));
  };
  switch (f.id) {
    case "dino": {
      for (const sx of [-1, 1]) {
        const sepatu = k.ball(0.23, "#fffaf4", [sx * 0.13, 0.06, 0.12], [0.86, 0.52, 1.45]);
        kaki.push(sepatu);
        k.ball(0.18, b, [sx * 0.13, 0.26, 0.03], [1, 2.4, 1.1]);
        k.ball(0.106, "#fffaf4", [sx * 0.13, 0.104, 0.17], [1.12, 0.22, 0.6]);
        k.ball(0.063, "#cf8596", [sx * 0.186, 0.078, 0.126], [0.45, 0.7, 1.35]);
        k.ball(0.14, c, [sx * 0.31, 1.18, 0.03]);
      }
      k.ball(0.55, b, [0, 0.66, 0.02], [1, 1, 0.72]);
      const biru = "#4d798b";
      // Motif dinosaurus berleher panjang di bagian depan baju.
      k.ball(0.19, biru, [0.022, 0.63, 0.209], [1, 0.58, 0.11]);
      k.ball(0.105, biru, [-0.054, 0.697, 0.212], [0.52, 1.38, 0.22], [0, 0, 0.24]);
      k.ball(0.075, biru, [-0.083, 0.75, 0.209], [1.2, 0.72, 0.22]);
      k.ball(0.12, biru, [0.108, 0.647, 0.2], [1, 0.23, 0.15], [0, 0, 0.35]);
      for (const x of [-0.017, 0.052]) k.box(0.029, 0.049, 0.016, biru, [x, 0.582, 0.203]);
      for (const y of [0.785, 0.82, 0.855]) k.ball(0.031, "#bd955e", [0.025, y, 0.176], [1, 1, 0.45]);
      k.ball(0.23, a, [0.18, 1.035, -0.26], [0.85, 1.7, 0.9], [0, 0, 0.35]);
      k.ball(0.13, "#cf8596", [0.145, 1.15, -0.266], [0.95, 0.4, 0.98]);
      k.ball(0.64, a, [0, 1.25, -0.038], [1.03, 1.07, 0.99]);
      k.ball(0.65, c, [0, 1.21, 0.045], [1, 1.07, 0.93]);
      k.dome(0.67, a, [0, 1.32, 0.008], [1, 0.83, 1]);
      k.ball(0.36, a, [-0.12, 1.41, 0.234], [1, 0.34, 0.52], [0, 0, 0.49]);
      k.ball(0.34, a, [0.18, 1.385, 0.208], [0.88, 0.35, 0.53], [0, 0, -0.78]);
      eyesAndCheeks(k, { y: 1.205, z: 0.333, gap: 0.12 });
      k.ball(0.118, "#843f37", [0, 1.092, 0.331], [1, 0.43, 0.25]);
      k.ball(0.075, "#fffaf4", [0, 1.105, 0.346], [1.05, 0.18, 0.11]);
      return { y: 1.21, r: 0.39, z: 0.04, front: 0.31, neck: 0.87, eye: { y: 1.205, z: 0.37, gap: 0.12 } };
    }
    case "manusia": {
      for (const sx of [-1, 1]) {
        kaki.push(k.box(0.17, 0.39, 0.21, "#35465e", [sx * 0.13, 0.24, 0.04]));
        k.ball(0.15, c, [sx * 0.34, 1.18, 0.04]);
      }
      k.box(0.56, 0.49, 0.36, b, [0, 0.67, 0.02]);
      const head = { y: 1.21, r: 0.34 };
      k.ball(0.68, c, [0, head.y, 0.04], [1, 1.08, 0.94]);
      k.dome(0.7, a, [0, 1.31, 0.025], [1, 0.81, 1]);
      eyesAndCheeks(k, { y: 1.19, z: 0.34, gap: 0.12 });
      k.ball(0.07, "#843f37", [0, 1.07, 0.34], [1.3, 0.35, 0.4]);
      return head;
    }
    case "ulat": {
      k.ball(0.62, c, [0, 0.3, -0.45]); k.ball(0.25, b, [0.25, 0.32, -0.45]); k.ball(0.25, b, [-0.25, 0.32, -0.45]);
      k.ball(0.5, c, [0, 0.25, -0.88]);
      k.ball(0.72, c, [0, 0.45, 0.05]); k.ball(0.4, b, [0, 0.45, 0.3], [1, 1, 0.5]);
      const head = { y: 1.08, r: 0.42 };
      k.ball(0.84, c, [0, head.y, 0.05]);
      for (const sx of [-1, 1]) {
        k.rod(0.36, 0.04, a, [sx * 0.16, head.y + 0.52, 0.05], [0, 0, -sx * 0.4]);
        k.ball(0.12, a, [sx * 0.24, head.y + 0.7, 0.05]);
      }
      eyesAndCheeks(k, { y: head.y + 0.05, z: 0.43 });
      return { ...head, z: 0.05, front: 0.45, neck: 0.75, eye: { y: head.y + 0.05, z: 0.43, gap: 0.14 } };
    }
    case "robo": {
      k.rod(0.62, 0.7, c, [0, 0.42, 0]);
      k.box(0.42, 0.26, 0.05, b, [0, 0.46, 0.35]);
      k.ball(0.07, a, [-0.09, 0.46, 0.38]); k.ball(0.07, "#ef6f5e", [0.09, 0.46, 0.38]);
      feet(a);
      const head = { y: 1.2, r: 0.42 };
      k.box(0.92, 0.74, 0.76, c, [0, head.y, 0]);
      k.box(0.7, 0.5, 0.04, b, [0, head.y, 0.39]);
      for (const sx of [-1, 1]) k.rod(0.12, 0.22, a, [sx * 0.49, head.y, 0], [0, 0, Math.PI / 2]);
      k.rod(0.26, 0.04, a, [0, head.y + 0.5, 0]);
      k.ball(0.14, "#ef6f5e", [0, head.y + 0.66, 0]);
      eyesAndCheeks(k, { y: head.y + 0.05, z: 0.41, cheekY: head.y - 0.08 });
      return { y: head.y, r: 0.37, z: 0, front: 0.41, neck: 0.8, eye: { y: head.y + 0.05, z: 0.41, gap: 0.14 } };
    }
    case "beruang": {
      k.ball(0.9, c, [0, 0.5, 0], [1, 0.95, 0.9]); k.ball(0.55, b, [0, 0.5, 0.25], [1, 1, 0.5]);
      feet(c);
      const head = { y: 1.3, r: 0.42 };
      k.ball(0.84, c, [0, head.y, 0]);
      for (const sx of [-1, 1]) { k.ball(0.3, c, [sx * 0.3, head.y + 0.33, 0]); k.ball(0.16, b, [sx * 0.3, head.y + 0.33, 0.1], [1, 1, 0.5]); }
      k.ball(0.32, b, [0, head.y - 0.1, 0.36], [1.1, 0.8, 0.6]);
      k.ball(0.11, INK, [0, head.y - 0.04, 0.45], [1.3, 0.9, 1]);
      eyesAndCheeks(k, { y: head.y + 0.08, z: 0.37, cheekY: head.y - 0.06 });
      return { ...head, z: 0, front: 0.42, neck: 0.92, eye: { y: head.y + 0.08, z: 0.37, gap: 0.14 } };
    }
    case "kelinci": {
      k.ball(0.85, c, [0, 0.48, 0], [1, 0.95, 0.9]); k.ball(0.5, b, [0, 0.48, 0.24], [1, 1, 0.5]);
      feet(c);
      k.ball(0.2, c, [0, 0.4, -0.4]);
      const head = { y: 1.28, r: 0.4 };
      k.ball(0.8, c, [0, head.y, 0]);
      for (const sx of [-1, 1]) {
        k.ball(0.24, c, [sx * 0.15, head.y + 0.6, -0.02], [1, 3, 0.6], [0, 0, -sx * 0.12]);
        k.ball(0.13, a, [sx * 0.15, head.y + 0.6, 0.04], [1, 2.8, 0.4], [0, 0, -sx * 0.12]);
      }
      k.ball(0.09, a, [0, head.y - 0.06, 0.4]);
      eyesAndCheeks(k, { y: head.y + 0.06, z: 0.35 });
      return { ...head, z: 0, front: 0.4, neck: 0.88, eye: { y: head.y + 0.06, z: 0.35, gap: 0.14 } };
    }
    case "penguin": {
      k.ball(0.95, c, [0, 0.52, 0], [1, 1.05, 0.9]); k.ball(0.68, b, [0, 0.5, 0.2], [1, 1.1, 0.55]);
      for (const sx of [-1, 1]) k.ball(0.18, c, [sx * 0.47, 0.6, 0], [0.5, 2.2, 1.3], [0, 0, sx * 0.35]);
      feet(a);
      const head = { y: 1.32, r: 0.42 };
      k.ball(0.84, c, [0, head.y, 0]);
      k.ball(0.62, b, [0, head.y - 0.05, 0.2], [1.05, 0.9, 0.6]);
      k.ball(0.16, a, [0, head.y - 0.06, 0.44], [1.2, 0.6, 1.2]);
      eyesAndCheeks(k, { y: head.y + 0.06, z: 0.39, gap: 0.12 });
      return { ...head, z: 0, front: 0.44, neck: 0.94, eye: { y: head.y + 0.06, z: 0.39, gap: 0.12 } };
    }
    // ---------- 12 shio (Kelinci di atas) ----------
    case "tikus": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) { k.ball(0.36, c, [sx * 0.32, h.y + 0.34, 0], [1, 1, 0.4]); k.ball(0.22, a, [sx * 0.32, h.y + 0.34, 0.06], [1, 1, 0.3]); }
      k.ball(0.09, a, [0, h.y - 0.08, 0.42]);
      k.rod(0.7, 0.05, a, [0, 0.3, -0.6], [1.1, 0, 0]);
      eyesAndCheeks(k, { y: h.y + 0.06, z: 0.36 });
      return h;
    }
    case "kerbau": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) {
        k.cone(0.4, 0.14, a, [sx * 0.42, h.y + 0.3, 0], [0, 0, -sx * 0.9]);
        k.ball(0.2, c, [sx * 0.44, h.y + 0.02, 0], [1.4, 0.6, 0.6]);
      }
      k.ball(0.4, b, [0, h.y - 0.14, 0.32], [1.2, 0.8, 0.6]);
      for (const sx of [-1, 1]) k.ball(0.06, INK, [sx * 0.07, h.y - 0.14, 0.44]);
      eyesAndCheeks(k, { y: h.y + 0.1, z: 0.36, cheekY: h.y - 0.02 });
      return h;
    }
    case "macan": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) { k.ball(0.24, c, [sx * 0.28, h.y + 0.33, 0]); k.ball(0.12, b, [sx * 0.28, h.y + 0.33, 0.08], [1, 1, 0.5]); }
      for (const x of [-0.1, 0, 0.1]) k.box(0.04, 0.16, 0.04, a, [x, h.y + 0.32, 0.27], [-0.6, 0, 0]);
      for (const sx of [-1, 1]) k.box(0.16, 0.04, 0.04, a, [sx * 0.38, h.y + 0.02, 0.14], [0, sx * 0.5, 0]);
      k.ball(0.3, b, [0, h.y - 0.12, 0.33], [1.1, 0.7, 0.6]);
      k.ball(0.08, "#e2687e", [0, h.y - 0.06, 0.44]);
      eyesAndCheeks(k, { y: h.y + 0.08, z: 0.37 });
      return h;
    }
    case "naga": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) {
        k.rod(0.4, 0.06, a, [sx * 0.15, h.y + 0.52, -0.02], [0, 0, -sx * 0.35]);
        k.rod(0.16, 0.05, a, [sx * 0.24, h.y + 0.55, -0.02], [0, 0, -sx * 1.1]);
        k.rod(0.4, 0.035, a, [sx * 0.3, h.y - 0.18, 0.3], [0, 0, sx * 1.2]);
      }
      for (const y of [0.85, 0.55]) k.cone(0.16, 0.14, a, [0, y, -0.42], [-0.9, 0, 0]);
      k.ball(0.36, c, [0, 0.3, -0.55], [0.6, 0.6, 1.4]);
      k.ball(0.38, b, [0, h.y - 0.14, 0.32], [1.15, 0.75, 0.6]);
      eyesAndCheeks(k, { y: h.y + 0.08, z: 0.37 });
      return h;
    }
    case "ular": {
      // Badan melingkar; kepala di atas lingkaran.
      k.ring(0.95, 0.3, c, [0, 0.15, 0]);
      k.ring(0.6, 0.26, c, [0, 0.4, 0]);
      kaki.push(k.ball(0.3, c, [0, 0.66, 0.05]));
      k.rod(0.4, 0.3, c, [0, 0.82, 0.05]);
      const h = { y: 1.2, r: 0.4, z: 0.05, front: 0.4, neck: 0.85, eye: { y: 1.24, z: 0.4, gap: 0.14 } };
      k.ball(0.8, c, [0, h.y, h.z], [1.1, 0.9, 1]);
      k.rod(0.18, 0.025, a, [0, h.y - 0.28, h.z + 0.38], [Math.PI / 2, 0, 0]);
      eyesAndCheeks(k, { y: h.y + 0.04, z: h.z + 0.36 });
      return h;
    }
    case "kuda": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) k.cone(0.24, 0.14, c, [sx * 0.2, h.y + 0.42, 0]);
      k.ball(0.3, a, [0, h.y + 0.36, 0.05], [0.9, 0.6, 1.2]);
      k.ball(0.26, a, [0, h.y + 0.05, -0.32], [0.5, 1.6, 0.8]);
      k.ball(0.44, b, [0, h.y - 0.16, 0.3], [1.1, 0.8, 0.7]);
      for (const sx of [-1, 1]) k.ball(0.06, INK, [sx * 0.08, h.y - 0.16, 0.45]);
      eyesAndCheeks(k, { y: h.y + 0.1, z: 0.36, cheekY: h.y - 0.02 });
      return h;
    }
    case "kambing": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) {
        k.ring(0.24, 0.07, a, [sx * 0.24, h.y + 0.34, -0.06], [0, Math.PI / 2, 0]);
        k.ball(0.2, c, [sx * 0.44, h.y + 0.04, 0], [1.5, 0.6, 0.6]);
      }
      k.cone(0.2, 0.12, a, [0, h.y - 0.42, 0.3], [Math.PI, 0, 0]);
      k.ball(0.07, "#e2687e", [0, h.y - 0.08, 0.42]);
      eyesAndCheeks(k, { y: h.y + 0.08, z: 0.36 });
      return h;
    }
    case "monyet": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) { k.ball(0.28, c, [sx * 0.44, h.y + 0.02, 0]); k.ball(0.16, b, [sx * 0.46, h.y + 0.02, 0.06], [1, 1, 0.5]); }
      k.ball(0.62, b, [0, h.y - 0.02, 0.18], [1.05, 0.95, 0.7]);
      k.ring(0.4, 0.06, c, [0, 0.45, -0.55], [Math.PI / 2, 0, 0]);
      eyesAndCheeks(k, { y: h.y + 0.08, z: 0.4, gap: 0.12 });
      return { ...h, eye: { y: h.y + 0.08, z: 0.4, gap: 0.12 } };
    }
    case "ayam": {
      const h = dasar(k, c, b, kaki, () => { for (const sx of [-1, 1]) kaki.push(k.ball(0.18, "#f5a524", [sx * 0.16, 0.05, 0.12], [1, 0.4, 1.4])); });
      for (const sx of [-1, 1]) k.ball(0.22, b, [sx * 0.46, 0.55, 0], [0.5, 1.4, 1.1]);
      for (const [x, y] of [[-0.1, 0.38], [0, 0.44], [0.1, 0.38]]) k.ball(0.15, a, [x, h.y + y, 0.05], [0.6, 1, 1]);
      k.cone(0.2, 0.14, "#f5a524", [0, h.y - 0.08, 0.46], [Math.PI / 2, 0, 0]);
      k.ball(0.1, a, [0, h.y - 0.22, 0.38], [0.8, 1.2, 0.8]);
      eyesAndCheeks(k, { y: h.y + 0.1, z: 0.36 });
      return h;
    }
    case "anjing": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) k.ball(0.22, a, [sx * 0.4, h.y, 0], [0.7, 1.6, 0.7], [0, 0, sx * 0.3]);
      k.ball(0.34, b, [0, h.y - 0.12, 0.32], [1.1, 0.75, 0.6]);
      k.ball(0.12, INK, [0, h.y - 0.04, 0.45], [1.3, 0.9, 1]);
      k.ball(0.2, c, [0, 0.5, -0.45], [0.5, 0.5, 1.2]);
      eyesAndCheeks(k, { y: h.y + 0.1, z: 0.36, cheekY: h.y - 0.04 });
      return h;
    }
    case "babi": {
      const h = dasar(k, c, b, kaki, feet);
      for (const sx of [-1, 1]) k.cone(0.22, 0.2, a, [sx * 0.24, h.y + 0.38, 0], [0.3, 0, -sx * 0.3]);
      k.rod(0.1, 0.3, a, [0, h.y - 0.08, 0.42], [Math.PI / 2, 0, 0]);
      for (const sx of [-1, 1]) k.ball(0.06, "#b8506a", [sx * 0.06, h.y - 0.08, 0.48]);
      k.ring(0.16, 0.04, a, [0, 0.5, -0.46], [0, Math.PI / 2, 0]);
      eyesAndCheeks(k, { y: h.y + 0.12, z: 0.36, gap: 0.16 });
      return { ...h, eye: { y: h.y + 0.12, z: 0.36, gap: 0.16 } };
    }
    case "kodok":
    default: {
      k.ball(0.9, c, [0, 0.45, 0], [1.05, 0.85, 0.9]); k.ball(0.55, b, [0, 0.45, 0.25], [1, 1, 0.5]);
      feet(c);
      const head = { y: 1.12, r: 0.4 };
      k.ball(0.84, c, [0, head.y, 0], [1.25, 0.82, 1]);
      for (const sx of [-1, 1]) {
        k.ball(0.32, c, [sx * 0.24, head.y + 0.33, 0.12]);
        k.ball(0.24, "#ffffff", [sx * 0.24, head.y + 0.35, 0.2]);
        k.mata.push(k.ball(0.11, INK, [sx * 0.24, head.y + 0.36, 0.31]));
        k.mata.push(k.ball(0.035, "#ffffff", [sx * 0.24 + 0.02, head.y + 0.385, 0.355]));
        k.ball(0.11, "#ff9fb4", [sx * 0.33, head.y - 0.08, 0.32], [1.2, 0.6, 0.4]);
      }
      k.box(0.32, 0.03, 0.03, INK, [0, head.y - 0.1, 0.42]);
      return { y: head.y + 0.08, r: 0.42, z: 0.05, front: 0.42, neck: 0.8, eye: { y: head.y + 0.36, z: 0.31, gap: 0.24 } };
    }
  }
}

// Aksesori pembeda: ayah (kumis + dasi kupu-kupu), ibu (bunga + kalung), anak perempuan (2 pita), anak laki-laki (topi).
// skip = tempat yang sudah dipakai aksesori dari Toko (kepala/wajah/leher), hiasan bawaannya tidak dibuat.
function buildMember(k, memberId, h, accent, skip) {
  const top = h.y + h.r;
  switch (memberId) {
    case "ayah":
      if (!skip.has("wajah")) for (const sx of [-1, 1]) k.ball(0.15, "#4a3426", [sx * 0.07, h.y - 0.15, h.z + h.front - 0.02], [1.3, 0.45, 0.5], [0, 0, sx * 0.3]);
      if (!skip.has("leher")) {
        for (const sx of [-1, 1]) k.ball(0.16, accent, [sx * 0.08, h.neck, h.z + 0.33], [1.2, 0.8, 0.4]);
        k.ball(0.08, accent, [0, h.neck, h.z + 0.36]);
      }
      break;
    case "ibu": {
      if (!skip.has("kepala")) {
        const cx = 0.2, cy = top - 0.05, cz = h.z + 0.12;
        for (let i = 0; i < 5; i++) {
          const t = (i / 5) * Math.PI * 2;
          k.ball(0.12, accent, [cx + Math.cos(t) * 0.08, cy + Math.sin(t) * 0.08, cz]);
        }
        k.ball(0.09, "#ffd34d", [cx, cy, cz + 0.04]);
      }
      if (!skip.has("leher")) k.rod(0.04, 0.5, accent, [0, h.neck - 0.02, h.z], null);
      break;
    }
    case "putri":
      if (skip.has("kepala")) break;
      for (const sx of [-1, 1]) {
        const x = sx * (h.r * 0.75), y = top - 0.1;
        k.ball(0.16, accent, [x - 0.07, y, h.z], [1, 0.7, 0.5], [0, 0, 0.5]);
        k.ball(0.16, accent, [x + 0.07, y, h.z], [1, 0.7, 0.5], [0, 0, -0.5]);
        k.ball(0.07, accent, [x, y, h.z + 0.03]);
      }
      break;
    case "putra":
    default:
      // Kodok: mata di atas kepala, topi bawaan akan menutupi kacamata.
      if (skip.has("kepala") || (skip.has("wajah") && h.eye.y > h.y + 0.15)) break;
      k.dome(h.r * 2.05, accent, [0, h.y + h.r * 0.35, h.z], [1, 0.85, 1]);
      k.rod(0.03, 0.42, accent, [0, h.y + h.r * 0.38, h.z + h.r * 0.75], [0, 0, 0]).scaling.set(1, 1, 1.4);
      break;
  }
}

// Aksesori dari Toko (lihat shared/aksesori.js). h = info kepala dari buildFamily.
function buildAksesori(k, id, h) {
  const top = h.y + h.r, z = h.z, e = h.eye, half = Math.PI / 2;
  switch (id) {
    case "pita":
      k.ball(0.26, "#ff5c8a", [-0.13, top + 0.02, z], [1, 0.7, 0.45], [0, 0, 0.45]);
      k.ball(0.26, "#ff5c8a", [0.13, top + 0.02, z], [1, 0.7, 0.45], [0, 0, -0.45]);
      k.ball(0.11, "#ff8fb0", [0, top + 0.02, z + 0.04]);
      break;
    case "topi-pesta":
      k.cone(0.5, 0.36, "#4fb3f0", [0, top + 0.2, z]);
      k.ring(0.3, 0.04, "#ffd34d", [0, top + 0.1, z]);
      k.ball(0.12, "#ff5c8a", [0, top + 0.46, z]);
      break;
    case "topi-penyihir":
      k.rod(0.03, h.r * 2.3, "#5b3f9e", [0, top - 0.04, z]);
      k.cone(0.7, h.r * 1.3, "#7a55c7", [0, top + 0.3, z], [0.25, 0, 0]);
      k.ball(0.09, "#ffd34d", [0, top + 0.2, z + h.r * 0.55]);
      break;
    case "mahkota": {
      k.rod(0.14, 0.5, "#f5c542", [0, top + 0.02, z]);
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2;
        k.cone(0.14, 0.1, "#f5c542", [Math.cos(t) * 0.21, top + 0.15, z + Math.sin(t) * 0.21]);
      }
      k.ball(0.08, "#ef4f6e", [0, top + 0.03, z + 0.25]);
      break;
    }
    case "kacamata":
      for (const sx of [-1, 1]) k.ring(0.2, 0.035, "#3a6fd8", [sx * e.gap, e.y, e.z + 0.06], [half, 0, 0]);
      k.rod(e.gap * 2 - 0.2, 0.03, "#3a6fd8", [0, e.y, e.z + 0.06], [0, 0, half]);
      break;
    case "kacamata-hitam":
      for (const sx of [-1, 1]) k.box(0.22, 0.15, 0.03, "#1f232b", [sx * e.gap, e.y, e.z + 0.07]);
      k.rod(Math.max(0.02, e.gap * 2 - 0.22), 0.03, "#1f232b", [0, e.y + 0.03, e.z + 0.07], [0, 0, half]);
      break;
    case "syal":
      k.ring(0.62, 0.13, "#ef4f6e", [0, h.neck, z]);
      k.box(0.12, 0.3, 0.05, "#ef4f6e", [0.13, h.neck - 0.18, z + 0.32], [0.2, 0, 0.1]);
      break;
    case "medali":
      k.ring(0.5, 0.03, "#4f7fe0", [0, h.neck + 0.02, z], [0.35, 0, 0]);
      k.rod(0.04, 0.17, "#f5c542", [0, h.neck - 0.17, z + 0.38], [half, 0, 0]);
      break;
  }
}

// Kepala manekin untuk pajangan kios Toko Avatar, memakai aksesori dari Toko.
export function buildManekin(scene, parent, aksesori = []) {
  const k = kit(scene, parent);
  const h = { y: 0.55, r: 0.25, z: 0, front: 0.25, neck: 0.3, eye: { y: 0.6, z: 0.21, gap: 0.09 } };
  k.rod(0.3, 0.06, "#8d6e4a", [0, 0.15, 0]);
  k.rod(0.05, 0.28, "#8d6e4a", [0, 0.02, 0]);
  k.ball(0.5, "#f6ead8", [0, h.y, 0]);
  for (const id of rapikanAksesori(aksesori)) buildAksesori(k, id, h);
}

// Gerak kecil supaya avatar terasa hidup: bernapas dan berkedip saat diam, tangan berayun saat berjalan.
// Berjalan dikenali dari bob yang dinaikturunkan oleh arena (main.js), jadi arena tidak perlu diubah.
function hidupkan(scene, fig, bob, napas, mata, lengan, laptop, cangkul) {
  let t = Math.random() * 10, kedipLagi = 1 + Math.random() * 3, kedip = 0, gerak = 0, yLama = 0, tertutup = false;
  const sy = mata.map((m) => m.scaling.y);   // tinggi mata asli
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.1, scene.getEngine().getDeltaTime() / 1000);
    t += dt;
    // Berjalan bila bob bergerak naik-turun dalam 0,2 detik terakhir.
    if (Math.abs(bob.position.y - yLama) > 0.0005) gerak = 0.2; else gerak = Math.max(0, gerak - dt);
    yLama = bob.position.y;
    const jalan = gerak > 0;
    const s = jalan ? 0 : Math.sin(t * 2.2) * 0.018;
    napas.scaling.set(1 - s * 0.5, 1 + s, 1 - s * 0.5);
    const mengetik = laptop?.root.isEnabled() && !jalan;
    const mencangkul = cangkul?.isEnabled() && !jalan;
    const ayun = Math.sin(t * 3.4) * 0.48;
    lengan.forEach((p, i) => {
      p.rotation.x = mengetik ? -1.15 + Math.sin(t * 15 + i * Math.PI) * 0.15
        : mencangkul ? -0.9 + ayun
        : jalan ? Math.sin(t * 10 + i * Math.PI) * 0.7 : Math.sin(t * 2.2) * 0.06;
    });
    if (mengetik) laptop.tombol.forEach((key, i) => { key.position.y = 0.68 + Math.sin(t * 15 + i * Math.PI) * 0.013; });
    if (cangkul?.isEnabled()) cangkul.rotation.x = mencangkul ? 0.15 + ayun : 0.15;
    kedipLagi -= dt;
    if (kedipLagi <= 0) { kedip = 0.14; kedipLagi = 2.5 + Math.random() * 3.5; }
    kedip = Math.max(0, kedip - dt);
    if ((kedip > 0) !== tertutup) {
      tertutup = kedip > 0;
      mata.forEach((m, i) => { m.scaling.y = sy[i] * (tertutup ? 0.12 : 1); });
    }
  });
  fig.onDisposeObservable.add(() => scene.onBeforeRenderObservable.remove(obs));
}

// Membuat figur di bawah induk; mengembalikan { fig, bob, height }.
// bob = simpul yang dinaikturunkan saat berjalan.
export function buildAvatar3d(scene, parent, avatarId, accent, aksesori = [], aura = "", ortu = false) {
  const a = parseAvatar(avatarId) || parseAvatar(DEFAULT_AVATAR);
  const fig = new TransformNode("fig", scene);
  fig.parent = parent;
  fig.scaling.setAll(a.member.scale);
  buildAura(scene, fig, aura);   // di luar "bob" supaya tetap di tanah saat berjalan
  bayangan(scene, fig);   // tetap di tanah saat berjalan
  const bob = new TransformNode("bob", scene);
  bob.parent = fig;
  // "napas": simpul di dalam bob yang sedikit mengembang-mengempis saat diam.
  const napas = new TransformNode("napas", scene);
  napas.parent = bob;
  const k = kit(scene, napas);
  const kaki = [];
  const head = buildFamily(k, a.family, kaki);
  const lengan = tangan(k, a.family, scene, napas);
  const pakai = rapikanAksesori(aksesori);
  if (a.family.id !== "dino") buildMember(k, a.member.id, head, accent, new Set(pakai.map((x) => aksesoriById(x).slot)));
  for (const id of pakai) buildAksesori(k, id, head);
  let laptop, cangkul;
  if (ortu) {
    const root = new TransformNode("laptop-kerja", scene);
    root.parent = napas;
    const alat = kit(scene, root);
    alat.box(0.55, 0.055, 0.34, "#344862", [0, 0.64, 0.43]);
    alat.box(0.55, 0.34, 0.045, "#344862", [0, 0.815, 0.585], [0.15, 0, 0]);
    alat.box(0.46, 0.25, 0.015, "#75b9f3", [0, 0.815, 0.555], [0.15, 0, 0]);
    alat.box(0.10, 0.07, 0.015, "#a5c5e6", [0, 0.83, 0.611]);
    const tombol = [-0.13, 0.13].map((x) => alat.box(0.17, 0.025, 0.11, "#9cbfe5", [x, 0.68, 0.43]));
    root.setEnabled(false);
    laptop = { root, tombol };
    cangkul = new TransformNode("cangkul-kerja", scene);
    cangkul.parent = napas;
    cangkul.position.set(0.21, 0.64, 0.35);
    const alatSawah = kit(scene, cangkul);
    alatSawah.rod(0.82, 0.052, "#95603b", [0, -0.13, 0.05], [-0.36, 0, 0]);
    alatSawah.box(0.23, 0.13, 0.05, "#53636d", [0, -0.53, 0.19], [-0.35, 0, 0]);
    cangkul.setEnabled(false);
  }
  hidupkan(scene, fig, bob, napas, k.mata, lengan, laptop, cangkul);
  const meshes = bob.getChildMeshes();
  const tinggi = pakai.some((x) => x === "topi-penyihir" || x === "topi-pesta") ? 0.55 : 0;   // papan nama di atas topi
  const height = (head.y + head.r + 0.35 + tinggi) * a.member.scale;
  return { fig, bob, meshes, height, kaki, laptop: laptop?.root, cangkul };
}

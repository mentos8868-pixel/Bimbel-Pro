// Avatar 3D di arena: hewan/robot lucu dari bentuk sederhana (bola, kotak, tabung).
// Ukuran mengikuti anggota keluarga (ayah paling besar, anak lebih kecil).
import { MeshBuilder, StandardMaterial, Color3, TransformNode } from "@babylonjs/core";
import { parseAvatar, DEFAULT_AVATAR } from "../../shared/avatars.js";

const INK = "#2b2f3a";
const mats = new Map();
function mat(scene, hex) {
  const key = scene.uid + hex;
  if (mats.has(key)) return mats.get(key);
  const m = new StandardMaterial("av" + hex, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.08, 0.08, 0.08);
  mats.set(key, m);
  return m;
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
  return {
    ball: (d, color, pos, s, rot) => place(MeshBuilder.CreateSphere("av", { diameter: d, segments: 12 }, scene), color, pos, s, rot),
    box: (w, h, d, color, pos, rot) => place(MeshBuilder.CreateBox("av", { width: w, height: h, depth: d }, scene), color, pos, null, rot),
    rod: (h, d, color, pos, rot) => place(MeshBuilder.CreateCylinder("av", { height: h, diameter: d, tessellation: 10 }, scene), color, pos, null, rot),
    dome: (d, color, pos, s) => place(MeshBuilder.CreateSphere("av", { diameter: d, segments: 12, slice: 0.5 }, scene), color, pos, s),
  };
}

function eyesAndCheeks(k, { y, z, gap = 0.14, cheekY = y - 0.12 }) {
  for (const sx of [-1, 1]) {
    k.ball(0.11, INK, [sx * gap, y, z]);
    k.ball(0.035, "#ffffff", [sx * gap + 0.02, y + 0.025, z + 0.045]);
    k.ball(0.11, "#ff9fb4", [sx * (gap + 0.11), cheekY, z - 0.04], [1.2, 0.6, 0.4]);
  }
}

// Bentuk badan per jenis. Mengembalikan info kepala untuk aksesori anggota keluarga.
function buildFamily(k, f) {
  const { body: c, belly: b, accent: a } = f;
  const feet = (col = a) => { for (const sx of [-1, 1]) k.ball(0.22, col, [sx * 0.18, 0.06, 0.12], [1, 0.5, 1.3]); };
  switch (f.id) {
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
      return { ...head, z: 0.05, front: 0.45, neck: 0.75 };
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
      return { y: head.y, r: 0.37, z: 0, front: 0.41, neck: 0.8 };
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
      return { ...head, z: 0, front: 0.42, neck: 0.92 };
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
      return { ...head, z: 0, front: 0.4, neck: 0.88 };
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
      return { ...head, z: 0, front: 0.44, neck: 0.94 };
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
        k.ball(0.11, INK, [sx * 0.24, head.y + 0.36, 0.31]);
        k.ball(0.11, "#ff9fb4", [sx * 0.33, head.y - 0.08, 0.32], [1.2, 0.6, 0.4]);
      }
      k.box(0.32, 0.03, 0.03, INK, [0, head.y - 0.1, 0.42]);
      return { y: head.y + 0.08, r: 0.42, z: 0.05, front: 0.42, neck: 0.8 };
    }
  }
}

// Aksesori pembeda: ayah (kumis + dasi kupu-kupu), ibu (bunga), anak perempuan (2 pita), anak laki-laki (topi).
function buildMember(k, memberId, h, accent) {
  const top = h.y + h.r;
  switch (memberId) {
    case "ayah":
      for (const sx of [-1, 1]) k.ball(0.15, "#4a3426", [sx * 0.07, h.y - 0.15, h.z + h.front - 0.02], [1.3, 0.45, 0.5], [0, 0, sx * 0.3]);
      for (const sx of [-1, 1]) k.ball(0.16, accent, [sx * 0.08, h.neck, h.z + 0.33], [1.2, 0.8, 0.4]);
      k.ball(0.08, accent, [0, h.neck, h.z + 0.36]);
      break;
    case "ibu": {
      const cx = 0.2, cy = top - 0.05, cz = h.z + 0.12;
      for (let i = 0; i < 5; i++) {
        const t = (i / 5) * Math.PI * 2;
        k.ball(0.12, accent, [cx + Math.cos(t) * 0.08, cy + Math.sin(t) * 0.08, cz]);
      }
      k.ball(0.09, "#ffd34d", [cx, cy, cz + 0.04]);
      k.rod(0.04, 0.5, accent, [0, h.neck - 0.02, h.z], null);
      break;
    }
    case "putri":
      for (const sx of [-1, 1]) {
        const x = sx * (h.r * 0.75), y = top - 0.1;
        k.ball(0.16, accent, [x - 0.07, y, h.z], [1, 0.7, 0.5], [0, 0, 0.5]);
        k.ball(0.16, accent, [x + 0.07, y, h.z], [1, 0.7, 0.5], [0, 0, -0.5]);
        k.ball(0.07, accent, [x, y, h.z + 0.03]);
      }
      break;
    case "putra":
    default:
      k.dome(h.r * 2.05, accent, [0, h.y + h.r * 0.35, h.z], [1, 0.85, 1]);
      k.rod(0.03, 0.42, accent, [0, h.y + h.r * 0.38, h.z + h.r * 0.75], [0, 0, 0]).scaling.set(1, 1, 1.4);
      break;
  }
}

// Membuat figur di bawah induk; mengembalikan { fig, bob, height }.
// bob = simpul yang dinaikturunkan saat berjalan.
export function buildAvatar3d(scene, parent, avatarId, accent) {
  const a = parseAvatar(avatarId) || parseAvatar(DEFAULT_AVATAR);
  const fig = new TransformNode("fig", scene);
  fig.parent = parent;
  fig.scaling.setAll(a.member.scale);
  const bob = new TransformNode("bob", scene);
  bob.parent = fig;
  const k = kit(scene, bob);
  const head = buildFamily(k, a.family);
  buildMember(k, a.member.id, head, accent);
  const meshes = bob.getChildMeshes();
  const height = (head.y + head.r + 0.35) * a.member.scale;
  return { fig, bob, meshes, height };
}

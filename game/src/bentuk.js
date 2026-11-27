// Bentuk dasar yang lebih lembut untuk arena: kotak bersudut membulat.
// Caranya: bola kecil (jari-jari r) yang titik-titiknya digeser ke delapan sudut kotak.
// Titik tepat di tengah (koordinat 0) tidak digeser, sehingga wajah di antaranya meregang menjadi sisi datar.
// Normal bola disesuaikan dengan jari-jari tiap sumbu (normalElips).
import { Mesh, VertexData } from "@babylonjs/core";

// Murni (tanpa Babylon): titik bola berjari-jari r → titik kotak membulat bersetengah-ukuran `setengah`.
export function geserKeSudut(positions, setengah, r) {
  const out = new Array(positions.length);
  const sumbu = ["x", "y", "z"];
  for (let i = 0; i < positions.length; i++) {
    const k = sumbu[i % 3];
    const p = positions[i];
    // Sisa pembulatan (mis. cos(π/2) ≈ 6e-17) dianggap tepat di tengah.
    out[i] = Math.abs(p) < 1e-9 ? p : p + Math.sign(p) * (setengah[k] - r[k]);
  }
  return out;
}

// Murni: normal bola satuan → normal elipsoid berjari-jari r (n / r per sumbu, lalu dinormalkan).
// Tanpa ini, sudut yang dipipihkan (mis. jalan setapak) tampak seperti tabung karena cahayanya miring.
export function normalElips(normals, r) {
  const out = new Array(normals.length);
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i] / r.x, y = normals[i + 1] / r.y, z = normals[i + 2] / r.z;
    const p = Math.hypot(x, y, z) || 1;
    out[i] = x / p; out[i + 1] = y / p; out[i + 2] = z / p;
  }
  return out;
}

// r: angka atau {x,y,z}; dijepit supaya tidak melebihi setengah sisi.
export function kotakBulat(scene, name, { w, h, d, r = 0.08, segmen = 6 }) {
  const setengah = { x: w / 2, y: h / 2, z: d / 2 };
  const rr = typeof r === "number" ? { x: r, y: r, z: r } : r;
  const jari = {};
  for (const k of ["x", "y", "z"]) jari[k] = Math.max(0.0005, Math.min(rr[k], setengah[k] - 0.0005));
  const vd = VertexData.CreateSphere({ segments: segmen, diameter: 2 });
  const pos = Array.from(vd.positions);
  for (let i = 0; i < pos.length; i++) pos[i] *= jari[["x", "y", "z"][i % 3]];
  vd.positions = geserKeSudut(pos, setengah, jari);
  vd.normals = normalElips(Array.from(vd.normals), jari);
  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh, false);
  return mesh;
}

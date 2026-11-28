// Bentuk dasar yang lebih lembut untuk arena: kotak bersudut membulat.
// Dibangun dari enam kisi (satu per sisi). Garis kisi diletakkan tepat di batas lengkungan (±(setengah − r)),
// sehingga bagian datar benar-benar datar dengan normal tegak lurus (tidak bergradasi seperti bantal),
// dan hanya pita di tepi yang melengkung.
import { Mesh, VertexData } from "@babylonjs/core";

const SUMBU = ["x", "y", "z"];

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

// Koordinat kisi satu sumbu: pita lengkung (pita segmen) – bagian datar (1 segmen) – pita lengkung.
function garisKisi(s, r, pita) {
  const g = [];
  for (let i = 0; i <= pita; i++) g.push(-s + (r * i) / pita);
  for (let i = 0; i <= pita; i++) g.push(s - r + (r * i) / pita);
  return g;
}

// Urutan titik segitiga yang dipakai Babylon (lihat uji "arah putaran" di game/test/bentuk.test.js).
const PUTARAN = -1;

// Murni: data titik kotak membulat. r: angka atau {x,y,z}; dijepit supaya tidak melebihi setengah sisi.
export function dataKotakBulat({ w, h, d, r = 0.08, segmen = 6 }) {
  const setengah = { x: w / 2, y: h / 2, z: d / 2 };
  const rr = typeof r === "number" ? { x: r, y: r, z: r } : r;
  const jari = {};
  for (const k of SUMBU) jari[k] = Math.max(0.0005, Math.min(rr[k], setengah[k] - 0.0005));
  const pita = Math.max(2, Math.round(segmen / 3));
  const kisi = Object.fromEntries(SUMBU.map((k) => [k, garisKisi(setengah[k], jari[k], pita)]));

  const positions = [], normals = [], indices = [];
  for (let a = 0; a < 3; a++) {
    const [u, v] = [(a + 1) % 3, (a + 2) % 3];
    for (const tanda of [1, -1]) {
      const awal = positions.length / 3;
      const gu = kisi[SUMBU[u]], gv = kisi[SUMBU[v]];
      for (const qv of gv) {
        for (const qu of gu) {
          const q = [0, 0, 0];
          q[a] = tanda * setengah[SUMBU[a]]; q[u] = qu; q[v] = qv;
          // Titik terdekat di "inti" kotak, lalu arah keluar diskalakan dengan jari-jari tiap sumbu.
          const c = q.map((x, k) => Math.max(-(setengah[SUMBU[k]] - jari[SUMBU[k]]), Math.min(setengah[SUMBU[k]] - jari[SUMBU[k]], x)));
          const arah = q.map((x, k) => (x - c[k]) / jari[SUMBU[k]]);
          const pj = Math.hypot(...arah) || 1;
          const n = arah.map((x) => x / pj);
          positions.push(...c.map((x, k) => x + jari[SUMBU[k]] * n[k]));
          normals.push(...normalElips(n, jari));
        }
      }
      // (u × v) searah sumbu a; segitiga dibalik untuk sisi negatif dan bila PUTARAN negatif.
      const balik = tanda * PUTARAN < 0;
      const lebar = gu.length;
      for (let j = 0; j < gv.length - 1; j++) {
        for (let i = 0; i < lebar - 1; i++) {
          const p0 = awal + j * lebar + i, p1 = p0 + 1, p2 = p0 + lebar + 1, p3 = p0 + lebar;
          if (balik) indices.push(p0, p2, p1, p0, p3, p2);
          else indices.push(p0, p1, p2, p0, p2, p3);
        }
      }
    }
  }
  return { positions, normals, indices };
}

export function kotakBulat(scene, name, ukuran) {
  const vd = new VertexData();
  Object.assign(vd, dataKotakBulat(ukuran));
  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh, false);
  return mesh;
}

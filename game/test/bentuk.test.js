import { test } from "node:test";
import assert from "node:assert/strict";
import { VertexData } from "@babylonjs/core";
import { dataKotakBulat, normalElips } from "../src/bentuk.js";

const UKURAN = { w: 16, h: 1.3, d: 12, r: 0.07 };
const setengah = { x: 8, y: 0.65, z: 6 };

function titik(data, i) {
  const p = data.positions, n = data.normals;
  return { p: [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], n: [n[i * 3], n[i * 3 + 1], n[i * 3 + 2]] };
}

test("sisi datar memakai normal tegak lurus (tidak bergradasi)", () => {
  const data = dataKotakBulat(UKURAN);
  let atas = 0;
  for (let i = 0; i < data.positions.length / 3; i++) {
    const { p, n } = titik(data, i);
    const diAtasDatar = Math.abs(p[1] - setengah.y) < 1e-9
      && Math.abs(p[0]) <= setengah.x - UKURAN.r + 1e-9 && Math.abs(p[2]) <= setengah.z - UKURAN.r + 1e-9;
    if (!diAtasDatar) continue;
    atas++;
    assert.deepEqual(n.map((v) => +v.toFixed(9) + 0), [0, 1, 0]);
  }
  assert.ok(atas >= 4, `titik di sisi atas datar: ${atas}`);
});

test("semua titik di dalam kotak dan sisinya menyentuh batas", () => {
  const data = dataKotakBulat(UKURAN);
  const maks = [0, 0, 0];
  for (let i = 0; i < data.positions.length / 3; i++) {
    const { p } = titik(data, i);
    ["x", "y", "z"].forEach((k, a) => {
      assert.ok(Math.abs(p[a]) <= setengah[k] + 1e-9);
      maks[a] = Math.max(maks[a], Math.abs(p[a]));
    });
    // Tidak ada sudut tajam.
    assert.ok(!(Math.abs(p[0]) > setengah.x - 1e-6 && Math.abs(p[1]) > setengah.y - 1e-6 && Math.abs(p[2]) > setengah.z - 1e-6));
  }
  assert.deepEqual(maks.map((v) => +v.toFixed(9)), [8, 0.65, 6]);
});

test("normal panjangnya 1 dan indeks valid", () => {
  const data = dataKotakBulat({ ...UKURAN, r: { x: 1.2, y: 0.02, z: 1.2 }, segmen: 16 });
  for (let i = 0; i < data.normals.length; i += 3) {
    assert.ok(Math.abs(Math.hypot(data.normals[i], data.normals[i + 1], data.normals[i + 2]) - 1) < 1e-9);
  }
  const jumlah = data.positions.length / 3;
  assert.equal(data.indices.length % 3, 0);
  for (const i of data.indices) assert.ok(i >= 0 && i < jumlah);
});

// Arah putaran segitiga harus sama dengan kotak bawaan Babylon, supaya sisi depan tidak terbuang (back-face culling).
function arahPutaran(data) {
  let positif = 0, negatif = 0;
  const { positions: p, normals: n, indices: idx } = data;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const u = [0, 1, 2].map((k) => p[b * 3 + k] - p[a * 3 + k]);
    const v = [0, 1, 2].map((k) => p[c * 3 + k] - p[a * 3 + k]);
    const x = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...x) < 1e-12) continue;
    const rata = [0, 1, 2].map((k) => n[a * 3 + k] + n[b * 3 + k] + n[c * 3 + k]);
    const dot = x[0] * rata[0] + x[1] * rata[1] + x[2] * rata[2];
    if (dot > 0) positif++; else negatif++;
  }
  return { positif, negatif };
}

test("arah putaran segitiga sama dengan kotak Babylon", () => {
  const acuan = arahPutaran(VertexData.CreateBox({ width: 2, height: 1, depth: 3 }));
  const kita = arahPutaran(dataKotakBulat(UKURAN));
  const acuanPositif = acuan.positif > acuan.negatif;
  assert.equal(acuanPositif ? kita.negatif : kita.positif, 0, JSON.stringify({ acuan, kita }));
});

test("normal sudut pipih hampir tegak lurus ke atas", () => {
  const n = normalElips([Math.SQRT1_2, Math.SQRT1_2, 0], { x: 1.2, y: 0.02, z: 1.2 });
  assert.ok(n[1] > 0.99, `y = ${n[1]}`);
  assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-9);
});

test("normal sudut seragam tidak berubah", () => {
  const n = normalElips([0.6, 0.8, 0], { x: 0.1, y: 0.1, z: 0.1 });
  assert.deepEqual(n.map((v) => +v.toFixed(6) + 0), [0.6, 0.8, 0]);
});

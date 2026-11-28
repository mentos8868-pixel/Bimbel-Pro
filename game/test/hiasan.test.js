import { test } from "node:test";
import assert from "node:assert/strict";
import { tebarHiasan, jumlahHiasan } from "../src/hiasan.js";

const larangan = [{ minX: -1.5, maxX: 1.5, minZ: 8, maxZ: 19 }];
const lingkaranLarangan = [{ x: 0, z: 0, r: 8 }];

test("hiasan tidak masuk area larangan dan tetap di dalam arena", () => {
  const t = tebarHiasan({ jumlah: 300, radius: 36, larangan, lingkaranLarangan, benih: 7 });
  assert.equal(t.length, 300);
  for (const p of t) {
    assert.ok(Math.hypot(p.x, p.z) <= 36);
    assert.ok(Math.hypot(p.x, p.z) >= 8);
    assert.ok(!(p.x > -1.8 && p.x < 1.8 && p.z > 7.7 && p.z < 19.3));
    assert.equal(typeof p.putar, "number");
    assert.ok(p.skala > 0);
  }
});

test("benih sama menghasilkan susunan yang sama", () => {
  const a = tebarHiasan({ jumlah: 20, radius: 36, larangan, lingkaranLarangan, benih: 3 });
  const b = tebarHiasan({ jumlah: 20, radius: 36, larangan, lingkaranLarangan, benih: 3 });
  assert.deepEqual(a, b);
});

test("tempat penuh: berhenti dan mengembalikan yang muat", () => {
  const t = tebarHiasan({ jumlah: 50, radius: 5, larangan: [], lingkaranLarangan: [{ x: 0, z: 0, r: 6 }], benih: 1 });
  assert.equal(t.length, 0);
});

test("jumlah per kualitas", () => {
  assert.deepEqual(jumlahHiasan("rendah"), { rumput: 60, bunga: 20, batu: 8, awan: 3 });
  assert.deepEqual(jumlahHiasan("sedang"), { rumput: 180, bunga: 60, batu: 16, awan: 6 });
  assert.deepEqual(jumlahHiasan("tinggi"), { rumput: 260, bunga: 90, batu: 20, awan: 8 });
});

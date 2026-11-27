import { test } from "node:test";
import assert from "node:assert/strict";
import { geserKeSudut } from "../src/bentuk.js";

test("titik bola digeser ke sudut kotak", () => {
  const r = { x: 0.1, y: 0.1, z: 0.1 }, s = { x: 1, y: 0.5, z: 2 };
  const out = geserKeSudut([0.1, 0, 0, -0.1, 0, 0, 0, 0.1, 0], s, r);
  assert.deepEqual(out.map((v) => +v.toFixed(4) + 0), [1, 0, 0, -1, 0, 0, 0, 0.5, 0]);
});

test("semua titik tetap di dalam batas kotak", () => {
  const r = { x: 0.2, y: 0.01, z: 0.2 }, s = { x: 1.5, y: 0.02, z: 5.5 };
  const p = [0.2, 0.01, 0.2, -0.2, -0.01, -0.2, 0.14, 0.007, -0.14];
  const out = geserKeSudut(p, s, r);
  for (let i = 0; i < out.length; i += 3) {
    assert.ok(Math.abs(out[i]) <= s.x + 1e-9);
    assert.ok(Math.abs(out[i + 1]) <= s.y + 1e-9);
    assert.ok(Math.abs(out[i + 2]) <= s.z + 1e-9);
  }
});

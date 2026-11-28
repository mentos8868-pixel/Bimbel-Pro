import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Snapshot batas tabrakan sebelum arena diperhalus. Perbandingan dengan arena hidup dilakukan di browser:
// JSON.stringify(window.__arenaWalls) harus sama persis dengan isi berkas ini.
test("snapshot tabrakan berisi kotak yang valid", () => {
  const walls = JSON.parse(readFileSync(new URL("./walls-awal.json", import.meta.url), "utf8"));
  assert.equal(walls.length, 133);
  for (const w of walls) {
    for (const k of ["minX", "maxX", "minZ", "maxZ"]) assert.equal(typeof w[k], "number");
    assert.ok(w.minX < w.maxX && w.minZ < w.maxZ);
  }
});

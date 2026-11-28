// Uji aturan siapa boleh menerima chat di arena (keamanan anak).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.BIMBEL_DB = ":memory:";
const { db } = await import("../db.js");
const { bolehTerimaChat } = await import("../rooms/arena-social.js");

const now = Date.now();
function ortu(email, kepalaId = null) {
  const r = db.prepare("INSERT INTO parents (email, pass_hash, name, consent_at, created_at, kepala_id) VALUES (?, 'x', 'Ortu', ?, ?, ?)")
    .run(email, now, now, kepalaId);
  return { role: "ortu", parentId: Number(r.lastInsertRowid) };
}
function anak(parent, jenjang, chat) {
  const r = db.prepare("INSERT INTO children (parent_id, name, jenjang, color, pin_hash, chat, created_at) VALUES (?, 'Anak', ?, '#4f9cf0', '', ?, ?)")
    .run(parent.parentId, jenjang, chat, now);
  return { role: "anak", childId: Number(r.lastInsertRowid), parentId: parent.parentId, jenjang };
}

const ayahA = ortu("a@contoh.id");
const ibuA = ortu("ibu-a@contoh.id", ayahA.parentId);
const ortuB = ortu("b@contoh.id");
const remajaA = anak(ayahA, "SMP", "bebas");
const remajaB = anak(ortuB, "SMA", "bebas");
const sdA = anak(ayahA, "SD", "siap");
const anakMati = anak(ortuB, "SMP", "mati");

test("orang dewasa keluarga lain tidak bisa mengirim teks bebas ke anak", () => {
  assert.equal(bolehTerimaChat(ortuB, remajaA, false), false);
});

test("orang dewasa keluarga lain tetap bisa mengirim pesan siap pakai", () => {
  assert.equal(bolehTerimaChat(ortuB, remajaA, true), true);
});

test("orang tua sendiri (kepala dan pasangan) bisa mengirim teks bebas ke anaknya", () => {
  assert.equal(bolehTerimaChat(ayahA, remajaA, false), true);
  assert.equal(bolehTerimaChat(ibuA, remajaA, false), true);
});

test("sesama anak dengan chat bebas tetap bisa saling mengirim teks bebas", () => {
  assert.equal(bolehTerimaChat(remajaB, remajaA, false), true);
});

test("anak SD dan anak dengan chat siap hanya menerima pesan siap pakai", () => {
  assert.equal(bolehTerimaChat(remajaB, sdA, false), false);
  assert.equal(bolehTerimaChat(remajaB, sdA, true), true);
});

test("chat mati tidak menerima apa pun", () => {
  assert.equal(bolehTerimaChat(remajaA, anakMati, true), false);
});

test("sesama orang dewasa tetap bisa mengirim teks bebas", () => {
  assert.equal(bolehTerimaChat(ortuB, ayahA, false), true);
});

test("pemain yang saling blokir tidak menerima chat", () => {
  db.prepare("INSERT INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(`a${remajaA.childId}`, `a${remajaB.childId}`, now);
  assert.equal(bolehTerimaChat(remajaB, remajaA, true), false);
});

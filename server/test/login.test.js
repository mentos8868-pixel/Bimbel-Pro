// Uji masuk akun: batas percobaan per IP dan per ID masuk, serta jawaban untuk ID yang tidak terdaftar.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.BIMBEL_DB = ":memory:";
const { handleApi } = await import("../accounts.js");

// Panggil API tanpa server sungguhan.
async function api(method, path, body, ip = "10.0.0.1") {
  const data = body ? [Buffer.from(JSON.stringify(body))] : [];
  const req = {
    method, url: path, headers: { "x-bimbel": "1" }, socket: { remoteAddress: ip },
    async *[Symbol.asyncIterator]() { yield* data; },
  };
  const res = { status: 0, headers: {}, body: "", headersSent: false,
    writeHead(s, h) { this.status = s; this.headers = h; this.headersSent = true; },
    end(b) { this.body = b ? String(b) : ""; } };
  await handleApi(req, res);
  return { status: res.status, body: res.body ? JSON.parse(res.body) : null, headers: res.headers };
}

const SANDI = "rahasia-benar-123";
await api("POST", "/api/daftar", { email: "ayah@contoh.id", name: "Budi", password: SANDI, consent: true, peran: "ayah", login: "ayahbudi" }, "10.9.9.9");

test("masuk dengan ID dan sandi benar berhasil", async () => {
  const r = await api("POST", "/api/masuk", { login: "ayahbudi", password: SANDI }, "10.1.0.1");
  assert.equal(r.status, 200);
  assert.match(String(r.headers["Set-Cookie"]), /bp_ortu=/);
});

test("ID tidak terdaftar dan sandi salah memberi jawaban yang sama", async () => {
  const salah = await api("POST", "/api/masuk", { login: "ayahbudi", password: "salah-sandi" }, "10.2.0.1");
  const takAda = await api("POST", "/api/masuk", { login: "tidakada", password: "salah-sandi" }, "10.2.0.2");
  assert.equal(salah.status, 401);
  assert.deepEqual(takAda, salah);
});

test("ID tidak terdaftar tetap memeriksa sandi (lama jawaban mirip)", async () => {
  const ukur = async (login, ip) => { const t = performance.now(); await api("POST", "/api/masuk", { login, password: "x-salah-x" }, ip); return performance.now() - t; };
  const ada = await ukur("ayahbudi", "10.3.0.1");
  const takAda = await ukur("tidakada2", "10.3.0.2");
  assert.ok(takAda > ada * 0.3, `ID tak terdaftar dijawab terlalu cepat (${takAda.toFixed(1)}ms vs ${ada.toFixed(1)}ms)`);
});

test("satu IP dibatasi 10 percobaan salah", async () => {
  for (let i = 0; i < 10; i++) {
    assert.equal((await api("POST", "/api/masuk", { login: `coba${i}`, password: "salah" }, "10.4.0.1")).status, 401);
  }
  assert.equal((await api("POST", "/api/masuk", { login: "coba-lain", password: "salah" }, "10.4.0.1")).status, 429);
});

test("satu ID dibatasi 20 percobaan salah walau dari banyak IP", async () => {
  await api("POST", "/api/daftar", { email: "ibu@contoh.id", name: "Sari", password: SANDI, consent: true, peran: "ibu", login: "ibusari" }, "10.9.9.8");
  for (let i = 0; i < 20; i++) {
    assert.equal((await api("POST", "/api/masuk", { login: "ibusari", password: "salah" }, `10.5.${i}.1`)).status, 401);
  }
  // Sandi benar dari IP baru pun ditahan sampai batasnya lewat.
  assert.equal((await api("POST", "/api/masuk", { login: "ibusari", password: SANDI }, "10.6.0.1")).status, 429);
  // ID lain tidak ikut terkunci.
  assert.equal((await api("POST", "/api/masuk", { login: "ayahbudi", password: SANDI }, "10.6.0.2")).status, 200);
});

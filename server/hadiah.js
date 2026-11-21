// Hadiah tukar bintang: orang tua membuat daftar hadiah (mis. "50 bintang = Rp10.000" atau "100 bintang =
// jalan-jalan ke taman"). Anak mengajukan penukaran; bintang baru berkurang saat orang tua menyetujui.
// Hadiah uang otomatis dicatat sebagai uang saku masuk di Keuangan (oleh orang tua).
// Daftar hadiah berlaku untuk semua anak dalam satu keluarga.
import { db, today } from "./db.js";
import { notify } from "./social.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS hadiah (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    bintang INTEGER NOT NULL,         -- harga dalam bintang
    rupiah INTEGER NOT NULL DEFAULT 0, -- 0 = hadiah bukan uang
    aktif INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS hadiah_tukar (
    id INTEGER PRIMARY KEY,
    hadiah_id INTEGER NOT NULL REFERENCES hadiah(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,               -- disalin saat diajukan, supaya riwayat tetap benar bila hadiah diubah
    bintang INTEGER NOT NULL,
    rupiah INTEGER NOT NULL,
    status TEXT NOT NULL,             -- menunggu | disetujui | ditolak | batal (dibatalkan anak)
    created_at INTEGER NOT NULL,
    diputus_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS hadiah_tukar_anak ON hadiah_tukar(child_id, status);
`);

const MAKS_HADIAH = 20, MAKS_MENUNGGU = 3;
const teks = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
const angka = (v) => Math.round(Number(String(v ?? "").replace(/[^\d]/g, "")));

const daftarHadiah = (parentId) => db.prepare("SELECT id, nama, bintang, rupiah FROM hadiah WHERE parent_id = ? AND aktif = 1 ORDER BY bintang, id").all(parentId);
const riwayat = (childId) => db.prepare(
  "SELECT id, nama, bintang, rupiah, status, created_at AS at, diputus_at AS diputus FROM hadiah_tukar WHERE child_id = ? ORDER BY id DESC LIMIT 20",
).all(childId);
const bintangDitahan = (childId) => db.prepare("SELECT COALESCE(SUM(bintang), 0) AS n FROM hadiah_tukar WHERE child_id = ? AND status = 'menunggu'").get(childId).n;

function untukAnak(childId, parentId) {
  const bintang = db.prepare("SELECT bintang FROM children WHERE id = ?").get(childId)?.bintang || 0;
  const ditahan = bintangDitahan(childId);
  return { bintang, ditahan, bisaDipakai: Math.max(0, bintang - ditahan), hadiah: daftarHadiah(parentId), riwayat: riwayat(childId) };
}
function untukOrtu(parentId) {
  const kids = db.prepare("SELECT id, name, bintang FROM children WHERE parent_id = ? ORDER BY id").all(parentId);
  return {
    hadiah: daftarHadiah(parentId),
    anak: Object.fromEntries(kids.map((k) => [k.id, { bintang: k.bintang, riwayat: riwayat(k.id) }])),
  };
}

// Mengembalikan true bila permintaan ditangani.
export function handleHadiah({ m, path, body, ortuId, anak, send, ApiError }) {
  if (path[0] !== "hadiah") return false;

  // ----- anak -----
  if (path[1] === "saya" && m === "GET") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    return send(200, untukAnak(anak.child_id, anak.parent_id)), true;
  }
  if (path[2] === "tukar" && path.length === 3 && m === "POST") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    const h = db.prepare("SELECT * FROM hadiah WHERE id = ? AND parent_id = ? AND aktif = 1").get(Number(path[1]), anak.parent_id);
    if (!h) throw new ApiError(404, "Hadiah tidak ditemukan.");
    const id = anak.child_id;
    const n = db.prepare("SELECT COUNT(*) AS n FROM hadiah_tukar WHERE child_id = ? AND status = 'menunggu'").get(id).n;
    if (n >= MAKS_MENUNGGU) throw new ApiError(400, "Tunggu orang tua menjawab penukaranmu yang lain dulu, ya.");
    const k = untukAnak(id, anak.parent_id);
    if (k.bisaDipakai < h.bintang) throw new ApiError(400, `Bintangmu belum cukup. Perlu ${h.bintang} bintang.`);
    db.prepare("INSERT INTO hadiah_tukar (hadiah_id, child_id, nama, bintang, rupiah, status, created_at) VALUES (?, ?, ?, ?, ?, 'menunggu', ?)")
      .run(h.id, id, h.nama, h.bintang, h.rupiah, Date.now());
    return send(200, untukAnak(id, anak.parent_id)), true;
  }
  if (path[1] === "tukar" && path[3] === "batal" && m === "POST") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    const r = db.prepare("UPDATE hadiah_tukar SET status = 'batal', diputus_at = ? WHERE id = ? AND child_id = ? AND status = 'menunggu'")
      .run(Date.now(), Number(path[2]), anak.child_id);
    if (!r.changes) throw new ApiError(404, "Penukaran tidak ditemukan.");
    return send(200, untukAnak(anak.child_id, anak.parent_id)), true;
  }

  // ----- orang tua -----
  if (!ortuId) throw new ApiError(401, "Silakan masuk sebagai orang tua.");
  if (path.length === 1 && m === "GET") return send(200, untukOrtu(ortuId)), true;
  if (path.length === 1 && m === "POST") {
    const nama = teks(body.nama, 50);
    if (!nama) throw new ApiError(400, "Isi nama hadiah, misalnya \"Uang saku\".");
    const bintang = angka(body.bintang);
    if (!(bintang >= 1 && bintang <= 10000)) throw new ApiError(400, "Harga bintang antara 1 dan 10.000.");
    const rupiah = body.rupiah === "" || body.rupiah == null ? 0 : angka(body.rupiah);
    if (!(rupiah >= 0 && rupiah <= 10_000_000)) throw new ApiError(400, "Jumlah uang antara Rp0 dan Rp10.000.000.");
    const n = db.prepare("SELECT COUNT(*) AS n FROM hadiah WHERE parent_id = ? AND aktif = 1").get(ortuId).n;
    if (n >= MAKS_HADIAH) throw new ApiError(400, `Maksimal ${MAKS_HADIAH} hadiah.`);
    db.prepare("INSERT INTO hadiah (parent_id, nama, bintang, rupiah, created_at) VALUES (?, ?, ?, ?, ?)").run(ortuId, nama, bintang, rupiah, Date.now());
    for (const k of db.prepare("SELECT id FROM children WHERE parent_id = ?").all(ortuId)) {
      notify(`a${k.id}`, "info", `🎁 Hadiah baru: ${nama} (${bintang} bintang)`);
    }
    return send(200, untukOrtu(ortuId)), true;
  }
  if (path.length === 2 && m === "DELETE") {
    // Hadiah dinonaktifkan; penukaran yang masih menunggu ikut dibatalkan.
    const r = db.prepare("UPDATE hadiah SET aktif = 0 WHERE id = ? AND parent_id = ?").run(Number(path[1]), ortuId);
    if (!r.changes) throw new ApiError(404, "Hadiah tidak ditemukan.");
    db.prepare("UPDATE hadiah_tukar SET status = 'ditolak', diputus_at = ? WHERE hadiah_id = ? AND status = 'menunggu'").run(Date.now(), Number(path[1]));
    return send(200, untukOrtu(ortuId)), true;
  }
  if (path[1] === "tukar" && (path[3] === "setujui" || path[3] === "tolak") && m === "POST") {
    const t = db.prepare(`SELECT t.* FROM hadiah_tukar t JOIN children c ON c.id = t.child_id
                          WHERE t.id = ? AND c.parent_id = ? AND t.status = 'menunggu'`).get(Number(path[2]), ortuId);
    if (!t) throw new ApiError(404, "Penukaran tidak ditemukan atau sudah dijawab.");
    if (path[3] === "tolak") {
      db.prepare("UPDATE hadiah_tukar SET status = 'ditolak', diputus_at = ? WHERE id = ?").run(Date.now(), t.id);
      notify(`a${t.child_id}`, "info", `Penukaran "${t.nama}" belum disetujui orang tua. Bintangmu tetap utuh.`);
      return send(200, untukOrtu(ortuId)), true;
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      const c = db.prepare("SELECT bintang FROM children WHERE id = ?").get(t.child_id);
      if (c.bintang < t.bintang) throw new ApiError(400, "Bintang anak sudah tidak cukup (mungkin terpakai di Toko Avatar).");
      db.prepare("UPDATE children SET bintang = bintang - ? WHERE id = ?").run(t.bintang, t.child_id);
      db.prepare("UPDATE hadiah_tukar SET status = 'disetujui', diputus_at = ? WHERE id = ?").run(Date.now(), t.id);
      if (t.rupiah > 0) {
        db.prepare("INSERT INTO keuangan_catatan (child_id, jenis, jumlah, catatan, tanggal, created_at, oleh) VALUES (?, 'masuk', ?, ?, ?, ?, 'ortu')")
          .run(t.child_id, t.rupiah, `Tukar ${t.bintang} bintang: ${t.nama}`.slice(0, 80), today(), Date.now());
      }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    notify(`a${t.child_id}`, "info", `🎁 Penukaran "${t.nama}" disetujui! −${t.bintang} bintang${t.rupiah ? `, +Rp${t.rupiah.toLocaleString("id-ID")} uang saku` : ""}`);
    return send(200, untukOrtu(ortuId)), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

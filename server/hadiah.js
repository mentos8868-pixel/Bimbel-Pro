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
  CREATE TABLE IF NOT EXISTS hadiah_patungan (
    tukar_id INTEGER NOT NULL REFERENCES hadiah_tukar(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    bintang INTEGER NOT NULL CHECK (bintang > 0),
    PRIMARY KEY (tukar_id, child_id)
  );
  CREATE INDEX IF NOT EXISTS hadiah_patungan_anak ON hadiah_patungan(child_id);
  CREATE TABLE IF NOT EXISTS hadiah_cicilan (
    id INTEGER PRIMARY KEY,
    tukar_id INTEGER NOT NULL,
    child_id INTEGER NOT NULL,
    bintang INTEGER NOT NULL CHECK (bintang > 0),
    FOREIGN KEY (tukar_id, child_id) REFERENCES hadiah_patungan(tukar_id, child_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS hadiah_cicilan_patungan ON hadiah_cicilan(tukar_id, child_id);
`);
if (!db.prepare("PRAGMA table_info(hadiah_tukar)").all().some((kolom) => kolom.name === "patungan")) {
  db.exec("ALTER TABLE hadiah_tukar ADD COLUMN patungan INTEGER NOT NULL DEFAULT 0");
}
if (!db.prepare("PRAGMA table_info(hadiah_patungan)").all().some((kolom) => kolom.name === "diterima")) {
  db.exec("ALTER TABLE hadiah_patungan ADD COLUMN diterima INTEGER NOT NULL DEFAULT 0");
}
if (!db.prepare("PRAGMA table_info(hadiah)").all().some((kolom) => kolom.name === "ditukar")) {
  db.exec(`
    BEGIN IMMEDIATE;
    ALTER TABLE hadiah ADD COLUMN ditukar INTEGER NOT NULL DEFAULT 0;
    UPDATE hadiah SET ditukar = 1 WHERE id IN (SELECT hadiah_id FROM hadiah_tukar WHERE status = 'disetujui');
    UPDATE hadiah_tukar SET status = 'ditolak', diputus_at = unixepoch() * 1000
      WHERE status = 'menunggu' AND hadiah_id IN (SELECT id FROM hadiah WHERE ditukar = 1);
    COMMIT;
  `);
}

const MAKS_HADIAH = 20, MAKS_MENUNGGU = 3;
const teks = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
const angka = (v) => Math.round(Number(String(v ?? "").replace(/[^\d]/g, "")));

const daftarHadiah = (parentId) => db.prepare(`
  SELECT h.id, h.nama, h.bintang, h.rupiah,
    EXISTS (SELECT 1 FROM hadiah_tukar t WHERE t.hadiah_id = h.id AND t.status = 'menunggu') AS menunggu
  FROM hadiah h WHERE h.parent_id = ? AND h.aktif = 1 AND h.ditukar = 0 ORDER BY h.bintang, h.id
`).all(parentId);
const pesertaPatungan = (id) => db.prepare(`
  SELECT p.child_id AS id, c.name AS nama, p.bintang, p.diterima
  FROM hadiah_patungan p JOIN children c ON c.id = p.child_id WHERE p.tukar_id = ? ORDER BY p.child_id
`).all(id);
const rincianPatungan = (t) => {
  if (!t.patungan) return t;
  const peserta = pesertaPatungan(t.id);
  return {
    ...t, peserta,
    terkumpul: peserta.reduce((n, p) => n + p.bintang, 0),
    diterima: peserta.reduce((n, p) => n + p.diterima, 0),
  };
};
const riwayat = (childId) => db.prepare(`
  SELECT t.id, t.child_id AS pemilik, t.nama, t.bintang, t.rupiah, t.patungan, t.status,
    t.created_at AS at, t.diputus_at AS diputus, p.bintang AS bagian
  FROM hadiah_tukar t LEFT JOIN hadiah_patungan p ON p.tukar_id = t.id AND p.child_id = ?
  WHERE t.child_id = ? OR p.child_id IS NOT NULL ORDER BY t.id DESC LIMIT 20
`).all(childId, childId).map(rincianPatungan);
const bintangDitahan = (childId) => db.prepare(`
  SELECT COALESCE(SUM(bintang), 0) AS n FROM (
    SELECT bintang FROM hadiah_tukar WHERE child_id = ? AND status = 'menunggu' AND patungan = 0
    UNION ALL
    SELECT p.bintang FROM hadiah_patungan p JOIN hadiah_tukar t ON t.id = p.tukar_id
      WHERE p.child_id = ? AND t.status = 'menunggu'
  )
`).get(childId, childId).n;
const saldo = (id) => db.prepare("SELECT bintang FROM children WHERE id = ?").get(id)?.bintang || 0;
const bisaDipakai = (id) => Math.max(0, saldo(id) - bintangDitahan(id));
function catatBagian(id, anak, bintang) {
  db.prepare(`
    INSERT INTO hadiah_patungan (tukar_id, child_id, bintang) VALUES (?, ?, ?)
    ON CONFLICT (tukar_id, child_id) DO UPDATE SET bintang = hadiah_patungan.bintang + excluded.bintang
  `).run(id, anak, bintang);
  db.prepare("INSERT INTO hadiah_cicilan (tukar_id, child_id, bintang) VALUES (?, ?, ?)").run(id, anak, bintang);
}

function denganCicilan(t) {
  const daftar = db.prepare("SELECT child_id, bintang FROM hadiah_cicilan WHERE tukar_id = ? ORDER BY id").all(t.id);
  const peserta = t.peserta.map((p) => {
    const cicilan = daftar.filter((c) => c.child_id === p.id).map((c) => c.bintang);
    const sebelumnya = p.bintang - cicilan.reduce((total, jumlah) => total + jumlah, 0);
    return { ...p, cicilan, sebelumnya };
  });
  return { ...t, peserta };
}
function transaksi(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const hasil = fn();
    db.exec("COMMIT");
    return hasil;
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
function cekBagian(jumlah, id, maksimum, ApiError) {
  if (!Number.isSafeInteger(jumlah) || jumlah < 1 || jumlah > maksimum) {
    throw new ApiError(400, `Isi bagian patungan antara 1 dan ${maksimum} bintang.`);
  }
  if (jumlah > bisaDipakai(id)) throw new ApiError(400, "Bintangmu yang bisa dipakai belum cukup.");
}

function untukAnak(childId, parentId) {
  const bintang = saldo(childId);
  const ditahan = bintangDitahan(childId);
  const patungan = db.prepare(`
    SELECT t.id, t.hadiah_id AS hadiahId, t.child_id AS pemilik, t.nama, t.bintang, t.patungan
    FROM hadiah_tukar t JOIN hadiah h ON h.id = t.hadiah_id
    WHERE h.parent_id = ? AND t.patungan = 1 AND t.status = 'menunggu' ORDER BY t.id DESC
  `).all(parentId).map((t) => denganCicilan(rincianPatungan(t)));
  const punyaSaudara = Boolean(db.prepare("SELECT 1 FROM children WHERE parent_id = ? AND id <> ? LIMIT 1").get(parentId, childId));
  return { bintang, ditahan, bisaDipakai: Math.max(0, bintang - ditahan), hadiah: daftarHadiah(parentId), riwayat: riwayat(childId), patungan, punyaSaudara };
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
  if ((path[2] === "tukar" || path[2] === "patungan") && path.length === 3 && m === "POST") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    const id = anak.child_id;
    const patungan = path[2] === "patungan";
    transaksi(() => {
      const h = db.prepare("SELECT * FROM hadiah WHERE id = ? AND parent_id = ? AND aktif = 1").get(Number(path[1]), anak.parent_id);
      if (!h) throw new ApiError(404, "Hadiah tidak ditemukan.");
      if (h.ditukar) throw new ApiError(409, "Hadiah ini sudah ditukar oleh keluarga.");
      const aktif = db.prepare("SELECT 1 FROM hadiah_tukar WHERE hadiah_id = ? AND status = 'menunggu' LIMIT 1").get(h.id);
      if (aktif) throw new ApiError(409, "Hadiah ini sudah punya pengajuan aktif.");
      const n = db.prepare("SELECT COUNT(*) AS n FROM hadiah_tukar WHERE child_id = ? AND status = 'menunggu'").get(id).n;
      if (n >= MAKS_MENUNGGU) throw new ApiError(400, "Tunggu orang tua menjawab penukaranmu yang lain dulu, ya.");
      if (patungan) {
        if (h.rupiah > 0 || h.bintang < 2) throw new ApiError(400, "Patungan hanya untuk hadiah bukan uang yang bisa dibagi bintangnya.");
        if (!db.prepare("SELECT 1 FROM children WHERE parent_id = ? AND id <> ? LIMIT 1").get(anak.parent_id, id)) {
          throw new ApiError(400, "Patungan perlu dua anak dalam satu keluarga.");
        }
        cekBagian(body.bintang, id, h.bintang - 1, ApiError);
      } else if (bisaDipakai(id) < h.bintang) {
        throw new ApiError(400, `Bintangmu belum cukup. Perlu ${h.bintang} bintang.`);
      }
      const hasil = db.prepare("INSERT INTO hadiah_tukar (hadiah_id, child_id, nama, bintang, rupiah, status, created_at, patungan) VALUES (?, ?, ?, ?, ?, 'menunggu', ?, ?)")
        .run(h.id, id, h.nama, h.bintang, h.rupiah, Date.now(), Number(patungan));
      if (patungan) catatBagian(hasil.lastInsertRowid, id, body.bintang);
    });
    return send(200, untukAnak(id, anak.parent_id)), true;
  }
  if (path[1] === "patungan" && path.length === 4 && ["ikut", "keluar"].includes(path[3]) && m === "POST") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    transaksi(() => {
      const t = db.prepare(`
        SELECT t.* FROM hadiah_tukar t JOIN hadiah h ON h.id = t.hadiah_id
        WHERE t.id = ? AND h.parent_id = ? AND h.aktif = 1 AND h.ditukar = 0 AND t.patungan = 1 AND t.rupiah = 0 AND t.status = 'menunggu'
      `).get(Number(path[2]), anak.parent_id);
      if (!t) throw new ApiError(404, "Patungan tidak ditemukan atau sudah selesai.");
      if (path[3] === "keluar") {
        if (t.child_id === anak.child_id) throw new ApiError(400, "Gunakan Batalkan untuk menutup patungan yang kamu buat.");
        const r = db.prepare("DELETE FROM hadiah_patungan WHERE tukar_id = ? AND child_id = ?").run(t.id, anak.child_id);
        if (!r.changes) throw new ApiError(404, "Kamu belum ikut patungan ini.");
        return;
      }
      const { peserta, terkumpul } = rincianPatungan(t);
      if (terkumpul >= t.bintang) throw new ApiError(400, "Bintang untuk patungan ini sudah cukup.");
      const pesertaTunggal = peserta.length === 1 && peserta[0].id === anak.child_id;
      const maksimum = t.bintang - terkumpul - Number(pesertaTunggal);
      if (maksimum < 1) throw new ApiError(400, "Sisakan satu bintang untuk anak lain agar tetap bisa patungan.");
      cekBagian(body.bintang, anak.child_id, maksimum, ApiError);
      catatBagian(t.id, anak.child_id, body.bintang);
    });
    return send(200, untukAnak(anak.child_id, anak.parent_id)), true;
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
    const n = db.prepare("SELECT COUNT(*) AS n FROM hadiah WHERE parent_id = ? AND aktif = 1 AND ditukar = 0").get(ortuId).n;
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
    const setuju = path[3] === "setujui";
    const { t, peserta, cicilan } = transaksi(() => {
      const t = db.prepare(`SELECT t.* FROM hadiah_tukar t JOIN children c ON c.id = t.child_id
                            WHERE t.id = ? AND c.parent_id = ? AND t.status = 'menunggu'`).get(Number(path[2]), ortuId);
      if (!t) throw new ApiError(404, "Penukaran tidak ditemukan atau sudah dijawab.");
      const peserta = t.patungan ? pesertaPatungan(t.id) : [{ id: t.child_id, bintang: t.bintang }];
      if (!setuju) {
        db.prepare("UPDATE hadiah_tukar SET status = 'ditolak', diputus_at = ? WHERE id = ?").run(Date.now(), t.id);
        return { t, peserta };
      }
      const hadiah = db.prepare("SELECT aktif, ditukar FROM hadiah WHERE id = ? AND parent_id = ?").get(t.hadiah_id, ortuId);
      if (!hadiah?.aktif || hadiah.ditukar) throw new ApiError(409, "Hadiah ini sudah ditukar atau tidak aktif.");
      if (t.patungan) {
        if (t.rupiah !== 0) throw new ApiError(400, "Patungan hanya untuk hadiah selain uang.");
        const terkumpul = peserta.reduce((n, p) => n + p.bintang, 0);
        if (terkumpul < t.bintang) {
          const r = db.prepare("UPDATE hadiah_patungan SET diterima = bintang WHERE tukar_id = ? AND diterima < bintang").run(t.id);
          if (!r.changes) throw new ApiError(409, "Belum ada cicilan baru untuk disetujui.");
          return { t, peserta, cicilan: true };
        }
        if (peserta.length < 2 || terkumpul !== t.bintang) {
          throw new ApiError(400, "Patungan harus dibayar sesuai harga oleh minimal dua anak.");
        }
      }
      const potong = db.prepare("UPDATE children SET bintang = bintang - ? WHERE id = ? AND parent_id = ? AND bintang >= ?");
      for (const p of peserta) {
        if (!potong.run(p.bintang, p.id, ortuId, p.bintang).changes) {
          throw new ApiError(400, "Bintang salah satu anak sudah tidak cukup (mungkin terpakai di Toko Avatar).");
        }
      }
      db.prepare("UPDATE hadiah_tukar SET status = 'disetujui', diputus_at = ? WHERE id = ?").run(Date.now(), t.id);
      db.prepare("UPDATE hadiah SET ditukar = 1 WHERE id = ?").run(t.hadiah_id);
      db.prepare("UPDATE hadiah_tukar SET status = 'ditolak', diputus_at = ? WHERE hadiah_id = ? AND status = 'menunggu'").run(Date.now(), t.hadiah_id);
      if (t.patungan) db.prepare("UPDATE hadiah_patungan SET diterima = bintang WHERE tukar_id = ?").run(t.id);
      if (t.rupiah > 0) {
        db.prepare("INSERT INTO keuangan_catatan (child_id, jenis, jumlah, catatan, tanggal, created_at, oleh) VALUES (?, 'masuk', ?, ?, ?, ?, 'ortu')")
          .run(t.child_id, t.rupiah, `Tukar ${t.bintang} bintang: ${t.nama}`.slice(0, 80), today(), Date.now());
      }
      return { t, peserta };
    });
    if (cicilan) return send(200, untukOrtu(ortuId)), true;
    for (const p of peserta) {
      const pesan = setuju
        ? `🎁 Penukaran "${t.nama}" disetujui! −${p.bintang} bintang${t.rupiah ? `, +Rp${t.rupiah.toLocaleString("id-ID")} uang saku` : ""}`
        : `Penukaran "${t.nama}" belum disetujui orang tua. Bintangmu tetap utuh.`;
      notify(`a${p.id}`, "info", pesan);
    }
    return send(200, untukOrtu(ortuId)), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

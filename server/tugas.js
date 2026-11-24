// Tugas dari orang tua untuk anak (mis. salat, mencuci piring, belajar).
// Alur: orang tua membuat tugas -> anak menekan "Sudah" (status menunggu) -> orang tua Setujui (bintang
// hadiah ditambahkan ke saldo anak) atau Belum (anak boleh menandai lagi).
// Jadwal: "harian" (setiap hari), "hari" (hari tertentu dalam seminggu), atau "sekali" (tampil sampai disetujui).
// Hari dihitung menurut WIB (lihat today() di db.js).
import { db, today, lastDays } from "./db.js";
import { notify } from "./social.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS tugas (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    judul TEXT NOT NULL,
    jenis TEXT NOT NULL,              -- ibadah | rumah | belajar | lainnya
    jadwal TEXT NOT NULL,             -- harian | hari | sekali
    hari TEXT NOT NULL DEFAULT '',    -- untuk jadwal "hari": angka hari dipisah koma (0 = Minggu)
    bintang INTEGER NOT NULL DEFAULT 0,
    aktif INTEGER NOT NULL DEFAULT 1,
    mulai TEXT NOT NULL,              -- tanggal dibuat (YYYY-MM-DD, WIB)
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tugas_anak ON tugas(child_id, aktif);
  CREATE TABLE IF NOT EXISTS tugas_dana (
    tugas_id INTEGER PRIMARY KEY REFERENCES tugas(id) ON DELETE CASCADE,
    pembuat_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
    cadangan INTEGER NOT NULL
  );
  CREATE TRIGGER IF NOT EXISTS kembalikan_cadangan_tugas BEFORE DELETE ON tugas_dana
  WHEN OLD.cadangan > 0 BEGIN
    UPDATE parents SET bintang = bintang + OLD.cadangan WHERE id = OLD.pembuat_id;
  END;
  CREATE TABLE IF NOT EXISTS tugas_catatan (
    tugas_id INTEGER NOT NULL REFERENCES tugas(id) ON DELETE CASCADE,
    tanggal TEXT NOT NULL,            -- hari tugas dikerjakan (YYYY-MM-DD, WIB)
    status TEXT NOT NULL,             -- menunggu | disetujui | belum
    diubah_at INTEGER NOT NULL,
    PRIMARY KEY (tugas_id, tanggal)
  );
`);

export const JENIS = { ibadah: "Ibadah", rumah: "Rumah", belajar: "Belajar", lainnya: "Lainnya" };
const MAKS_TUGAS_PER_ANAK = 30;
const MAKS_BINTANG_HARIAN = 10;
const SATU_HARI_MS = 86_400_000;
const bintangDiberikan = db.prepare(`
  SELECT COALESCE(SUM(t.bintang), 0) AS jumlah
  FROM tugas_catatan c JOIN tugas t ON t.id = c.tugas_id
  WHERE t.child_id = ? AND c.status = 'disetujui' AND c.diubah_at >= ? AND c.diubah_at < ?
`);

function kuotaBintang(childId, sekarang = Date.now()) {
  const awal = Date.parse(today(sekarang) + "T00:00:00+07:00");
  const jumlah = bintangDiberikan.get(childId, awal, awal + SATU_HARI_MS).jumlah;
  return { batas: MAKS_BINTANG_HARIAN, sisa: Math.max(0, MAKS_BINTANG_HARIAN - jumlah) };
}

const TGL = /^\d{4}-\d{2}-\d{2}$/;
const hariKe = (tgl) => new Date(tgl + "T05:00:00Z").getUTCDay();   // 05:00 UTC = 12:00 WIB, hari yang sama

// Apakah tugas t berlaku pada tanggal tgl.
function berlaku(t, tgl, catatan) {
  if (tgl < t.mulai) return false;
  if (t.jadwal === "harian") return true;
  if (t.jadwal === "hari") return t.hari.split(",").map(Number).includes(hariKe(tgl));
  // sekali: tampil sampai disetujui; setelah itu hanya di hari disetujui.
  const ok = catatan.find((c) => c.status === "disetujui");
  return ok ? ok.tanggal === tgl : tgl === today();
}

const catatanDari = (ids) => {
  if (!ids.length) return new Map();
  const rows = db.prepare(`SELECT * FROM tugas_catatan WHERE tugas_id IN (${ids.map(() => "?").join(",")})`).all(...ids);
  const m = new Map(ids.map((id) => [id, []]));
  for (const r of rows) m.get(r.tugas_id).push(r);
  return m;
};
// Status tugas hari ini. Tugas "sekali" memakai catatan terakhirnya (bisa dari hari sebelumnya).
function statusKini(t, c, hariIni) {
  if (t.jadwal !== "sekali") return c.find((x) => x.tanggal === hariIni)?.status || "";
  if (c.some((x) => x.status === "disetujui")) return "disetujui";
  return [...c].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))[0]?.status || "";
}
const publik = (t) => ({ id: t.id, judul: t.judul, jenis: t.jenis, jadwal: t.jadwal, hari: t.hari ? t.hari.split(",").map(Number) : [], bintang: t.bintang });

// Ringkasan tugas satu anak: daftar tugas aktif beserta status hari ini, yang menunggu dicek, dan angka 7 hari.
export function tugasAnak(childId) {
  const list = db.prepare("SELECT * FROM tugas WHERE child_id = ? AND aktif = 1 ORDER BY id").all(childId);
  const cat = catatanDari(list.map((t) => t.id));
  const hariIni = today();
  const tugas = list.map((t) => {
    const c = cat.get(t.id);
    return { ...publik(t), hariIni: berlaku(t, hariIni, c), status: statusKini(t, c, hariIni) };
  });
  // Yang menunggu dicek (tujuh hari terakhir), termasuk tugas yang sudah dihapus tetap tidak ikut.
  const minggu = lastDays(7);
  const menunggu = [];
  let wajib = 0, beres = 0;
  for (const t of list) {
    const c = cat.get(t.id);
    for (const x of c) if (x.status === "menunggu" && x.tanggal >= minggu[0]) menunggu.push({ id: t.id, judul: t.judul, jenis: t.jenis, bintang: t.bintang, tanggal: x.tanggal });
    for (const d of minggu) {
      if (!berlaku(t, d, c)) continue;
      wajib++;
      if (c.some((x) => x.tanggal === d && x.status === "disetujui")) beres++;
    }
  }
  menunggu.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  const hari = tugas.filter((t) => t.hariIni);
  return {
    tugas, menunggu,
    hariIni: { total: hari.length, disetujui: hari.filter((t) => t.status === "disetujui").length, menunggu: hari.filter((t) => t.status === "menunggu").length },
    minggu: { wajib, beres, persen: wajib ? Math.round((beres / wajib) * 100) : null },
  };
}

function validTugas(b) {
  const judul = String(b.judul ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 60);
  if (!judul) throw new Error("Isi nama tugas.");
  const jenis = JENIS[b.jenis] ? b.jenis : "lainnya";
  const jadwal = ["harian", "hari", "sekali"].includes(b.jadwal) ? b.jadwal : "harian";
  const hari = jadwal === "hari" ? [...new Set((Array.isArray(b.hari) ? b.hari : []).map(Number).filter((n) => n >= 0 && n <= 6))].sort() : [];
  if (jadwal === "hari" && !hari.length) throw new Error("Pilih minimal satu hari.");
  const bintang = Number(b.bintang);
  if (!Number.isInteger(bintang) || bintang < 1 || bintang > 3) throw new Error("Pilih 1, 2, atau 3 bintang.");
  return { judul, jenis, jadwal, hari: hari.join(","), bintang };
}

// Mengembalikan true bila permintaan ditangani.
// ortuId = id orang tua yang masuk (atau null), anak = sesi anak (atau null), ownChild(pid, id) melempar 404 bila bukan anaknya.
export function handleTugas({ m, path, body, url, ortuId, ortuSaya, anak, ownChild, send, ApiError }) {
  if (path[0] !== "tugas") return false;
  const salah = (fn) => { try { return fn(); } catch (e) { throw e instanceof ApiError ? e : new ApiError(400, e.message); } };

  // ----- anak -----
  if (path[1] === "saya" && m === "GET") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    return send(200, tugasAnak(anak.child_id)), true;
  }
  if (path[2] === "sudah" && m === "POST") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    const t = db.prepare("SELECT * FROM tugas WHERE id = ? AND child_id = ? AND aktif = 1").get(Number(path[1]), anak.child_id);
    if (!t) throw new ApiError(404, "Tugas tidak ditemukan.");
    const hariIni = today();
    const c = catatanDari([t.id]).get(t.id);
    if (!berlaku(t, hariIni, c)) throw new ApiError(400, "Tugas ini bukan untuk hari ini.");
    const st = statusKini(t, c, hariIni);
    if (st === "disetujui") throw new ApiError(400, "Tugas ini sudah disetujui.");
    if (st === "menunggu") throw new ApiError(400, "Tugas ini sedang menunggu dicek orang tua.");
    db.prepare(`INSERT INTO tugas_catatan (tugas_id, tanggal, status, diubah_at) VALUES (?, ?, 'menunggu', ?)
                ON CONFLICT(tugas_id, tanggal) DO UPDATE SET status = 'menunggu', diubah_at = excluded.diubah_at`).run(t.id, hariIni, Date.now());
    return send(200, tugasAnak(anak.child_id)), true;
  }

  // ----- orang tua -----
  if (!ortuId) throw new ApiError(401, "Silakan masuk sebagai orang tua.");
  function potongSaldo(id, jumlah) {
    const hasil = db.prepare("UPDATE parents SET bintang = bintang - ? WHERE id = ? AND bintang >= ?").run(jumlah, id, jumlah);
    if (!hasil.changes) throw new ApiError(400, `Saldo pembuat tugas kurang. Hadiah ini membutuhkan ${jumlah} bintang.`);
  }
  if (path.length === 1 && m === "GET") {
    const kids = db.prepare("SELECT id FROM children WHERE parent_id = ? ORDER BY id").all(ortuId);
    const sekarang = Date.now();
    return send(200, {
      anak: Object.fromEntries(kids.map((k) => [k.id, tugasAnak(k.id)])),
      kuotaBintang: Object.fromEntries(kids.map((k) => [k.id, kuotaBintang(k.id, sekarang)])),
    }), true;
  }
  if (path.length === 1 && m === "POST") {
    const c = ownChild(ortuId, body.childId);
    const n = db.prepare("SELECT COUNT(*) AS n FROM tugas WHERE child_id = ? AND aktif = 1").get(c.id).n;
    if (n >= MAKS_TUGAS_PER_ANAK) throw new ApiError(400, `Maksimal ${MAKS_TUGAS_PER_ANAK} tugas aktif per anak.`);
    const f = salah(() => validTugas(body));
    db.exec("BEGIN IMMEDIATE");
    try {
      potongSaldo(ortuSaya, f.bintang);
      const hasil = db.prepare(`INSERT INTO tugas (parent_id, child_id, judul, jenis, jadwal, hari, bintang, mulai, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(ortuId, c.id, f.judul, f.jenis, f.jadwal, f.hari, f.bintang, today(), Date.now());
      db.prepare("INSERT INTO tugas_dana VALUES (?, ?, ?)").run(hasil.lastInsertRowid, ortuSaya, f.bintang);
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    notify(`a${c.id}`, "info", `Tugas baru dari orang tua: ${f.judul}`);
    return send(200, tugasAnak(c.id)), true;
  }
  const t = db.prepare("SELECT * FROM tugas WHERE id = ? AND parent_id = ?").get(Number(path[1]), ortuId);
  if (!t) throw new ApiError(404, "Tugas tidak ditemukan.");
  if (path.length === 2 && m === "DELETE") {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM tugas_dana WHERE tugas_id = ?").run(t.id);
      db.prepare("UPDATE tugas SET aktif = 0 WHERE id = ?").run(t.id);
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    return send(200, tugasAnak(t.child_id)), true;
  }
  if ((path[2] === "setujui" || path[2] === "belum") && m === "POST") {
    const tgl = String(body.tanggal || "");
    if (!TGL.test(tgl)) throw new ApiError(400, "Tanggal tidak valid.");
    const setuju = path[2] === "setujui";
    if (!t.aktif) throw new ApiError(400, "Tugas sudah dihapus.");
    db.exec("BEGIN IMMEDIATE");
    try {
      const row = db.prepare("SELECT status FROM tugas_catatan WHERE tugas_id = ? AND tanggal = ?").get(t.id, tgl);
      if (row?.status !== "menunggu") throw new ApiError(400, "Tugas ini tidak sedang menunggu dicek.");
      const sekarang = Date.now();
      const { sisa, batas } = kuotaBintang(t.child_id, sekarang);
      if (setuju && t.bintang > sisa) {
        throw new ApiError(400, `Batas hadiah tugas ${batas} bintang per anak per hari. Sisa untuk anak ini ${sisa} bintang. Tugas ini masih bisa disetujui besok.`);
      }
      db.prepare("UPDATE tugas_catatan SET status = ?, diubah_at = ? WHERE tugas_id = ? AND tanggal = ?").run(setuju ? "disetujui" : "belum", sekarang, t.id, tgl);
      if (setuju && t.bintang) {
        const dana = db.prepare("SELECT * FROM tugas_dana WHERE tugas_id = ?").get(t.id);
        if (dana?.cadangan) db.prepare("UPDATE tugas_dana SET cadangan = 0 WHERE tugas_id = ?").run(t.id);
        else potongSaldo(dana?.pembuat_id ?? ortuSaya, t.bintang);
        db.prepare("UPDATE children SET bintang = bintang + ? WHERE id = ?").run(t.bintang, t.child_id);
      }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    notify(`a${t.child_id}`, "info", setuju
      ? `Tugas "${t.judul}" disetujui orang tua!${t.bintang ? ` +${t.bintang} bintang` : ""}`
      : `Tugas "${t.judul}" belum diterima orang tua. Coba lagi, ya.`);
    return send(200, { ...tugasAnak(t.child_id), kuotaBintang: kuotaBintang(t.child_id) }), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

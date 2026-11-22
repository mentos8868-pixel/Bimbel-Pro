import { db, today } from "./db.js";
import { tambahBintangOrtu } from "./toko-ortu.js";
import { avatarOr, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";
import { rapikanAksesori } from "../shared/aksesori.js";

const DURASI_MS = 3_600_000;
const HADIAH = 2;
const BATAS_HARIAN = 10;

db.exec(`CREATE TABLE IF NOT EXISTS kerja_ortu (
  parent_id INTEGER PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
  selesai_at INTEGER NOT NULL,
  durasi_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hadiah_kerja_ortu (
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  hari TEXT NOT NULL,
  bintang INTEGER NOT NULL,
  PRIMARY KEY (parent_id, hari)
)`);
if (!db.prepare("PRAGMA table_info(kerja_ortu)").all().some((c) => c.name === "durasi_ms")) {
  db.exec(`BEGIN IMMEDIATE;
    ALTER TABLE kerja_ortu ADD COLUMN durasi_ms INTEGER NOT NULL DEFAULT 30000;
    UPDATE kerja_ortu SET selesai_at = selesai_at + ${DURASI_MS} - durasi_ms, durasi_ms = ${DURASI_MS};
    COMMIT;`);
}
if (!db.prepare("PRAGMA table_info(kerja_ortu)").all().some((c) => c.name === "pekerjaan")) {
  db.exec("ALTER TABLE kerja_ortu ADD COLUMN pekerjaan TEXT NOT NULL DEFAULT 'kantor'");
}

const diterima = (id, hari) => db.prepare("SELECT bintang FROM hadiah_kerja_ortu WHERE parent_id = ? AND hari = ?").get(id, hari)?.bintang ?? 0;
const sesiKerja = db.prepare("SELECT selesai_at, pekerjaan FROM kerja_ortu WHERE parent_id = ?");

export function sedangBekerja(id, sekarang = Date.now()) {
  const sesi = sesiKerja.get(id);
  return sesi?.selesai_at > sekarang ? sesi.pekerjaan : "";
}

function status(id) {
  const kerja = sesiKerja.get(id);
  const { bintang } = db.prepare("SELECT bintang FROM parents WHERE id = ?").get(id);
  return {
    bintang, hadiah: HADIAH, durasi: DURASI_MS / 1000,
    batasHarian: BATAS_HARIAN, hariIni: diterima(id, today()),
    pekerjaan: kerja?.pekerjaan ?? null,
    sisaMs: kerja ? Math.max(0, kerja.selesai_at - Date.now()) : null,
  };
}

export function handleKantor({ m, path, body, ortuSaya, keluargaId, anak, url, send, ApiError }) {
  if (path[0] !== "kantor") return false;
  if (m === "GET" && path.length === 2 && path[1] === "keluarga") {
    const sebagaiAnak = url.searchParams.get("sebagai") === "anak";
    const keluarga = sebagaiAnak ? anak?.parent_id : keluargaId;
    if (!keluarga) throw new ApiError(401, "Silakan masuk untuk melihat Kantor keluarga.");
    const bekerja = db.prepare(`
      SELECT p.id, p.peran, p.avatar, p.aksesori_pakai, k.pekerjaan FROM kerja_ortu k
      JOIN parents p ON p.id = k.parent_id
      WHERE (p.id = ? OR p.kepala_id = ?) AND k.selesai_at > ? AND p.id != ?
    `).all(keluarga, keluarga, Date.now(), sebagaiAnak ? 0 : ortuSaya).map((p) => ({
      uid: `o${p.id}`, name: p.peran === "ibu" ? "Mama" : "Papa", peran: p.peran, pekerjaan: p.pekerjaan,
      avatar: avatarOr(p.avatar, DEFAULT_ORTU_AVATAR), aksesori: rapikanAksesori(p.aksesori_pakai).join(","),
    }));
    return send(200, { bekerja }), true;
  }
  if (!ortuSaya) throw new ApiError(403, "Masuk sebagai Ayah atau Ibu untuk bekerja.");

  if (m === "GET" && path.length === 1) {
    send(200, status(ortuSaya));
    return true;
  }
  if (m === "POST" && path.length === 2 && path[1] === "mulai") {
    const pekerjaan = body?.pekerjaan ?? "kantor";
    if (!["kantor", "sawah"].includes(pekerjaan)) throw new ApiError(400, "Pilih pekerjaan yang tersedia.");
    db.prepare(`INSERT OR IGNORE INTO kerja_ortu (parent_id, selesai_at, durasi_ms, pekerjaan)
      SELECT ?, ?, ?, ? WHERE COALESCE(
        (SELECT bintang FROM hadiah_kerja_ortu WHERE parent_id = ? AND hari = ?), 0) + ? <= ?`)
      .run(ortuSaya, Date.now() + DURASI_MS, DURASI_MS, pekerjaan, ortuSaya, today(), HADIAH, BATAS_HARIAN);
    send(200, status(ortuSaya));
    return true;
  }
  if (m === "POST" && path.length === 2 && path[1] === "ambil") {
    db.exec("BEGIN IMMEDIATE");
    try {
      const sekarang = Date.now();
      const hari = today(sekarang);
      if (diterima(ortuSaya, hari) + HADIAH > BATAS_HARIAN) {
        throw new ApiError(409, "Batas hadiah kerja hari ini sudah tercapai.");
      }
      const hasil = db.prepare("DELETE FROM kerja_ortu WHERE parent_id = ? AND selesai_at <= ?")
        .run(ortuSaya, sekarang);
      if (!hasil.changes) throw new ApiError(409, "Belum ada sesi kerja yang siap diambil.");
      tambahBintangOrtu(ortuSaya, HADIAH);
      db.prepare(`INSERT INTO hadiah_kerja_ortu (parent_id, hari, bintang) VALUES (?, ?, ?)
        ON CONFLICT(parent_id, hari) DO UPDATE SET bintang = bintang + excluded.bintang`).run(ortuSaya, hari, HADIAH);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    send(200, status(ortuSaya));
    return true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

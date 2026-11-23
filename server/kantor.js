import { db, today } from "./db.js";
import { tambahBintangOrtu } from "./toko-ortu.js";
import { avatarOr, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";
import { rapikanAksesori } from "../shared/aksesori.js";

const DURASI_MS = 3_600_000;
const HADIAH = 2;
const BATAS_HARIAN = 10;
const KAPASITAS = 20;

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
const sesiKerja = db.prepare("SELECT selesai_at - durasi_ms AS mulai_at, pekerjaan FROM kerja_ortu WHERE parent_id = ?");
const hitungAktif = db.prepare("SELECT COUNT(*) AS n FROM kerja_ortu WHERE pekerjaan = ?");

export function sedangBekerja(id) {
  const sesi = sesiKerja.get(id);
  return sesi?.pekerjaan ?? "";
}

function status(id) {
  const sekarang = Date.now();
  const kerja = sesiKerja.get(id);
  const { bintang } = db.prepare("SELECT bintang FROM parents WHERE id = ?").get(id);
  return {
    bintang, hadiah: HADIAH, durasi: DURASI_MS / 1000,
    batasHarian: BATAS_HARIAN, hariIni: diterima(id, today(sekarang)),
    slot: Object.fromEntries(["kantor", "sawah"].map((jenis) => [
      jenis, { kapasitas: KAPASITAS, tersedia: Math.max(0, KAPASITAS - hitungAktif.get(jenis).n) },
    ])),
    pekerjaan: kerja?.pekerjaan ?? null,
    mulaiAt: kerja?.mulai_at ?? null,
  };
}

export function handleKantor({ m, path, body, ortuSaya, keluargaId, anak, url, send, ApiError }) {
  if (path[0] !== "kantor") return false;
  if (m === "GET" && path.length === 2 && path[1] === "arena") {
    const sebagaiAnak = url.searchParams.get("sebagai") === "anak";
    if (sebagaiAnak ? !anak : !ortuSaya) throw new ApiError(401, "Masuk untuk melihat pekerja di arena.");
    const bekerja = db.prepare(`
      SELECT p.id, p.peran, p.negara, p.avatar, p.aksesori_pakai, k.pekerjaan FROM kerja_ortu k
      JOIN parents p ON p.id = k.parent_id
      ORDER BY k.pekerjaan, k.selesai_at - k.durasi_ms, p.id
    `).all().map((p) => ({
      uid: `o${p.id}`, name: p.peran === "ibu" ? "Mama" : "Papa", peran: p.peran, negara: p.negara || "", pekerjaan: p.pekerjaan,
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
    db.exec("BEGIN IMMEDIATE");
    try {
      const sekarang = Date.now();
      if (!sesiKerja.get(ortuSaya)) {
        if (hitungAktif.get(pekerjaan).n >= KAPASITAS) {
          throw new ApiError(409, `Slot ${pekerjaan === "kantor" ? "Kantor" : "Sawah"} penuh. Coba lagi saat ada sesi yang selesai.`);
        }
        db.prepare("INSERT INTO kerja_ortu (parent_id, selesai_at, durasi_ms, pekerjaan) VALUES (?, ?, ?, ?)")
          .run(ortuSaya, sekarang + DURASI_MS, DURASI_MS, pekerjaan);
      }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    send(200, status(ortuSaya));
    return true;
  }
  if (m === "POST" && path.length === 2 && path[1] === "stop") {
    let diperoleh = 0;
    db.exec("BEGIN IMMEDIATE");
    try {
      const sesi = sesiKerja.get(ortuSaya);
      if (sesi) {
        const sekarang = Date.now();
        let jam = sesi.mulai_at + DURASI_MS;
        // Setiap jam penuh masuk kuota hari WIB saat jam tersebut selesai.
        while (jam <= sekarang) {
          const hari = today(jam);
          const besok = Date.parse(hari + "T00:00:00+07:00") + 24 * DURASI_MS;
          const jumlahJam = 1 + Math.floor((Math.min(sekarang, besok - 1) - jam) / DURASI_MS);
          const bintang = Math.min(jumlahJam * HADIAH, Math.max(0, BATAS_HARIAN - diterima(ortuSaya, hari)));
          if (bintang) {
            db.prepare(`INSERT INTO hadiah_kerja_ortu (parent_id, hari, bintang) VALUES (?, ?, ?)
              ON CONFLICT(parent_id, hari) DO UPDATE SET bintang = bintang + excluded.bintang`).run(ortuSaya, hari, bintang);
            diperoleh += bintang;
          }
          jam += jumlahJam * DURASI_MS;
        }
        if (diperoleh) tambahBintangOrtu(ortuSaya, diperoleh);
        db.prepare("DELETE FROM kerja_ortu WHERE parent_id = ?").run(ortuSaya);
      }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    return send(200, { ...status(ortuSaya), diperoleh }), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

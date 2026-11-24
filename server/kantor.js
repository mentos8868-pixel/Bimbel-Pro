import { db, today } from "./db.js";
import { tambahBintangOrtu } from "./toko-ortu.js";
import { avatarOr, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";
import { rapikanAksesori } from "../shared/aksesori.js";
import { TEMPAT_KERJA } from "../shared/tempat-kerja.js";

const DURASI_MS = 3_600_000;
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
if (!db.prepare("PRAGMA table_info(kerja_ortu)").all().some((c) => c.name === "upah")) {
  db.exec("ALTER TABLE kerja_ortu ADD COLUMN upah INTEGER NOT NULL DEFAULT 2");
}
if (!db.prepare("PRAGMA table_info(kerja_ortu)").all().some((c) => c.name === "jam_dibayar")) {
  db.exec("ALTER TABLE kerja_ortu ADD COLUMN jam_dibayar INTEGER NOT NULL DEFAULT 0");
}

const diterima = (id, hari) => db.prepare("SELECT bintang FROM hadiah_kerja_ortu WHERE parent_id = ? AND hari = ?").get(id, hari)?.bintang ?? 0;
const sesiKerja = db.prepare(`SELECT *, selesai_at - durasi_ms AS mulai_at FROM kerja_ortu WHERE parent_id = ?`);
const hitungAktif = db.prepare("SELECT COUNT(*) AS n FROM kerja_ortu WHERE pekerjaan = ?");
const jatuhTempo = "selesai_at + jam_dibayar * durasi_ms <= ?";
const sesiJatuhTempo = db.prepare(`SELECT * FROM kerja_ortu WHERE ${jatuhTempo}`);

function hitungUpah(sesi, sekarang) {
  const perHari = new Map();
  let hari, sisa;
  let berikutAt = sesi.selesai_at + sesi.jam_dibayar * sesi.durasi_ms;
  for (; berikutAt <= sekarang; berikutAt += sesi.durasi_ms) {
    const tanggal = today(berikutAt);
    if (tanggal !== hari) {
      hari = tanggal;
      sisa = Math.max(0, BATAS_HARIAN - diterima(sesi.parent_id, hari));
    }
    const bintang = Math.min(sesi.upah, sisa);
    if (bintang) perHari.set(hari, (perHari.get(hari) || 0) + bintang);
    sisa -= bintang;
    if (sisa === 0) return { perHari, selesai: true, berikutAt: null };
  }
  return { perHari, selesai: false, berikutAt };
}

function cairkanUpah(sesi, perHari) {
  for (const [hari, bintang] of perHari) {
    db.prepare(`INSERT INTO hadiah_kerja_ortu (parent_id, hari, bintang) VALUES (?, ?, ?)
      ON CONFLICT(parent_id, hari) DO UPDATE SET bintang = bintang + excluded.bintang`).run(sesi.parent_id, hari, bintang);
    tambahBintangOrtu(sesi.parent_id, bintang);
  }
  db.prepare("DELETE FROM kerja_ortu WHERE parent_id = ?").run(sesi.parent_id);
}

export function selesaikanKerjaJatuhTempo(sekarang = Date.now()) {
  const selesai = sesiJatuhTempo.all(sekarang).filter((sesi) => hitungUpah(sesi, sekarang).selesai);
  if (!selesai.length) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const kandidat of selesai) {
      const sesi = sesiKerja.get(kandidat.parent_id);
      if (!sesi) continue;
      const upah = hitungUpah(sesi, sekarang);
      if (upah.selesai) cairkanUpah(sesi, upah.perHari);
    }
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

setInterval(() => {
  try { selesaikanKerjaJatuhTempo(); }
  catch (e) { console.error("Gagal memperbarui sesi kerja:", e.message); }
}, 1000).unref();

export function sedangBekerja(id, sekarang = Date.now()) {
  let sesi = sesiKerja.get(id);
  if (sesi && hitungUpah(sesi, sekarang).selesai) {
    selesaikanKerjaJatuhTempo(sekarang);
    sesi = sesiKerja.get(id);
  }
  return sesi?.pekerjaan ?? "";
}

function status(id) {
  const sekarang = Date.now();
  const kerja = sesiKerja.get(id);
  const upah = kerja && hitungUpah(kerja, sekarang);
  const hari = today(sekarang);
  const { bintang } = db.prepare("SELECT bintang FROM parents WHERE id = ?").get(id);
  return {
    bintang, hadiah: kerja?.upah ?? TEMPAT_KERJA.kantor.upah, durasi: DURASI_MS / 1000,
    batasHarian: BATAS_HARIAN, hariIni: diterima(id, hari),
    tertundaHariIni: upah?.perHari.get(hari) ?? 0,
    slot: Object.fromEntries(Object.entries(TEMPAT_KERJA).map(([jenis, { kapasitas, upah }]) => [
      jenis, { kapasitas, upah, tersedia: Math.max(0, kapasitas - hitungAktif.get(jenis).n) },
    ])),
    pekerjaan: kerja?.pekerjaan ?? null,
    mulaiAt: kerja?.mulai_at ?? null,
    berikutAt: upah?.berikutAt ?? null,
  };
}

export function handleKantor({ m, path, body, ortuSaya, keluargaId, anak, url, send, ApiError }) {
  if (path[0] !== "kantor") return false;
  if (m === "GET" && path.length === 2 && path[1] === "arena") {
    const sebagaiAnak = url.searchParams.get("sebagai") === "anak";
    if (sebagaiAnak ? !anak : !ortuSaya) throw new ApiError(401, "Masuk untuk melihat pekerja di arena.");
    selesaikanKerjaJatuhTempo();
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
  selesaikanKerjaJatuhTempo();

  if (m === "GET" && path.length === 1) {
    send(200, status(ortuSaya));
    return true;
  }
  if (m === "POST" && path.length === 2 && path[1] === "mulai") {
    const pekerjaan = body?.pekerjaan ?? "kantor";
    if (typeof pekerjaan !== "string" || !Object.hasOwn(TEMPAT_KERJA, pekerjaan)) throw new ApiError(400, "Pilih pekerjaan yang tersedia.");
    const tempat = TEMPAT_KERJA[pekerjaan];
    db.exec("BEGIN IMMEDIATE");
    try {
      const sekarang = Date.now();
      if (!sesiKerja.get(ortuSaya)) {
        if (diterima(ortuSaya, today(sekarang)) >= BATAS_HARIAN) {
          throw new ApiError(409, "Batas bintang kerja hari ini sudah tercapai. Kamu bisa bekerja lagi besok (WIB).");
        }
        if (hitungAktif.get(pekerjaan).n >= tempat.kapasitas) {
          throw new ApiError(409, `Slot ${tempat.nama} penuh. Coba lagi saat ada sesi yang selesai.`);
        }
        db.prepare("INSERT INTO kerja_ortu (parent_id, selesai_at, durasi_ms, pekerjaan, upah) VALUES (?, ?, ?, ?, ?)")
          .run(ortuSaya, sekarang + DURASI_MS, DURASI_MS, pekerjaan, tempat.upah);
      }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    send(200, status(ortuSaya));
    return true;
  }
  if (m === "POST" && path.length === 2 && path[1] === "stop") {
    let dihentikan = false;
    db.exec("BEGIN IMMEDIATE");
    try {
      const sesi = sesiKerja.get(ortuSaya);
      if (sesi) {
        const upah = hitungUpah(sesi, Date.now());
        if (upah.selesai) cairkanUpah(sesi, upah.perHari);
        else dihentikan = db.prepare("DELETE FROM kerja_ortu WHERE parent_id = ?").run(ortuSaya).changes > 0;
      }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    return send(200, { ...status(ortuSaya), dihentikan, diperoleh: 0 }), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

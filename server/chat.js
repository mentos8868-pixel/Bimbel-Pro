// Chat untuk dashboard:
// 1) Chat keluarga: pesan antara orang tua dan anaknya sendiri (satu percakapan per anak).
//    Tidak bisa dipakai untuk menghubungi keluarga lain. Teks melewati saringan kata kasar.
//    Disimpan paling banyak 500 pesan terakhir per anak.
// 2) Riwayat chat arena: pesan yang DIKIRIM anak di arena, disimpan 7 hari lalu dihapus otomatis,
//    hanya bisa dibaca orang tua anak itu. Pesan dari pemain lain tidak disimpan.
import { db } from "./db.js";
import { notify } from "./social.js";
import { cekPesanKeluarga } from "../shared/chat.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS pesan_keluarga (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    dari TEXT NOT NULL,               -- ortu | anak
    isi TEXT NOT NULL,
    dibaca INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pesan_keluarga_anak ON pesan_keluarga(child_id, id);
  CREATE TABLE IF NOT EXISTS pesan_family (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keluarga_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    ortu_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    isi TEXT NOT NULL,
    suara BLOB,
    tipe_suara TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pesan_family_keluarga ON pesan_family(keluarga_id, id);
  CREATE TABLE IF NOT EXISTS family_dibaca (
    keluarga_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    penerima TEXT NOT NULL,
    ortu_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    terakhir INTEGER NOT NULL,
    PRIMARY KEY (keluarga_id, penerima)
  );
  CREATE TABLE IF NOT EXISTS chat_arena_log (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    isi TEXT NOT NULL,
    preset INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS chat_arena_anak ON chat_arena_log(child_id, created_at);
  CREATE TABLE IF NOT EXISTS lokasi_chat_anak (
    child_id INTEGER PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    lat REAL NOT NULL, lng REAL NOT NULL, dibagikan_at INTEGER NOT NULL
  );
`);

const SIMPAN_ARENA_MS = 7 * 86400000;
const SIMPAN_LOKASI_MS = 3600000;
const MAKS_PESAN = 500;
const MAKS_AUDIO = 512 * 1024;
export const MAKS_BODY_SUARA = Math.ceil(MAKS_AUDIO / 3) * 4 + 1024;
const audioTypes = {
  "audio/webm": (data) => data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  "audio/ogg": (data) => data.toString("ascii", 0, 4) === "OggS",
  "audio/mp4": (data) => data.toString("ascii", 4, 8) === "ftyp",
};
const kolomPesan = db.prepare("PRAGMA table_info(pesan_keluarga)").all().map((c) => c.name);
if (!kolomPesan.includes("suara")) db.exec("ALTER TABLE pesan_keluarga ADD COLUMN suara BLOB");
if (!kolomPesan.includes("tipe_suara")) db.exec("ALTER TABLE pesan_keluarga ADD COLUMN tipe_suara TEXT");
// Orang tua mana yang mengirim (keluarga bisa punya Ayah dan Ibu). NULL untuk pesan anak dan pesan lama.
if (!kolomPesan.includes("ortu_id")) db.exec("ALTER TABLE pesan_keluarga ADD COLUMN ortu_id INTEGER");

// Dipanggil ruang arena setiap kali anak berhasil mengirim chat.
// Pesan dari orang tua ke anaknya (dipakai juga oleh fitur lain, mis. tanggapan kegiatan belajar).
// Sama dengan mengirim lewat menu Chat: tersimpan di chat pribadi, dan anak di arena diberi tahu.
export function pesanOrtuKeAnak(childId, ortuId, isi) {
  db.prepare("INSERT INTO pesan_keluarga (child_id, dari, isi, created_at, suara, tipe_suara, ortu_id) VALUES (?, 'ortu', ?, ?, NULL, NULL, ?)")
    .run(childId, isi, Date.now(), ortuId);
  db.prepare(`DELETE FROM pesan_keluarga WHERE child_id = ? AND id NOT IN
              (SELECT id FROM pesan_keluarga WHERE child_id = ? ORDER BY id DESC LIMIT ${MAKS_PESAN})`).run(childId, childId);
  const p = db.prepare("SELECT name, peran FROM parents WHERE id = ?").get(ortuId);
  notify(`a${childId}`, "info", `💬 Pesan dari ${p ? sapaanOrtu(p) : "orang tua"}: ${isi.length > 60 ? isi.slice(0, 60) + "…" : isi}`);
}

export function catatChatArena(childId, isi, preset) {
  db.prepare("INSERT INTO chat_arena_log (child_id, isi, preset, created_at) VALUES (?, ?, ?, ?)").run(childId, isi, preset ? 1 : 0, Date.now());
}
setInterval(() => {
  db.prepare("DELETE FROM chat_arena_log WHERE created_at < ?").run(Date.now() - SIMPAN_ARENA_MS);
  db.prepare("DELETE FROM lokasi_chat_anak WHERE dibagikan_at <= ?").run(Date.now() - SIMPAN_LOKASI_MS);
}, 3600000).unref();

// Pembatas: paling banyak 10 pesan per 30 detik per pengirim.
const kirimTerakhir = new Map();
function batas(kunci) {
  const now = Date.now();
  const t = (kirimTerakhir.get(kunci) || []).filter((x) => now - x < 30000);
  if (t.length >= 10) return false;
  t.push(now);
  kirimTerakhir.set(kunci, t);
  return true;
}

const sapaanOrtu = ({ peran, name }) => peran === "ayah" ? "Papa" : peran === "ibu" ? "Mama" : name;

function daftarFamily(keluargaId, pengirim) {
  return db.prepare(`
    SELECT p.id, p.isi, p.created_at AS at, p.tipe_suara IS NOT NULL AS suara,
      p.ortu_id AS ortuId, p.child_id AS childId, o.peran, COALESCE(o.name, a.name) AS nama
    FROM pesan_family p LEFT JOIN parents o ON o.id = p.ortu_id LEFT JOIN children a ON a.id = p.child_id
    WHERE p.keluarga_id = ? ORDER BY p.id DESC LIMIT 100
  `).all(keluargaId).reverse().map(({ peran, ...p }) => ({
    ...p, dari: p.ortuId ? "ortu" : "anak", suara: !!p.suara,
    saya: p.ortuId !== null ? p.ortuId === pengirim.ortu : p.childId === pengirim.anak,
    nama: sapaanOrtu({ peran, name: p.nama }),
  }));
}

const cakupanOrtu = "(? IS NULL OR ortu_id = ? OR (? = 1 AND ortu_id IS NULL))";
const daftarPesan = (childId, sebagai, kontak) => db.prepare(
  `SELECT id, dari, isi, dibaca, created_at AS at, tipe_suara IS NOT NULL AS suara, ortu_id AS ortuId,
          (SELECT name FROM parents WHERE id = ortu_id) AS nama,
          (SELECT peran FROM parents WHERE id = ortu_id) AS peran
   FROM pesan_keluarga WHERE child_id = ? AND ${cakupanOrtu} ORDER BY id DESC LIMIT 100`,
).all(childId, kontak, kontak, Number(sebagai === "ortu")).reverse().map(({ peran, ...p }) => ({
  ...p, nama: sebagai === "anak" ? sapaanOrtu({ peran, name: p.nama }) : p.nama, dibaca: !!p.dibaca, suara: !!p.suara,
}));

// Nama orang tua dalam satu keluarga (kepala keluarga dan pasangannya), mis. "Bunda & Ayah".
const orangTuaKeluarga = (kepalaId) => db.prepare("SELECT id, name, peran FROM parents WHERE id = ? OR kepala_id = ? ORDER BY kepala_id IS NOT NULL, id")
  .all(kepalaId, kepalaId);

// Jumlah pesan yang belum dibaca oleh "untuk" (ortu: pesan dari anak; anak: pesan dari orang tua).
const belumDibaca = (childId, untuk, kontak = null) => db.prepare(
  `SELECT COUNT(*) AS n FROM pesan_keluarga WHERE child_id = ? AND dari = ? AND dibaca = 0 AND ${cakupanOrtu}`,
).get(childId, untuk === "ortu" ? "anak" : "ortu", kontak, kontak, Number(untuk === "ortu")).n;

// Mengembalikan true bila permintaan ditangani.
// sebagai=ortu|anak menentukan peran (di perangkat keluarga, orang tua dan anak bisa sama-sama masuk).
export function handleChat({ m, path, body, url, ortuId, ortuSaya, anak, ownChild, send, sendAudio, ApiError }) {
  if (path[0] !== "chat") return false;
  const sebagai = (m === "GET" ? url.searchParams.get("sebagai") : body.sebagai) === "anak" ? "anak" : "ortu";
  let childId, parentId;
  if (sebagai === "anak") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    childId = anak.child_id;
    parentId = anak.parent_id;
  } else {
    if (!ortuId) throw new ApiError(401, "Silakan masuk sebagai orang tua.");
    parentId = ortuId;
  }
  const pengirim = { ortu: sebagai === "ortu" ? (ortuSaya ?? parentId) : null, anak: sebagai === "anak" ? childId : null };
  const penerima = pengirim.ortu ? `o${pengirim.ortu}` : `a${pengirim.anak}`;

  if (path[1] === "lokasi" && path.length === 2) {
    if (m === "POST" && sebagai === "anak") {
      if (body.hapus === true) {
        db.prepare("DELETE FROM lokasi_chat_anak WHERE child_id = ?").run(childId);
        return send(200, { aktif: false }), true;
      }
      const { lat, lng } = body;
      if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
        throw new ApiError(400, "Koordinat lokasi tidak valid.");
      }
      db.prepare(`INSERT INTO lokasi_chat_anak (child_id, lat, lng, dibagikan_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(child_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, dibagikan_at = excluded.dibagikan_at`)
        .run(childId, lat, lng, Date.now());
      return send(200, { aktif: true }), true;
    }
    if (m === "GET" && sebagai === "anak") {
      const aktif = !!db.prepare("SELECT 1 FROM lokasi_chat_anak WHERE child_id = ? AND dibagikan_at > ?")
        .get(childId, Date.now() - SIMPAN_LOKASI_MS);
      return send(200, { aktif }), true;
    }
    throw new ApiError(403, "Lokasi hanya bisa dibagikan dari akun anak.");
  }

  // Jumlah pesan belum dibaca (untuk tanda di menu).
  if (path[1] === "belum" && m === "GET") {
    const family = db.prepare(`
      SELECT COUNT(*) AS n FROM pesan_family
      WHERE keluarga_id = ? AND id > COALESCE(
        (SELECT terakhir FROM family_dibaca WHERE keluarga_id = ? AND penerima = ?), 0)
      AND NOT (ortu_id IS ? AND child_id IS ?)
    `).get(parentId, parentId, penerima, pengirim.ortu, pengirim.anak).n;
    if (sebagai === "anak") {
      // Untuk Home anak: pesan terakhir dari orang tua (tanpa menandainya sudah dibaca).
      const t = db.prepare(`SELECT p.isi, p.created_at AS at, o.peran FROM pesan_keluarga p
        LEFT JOIN parents o ON o.id = p.ortu_id WHERE p.child_id = ? AND p.dari = 'ortu' ORDER BY p.id DESC LIMIT 1`).get(childId);
      const keluarga = orangTuaKeluarga(parentId);
      const namaOrtu = keluarga.map((p) => p.name).join(" & ") || "Orang tua";
      const namaChat = keluarga.map(sapaanOrtu).join(" & ") || namaOrtu;
      const belumOrtu = Object.fromEntries(keluarga.map((p) => [p.peran, belumDibaca(childId, "anak", p.id)]));
      return send(200, { n: belumDibaca(childId, "anak"), family, terakhir: t || null, namaOrtu, namaChat, peranOrtu: keluarga.map((p) => p.peran), belumOrtu }), true;
    }
    const kids = db.prepare("SELECT id FROM children WHERE parent_id = ?").all(parentId);
    return send(200, { family, anak: Object.fromEntries(kids.map((k) => [k.id, belumDibaca(k.id, "ortu", pengirim.ortu)])) }), true;
  }

  // Riwayat chat arena anak (hanya orang tua).
  if (path[1] === "arena" && m === "GET") {
    if (sebagai !== "ortu") throw new ApiError(403, "Hanya untuk orang tua.");
    const c = ownChild(parentId, url.searchParams.get("anak"));
    const rows = db.prepare("SELECT isi, preset, created_at AS at FROM chat_arena_log WHERE child_id = ? AND created_at >= ? ORDER BY id DESC LIMIT 300")
      .all(c.id, Date.now() - SIMPAN_ARENA_MS);
    return send(200, { pesan: rows.map((r) => ({ ...r, preset: !!r.preset })), simpanHari: 7, chat: c.chat }), true;
  }

  if (path[1] === "keluarga") {
    const grup = m === "GET" ? url.searchParams.get("grup") === "1" : body.grup === true;
    let kontak = null;
    if (!grup && sebagai === "ortu") childId = ownChild(parentId, m === "GET" ? url.searchParams.get("anak") : body.anak).id;
    if (!grup) {
      if (sebagai === "ortu") kontak = pengirim.ortu;
      else {
        const peran = m === "GET" ? url.searchParams.get("ortu") ?? undefined : body.ortu;
        if (peran !== undefined) {
          kontak = orangTuaKeluarga(parentId).find((p) => p.peran === peran)?.id;
          if (!kontak) throw new ApiError(404, "Orang tua belum terhubung.");
        }
      }
    }
    if (path[2] === "suara" && path.length === 4 && m === "GET") {
      const p = grup
        ? db.prepare("SELECT suara, tipe_suara FROM pesan_family WHERE id = ? AND keluarga_id = ?").get(Number(path[3]), parentId)
        : db.prepare(`SELECT suara, tipe_suara FROM pesan_keluarga WHERE id = ? AND child_id = ? AND ${cakupanOrtu}`)
          .get(Number(path[3]), childId, kontak, kontak, Number(sebagai === "ortu"));
      if (!p?.suara) throw new ApiError(404, "Pesan suara tidak ditemukan.");
      return sendAudio(p.tipe_suara, Buffer.from(p.suara)), true;
    }
    if (path.length !== 2) throw new ApiError(404, "Alamat tidak ditemukan.");
    if (m === "GET") {
      const lokasi = sebagai === "ortu" ? db.prepare(`
        SELECT c.name AS nama, l.lat, l.lng, l.dibagikan_at AS at
        FROM lokasi_chat_anak l JOIN children c ON c.id = l.child_id
        WHERE c.parent_id = ? AND l.dibagikan_at > ? AND (? IS NULL OR c.id = ?)
        ORDER BY c.id
      `).all(parentId, Date.now() - SIMPAN_LOKASI_MS, childId ?? null, childId ?? null) : undefined;
      if (grup) {
        const pesan = daftarFamily(parentId, pengirim);
        if (pesan.length) {
          db.prepare(`INSERT INTO family_dibaca (keluarga_id, penerima, ortu_id, child_id, terakhir) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(keluarga_id, penerima) DO UPDATE SET terakhir = MAX(terakhir, excluded.terakhir)`)
            .run(parentId, penerima, pengirim.ortu, pengirim.anak, pesan.at(-1).id);
        }
        return send(200, { pesan, lokasi }), true;
      }
      // Membuka percakapan berarti pesan dari pihak lain sudah dibaca.
      db.prepare(`UPDATE pesan_keluarga SET dibaca = 1 WHERE child_id = ? AND dari = ? AND dibaca = 0 AND ${cakupanOrtu}`)
        .run(childId, sebagai === "ortu" ? "anak" : "ortu", kontak, kontak, Number(sebagai === "ortu"));
      return send(200, { pesan: daftarPesan(childId, sebagai, kontak), lokasi }), true;
    }
    if (m === "POST") {
      const kunci = grup ? `family:${sebagai}:${pengirim.ortu ?? pengirim.anak}` : `${sebagai}:${childId}`;
      if (!batas(kunci)) throw new ApiError(429, "Pelan-pelan ya, tunggu sebentar sebelum mengirim lagi.");
      let isi, suara = null, tipe = null;
      if (body.suara !== undefined) {
        tipe = body.tipe;
        if (typeof tipe !== "string" || !Object.hasOwn(audioTypes, tipe) || typeof body.suara !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.suara)) {
          throw new ApiError(400, "Format pesan suara tidak didukung.");
        }
        suara = Buffer.from(body.suara, "base64");
        if (suara.length > MAKS_AUDIO) throw new ApiError(413, "Rekaman terlalu besar.");
        if (!audioTypes[tipe](suara)) throw new ApiError(400, "Rekaman tidak valid.");
        isi = "🎙 Pesan suara";
      } else {
        const r = cekPesanKeluarga(body.isi);
        if (!r.ok) throw new ApiError(400, r.reason);
        isi = r.text;
      }
      if (grup) {
        db.prepare("INSERT INTO pesan_family (keluarga_id, ortu_id, child_id, isi, suara, tipe_suara, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(parentId, pengirim.ortu, pengirim.anak, isi, suara, tipe, Date.now());
        db.prepare(`DELETE FROM pesan_family WHERE keluarga_id = ? AND id NOT IN
          (SELECT id FROM pesan_family WHERE keluarga_id = ? ORDER BY id DESC LIMIT ${MAKS_PESAN})`).run(parentId, parentId);
        return send(200, { pesan: daftarFamily(parentId, pengirim) }), true;
      }
      db.prepare("INSERT INTO pesan_keluarga (child_id, dari, isi, created_at, suara, tipe_suara, ortu_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(childId, sebagai, isi, Date.now(), suara, tipe, kontak);
      db.prepare(`DELETE FROM pesan_keluarga WHERE child_id = ? AND id NOT IN
                  (SELECT id FROM pesan_keluarga WHERE child_id = ? ORDER BY id DESC LIMIT ${MAKS_PESAN})`).run(childId, childId);
      if (sebagai === "ortu") {
        const pengirim = db.prepare("SELECT name, peran FROM parents WHERE id = ?").get(ortuSaya ?? parentId);
        const nama = pengirim ? sapaanOrtu(pengirim) : "orang tua";
        notify(`a${childId}`, "info", `💬 Pesan dari ${nama}: ${isi.length > 60 ? isi.slice(0, 60) + "…" : isi}`);
      }
      return send(200, { pesan: daftarPesan(childId, sebagai, kontak) }), true;
    }
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

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
  CREATE TABLE IF NOT EXISTS chat_arena_log (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    isi TEXT NOT NULL,
    preset INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS chat_arena_anak ON chat_arena_log(child_id, created_at);
`);

const SIMPAN_ARENA_MS = 7 * 86400000;
const MAKS_PESAN = 500;

// Dipanggil ruang arena setiap kali anak berhasil mengirim chat.
export function catatChatArena(childId, isi, preset) {
  db.prepare("INSERT INTO chat_arena_log (child_id, isi, preset, created_at) VALUES (?, ?, ?, ?)").run(childId, isi, preset ? 1 : 0, Date.now());
}
setInterval(() => {
  db.prepare("DELETE FROM chat_arena_log WHERE created_at < ?").run(Date.now() - SIMPAN_ARENA_MS);
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

const daftarPesan = (childId) => db.prepare(
  "SELECT id, dari, isi, dibaca, created_at AS at FROM (SELECT * FROM pesan_keluarga WHERE child_id = ? ORDER BY id DESC LIMIT 100) ORDER BY id",
).all(childId).map((p) => ({ ...p, dibaca: !!p.dibaca }));

// Jumlah pesan yang belum dibaca oleh "untuk" (ortu: pesan dari anak; anak: pesan dari orang tua).
const belumDibaca = (childId, untuk) => db.prepare(
  "SELECT COUNT(*) AS n FROM pesan_keluarga WHERE child_id = ? AND dari = ? AND dibaca = 0",
).get(childId, untuk === "ortu" ? "anak" : "ortu").n;

// Mengembalikan true bila permintaan ditangani.
// sebagai=ortu|anak menentukan peran (di perangkat keluarga, orang tua dan anak bisa sama-sama masuk).
export function handleChat({ m, path, body, url, ortuId, anak, ownChild, send, ApiError }) {
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

  // Jumlah pesan belum dibaca (untuk tanda di menu).
  if (path[1] === "belum" && m === "GET") {
    if (sebagai === "anak") {
      // Untuk Home anak: pesan terakhir dari orang tua (tanpa menandainya sudah dibaca).
      const t = db.prepare("SELECT isi, created_at AS at FROM pesan_keluarga WHERE child_id = ? AND dari = 'ortu' ORDER BY id DESC LIMIT 1").get(childId);
      const namaOrtu = db.prepare("SELECT name FROM parents WHERE id = ?").get(parentId)?.name || "Orang tua";
      return send(200, { n: belumDibaca(childId, "anak"), terakhir: t || null, namaOrtu }), true;
    }
    const kids = db.prepare("SELECT id FROM children WHERE parent_id = ?").all(parentId);
    return send(200, { anak: Object.fromEntries(kids.map((k) => [k.id, belumDibaca(k.id, "ortu")])) }), true;
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
    if (sebagai === "ortu") childId = ownChild(parentId, m === "GET" ? url.searchParams.get("anak") : body.anak).id;
    if (m === "GET") {
      // Membuka percakapan berarti pesan dari pihak lain sudah dibaca.
      db.prepare("UPDATE pesan_keluarga SET dibaca = 1 WHERE child_id = ? AND dari = ? AND dibaca = 0").run(childId, sebagai === "ortu" ? "anak" : "ortu");
      return send(200, { pesan: daftarPesan(childId) }), true;
    }
    if (m === "POST") {
      if (!batas(`${sebagai}:${childId}`)) throw new ApiError(429, "Pelan-pelan ya, tunggu sebentar sebelum mengirim lagi.");
      const r = cekPesanKeluarga(body.isi);
      if (!r.ok) throw new ApiError(400, r.reason);
      db.prepare("INSERT INTO pesan_keluarga (child_id, dari, isi, created_at) VALUES (?, ?, ?, ?)").run(childId, sebagai, r.text, Date.now());
      db.prepare(`DELETE FROM pesan_keluarga WHERE child_id = ? AND id NOT IN
                  (SELECT id FROM pesan_keluarga WHERE child_id = ? ORDER BY id DESC LIMIT ${MAKS_PESAN})`).run(childId, childId);
      if (sebagai === "ortu") {
        const nama = db.prepare("SELECT name FROM parents WHERE id = ?").get(parentId)?.name || "orang tua";
        notify(`a${childId}`, "info", `💬 Pesan dari ${nama}: ${r.text.length > 60 ? r.text.slice(0, 60) + "…" : r.text}`);
      }
      return send(200, { pesan: daftarPesan(childId) }), true;
    }
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

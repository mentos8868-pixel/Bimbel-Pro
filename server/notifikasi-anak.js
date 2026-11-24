import { db } from "./db.js";

db.exec(`CREATE TABLE IF NOT EXISTS notifikasi_anak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  pesan TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifikasi_anak_penerima ON notifikasi_anak(child_id, id)`);

export function catatNotifikasiAnak(childId, pesan) {
  db.prepare("INSERT INTO notifikasi_anak (child_id, pesan) VALUES (?, ?)").run(childId, pesan);
}

export function handleNotifikasiAnak({ path, m, body, anak, send, ApiError }) {
  if (path.length !== 1 || path[0] !== "notifikasi-anak") return false;
  if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
  if (m === "POST") {
    if (!Number.isSafeInteger(body.sampai) || body.sampai < 1) throw new ApiError(400, "Notifikasi tidak valid.");
    db.prepare("DELETE FROM notifikasi_anak WHERE child_id = ? AND id <= ?").run(anak.child_id, body.sampai);
  } else if (m !== "GET") throw new ApiError(405, "Metode tidak didukung.");
  return send(200, { notifikasi: db.prepare("SELECT id, pesan FROM notifikasi_anak WHERE child_id = ? ORDER BY id LIMIT 20").all(anak.child_id) }), true;
}

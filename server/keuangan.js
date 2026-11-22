// Keuangan anak: catatan uang saku dan tabungan. Hanya catatan, tidak ada uang sungguhan yang berpindah,
// dan terpisah dari bintang (bintang tetap untuk Toko Avatar).
// Pembagian peran: orang tua HANYA memberi uang saku (jenis "masuk"). Anak sendiri yang mencatat belanja,
// menabung, mengambil tabungan, uang yang didapat dari luar (mis. hadiah dari nenek), dan target tabungannya. Orang tua tetap bisa melihat semuanya.
// Dua kantong:
//   dompet   = masuk + luar - keluar - tabung + ambil   (uang saku yang dipegang anak)
//   tabungan = tabung - ambil
// Jenis catatan: masuk (uang saku diberikan), luar (pemasukan dari luar, dicatat anak), keluar (dibelanjakan), tabung (dompet -> tabungan),
// ambil (tabungan -> dompet). Saldo tidak boleh menjadi minus. Satu target tabungan per anak.
import { db, today } from "./db.js";
import { notify } from "./social.js";
import { cekPesanKeluarga } from "../shared/chat.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS keuangan_catatan (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL,              -- masuk | luar | keluar | tabung | ambil
    jumlah INTEGER NOT NULL,          -- rupiah, selalu positif
    catatan TEXT NOT NULL DEFAULT '',
    tanggal TEXT NOT NULL,            -- YYYY-MM-DD (WIB)
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS keuangan_anak ON keuangan_catatan(child_id, tanggal);
  CREATE TABLE IF NOT EXISTS keuangan_target (
    child_id INTEGER PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    jumlah INTEGER NOT NULL
  );
`);
// Siapa yang mencatat: ortu | anak (database lama ditingkatkan otomatis).
if (!db.prepare("PRAGMA table_info(keuangan_catatan)").all().some((c) => c.name === "oleh")) {
  db.exec("ALTER TABLE keuangan_catatan ADD COLUMN oleh TEXT NOT NULL DEFAULT 'ortu'");
}

export const JENIS_UANG = { masuk: "Uang saku masuk", luar: "Pemasukan dari luar", keluar: "Dibelanjakan", tabung: "Ditabung", ambil: "Diambil dari tabungan" };
const MAKS_JUMLAH = 100_000_000;
const JENIS_ANAK = ["luar", "keluar", "tabung", "ambil"];   // yang boleh dicatat anak
const MAKS_CATAT_ANAK_PER_HARI = 30;
const TGL = /^\d{4}-\d{2}-\d{2}$/;

function saldo(rows) {
  let dompet = 0, tabungan = 0;
  for (const r of rows) {
    if (r.jenis === "masuk" || r.jenis === "luar") dompet += r.jumlah;
    else if (r.jenis === "keluar") dompet -= r.jumlah;
    else if (r.jenis === "tabung") { dompet -= r.jumlah; tabungan += r.jumlah; }
    else if (r.jenis === "ambil") { dompet += r.jumlah; tabungan -= r.jumlah; }
  }
  return { dompet, tabungan };
}
// Saldo tidak boleh minus di titik mana pun (urut tanggal lalu urutan dicatat).
function cekUrutan(rows) {
  let d = 0, t = 0;
  for (const r of [...rows].sort((a, b) => (a.tanggal === b.tanggal ? a.id - b.id : a.tanggal < b.tanggal ? -1 : 1))) {
    const s = saldo([r]);
    d += s.dompet; t += s.tabungan;
    if (d < 0) return "Uang di dompet anak tidak cukup untuk catatan ini.";
    if (t < 0) return "Tabungan anak tidak cukup untuk catatan ini.";
  }
  return "";
}
const semua = (childId) => db.prepare("SELECT * FROM keuangan_catatan WHERE child_id = ? ORDER BY tanggal, id").all(childId);

export function ringkasKeuangan(childId) {
  const rows = semua(childId);
  const { dompet, tabungan } = saldo(rows);
  const target = db.prepare("SELECT nama, jumlah FROM keuangan_target WHERE child_id = ?").get(childId) || null;
  const bulan = today().slice(0, 7);
  const ini = rows.filter((r) => r.tanggal.startsWith(bulan));
  return {
    dompet, tabungan, total: dompet + tabungan,
    target: target ? { ...target, persen: Math.min(100, Math.round((tabungan / target.jumlah) * 100)), kurang: Math.max(0, target.jumlah - tabungan) } : null,
    bulanIni: {
      masuk: ini.filter((r) => r.jenis === "masuk").reduce((n, r) => n + r.jumlah, 0),
      luar: ini.filter((r) => r.jenis === "luar").reduce((n, r) => n + r.jumlah, 0),
      keluar: ini.filter((r) => r.jenis === "keluar").reduce((n, r) => n + r.jumlah, 0),
      tabung: ini.filter((r) => r.jenis === "tabung").reduce((n, r) => n + r.jumlah, 0) - ini.filter((r) => r.jenis === "ambil").reduce((n, r) => n + r.jumlah, 0),
    },
    riwayat: rows.slice(-40).reverse().map((r) => ({ id: r.id, jenis: r.jenis, jumlah: r.jumlah, catatan: r.catatan, tanggal: r.tanggal, oleh: r.oleh })),
  };
}

const teks = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
const rupiah = (v) => {
  const n = Math.round(Number(String(v ?? "").replace(/[^\d]/g, "")));
  if (!Number.isFinite(n) || n < 1 || n > MAKS_JUMLAH) throw new Error("Isi jumlah uang antara Rp1 dan Rp100.000.000.");
  return n;
};

// Mengembalikan true bila permintaan ditangani.
export function handleKeuangan({ m, path, body, ortuId, ortuSaya, anak, ownChild, send, ApiError }) {
  if (path[0] !== "keuangan") return false;
  const salah = (fn) => { try { return fn(); } catch (e) { throw e instanceof ApiError ? e : new ApiError(400, e.message); } };

  // ----- anak: melihat, lalu mencatat uang dari luar/menabung/ambil tabungan dan memasang target sendiri -----
  if (path[1] === "saya") {
    if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
    const id = anak.child_id;
    if (path.length === 2 && m === "GET") return send(200, ringkasKeuangan(id)), true;
    if (path.length === 2 && m === "POST") {
      const jenis = JENIS_ANAK.includes(body.jenis) ? body.jenis : null;
      if (!jenis) throw new ApiError(400, "Pilih: dapat uang, belanja, menabung, atau ambil dari tabungan.");
      const n = db.prepare("SELECT COUNT(*) AS n FROM keuangan_catatan WHERE child_id = ? AND oleh = 'anak' AND tanggal = ?").get(id, today()).n;
      if (n >= MAKS_CATAT_ANAK_PER_HARI) throw new ApiError(429, "Sudah banyak catatan hari ini. Coba lagi besok, ya.");
      const jumlah = salah(() => rupiah(body.jumlah));
      const catatan = teks(body.catatan, 80);
      if (catatan) { const r = cekPesanKeluarga(catatan); if (!r.ok) throw new ApiError(400, r.reason); }
      const masalah = cekUrutan([...semua(id), { id: Number.MAX_SAFE_INTEGER, jenis, jumlah, tanggal: today() }]);
      if (masalah) throw new ApiError(400, masalah.replace("Uang di dompet anak", "Uang di dompetmu").replace("Tabungan anak", "Tabunganmu"));
      db.prepare("INSERT INTO keuangan_catatan (child_id, jenis, jumlah, catatan, tanggal, created_at, oleh) VALUES (?, ?, ?, ?, ?, ?, 'anak')")
        .run(id, jenis, jumlah, catatan, today(), Date.now());
      return send(200, ringkasKeuangan(id)), true;
    }
    if (path[2] === "target" && m === "PUT") {
      const nama = teks(body.nama, 40);
      if (!nama) throw new ApiError(400, "Isi nama targetmu, misalnya \"Sepeda\".");
      const r = cekPesanKeluarga(nama);
      if (!r.ok) throw new ApiError(400, r.reason);
      const jumlah = salah(() => rupiah(body.jumlah));
      db.prepare(`INSERT INTO keuangan_target (child_id, nama, jumlah) VALUES (?, ?, ?)
                  ON CONFLICT(child_id) DO UPDATE SET nama = excluded.nama, jumlah = excluded.jumlah`).run(id, nama, jumlah);
      return send(200, ringkasKeuangan(id)), true;
    }
    if (path[2] === "target" && m === "DELETE") {
      db.prepare("DELETE FROM keuangan_target WHERE child_id = ?").run(id);
      return send(200, ringkasKeuangan(id)), true;
    }
    // Menghapus catatan sendiri (mis. salah ketik). Catatan dari orang tua tidak bisa dihapus anak.
    if (path.length === 3 && m === "DELETE") {
      const r = db.prepare("SELECT * FROM keuangan_catatan WHERE id = ? AND child_id = ? AND oleh = 'anak'").get(Number(path[2]), id);
      if (!r) throw new ApiError(404, "Catatan tidak ditemukan.");
      if (cekUrutan(semua(id).filter((x) => x.id !== r.id))) throw new ApiError(400, "Catatan ini tidak bisa dihapus karena saldonya akan menjadi minus.");
      db.prepare("DELETE FROM keuangan_catatan WHERE id = ?").run(r.id);
      return send(200, ringkasKeuangan(id)), true;
    }
    throw new ApiError(404, "Alamat tidak ditemukan.");
  }

  if (!ortuId) throw new ApiError(401, "Silakan masuk sebagai orang tua.");
  if (path.length === 1 && m === "GET") {
    const kids = db.prepare("SELECT id FROM children WHERE parent_id = ? ORDER BY id").all(ortuId);
    return send(200, { anak: Object.fromEntries(kids.map((k) => [k.id, ringkasKeuangan(k.id)])) }), true;
  }
  if (path.length === 1 && m === "POST") {
    const c = ownChild(ortuId, body.childId);
    // Orang tua hanya memberi uang saku. Belanja dan tabungan dicatat anak sendiri.
    if (body.jenis && body.jenis !== "masuk") throw new ApiError(403, "Orang tua hanya bisa memberi uang saku. Belanja dan tabungan dicatat anak sendiri.");
    const jenis = "masuk";
    const jumlah = salah(() => rupiah(body.jumlah));
    const tanggal = TGL.test(String(body.tanggal || "")) && body.tanggal <= today() ? body.tanggal : today();
    const baru = { id: Number.MAX_SAFE_INTEGER, jenis, jumlah, tanggal };
    const masalah = cekUrutan([...semua(c.id), baru]);
    if (masalah) throw new ApiError(400, masalah);
    db.prepare("INSERT INTO keuangan_catatan (child_id, jenis, jumlah, catatan, tanggal, created_at, oleh) VALUES (?, ?, ?, ?, ?, ?, 'ortu')")
      .run(c.id, jenis, jumlah, teks(body.catatan, 80), tanggal, Date.now());
    const nama = db.prepare("SELECT name FROM parents WHERE id = ?").get(ortuSaya ?? ortuId)?.name || "Orang tua";
    notify(`a${c.id}`, "info", `💰 ${nama} memberimu uang saku Rp${jumlah.toLocaleString("id-ID")}`);
    return send(200, ringkasKeuangan(c.id)), true;
  }
  // Target tabungan dipasang anak sendiri; orang tua hanya melihat.
  if (path.length === 2 && m === "DELETE") {
    const r = db.prepare("SELECT k.* FROM keuangan_catatan k JOIN children c ON c.id = k.child_id WHERE k.id = ? AND c.parent_id = ? AND k.oleh = 'ortu' AND k.jenis = 'masuk'").get(Number(path[1]), ortuId);
    if (!r) throw new ApiError(404, "Catatan tidak ditemukan.");
    const masalah = cekUrutan(semua(r.child_id).filter((x) => x.id !== r.id));
    if (masalah) throw new ApiError(400, "Catatan ini tidak bisa dihapus karena saldo sesudahnya akan menjadi minus.");
    db.prepare("DELETE FROM keuangan_catatan WHERE id = ?").run(r.id);
    return send(200, ringkasKeuangan(r.child_id)), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

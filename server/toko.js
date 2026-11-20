// Toko aksesori avatar: anak mengumpulkan bintang dari Ruang Pintar lalu menukarnya dengan aksesori.
// Bintang dicatat per kunci (topik|tingkat, atau tryout|tanggal|kurikulum|pelajaran) dan saldo hanya
// bertambah ketika bintang terbaik pada kunci itu naik, jadi mengulang latihan yang sama tidak menambah bintang.
import { db, today } from "./db.js";
import { AKSESORI, aksesoriById, rapikanAksesori } from "../shared/aksesori.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS child_bintang (
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    kunci TEXT NOT NULL,
    best INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (child_id, kunci)
  );
`);

// node:sqlite tidak punya db.transaction(), jadi pakai BEGIN/COMMIT sendiri.
function transaksi(fn) {
  db.exec("BEGIN IMMEDIATE");
  try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; }
}

const KUNCI = /^[A-Za-z0-9_.:|-]{1,80}$/;
const daftar = (s) => String(s || "").split(",").filter(Boolean);

// Bintang maksimal per kunci, atau null bila kunci tidak diterima.
function batasBintang(kunci, now) {
  if (!KUNCI.test(kunci)) return null;
  if (kunci.startsWith("tryout|")) {
    // Tryout hanya dicatat untuk hari ini atau kemarin (zona waktu perangkat bisa berbeda).
    const tgl = kunci.split("|")[1];
    return tgl === today(now) || tgl === today(now - 86400000) ? 5 : null;
  }
  return /\|[123]$/.test(kunci) ? 3 : null;   // latihan: <topik>|<tingkat 1-3>
}

function keadaan(childId) {
  const c = db.prepare("SELECT bintang, aksesori_punya, aksesori_pakai FROM children WHERE id = ?").get(childId);
  return { bintang: c.bintang, punya: daftar(c.aksesori_punya).filter(aksesoriById), pakai: rapikanAksesori(c.aksesori_pakai) };
}

// Mengembalikan true bila permintaan ditangani. anak = sesi anak (atau null).
export function handleToko({ m, path, body, anak, send, ApiError }) {
  if (path[0] !== "toko" && path[0] !== "bintang") return false;
  if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu untuk membuka Toko.");
  const id = anak.child_id;

  if (m === "POST" && path[0] === "bintang" && path.length === 1) {
    const items = Array.isArray(body.items) ? body.items.slice(0, 1000) : [];
    const now = Date.now();
    const get = db.prepare("SELECT best FROM child_bintang WHERE child_id = ? AND kunci = ?");
    const put = db.prepare(`INSERT INTO child_bintang (child_id, kunci, best) VALUES (?, ?, ?)
                            ON CONFLICT(child_id, kunci) DO UPDATE SET best = excluded.best`);
    let tambah = 0;
    transaksi(() => {
      for (const it of items) {
        const kunci = String(it?.kunci || "");
        const max = batasBintang(kunci, now);
        if (max === null) continue;
        const b = Math.max(0, Math.min(max, Math.floor(Number(it.bintang) || 0)));
        const lama = get.get(id, kunci)?.best ?? 0;
        if (b > lama) { put.run(id, kunci, b); tambah += b - lama; }
      }
      if (tambah) db.prepare("UPDATE children SET bintang = bintang + ? WHERE id = ?").run(tambah, id);
    });
    return send(200, { tambah, ...keadaan(id) }), true;
  }

  if (m === "GET" && path[0] === "toko" && path.length === 1) {
    return send(200, { items: AKSESORI, ...keadaan(id) }), true;
  }

  if (m === "POST" && path[0] === "toko" && path[1] === "beli") {
    const a = aksesoriById(String(body.id || ""));
    if (!a) throw new ApiError(400, "Aksesori tidak dikenal.");
    transaksi(() => {
      const k = keadaan(id);
      if (k.punya.includes(a.id)) throw new ApiError(400, "Aksesori ini sudah kamu punya.");
      if (k.bintang < a.harga) throw new ApiError(400, `Bintangmu belum cukup. Perlu ${a.harga} bintang.`);
      db.prepare("UPDATE children SET bintang = bintang - ?, aksesori_punya = ? WHERE id = ?")
        .run(a.harga, [...k.punya, a.id].join(","), id);
    });
    return send(200, keadaan(id)), true;
  }

  if (m === "POST" && path[0] === "toko" && path[1] === "pakai") {
    const a = aksesoriById(String(body.id || ""));
    if (!a) throw new ApiError(400, "Aksesori tidak dikenal.");
    const k = keadaan(id);
    if (!k.punya.includes(a.id)) throw new ApiError(403, "Beli aksesori ini dulu.");
    // pakai=true: ganti aksesori di tempat yang sama; pakai=false: lepas.
    const lain = k.pakai.filter((x) => aksesoriById(x).slot !== a.slot);
    const baru = body.pakai === false ? k.pakai.filter((x) => x !== a.id) : [...lain, a.id];
    db.prepare("UPDATE children SET aksesori_pakai = ? WHERE id = ?").run(rapikanAksesori(baru).join(","), id);
    return send(200, keadaan(id)), true;
  }

  throw new ApiError(404, "Alamat tidak ditemukan.");
}

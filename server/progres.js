// Kemajuan Ruang Pintar per anak: topik dan bintang terbaik, medali, riwayat latihan dan tryout.
// Dulu hanya di browser (localStorage); sekarang disalin ke server supaya sama di semua perangkat
// dan bisa dilihat di Kamarku dan dashboard orang tua.
//
// Penggabungan tidak pernah mengurangi kemajuan: bintang terbaik dan angka diambil yang terbesar,
// medali digabung, riwayat digabung tanpa dobel. Datanya dikirim oleh browser anak sendiri, jadi
// semua isian dirapikan dan dibatasi ukurannya sebelum disimpan.
// "ringkasan" dihitung di Ruang Pintar (server tidak punya daftar topik), lalu dipakai untuk tampilan.
import { db, today } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS child_progres (
    child_id INTEGER PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    ringkasan TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS child_soal_dijawab (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    sesi TEXT NOT NULL,
    nomor INTEGER NOT NULL,
    jenis TEXT NOT NULL,
    topik TEXT NOT NULL,
    soal TEXT NOT NULL,
    jawaban TEXT NOT NULL,
    benar INTEGER NOT NULL,
    waktu TEXT NOT NULL,
    UNIQUE (child_id, sesi, nomor)
  );
  CREATE INDEX IF NOT EXISTS child_soal_riwayat ON child_soal_dijawab(child_id, id);
  CREATE TABLE IF NOT EXISTS child_progres_versi (
    child_id INTEGER PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    versi INTEGER NOT NULL
  );
`);

const MAKS_TOPIK = 3000, MAKS_RIWAYAT = 50, MAKS_TRYOUT = 30, MAKS_MEDALI = 50;
const KUNCI_TOPIK = /^[A-Za-z0-9_.:-]{1,60}\|[123]$/;
const ID = /^[A-Za-z0-9_.:-]{1,40}$/;
const TGL = /^\d{4}-\d{2}-\d{2}$/;

const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const teks = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
const waktu = (v) => { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const versiProgres = (id) => db.prepare("SELECT versi FROM child_progres_versi WHERE child_id = ?").get(id)?.versi ?? 0;

function transaksiProgres(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const hasil = fn();
    db.exec("COMMIT");
    return hasil;
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

function simpanProgres(id, data, ringkasan) {
  db.prepare(`INSERT INTO child_progres (child_id, data, ringkasan, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(child_id) DO UPDATE SET data = excluded.data, ringkasan = excluded.ringkasan, updated_at = excluded.updated_at`)
    .run(id, JSON.stringify(data), JSON.stringify(ringkasan), Date.now());
}

function rapikanData(d) {
  d = obj(d);
  const topics = {};
  for (const [k, t] of Object.entries(obj(d.topics)).slice(0, MAKS_TOPIK)) {
    if (!KUNCI_TOPIK.test(k)) continue;
    const x = obj(t);
    topics[k] = { best: int(x.best, 3), att: int(x.att, 1e6), ok: int(x.ok, 1e6), ses: int(x.ses, 1e5) };
  }
  const history = [];
  for (const h of arr(d.history).slice(0, MAKS_RIWAYAT * 2)) {
    const x = obj(h), dt = waktu(x.d);
    if (dt && KUNCI_TOPIK.test(String(x.id))) history.push({ d: dt, id: String(x.id), c: int(x.c, 100), n: int(x.n, 100) });
  }
  const tryouts = [];
  for (const t of arr(d.tryouts).slice(0, MAKS_TRYOUT * 2)) {
    const x = obj(t), dt = waktu(x.d);
    if (!dt || !ID.test(String(x.kur)) || !ID.test(String(x.mapel))) continue;
    tryouts.push({
      d: dt, kur: String(x.kur), mapel: String(x.mapel), kelas: int(x.kelas, 12), lv: int(x.lv, 3),
      score: int(x.score, 100), c: int(x.c, 200), n: int(x.n, 200), used: int(x.used, 1e5), menit: int(x.menit, 600),
      stars: int(x.stars, 5), max: int(x.max, 5),
    });
  }
  const tryoutHari = {};
  for (const [k, v] of Object.entries(obj(d.tryoutHari)).slice(0, 50)) {
    if (/^[A-Za-z0-9_-]{1,20}\|[A-Za-z0-9_-]{1,20}$/.test(k) && TGL.test(String(v))) tryoutHari[k] = String(v);
  }
  const medals = [...new Set(arr(d.medals).map(String).filter((m) => /^[a-z0-9]{1,20}$/.test(m)))].slice(0, MAKS_MEDALI);
  return { sessions: int(d.sessions, 1e6), perfect: int(d.perfect, 1e6), medals, topics, history, tryouts, tryoutHari };
}

function rapikanRingkasan(r) {
  r = obj(r);
  const mapel = arr(r.mapel).slice(0, 8).filter((m) => ID.test(String(obj(m).id))).map((m) => ({
    id: String(m.id), nama: teks(m.nama, 40), selesai: int(m.selesai, 999), total: int(m.total, 999),
  }));
  const u = obj(r.ulangi);
  return {
    kur: ID.test(String(r.kur)) ? String(r.kur) : "", kelas: int(r.kelas, 12), mapel,
    ulangi: u.nama ? { nama: teks(u.nama, 80), best: int(u.best, 3) } : null,
    totalMedali: int(r.totalMedali, 99), medaliTerbaru: teks(r.medaliTerbaru, 40),
    // Nama topik yang pernah dilatih (untuk Laporan Ruang Pintar di dashboard orang tua).
    laporan: arr(r.laporan).slice(0, 300).map(obj).filter((x) => KUNCI_TOPIK.test(String(x.k))).map((x) => ({
      k: String(x.k), nama: teks(x.nama, 80), mapel: teks(x.mapel, 40), kelas: teks(x.kelas, 30), kur: teks(x.kur, 20),
    })),
  };
}

// Gabungan dua kemajuan (keduanya sudah dirapikan).
function gabung(a, b) {
  const topics = { ...a.topics };
  for (const [k, t] of Object.entries(b.topics)) {
    const o = topics[k];
    topics[k] = o ? { best: Math.max(o.best, t.best), att: Math.max(o.att, t.att), ok: Math.max(o.ok, t.ok), ses: Math.max(o.ses, t.ses) } : t;
  }
  const unik = (list, kunci, max) => {
    const m = new Map();
    for (const x of list) if (!m.has(kunci(x))) m.set(kunci(x), x);
    return [...m.values()].sort((x, y) => (x.d < y.d ? 1 : -1)).slice(0, max);
  };
  const tryoutHari = { ...a.tryoutHari };
  for (const [k, v] of Object.entries(b.tryoutHari)) if (!tryoutHari[k] || v > tryoutHari[k]) tryoutHari[k] = v;
  return {
    sessions: Math.max(a.sessions, b.sessions), perfect: Math.max(a.perfect, b.perfect),
    medals: [...new Set([...a.medals, ...b.medals])].slice(0, MAKS_MEDALI),
    topics: Object.fromEntries(Object.entries(topics).slice(0, MAKS_TOPIK)),
    history: unik([...a.history, ...b.history], (x) => `${x.d}|${x.id}`, MAKS_RIWAYAT),
    tryouts: unik([...a.tryouts, ...b.tryouts], (x) => x.d, MAKS_TRYOUT),
    tryoutHari,
  };
}

export function bacaProgres(childId) {
  const r = db.prepare("SELECT data, ringkasan, updated_at FROM child_progres WHERE child_id = ?").get(childId);
  if (!r) return null;
  try { return { data: JSON.parse(r.data), ringkasan: JSON.parse(r.ringkasan), updatedAt: r.updated_at }; } catch { return null; }
}

// Laporan Ruang Pintar untuk orang tua (sama dengan menu "Laporan Orang Tua" di Ruang Pintar):
// angka dari kemajuan terbaru di server, nama topik dari ringkasan yang dikirim Ruang Pintar.
const LV = { 1: "Mudah", 2: "Sedang", 3: "Sulit" };
function laporanBelajar(d, r, namaMapel) {
  let soal = 0, benar = 0;
  for (const t of Object.values(d.topics)) { soal += t.att; benar += t.ok; }
  // Semua topik yang pernah dilatih. Nama dari ringkasan Ruang Pintar bila ada; selain itu dashboard
  // mengisinya dari daftar topik Ruang Pintar (lewat id topik).
  const nama = Object.fromEntries((r.laporan || []).map((x) => [x.k, x]));
  const topik = Object.entries(d.topics).filter(([, t]) => t.att).map(([k, t]) => {
    const x = nama[k] || {};
    const persen = Math.round((t.ok / t.att) * 100);
    return { id: k.split("|")[0], nama: x.nama || "", mapel: x.mapel || "", kelas: x.kelas || "", kur: x.kur || "",
      tingkat: LV[k.split("|")[1]] || "", lv: Number(k.split("|")[1]) || 0, soal: t.att, benar: t.ok, persen, status: persen < 60 ? "perlu" : persen < 85 ? "berkembang" : "kuat" };
  }).sort((a, b) => a.persen - b.persen);
  return {
    soal, benar, benarPersen: soal ? Math.round((benar / soal) * 100) : null, sesi: d.sessions,
    terakhir: d.history[0]?.d || null,
    topik,
    tryout: d.tryouts.slice(0, 10).map((t) => ({ d: t.d, mapel: namaMapel[t.mapel] || t.mapel, score: t.score, c: t.c, n: t.n, stars: t.stars, max: t.max })),
  };
}

// Ringkasan kemajuan belajar untuk Kamarku dan dashboard orang tua (null bila belum pernah ke Ruang Pintar).
export function ringkasBelajar(childId, now = Date.now()) {
  const p = bacaProgres(childId);
  if (!p) return null;
  const { data: d, ringkasan: r } = p;
  const hariIni = today(now);
  const nama = Object.fromEntries(r.mapel.map((m) => [m.id, m.nama]));
  return {
    medali: { punya: d.medals.length, total: r.totalMedali, terbaru: r.medaliTerbaru },
    mapel: r.mapel,
    ulangi: r.ulangi,
    misi: {
      tryout: r.mapel.map((m) => {
        const t = d.tryouts.find((x) => x.kur === r.kur && x.mapel === m.id && today(Date.parse(x.d)) === hariIni);
        return { id: m.id, nama: m.nama, selesai: d.tryoutHari[`${r.kur}|${m.id}`] === hariIni, bintang: t ? t.stars : null };
      }),
      latihanHariIni: d.history.filter((h) => today(Date.parse(h.d)) === hariIni).length,
    },
    latihan7Hari: d.history.filter((h) => now - Date.parse(h.d) < 7 * 86400000).length,
    sesi: d.sessions,
    tryoutTerakhir: d.tryouts.slice(0, 5).map((t) => ({ d: t.d, mapel: nama[t.mapel] || t.mapel, score: t.score, c: t.c, n: t.n, stars: t.stars })),
    laporan: laporanBelajar(d, r, nama),
  };
}

// Mengembalikan true bila permintaan ditangani. anak = sesi anak (atau null).
export function handleProgres({ m, path, body, anak, url, needOrtu, ownChild, send, ApiError }) {
  if (path[0] === "progres" && path[1] === "soal") {
    if (m === "GET" && path.length === 3) {
      const child = ownChild(needOrtu(), path[2]);
      const sebelum = url.searchParams.get("sebelum");
      const cursor = sebelum === null ? null : Number(sebelum);
      if (cursor !== null && (!Number.isSafeInteger(cursor) || cursor < 1)) throw new ApiError(400, "Halaman soal tidak valid.");
      const daftar = db.prepare(`
        SELECT id, nomor, jenis, topik, soal, jawaban, benar, waktu FROM child_soal_dijawab
        WHERE child_id = ? AND id < COALESCE(?, 9223372036854775807) ORDER BY id DESC LIMIT 26
      `).all(child.id, cursor);
      const soal = daftar.slice(0, 25);
      return send(200, { soal, berikut: daftar.length > 25 ? soal.at(-1).id : null }), true;
    }
    if (m === "POST" && path.length === 2) {
      if (!anak || body.childId !== anak.child_id) throw new ApiError(401, "Masuk sebagai anak dulu.");
      const baris = arr(body.soal);
      if (!baris.length || baris.length > 25) throw new ApiError(400, "Jumlah catatan soal tidak valid.");
      const catatan = baris.map((data) => {
        const x = obj(data);
        const tanggal = waktu(x.waktu);
        const soal = teks(x.soal, 1500);
        if (typeof x.sesi !== "string" || !ID.test(x.sesi) || !Number.isInteger(x.nomor) || x.nomor < 1 || x.nomor > 200
          || !["latihan", "tryout"].includes(x.jenis) || typeof x.benar !== "boolean" || !tanggal || !soal) {
          throw new ApiError(400, "Catatan soal tidak valid.");
        }
        return [anak.child_id, x.sesi, x.nomor, x.jenis, teks(x.topik, 120), soal, teks(x.jawaban, 200), Number(x.benar), tanggal];
      });
      const simpan = db.prepare(`INSERT INTO child_soal_dijawab (child_id, sesi, nomor, jenis, topik, soal, jawaban, benar, waktu)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (child_id, sesi, nomor) DO NOTHING`);
      const tersimpan = transaksiProgres(() => {
        if ((body.versi ?? 0) !== versiProgres(anak.child_id)) return false;
        for (const x of catatan) simpan.run(...x);
        return true;
      });
      if (!tersimpan) return send(409, { versi: versiProgres(anak.child_id), data: bacaProgres(anak.child_id)?.data || null }), true;
      return send(200, { ok: true }), true;
    }
    throw new ApiError(405, "Metode tidak didukung.");
  }
  if (path[0] !== "progres" || path.length !== 1) return false;
  if (!anak) throw new ApiError(401, "Masuk sebagai anak dulu.");
  const id = anak.child_id;

  if (m === "GET") return send(200, { data: bacaProgres(id)?.data || null, versi: versiProgres(id) }), true;

  if (m === "POST") {
    const hasil = transaksiProgres(() => {
      const versi = versiProgres(id);
      const lama = bacaProgres(id);
      if ((body.versi ?? 0) !== versi) return { konflik: true, versi, data: lama?.data || null };
      const data = lama ? gabung(rapikanData(lama.data), rapikanData(body.data)) : rapikanData(body.data);
      const ringkasan = body.ringkasan ? rapikanRingkasan(body.ringkasan) : (lama?.ringkasan || rapikanRingkasan({}));
      simpanProgres(id, data, ringkasan);
      return { data, versi };
    });
    return send(hasil.konflik ? 409 : 200, hasil), true;
  }

  // "Hapus semua progres" di Ruang Pintar. Bintang dan XP di server tidak ikut terhapus.
  if (m === "DELETE") {
    if (body.childId !== undefined && body.childId !== id) throw new ApiError(409, "Akun anak sudah berganti.");
    const hasil = transaksiProgres(() => {
      const lama = bacaProgres(id);
      const versi = versiProgres(id) + 1;
      const data = rapikanData({ tryoutHari: { ...obj(body.tryoutHari), ...obj(lama?.data.tryoutHari) } });
      const mapel = arr(lama?.ringkasan.mapel).map((m) => ({ ...m, selesai: 0 }));
      simpanProgres(id, data, rapikanRingkasan({ ...lama?.ringkasan, mapel, ulangi: null, medaliTerbaru: "", laporan: [] }));
      db.prepare("DELETE FROM child_soal_dijawab WHERE child_id = ?").run(id);
      db.prepare(`INSERT INTO child_progres_versi (child_id, versi) VALUES (?, ?)
        ON CONFLICT (child_id) DO UPDATE SET versi = excluded.versi`).run(id, versi);
      return { ok: true, data, versi };
    });
    return send(200, hasil), true;
  }

  throw new ApiError(405, "Metode tidak didukung.");
}

// Kegiatan belajar anak di Ruang Pintar untuk Home orang tua: latihan per hari (jumlah soal dan persen benar)
// dan tiap tryout, 7 hari terakhir. Setiap kegiatan menunggu tanggapan orang tua:
//   hebat / semangat → juga dikirim sebagai pesan ke chat pribadi anak; lihat → hanya ditandai sudah dilihat.
// Data kegiatan dihitung dari kemajuan Ruang Pintar di server (server/progres.js); hanya tanggapan yang disimpan di sini.
import { db, today } from "./db.js";
import { bacaProgres } from "./progres.js";
import { pesanOrtuKeAnak } from "./chat.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS tanggapan_belajar (
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    kunci TEXT NOT NULL,              -- latihan|YYYY-MM-DD atau tryout|<waktu ISO>|<pelajaran>
    jenis TEXT NOT NULL,              -- hebat | semangat | lihat
    ortu_id INTEGER,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (child_id, kunci)
  );
`);

const HARI_MS = 86400000, RENTANG_HARI = 7;
const JENIS = {
  hebat: { label: "👏 Hebat!", pesan: (k) => `👏 Hebat! ${k.teksAnak} Terus semangat belajar, ya!` },
  semangat: { label: "💪 Semangat!", pesan: (k) => `💪 ${k.teksAnak} Ayo latihan lagi, kamu pasti bisa!` },
  lihat: { label: "✔ Sudah dilihat", pesan: null },
};

// Daftar kegiatan satu anak (terbaru dulu), lengkap dengan tanggapan bila sudah ada.
export function kegiatanBelajar(childId, now = Date.now()) {
  return daftarKegiatan(childId, now).map(({ teksAnak, ...k }) => k);
}

// Sama dengan kegiatanBelajar, ditambah teksAnak (kalimat untuk pesan tanggapan ke anak).
function daftarKegiatan(childId, now = Date.now()) {
  const p = bacaProgres(childId);
  if (!p) return [];
  const { data: d, ringkasan: r } = p;
  const namaMapel = Object.fromEntries((r.mapel || []).map((m) => [m.id, m.nama]));
  const batas = now - RENTANG_HARI * HARI_MS;
  const out = [];

  const perHari = new Map();
  for (const h of d.history || []) {
    const t = Date.parse(h.d);
    if (!(t >= batas)) continue;
    const hari = today(t);
    const x = perHari.get(hari) || { sesi: 0, soal: 0, benar: 0, akhir: t };
    x.sesi += 1; x.soal += h.n; x.benar += h.c; x.akhir = Math.max(x.akhir, t);
    perHari.set(hari, x);
  }
  for (const [hari, x] of perHari) {
    if (!x.soal) continue;
    const persen = Math.round((x.benar / x.soal) * 100);
    out.push({
      kunci: `latihan|${hari}`, jenis: "latihan", hari, at: x.akhir, sesi: x.sesi, soal: x.soal, persen,
      teks: `Latihan ${x.sesi} sesi · ${x.soal} soal · ${persen}% benar`,
      teksAnak: `Kamu mengerjakan ${x.soal} soal dan ${persen}% benar.`,
    });
  }
  for (const t of d.tryouts || []) {
    const w = Date.parse(t.d);
    if (!(w >= batas)) continue;
    const mapel = namaMapel[t.mapel] || t.mapel;
    out.push({
      kunci: `tryout|${t.d}|${t.mapel}`, jenis: "tryout", hari: today(w), at: w, mapel, score: t.score, c: t.c, n: t.n, stars: t.stars, max: t.max,
      teks: `Tryout ${mapel} · nilai ${t.score} (${t.c} dari ${t.n} benar)`,
      teksAnak: `Tryout ${mapel}-mu dapat nilai ${t.score}.`,
    });
  }
  const tanggapan = new Map(db.prepare("SELECT kunci, jenis, created_at FROM tanggapan_belajar WHERE child_id = ?").all(childId).map((x) => [x.kunci, x]));
  return out.sort((a, b) => b.at - a.at).map((k) => {
    const t = tanggapan.get(k.kunci);
    return { ...k, tanggapan: t ? { jenis: t.jenis, label: JENIS[t.jenis]?.label || t.jenis, at: t.created_at } : null };
  });
}

// Mengembalikan true bila permintaan ditangani.
export function handleTanggapanBelajar({ m, path, body, ortuId, ortuSaya, ownChild, send, ApiError }) {
  if (path[0] !== "kegiatan-belajar") return false;
  if (!ortuId) throw new ApiError(401, "Silakan masuk sebagai orang tua.");

  if (m === "GET" && path.length === 1) {
    const kids = db.prepare("SELECT id FROM children WHERE parent_id = ? ORDER BY id").all(ortuId);
    return send(200, { anak: Object.fromEntries(kids.map((k) => [k.id, kegiatanBelajar(k.id)])) }), true;
  }

  if (m === "POST" && path.length === 2 && path[1] === "tanggapan") {
    const c = ownChild(ortuId, body.anak);
    const jenis = JENIS[body.jenis] ? body.jenis : null;
    if (!jenis) throw new ApiError(400, "Pilih tanggapan.");
    const k = daftarKegiatan(c.id).find((x) => x.kunci === body.kunci);
    if (!k) throw new ApiError(404, "Kegiatan ini tidak ditemukan atau sudah lewat 7 hari.");
    const r = db.prepare("INSERT OR IGNORE INTO tanggapan_belajar (child_id, kunci, jenis, ortu_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(c.id, k.kunci, jenis, ortuSaya ?? ortuId, Date.now());
    // Hanya tanggapan pertama yang dikirim ke anak (orang tua lain di keluarga mungkin sudah menanggapi).
    if (r.changes && JENIS[jenis].pesan) pesanOrtuKeAnak(c.id, ortuSaya ?? ortuId, JENIS[jenis].pesan(k));
    return send(200, { kegiatan: kegiatanBelajar(c.id) }), true;
  }
  throw new ApiError(404, "Alamat tidak ditemukan.");
}

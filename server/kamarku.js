// Kamarku: ringkasan untuk anak yang sedang masuk (dashboard anak di arena).
// Hanya data milik anak itu sendiri; tidak ada perbandingan dengan pemain lain.
// Kemajuan Ruang Pintar (medali, misi, topik) dibaca dari server/progres.js.
import { db, today, lastDays } from "./db.js";
import { AKSESORI, rapikanAksesori } from "../shared/aksesori.js";
import { XP_PER_LEVEL, levelDariXp, auraUntukLevel, auraBerikutnya } from "../shared/aura.js";
import { friendsOf, isOnline } from "./social.js";
import { ringkasBelajar } from "./progres.js";

const GAMES = ["catur", "scramble", "kartu"];
const daftar = (s) => String(s || "").split(",").filter(Boolean);

export function kamarku(childId) {
  const c = db.prepare("SELECT * FROM children WHERE id = ?").get(childId);
  if (!c) return null;

  const detik = db.prepare("SELECT seconds FROM play_time WHERE child_id = ? AND day = ?").get(c.id, today())?.seconds || 0;
  const usedMin = Math.floor(detik / 60);

  // Menit bermain 7 hari terakhir (untuk menu Report di dashboard anak).
  const hari = lastDays(7);
  const perHari = Object.fromEntries(db.prepare("SELECT day, seconds FROM play_time WHERE child_id = ? AND day >= ?").all(c.id, hari[0]).map((r) => [r.day, r.seconds]));
  const minggu = hari.map((d) => ({ day: d, minutes: Math.floor((perHari[d] || 0) / 60) }));

  const level = levelDariXp(c.xp);
  const aura = auraUntukLevel(level), next = auraBerikutnya(level);

  // Aksesori termurah yang belum dimiliki, sebagai target berikutnya.
  const punya = daftar(c.aksesori_punya);
  const target = AKSESORI.filter((a) => !punya.includes(a.id)).sort((a, b) => a.harga - b.harga)[0] || null;

  const games = {};
  for (const g of GAMES) {
    const s = { main: 0, menang: 0, seri: 0 };
    for (const r of db.prepare("SELECT outcome, COUNT(*) AS n FROM results WHERE child_id = ? AND game = ? GROUP BY outcome").all(c.id, g)) {
      s.main += r.n;
      if (r.outcome !== "kalah") s[r.outcome] = r.n;
    }
    games[g] = s;
  }

  const f = friendsOf(c.id);
  const teman = f.friends
    .map((x) => ({ name: x.name, jenjang: x.jenjang, online: isOnline(x.uid) }))
    .sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));

  return {
    minggu,
    waktu: { usedMin, limitMin: c.limit_min, sisaMin: c.limit_min > 0 ? Math.max(0, c.limit_min - usedMin) : null },
    level, xp: c.xp, xpLevel: c.xp % XP_PER_LEVEL, xpPerLevel: XP_PER_LEVEL,
    aura: aura ? aura.nama : "", auraBerikut: next ? { nama: next.nama, level: next.dari } : null,
    bintang: c.bintang, punya: punya.length, totalAksesori: AKSESORI.length,
    dipakai: rapikanAksesori(c.aksesori_pakai).length,
    target: target ? { name: target.name, harga: target.harga, kurang: Math.max(0, target.harga - c.bintang) } : null,
    games,
    teman, permintaan: f.incoming.length, menunggu: f.waiting.length,
    belajar: ringkasBelajar(c.id),   // null bila belum pernah membuka Ruang Pintar
  };
}

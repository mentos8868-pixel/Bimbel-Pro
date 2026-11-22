// Pemeriksaan identitas untuk semua ruang game.
import colyseus from "colyseus";
import { playerFromTicket, secondsToday, idKeluarga } from "./accounts.js";
import { areFriends, blockedEitherWay, uidOf } from "./social.js";
import { dudukDiMeja } from "./rooms/kursi-game.js";

const { ServerError } = colyseus;

export function authPlayer(options = {}) {
  const p = playerFromTicket(options.ticket);
  if (!p) throw new ServerError(4401, "Silakan masuk dulu.");
  if (p.role === "anak" && p.limitMin > 0 && secondsToday(p.childId) >= p.limitMin * 60) {
    throw new ServerError(4403, "Waktu bermain hari ini sudah habis. Sampai jumpa besok!");
  }
  return p;
}

// Siapa boleh bermain bersama di satu meja game (catur, scramble, kartu): sekeluarga, sesama orang tua, sesama anak yang berteman,
// atau dua anak yang sama-sama diizinkan bermain dengan pemain lain dan sejenjang. Orang tua tidak dipasangkan
// dengan anak keluarga lain, dan pemain yang saling blokir tidak dipasangkan.
function bolehSemeja(a, b) {
  if (blockedEitherWay(uidOf(a), uidOf(b))) return false;
  const keluarga = (p) => (p.role === "anak" ? p.parentId : idKeluarga(p.parentId));
  if (keluarga(a) === keluarga(b)) return true;
  if (a.role === "ortu" && b.role === "ortu") return true;
  if (a.role !== "anak" || b.role !== "anak") return false;
  return areFriends(a.childId, b.childId) || (a.allowStrangers && b.allowStrangers && a.jenjang === b.jenjang);
}

// Untuk meja game: meja umum (cari lawan) hanya untuk anak yang diizinkan orang tua, dan sejenjang.
// Meja dengan kode (pribadi) boleh untuk siapa saja yang sudah masuk, termasuk orang tua.
export function authTable(room, options = {}) {
  const p = authPlayer(options);
  const game = room.roomName === "chess" ? "catur" : room.roomName;
  // Meja game di arena ("Main online di meja ini"): satu ruang per meja untuk siapa saja yang duduk di sana
  // (anak atau orang tua). Pemain berikutnya hanya diterima bila boleh bermain dengan SEMUA pemain yang sudah ada.
  if (["chess", "scramble", "kartu"].includes(room.roomName) && !room.listing.private) {
    if (typeof options.meja !== "string" || !dudukDiMeja(p, game, options.meja)) throw new ServerError(4403, "Duduk di meja permainan dahulu.");
    if (!room.clients.every((c) => !c.auth || bolehSemeja(c.auth, p))) {
      throw new ServerError(4403, "Pemain di meja ini belum bisa diajak bermain bersamamu. Pilih meja lain atau lawan bot.");
    }
    return p;
  }
  if (p.role === "anak" && (room.listing.private ? !dudukDiMeja(p, game)
    : typeof options.meja !== "string" || !dudukDiMeja(p, game, options.meja))) {
    throw new ServerError(4403, "Duduk di meja permainan dahulu.");
  }
  if (!room.listing.private) {
    if (p.role === "ortu") throw new ServerError(4403, "Orang tua bermain lewat kode meja bersama anak.");
    if (!p.allowStrangers) throw new ServerError(4403, "Bermain dengan pemain lain belum diizinkan orang tua. Pakai kode meja atau lawan bot.");
    if (options.jenjang && options.jenjang !== p.jenjang) throw new ServerError(4403, "Jenjang tidak sesuai akun.");
  }
  return p;
}

// Pemeriksaan identitas untuk semua ruang game.
import colyseus from "colyseus";
import { playerFromTicket, secondsToday } from "./accounts.js";
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

// Untuk meja game: meja umum (cari lawan) hanya untuk anak yang diizinkan orang tua, dan sejenjang.
// Meja dengan kode (pribadi) boleh untuk siapa saja yang sudah masuk, termasuk orang tua.
export function authTable(room, options = {}) {
  const p = authPlayer(options);
  const game = room.roomName === "chess" ? "catur" : room.roomName;
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

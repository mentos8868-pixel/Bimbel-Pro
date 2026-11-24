import { MEJA_GAME, kursiMeja } from "../../shared/meja-game.js";
import { uidOf } from "../social.js";

const kursiAktif = new Map();

export function dudukDiMeja(auth, game, meja) {
  const kursi = kursiAktif.get(uidOf(auth));
  return kursi?.game === game && (meja === undefined || kursi.kunci === meja);
}

export function siapkanKursiGame(room) {
  const posisiAwal = new Map();
  function berdiri(client) {
    const p = room.state.players.get(client.sessionId);
    if (!p) return;
    const uid = uidOf(client.auth);
    if (kursiAktif.get(uid)?.client === client) kursiAktif.delete(uid);
    const awal = posisiAwal.get(client.sessionId);
    posisiAwal.delete(client.sessionId);
    const meja = MEJA_GAME[p.mejaGame - 1];
    const kursi = meja && kursiMeja(meja)[p.kursiGame - 1];
    if (awal) Object.assign(p, awal);
    else if (kursi) {
      p.x = meja.x + (kursi.x - meja.x) * 1.4;
      p.z = meja.z + (kursi.z - meja.z) * 1.4;
    }
    const tadinyaDuduk = Boolean(p.mejaGame);
    p.mejaGame = 0;
    p.kursiGame = 0;
    if (tadinyaDuduk) room.keluarBedaGambar?.(client);
    if (!p.kursiBimbel) client.send("meja-game-berdiri", { x: p.x, z: p.z, ry: p.ry });
  }
  room.onMessage("meja-game-duduk", (client, nomor) => {
    const p = room.state.players.get(client.sessionId);
    const t = Number.isInteger(nomor) && MEJA_GAME[nomor - 1];
    const gagal = (pesan) => client.send("meja-game-gagal", pesan);
    if (!p || !t || p.kursiBimbel || Math.hypot(p.x - t.x, p.z - t.z) > 2.65) return gagal("Dekati meja permainan dahulu.");
    const uid = uidOf(client.auth);
    if (kursiAktif.has(uid)) return gagal("Akun ini sudah duduk di meja permainan.");
    const terisi = new Set([...room.state.players.values()].filter((pemain) => pemain.mejaGame === nomor).map((pemain) => pemain.kursiGame));
    const kursi = kursiMeja(t);
    const i = kursi.findIndex((_, index) => !terisi.has(index + 1));
    if (i < 0) return gagal("Meja ini penuh. Pilih meja lain.");
    posisiAwal.set(client.sessionId, { x: p.x, z: p.z, ry: p.ry });
    Object.assign(p, kursi[i]);
    p.kursiGame = i + 1;
    p.mejaGame = nomor;
    kursiAktif.set(uid, { client, game: t.id, kunci: `${room.roomId}:${nomor}` });
    client.send("meja-game-siap", { nomor, posisi: kursi[i] });
  });
  room.onMessage("meja-game-berdiri", berdiri);
  return (client) => {
    const uid = uidOf(client.auth);
    if (kursiAktif.get(uid)?.client === client) kursiAktif.delete(uid);
    posisiAwal.delete(client.sessionId);
  };
}

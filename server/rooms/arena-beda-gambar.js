import { ADEGAN_BEDA, MEJA_BEDA, targetAdegan } from "../../shared/beda-gambar.js";
import { idKeluarga } from "../accounts.js";
import { MEJA_GAME } from "../../shared/meja-game.js";
import { areFriends, blockedEitherWay, uidOf } from "../social.js";

function bolehMain(a, b) {
  if (blockedEitherWay(uidOf(a), uidOf(b))) return false;
  if (a.role === "ortu" && b.role === "ortu") return true;
  const keluarga = (p) => p.role === "anak" ? p.parentId : idKeluarga(p.parentId);
  if (keluarga(a) === keluarga(b)) return true;
  return a.role === "anak" && b.role === "anak" &&
    (areFriends(a.childId, b.childId) || (a.allowStrangers && b.allowStrangers));
}

export function siapkanBedaGambar(room) {
  const meja = new Map();
  const mejaPemain = new Map();
  const status = (m) => m.pemain.length < 2 || !m.pemain.every((p) => p.siap) ? "menunggu"
    : m.temuan.size < m.target.size ? "main"
    : m.adegan + 1 < ADEGAN_BEDA.length ? "lanjut" : "selesai";
  const kirim = (m) => {
    const data = {
      adegan: m.adegan, status: status(m), ditemukan: [...m.temuan],
      target: status(m) === "menunggu" ? [] : [...m.target],
      skor: m.pemain.map(({ client, poin, siap }) => ({ id: client.sessionId, nama: client.auth.name, poin, siap })),
    };
    for (const { client } of m.pemain) client.send("beda-status", data);
  };
  const gagal = (client, pesan) => client.send("beda-gagal", pesan);
  const keluar = (client) => {
    const m = mejaPemain.get(client.sessionId);
    if (!m) return;
    meja.delete(m.id);
    for (const p of m.pemain) {
      mejaPemain.delete(p.client.sessionId);
      if (p.client !== client) p.client.send("beda-berakhir");
    }
  };

  room.onMessage("beda-gabung", (client, id) => {
    const posisi = Number.isInteger(id) && MEJA_BEDA[id];
    const p = room.state.players.get(client.sessionId);
    if (!posisi || !p || MEJA_GAME[p.mejaGame - 1]?.x !== posisi.x || MEJA_GAME[p.mejaGame - 1]?.z !== posisi.z) {
      return gagal(client, "Duduk di meja Spot the Differences dulu.");
    }
    const sudah = mejaPemain.get(client.sessionId);
    if (sudah) return kirim(sudah);
    let m = meja.get(id);
    if (m?.pemain.length === 2) return gagal(client, "Meja ini sudah penuh.");
    if (m) {
      const lawan = m.pemain[0].client.auth;
      if (uidOf(lawan) === uidOf(client.auth) || !bolehMain(lawan, client.auth)) {
        return gagal(client, "Akun ini tidak bisa bermain bersama pemain di meja tersebut.");
      }
    } else {
      m = { id, pemain: [], adegan: 0, temuan: new Set(), target: targetAdegan(0) };
      meja.set(id, m);
    }
    m.pemain.push({ client, poin: 0, siap: false });
    mejaPemain.set(client.sessionId, m);
    kirim(m);
  });
  room.onMessage("beda-ready", (client) => {
    const m = mejaPemain.get(client.sessionId);
    if (!m || status(m) !== "menunggu") return;
    m.pemain.find((p) => p.client === client).siap = true;
    kirim(m);
  });
  room.onMessage("beda-pilih", (client, data) => {
    const m = mejaPemain.get(client.sessionId);
    if (!m || status(m) !== "main" || data?.adegan !== m.adegan) return;
    const i = data?.benda;
    if (!m.target.has(i)) return gagal(client, "Benda ini sama di kedua gambar.");
    if (m.temuan.has(i)) return;
    m.temuan.add(i);
    m.pemain.find((p) => p.client === client).poin++;
    kirim(m);
  });
  room.onMessage("beda-lanjut", (client, adegan) => {
    const m = mejaPemain.get(client.sessionId);
    if (!m || adegan !== m.adegan || status(m) !== "lanjut") return;
    m.adegan++;
    m.target = targetAdegan(m.adegan);
    m.temuan.clear();
    kirim(m);
  });
  room.onMessage("beda-keluar", keluar);
  return keluar;
}

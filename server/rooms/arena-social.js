// Chat, profil pemain, pertemanan, undangan, blokir, dan laporan di dalam arena.
import { PRESETS, checkText } from "../../shared/chat.js";
import {
  uidOf, chatSetting, isMuted, block, blockedEitherWay, report, REASONS,
  relation, requestFriend, answerFriend, friendsOf, areFriends,
  registerOnline, unregisterOnline, isOnline, notify,
} from "../social.js";

const GAMES = { catur: "Catur", scramble: "Scramble", kartu: "Kartu Kilat" };

export function setupSocial(room) {
  room.lastChats = new Map(); // uid -> pesan terakhir (bukti untuk laporan)
  room.chatTimes = new Map(); // sessionId -> waktu kirim terakhir (pembatas)

  const findClient = (sessionId) => room.clients.find((c) => c.sessionId === sessionId);
  const info = (client, text) => client.send("info", text);
  const childId = (client) => (client.auth.role === "anak" ? client.auth.childId : null);

  // ----- chat -----
  room.onMessage("chat", (client, data = {}) => {
    const from = uidOf(client.auth);
    const setting = chatSetting(from);
    if (setting === "mati") return info(client, "Chat dimatikan oleh orang tua.");
    if (isMuted(from)) return info(client, "Chatmu dibisukan sementara karena dilaporkan beberapa pemain.");

    const now = Date.now();
    const times = (room.chatTimes.get(client.sessionId) || []).filter((t) => now - t < 15000);
    if (times.length >= 5 || (times.length && now - times[times.length - 1] < 1500)) {
      return info(client, "Pelan-pelan ya, tunggu sebentar sebelum mengirim lagi.");
    }

    let text, preset;
    if (Number.isInteger(data.preset) && PRESETS[data.preset]) {
      text = PRESETS[data.preset];
      preset = true;
    } else {
      if (setting !== "bebas") return info(client, "Kamu hanya bisa memakai pesan siap pakai.");
      const r = checkText(data.text);
      if (!r.ok) return client.send("chat-ditolak", r.reason);
      text = r.text;
      preset = false;
    }
    times.push(now);
    room.chatTimes.set(client.sessionId, times);
    const log = room.lastChats.get(from) || [];
    log.push({ text, at: now });
    room.lastChats.set(from, log.slice(-10));

    const msg = { from: client.sessionId, name: client.auth.name, text, preset };
    for (const c of room.clients) {
      if (c === client) { c.send("chat-masuk", msg); continue; }
      const to = uidOf(c.auth);
      const rs = chatSetting(to);
      // Penerima hanya melihat chat sesuai pengaturannya sendiri, dan tidak dari pemain yang diblokir.
      if (rs === "mati" || (!preset && rs !== "bebas") || blockedEitherWay(from, to)) continue;
      c.send("chat-masuk", msg);
    }
  });

  // ----- profil pemain lain (saat avatarnya diketuk) -----
  room.onMessage("profil", (client, { sessionId } = {}) => {
    const other = findClient(sessionId);
    if (!other || other === client) return;
    const me = childId(client), them = childId(other);
    client.send("profil", {
      sessionId,
      name: other.auth.name,
      jenjang: other.auth.role === "ortu" ? "Orang tua" : other.auth.jenjang,
      relation: me && them ? relation(me, them) : "none",
      canFriend: !!(me && them),
      blocked: blockedEitherWay(uidOf(client.auth), uidOf(other.auth)),
    });
  });

  // ----- pertemanan -----
  room.onMessage("teman-minta", (client, { sessionId } = {}) => {
    const other = findClient(sessionId);
    const me = childId(client), them = other && childId(other);
    if (!me || !them) return info(client, "Pertemanan hanya antar-anak.");
    const r = requestFriend(me, them);
    if (!r.ok) return info(client, r.reason);
    if (r.active) {
      info(client, `Kamu dan ${other.auth.name} sekarang berteman!`);
      notify(`a${them}`, "info", `Kamu dan ${client.auth.name} sekarang berteman!`);
    } else if (r.waitingParents) {
      info(client, "Permintaan diterima. Menunggu persetujuan orang tua.");
    } else {
      info(client, `Permintaan pertemanan dikirim ke ${other.auth.name}.`);
      notify(`a${them}`, "teman-permintaan", { id: r.id, name: client.auth.name });
    }
  });

  room.onMessage("teman-jawab", (client, { id, terima } = {}) => {
    const me = childId(client);
    if (!me) return;
    const r = answerFriend(me, Number(id), !!terima);
    if (!r.ok) return info(client, r.reason);
    if (!terima) return info(client, "Permintaan ditolak.");
    const otherUid = `a${r.friendship.from_child}`;
    if (r.active) {
      info(client, "Sekarang kalian berteman!");
      notify(otherUid, "info", `${client.auth.name} menerima pertemananmu!`);
    } else {
      info(client, "Diterima! Menunggu persetujuan orang tua.");
    }
  });

  room.onMessage("teman-daftar", (client) => {
    const me = childId(client);
    if (!me) return client.send("teman-daftar", { friends: [], incoming: [], waiting: [], onlyKids: true });
    const d = friendsOf(me);
    d.friends = d.friends.map((f) => ({ ...f, online: isOnline(f.uid) }));
    client.send("teman-daftar", d);
  });

  // ----- undang teman ke meja dengan kode -----
  room.onMessage("undang", (client, { uid, game, code } = {}) => {
    const me = childId(client);
    const them = /^a\d+$/.test(uid || "") ? Number(uid.slice(1)) : null;
    if (!me || !them || !areFriends(me, them)) return info(client, "Hanya bisa mengundang teman.");
    if (!GAMES[game] || !/^[A-Z]{4}$/.test(code || "")) return;
    if (!isOnline(uid)) return info(client, "Temanmu sedang tidak di arena.");
    notify(uid, "undangan", { name: client.auth.name, game, gameName: GAMES[game], code });
    info(client, "Undangan terkirim!");
  });

  // ----- blokir & laporan -----
  room.onMessage("blokir", (client, { sessionId } = {}) => {
    const other = findClient(sessionId);
    if (!other || other === client) return;
    block(uidOf(client.auth), uidOf(other.auth));
    client.send("diblokir", sessionId);
    info(client, `${other.auth.name} diblokir. Kalian tidak akan melihat chat satu sama lain.`);
  });

  room.onMessage("lapor", (client, { sessionId, reason } = {}) => {
    const other = findClient(sessionId);
    if (!other || other === client) return;
    const reported = uidOf(other.auth);
    report(uidOf(client.auth), reported, REASONS[reason] ? reason : "lain", room.lastChats.get(reported) || []);
    info(client, "Terima kasih, laporanmu sudah dikirim. Kamu juga bisa memblokir pemain ini.");
  });
}

export function socialJoin(client) {
  registerOnline(uidOf(client.auth), client);
}

export function socialLeave(room, client) {
  unregisterOnline(uidOf(client.auth), client);
  room.chatTimes.delete(client.sessionId);
}

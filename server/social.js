// Fitur sosial: pengaturan chat, pertemanan (dengan persetujuan orang tua), blokir, dan laporan.
// Identitas pemain ("uid"): "a<id>" untuk anak, "o<id>" untuk orang tua.
import { db } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY,
    from_child INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    to_child INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    to_accept INTEGER NOT NULL DEFAULT 0,      -- anak yang diminta sudah menerima?
    from_parent_ok INTEGER NOT NULL DEFAULT 0, -- orang tua pengirim sudah setuju?
    to_parent_ok INTEGER NOT NULL DEFAULT 0,   -- orang tua penerima sudah setuju?
    created_at INTEGER NOT NULL,
    UNIQUE (from_child, to_child)
  );
  CREATE TABLE IF NOT EXISTS blocks (
    blocker TEXT NOT NULL,
    blocked TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (blocker, blocked)
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    reporter TEXT NOT NULL,
    reported TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence TEXT NOT NULL,                    -- JSON: pesan terakhir pemain yang dilaporkan
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reports_reported ON reports(reported, created_at);
`);
// Kolom baru di tabel anak (database lama ditingkatkan otomatis).
if (!db.prepare("PRAGMA table_info(children)").all().some((c) => c.name === "approve_friends")) {
  db.exec("ALTER TABLE children ADD COLUMN approve_friends INTEGER NOT NULL DEFAULT 1");
}

export const REASONS = {
  kasar: "Kata-kata kasar",
  ganggu: "Mengganggu / mengejek",
  pribadi: "Meminta data pribadi",
  lain: "Lainnya",
};
const MUTE_REPORTS = 3; // dilaporkan 3 pemain berbeda dalam 24 jam -> chat dibisukan
const DAY = 86400000;

export const uidOf = (p) => (p.role === "anak" ? `a${p.childId}` : `o${p.parentId}`);

export function nameOf(uid) {
  const id = Number(String(uid).slice(1));
  if (uid[0] === "a") return db.prepare("SELECT name FROM children WHERE id = ?").get(id)?.name || "?";
  if (uid[0] === "o") return db.prepare("SELECT name FROM parents WHERE id = ?").get(id)?.name || "?";
  return "?";
}

// "mati" | "siap" | "bebas". Orang tua boleh teks bebas; penerima tetap menyaring sesuai pengaturannya sendiri.
export function chatSetting(uid) {
  if (uid[0] === "o") return "bebas";
  const c = db.prepare("SELECT chat, jenjang FROM children WHERE id = ?").get(Number(uid.slice(1)));
  if (!c) return "mati";
  return c.chat === "bebas" && c.jenjang === "SD" ? "siap" : c.chat;
}

export function isMuted(uid, now = Date.now()) {
  const n = db.prepare("SELECT COUNT(DISTINCT reporter) AS n FROM reports WHERE reported = ? AND created_at > ?")
    .get(uid, now - DAY).n;
  return n >= MUTE_REPORTS;
}

// ---------- blokir ----------
export function block(blocker, blocked) {
  if (blocker === blocked) return;
  db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").run(blocker, blocked, Date.now());
  // Pertemanan otomatis putus bila salah satu memblokir.
  if (blocker[0] === "a" && blocked[0] === "a") {
    const a = Number(blocker.slice(1)), b = Number(blocked.slice(1));
    db.prepare("DELETE FROM friendships WHERE (from_child = ? AND to_child = ?) OR (from_child = ? AND to_child = ?)").run(a, b, b, a);
  }
}

export function unblock(blocker, blocked) {
  db.prepare("DELETE FROM blocks WHERE blocker = ? AND blocked = ?").run(blocker, blocked);
}

export function blockedEitherWay(a, b) {
  return !!db.prepare("SELECT 1 FROM blocks WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?)").get(a, b, b, a);
}

export function blocksOf(uid) {
  return db.prepare("SELECT blocked FROM blocks WHERE blocker = ? ORDER BY created_at DESC").all(uid)
    .map((r) => ({ uid: r.blocked, name: nameOf(r.blocked) }));
}

// ---------- laporan ----------
export function report(reporter, reported, reason, evidence) {
  if (reporter === reported) return { ok: false };
  if (!REASONS[reason]) reason = "lain";
  const recent = db.prepare("SELECT 1 FROM reports WHERE reporter = ? AND reported = ? AND created_at > ?")
    .get(reporter, reported, Date.now() - DAY);
  if (!recent) {
    db.prepare("INSERT INTO reports (reporter, reported, reason, evidence, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(reporter, reported, reason, JSON.stringify(evidence || []).slice(0, 4000), Date.now());
  }
  return { ok: true, muted: isMuted(reported) };
}

// ---------- pertemanan (hanya antar-anak) ----------
const approveNeeded = (childId) =>
  !!db.prepare("SELECT approve_friends FROM children WHERE id = ?").get(childId)?.approve_friends;

function pair(a, b) {
  return db.prepare("SELECT * FROM friendships WHERE (from_child = ? AND to_child = ?) OR (from_child = ? AND to_child = ?)").get(a, b, b, a);
}

export const isActive = (f) => !!(f && f.to_accept && f.from_parent_ok && f.to_parent_ok);

export function relation(meChild, otherChild) {
  const f = pair(meChild, otherChild);
  if (!f) return "none";
  if (isActive(f)) return "teman";
  if (f.to_child === meChild && !f.to_accept) return "diminta"; // dia meminta, saya belum menjawab
  return "menunggu";
}

export function requestFriend(fromChild, toChild) {
  if (fromChild === toChild) return { ok: false, reason: "Tidak bisa berteman dengan diri sendiri." };
  if (blockedEitherWay(`a${fromChild}`, `a${toChild}`)) return { ok: false, reason: "Tidak bisa mengirim permintaan." };
  const existing = pair(fromChild, toChild);
  if (existing) {
    // Dia sudah meminta lebih dulu: anggap sebagai menerima.
    if (existing.to_child === fromChild && !existing.to_accept) return answerFriend(fromChild, existing.id, true);
    return { ok: false, reason: isActive(existing) ? "Kalian sudah berteman." : "Permintaan sudah dikirim." };
  }
  const n = db.prepare("SELECT COUNT(*) AS n FROM friendships WHERE from_child = ? AND to_accept = 0").get(fromChild).n;
  if (n >= 20) return { ok: false, reason: "Terlalu banyak permintaan yang belum dijawab." };
  const r = db.prepare(`INSERT INTO friendships (from_child, to_child, to_accept, from_parent_ok, to_parent_ok, created_at)
                        VALUES (?, ?, 0, ?, ?, ?)`)
    .run(fromChild, toChild, approveNeeded(fromChild) ? 0 : 1, approveNeeded(toChild) ? 0 : 1, Date.now());
  return { ok: true, id: Number(r.lastInsertRowid) };
}

export function answerFriend(childId, id, accept) {
  const f = db.prepare("SELECT * FROM friendships WHERE id = ? AND to_child = ?").get(id, childId);
  if (!f) return { ok: false, reason: "Permintaan tidak ditemukan." };
  if (!accept) {
    db.prepare("DELETE FROM friendships WHERE id = ?").run(id);
    return { ok: true, active: false };
  }
  db.prepare("UPDATE friendships SET to_accept = 1 WHERE id = ?").run(id);
  const now = db.prepare("SELECT * FROM friendships WHERE id = ?").get(id);
  return { ok: true, active: isActive(now), waitingParents: !isActive(now), friendship: now };
}

// Daftar untuk satu anak: teman aktif, permintaan masuk, dan yang menunggu.
export function friendsOf(childId) {
  const rows = db.prepare("SELECT * FROM friendships WHERE from_child = ? OR to_child = ?").all(childId, childId);
  const friends = [], incoming = [], waiting = [];
  for (const f of rows) {
    const other = f.from_child === childId ? f.to_child : f.from_child;
    const o = db.prepare("SELECT name, jenjang FROM children WHERE id = ?").get(other);
    if (!o) continue;
    const item = { id: f.id, uid: `a${other}`, name: o.name, jenjang: o.jenjang };
    if (isActive(f)) friends.push(item);
    else if (f.to_child === childId && !f.to_accept) incoming.push(item);
    else waiting.push({ ...item, step: !f.to_accept ? "menunggu jawaban teman" : "menunggu persetujuan orang tua" });
  }
  return { friends, incoming, waiting };
}

export function areFriends(a, b) {
  return isActive(pair(a, b));
}

// ---------- untuk dashboard orang tua ----------
export function parentView(parentId) {
  const kids = db.prepare("SELECT id, name, approve_friends FROM children WHERE parent_id = ? ORDER BY id").all(parentId);
  return kids.map((k) => {
    const rows = db.prepare("SELECT * FROM friendships WHERE from_child = ? OR to_child = ?").all(k.id, k.id);
    const friends = [], approvals = [];
    for (const f of rows) {
      const mine = f.from_child === k.id ? "from" : "to";
      const other = mine === "from" ? f.to_child : f.from_child;
      const o = db.prepare("SELECT name, jenjang FROM children WHERE id = ?").get(other);
      if (!o) continue;
      const item = { id: f.id, name: o.name, jenjang: o.jenjang };
      if (isActive(f)) friends.push(item);
      else if (!(mine === "from" ? f.from_parent_ok : f.to_parent_ok)) {
        approvals.push({ ...item, direction: mine === "from" ? "keluar" : "masuk", childAccepted: !!f.to_accept });
      }
    }
    return { childId: k.id, approveFriends: !!k.approve_friends, friends, approvals, blocks: blocksOf(`a${k.id}`) };
  });
}

// Orang tua menyetujui/menolak/menghapus pertemanan salah satu anaknya.
export function parentDecide(parentId, friendshipId, approve) {
  const f = db.prepare("SELECT * FROM friendships WHERE id = ?").get(friendshipId);
  if (!f) return null;
  const owner = (cid) => db.prepare("SELECT parent_id FROM children WHERE id = ?").get(cid)?.parent_id;
  const side = owner(f.from_child) === parentId ? "from" : owner(f.to_child) === parentId ? "to" : null;
  if (!side) return null;
  if (!approve) {
    db.prepare("DELETE FROM friendships WHERE id = ?").run(f.id);
    return { removed: true, f };
  }
  db.prepare(`UPDATE friendships SET ${side}_parent_ok = 1 WHERE id = ?`).run(f.id);
  const now = db.prepare("SELECT * FROM friendships WHERE id = ?").get(f.id);
  return { removed: false, active: isActive(now), f: now };
}

// ---------- notifikasi ke pemain yang sedang di arena ----------
const online = new Map(); // uid -> Set(client)
export function registerOnline(uid, client) {
  if (!online.has(uid)) online.set(uid, new Set());
  online.get(uid).add(client);
}
export function unregisterOnline(uid, client) {
  const s = online.get(uid);
  if (!s) return;
  s.delete(client);
  if (!s.size) online.delete(uid);
}
export const isOnline = (uid) => online.has(uid);
export function notify(uid, type, payload) {
  for (const c of online.get(uid) || []) c.send(type, payload);
}

// Hapus semua jejak sosial seorang pemain (saat akun dihapus).
export function purgeUid(uid) {
  db.prepare("DELETE FROM blocks WHERE blocker = ? OR blocked = ?").run(uid, uid);
  db.prepare("DELETE FROM reports WHERE reporter = ? OR reported = ?").run(uid, uid);
}

// Keluarkan pemain dari arena (misalnya akunnya baru dihapus orang tua).
export function kick(uid) {
  for (const c of online.get(uid) || []) {
    c.send("info", "Akun ini sudah dihapus oleh orang tua.");
    c.leave(4001);
  }
}

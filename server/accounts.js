// Akun orang tua dan anak: pendaftaran, masuk, sesi, PIN anak, kode masuk, tiket game,
// batas waktu bermain, hasil permainan, dan laporan untuk orang tua.
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { db, today, lastDays } from "./db.js";
import { avatarOr, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";
import { parentView, parentDecide, unblock, purgeUid, notify, kick } from "./social.js";

const DAY = 86400000;
const SESSION_MS = 30 * DAY;
const JENJANG = ["SD", "SMP", "SMA"];
const WARNA = /^#[0-9a-fA-F]{6}$/;
const CHAT = ["mati", "siap", "bebas"];
const GAMES = ["catur", "scramble", "kartu"];

// ---------- kata sandi dan token ----------
export function hashSecret(secret) {
  const salt = randomBytes(16);
  const key = scryptSync(String(secret), salt, 32);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function checkSecret(secret, stored) {
  const [saltHex, keyHex] = String(stored).split(":");
  if (!saltHex || !keyHex) return false;
  const key = scryptSync(String(secret), Buffer.from(saltHex, "hex"), 32);
  const want = Buffer.from(keyHex, "hex");
  return want.length === key.length && timingSafeEqual(want, key);
}

const sha = (s) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- pembatas percobaan (mencegah tebak kata sandi) ----------
const attempts = new Map(); // key -> { n, until }
function limited(key, max = 5, windowMs = 15 * 60000) {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.n >= max) throw new ApiError(429, "Terlalu banyak percobaan. Coba lagi 15 menit lagi.");
  return {
    fail() {
      const cur = attempts.get(key);
      if (!cur || cur.until <= now) attempts.set(key, { n: 1, until: now + windowMs });
      else cur.n += 1;
    },
    ok() { attempts.delete(key); },
  };
}

// ---------- sesi ----------
function createSession(role, parentId, childId = null) {
  const token = newToken();
  db.prepare("INSERT INTO sessions (token_hash, role, parent_id, child_id, expires_at) VALUES (?, ?, ?, ?, ?)")
    .run(sha(token), role, parentId, childId, Date.now() + SESSION_MS);
  return token;
}

export function sessionFromToken(token) {
  if (!token) return null;
  const s = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(sha(token));
  if (!s) return null;
  if (s.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(s.token_hash);
    return null;
  }
  return s;
}

function endSession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
}

// ---------- data publik ----------
function childRow(id) {
  return db.prepare("SELECT * FROM children WHERE id = ?").get(id);
}

export function secondsToday(childId, now = Date.now()) {
  const r = db.prepare("SELECT seconds FROM play_time WHERE child_id = ? AND day = ?").get(childId, today(now));
  return r ? r.seconds : 0;
}

export function addPlaySeconds(childId, seconds, now = Date.now()) {
  if (seconds <= 0 || !childRow(childId)) return; // akun bisa saja baru dihapus
  db.prepare(`INSERT INTO play_time (child_id, day, seconds) VALUES (?, ?, ?)
              ON CONFLICT(child_id, day) DO UPDATE SET seconds = seconds + excluded.seconds`)
    .run(childId, today(now), Math.round(seconds));
}

function publicChild(c) {
  return {
    id: c.id, name: c.name, jenjang: c.jenjang, color: c.color, avatar: avatarOr(c.avatar),
    limitMin: c.limit_min, allowStrangers: !!c.allow_strangers, chat: c.chat, approveFriends: !!c.approve_friends,
    usedMin: Math.floor(secondsToday(c.id) / 60),
  };
}

// Identitas pemain yang dipakai ruang game (dari tiket).
export function playerFromSession(s) {
  if (!s) return null;
  if (s.role === "anak") {
    const c = childRow(s.child_id);
    if (!c) return null;
    return {
      role: "anak", childId: c.id, parentId: c.parent_id, name: c.name, jenjang: c.jenjang, color: c.color, avatar: avatarOr(c.avatar),
      limitMin: c.limit_min, allowStrangers: !!c.allow_strangers,
    };
  }
  const p = db.prepare("SELECT * FROM parents WHERE id = ?").get(s.parent_id);
  if (!p) return null;
  return { role: "ortu", parentId: p.id, name: p.name, jenjang: "Ortu", color: "#5b6b7c", avatar: avatarOr(p.avatar, DEFAULT_ORTU_AVATAR), limitMin: 0, allowStrangers: false };
}

// ---------- tiket untuk masuk ruang game ----------
// Tiket berumur pendek; browser mengambilnya lewat /api/tiket lalu mengirimnya saat bergabung ke ruang.
const tickets = new Map(); // ticket -> { tokenHash, expires }
export function issueTicket(sessionToken) {
  const t = newToken();
  tickets.set(t, { tokenHash: sha(sessionToken), expires: Date.now() + 2 * 60000 });
  return t;
}

export function playerFromTicket(ticket) {
  const t = tickets.get(String(ticket || ""));
  if (!t || t.expires < Date.now()) return null;
  const s = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(t.tokenHash);
  if (!s || s.expires_at < Date.now()) return null;
  return playerFromSession(s);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tickets) if (v.expires < now) tickets.delete(k);
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM login_codes WHERE expires_at < ?").run(now);
}, 60000).unref();

// ---------- validasi ----------
const str = (v, max) => String(v ?? "").trim().slice(0, max);
function validChildFields(b, partial) {
  const out = {};
  if (!partial || b.name !== undefined) {
    out.name = str(b.name, 16);
    if (!out.name) throw new ApiError(400, "Isi nama panggilan anak.");
  }
  if (!partial || b.jenjang !== undefined) {
    if (!JENJANG.includes(b.jenjang)) throw new ApiError(400, "Pilih jenjang SD, SMP, atau SMA.");
    out.jenjang = b.jenjang;
  }
  if (!partial || b.color !== undefined) out.color = WARNA.test(b.color || "") ? b.color : "#4f9cf0";
  if (!partial || b.avatar !== undefined) out.avatar = avatarOr(b.avatar);
  if (!partial || b.pin !== undefined) {
    if (!/^\d{4}$/.test(String(b.pin ?? ""))) throw new ApiError(400, "PIN harus 4 angka.");
    out.pin_hash = hashSecret(b.pin);
  }
  if (b.limitMin !== undefined) {
    const m = Number(b.limitMin);
    if (!Number.isInteger(m) || m < 0 || m > 600) throw new ApiError(400, "Batas waktu harus 0–600 menit.");
    out.limit_min = m;
  }
  if (b.allowStrangers !== undefined) out.allow_strangers = b.allowStrangers ? 1 : 0;
  if (b.approveFriends !== undefined) out.approve_friends = b.approveFriends ? 1 : 0;
  if (b.chat !== undefined) {
    if (!CHAT.includes(b.chat)) throw new ApiError(400, "Pilihan chat tidak dikenal.");
    out.chat = b.chat;
  }
  return out;
}

function ownChild(parentId, childId) {
  const c = childRow(Number(childId));
  if (!c || c.parent_id !== parentId) throw new ApiError(404, "Akun anak tidak ditemukan.");
  return c;
}

// ---------- HTTP ----------
const COOKIE = { ortu: "bp_ortu", anak: "bp_anak" };

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookie(name, value, maxAgeSec) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 20000) throw new ApiError(413, "Data terlalu besar.");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Format data salah."); }
}

function report(parentId) {
  const kids = db.prepare("SELECT * FROM children WHERE parent_id = ? ORDER BY id").all(parentId);
  const days = lastDays(7);
  return kids.map((c) => {
    const time = db.prepare(`SELECT day, seconds FROM play_time WHERE child_id = ? AND day >= ?`).all(c.id, days[0]);
    const byDay = Object.fromEntries(time.map((r) => [r.day, r.seconds]));
    const stats = {};
    for (const g of GAMES) {
      const rows = db.prepare(`SELECT outcome, COUNT(*) AS n FROM results WHERE child_id = ? AND game = ? GROUP BY outcome`).all(c.id, g);
      const s = { main: 0, menang: 0, kalah: 0, seri: 0 };
      for (const r of rows) { s[r.outcome] = r.n; s.main += r.n; }
      stats[g] = s;
    }
    const recent = db.prepare(`SELECT game, mode, outcome, score, created_at AS at FROM results WHERE child_id = ? ORDER BY created_at DESC LIMIT 10`).all(c.id);
    return { ...publicChild(c), week: days.map((d) => ({ day: d, minutes: Math.floor((byDay[d] || 0) / 60) })), stats, recent };
  });
}

// Mengembalikan true bila permintaan ditangani (jalur /api/...).
export async function handleApi(req, res) {
  const url = new URL(req.url, "http://x");
  if (!url.pathname.startsWith("/api/")) return false;
  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
    res.end(JSON.stringify(body));
  };
  try {
    // Hanya terima permintaan dari halaman sendiri (perlindungan CSRF sederhana).
    if (req.method !== "GET" && req.headers["x-bimbel"] !== "1") throw new ApiError(403, "Permintaan ditolak.");
    const cookies = parseCookies(req);
    const ortu = sessionFromToken(cookies[COOKIE.ortu]);
    const anak = sessionFromToken(cookies[COOKIE.anak]);
    const ip = req.socket.remoteAddress || "?";
    const path = url.pathname.slice(5).split("/").filter(Boolean); // tanpa "/api/"
    const m = req.method;
    const body = m === "GET" ? {} : await readJson(req);
    const needOrtu = () => { if (!ortu) throw new ApiError(401, "Silakan masuk sebagai orang tua."); return ortu.parent_id; };

    // --- orang tua ---
    if (m === "POST" && path[0] === "daftar") {
      const email = str(body.email, 120).toLowerCase();
      const name = str(body.name, 40);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Alamat email tidak valid.");
      if (!name) throw new ApiError(400, "Isi nama orang tua.");
      if (String(body.password || "").length < 8) throw new ApiError(400, "Kata sandi minimal 8 karakter.");
      if (body.consent !== true) throw new ApiError(400, "Persetujuan orang tua diperlukan untuk membuat akun.");
      if (db.prepare("SELECT 1 FROM parents WHERE email = ?").get(email)) throw new ApiError(409, "Email ini sudah terdaftar. Silakan masuk.");
      const now = Date.now();
      const r = db.prepare("INSERT INTO parents (email, pass_hash, name, consent_at, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(email, hashSecret(body.password), name, now, now);
      const token = createSession("ortu", Number(r.lastInsertRowid));
      return send(200, { ok: true }, { "Set-Cookie": cookie(COOKIE.ortu, token, SESSION_MS / 1000) }), true;
    }
    if (m === "POST" && path[0] === "masuk") {
      const email = str(body.email, 120).toLowerCase();
      const lim = limited(`masuk:${ip}:${email}`);
      const p = db.prepare("SELECT * FROM parents WHERE email = ?").get(email);
      if (!p || !checkSecret(body.password || "", p.pass_hash)) { lim.fail(); throw new ApiError(401, "Email atau kata sandi salah."); }
      lim.ok();
      const token = createSession("ortu", p.id);
      return send(200, { ok: true }, { "Set-Cookie": cookie(COOKIE.ortu, token, SESSION_MS / 1000) }), true;
    }
    if (m === "POST" && path[0] === "keluar") {
      endSession(cookies[COOKIE.ortu]);
      endSession(cookies[COOKIE.anak]);
      return send(200, { ok: true }, { "Set-Cookie": [cookie(COOKIE.ortu, "", 0), cookie(COOKIE.anak, "", 0)] }), true;
    }
    if (m === "GET" && path[0] === "saya") {
      const out = { ortu: null, anak: null, children: [] };
      if (ortu) {
        const p = db.prepare("SELECT id, name, email, avatar FROM parents WHERE id = ?").get(ortu.parent_id);
        out.ortu = p ? { name: p.name, email: p.email, avatar: avatarOr(p.avatar, DEFAULT_ORTU_AVATAR) } : null;
        out.children = db.prepare("SELECT * FROM children WHERE parent_id = ? ORDER BY id").all(ortu.parent_id).map(publicChild);
      }
      if (anak) {
        const c = childRow(anak.child_id);
        if (c) out.anak = publicChild(c);
      }
      return send(200, out), true;
    }
    // Ganti avatar sendiri: anak yang sedang masuk, atau orang tua (sebagai=ortu).
    if (m === "POST" && path[0] === "avatar") {
      const avatar = avatarOr(body.avatar, "");
      if (!avatar) throw new ApiError(400, "Avatar tidak dikenal.");
      if (body.sebagai === "ortu") db.prepare("UPDATE parents SET avatar = ? WHERE id = ?").run(avatar, needOrtu());
      else if (anak) db.prepare("UPDATE children SET avatar = ? WHERE id = ?").run(avatar, anak.child_id);
      else throw new ApiError(401, "Silakan masuk dulu.");
      return send(200, { ok: true, avatar }), true;
    }
    if (m === "GET" && path[0] === "laporan") {
      return send(200, { children: report(needOrtu()) }), true;
    }
    if (m === "DELETE" && path[0] === "akun") {
      const pid = needOrtu();
      const p = db.prepare("SELECT * FROM parents WHERE id = ?").get(pid);
      if (!checkSecret(body.password || "", p.pass_hash)) throw new ApiError(401, "Kata sandi salah.");
      const kids = db.prepare("SELECT id FROM children WHERE parent_id = ?").all(pid);
      for (const k of kids) purgeUid(`a${k.id}`);
      purgeUid(`o${pid}`);
      db.prepare("DELETE FROM parents WHERE id = ?").run(pid);
      for (const k of kids) kick(`a${k.id}`);
      kick(`o${pid}`); // anak, sesi, hasil, pertemanan ikut terhapus (CASCADE)
      return send(200, { ok: true }, { "Set-Cookie": [cookie(COOKIE.ortu, "", 0), cookie(COOKIE.anak, "", 0)] }), true;
    }

    // --- pertemanan & blokir (dikelola orang tua) ---
    if (m === "GET" && path[0] === "teman") {
      return send(200, { children: parentView(needOrtu()) }), true;
    }
    if (m === "POST" && path[0] === "teman" && (path[2] === "setujui" || path[2] === "tolak")) {
      const r = parentDecide(needOrtu(), Number(path[1]), path[2] === "setujui");
      if (!r) throw new ApiError(404, "Permintaan pertemanan tidak ditemukan.");
      if (r.active) {
        const n = (id) => db.prepare("SELECT name FROM children WHERE id = ?").get(id)?.name;
        notify(`a${r.f.from_child}`, "info", `Kamu dan ${n(r.f.to_child)} sekarang berteman!`);
        notify(`a${r.f.to_child}`, "info", `Kamu dan ${n(r.f.from_child)} sekarang berteman!`);
      }
      return send(200, { ok: true, active: !!r.active }), true;
    }
    if (m === "DELETE" && path[0] === "teman" && path[1]) {
      const r = parentDecide(needOrtu(), Number(path[1]), false);
      if (!r) throw new ApiError(404, "Pertemanan tidak ditemukan.");
      return send(200, { ok: true }), true;
    }
    if (m === "DELETE" && path[0] === "blokir") {
      const c = ownChild(needOrtu(), body.childId);
      unblock(`a${c.id}`, String(body.uid || ""));
      return send(200, { ok: true }), true;
    }

    // --- akun anak (dikelola orang tua) ---
    if (path[0] === "anak" && path.length === 1 && m === "POST") {
      const pid = needOrtu();
      const n = db.prepare("SELECT COUNT(*) AS n FROM children WHERE parent_id = ?").get(pid).n;
      if (n >= 6) throw new ApiError(400, "Maksimal 6 akun anak.");
      const f = validChildFields(body, false);
      const r = db.prepare(`INSERT INTO children (parent_id, name, jenjang, color, avatar, pin_hash, limit_min, allow_strangers, chat, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(pid, f.name, f.jenjang, f.color, f.avatar, f.pin_hash, f.limit_min ?? 60, f.allow_strangers ?? 0, f.chat ?? "mati", Date.now());
      return send(200, { child: publicChild(childRow(Number(r.lastInsertRowid))) }), true;
    }
    if (path[0] === "anak" && path.length === 2 && path[1] === "keluar" && m === "POST") {
      endSession(cookies[COOKIE.anak]);
      return send(200, { ok: true }, { "Set-Cookie": cookie(COOKIE.anak, "", 0) }), true;
    }
    if (path[0] === "anak" && path.length >= 2) {
      const pid = needOrtu();
      const c = ownChild(pid, path[1]);
      if (path.length === 2 && m === "PATCH") {
        const f = validChildFields(body, true);
        const keys = Object.keys(f);
        if (keys.length) {
          if (f.pin_hash) { f.pin_fail = 0; f.pin_lock_until = 0; keys.push("pin_fail", "pin_lock_until"); }
          db.prepare(`UPDATE children SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).run(...keys.map((k) => f[k]), c.id);
        }
        return send(200, { child: publicChild(childRow(c.id)) }), true;
      }
      if (path.length === 2 && m === "DELETE") {
        purgeUid(`a${c.id}`);
        db.prepare("DELETE FROM children WHERE id = ?").run(c.id);
        kick(`a${c.id}`);
        return send(200, { ok: true }), true;
      }
      if (path[2] === "kode" && m === "POST") {
        const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code;
        do { code = Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join(""); }
        while (db.prepare("SELECT 1 FROM login_codes WHERE code = ?").get(code));
        const expiresAt = Date.now() + 15 * 60000;
        db.prepare("DELETE FROM login_codes WHERE child_id = ?").run(c.id);
        db.prepare("INSERT INTO login_codes (code, child_id, expires_at) VALUES (?, ?, ?)").run(code, c.id, expiresAt);
        return send(200, { code, expiresAt }), true;
      }
      if (path[2] === "masuk" && m === "POST") {
        // Anak masuk di perangkat keluarga (orang tua sudah masuk) dengan PIN.
        const now = Date.now();
        if (c.pin_lock_until > now) throw new ApiError(429, "PIN dikunci sementara. Coba lagi 15 menit lagi.");
        if (!checkSecret(String(body.pin ?? ""), c.pin_hash)) {
          const fails = c.pin_fail + 1;
          db.prepare("UPDATE children SET pin_fail = ?, pin_lock_until = ? WHERE id = ?")
            .run(fails >= 5 ? 0 : fails, fails >= 5 ? now + 15 * 60000 : 0, c.id);
          throw new ApiError(401, fails >= 5 ? "PIN salah 5 kali. Dikunci 15 menit." : "PIN salah.");
        }
        db.prepare("UPDATE children SET pin_fail = 0 WHERE id = ?").run(c.id);
        endSession(cookies[COOKIE.anak]);
        const token = createSession("anak", pid, c.id);
        return send(200, { child: publicChild(c) }, { "Set-Cookie": cookie(COOKIE.anak, token, SESSION_MS / 1000) }), true;
      }
    }

    // --- anak masuk di perangkatnya sendiri dengan kode dari orang tua ---
    if (m === "POST" && path[0] === "kode") {
      const lim = limited(`kode:${ip}`, 10);
      const code = str(body.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const row = db.prepare("SELECT * FROM login_codes WHERE code = ?").get(code);
      if (!row || row.expires_at < Date.now()) { lim.fail(); throw new ApiError(401, "Kode masuk salah atau sudah kedaluwarsa."); }
      lim.ok();
      db.prepare("DELETE FROM login_codes WHERE code = ?").run(code); // sekali pakai
      const c = childRow(row.child_id);
      endSession(cookies[COOKIE.anak]);
      const token = createSession("anak", c.parent_id, c.id);
      return send(200, { child: publicChild(c) }, { "Set-Cookie": cookie(COOKIE.anak, token, SESSION_MS / 1000) }), true;
    }

    // --- tiket game ---
    if (m === "GET" && path[0] === "tiket") {
      const as = url.searchParams.get("sebagai") === "ortu" ? "ortu" : "anak";
      const token = cookies[COOKIE[as]];
      const s = as === "ortu" ? ortu : anak;
      if (!s) throw new ApiError(401, "Belum masuk.");
      const player = playerFromSession(s);
      if (player?.role === "anak" && player.limitMin > 0 && secondsToday(player.childId) >= player.limitMin * 60) {
        throw new ApiError(403, "Waktu bermain hari ini sudah habis. Sampai jumpa besok!");
      }
      return send(200, { ticket: issueTicket(token), player }), true;
    }

    // --- hasil permainan (dikirim game saat permainan selesai) ---
    if (m === "POST" && path[0] === "hasil") {
      if (!anak) return send(200, { ok: true, skipped: true }), true; // orang tua/tamu: tidak dicatat
      const game = GAMES.includes(body.game) ? body.game : null;
      const mode = body.mode === "online" ? "online" : "bot";
      const outcome = ["menang", "kalah", "seri"].includes(body.outcome) ? body.outcome : null;
      if (!game || !outcome) throw new ApiError(400, "Data hasil tidak lengkap.");
      const score = Math.max(0, Math.min(10000, Math.round(Number(body.score) || 0)));
      db.prepare("INSERT INTO results (child_id, game, mode, outcome, score, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(anak.child_id, game, mode, outcome, score, Date.now());
      return send(200, { ok: true }), true;
    }

    throw new ApiError(404, "Alamat tidak ditemukan.");
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    if (status === 500) console.error(e);
    send(status, { error: status === 500 ? "Terjadi kesalahan di server." : e.message });
    return true;
  }
}

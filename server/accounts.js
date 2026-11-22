// Akun orang tua dan anak: pendaftaran, masuk, sesi, sandi anak, tiket game,
// batas waktu bermain, hasil permainan, dan laporan untuk orang tua.
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { db, today, lastDays } from "./db.js";
import { avatarOr, AVATAR_AWAL_ANAK, AVATAR_AWAL_ORTU, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";
import { avatarSvg } from "../shared/avatar-svg.js";
import { rapikanAksesori, aksesoriById } from "../shared/aksesori.js";
import { levelDariXp, auraDipakai } from "../shared/aura.js";

const auraAnak = (c) => auraDipakai(levelDariXp(c.xp), c.aura_pakai);
import { avatarDimiliki, handleToko, simpanAvatarAwal } from "./toko.js";
import { kamarku } from "./kamarku.js";
import { handleProgres, ringkasBelajar } from "./progres.js";
import { handleTanggapanBelajar } from "./tanggapan-belajar.js";
import { handleTugas } from "./tugas.js";
import { handleChat, MAKS_BODY_SUARA } from "./chat.js";
import { handleKeuangan } from "./keuangan.js";
import { handleHadiah } from "./hadiah.js";
import { handleTokoOrtu, avatarOrtuDimiliki, aksesoriOrtuDimiliki } from "./toko-ortu.js";
import { handleKantor } from "./kantor.js";
import { tanyaMentor } from "./mentor.js";
import { negaraOr, isNegara, jenjangDariKelas } from "../shared/negara.js";
import { parentView, parentDecide, unblock, purgeUid, notify, kick } from "./social.js";
import { sendMail, APP_URL } from "./mailer.js";

const DAY = 86400000;
const SESSION_MS = 30 * DAY;
const JENJANG = ["SD", "SMP", "SMA"];
const WARNA = /^#[0-9a-fA-F]{6}$/;
const CHAT = ["mati", "siap", "bebas"];
const KURIKULUM = ["merdeka", "cam", "sgp"];   // Ruang Pintar: Merdeka, Cambridge, Singapore
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
const sandiAnakCadangan = hashSecret(randomBytes(32).toString("hex"));
const loginAnak = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const POLA_LOGIN_ANAK = /^[a-z0-9_.-]{3,24}$/;

function kredensialAnak(body, childId = null) {
  const login = loginAnak(body.loginAnak);
  if (!POLA_LOGIN_ANAK.test(login)) throw new ApiError(400, "Nama pengguna harus 3–24 huruf Latin, angka, titik, garis bawah, atau tanda hubung.");
  if (typeof body.sandiAnak !== "string" || body.sandiAnak.length < 8 || body.sandiAnak.length > 128) {
    throw new ApiError(400, "Kata sandi anak harus 8–128 karakter.");
  }
  const ada = db.prepare("SELECT id FROM children WHERE login_anak = ?").get(login);
  if (ada && ada.id !== childId) throw new ApiError(409, "Nama pengguna sudah dipakai. Pilih nama lain.");
  return [login, hashSecret(body.sandiAnak)];
}

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
    avatarPunya: avatarDimiliki(c), loginAnak: c.login_anak,
    negara: negaraOr(c.negara), kelas: c.kelas || 0, kurikulum: KURIKULUM.includes(c.kurikulum) ? c.kurikulum : "merdeka",
    aksesori: rapikanAksesori(c.aksesori_pakai).join(","), level: levelDariXp(c.xp), aura: auraAnak(c),
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
      negara: negaraOr(c.negara), kelas: c.kelas || 0, kurikulum: KURIKULUM.includes(c.kurikulum) ? c.kurikulum : "merdeka",
      aksesori: rapikanAksesori(c.aksesori_pakai).join(","), aura: auraAnak(c),
      limitMin: c.limit_min, allowStrangers: !!c.allow_strangers,
    };
  }
  const p = db.prepare("SELECT * FROM parents WHERE id = ?").get(s.parent_id);
  if (!p) return null;
  return { role: "ortu", parentId: p.id, name: p.name, jenjang: "Ortu", color: "#5b6b7c", avatar: avatarOr(p.avatar, DEFAULT_ORTU_AVATAR), aksesori: rapikanAksesori(p.aksesori_pakai).join(","), limitMin: 0, allowStrangers: false };
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
  db.prepare("DELETE FROM password_resets WHERE expires_at < ?").run(now);
}, 60000).unref();

const RESET_MS = 30 * 60000;
// Buat token atur ulang kata sandi lalu kirim tautannya ke email orang tua.
// Token ditaruh di bagian # alamat, sehingga tidak ikut terkirim ke server atau tercatat di log.
function sendResetLink(p) {
  db.prepare("DELETE FROM password_resets WHERE parent_id = ?").run(p.id); // tautan lama tidak berlaku lagi
  const token = newToken();
  db.prepare("INSERT INTO password_resets (token_hash, parent_id, expires_at) VALUES (?, ?, ?)")
    .run(sha(token), p.id, Date.now() + RESET_MS);
  const link = `${APP_URL}/orangtua.html#atur=${token}`;
  sendMail({
    to: p.email,
    subject: "Atur ulang kata sandi Bimbel Pro",
    text: `Halo ${p.name},\n\nKami menerima permintaan untuk mengatur ulang kata sandi akun orang tua Bimbel Pro.\n` +
      `Buka tautan ini dalam 30 menit untuk membuat kata sandi baru:\n\n${link}\n\n` +
      `Tautan hanya bisa dipakai sekali. Bila Anda tidak meminta ini, abaikan email ini; kata sandi Anda tidak berubah.`,
  }).catch((e) => console.error("Lupa kata sandi:", e.message));
}

// ---------- validasi ----------
const str = (v, max) => String(v ?? "").trim().slice(0, max);
function validChildFields(b, partial) {
  const out = {};
  if (!partial || b.name !== undefined) {
    out.name = str(b.name, 16);
    if (!out.name) throw new ApiError(400, "Isi nama panggilan anak.");
  }
  // Kelas 1–12 (jenjang ikut dari kelas). Jenjang saja masih diterima dari tampilan lama.
  if (b.kelas !== undefined) {
    const k = Number(b.kelas);
    if (!Number.isInteger(k) || k < 1 || k > 12) throw new ApiError(400, "Pilih kelas 1 sampai 12.");
    out.kelas = k;
    out.jenjang = jenjangDariKelas(k);
  } else if (!partial || b.jenjang !== undefined) {
    if (!JENJANG.includes(b.jenjang)) throw new ApiError(400, "Pilih kelas anak.");
    out.jenjang = b.jenjang;
  }
  if (!partial || b.kurikulum !== undefined) {
    if (b.kurikulum !== undefined && !KURIKULUM.includes(b.kurikulum)) throw new ApiError(400, "Kurikulum tidak dikenal.");
    out.kurikulum = b.kurikulum ?? "merdeka";
  }
  if (!partial || b.negara !== undefined) {
    if (b.negara !== undefined && !isNegara(b.negara)) throw new ApiError(400, "Negara tidak dikenal.");
    out.negara = negaraOr(b.negara);
  }
  if (!partial || b.color !== undefined) out.color = WARNA.test(b.color || "") ? b.color : "#4f9cf0";
  if (!partial || b.avatar !== undefined) out.avatar = avatarOr(b.avatar);
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

// ---------- keluarga ----------
// Data anak, tugas, hadiah, dan keuangan dimiliki kepala keluarga. Orang tua kedua (kepala_id terisi)
// memakai id kepala keluarga untuk semua itu, dan punya hak yang sama (keputusan pengguna).
// Hanya kepala keluarga yang bisa mengeluarkan orang tua kedua dan menghapus seluruh keluarga.
const PERAN = { ayah: "Ayah", ibu: "Ibu" };
const AVATAR_PERAN = { ayah: "manusia-ayah", ibu: "manusia-ibu" };
export function idKeluarga(parentId) {
  const p = db.prepare("SELECT id, kepala_id FROM parents WHERE id = ?").get(parentId);
  return p ? (p.kepala_id || p.id) : null;
}
function anggotaKeluarga(kepalaId) {
  return db.prepare("SELECT id, name, email, peran, kepala_id FROM parents WHERE id = ? OR kepala_id = ? ORDER BY kepala_id IS NOT NULL, id").all(kepalaId, kepalaId);
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

// COOKIE_SECURE=1 saat di-hosting lewat HTTPS, supaya cookie sesi hanya dikirim lewat koneksi aman.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "1" ? "; Secure" : "";

function cookie(name, value, maxAgeSec) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${COOKIE_SECURE}`;
}

// Lewat Cloudflare Tunnel semua permintaan datang dari 127.0.0.1, jadi batas percobaan per-IP
// akan dipakai bersama semua tester. Kalau TRUST_PROXY=1, pakai IP asli dari header Cloudflare,
// tapi hanya untuk koneksi dari mesin ini sendiri (tunnel), supaya header tidak bisa dipalsukan dari luar.
function clientIp(req) {
  const raw = req.socket.remoteAddress || "?";
  const lokal = raw === "127.0.0.1" || raw === "::1" || raw === "::ffff:127.0.0.1";
  if (process.env.TRUST_PROXY === "1" && lokal) {
    const cf = String(req.headers["cf-connecting-ip"] || "").trim();
    if (cf) return cf;
  }
  return raw;
}

async function readJson(req, maks = 20000) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > maks) throw new ApiError(413, "Data terlalu besar.");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Format data salah."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Format data salah.");
  }
  return body;
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
    return { ...publicChild(c), week: days.map((d) => ({ day: d, minutes: Math.floor((byDay[d] || 0) / 60) })), stats, recent, belajar: ringkasBelajar(c.id) };
  });
}

// avatarOrtuDimiliki ada di toko-ortu.js (ikut menghitung avatar yang dibeli di Toko Avatar orang tua).

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
    const sesiOrtu = sessionFromToken(cookies[COOKIE.ortu]);
    const sesiAnak = sessionFromToken(cookies[COOKIE.anak]);
    const ortu = sesiOrtu?.role === "ortu" ? sesiOrtu : null;
    const anak = sesiAnak?.role === "anak" ? sesiAnak : null;
    const ip = clientIp(req);
    const path = url.pathname.slice(5).split("/").filter(Boolean); // tanpa "/api/"
    const m = req.method;
    // Kemajuan Ruang Pintar boleh lebih besar (daftar topik dan riwayat).
    const maksBody = path[0] === "progres" ? 300000
      : path[0] === "chat" && path[1] === "keluarga" && path.length === 2 ? MAKS_BODY_SUARA : 20000;
    const body = m === "GET" ? {} : await readJson(req, maksBody);
    if (m === "POST" && url.pathname === "/api/mentor/tanya") {
      send(200, await tanyaMentor(body, ApiError));
      return true;
    }
    // ortuSaya = akun orang tua yang sedang masuk; keluargaId = kepala keluarga (pemilik data anak).
    const ortuSaya = ortu?.parent_id ?? null;
    const keluargaId = ortuSaya ? idKeluarga(ortuSaya) : null;
    const needOrtu = () => { if (!ortu || !keluargaId) throw new ApiError(401, "Silakan masuk sebagai orang tua."); return keluargaId; };
    const needOrtuSaya = () => { needOrtu(); return ortuSaya; };

    // --- orang tua ---
    if (m === "POST" && path[0] === "daftar") {
      const email = str(body.email, 120).toLowerCase();
      const name = str(body.name, 40);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Alamat email tidak valid.");
      if (!name) throw new ApiError(400, "Isi nama orang tua.");
      if (String(body.password || "").length < 8) throw new ApiError(400, "Kata sandi minimal 8 karakter.");
      if (body.consent !== true) throw new ApiError(400, "Persetujuan orang tua diperlukan untuk membuat akun.");
      if (db.prepare("SELECT 1 FROM parents WHERE email = ?").get(email)) throw new ApiError(409, "Email ini sudah terdaftar. Silakan masuk.");
      // Pendaftar memilih perannya (Ayah atau Ibu); avatar awalnya mengikuti peran.
      const peran = PERAN[body.peran] ? body.peran : null;
      if (!peran) throw new ApiError(400, "Pilih dulu: Ayah atau Ibu.");
      const now = Date.now();
      const r = db.prepare("INSERT INTO parents (email, pass_hash, name, consent_at, created_at, avatar, peran, kepala_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(email, hashSecret(body.password), name, now, now, AVATAR_PERAN[peran], peran, null);
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
    // Lupa kata sandi: jawabannya selalu sama, supaya tidak bisa dipakai untuk menebak email mana yang terdaftar.
    if (m === "POST" && path[0] === "lupa-sandi") {
      const email = str(body.email, 120).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Alamat email tidak valid.");
      const perIp = limited(`lupa:${ip}`, 5);
      const perEmail = limited(`lupa-email:${email}`, 3); // mencegah kotak masuk seseorang dibanjiri email
      perIp.fail();
      perEmail.fail();
      const p = db.prepare("SELECT id, email, name FROM parents WHERE email = ?").get(email);
      if (p) sendResetLink(p);
      return send(200, { ok: true }), true;
    }
    if (m === "POST" && path[0] === "atur-sandi") {
      const lim = limited(`atur:${ip}`);
      const password = String(body.password || "");
      if (password.length < 8) throw new ApiError(400, "Kata sandi minimal 8 karakter.");
      const row = db.prepare("SELECT * FROM password_resets WHERE token_hash = ?").get(sha(String(body.token || "")));
      if (!row || row.expires_at < Date.now()) {
        lim.fail();
        throw new ApiError(400, "Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru lewat \"Lupa kata sandi?\".");
      }
      lim.ok();
      db.prepare("UPDATE parents SET pass_hash = ? WHERE id = ?").run(hashSecret(password), row.parent_id);
      db.prepare("DELETE FROM password_resets WHERE parent_id = ?").run(row.parent_id);
      // Keluarkan semua sesi orang tua di perangkat lain (sesi anak tetap berjalan).
      db.prepare("DELETE FROM sessions WHERE parent_id = ? AND role = 'ortu'").run(row.parent_id);
      const token = createSession("ortu", row.parent_id);
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
        const p = db.prepare("SELECT id, name, email, avatar, avatar_lama, aksesori_pakai, aksesori_punya, bintang, peran, kepala_id FROM parents WHERE id = ?").get(ortu.parent_id);
        out.ortu = p ? {
          name: p.name, email: p.email, avatar: avatarOr(p.avatar, DEFAULT_ORTU_AVATAR), avatarPunya: avatarOrtuDimiliki(p), aksesori: rapikanAksesori(p.aksesori_pakai),
          id: p.id, peran: p.peran, kepala: !p.kepala_id, bintang: p.bintang, aksesoriPunya: aksesoriOrtuDimiliki(p),
        } : null;
        out.children = keluargaId ? db.prepare("SELECT * FROM children WHERE parent_id = ? ORDER BY id").all(keluargaId).map(publicChild) : [];
      }
      if (anak) {
        const c = childRow(anak.child_id);
        if (c) out.anak = publicChild(c);
      }
      return send(200, out), true;
    }
    // Ganti avatar sendiri: orang tua (sebagai=ortu) atau anak yang sedang masuk (sebagai=anak).
    // Pilihan avatar hanya dari daftar tetap (keluarga hewan/robot), jadi aman dipilih anak sendiri.
    // Orang tua tetap bisa menggantinya lewat PATCH anak/:id di dashboard.
    if (m === "POST" && path[0] === "avatar" && path.length === 1) {
      const avatar = avatarOr(body.avatar, "");
      if (!avatar) throw new ApiError(400, "Avatar tidak dikenal.");
      if (body.sebagai === "anak") {
        const child = anak && childRow(anak.child_id);
        if (!child) throw new ApiError(401, "Silakan masuk sebagai anak dulu.");
        if (!avatarDimiliki(child).includes(avatar)) throw new ApiError(403, "Beli avatar ini dulu di Toko Avatar.");
        simpanAvatarAwal(child);
        db.prepare("UPDATE children SET avatar = ? WHERE id = ?").run(avatar, anak.child_id);
        return send(200, { ok: true, avatar }), true;
      }
      if (body.sebagai !== "ortu") throw new ApiError(400, "Pilih avatar untuk siapa.");
      const pid = needOrtuSaya();
      const p = db.prepare("SELECT id, avatar, avatar_lama FROM parents WHERE id = ?").get(pid);
      if (!avatarOrtuDimiliki(p).includes(avatar)) throw new ApiError(403, "Avatar ini belum dimiliki.");
      db.prepare("UPDATE parents SET avatar = ? WHERE id = ?").run(avatar, pid);
      return send(200, { ok: true, avatar }), true;
    }
    // Aksesori orang tua: semua aksesori gratis (orang tua tidak punya bintang). pakai=true mengganti
    // aksesori di tempat yang sama, pakai=false melepas.
    if (m === "POST" && path[0] === "avatar" && path[1] === "aksesori") {
      const pid = needOrtuSaya();
      const a = aksesoriById(String(body.id || ""));
      if (!a) throw new ApiError(400, "Aksesori tidak dikenal.");
      const row = db.prepare("SELECT aksesori_pakai, aksesori_punya FROM parents WHERE id = ?").get(pid);
      if (body.pakai !== false && !aksesoriOrtuDimiliki(row).includes(a.id)) throw new ApiError(403, "Beli aksesori ini dulu di Toko Avatar.");
      const lama = rapikanAksesori(row?.aksesori_pakai);
      const baru = body.pakai === false ? lama.filter((x) => x !== a.id) : [...lama.filter((x) => aksesoriById(x).slot !== a.slot), a.id];
      const simpan = rapikanAksesori(baru);
      db.prepare("UPDATE parents SET aksesori_pakai = ? WHERE id = ?").run(simpan.join(","), pid);
      return send(200, { aksesori: simpan }), true;
    }
    // Gambar avatar anak yang sedang masuk (dipakai Ruang Pintar).
    if (m === "GET" && path[0] === "avatar.svg") {
      const c = anak && childRow(anak.child_id);
      if (!c) throw new ApiError(401, "Silakan masuk dulu.");
      res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" });
      // ?coba=<id>: pratinjau di Toko, aksesori itu menggantikan yang dipakai di tempat yang sama.
      const coba = url.searchParams.get("coba");
      const pakai = coba ? [...rapikanAksesori(c.aksesori_pakai), coba] : c.aksesori_pakai;
      res.end(avatarSvg(c.avatar, c.color, { aksesori: pakai, aura: auraAnak(c) }));
      return true;
    }
    // --- keluarga: anggota dan peran orang tua ---
    if (path[0] === "keluarga") {
      const kepala = needOrtu(), saya = ortuSaya;
      const ringkas = () => {
        const anggota = anggotaKeluarga(kepala).map((a) => ({ id: a.id, name: a.name, email: a.email, peran: a.peran, kepala: !a.kepala_id, saya: a.id === saya }));
        return { anggota, sayaKepala: saya === kepala };
      };
      if (m === "GET" && path.length === 1) return send(200, ringkas()), true;
      if (m === "POST" && path.length === 2 && path[1] === "pasangan") {
        if (saya !== kepala) throw new ApiError(403, "Hanya kepala keluarga yang bisa menambah akun pasangan.");
        const name = str(body.name, 40);
        const email = str(body.email, 120).toLowerCase();
        if (!name) throw new ApiError(400, "Isi nama pasangan.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Alamat email tidak valid.");
        if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
          throw new ApiError(400, "Kata sandi harus 8–128 karakter.");
        }
        db.exec("BEGIN IMMEDIATE");
        try {
          const anggota = anggotaKeluarga(kepala);
          if (anggota.length >= 2) throw new ApiError(409, "Keluarga ini sudah punya dua orang tua.");
          if (db.prepare("SELECT 1 FROM parents WHERE email = ?").get(email)) throw new ApiError(409, "Email ini sudah terdaftar. Gunakan email lain.");
          const peran = anggota[0].peran === "ayah" ? "ibu" : "ayah";
          const now = Date.now();
          db.prepare("INSERT INTO parents (email, pass_hash, name, consent_at, created_at, avatar, peran, kepala_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(email, hashSecret(body.password), name, now, now, AVATAR_PERAN[peran], peran, kepala);
          db.exec("COMMIT");
        } catch (e) { db.exec("ROLLBACK"); throw e; }
        return send(200, ringkas()), true;
      }
      if (m === "PATCH" && path[1] === "peran") {
        const peran = PERAN[body.peran] ? body.peran : null;
        if (!peran) throw new ApiError(400, "Pilih Ayah atau Ibu.");
        if (anggotaKeluarga(kepala).some((a) => a.id !== saya && a.peran === peran)) throw new ApiError(400, `Keluarga ini sudah punya ${PERAN[peran]}.`);
        db.prepare("UPDATE parents SET peran = ? WHERE id = ?").run(peran, saya);
        // Avatar ikut peran: karakter yang sama dengan anggota Ayah/Ibu yang baru (atau manusia bila belum dimiliki).
        const p = db.prepare("SELECT id, avatar, avatar_lama FROM parents WHERE id = ?").get(saya);
        const jenis = String(p.avatar || "manusia-ayah").split("-")[0];
        const baru = avatarOrtuDimiliki(p).includes(`${jenis}-${peran}`) ? `${jenis}-${peran}` : AVATAR_PERAN[peran];
        db.prepare("UPDATE parents SET avatar = ? WHERE id = ?").run(baru, saya);
        return send(200, ringkas()), true;
      }
      // Kepala keluarga mengeluarkan orang tua kedua: akunnya tetap ada tetapi tidak lagi terhubung ke anak-anak.
      if (m === "POST" && path[1] === "anggota" && path[3] === "keluarkan") {
        if (saya !== kepala) throw new ApiError(403, "Hanya kepala keluarga yang bisa mengeluarkan anggota.");
        const id = Number(path[2]);
        const r = db.prepare("UPDATE parents SET kepala_id = NULL WHERE id = ? AND kepala_id = ?").run(id, kepala);
        if (!r.changes) throw new ApiError(404, "Anggota tidak ditemukan.");
        db.prepare("DELETE FROM sessions WHERE parent_id = ? AND role = 'ortu'").run(id);
        kick(`o${id}`);
        return send(200, ringkas()), true;
      }
      throw new ApiError(404, "Alamat tidak ditemukan.");
    }
    if (m === "GET" && path[0] === "laporan") {
      return send(200, { children: report(needOrtu()) }), true;
    }
    if (m === "DELETE" && path[0] === "akun") {
      const saya = needOrtuSaya();
      const p = db.prepare("SELECT * FROM parents WHERE id = ?").get(saya);
      if (!checkSecret(body.password || "", p.pass_hash)) throw new ApiError(401, "Kata sandi salah.");
      // Orang tua kedua: hanya akunnya sendiri yang terhapus; anak dan data keluarga tetap.
      if (p.kepala_id) {
        purgeUid(`o${saya}`);
        db.prepare("DELETE FROM parents WHERE id = ?").run(saya);
        kick(`o${saya}`);
        return send(200, { ok: true }, { "Set-Cookie": [cookie(COOKIE.ortu, "", 0), cookie(COOKIE.anak, "", 0)] }), true;
      }
      // Kepala keluarga: seluruh keluarga terhapus, termasuk akun orang tua kedua (CASCADE lewat kepala_id).
      const pid = saya;
      for (const a of anggotaKeluarga(pid)) if (a.id !== pid) { purgeUid(`o${a.id}`); kick(`o${a.id}`); }
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
      if (!AVATAR_AWAL_ANAK.includes(f.avatar)) throw new ApiError(400, "Pilih avatar manusia untuk akun anak baru.");
      const login = kredensialAnak(body);
      const r = db.prepare(`INSERT INTO children (parent_id, name, jenjang, kelas, kurikulum, negara, color, avatar, pin_hash, limit_min, allow_strangers, chat, created_at, login_anak, sandi_anak_hash)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(pid, f.name, f.jenjang, f.kelas ?? 0, f.kurikulum, f.negara, f.color, f.avatar, "", f.limit_min ?? 60, f.allow_strangers ?? 0, f.chat ?? "mati", Date.now(), ...login);
      return send(200, { child: publicChild(childRow(Number(r.lastInsertRowid))) }), true;
    }
    if (path[0] === "anak" && path.length === 2 && path[1] === "keluar" && m === "POST") {
      endSession(cookies[COOKIE.anak]);
      return send(200, { ok: true }, { "Set-Cookie": cookie(COOKIE.anak, "", 0) }), true;
    }
    if (path[0] === "anak" && path.length === 2 && path[1] === "masuk" && m === "POST") {
      const login = loginAnak(body.loginAnak);
      const lim = limited(`sandi-anak:${ip}`, 10);
      const c = POLA_LOGIN_ANAK.test(login) ? db.prepare("SELECT * FROM children WHERE login_anak = ?").get(login) : null;
      const valid = typeof body.sandiAnak === "string" && body.sandiAnak.length <= 128
        && checkSecret(body.sandiAnak, c?.sandi_anak_hash || sandiAnakCadangan);
      if (!c?.sandi_anak_hash || !valid) {
        lim.fail();
        throw new ApiError(401, "Nama pengguna atau kata sandi salah.");
      }
      lim.ok();
      endSession(cookies[COOKIE.anak]);
      const token = createSession("anak", c.parent_id, c.id);
      return send(200, { child: publicChild(c) }, { "Set-Cookie": cookie(COOKIE.anak, token, SESSION_MS / 1000) }), true;
    }
    if (path[0] === "anak" && path.length >= 2) {
      const pid = needOrtu();
      const c = ownChild(pid, path[1]);
      if (path.length === 3 && path[2] === "login" && m === "PATCH") {
        const login = kredensialAnak(body, c.id);
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE children SET login_anak = ?, sandi_anak_hash = ? WHERE id = ?").run(...login, c.id);
          db.prepare("DELETE FROM sessions WHERE child_id = ? AND role = 'anak'").run(c.id);
          db.prepare("DELETE FROM login_codes WHERE child_id = ?").run(c.id);
          db.exec("COMMIT");
        } catch (e) { db.exec("ROLLBACK"); throw e; }
        kick(`a${c.id}`);
        return send(200, { loginAnak: login[0] }), true;
      }
      if (path.length === 2 && m === "PATCH") {
        const f = validChildFields(body, true);
        if (f.avatar) {
          if (!avatarDimiliki(c).includes(f.avatar)) throw new ApiError(403, "Avatar ini belum dimiliki anak.");
          simpanAvatarAwal(c);
        }
        const keys = Object.keys(f);
        if (keys.length) {
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

    // --- Kamarku: ringkasan untuk anak yang sedang masuk ---
    if (m === "GET" && path[0] === "kamarku" && path.length === 1) {
      const k = anak && kamarku(anak.child_id);
      if (!k) throw new ApiError(401, "Masuk sebagai anak dulu untuk membuka Kamarku.");
      return send(200, k), true;
    }

    // --- tugas dari orang tua (orang tua dan anak) ---
    if (handleTugas({ m, path, body, url, ortuId: ortu ? keluargaId : null, ortuSaya, anak, ownChild, send, ApiError })) return true;

    // --- chat keluarga dan riwayat chat arena ---
    const sendAudio = (tipe, data) => {
      const headers = { "Content-Type": tipe, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" };
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
        if (start > end) {
          res.writeHead(416, { ...headers, "Content-Range": `bytes */${data.length}` });
          return res.end();
        }
        res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": end - start + 1 });
        return res.end(data.subarray(start, end + 1));
      }
      res.writeHead(200, { ...headers, "Content-Length": data.length });
      res.end(data);
    };
    if (handleChat({ m, path, body, url, ortuId: ortu ? keluargaId : null, ortuSaya, anak, ownChild, send, sendAudio, ApiError })) return true;

    // --- keuangan anak: uang saku dan tabungan (diisi orang tua, anak hanya melihat) ---
    // --- kegiatan belajar anak (latihan dan tryout) yang menunggu tanggapan orang tua ---
    if (handleTanggapanBelajar({ m, path, body, ortuId: ortu ? keluargaId : null, ortuSaya, ownChild, send, ApiError })) return true;

    if (handleKeuangan({ m, path, body, ortuId: ortu ? keluargaId : null, ortuSaya, anak, ownChild, send, ApiError })) return true;

    // --- hadiah tukar bintang (orang tua membuat, anak menukar, orang tua menyetujui) ---
    if (handleHadiah({ m, path, body, ortuId: ortu ? keluargaId : null, ortuSaya, anak, send, ApiError })) return true;

    // --- Toko Avatar orang tua (bintang orang tua sendiri) ---
    if (handleTokoOrtu({ m, path, body, ortuSaya: ortu ? ortuSaya : null, send, ApiError })) return true;
    if (handleKantor({ m, path, body, ortuSaya: ortu?.role === "ortu" ? ortuSaya : null, keluargaId, anak, url, send, ApiError })) return true;

    // --- kemajuan Ruang Pintar (anak) ---
    if (handleProgres({ m, path, body, anak, send, ApiError })) return true;

    // --- toko aksesori (anak) ---
    if (handleToko({ m, path, body, anak, send, ApiError })) return true;

    throw new ApiError(404, "Alamat tidak ditemukan.");
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    if (status === 500) console.error(e);
    send(status, { error: status === 500 ? "Terjadi kesalahan di server." : e.message });
    return true;
  }
}

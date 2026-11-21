// Penyimpanan data akun dengan SQLite bawaan Node.js (tanpa paket tambahan).
// File database: server/data/bimbel.db (tidak ikut dibagikan, lihat .gitignore).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_AVATAR, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.env.BIMBEL_DB || join(here, "data", "bimbel.db");
if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS parents (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    pass_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    consent_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    jenjang TEXT NOT NULL,
    color TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    limit_min INTEGER NOT NULL DEFAULT 60,
    allow_strangers INTEGER NOT NULL DEFAULT 0,
    chat TEXT NOT NULL DEFAULT 'mati',
    pin_fail INTEGER NOT NULL DEFAULT 0,
    pin_lock_until INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    role TEXT NOT NULL,                -- 'ortu' atau 'anak'
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS login_codes (
    code TEXT PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS play_time (
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    day TEXT NOT NULL,                 -- YYYY-MM-DD (WIB)
    seconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (child_id, day)
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    game TEXT NOT NULL,                -- catur | scramble | kartu
    mode TEXT NOT NULL,                -- bot | online
    outcome TEXT NOT NULL,             -- menang | kalah | seri
    score INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS results_child ON results(child_id, created_at);

  -- Lupa kata sandi orang tua: token dari tautan email (disimpan dalam bentuk hash), berlaku 30 menit, sekali pakai.
  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

// Kolom avatar (database lama ditingkatkan otomatis).
for (const [table, def] of [["children", DEFAULT_AVATAR], ["parents", DEFAULT_ORTU_AVATAR]]) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === "avatar")) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN avatar TEXT NOT NULL DEFAULT '${def}'`);
  }
}

if (!db.prepare("PRAGMA table_info(parents)").all().some((c) => c.name === "avatar_lama")) {
  db.exec("BEGIN IMMEDIATE; ALTER TABLE parents ADD COLUMN avatar_lama TEXT; UPDATE parents SET avatar_lama = avatar; COMMIT;");
}

// Aksesori yang dipakai orang tua (gratis untuk orang tua; dipilih di menu Avatar dashboard orang tua).
if (!db.prepare("PRAGMA table_info(parents)").all().some((c) => c.name === "aksesori_pakai")) {
  db.exec("ALTER TABLE parents ADD COLUMN aksesori_pakai TEXT NOT NULL DEFAULT ''");
}

// Keluarga: satu kepala keluarga (Ayah atau Ibu) memegang data anak. Orang tua kedua ditautkan lewat
// kepala_id (NULL = kepala keluarga) dan bergabung dengan kode undangan. Peran: ayah | ibu.
{
  const cols = db.prepare("PRAGMA table_info(parents)").all().map((c) => c.name);
  if (!cols.includes("peran")) db.exec("ALTER TABLE parents ADD COLUMN peran TEXT NOT NULL DEFAULT 'ayah'");
  if (!cols.includes("kepala_id")) db.exec("ALTER TABLE parents ADD COLUMN kepala_id INTEGER REFERENCES parents(id) ON DELETE CASCADE");
  db.exec(`CREATE TABLE IF NOT EXISTS undangan_ortu (
    kode TEXT PRIMARY KEY,
    kepala_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`);
}

// Kolom negara dan kelas anak (diisi orang tua; 0 = kelas belum diisi).
{
  const cols = db.prepare("PRAGMA table_info(children)").all().map((c) => c.name);
  if (!cols.includes("negara")) db.exec("ALTER TABLE children ADD COLUMN negara TEXT NOT NULL DEFAULT 'ID'");
  if (!cols.includes("kelas")) db.exec("ALTER TABLE children ADD COLUMN kelas INTEGER NOT NULL DEFAULT 0");
  // Kurikulum Ruang Pintar yang dipilih orang tua: merdeka | cam | sgp.
  if (!cols.includes("kurikulum")) db.exec("ALTER TABLE children ADD COLUMN kurikulum TEXT NOT NULL DEFAULT 'merdeka'");
  // Toko aksesori: saldo bintang, aksesori yang dimiliki dan yang dipakai (id dipisah koma).
  if (!cols.includes("bintang")) db.exec("ALTER TABLE children ADD COLUMN bintang INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes("aksesori_punya")) db.exec("ALTER TABLE children ADD COLUMN aksesori_punya TEXT NOT NULL DEFAULT ''");
  if (!cols.includes("aksesori_pakai")) db.exec("ALTER TABLE children ADD COLUMN aksesori_pakai TEXT NOT NULL DEFAULT ''");
  // XP dari Ruang Pintar; menentukan level dan aura avatar (lihat shared/aura.js).
  if (!cols.includes("xp")) db.exec("ALTER TABLE children ADD COLUMN xp INTEGER NOT NULL DEFAULT 0");
  // Aura pilihan anak: NULL = otomatis (aura tertinggi yang sudah terbuka), '' = tanpa aura, atau id aura.
  if (!cols.includes("aura_pakai")) db.exec("ALTER TABLE children ADD COLUMN aura_pakai TEXT");
}

// Hari dihitung menurut waktu Indonesia Barat (UTC+7).
export function today(now = Date.now()) {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function lastDays(n, now = Date.now()) {
  return Array.from({ length: n }, (_, i) => today(now - (n - 1 - i) * 86400000));
}

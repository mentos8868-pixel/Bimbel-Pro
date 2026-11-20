// Penyimpanan data akun dengan SQLite bawaan Node.js (tanpa paket tambahan).
// File database: server/data/bimbel.db (tidak ikut dibagikan, lihat .gitignore).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
`);

// Kolom avatar (database lama ditingkatkan otomatis).
for (const [table, def] of [["children", "beruang-putra"], ["parents", "beruang-ayah"]]) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === "avatar")) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN avatar TEXT NOT NULL DEFAULT '${def}'`);
  }
}

// Kolom negara dan kelas anak (diisi orang tua; 0 = kelas belum diisi).
{
  const cols = db.prepare("PRAGMA table_info(children)").all().map((c) => c.name);
  if (!cols.includes("negara")) db.exec("ALTER TABLE children ADD COLUMN negara TEXT NOT NULL DEFAULT 'ID'");
  if (!cols.includes("kelas")) db.exec("ALTER TABLE children ADD COLUMN kelas INTEGER NOT NULL DEFAULT 0");
}

// Hari dihitung menurut waktu Indonesia Barat (UTC+7).
export function today(now = Date.now()) {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function lastDays(n, now = Date.now()) {
  return Array.from({ length: n }, (_, i) => today(now - (n - 1 - i) * 86400000));
}

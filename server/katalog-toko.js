import { db } from "./db.js";
import { AKSESORI } from "../shared/aksesori.js";
import { KATALOG_AVATAR, parseAvatar } from "../shared/avatars.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS shop_settings (
    id TEXT PRIMARY KEY,
    harga INTEGER NOT NULL CHECK (harga BETWEEN 0 AND 10000),
    dijual INTEGER NOT NULL CHECK (dijual IN (0, 1))
  )
`);
const daftarAwal = [
  ...AKSESORI.map((item) => ({ ...item, jenis: "aksesori", nama: item.name })),
  ...KATALOG_AVATAR.map((item) => ({
    ...item, jenis: "avatar", varian: parseAvatar(item.id).member.name,
  })),
];
const perId = new Map(daftarAwal.map((item) => [item.id, item]));
const baca = db.prepare("SELECT * FROM shop_settings WHERE id = ?");
const semua = db.prepare("SELECT * FROM shop_settings");
const simpan = db.prepare(`
  INSERT INTO shop_settings (id, harga, dijual) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET harga = excluded.harga, dijual = excluded.dijual
`);

function denganPengaturan(item, perubahan) {
  return { ...item, harga: perubahan?.harga ?? item.harga, dijual: perubahan?.dijual !== 0 };
}

export function katalogToko() {
  const perubahan = new Map(semua.all().map((row) => [row.id, row]));
  return daftarAwal.map((item) => denganPengaturan(item, perubahan.get(item.id)));
}

export function katalogPemain(anggota, keadaan) {
  const katalog = katalogToko();
  return {
    items: katalog.filter((item) => item.jenis === "aksesori" && (item.dijual || keadaan.punya.includes(item.id))),
    katalog: katalog.filter((item) => item.jenis === "avatar" && item.id.endsWith(`-${anggota}`)
      && (item.dijual || keadaan.avatarPunya.includes(item.id))),
  };
}

export function produkToko(id, jenis, hargaDitampilkan, ApiError) {
  const awal = perId.get(id);
  if (awal?.jenis !== jenis) throw new ApiError(400, "Item ini tidak dikenal.");
  const item = denganPengaturan(awal, baca.get(id));
  if (!item.dijual) throw new ApiError(400, "Item ini sedang tidak dijual.");
  if (hargaDitampilkan !== undefined && hargaDitampilkan !== item.harga) {
    throw new ApiError(409, "Harga berubah. Periksa harga yang baru sebelum membeli.");
  }
  return item;
}

export function simpanKatalogToko(items, ApiError) {
  if (!Array.isArray(items) || items.length === 0 || items.length > perId.size) {
    throw new ApiError(400, "Daftar perubahan item tidak valid.");
  }
  const dilihat = new Set();
  for (const item of items) {
    if (!perId.has(item?.id) || dilihat.has(item.id) || !Number.isInteger(item.harga)
      || item.harga < 0 || item.harga > 10000 || typeof item.dijual !== "boolean") {
      throw new ApiError(400, "Pilih item yang tersedia dan isi harga 0 sampai 10.000 bintang.");
    }
    dilihat.add(item.id);
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of items) simpan.run(item.id, item.harga, Number(item.dijual));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return katalogToko();
}

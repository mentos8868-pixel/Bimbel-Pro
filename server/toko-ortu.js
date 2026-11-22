// Toko Avatar untuk orang tua: aturannya sama dengan toko anak (keputusan pengguna). Karakter dan aksesori
// dibeli dengan bintang yang diperoleh orang tua dari Kantor (parents.bintang). Karakter yang dijual mengikuti peran
// (Ayah/Ibu), karena anggota keluarga avatar orang tua ditentukan otomatis.
import { db } from "./db.js";
import { AVATAR_AWAL_ORTU, KATALOG_AVATAR, avatarOr, DEFAULT_ORTU_AVATAR } from "../shared/avatars.js";
import { AKSESORI, aksesoriById, rapikanAksesori } from "../shared/aksesori.js";

const daftar = (s) => String(s || "").split(",").filter(Boolean);
function transaksi(fn) {
  db.exec("BEGIN IMMEDIATE");
  try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; }
}

// Avatar yang dimiliki orang tua: avatar awal (manusia), avatar yang sedang/pernah dipakai, dan yang dibeli.
export function avatarOrtuDimiliki(p) {
  const dibeli = p.id ? db.prepare("SELECT avatar FROM parent_avatar WHERE parent_id = ?").all(p.id).map((r) => r.avatar) : [];
  return [...new Set([...AVATAR_AWAL_ORTU, ...[p.avatar, p.avatar_lama].filter((id) => avatarOr(id, "")), ...dibeli])];
}
export const aksesoriOrtuDimiliki = (p) => daftar(p.aksesori_punya).filter(aksesoriById);

export function tambahBintangOrtu(parentId, n) {
  const jumlah = Math.floor(Number(n) || 0);
  if (jumlah > 0) db.prepare("UPDATE parents SET bintang = bintang + ? WHERE id = ?").run(jumlah, parentId);
}

function keadaan(pid) {
  const p = db.prepare("SELECT id, avatar, avatar_lama, bintang, aksesori_punya, aksesori_pakai, peran FROM parents WHERE id = ?").get(pid);
  const peran = p.peran === "ibu" ? "ibu" : "ayah";
  return {
    avatar: avatarOr(p.avatar, DEFAULT_ORTU_AVATAR), avatarPunya: avatarOrtuDimiliki(p), peran,
    bintang: p.bintang, punya: aksesoriOrtuDimiliki(p), pakai: rapikanAksesori(p.aksesori_pakai),
  };
}

// Mengembalikan true bila permintaan ditangani. ortuSaya = akun orang tua yang sedang masuk.
export function handleTokoOrtu({ m, path, body, ortuSaya, send, ApiError }) {
  if (path[0] !== "toko-ortu") return false;
  if (!ortuSaya) throw new ApiError(401, "Silakan masuk sebagai orang tua.");
  const id = ortuSaya;

  if (m === "GET" && path.length === 1) {
    const k = keadaan(id);
    // Katalog karakter sesuai peran: Ayah membeli "<jenis>-ayah", Ibu membeli "<jenis>-ibu".
    const katalog = KATALOG_AVATAR.filter((a) => a.id.endsWith(`-${k.peran}`));
    return send(200, { items: AKSESORI, katalog, ...k }), true;
  }

  if (m === "POST" && path[1] === "beli-avatar") {
    const k0 = keadaan(id);
    const produk = KATALOG_AVATAR.find((a) => a.id === body.id && a.id.endsWith(`-${k0.peran}`));
    if (!produk) throw new ApiError(400, "Avatar ini tidak dijual untuk Anda.");
    transaksi(() => {
      const k = keadaan(id);
      if (k.avatarPunya.includes(produk.id)) throw new ApiError(400, "Avatar ini sudah Anda miliki.");
      if (k.bintang < produk.harga) throw new ApiError(400, `Perlu ${produk.harga} bintang untuk membeli avatar ini.`);
      db.prepare("INSERT OR IGNORE INTO parent_avatar (parent_id, avatar) VALUES (?, ?)").run(id, produk.id);
      db.prepare("UPDATE parents SET bintang = bintang - ?, avatar = ? WHERE id = ?").run(produk.harga, produk.id, id);
    });
    return send(200, keadaan(id)), true;
  }

  if (m === "POST" && path[1] === "beli") {
    const a = aksesoriById(String(body.id || ""));
    if (!a) throw new ApiError(400, "Aksesori tidak dikenal.");
    transaksi(() => {
      const k = keadaan(id);
      if (k.punya.includes(a.id)) throw new ApiError(400, "Aksesori ini sudah Anda miliki.");
      if (k.bintang < a.harga) throw new ApiError(400, `Bintang belum cukup. Perlu ${a.harga} bintang.`);
      db.prepare("UPDATE parents SET bintang = bintang - ?, aksesori_punya = ? WHERE id = ?").run(a.harga, [...k.punya, a.id].join(","), id);
    });
    return send(200, keadaan(id)), true;
  }

  if (m === "POST" && path[1] === "pakai") {
    const a = aksesoriById(String(body.id || ""));
    if (!a) throw new ApiError(400, "Aksesori tidak dikenal.");
    const k = keadaan(id);
    if (!k.punya.includes(a.id)) throw new ApiError(403, "Beli aksesori ini dulu di Toko Avatar.");
    const lain = k.pakai.filter((x) => aksesoriById(x).slot !== a.slot);
    const baru = body.pakai === false ? k.pakai.filter((x) => x !== a.id) : [...lain, a.id];
    db.prepare("UPDATE parents SET aksesori_pakai = ? WHERE id = ?").run(rapikanAksesori(baru).join(","), id);
    return send(200, keadaan(id)), true;
  }

  throw new ApiError(404, "Alamat tidak ditemukan.");
}

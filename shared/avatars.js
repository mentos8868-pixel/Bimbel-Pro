// Daftar avatar lucu. Setiap jenis punya satu keluarga: ayah, ibu, anak perempuan, anak laki-laki.
// Id avatar = "<jenis>-<anggota>", misalnya "ulat-putri". Dipakai bersama oleh server dan game.

export const FAMILIES = [
  { id: "manusia", name: "Manusia", body: "#d99f78", belly: "#507fc6", accent: "#392821" },
  { id: "ulat", name: "Ulat", body: "#8fd16a", belly: "#d9f2b8", accent: "#5aa63f" },
  { id: "robo", name: "Robo", body: "#ffb347", belly: "#fff1d6", accent: "#5d6b7a" },
  { id: "beruang", name: "Beruang", body: "#b07a4f", belly: "#ecd2b4", accent: "#6e4a2e" },
  { id: "kelinci", name: "Kelinci", body: "#f4f1ee", belly: "#ffd6e2", accent: "#f29bb5" },
  { id: "penguin", name: "Penguin", body: "#36475c", belly: "#ffffff", accent: "#f5a524" },
  { id: "kodok", name: "Kodok", body: "#5fc29a", belly: "#e6f7c9", accent: "#2f8f6b" },
  // 12 shio (Kelinci sudah ada di atas).
  { id: "tikus", name: "Tikus", body: "#a9adb8", belly: "#f3e9ef", accent: "#ff9fb4" },
  { id: "kerbau", name: "Kerbau", body: "#646673", belly: "#d8c8b4", accent: "#efe3c8" },
  { id: "macan", name: "Macan", body: "#f39a3d", belly: "#fff3e0", accent: "#3b2a20" },
  { id: "naga", name: "Naga", body: "#e2483d", belly: "#ffd66b", accent: "#f5c542" },
  { id: "ular", name: "Ular", body: "#6cc070", belly: "#f2e7a6", accent: "#e65c5c" },
  { id: "kuda", name: "Kuda", body: "#b9773f", belly: "#f0d6b8", accent: "#4a2f1d" },
  { id: "kambing", name: "Kambing", body: "#f1ece2", belly: "#fffaf0", accent: "#b59a7a" },
  { id: "monyet", name: "Monyet", body: "#8a5a3b", belly: "#f0c9a0", accent: "#6b4329" },
  { id: "ayam", name: "Ayam", body: "#fffdf8", belly: "#fff1c9", accent: "#e8463b" },
  { id: "anjing", name: "Anjing", body: "#e0b07a", belly: "#fff1dc", accent: "#8a5a33" },
  { id: "babi", name: "Babi", body: "#f7a8b8", belly: "#ffd1dc", accent: "#e07a92" },
];

export const MEMBERS = [
  { id: "ayah", name: "Ayah", scale: 1.15 },
  { id: "ibu", name: "Ibu", scale: 1.05 },
  { id: "putri", name: "Anak perempuan", scale: 0.85 },
  { id: "putra", name: "Anak laki-laki", scale: 0.85 },
];

export const AVATAR_AWAL_ANAK = ["manusia-putra", "manusia-putri"];
export const AVATAR_AWAL_ORTU = ["manusia-ayah", "manusia-ibu"];
export const [DEFAULT_AVATAR] = AVATAR_AWAL_ANAK;
export const [DEFAULT_ORTU_AVATAR] = AVATAR_AWAL_ORTU;
export const HARGA_AVATAR = 10;

export function parseAvatar(id) {
  const [f, m, ...sisa] = String(id || "").split("-");
  if (sisa.length) return null;
  const family = FAMILIES.find((x) => x.id === f);
  const member = MEMBERS.find((x) => x.id === m);
  return family && member ? { family, member } : null;
}

export const isAvatar = (id) => !!parseAvatar(id);
export const avatarOr = (id, fallback = DEFAULT_AVATAR) => (isAvatar(id) ? id : fallback);
export const avatarName = (id) => {
  const a = parseAvatar(id);
  return a ? `${a.family.name} ${a.member.name.toLowerCase()}` : "";
};

export const KATALOG_AVATAR = FAMILIES.filter((f) => f.id !== "manusia").flatMap((f) => MEMBERS.map((m) => ({
  id: `${f.id}-${m.id}`, nama: `${f.name} ${m.name.toLowerCase()}`, harga: HARGA_AVATAR,
})));

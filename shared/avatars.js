// Daftar avatar lucu. Setiap jenis punya satu keluarga: ayah, ibu, anak perempuan, anak laki-laki.
// Id avatar = "<jenis>-<anggota>", misalnya "ulat-putri". Dipakai bersama oleh server dan game.

export const FAMILIES = [
  { id: "ulat", name: "Ulat", body: "#8fd16a", belly: "#d9f2b8", accent: "#5aa63f" },
  { id: "robo", name: "Robo", body: "#ffb347", belly: "#fff1d6", accent: "#5d6b7a" },
  { id: "beruang", name: "Beruang", body: "#b07a4f", belly: "#ecd2b4", accent: "#6e4a2e" },
  { id: "kelinci", name: "Kelinci", body: "#f4f1ee", belly: "#ffd6e2", accent: "#f29bb5" },
  { id: "penguin", name: "Penguin", body: "#36475c", belly: "#ffffff", accent: "#f5a524" },
  { id: "kodok", name: "Kodok", body: "#5fc29a", belly: "#e6f7c9", accent: "#2f8f6b" },
];

export const MEMBERS = [
  { id: "ayah", name: "Ayah", scale: 1.15 },
  { id: "ibu", name: "Ibu", scale: 1.05 },
  { id: "putri", name: "Anak perempuan", scale: 0.85 },
  { id: "putra", name: "Anak laki-laki", scale: 0.85 },
];

export const DEFAULT_AVATAR = "beruang-putra";
export const DEFAULT_ORTU_AVATAR = "beruang-ayah";
export const DINO_AVATAR = "dino-putri";
export const DINO_FAMILY = { id: "dino", name: "Piyama Dino" };

export function parseAvatar(id) {
  if (id === DINO_AVATAR) return { family: DINO_FAMILY, member: MEMBERS.find((x) => x.id === "putri") };
  const [f, m] = String(id || "").split("-");
  const family = FAMILIES.find((x) => x.id === f);
  const member = MEMBERS.find((x) => x.id === m);
  return family && member ? { family, member } : null;
}

export const isAvatar = (id) => !!parseAvatar(id);
export const avatarOr = (id, fallback = DEFAULT_AVATAR) => (isAvatar(id) ? id : fallback);
export const avatarName = (id) => {
  if (id === DINO_AVATAR) return DINO_FAMILY.name;
  const a = parseAvatar(id);
  return a ? `${a.family.name} ${a.member.name.toLowerCase()}` : "";
};

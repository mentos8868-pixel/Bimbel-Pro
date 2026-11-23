const baris = (id, pemain, zs) => zs.flatMap((z) => [21.8, 28.2].map((x) => ({ id, pemain, x, z })));
export const MEJA_GAME = [
  ...baris("catur", 2, [-12.5, -7.5]), ...baris("scramble", 4, [-2.5]),
  ...baris("kartu", 4, [7.5]), ...baris("otello", 2, [12.5]),
].map((p, i) => ({ ...p, nomor: i + 1 }));

export function kursiMeja({ x, z, pemain }) {
  const sisi = pemain === 4 ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, 0], [1, 0]];
  return sisi.map(([dx, dz]) => ({ x: x + dx * 1.57, z: z + dz * 1.46, ry: Math.atan2(-dx, -dz) }));
}

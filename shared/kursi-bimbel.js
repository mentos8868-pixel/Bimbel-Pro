export const BARIS_BIMBEL = [24.8, 22.2];
export const KOLOM_BIMBEL = [-5.4, -2.7, 2.7, 5.4];
export const TITIK_BIMBEL = { x: 0, z: 27 };
export const JARAK_INTERAKSI_BIMBEL = 2.6;
export const POSISI_KURSI_BIMBEL = BARIS_BIMBEL.flatMap((z) =>
  KOLOM_BIMBEL.map((x) => ({ x, z: z - 0.7, ry: 0 })),
);

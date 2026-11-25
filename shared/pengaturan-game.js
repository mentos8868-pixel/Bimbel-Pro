export const BATAS_PENGATURAN = {
  latihan: { jumlahSoal: [1, 50] },
  matematika: { jumlahSoal: [1, 50], waktu: [3, 120], jumlahPilihan: [2, 4] },
  tryout: { sulit: [0, 100], sedang: [0, 100] },
};

export const PENGATURAN_AWAL = {
  latihan: {
    mudah: { jumlahSoal: 10 },
    sedang: { jumlahSoal: 10 },
    sulit: { jumlahSoal: 10 },
  },
  matematika: {
    mudah: { jumlahSoal: 5, waktu: 15, jumlahPilihan: 2 },
    sedang: { jumlahSoal: 5, waktu: 10, jumlahPilihan: 3 },
    sulit: { jumlahSoal: 5, waktu: 8, jumlahPilihan: 4 },
  },
  tryout: { sulit: 70, sedang: 20 },
};

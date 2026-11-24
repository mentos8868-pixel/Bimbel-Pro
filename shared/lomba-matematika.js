export const JUMLAH_RONDE = 5;
export const MODE_LOMBA = {
  cepat: { nama: "Lomba cepat", keterangan: "Keduanya boleh menjawab setiap soal. Jika poin seri, total waktu jawaban benar menentukan pemenang." },
  rebutan: { nama: "Rebutan soal", keterangan: "Pemain pertama yang menjawab benar mendapat poin dan langsung membuka soal berikutnya." },
};
export const TINGKAT_LOMBA = {
  mudah: { nama: "Mudah", waktu: 15, jumlahPilihan: 2, keterangan: "Tambah dan kurang dengan angka kecil." },
  sedang: { nama: "Sedang", waktu: 10, jumlahPilihan: 3, keterangan: "Tambah, kurang, dan perkalian." },
  sulit: { nama: "Sulit", waktu: 8, jumlahPilihan: 4, keterangan: "Pembagian tepat dan operasi campuran." },
};

export function soalLomba(indeks, tingkat, acak = Math.random) {
  const angka = (min, max) => min + Math.floor(acak() * (max - min + 1));
  let teks, benar;
  if (tingkat === "sulit") {
    const a = angka(3, 12), b = angka(2, 12), c = angka(2, 6);
    if (indeks % 2) {
      teks = `(${a} + ${b}) × ${c}`;
      benar = (a + b) * c;
    } else {
      teks = `${a * b} ÷ ${b}`;
      benar = a;
    }
  } else {
    const operasi = tingkat === "mudah" ? ["+", "−"] : ["+", "−", "×"];
    const op = operasi[indeks % operasi.length];
    const a = angka(2, op === "×" || tingkat === "mudah" ? 9 : 30);
    const b = angka(1, op === "−" ? a : op === "×" || tingkat === "mudah" ? 9 : 20);
    teks = `${a} ${op} ${b}`;
    benar = op === "+" ? a + b : op === "−" ? a - b : a * b;
  }
  const jumlah = TINGKAT_LOMBA[tingkat]?.jumlahPilihan ?? 3;
  const cadangan = [-3, -2, -1, 1, 2, 3].map((beda) => benar + beda).filter((n) => n >= 0);
  const pilihan = Array.from({ length: jumlah - 1 }, () => cadangan.splice(angka(0, cadangan.length - 1), 1)[0]);
  const kunci = angka(0, jumlah - 1);
  pilihan.splice(kunci, 0, benar);
  return { teks: `${teks} = ?`, pilihan, kunci };
}

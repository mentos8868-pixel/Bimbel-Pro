export const ADEGAN_BEDA = [
  { nama: "Piknik di taman", tema: "taman", benda: [
    ["Burung pipit", 70, 25, 0, 9],
    ["Kupu-kupu", 82, 15, 1, 10],
    ["Kumbang koksi", 46, 87, 2, 6],
    ["Daun kering", 64, 95, 3, 12],
    ["Apel merah", 32, 52, 4, 10],
    ["Bunga kuning", 14, 50, 5, 10],
    ["Pir", 61, 80, 11, 10],
    ["Burung pipit", 27, 32, 0, 9],
    ["Kupu-kupu", 12, 15, 1, 9],
    ["Daun kering", 85, 87, 3, 11],
  ] },
  { nama: "Hari di pantai", tema: "pantai", benda: [
    ["Burung camar", 50, 15, 9, 14],
    ["Burung camar", 77, 23, 9, 9],
    ["Kepiting", 65, 69, 7, 13],
    ["Kerang", 41, 75, 6, 10],
    ["Bintang laut", 11, 92, 8, 12],
    ["Kelapa", 77, 70, 10, 13],
    ["Kerang", 90, 94, 6, 9],
    ["Kepiting", 26, 91, 7, 11],
    ["Daun kering", 18, 57, 3, 9],
    ["Kupu-kupu", 8, 33, 1, 9],
  ] },
  { nama: "Pasar pagi", tema: "pasar", benda: [
    ["Burung pipit", 31, 34, 0, 10],
    ["Kupu-kupu", 9, 22, 1, 10],
    ["Apel merah", 43, 48, 4, 10],
    ["Pir", 65, 50, 11, 11],
    ["Kumbang koksi", 30, 86, 2, 6],
    ["Bunga kuning", 73, 85, 5, 10],
    ["Daun kering", 8, 92, 3, 12],
    ["Kelapa", 91, 74, 10, 11],
    ["Kupu-kupu", 55, 19, 1, 9],
    ["Apel merah", 18, 67, 4, 9],
  ] },
  { nama: "Malam di angkasa", tema: "angkasa", benda: [
    ["Satelit", 33, 20, 12, 14],
    ["Asteroid", 76, 11, 13, 10],
    ["Helm astronaut", 61, 90, 14, 12],
    ["Wahana antariksa", 86, 39, 15, 14],
    ["Batu bulan", 9, 84, 16, 10],
    ["Kerucut penanda", 73, 78, 17, 9],
    ["Asteroid", 10, 37, 13, 9],
    ["Batu bulan", 40, 92, 16, 11],
    ["Satelit", 56, 38, 12, 12],
    ["Kerucut penanda", 48, 68, 17, 8],
  ] },
  { nama: "Bawah laut", tema: "laut", benda: [
    ["Ikan kuning", 32, 16, 18, 11],
    ["Kuda laut", 53, 44, 19, 11],
    ["Penyu", 80, 14, 20, 17],
    ["Ubur-ubur", 12, 25, 21, 12],
    ["Siput laut", 64, 88, 22, 13],
    ["Ikan biru", 74, 67, 23, 11],
    ["Bintang laut", 33, 89, 8, 10],
    ["Kerang", 94, 70, 6, 10],
    ["Ikan biru", 41, 32, 23, 9],
    ["Kuda laut", 6, 55, 19, 9],
  ] },
  { nama: "Berkemah di gunung", tema: "gunung", benda: [
    ["Burung pipit", 56, 51, 0, 10],
    ["Kupu-kupu", 30, 20, 1, 10],
    ["Kumbang koksi", 30, 86, 2, 6],
    ["Daun kering", 67, 93, 3, 12],
    ["Apel merah", 40, 79, 4, 10],
    ["Bunga kuning", 8, 84, 5, 10],
    ["Pir", 76, 63, 11, 9],
    ["Burung pipit", 17, 30, 0, 9],
    ["Kupu-kupu", 75, 23, 1, 9],
    ["Daun kering", 87, 88, 3, 12],
  ] },
];

export const MEJA_BEDA = [21.8, 28.2].map((x) => ({ x, z: 2.5 }));
export function targetAdegan(i, acak = Math.random) {
  const kandidat = ADEGAN_BEDA[i].benda.map((_, j) => j);
  for (let j = kandidat.length - 1; j > 0; j--) {
    const k = Math.floor(acak() * (j + 1));
    [kandidat[j], kandidat[k]] = [kandidat[k], kandidat[j]];
  }
  return new Set(kandidat.slice(0, 5));
}

// Latihan gabungan tetap untuk setiap topik bank Cambridge dan Singapura.
// Urutan sumber dan pemilihan pasangan dibuat tetap untuk menjaga nomor soal review guru.
(() => {
  const jumlahTambahan = [6, 7, 7];
  const jawaban = (soal) => soal.o[soal.a];
  const pengecoh = (soal, indeks) => soal.o.filter((_, i) => i !== soal.a)[indeks % 3];

  function buatSoal(a, b, nomor) {
    const benarA = jawaban(a);
    const benarB = jawaban(b);
    const salahA = pengecoh(a, nomor);
    const salahB = pengecoh(b, Math.floor(nomor / 3));
    const pilihan = (pertama, kedua) => `1) ${pertama}   |   2) ${kedua}`;
    const opsi = [
      pilihan(benarA, benarB), pilihan(salahA, benarB),
      pilihan(benarA, salahB), pilihan(salahA, salahB),
    ];
    const geser = (opsi.length - nomor % opsi.length) % opsi.length;
    return {
      lv: Math.max(a.lv, b.lv),
      q: `Choose the option that answers both questions.\n1) ${a.q}\n2) ${b.q}`,
      o: opsi.slice(geser).concat(opsi.slice(0, geser)),
      a: nomor % opsi.length,
      p: `1) ${benarA}. ${a.p}\n2) ${benarB}. ${b.p}`,
    };
  }

  function tambahLatihan(topik) {
    const sumber = topik.soal.filter((soal) => !/previous question/i.test(soal.q));
    const pasanganPerLevel = [[], [], []];
    // Jarak berbeda meratakan kemunculan soal sumber pada pasangan awal.
    for (let jarak = 1; jarak < sumber.length; jarak++) {
      for (let i = 0; i + jarak < sumber.length; i++) {
        const a = sumber[i];
        const b = sumber[i + jarak];
        pasanganPerLevel[Math.max(a.lv, b.lv) - 1].push([a, b]);
      }
    }
    let nomor = 0;
    for (const [i, pasangan] of pasanganPerLevel.entries()) {
      for (const [a, b] of pasangan.slice(0, jumlahTambahan[i])) {
        topik.soal.push(buatSoal(a, b, nomor++));
      }
    }
  }

  for (const kurikulum of Object.values(window.BANK_INTL)) {
    for (const mapel of Object.values(kurikulum)) {
      for (const topik of Object.values(mapel).flat()) tambahLatihan(topik);
    }
  }
})();

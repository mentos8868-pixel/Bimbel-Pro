/* Daftar topik Matematika Kurikulum Merdeka (kelas 1–12): [id, nama, keterangan, generator, parameter].
   Soalnya dibuat acak oleh skrip utama Ruang Pintar (index.html). Daftar ini dipisah ke file sendiri
   supaya Bank Soal (lihat-soal.html) bisa menampilkan topik yang sama. Topik tambahan ada di topik_tambahan.js. */
(() => {
const T=(...a)=>a;
window.TOPIK_MERDEKA_MAT={
  1:[T('k1-cmp','Membandingkan bilangan','Lebih besar, lebih kecil, atau sama','cmp20'),T('k1-add','Penjumlahan','Menjumlahkan dan soal cerita','add20'),
     T('k1-sub','Pengurangan','Mengurangi dan soal cerita','sub20'),T('k1-pola','Pola bilangan','Melanjutkan urutan bilangan','pola',1),
     T('k1-bangun','Mengenal bangun datar','Nama bangun dan banyak sisi','bangun'),T('k1-jam','Membaca jam','Jam tepat','jam',1)],
  2:[T('k2-nt','Nilai tempat','Puluhan dan satuan','nilaiTempat'),T('k2-add','Penjumlahan sampai 100','Puluhan dan satuan','add100'),
     T('k2-sub','Pengurangan sampai 100','Bersusun dengan meminjam','sub100'),T('k2-mul','Perkalian dasar 1–5','Penjumlahan berulang','mul5'),
     T('k2-uang','Mengenal uang','Menjumlahkan uang rupiah','uang'),T('k2-pola','Loncat 2, 5, dan 10','Pola bilangan loncat','pola',2),T('k2-jam','Membaca jam','Jam tepat dan setengah','jam',2)],
  3:[T('k3-rib','Penjumlahan & pengurangan bersusun','Ratusan dan ribuan','ribuan'),T('k3-mul','Perkalian','Perkalian dan soal cerita','mul10'),
     T('k3-div','Pembagian','Kebalikan perkalian','div'),T('k3-pec','Mengenal pecahan','Membaca pecahan dari gambar','pecGambar'),
     T('k3-waktu','Satuan waktu','Jam, menit, dan detik','waktu'),T('k3-kel','Keliling bangun datar','Persegi dan persegi panjang','keliling')],
  4:[T('k4-eq','Pecahan senilai','Mencari pecahan yang nilainya sama','equiv'),T('k4-fadd','Penjumlahan pecahan','Penyebut sama','faddSame'),
     T('k4-fsub','Pengurangan pecahan','Penyebut sama','fsubSame'),T('k4-kpk','KPK','Kelipatan persekutuan terkecil','kpk'),
     T('k4-fpb','FPB','Faktor persekutuan terbesar','fpb'),T('k4-luas','Luas bangun datar','Persegi dan persegi panjang','luas'),T('k4-bulat','Pembulatan','Ke puluhan, ratusan, ribuan terdekat','bulat')],
  5:[T('k5-fadd','Penjumlahan pecahan','Penyebut berbeda','faddDiff'),T('k5-fsub','Pengurangan pecahan','Penyebut berbeda','fsubDiff'),
     T('k5-fmul','Perkalian pecahan','Pecahan dikali pecahan','fmul'),T('k5-dec','Desimal','Penjumlahan dan pengurangan','dec'),
     T('k5-pp','Pecahan, desimal, dan persen','Mengubah bentuk bilangan','pecPersen'),T('k5-kec','Kecepatan, jarak, waktu','Soal cerita perjalanan','kecepatan'),T('k5-vol','Volume kubus & balok','Bangun ruang','volume')],
  6:[T('k6-pct','Persen & diskon','Persen dan belanja','pct'),T('k6-mix','Operasi hitung campuran','Urutan pengerjaan','mix'),
     T('k6-bb','Bilangan bulat negatif','Penjumlahan, pengurangan, perkalian','bilBulat'),T('k6-ling','Lingkaran','Luas dan keliling','lingkaran'),
     T('k6-rata','Rata-rata','Mengolah data','rata'),T('k6-pkt','Pangkat & akar','Kuadrat, kubik, akar kuadrat','pangkat'),T('k6-pb','Perbandingan','Soal cerita perbandingan','perbandingan')],
  7:[T('k7-bb','Operasi bilangan bulat','Perkalian dan pembagian bertanda','kaliBulat'),T('k7-plsv','Persamaan linear satu variabel','Mencari nilai x','plsv'),
     T('k7-ars','Aritmetika sosial','Untung, rugi, dan persentase','aritSosial'),T('k7-sdt','Garis dan sudut','Penyiku, pelurus, sudut segitiga','sudut'),
     T('k7-him','Himpunan','Irisan dan gabungan','himpunan'),T('k7-pbs','Perbandingan senilai & berbalik nilai','Soal cerita','perbSenilai')],
  8:[T('k8-pola','Pola bilangan & barisan','Suku ke-n','polaN'),T('k8-grad','Gradien garis','Kemiringan dari dua titik','gradien'),
     T('k8-spldv','SPLDV','Sistem persamaan linear dua variabel','spldv'),T('k8-pyt','Teorema Pythagoras','Segitiga siku-siku','pythagoras'),
     T('k8-lp','Luas permukaan bangun ruang','Kubus dan balok','lpBangun'),T('k8-stat','Statistika','Mean, median, modus','statistik')],
  9:[T('k9-pkt','Perpangkatan','Sifat-sifat pangkat','sifatPangkat'),T('k9-akar','Bentuk akar','Menyederhanakan akar','bentukAkar'),
     T('k9-pk','Persamaan kuadrat','Pemfaktoran dan akar-akar','persKuadrat'),T('k9-fk','Fungsi kuadrat','Nilai fungsi dan titik puncak','fungsiKuadrat'),
     T('k9-tab','Tabung & kerucut','Volume dan luas permukaan','tabung'),T('k9-pel','Peluang','Dadu, koin, dan kantong bola','peluang')],
  10:[T('k10-eks','Eksponen','Persamaan eksponen','eksponen'),T('k10-log','Logaritma','Sifat-sifat logaritma','logaritma'),
     T('k10-da','Barisan & deret aritmetika','Suku ke-n dan jumlah n suku','deretAritmetika'),T('k10-dg','Barisan & deret geometri','Rasio dan jumlah','barisanGeo'),
     T('k10-trig','Trigonometri','Sudut istimewa','trigono'),T('k10-komp','Fungsi komposisi & invers','f ∘ g dan f⁻¹','komposisi')],
  11:[T('k11-lim','Limit fungsi','Substitusi dan pemfaktoran','limit'),T('k11-tur','Turunan','Turunan fungsi aljabar','turunan'),
     T('k11-int','Integral','Integral tentu','integral'),T('k11-mat','Matriks','Determinan','matriks'),
     T('k11-kom','Kaidah pencacahan','Permutasi dan kombinasi','kombinatorik'),T('k11-fh','Frekuensi harapan','Peluang dalam percobaan berulang','frekHarapan')],
  12:[T('k12-vek','Vektor','Panjang dan perkalian titik','vektor'),T('k12-d3','Dimensi tiga','Diagonal kubus dan balok','dimensi3'),
     T('k12-pm','Peluang kejadian majemuk','Dua koin, dua dadu, tanpa pengembalian','peluangMajemuk'),T('k12-bunga','Matematika keuangan','Bunga tunggal','bungaTunggal'),
     T('k12-stat','Statistika','Jangkauan, median, rata-rata gabungan','statistik12')],
};
})();

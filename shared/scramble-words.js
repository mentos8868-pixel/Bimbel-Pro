// Daftar kata Scramble per jenjang dan bahasa: [kata, petunjuk].
// Petunjuk selalu berbahasa Indonesia, supaya kata Inggris sekaligus jadi latihan kosakata.
export const WORDS = {
  SD: {
    ID: [
      ["BUKU", "benda untuk dibaca"], ["MEJA", "tempat menaruh buku"], ["KUCING", "hewan yang mengeong"],
      ["RUMAH", "tempat tinggal"], ["BOLA", "dipakai main sepak bola"], ["IKAN", "hewan yang berenang"],
      ["MOBIL", "kendaraan beroda empat"], ["SEPATU", "dipakai di kaki"], ["GURU", "mengajar di kelas"],
      ["PENSIL", "alat menulis"], ["BUNGA", "tumbuhan yang harum"], ["KELAS", "ruang belajar"],
      ["KUDA", "hewan yang bisa ditunggangi"], ["JERUK", "buah berwarna oranye"], ["ROTI", "makanan dari tepung"],
      ["BAJU", "dipakai di badan"], ["TOPI", "dipakai di kepala"], ["PINTU", "jalan masuk ruangan"],
      ["AWAN", "putih di langit"], ["HUJAN", "air yang turun dari langit"], ["GAJAH", "hewan berbelalai"],
      ["SUSU", "minuman putih bergizi"], ["PISANG", "buah kuning panjang"], ["MATA", "untuk melihat"],
    ],
    EN: [
      ["CAT", "kucing"], ["BOOK", "buku"], ["BALL", "bola"], ["FISH", "ikan"], ["BIRD", "burung"],
      ["TREE", "pohon"], ["MILK", "susu"], ["APPLE", "apel"], ["HOUSE", "rumah"], ["WATER", "air"],
      ["CHAIR", "kursi"], ["GREEN", "hijau"], ["HAPPY", "senang"], ["SCHOOL", "sekolah"], ["SUN", "matahari"],
      ["MOON", "bulan"], ["RAIN", "hujan"], ["HAND", "tangan"], ["BREAD", "roti"], ["FROG", "katak"],
      ["SHIP", "kapal"], ["DUCK", "bebek"], ["MOUSE", "tikus"], ["BLUE", "biru"],
    ],
  },
  SMP: {
    ID: [
      ["SEKOLAH", "tempat belajar"], ["PELANGI", "warna-warni setelah hujan"], ["JENDELA", "lubang cahaya di dinding"],
      ["KOMPUTER", "alat untuk mengetik dan berhitung"], ["SEPEDA", "kendaraan dua roda dikayuh"], ["BENDERA", "kain lambang negara"],
      ["GUNUNG", "daratan yang sangat tinggi"], ["SUNGAI", "aliran air menuju laut"], ["PULAU", "daratan dikelilingi air"],
      ["NELAYAN", "pekerja penangkap ikan"], ["DOKTER", "mengobati orang sakit"], ["PESAWAT", "kendaraan yang terbang"],
      ["KERETA", "berjalan di atas rel"], ["TANAMAN", "makhluk hidup berklorofil"], ["ENERGI", "kemampuan melakukan usaha"],
      ["CAHAYA", "membuat benda terlihat"], ["PECAHAN", "bilangan seperti 1/2"], ["SEGITIGA", "bangun datar bersisi tiga"],
      ["PERSEGI", "bangun datar bersisi sama panjang"], ["PLANET", "beredar mengelilingi matahari"], ["MAGNET", "menarik besi"],
      ["KOMPAS", "penunjuk arah"], ["SEJARAH", "pelajaran tentang masa lalu"], ["PUISI", "karya sastra berbait"],
    ],
    EN: [
      ["GARDEN", "kebun"], ["PLANET", "planet"], ["ISLAND", "pulau"], ["FRIEND", "teman"], ["WINDOW", "jendela"],
      ["BRIDGE", "jembatan"], ["ENERGY", "energi"], ["TEACHER", "guru"], ["LIBRARY", "perpustakaan"], ["MOUNTAIN", "gunung"],
      ["RIVER", "sungai"], ["DOCTOR", "dokter"], ["KITCHEN", "dapur"], ["NUMBER", "angka"], ["SCIENCE", "ilmu pengetahuan alam"],
      ["HISTORY", "sejarah"], ["WEATHER", "cuaca"], ["ANIMAL", "hewan"], ["FOREST", "hutan"], ["MARKET", "pasar"],
      ["COUNTRY", "negara"], ["PICTURE", "gambar"], ["STUDENT", "murid"], ["HOLIDAY", "liburan"],
    ],
  },
  SMA: {
    ID: [
      ["DEMOKRASI", "pemerintahan dari, oleh, untuk rakyat"], ["EKOSISTEM", "hubungan makhluk hidup dan lingkungannya"],
      ["GRAVITASI", "gaya tarik bumi"], ["EVOLUSI", "perubahan makhluk hidup dalam waktu lama"], ["KONSTITUSI", "undang-undang dasar"],
      ["PROTEIN", "zat gizi pembangun tubuh"], ["MOLEKUL", "gabungan atom"], ["ATMOSFER", "lapisan udara bumi"],
      ["EKONOMI", "ilmu tentang produksi dan konsumsi"], ["GEOGRAFI", "ilmu tentang bumi dan wilayah"], ["ALGORITMA", "langkah-langkah menyelesaikan masalah"],
      ["HIPOTESIS", "dugaan sementara dalam penelitian"], ["PERSAMAAN", "kalimat matematika dengan tanda sama dengan"],
      ["STATISTIK", "ilmu mengolah data"], ["LITERASI", "kemampuan membaca dan menulis"], ["VARIABEL", "nilai yang bisa berubah"],
      ["INFLASI", "kenaikan harga secara umum"], ["KROMOSOM", "pembawa sifat keturunan"], ["FOTOSINTESIS", "tumbuhan membuat makanan dengan cahaya"],
      ["DIPLOMASI", "hubungan antarnegara secara damai"], ["REAKSI", "perubahan zat dalam kimia"], ["VEKTOR", "besaran yang punya arah"],
    ],
    EN: [
      ["KNOWLEDGE", "pengetahuan"], ["ECONOMY", "ekonomi"], ["CHEMISTRY", "kimia"], ["GRAVITY", "gravitasi"],
      ["ORGANISM", "organisme"], ["EVIDENCE", "bukti"], ["HYPOTHESIS", "hipotesis"], ["ALGORITHM", "algoritma"],
      ["CULTURE", "budaya"], ["RESEARCH", "penelitian"], ["ENVIRONMENT", "lingkungan"], ["DEMOCRACY", "demokrasi"],
      ["MOLECULE", "molekul"], ["EQUATION", "persamaan"], ["LANGUAGE", "bahasa"], ["PRESSURE", "tekanan"],
      ["VOLCANO", "gunung api"], ["CITIZEN", "warga negara"], ["ANALYSIS", "analisis"], ["PHYSICS", "fisika"],
      ["AGRICULTURE", "pertanian"], ["GOVERNMENT", "pemerintah"],
    ],
  },
};

export const JENJANG = ["SD", "SMP", "SMA"];
export const LANGS = ["ID", "EN"];

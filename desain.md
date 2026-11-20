///

# Desain Tahap 1

Disusun dan **disetujui** 20 November 2026. Nama arena belum ditentukan. Detail lain masih boleh disesuaikan saat pembangunan.
Bagian materi bimbel dilewati karena bimbel sedang dibuat terpisah.

---

## 1. Peta arena

Arena berupa area terbuka berbentuk lingkaran. Pemain muncul di tengah, lalu berjalan ke ruangan-ruangan di sekelilingnya.

| Area | Letak | Isi |
|------|-------|-----|
| **Alun-alun** | Tengah | Titik muncul (spawn), papan pengumuman, papan peringkat mingguan |
| **Ruang Bimbel** | Utara | Pintu masuk ke bimbel. Untuk sementara ruangan kosong dengan papan "Segera hadir" |
| **Ruang Game** | Timur | Tiga zona: meja catur, meja scramble, meja kartu |
| **Lahan cadangan** | Barat & selatan | Disiapkan untuk ruangan baru nanti, misalnya perpustakaan atau taman bermain |

Di setiap zona permainan ada beberapa **meja**. Pemain mendekati meja, lalu muncul menu: *Main dengan teman*, *Cari lawan*, atau *Lawan bot*.

## 2. Alur pengguna

### Orang tua
1. Mendaftar akun orang tua (email + kata sandi).
2. Memberi persetujuan pemakaian data anak.
3. Membuat akun anak: nama panggilan, jenjang (SD 1–6 / SMP / SMA), pilihan avatar.
4. Mengatur batas waktu main, izin chat, dan izin pertemanan.
5. Melihat dashboard: waktu bermain, permainan yang dimainkan, hasil, dan kemajuan.
6. Bisa masuk arena dengan avatar sendiri untuk bermain bersama anak.

### Anak
1. Masuk dengan memilih profilnya di perangkat orang tua dan memasukkan PIN, atau dengan kode masuk.
2. Muncul di Alun-alun.
3. Berjalan ke Ruang Game, lalu memilih meja.
4. Bermain dengan teman (lewat undangan atau kode meja), dengan pemain lain yang sejenjang, atau dengan bot.
5. Hasil permainan tersimpan dan mendapat poin.
6. Saat batas waktu hampir habis, muncul peringatan 5 menit. Setelah habis, anak diantar keluar dengan sopan.

## 3. Gaya visual

- 3D kartun **low-poly**, warna cerah, dan bentuk sederhana supaya ringan di HP.
- Avatar dengan **desain sendiri** (tidak meniru tampilan Roblox). Anak bisa mengatur warna kulit, rambut, baju, dan aksesori.
- Tombol besar dan ikon jelas, ramah untuk anak SD.
- Kontrol: keyboard dan mouse di laptop, joystick di layar untuk HP dan tablet.

## 4. Permainan

### Catur
- Aturan catur standar.
- Bot dengan beberapa tingkat: Pemula, Menengah, Mahir.
- Mode belajar untuk SD: langkah yang boleh ditampilkan, dan ada tombol petunjuk.

### Scramble (susun kata)
- Huruf diacak, lalu pemain menyusun kata secepat mungkin.
- Bahasa Indonesia dan Bahasa Inggris.
- Kata disesuaikan jenjang: kata pendek untuk SD awal, kosakata akademik untuk SMA.
- Multiplayer: siapa paling cepat dan paling banyak benar.

### Game kartu — usulan nama: **"Kartu Kilat"**
Permainan kartu dengan nama, aturan, dan tampilan sendiri, bukan Uno.
- Tujuan: menjadi yang pertama menghabiskan kartu di tangan.
- Kartu punya warna dan angka. Kartu boleh dimainkan jika warna atau angkanya sama dengan kartu teratas.
- Kartu khusus: Lewati, Balik Arah, Ambil 2, Ganti Warna.
- **Unsur asah otak:** di level lebih tinggi, kartu boleh juga dimainkan jika angkanya sama dengan **hasil hitungan** yang tertera di kartu teratas (misalnya "3 + 4" bisa disambung dengan 7). Tingkat soal hitungan menyesuaikan jenjang.

**Aturan yang dibangun (20 November 2026):**
- 100 kartu dalam 4 warna bertema: Matahari (oranye), Daun (hijau), Laut (biru), Anggur (ungu).
  - Per warna: angka 1–9 masing-masing 2 kartu, plus Lewati, Balik Arah, dan Ambil 2 masing-masing 2 kartu.
  - Ditambah 4 kartu Ganti Warna.
- Setiap pemain mendapat 6 kartu. Kartu pertama di meja selalu kartu angka.
- **Mode Hitung** (bawaan): kartu angka bertuliskan soal sesuai jenjang. Kartu boleh dimainkan bila warnanya sama, atau hasil hitungannya sama.
  - SD: tambah dan kurang, misalnya "3 + 4" atau "14 − 7".
  - SMP: kali dan bagi, misalnya "42 ÷ 6" atau "2 × 4".
  - SMA: pangkat dan akar, misalnya "√49" atau "4² − 11".
- **Mode Angka biasa:** angka saja. Kartu yang bisa dimainkan disorot, cocok untuk anak yang baru belajar.
- Kalau tidak punya kartu yang cocok, ambil 1 kartu. Kalau kartu itu cocok, boleh langsung dimainkan. Kalau tidak, giliran otomatis berpindah.
- Ambil 2 tidak bisa ditumpuk. Dengan 2 pemain, Balik Arah berfungsi seperti Lewati.
- Online: 30 detik per giliran. Kalau waktu habis, pemain otomatis mengambil kartu lalu lewat.
- Tidak ada hukuman untuk kartu salah: kartunya hanya bergoyang, lalu anak diminta menghitung lagi.

## 5. Keamanan anak

| Hal | Aturan usulan |
|-----|---------------|
| Persetujuan | Akun anak hanya bisa dibuat oleh orang tua yang menyetujui pemakaian data anak (sesuai UU Perlindungan Data Pribadi No. 27/2022) |
| Nama tampilan | Nama panggilan saja, tanpa nama lengkap, sekolah, atau alamat |
| Chat SD | Hanya pesan siap pakai, misalnya "Ayo main!", "Langkah bagus!", "Terima kasih" |
| Chat SMP/SMA | Teks bebas dengan filter kata, hanya jika diizinkan orang tua |
| Pertemanan | Permintaan pertemanan perlu persetujuan orang tua (bisa diatur) |
| Bermain dengan orang asing | Hanya sesama jenjang, dan bisa dimatikan orang tua |
| Laporkan & blokir | Tersedia di setiap profil pemain |
| Data | Hanya data yang perlu disimpan. Orang tua bisa meminta data anak dihapus |

## 6. Pertanyaan untuk ditinjau

1. Nama arena atau dunianya mau apa?
2. Apakah tata letak (bimbel di utara, game di timur) sudah pas?
3. Apakah "Kartu Kilat" dan aturannya sudah cocok?
4. Apakah aturan chat dan pertemanan sudah sesuai yang Anda inginkan?

---

## 7. Dashboard anak "Kamarku" (rancangan, belum dibangun)

Dirancang 21 November 2026, **fokus laptop**.

**Status:** Tahap 1 sudah dibangun (21 November 2026): kepala dengan Level/XP, waktu main, bintang dan aksesori, permainan, teman, dan tombol cepat. Kode: `game/src/kamarku-ui.js` dan `server/kamarku.js` (`GET /api/kamarku`, khusus sesi anak). 

**Tahap 2 juga sudah dibangun** (21 November 2026): kemajuan Ruang Pintar sekarang disalin ke server (`server/progres.js`, tabel `child_progres`, `GET/POST/DELETE /api/progres`). Ruang Pintar mengirimnya sekitar 1,5 detik setelah setiap perubahan dan saat dibuka, lalu server menggabungkannya tanpa mengurangi kemajuan: bintang terbaik dan angka diambil yang terbesar, medali digabung, dan riwayat tidak dobel. Ringkasan per pelajaran dihitung di Ruang Pintar karena server tidak punya daftar topik, jadi ringkasan baru diperbarui setelah anak membuka Ruang Pintar lagi (misalnya setelah orang tua mengganti kurikulum). Kamarku sekarang menampilkan medali, misi hari ini, kemajuan belajar, dan saran "coba ulangi". Kotak Aksesori hanya muncul bila anak belum pernah ke Ruang Pintar. Dashboard orang tua mendapat bagian "Ruang Pintar" berisi jumlah sesi, medali, kemajuan per pelajaran, topik yang perlu diulang, dan 5 tryout terakhir.

### Letak dan cara membuka
- Panel besar di atas arena (sekitar 1000 px lebar), bukan halaman terpisah, supaya anak tidak keluar dari dunia game.
- Dibuka dengan tombol **"Kamarku"** di pojok kanan atas (sebelah Chat dan Teman) atau tombol **K**. Ditutup dengan Esc, K, atau tombol Tutup.
- Selama panel terbuka, kontrol berjalan (WASD) dijeda.
- Muncul otomatis sekali sehari saat anak pertama kali masuk arena (bisa ditutup).

### Isi panel
| Bagian | Isi | Sumber data sekarang |
|--------|-----|----------------------|
| Kepala | Avatar beserta aura, nama, kelas, kurikulum, negara, Level dan batang XP, aura berikutnya | Server: `children` (xp, avatar, aksesori) |
| Waktu main | "Sisa 21 menit" hari ini dari batas orang tua | Server: `play_time`, `limit_min` |
| Bintang | Saldo, dan aksesori terdekat yang bisa dibeli | Server: `bintang`, `shared/aksesori.js` |
| Medali | Jumlah didapat dari total, medali terbaru | Server: `child_progres` |
| Misi hari ini | Tryout per pelajaran (sudah/belum), latihan 1 topik | Server: `child_progres` (`tryoutHari`, `history`) |
| Kemajuan belajar | Topik selesai per pelajaran, saran "coba ulangi" untuk topik berbintang rendah | Server: `child_progres` (`ringkasan`) |
| Permainanku | Main dan menang per game (tanpa menonjolkan kekalahan) | Server: `results` |
| Teman | Siapa yang sedang di arena, permintaan yang menunggu izin orang tua | Server: `friendships`, status online |
| Tombol cepat | Ke Ruang Bimbel, Ke Ruang Game, Buka Toko (avatar dipindah ke tempat itu) | — |

### Hal yang harus diputuskan sebelum dibangun
1. **Kemajuan Ruang Pintar perlu disimpan di server.** Sekarang topik, medali, dan riwayat tryout hanya ada di browser (`localStorage`), jadi akan berbeda di tiap perangkat dan hilang bila data browser dihapus. Usulan: tabel baru untuk ringkasan kemajuan per anak (topik dan bintang terbaik, medali, riwayat tryout 30 terakhir). Manfaat tambahan: dashboard orang tua juga bisa menampilkan kemajuan belajar.
2. **Tahap 1 tanpa sinkron**: bagian yang datanya sudah di server (kepala, waktu, bintang, permainan, teman) bisa dibangun lebih dulu; bagian belajar menyusul setelah sinkron.

### Aturan keamanan anak
- Hanya data milik anak sendiri. Tidak ada papan peringkat dengan pemain asing, dan tidak ada perbandingan dengan anak lain.
- Daftar teman hanya nama panggilan dan status di arena.
- Pengaturan (batas waktu, chat, pertemanan) tetap hanya bisa diubah orang tua; anak hanya melihat hasilnya.
- Bahasa positif: "Coba ulangi" bukan "Gagal", jumlah menang ditonjolkan, bukan kalah.

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

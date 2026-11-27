# Bimbel Pro — Arena

Dunia 3D bergaya Roblox untuk proyek parenting: Alun-alun, Ruang Bimbel (segera hadir), dan Ruang Game dengan tiga game asah otak.
Ada akun orang tua dan anak, batas waktu bermain, serta laporan untuk orang tua.
Rencana dan desain ada di [rencana-kerja.md](rencana-kerja.md) dan [desain.md](desain.md).

## Cara menjalankan

Butuh Node.js (sudah terpasang: v26).

```powershell
npm run install:all
```

```powershell
npm run dev
```

Lalu buka:
- Arena: http://localhost:5173
- Dashboard orang tua: http://localhost:5173/orangtua.html
- Dashboard anak: http://localhost:5173/anak.html (anak diarahkan ke sini setelah masuk)
- Di HP/tablet yang tersambung ke Wi-Fi yang sama: http://ALAMAT-IP-LAPTOP:5173 (alamatnya muncul di terminal pada baris "Network")

## Dasbor admin

Atur kunci admin di lingkungan server sebelum menjalankan Bimbel Pro. Untuk pengembangan lokal, jalankan ini di PowerShell yang sama dengan server.

```powershell
$env:BIMBEL_ADMIN_TOKEN = [guid]::NewGuid().ToString("N")
$env:BIMBEL_ADMIN_TOKEN
npm run dev
```

Buka [dasbor admin lokal](http://localhost:5173/admin.html) dan masukkan kunci yang muncul di terminal. Gunakan kunci yang hanya diketahui pengelola dan akses lewat HTTPS jika dasbor dipublikasikan.

Dasbor menampilkan jumlah akun orang tua dan anak yang tersimpan, jumlah akun terhubung ke Arena, serta jumlah akun unik yang ada di Arena atau terdeteksi aktif di dashboard dalam dua menit terakhir. Statistik aktivitas berlaku untuk satu proses server.

Di bagian **Pengaturan permainan**, admin bisa mengatur jumlah soal latihan Ruang Pintar per tingkat, komposisi kesulitan tryout, serta jumlah soal, waktu per soal, dan jumlah pilihan jawaban Lomba Matematika per tingkat. Nilai berlaku untuk sesi dan meja baru. Topik yang punya sedikit soal unik bisa menampilkan kurang dari jumlah yang disetel.

Di bagian **Katalog Toko Avatar**, admin bisa mengatur harga dalam bintang dan ketersediaan karakter serta aksesori yang sudah ada. Pemain tetap bisa memakai item yang sudah mereka miliki. Pengaturan dan katalog disimpan di database server.

## Cara memakai akun

1. **Orang tua** membuka dashboard, lalu mendaftar: memilih **Ayah** atau **Ibu**, mengisi nama, email, kata sandi, dan mencentang persetujuan data anak. Yang mendaftar pertama menjadi **kepala keluarga**.
2. Kepala keluarga bisa menambah pasangan lewat **Setting → Keluarga** dengan membuat akun berisi nama, email, dan kata sandi. Kedua orang tua punya hak yang sama atas anak-anak. Hanya kepala keluarga yang bisa mengeluarkan pasangan atau menghapus seluruh keluarga.
3. Di dashboard, orang tua **menambah akun anak**: nama panggilan, kelas, pilihan **Anak laki-laki** atau **Anak perempuan**, warna, dan PIN 4 angka.
4. Anak masuk dengan salah satu cara berikut:
   - **Perangkat keluarga** (orang tua sudah masuk di browser itu): buka arena, pilih nama anak, lalu masukkan PIN.
   - **Perangkat anak sendiri**: orang tua membuat nama pengguna dan kata sandi di Setting. Di perangkat anak, pilih "Masuk sebagai anak" dan isi keduanya.
5. Orang tua juga bisa **main sebagai orang tua**: pilih tingkat soal, lalu ajak anak bermain lewat kode meja.
6. **Tanpa akun** (mode tamu), pemain hanya bisa berjalan di arena dan melawan bot.

## Isi folder

| Folder | Isi |
|--------|-----|
| `game/` | Halaman browser: arena 3D (Babylon.js), layar masuk, tiga game, dan dashboard orang tua (`orangtua.html`) |
| `game/public/model/alam/` | Model pohon, semak, bunga, batu, dan rumput untuk arena (Kenney Nature Kit, CC0, lihat `LISENSI.txt` di folder itu). Bila gagal dimuat, arena memakai pohon versi kode |
| `game/test/` | Uji otomatis (`npm test --prefix game`), snapshot batas tabrakan arena, dan alat pengembang `lihat.html` untuk melihat arena tanpa akun (hanya saat `npm run dev`) |
| `server/` | API akun (`/api/...`), database SQLite, dan server multiplayer (Colyseus) |
| `server/data/` | File database `bimbel.db`. Dibuat otomatis dan tidak dibagikan |
| `shared/` | Kode yang dipakai bersama game dan server: daftar kata dan aturan Scramble, aturan Kartu Kilat dan bot-nya |
| `.claude/agents/` | Tim AI proyek (lihat bagian "Tim AI" di bawah), ditambah 14 agen dari Claude Code Game Studios (lisensi MIT, lihat file LICENSE di folder itu) |

## Tim AI

Tujuh agen khusus Bimbel Pro, berbahasa Indonesia. Panggil dengan menyebut namanya, misalnya *"pakai ketua-tim untuk menambah game baru"*.

| Agen | Tugas |
|------|-------|
| `ketua-tim` | Memecah tugas besar, membagi ke anggota tim, lalu memeriksa hasil gabungannya |
| `pengembang-arena` | Menulis kode arena 3D, game, dashboard orang tua, server, dan database |
| `penyusun-soal` | Membuat soal dan pembahasan untuk Kurikulum Merdeka, Cambridge, dan Singapura |
| `pemeriksa-soal` | Mengecek kunci jawaban, soal ambigu, bahasa, dan kecocokan jenjang (tidak mengubah file) |
| `penjaga-keamanan-anak` | Menjaga privasi dan keamanan anak: akun, chat, pertemanan, batas waktu, UU PDP |
| `penguji-aplikasi` | Menjalankan aplikasi dan membuktikan fitur bekerja di laptop dan ukuran HP |
| `penulis-dokumen` | Memperbarui README, rencana kerja, dan catatan dengan bahasa sederhana |

## Yang sudah bisa

- **Akun dan keamanan anak**
  - Akun orang tua dengan persetujuan data anak (UU PDP No. 27/2022). Kata sandi dan PIN disimpan dalam bentuk acak (scrypt)
  - Maksimal 6 akun anak per orang tua
  - Sesi disimpan di cookie HttpOnly. Ruang online hanya bisa dimasuki dengan tiket dari akun yang sudah masuk
  - Salah kata sandi 5 kali, akun dikunci 15 menit. Salah PIN 5 kali, PIN dikunci 15 menit
  - **Batas waktu bermain harian** dihitung server selama anak berada di arena: peringatan 5 menit sebelum habis, lalu anak otomatis dikeluarkan. Setelah itu anak tidak bisa masuk lagi sampai besok (hari dihitung WIB)
  - **"Cari lawan" dengan pemain lain** mati secara bawaan. Orang tua bisa mengizinkannya, dan anak tetap hanya dipertemukan dengan yang sejenjang. Kode meja dan lawan bot selalu boleh
  - Orang tua tidak bisa memakai "Cari lawan". Orang tua hanya bermain lewat kode meja bersama anak
- **Chat dan pertemanan**
  - Chat arena dengan tiga pilihan dari orang tua: **mati**, **pesan siap pakai** saja, atau **teks bebas yang disaring** (khusus SMP/SMA; untuk SD otomatis jadi siap pakai)
  - Saringan menolak kata kasar (termasuk yang disamarkan, misalnya "4nj1ng"), nomor telepon, email, tautan, dan akun media sosial
  - Setiap penerima hanya melihat pesan sesuai pengaturannya sendiri: anak dengan chat "siap pakai" tidak pernah melihat teks bebas pemain lain
  - Batas kecepatan: paling banyak 5 pesan per 15 detik, dan jeda 1,5 detik antar-pesan
  - Pesan muncul sebagai gelembung di atas avatar, dan ada juga riwayatnya di panel Chat
  - Ketuk avatar pemain lain untuk membuka profilnya: **Tambah teman**, **Laporkan** (dengan alasan), atau **Blokir**
  - Pertemanan hanya antar-anak. Secara bawaan perlu disetujui orang tua kedua anak, dan pengaturan ini bisa dimatikan
  - Panel Teman: daftar teman (dengan tanda yang sedang di arena), permintaan masuk, dan "Undang ke mejaku" untuk meja dengan kode. Teman yang diundang cukup menekan "Gabung"
  - Blokir: saling tidak melihat chat, dan pertemanan putus
  - Pemain yang dilaporkan 3 pemain berbeda dalam 24 jam otomatis dibisukan chatnya selama 24 jam
- **Dashboard orang tua**
  - Waktu bermain hari ini dibanding batasnya, dan grafik 7 hari
  - Statistik per game (main, menang, kalah, seri) dan 10 permainan terakhir
  - Pengaturan batas waktu, izin bermain dengan pemain lain, chat, dan persetujuan pertemanan
  - Setujui atau tolak permintaan teman, hapus pertemanan, dan buka blokir
  - Atur login anak, ganti PIN, hapus akun anak, hapus seluruh akun (semua data ikut terhapus)
- **Arena**
  - Berjalan dengan WASD/panah di laptop, atau joystick layar di HP/tablet. Kamera bisa diputar dengan geser dan di-zoom
  - Pemain lain terlihat secara online. Nama dan warna avatar diambil dari akun
- **Meja catur**
  - Lawan bot Pemula/Menengah/Mahir. Anak SD mendapat tombol Petunjuk
  - Cari lawan sejenjang, atau main dengan teman memakai kode meja 4 huruf
  - Langkah divalidasi di server
- **Meja scramble** (susun kata)
  - Bahasa Indonesia atau English, kata disesuaikan jenjang, dengan petunjuk berbahasa Indonesia
  - 6 ronde × 30 detik. Poin = 5 + sisa waktu/3, ditambah bonus 3 untuk yang pertama benar
  - Lawan bot, cari lawan (sejenjang dan sebahasa), atau kode meja untuk 2–4 pemain
- **Meja Kartu Kilat** (permainan kartu buatan sendiri, aturan lengkap di [desain.md](desain.md))
  - Cocokkan warna, atau hasil hitungan di kartu (mode Hitung, soal sesuai jenjang). Ada juga mode Angka biasa
  - Lawan 1–3 bot, cari lawan sejenjang, atau kode meja untuk 2–4 pemain. Kartu di tangan hanya dikirim ke pemiliknya
- Hasil setiap permainan anak (bot maupun online) tercatat untuk laporan orang tua
- Lawan bot tetap bisa dimainkan walau server mati

## Batasan prototipe (dikerjakan di tahap berikutnya)

- Email orang tua belum diverifikasi
- "Lupa kata sandi" sudah ada (tautan ke email, berlaku 30 menit, sekali pakai), tapi server belum memasang layanan email. Selama `RESEND_API_KEY` dan `MAIL_FROM` belum diisi, isi email beserta tautannya hanya ditulis ke log server. `APP_URL` mengatur alamat web di tautan (bawaan `http://localhost:5173`)
- Hasil permainan dikirim oleh browser, jadi anak yang paham teknis bisa memalsukan laporannya. Waktu bermain dihitung server, jadi tidak bisa dipalsukan
- Chat baru ada di arena, belum ada di dalam meja game
- Laporan pemain tersimpan di database, tapi belum ada panel moderator untuk meninjaunya. Saat akun dihapus, laporan tentang akun itu juga ikut terhapus
- Saringan kata masih berupa daftar sederhana dan perlu terus ditambah
- Blokir belum mencegah dua pemain bertemu di meja "Cari lawan"
- Cookie belum memakai tanda `Secure`, karena saat ini masih HTTP lokal. Wajib HTTPS sebelum dipakai di internet
- Promosi pion selalu menjadi ratu
- Daftar kata Scramble masih ±22–24 kata per jenjang per bahasa, dan perlu ditambah serta diperiksa guru
- Server memakai Colyseus 0.15 yang sudah lama. `npm audit` melaporkan 12 masalah di paket server, jadi harus ditingkatkan sebelum dipakai di internet
- Ukuran file game masih besar (±6,4 MB) karena seluruh Babylon.js ikut, dan nanti perlu dirampingkan

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
- **Ruang tunggu** (permintaan pengguna 22 November 2026): anak yang duduk di meja catur langsung masuk ruang tunggu meja itu, bersama pemain yang duduk di kursi seberang. Pop-up menampilkan kedua pemain dan status Siap; permainan baru mulai setelah **keduanya menekan ✅ Siap** (bisa dibatalkan). Bila lawan berdiri sebelum mulai, kursinya kosong lagi dan pemain yang tinggal menunggu lawan baru. Pilihan lain di pop-up: "Lawan bot saja" dan "Berdiri". Ruang tunggu juga dipakai untuk meja privat dengan kode. **Siapa saja yang duduk** (anak atau orang tua) masuk ruang tunggu meja itu; satu ruang per meja. Pemain kedua hanya diterima bila boleh semeja dengan yang sudah menunggu (`room-auth.js`): sekeluarga, sesama orang tua, sesama anak yang berteman, atau dua anak yang sama-sama diizinkan bermain dengan pemain lain dan sejenjang. Orang tua tidak dipasangkan dengan anak keluarga lain, dan pemain yang saling blokir tidak dipasangkan. Bila ditolak, menu lama tampil dengan alasannya. Server: status `siap` dan `whiteReady`/`blackReady` di `ChessRoom`.

### Tampilan arena: cahaya hangat dan bayangan lembut (22 November 2026)
- Permintaan pengguna: arena terlihat lebih seperti ilustrasi 3D yang hangat dan lembut (gaya umum saja, tidak meniru produk lain). Tahap 1 tanpa model baru, di `game/src/grafis.js`: cahaya matahari dan langit yang hangat, kabut tipis, warna rumput lebih lembut, dan tone mapping ACES.
- Tiga tingkat kualitas lewat tombol **✨ Grafis** di arena (disimpan per perangkat): **Rendah** (warna saja), **Sedang** (+ bayangan lembut matahari, FXAA, pendar halus, vinyet tipis), **Tinggi** (+ bayangan lebih tajam, ambient occlusion SSAO2, MSAA). Perkiraan awal: Tinggi bila WebGL2 dan prosesor 8 inti ke atas, selain itu Sedang.
- Uji di laptop pengembang (adegan arena + 7 avatar): Rendah 75 fps, Sedang 69 fps, Tinggi 66 fps. Tahap 2 dimulai (uji coba): karakter **Robo** memakai model 3D sungguhan **RobotExpressive.glb** (CC0, Tomás Laulhé/Quaternius, dari contoh three.js r160; lisensi di `game/public/model/robot/LISENSI.txt`), dimuat dengan `@babylonjs/loaders` 9.37.1. Kode: `game/src/model3d.js` (daftar model) dan `pakaiModel` di `avatar3d.js`: model dimuat sekali per adegan dan digandakan per avatar; selama memuat atau bila gagal, bentuk sederhana yang tampil. Animasi Idle/Walking/Sitting mengikuti gerak pemain; aksesori Toko dan hiasan anggota keluarga ditempel ke tulang kepala; profil tetap terbuka saat model diketuk; bahan model dipakai bersama. Model bertulang tidak membuat bayangan matahari (cukup bayangan bulat) supaya ringan. Uji 4 robot beranimasi + arena: Rendah 75, Sedang 49, Tinggi 46 fps. Karakter lain menyusul bila gaya modelnya disetujui.

### Ruang tunggu semua game meja online (22 November 2026)
- Permintaan pengguna: semua game meja memakai ruang tunggu seperti catur. **Catur, Scramble Words, dan Kartu Kilat**: permainan online baru mulai setelah **semua pemain di meja menekan ✅ Siap** (minimal 2; Siap bisa dibatalkan). Tombol "Mulai sekarang" milik pembuat meja dan mulai otomatis 10 detik **dihapus**. Pemain yang pergi sebelum mulai mengosongkan kursinya; bila sisa pemain sudah Siap semua, permainan mulai.
- Satu ruang per meja (`filterBy(["meja"])` di `server/index.js`); bahasa Scramble dan jenis Kartu mengikuti pemain pertama dan ditampilkan di ruang tunggu. Aturan semeja sama untuk ketiganya (`bolehSemeja` di `server/room-auth.js`): pemain baru harus boleh bermain dengan **semua** pemain yang sudah ada.
- Catur langsung masuk ruang tunggu saat duduk. Scramble dan Kartu tetap menampilkan menu dulu (memilih bahasa / jenis kartu), lalu "Main online di meja ini" membuka ruang tunggu. Tampilan bersama: `game/src/ruang-tunggu.js`.
- **Beda Gambar** sudah memakai Siap sejak awal. **Otello** hanya melawan bot (belum ada mode online), jadi tidak memakai ruang tunggu.

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

> **Diganti** pada 22 November 2026 oleh dashboard anak di `anak.html` (lihat bagian 8). Panel Kamarku di arena sudah dihapus; isinya pindah ke dashboard anak.

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

---

## 8. Penataan ulang dashboard orang tua dan anak

Dirancang 21 November 2026 dari susunan menu pengguna, **fokus laptop**. Kedua dashboard memakai menu di sisi kiri.

**Status (22 November 2026):** tahap 1 sudah dibangun. Dashboard orang tua memakai menu samping; setiap bagian kartu anak ditandai `data-hal` sesuai menunya, jadi isi lama tetap dipakai. Dashboard anak ada di `anak.html` (`game/src/anak.js`): setelah masuk dengan PIN atau kode, anak diarahkan ke sana; "Masuk arena" membuka `/?arena=1`, dan di arena ada tombol "Dashboard". Ruang Pintar punya tautan kembali ke dashboard. Panel Kamarku di arena dihapus (isinya pindah ke dashboard anak; data tetap dari `/api/kamarku`, kini ditambah menit bermain 7 hari). Menu Tugas, Keuangan, dan Chat masih bertuliskan "Segera hadir".

**Tahap 2 (Tugas) sudah dibangun (22 November 2026):** `server/tugas.js` dengan tabel `tugas` dan `tugas_catatan`. API orang tua: `GET/POST /api/tugas`, `DELETE /api/tugas/:id` (tugas dinonaktifkan, riwayat tetap), `POST /api/tugas/:id/setujui` dan `/belum` dengan `{ tanggal }`. API anak: `GET /api/tugas/saya` dan `POST /api/tugas/:id/sudah`. Bintang hadiah 0–5 masuk ke saldo anak saat disetujui; maksimal 30 tugas aktif per anak. Anak yang sedang di arena mendapat pemberitahuan saat ada tugas baru atau tugasnya dicek. Tugas "sekali" tampil sampai disetujui. Tugas belajar yang tercentang otomatis dari Ruang Pintar **belum** dibuat; jenis Belajar sekarang ditandai manual seperti tugas lain.

**Tahap 3 (Chat) sudah dibangun (22 November 2026):** `server/chat.js`.
- Chat keluarga: tabel `pesan_keluarga`, satu percakapan per anak dengan orang tuanya. API `GET/POST /api/chat/keluarga` dengan `sebagai=ortu|anak` (di perangkat keluarga orang tua dan anak bisa sama-sama masuk), dan `GET /api/chat/belum` untuk tanda pesan baru (anak juga mendapat pesan terakhir dan nama orang tua untuk Home). Pesan maksimal 300 huruf, disaring kata kasar (`cekPesanKeluarga` di `shared/chat.js`), paling banyak 10 pesan per 30 detik, disimpan 500 pesan terakhir per anak. Anak yang sedang di arena mendapat pemberitahuan pesan dari orang tua. Pesan dimuat ulang tiap 5 detik selama menu Chat terbuka.
- **Chat keluarga di arena** (permintaan pengguna 22 November 2026): tombol **💬 Keluarga** di arena (untuk anak dan orang tua) membuka panel berisi percakapan **Family** dan chat pribadi (anak: dengan orang tuanya; orang tua: tiap anaknya), dengan tanda pesan belum dibaca. Memakai API yang sama dengan menu Chat di dashboard, jadi pesannya sama di kedua tempat. Pesan suara bisa diputar, tetapi merekam suara hanya dari dashboard. Kode: `game/src/chat-keluarga-arena.js`.
- Riwayat chat arena: tabel `chat_arena_log`, hanya pesan yang **dikirim** anak (pesan pemain lain tidak disimpan), dihapus otomatis setelah 7 hari, dibaca orang tua lewat `GET /api/chat/arena?anak=ID`.
- "Data apa yang disimpan?" di halaman daftar sudah menyebut kedua jenis chat ini.

**Tahap 4 (Keuangan) sudah dibangun (22 November 2026):** `server/keuangan.js` dengan tabel `keuangan_catatan` dan `keuangan_target`. Hanya catatan; tidak ada uang sungguhan yang berpindah, dan bintang tetap terpisah (hanya untuk Toko Avatar). Dua kantong: **dompet** (uang saku + pemasukan dari luar − dibelanjakan − ditabung + diambil) dan **tabungan** (ditabung − diambil). Saldo tidak boleh minus, baik saat mencatat maupun saat menghapus catatan. Satu target tabungan per anak. Setiap catatan menyimpan siapa yang mencatat (kolom `oleh`: ortu/anak).
- **Orang tua hanya memberi uang** (keputusan pengguna 22 November 2026): `GET/POST /api/keuangan` (POST hanya jenis "masuk"; jenis lain ditolak 403) dan `DELETE /api/keuangan/:id` untuk pemberiannya sendiri. Anak yang sedang di arena diberi tahu saat menerima uang saku. Target tabungan hanya ditampilkan.
- **Anak mencatat sendiri** di menu Keuangan dashboard anak: `POST /api/keuangan/saya` (pemasukan dari luar seperti hadiah dari nenek — jenis `luar`, terpisah dari uang saku orang tua —, belanja, menabung, ambil dari tabungan; paling banyak 30 catatan per hari; keterangan disaring kata kasar), `PUT/DELETE /api/keuangan/saya/target`, dan `DELETE /api/keuangan/saya/:id` untuk catatannya sendiri. Catatan dari orang tua tidak bisa dihapus anak. Panel "Uang sakuku" juga tampil di Home dan Report.
- **Hadiah tukar bintang** (permintaan pengguna 22 November 2026, contoh "50 bintang = Rp10.000"): `server/hadiah.js` dengan tabel `hadiah` (daftar hadiah keluarga, berlaku untuk semua anak; uang atau bukan uang) dan `hadiah_tukar`. Anak mengajukan penukaran (`POST /api/hadiah/:id/tukar`, paling banyak 3 yang menunggu; bintang yang diajukan ditahan) dan boleh membatalkan. Orang tua menyetujui atau menolak (`POST /api/hadiah/tukar/:id/setujui|tolak`). Bintang baru berkurang saat disetujui, dan hadiah uang otomatis dicatat sebagai uang saku masuk di Keuangan ("Tukar N bintang: …"). Bila bintang anak sudah terpakai di Toko Avatar sebelum disetujui, persetujuan ditolak. Tampil di menu **Tugas** kedua dashboard (dipindah dari Keuangan atas permintaan pengguna, karena bintang didapat dari tugas); hasil hadiah uang tetap tercatat di Keuangan. Home orang tua memberi tanda bila ada penukaran yang menunggu.

### Dashboard orang tua (`orangtua.html`)
Di bagian atas ada pilihan anak (Budi / Liliya), kecuali di menu Home yang menampilkan semua anak.

| Menu | Isi |
|------|-----|
| **Home** | Satu kartu per anak: sisa waktu main hari ini, tugas hari ini (selesai/menunggu dicek), ringkasan belajar, pesan baru, dan hal yang perlu tindakan (permintaan teman, tugas menunggu persetujuan). **Kegiatan belajar menunggu tanggapan** (22 November 2026): latihan Ruang Pintar per hari (mis. "Latihan 16 sesi · 160 soal · 68% benar") dan tiap tryout (pelajaran, nilai, bintang) dari 7 hari terakhir. Orang tua menanggapi dengan **👏 Hebat!**, **💪 Semangat!** (keduanya juga dikirim sebagai pesan ke chat pribadi anak), atau **✔ Sudah dilihat**. Tanggapan disimpan di tabel `tanggapan_belajar`; kegiatannya dihitung dari kemajuan Ruang Pintar (`server/tanggapan-belajar.js`, `GET /api/kegiatan-belajar`, `POST /api/kegiatan-belajar/tanggapan`) |
| **Tugas** | Orang tua membuat tugas: judul, jenis (Ibadah, Rumah, Belajar, Lainnya), jadwal (sekali, setiap hari, atau hari tertentu), dan bintang hadiah (boleh 0). Anak menandai "Sudah", lalu orang tua menekan **Setujui** atau **Belum**. Tugas belajar (mis. "2 latihan Matematika") bisa tercentang otomatis dari Ruang Pintar |
| **Arena** | Hasil Catur, Scramble, dan Kartu Kilat, permainan terakhir, daftar teman dan persetujuan pertemanan, pemain yang diblokir, dan izin arena (Cari lawan, jenis chat) |
| **Keuangan** | Orang tua **hanya memberi uang saku** (keputusan pengguna 22 November 2026). Anak sendiri mencatat pemasukan dari luar, belanja, menabung, dan mengambil tabungan, serta memasang target tabungan. Orang tua melihat semuanya. Terpisah dari bintang |
| **Chat** | (1) Chat keluarga: pesan antara orang tua dan anaknya. (2) Riwayat chat arena anak, hanya bisa dibaca |
| **Report** | Waktu main 7 hari, kemajuan Ruang Pintar per pelajaran, riwayat tryout, medali, dan tugas yang selesai minggu ini. **Laporan Ruang Pintar** (22 November 2026): isi menu "Laporan Orang Tua" di Ruang Pintar juga tampil di sini — soal dikerjakan, persen benar, sesi, terakhir berlatih, saran, **semua pelajaran dan semua topik di kelas dan kurikulum anak** (per pelajaran: jumlah topik dilatih, lalu tiap topik dengan tingkat yang dilatih, jumlah soal, ketepatan, dan status Perlu latihan / Berkembang / Sudah kuat / **Belum dilatih**), tabel "Topik lain yang pernah dilatih" (dari kelas atau kurikulum lain), dan 10 tryout terakhir. Bila kelas anak belum diatur, hanya topik yang pernah dilatih yang tampil. Angka dari kemajuan di server. Nama pelajaran dan topik diambil dari Ruang Pintar sendiri: dashboard memuat `/bimbel/index.html?daftar-topik` dalam iframe tersembunyi yang hanya mengirim daftar topik lalu berhenti (tidak membaca atau menyinkronkan kemajuan anak), jadi semua topik yang pernah dilatih langsung tampil dengan nama pelajarannya. Kode: `game/src/laporan-rp.js`, `laporanBelajar` di `server/progres.js` |
| **Avatar** | Ditambahkan 22 November 2026 atas permintaan pengguna: **hanya avatar orang tua sendiri** (dipakai saat bermain di arena). Modelnya sama dengan menu Avatar anak: kartu besar di atas, lalu tab **Karakter** dan **Aksesori**. Semua aksesori gratis untuk orang tua (kolom `parents.aksesori_pakai`, `POST /api/avatar/aksesori`), terlihat juga di arena. Aura tetap khusus hadiah belajar anak. Avatar anak dipilih anak di dashboardnya, dan orang tua tetap bisa menggantinya di Setting |
| **Setting** | Per anak: kurikulum, kelas, negara, batas waktu, ganti avatar anak, ganti PIN, buat kode masuk, dan hapus akun anak. Untuk orang tua: hapus akun |

### Dashboard anak (halaman baru, sebelum arena)
Setelah anak masuk (PIN atau kode), ia melihat dashboard ini dulu, bukan langsung arena. Dari arena ada tombol kembali ke dashboard. Panel Kamarku di arena diganti tombol "Dashboard".

| Menu | Isi |
|------|-----|
| **Home** | Level dan aura, sisa waktu main, bintang, medali, tugas hari ini, pesan baru dari orang tua, tombol cepat Masuk arena dan Belajar |
| **Tugas** | Daftar tugas dari orang tua dengan tombol **Sudah**, status (menunggu dicek / disetujui), dan bintang hadiah. Misi belajar harian juga di sini |
| **Arena** | Tombol masuk dunia 3D, teman yang sedang di arena, dan hasil permainanku |
| **Bimbel** | Tombol membuka Ruang Pintar, kemajuan per pelajaran, misi tryout hari ini, dan saran "coba ulangi" |
| **Keuangan** | Uang saku dari orang tua, dompet dan tabungan, ringkasan bulan ini, dan riwayat. Anak mencatat sendiri pemasukan dari luar (mis. hadiah), belanja, menabung, dan ambil tabungan, serta memasang target tabungannya |
| **Report** | Waktu main 7 hari, medali, riwayat tryout, dan hasil permainan |
| **Chat** | Chat dengan orang tua. Chat dengan pemain lain tetap di dalam arena |
| **Avatar** | Saldo bintang di samping nama, lalu tiga tab: **Karakter** (pilih avatar), **Aksesori** (pakai/lepas aksesori yang sudah dimiliki), dan **Aura** (semua aura; yang belum terbuka menunjukkan level yang dibutuhkan, yang sudah terbuka bisa dipilih, atau "Tanpa aura"). Pilihan aura disimpan di server (`children.aura_pakai`, `POST /api/toko/aura`) sehingga juga terlihat di arena; bila anak belum memilih, aura tertinggi untuk levelnya dipakai otomatis |
| **Toko Avatar** | Menu sendiri (dipisah dari Avatar): tukar bintang dengan karakter dan aksesori, lalu pakai atau lepas. Karakter dijual satu kartu per jenis (tanpa tulisan ayah/ibu/anak), langsung dalam versi anak itu (laki-laki/perempuan), dan langsung terlihat saat toko dibuka. Jenis karakter: Ulat, Robo, Beruang, Kelinci, Penguin, Kodok, dan **12 shio** (ditambahkan 22 November 2026 atas permintaan pengguna): Tikus, Kerbau, Macan, Kelinci, Naga, Ular, Kuda, Kambing, Monyet, Ayam, Anjing, Babi. Gambar 2D di `shared/avatar-svg.js`, bentuk 3D arena di `game/src/avatar3d.js`. Avatar 3D diperhalus (22 November 2026, gaya tetap lucu): bentuk lebih mulus, kilau lembut dan cahaya tepi, bayangan lembut di kaki, tangan kecil yang berayun saat berjalan, serta bernapas dan berkedip saat diam |

### Data baru di server
- `tugas` (orang tua, anak, judul, jenis, jadwal, bintang, aktif) dan `tugas_catatan` (tugas, tanggal, status: menunggu / disetujui / belum). Bintang hadiah ditambahkan saat orang tua menyetujui.
- `pesan_keluarga` (keluarga, pengirim, penerima, isi, waktu, dibaca). Hanya antar anggota keluarga yang sama.
- `chat_arena_log` (anak, isi, waktu, ruang): **disimpan 7 hari** lalu dihapus otomatis, hanya bisa dibaca orang tua anak itu.
- `keuangan` (anak, jenis: masuk/keluar/tabung, jumlah, catatan, tanggal), bila isi menu Keuangan disetujui.

### Keamanan anak
- Chat keluarga hanya antara orang tua dan anaknya sendiri. Tidak bisa dipakai untuk menghubungi keluarga lain.
- Riwayat chat arena disimpan sesingkat mungkin (7 hari) dan disebutkan di "Data apa yang disimpan?" saat mendaftar (UU PDP).
- Teks chat keluarga tetap melewati saringan kata yang sama dengan arena.
- Anak tidak bisa mengubah tugas atau pengaturan. Anak hanya bisa menandai tugas "Sudah", dan mencatat belanja/tabungan serta target tabungannya sendiri (bukan uang saku dari orang tua).

### Tahapan pembangunan
1. **Kerangka menu**: menu samping di kedua dashboard, halaman dashboard anak sebelum arena, dan isi yang sudah ada dipindah ke menu yang cocok (Home, Arena, Bimbel, Report, Setting, Avatar).
2. **Tugas**: membuat, menandai, dan menyetujui tugas, serta bintang hadiah.
3. **Chat**: chat keluarga, lalu riwayat chat arena untuk orang tua.
4. **Keuangan**: setelah isinya dipastikan.

---

## 9. Keluarga: kepala keluarga, Ayah dan Ibu

Dibangun 22 November 2026 atas permintaan pengguna.

- **Daftar:** pendaftar memilih **Ayah** atau **Ibu** (kartu bergambar; avatar awal `manusia-ayah` / `manusia-ibu`). Tanpa kode undangan, ia menjadi **kepala keluarga** (`parents.kepala_id` kosong).
- **Orang tua kedua:** kepala keluarga (atau anggota) membuat **kode undangan** 6 huruf di Setting → Keluarga (`POST /api/keluarga/undang`, tabel `undangan_ortu`, berlaku 24 jam, sekali pakai). Pasangan mendaftar dengan email dan kata sandinya sendiri, memilih peran yang belum terisi, lalu mengisi kode; `kepala_id` diisi id kepala keluarga. Satu keluarga paling banyak dua orang tua (satu Ayah, satu Ibu).
- **Hak:** sama persis untuk kedua orang tua (keputusan pengguna): anak, tugas, hadiah, uang saku, chat, pengaturan, tambah dan hapus anak. Semua data anak tetap atas nama kepala keluarga (`children.parent_id`); di server, `keluargaId` dipakai untuk data anak dan `ortuSaya` untuk hal pribadi (avatar, aksesori, hapus akun saya).
- **Khusus kepala keluarga:** mengeluarkan orang tua kedua (`POST /api/keluarga/anggota/:id/keluarkan`; akunnya tetap ada tetapi tidak terhubung lagi, dan sesinya diakhiri) dan menghapus seluruh keluarga. Orang tua kedua yang menghapus akunnya hanya menghapus akunnya sendiri.
- **Peran** bisa diganti di Setting (`PATCH /api/keluarga/peran`), asal tidak sama dengan pasangan.
- **Chat keluarga** mencatat orang tua pengirim (`pesan_keluarga.ortu_id`): pesan pasangan tampil di sisi kiri beserta namanya, anak melihat nama Ayah/Ibu di atas pesan, dan judul chat anak menampilkan nama keduanya. Pemberitahuan uang saku dan chat ke anak memakai nama orang tua yang mengirim.
- **Tambah anak:** langsung memilih **Anak laki-laki** atau **Anak perempuan** (avatar `manusia-putra` / `manusia-putri`).
- **Pemilih avatar tanpa anggota:** di menu Avatar orang tua, menu Avatar anak, dan "Ganti avatar anak" di Setting, hanya karakter (Manusia, Ulat, Robo, …) yang dipilih. Anggota keluarga otomatis: orang tua mengikuti perannya (Ayah/Ibu), anak mengikuti laki-laki/perempuan dari avatarnya (`anggota` di `avatar-picker.js`). Mengganti peran di Setting ikut mengganti avatar ke anggota yang sesuai.
- Akun lama otomatis menjadi kepala keluarga dengan peran Ayah; perannya bisa diganti di Setting.

### Toko Avatar orang tua (22 November 2026)
- Atas permintaan pengguna, **orang tua diperlakukan sama dengan anak**: punya saldo bintang sendiri (`parents.bintang`), membeli karakter dan aksesori di menu **🛍️ Toko Avatar** dengan harga yang sama (`server/toko-ortu.js`, `GET /api/toko-ortu`, `POST /api/toko-ortu/beli-avatar|beli|pakai`). Ini menggantikan aksesori gratis untuk orang tua.
- Katalog karakter orang tua hanya versi perannya (Ayah: `<jenis>-ayah`, Ibu: `<jenis>-ibu`), karena anggota avatar orang tua otomatis. Karakter yang dibeli dicatat di tabel `parent_avatar`.
- Aksesori yang sudah dipakai orang tua sebelum toko ini ada dianggap sudah dimiliki (`parents.aksesori_punya`), jadi tidak hilang. Tab Aksesori di menu Avatar kini hanya menampilkan yang dimiliki.
- **Sumber bintang orang tua belum ada**; pengguna akan menentukannya nanti. Server sudah menyediakan `tambahBintangOrtu(parentId, n)` di `server/toko-ortu.js`.

### Kantor dan Sawah orang tua (22 November 2026)
- Orang tua memulai sesi kerja 1 jam di meja Kantor atau Sawah dalam arena (`server/kantor.js`); setelah selesai, bintang diambil di tempat yang sama. Keluarga melihat avatar orang tua yang sedang bekerja di kantor.
- **Selama bekerja, orang tua tidak bisa masuk arena** (permintaan pengguna): "Mulai bekerja" membawa orang tua keluar dari arena ke layar **💼 Sedang bekerja** berisi hitung mundur. Masuk arena ("Main sebagai orang tua" atau tautan dashboard) juga menampilkan layar itu, dan server menolak masuk arena (`ArenaRoom.onAuth`, kode 4409).
- Tombol **⏹ Stop kerja** (`POST /api/kantor/stop`) menghentikan sesi yang belum selesai **tanpa bintang**, lalu orang tua langsung masuk arena. Bila sesi sudah selesai, tombolnya menjadi "Masuk ke arena" untuk mengambil bintang di Kantor/Sawah.

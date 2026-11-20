# Rencana Kerja — Proyek Parenting (Bimbel Pro)

Disusun 20 November 2026 dari [catatan-proyek.md](catatan-proyek.md).
Semua durasi di bawah adalah perkiraan kasar dan akan disesuaikan setelah Tahap 0 selesai.

## Gambaran proyek

Sebuah dunia 3D bergaya Roblox untuk anak-anak. Di dalamnya ada arena terbuka dengan beberapa ruangan:

- **Ruang bimbingan belajar** dengan 3 kurikulum: Kurikulum Merdeka, Cambridge, dan Kurikulum Singapura.
- **Ruang game** untuk bermain online bersama teman atau melawan bot. Permainannya catur, scramble (menyusun kata), dan permainan kartu sejenis Uno, semuanya untuk mengasah otak.

---

## Tahap 0 — Keputusan dasar (1–2 minggu)

Tujuan tahap ini adalah menjawab pertanyaan terbuka sebelum mulai membangun.

| No | Keputusan | Pilihan / catatan |
|----|-----------|-------------------|
| 1 | Target usia / jenjang | Misalnya SD kelas 1–6, atau SD + SMP |
| 2 | **Platform** | **A.** Dibuat di dalam Roblox (Roblox Studio). Multiplayer, server, dan avatar sudah tersedia, jadi paling cepat. Kekurangannya, Anda terikat aturan dan pendapatan Roblox, dan dashboard orang tua harus dibuat terpisah. **B.** Aplikasi/game sendiri yang bergaya Roblox (misalnya Unity atau Godot plus server sendiri). Kendali penuh, tapi biaya dan waktunya jauh lebih besar. |
| 3 | Perangkat | HP, tablet, komputer, browser |
| 4 | Mata pelajaran awal | Contoh: Matematika dan Bahasa Inggris dulu |
| 5 | Bentuk bimbel | Video, latihan soal, kelas langsung dengan tutor, atau campuran |
| 6 | Peran orang tua | Memantau kemajuan, membatasi waktu bermain, mengatur siapa yang boleh jadi teman |
| 7 | Model bisnis | Langganan, per kurikulum, gratis + premium |
| 8 | Tim dan anggaran | Developer game, desainer 3D, penyusun materi, tutor |

**Hasil:** satu halaman ringkasan keputusan.

### Keputusan yang sudah diambil (20 November 2026)

| No | Keputusan | Jawaban |
|----|-----------|---------|
| 1 | Target usia / jenjang | SD kelas 1–6, SMP, dan SMA |
| 2 | Platform | **Aplikasi sendiri** bergaya Roblox, bukan di dalam Roblox |
| 3 | Perangkat | Laptop, HP, dan tablet |
| 4 | Mata pelajaran awal | Dilewati dulu. Bimbel **sedang dibuat terpisah** |
| 5 | Bentuk bimbel | Dilewati dulu (sama seperti no. 4) |
| 6 | Peran orang tua | Pantau kemajuan, batasi waktu main, atur pertemanan dan chat, **ikut bermain** bersama anak |
| 7 | Model bisnis | Langganan bulanan |
| 8 | Tim | Dibangun sendiri dengan bantuan Claude |
| 9 | Hubungan dengan bimbel | **Satu aplikasi:** bimbel yang sedang dibuat nanti dimasukkan ke ruang bimbel di dalam game |

**Dampaknya pada rencana:**

- Fokus pertama adalah **arena 3D dan ruang game**. Ruang bimbel cukup disiapkan sebagai ruangan kosong yang nanti diisi bimbel yang sedang dibuat.
- Karena ini aplikasi sendiri, perlu dipilih **mesin game (engine)** yang bisa diekspor ke laptop, HP, dan tablet, plus **server multiplayer** untuk bermain online.
- Usia SD sampai SMA cukup lebar, jadi tampilan dan tingkat kesulitan game perlu bisa disesuaikan per jenjang.
- Orang tua juga punya akun dan bisa masuk arena, jadi perlu **akun orang tua yang terhubung dengan akun anak**.

### Teknologi (diputuskan 20 November 2026)

| Bagian | Pilihan |
|--------|---------|
| Mesin game 3D | **Web 3D:** Babylon.js (atau Three.js), berjalan di browser |
| Server multiplayer | **Colyseus** (Node.js), untuk bermain online bersama teman |
| Perangkat | Satu kode untuk laptop, HP, dan tablet. Nanti bisa dibungkus jadi aplikasi HP (misalnya Capacitor) |
| Gaya grafis | Kartun low-poly, supaya tetap ringan di HP |

**Alasan:** semuanya berupa kode, jadi Claude bisa menulis, menjalankan, dan menguji langsung. Satu kode bisa dipakai di semua perangkat, dan paling mudah digabung dengan bimbel jika bimbel berbasis web.

### Keputusan yang masih terbuka

- **Bimbel:** dibuat dengan bantuan Claude di tempat lain dan belum ditunjukkan di sini. Perlu dilihat kodenya (folder atau file) untuk memastikan cara menggabungkannya ke ruang bimbel.
- Harga langganan.

## Tahap 1 — Desain (2–4 minggu)

- Peta arena: tata letak area terbuka dan letak setiap ruangan.
- Alur pengguna: anak masuk, pilih ruangan, belajar atau bermain, lalu orang tua melihat laporan.
- Gaya visual: karakter, warna, suasana.
- Struktur materi per kurikulum: daftar bab dan topik untuk mata pelajaran awal.
- Aturan keamanan anak: chat (dibatasi atau hanya pesan siap pakai), sistem pertemanan, laporan dan blokir, perlindungan data anak.
- Desain permainan sendiri untuk game kartu sejenis Uno, dengan nama, aturan, dan tampilan sendiri.

**Hasil:** dokumen desain, sketsa arena, dan daftar materi.

**Status (20 November 2026):** desain di [desain.md](desain.md) **sudah disetujui**. Tahap 1 selesai. Bagian materi dilewati karena bimbel dibuat terpisah.

## Tahap 2 — Prototipe / MVP (6–10 minggu)

Mulai dari versi kecil yang bisa dicoba:

- Arena dengan 2 ruangan (bimbel dan game).
- Ruang bimbel: ruangan disiapkan dulu, isinya menyusul dari bimbel yang sedang dibuat.
- Ruang game: **catur** online (anak lawan anak) dan melawan bot.
- Akun anak dan login sederhana.

**Hasil:** versi yang bisa dimainkan untuk diuji di internal.

**Status (20 November 2026):** prototipe pertama sudah jalan. Isinya arena 3D, avatar, pemain online, dan catur (lawan bot 3 level, cari lawan, kode meja teman). Cara menjalankan dan daftar batasannya ada di [README.md](README.md). Belum dikerjakan: login dengan akun orang tua.

**Tahap 3 dimulai (20 November 2026):** game **Scramble** sudah jadi. Fiturnya: bahasa Indonesia/English, kata per jenjang, lawan bot, cari lawan sejenjang, dan kode meja untuk 2–4 teman. **Kartu Kilat** juga sudah jadi: mode Hitung dengan soal per jenjang, mode Angka biasa, lawan 1–3 bot, dan online 2–4 pemain. Ketiga game di Ruang Game kini bisa dimainkan. Berikutnya: akun dan dashboard orang tua, kurikulum, dan sistem poin.

**Akun dan dashboard orang tua sudah jadi (20 November 2026):** daftar dengan persetujuan data, akun anak dengan PIN dan kode masuk, batas waktu harian yang ditegakkan server, izin "cari lawan", orang tua bisa main bersama anak, dan laporan waktu bermain serta hasil permainan. Rinciannya ada di [README.md](README.md). Berikutnya: chat terbatas dan pertemanan dengan persetujuan orang tua, kurikulum di Ruang Bimbel, dan sistem poin.

**Chat dan pertemanan sudah jadi (20 November 2026):**
- Chat arena (mati, siap pakai, atau teks bebas tersaring) dengan gelembung pesan.
- Profil pemain dengan tombol tambah teman, laporkan, dan blokir.
- Pertemanan dengan persetujuan orang tua, plus undangan ke meja dengan kode.
- Pembisuan otomatis setelah 3 laporan.

Berikutnya: kurikulum di Ruang Bimbel (menggabungkan bimbel yang sedang dibuat), sistem poin, dan panel moderator laporan.

## Tahap 3 — Pengembangan lanjutan (8–12 minggu)

- Tambah game **scramble** dan **game kartu**, masing-masing dengan bot.
- Tambah kurikulum kedua dan ketiga.
- **Dashboard orang tua:** laporan belajar, waktu bermain, pengaturan.
- Sistem hadiah atau poin supaya belajar dan bermain saling terhubung. Contoh: menyelesaikan latihan membuka game.

## Tahap 4 — Uji coba (beta) (3–4 minggu)

- Uji dengan sekelompok kecil anak dan orang tua.
- Kumpulkan masukan, perbaiki bug, sesuaikan tingkat kesulitan.

## Tahap 5 — Peluncuran dan pemeliharaan

- Peluncuran resmi dan promosi.
- Tambah materi dan game secara berkala.
- Pantau keamanan dan masukan dari orang tua.

---

## Hal yang perlu diperhatikan

- **Hak cipta materi:** Kurikulum Merdeka bersifat publik. Untuk Cambridge dan Kurikulum Singapura, materi sebaiknya disusun sendiri agar sesuai silabusnya, bukan menyalin buku atau soal resmi. Cek juga aturan pemakaian nama dan logonya.
- **Merek dagang:** nama "Uno" dan "Roblox" tidak dipakai di produk. Game kartu dibuat dengan nama dan desain sendiri.
- **Keamanan anak:** karena penggunanya anak-anak, chat, pertemanan, dan data pribadi harus diawasi ketat sejak awal.

## Langkah berikutnya

Jawab pertanyaan di Tahap 0, terutama **platform (Roblox atau aplikasi sendiri)** dan **target usia**. Dua keputusan ini paling menentukan pekerjaan berikutnya.

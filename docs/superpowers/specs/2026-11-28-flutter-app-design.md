# Desain: Bimbel Pro versi Flutter (tahap 1)

Tanggal: 28 November 2026. Status: menunggu persetujuan.

## Maksud

Bimbel Pro punya aplikasi Flutter yang bisa dipasang di HP, tablet, dan laptop. Aplikasi ini bukan versi web yang dibuka di browser. Tahap 1 berisi **login orang tua dan anak** serta **dashboard orang tua**. Ruang Bimbel, game, dan arena 3D menyusul di tahap berikutnya.

## Keputusan pengguna

- **Klien saja.** Aplikasi memakai server Node yang sudah ada (`server/`), tanpa menulis ulang server.
- **Cara A.** Tampilannya dibuat asli dengan Flutter, bukan WebView yang membungkus halaman web.
- **Tahap 1:** login orang tua dan anak, serta dashboard orang tua.
- **Platform:** Android, Windows, iOS, dan Web.

## Batasan

- **Server dan `server/data/bimbel.db` tidak boleh diubah atau terganggu**, karena sedang dipakai tester.
- Semua pengujian memakai server kedua di port lain (misalnya 2600) dengan `BIMBEL_DB` yang menunjuk ke file database percobaan di folder sementara.
- **iOS tidak bisa dibuat atau diuji di laptop Windows ini.** Kodenya disiapkan, lalu dibangun nanti di Mac.
- Alat yang perlu dipasang di laptop ini (dengan izin pengguna):
  - Flutter SDK
  - Visual Studio Build Tools C++, untuk versi Windows
  - Android Studio dan Android SDK, untuk APK

## Cara kerja dengan server (tanpa mengubah server)

- **Endpoint yang dipakai:**
  - `POST /api/masuk` untuk orang tua dan anak. Isinya `{login, password}`. Kalau yang masuk anak, jawabannya `{sebagai:"anak"}`.
  - `GET /api/saya`
  - `GET /api/laporan`
  - `PATCH /api/anak/:id`, dengan isi `limitMin` (0–600), `allowStrangers`, `approveFriends`, dan `chat` (mati / siap pakai / teks bebas).
  - `POST /api/keluar` dan `POST /api/anak/keluar`.
- **Setiap permintaan selain GET** mengirim header `x-bimbel: 1`, karena server memakainya sebagai perlindungan CSRF.
- **Sesi di Android, iOS, dan Windows:**
  - Aplikasi membaca `Set-Cookie` (`bp_ortu` / `bp_anak`) dari jawaban server.
  - Nilainya disimpan di penyimpanan aman perangkat (`flutter_secure_storage`).
  - Di setiap permintaan, nilai itu dikirim lagi sebagai header `Cookie`.
  - Sesi berlaku 30 hari, mengikuti aturan server.
- **Sesi di Web:**
  - Cookie diurus browser, jadi aplikasi tidak menyimpannya sendiri.
  - Karena aturan browser, aplikasi web harus dibuka dari alamat yang sama dengan API.
  - Disediakan skrip kecil `flutter_app/tool/serve_web.mjs`. Skrip ini menyajikan `build/web` dan meneruskan `/api/...` ke server. Server tidak diubah.
- **Alamat server bisa diatur di aplikasi** (layar "Alamat server"), karena alamat `trycloudflare.com` berganti setiap kali `npm run online` dijalankan.
  - Bawaannya `http://10.0.2.2:2567` untuk emulator Android dan `http://localhost:2567` untuk yang lain.
  - Di versi Web, alamatnya selalu sama dengan alamat halaman.

## Layar tahap 1

1. **Masuk:** satu formulir untuk ID masuk atau email, kata sandi, tautan "Alamat server", dan pesan galat dari server dalam bahasa Indonesia. Pendaftaran akun baru tidak dibuat di tahap ini. Tombol "Daftar" membuka halaman web `orangtua.html`.
2. **Dashboard orang tua**, untuk setiap anak (dipilih lewat tab atau daftar):
   - waktu bermain hari ini dibanding batasnya
   - grafik batang 7 hari, dibuat sendiri tanpa paket grafik
   - statistik catur, scramble, dan kartu (main, menang, kalah, seri)
   - 10 permainan terakhir
   - tarik ke bawah untuk menyegarkan data
3. **Pengaturan anak** (dari dashboard):
   - batas waktu, dengan pilihan cepat 30, 60, 90, 120 menit atau tanpa batas
   - izin "Cari lawan"
   - persetujuan pertemanan
   - mode chat
   - disimpan ke `PATCH /api/anak/:id`
4. **Beranda anak:** sapaan, sisa waktu bermain hari ini, dan kartu "Ruang Bimbel" dan "Ruang Game" bertanda *segera hadir*.
5. **Keluar**, dari kedua sisi.

## Teknis (keputusan saya, boleh dikoreksi)

- **Folder:** `flutter_app/` di akar repo.
- **Paket:** Flutter stable dengan Material 3. Paket tambahan dibatasi sedikit saja: `http`, `flutter_secure_storage`, dan `shared_preferences`.
- **Pembagian kode:**
  - `ApiClient`: HTTP, cookie, header, dan galat.
  - `SessionStore`: menyimpan sesi.
  - Model data dari JSON.
  - Layar-layar.
- **Pengelolaan state** cukup memakai `ChangeNotifier` bawaan, tanpa paket tambahan.
- **Warna dan gaya** diambil dari dashboard web (`game/src/orangtua.css`) supaya terasa satu produk.

## Pengujian

- **Uji unit:** `ApiClient`, yaitu membaca Set-Cookie, mengirim header, dan menerjemahkan galat. Juga model JSON dari contoh jawaban server.
- **Uji widget:** layar masuk, dashboard, dan pengaturan, dengan server tiruan.
- **Uji sungguhan ke server percobaan** (port 2600, database sementara, akun contoh dari `seed-contoh.js` atau dibuat lewat API):
  - di Chrome lewat `serve_web.mjs`
  - di Windows, kalau Build Tools terpasang
  - di emulator Android, kalau Android SDK terpasang
- iOS tidak diuji.

## Bukan bagian tahap 1

- Pendaftaran akun dan pengelolaan keluarga.
- Menambah atau menghapus anak.
- Chat, pertemanan, tugas, hadiah, dan toko.
- Ruang Bimbel, game, dan arena 3D.
- Notifikasi push.
- Rilis ke Play Store atau App Store.

## Yang dianggap gagal walau aplikasinya jalan

- Data tester atau server yang sedang berjalan ikut berubah.
- Sesi tersimpan di tempat yang tidak aman.
- Aplikasi tidak bisa dipakai karena alamat tunnel berganti.

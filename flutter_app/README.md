# Bimbel Pro — aplikasi Flutter

Aplikasi Bimbel Pro untuk HP, tablet, dan laptop (Android, iOS, Windows, Web). Aplikasi ini memakai server Bimbel Pro yang sudah ada (`../server`), jadi akun dan data anak sama dengan versi web.

**Tahap 1 berisi:**
- masuk sebagai orang tua atau anak (ID masuk dan kata sandi)
- dashboard orang tua: waktu bermain hari ini, grafik 7 hari, statistik game, dan permainan terakhir
- pengaturan anak: batas waktu, izin "Cari lawan", persetujuan pertemanan, dan mode chat
- beranda anak: sisa waktu bermain. Ruang Bimbel dan Ruang Game masih bertanda "segera hadir"

Pendaftaran akun dan penambahan anak untuk sementara masih lewat dashboard web (`/orangtua.html`).

## Persiapan (sekali saja)

1. **Flutter SDK** sudah ada di `C:\dev\flutter`. Tambahkan `C:\dev\flutter\bin` ke PATH, atau jalankan ini di setiap PowerShell baru:

   ```powershell
   $env:Path = "C:\dev\flutter\bin;$env:Path"
   ```

2. **Untuk aplikasi Windows:**
   - Visual Studio Build Tools dengan "Desktop development with C++".
   - **Developer Mode** Windows harus aktif. Buka pengaturannya dengan perintah di bawah, lalu nyalakan "Developer Mode".

   ```powershell
   start ms-settings:developers
   ```

3. **Untuk Android:** Android Studio (beserta Android SDK). Setelah terpasang, setujui lisensinya:

   ```powershell
   flutter doctor --android-licenses
   ```

4. **Untuk iOS:** harus dibangun di komputer Mac yang punya Xcode, dengan perintah `flutter build ios`.

Periksa kesiapannya dengan:

```powershell
flutter doctor
```

## Menjalankan

Server Bimbel Pro harus sedang jalan (`npm run dev` atau `npm run online` di folder utama). Semua perintah di bawah dijalankan di folder `flutter_app`.

- **Windows:**

  ```powershell
  flutter run -d windows
  ```

- **Android:** sambungkan HP (USB debugging) atau nyalakan emulator, lalu jalankan:

  ```powershell
  flutter run -d android
  ```

- **Web:** build dulu, lalu sajikan dengan skrip yang meneruskan `/api` ke server:

  ```powershell
  flutter build web
  ```

  ```powershell
  node tool/serve_web.mjs --port 8765 --api http://localhost:2567
  ```

  Setelah itu, buka http://localhost:8765. Halaman dan API harus berada di alamat yang sama, supaya cookie login tetap bekerja.

- **File APK Android untuk dibagikan:**

  ```powershell
  flutter build apk --release
  ```

  Hasilnya ada di `build\app\outputs\flutter-apk\app-release.apk`.

## Alamat server

**Alamat bawaan:**
- `http://localhost:2567` di Windows
- `http://10.0.2.2:2567` di emulator Android (alamat laptop dilihat dari emulator)
- di Web, alamat halaman itu sendiri

**Cara menggantinya:** di layar Masuk, ketuk **"Server: ..."**, lalu isi alamatnya. Contohnya:
- HP sungguhan di Wi-Fi yang sama: `http://ALAMAT-IP-LAPTOP:2567`
- tester lewat internet: alamat `https://....trycloudflare.com` yang muncul saat `npm run online`. Alamat ini berganti setiap kali `npm run online` dijalankan, jadi perlu diisi ulang.

Alamat bawaan juga bisa diatur saat build, misalnya:

```powershell
flutter build apk --dart-define=BIMBEL_SERVER=https://alamat-anda
```

## Keamanan sesi

- **Android, iOS, dan Windows:** cookie sesi dari server (`bp_ortu` / `bp_anak`, berlaku 30 hari) disimpan di penyimpanan aman perangkat (`flutter_secure_storage`). Isinya dihapus saat pengguna keluar atau mengganti alamat server.
- **Web:** cookie HttpOnly diurus browser.

## Tes

```powershell
flutter analyze
```

```powershell
flutter test
```

Tes memakai server tiruan (`test/fake_server.dart`), jadi tidak menyentuh server atau database sungguhan.

**Uji ke server sungguhan tanpa mengganggu tester:** jalankan server kedua di port lain dengan database terpisah, lalu arahkan aplikasi ke `http://localhost:2600`.

```powershell
$env:BIMBEL_DB = "$env:TEMP\bimbel-uji.db"; $env:GAME_SERVER_PORT = "2600"; node ..\server\index.js
```

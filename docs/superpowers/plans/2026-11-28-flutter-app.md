# Bimbel Pro Flutter (tahap 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat aplikasi Flutter `flutter_app/` berisi login orang tua dan anak, dashboard orang tua, pengaturan anak, dan beranda anak, yang memakai server Node yang sudah ada.

**Architecture:**
- `ApiClient` membungkus `package:http`. Di native, aplikasi membaca `Set-Cookie` dan mengirimnya lagi lewat header `Cookie`. Di web, browser yang mengurus cookie.
- `AppState` (sebuah `ChangeNotifier`) menyimpan sesi dan data, lalu layar membaca darinya.
- Untuk web disediakan `tool/serve_web.mjs`, yang menyajikan `build/web` dan meneruskan `/api` ke server.

**Tech Stack:** Flutter stable, Dart 3, Material 3, `http`, `flutter_secure_storage`, `shared_preferences`, dan Node (hanya untuk skrip serve_web).

**Spec:** `docs/superpowers/specs/2026-11-28-flutter-app-design.md`

## Global Constraints

- Jangan ubah apa pun di `server/` atau `game/`. Jangan sentuh `server/data/bimbel.db`.
- Uji sungguhan hanya ke server percobaan: `GAME_SERVER_PORT=2600`, dan `BIMBEL_DB` diarahkan ke file di folder scratchpad.
- Setiap permintaan selain GET wajib membawa header `x-bimbel: 1`.
- Nama cookie adalah `bp_ortu` dan `bp_anak`. Di native, sesi disimpan di `flutter_secure_storage`.
- Alamat server bawaan: Android `http://10.0.2.2:2567`, selain itu `http://localhost:2567`. Di web, alamatnya selalu `Uri.base.origin`.
- Semua teks di aplikasi memakai bahasa Indonesia.

## Review Focus

- **Alamat server salah atau server mati.** Tampilkan "Server tidak bisa dihubungi. Cek alamat server." dan jangan biarkan aplikasi crash. Diuji di Task 2 (ApiClient), dengan galat jaringan menjadi `ApiException(0, ...)`.
- **Sesi kedaluwarsa** (server menjawab 401 di `/api/laporan`). Hapus sesi, lalu kembali ke layar Masuk. Diuji di Task 3 (AppState).
- **Jawaban galat bukan JSON** (misalnya halaman 404/502 dari tunnel). Tampilkan pesan umum, bukan exception mentah. Diuji di Task 2.
- **Akun orang tua tanpa anak.** Dashboard menampilkan "Belum ada akun anak. Tambahkan lewat dashboard web." Diuji di Task 4.
- **Batas waktu 0 (tanpa batas).** Tampilkan "Tanpa batas", jangan membagi dengan nol. Diuji di Task 4.

---

### Task 1: Kerangka proyek dan skrip web

**Files:**
- Create: `flutter_app/`, lewat `flutter create --org pro.bimbel --project-name bimbel_pro --platforms android,ios,windows,web flutter_app`
- Create: `flutter_app/tool/serve_web.mjs`
- Modify: `flutter_app/pubspec.yaml` (tambah `http`, `flutter_secure_storage`, `shared_preferences`)
- Modify: `flutter_app/android/app/src/main/AndroidManifest.xml` (izin INTERNET, dan `usesCleartextTraffic="true"` untuk HTTP lokal)

**Isi `serve_web.mjs`:**
- Dijalankan dengan `node tool/serve_web.mjs [--port 8080] [--api http://localhost:2567]`.
- Menyajikan `build/web`. Jalur yang tidak dikenal dijawab dengan `index.html`.
- `/api/*` diteruskan ke alamat `--api` bersama header-nya, termasuk `set-cookie`.
- Hanya memakai modul bawaan Node.

- [ ] Jalankan `flutter create`, lalu `flutter pub add http flutter_secure_storage shared_preferences`.
- [ ] Jalankan `flutter analyze` dan `flutter test`. Keduanya harus lolos untuk template awal.
- [ ] Tulis `serve_web.mjs`. Uji dengan `node tool/serve_web.mjs --api http://localhost:2600`: `curl localhost:8080/api/saya` harus dijawab JSON `{"ortu":null,...}`.

### Task 2: ApiClient dan model

**Files:**
- Create: `lib/api/api_client.dart`, `lib/api/session_store.dart`, `lib/api/models.dart`
- Test: `test/api_client_test.dart`, `test/models_test.dart`

**Interfaces (Produces):**
- `class ApiException implements Exception { final int status; final String message; }`
- `abstract class SessionStore { Future<Map<String,String>> load(); Future<void> save(Map<String,String> cookies); Future<void> clear(); }`
  - `SecureSessionStore` untuk native.
  - `MemorySessionStore` untuk tes dan web.
- `class ApiClient`:
  - konstruktor `ApiClient({required Uri baseUrl, required SessionStore store, http.Client? client, bool manageCookies = true})`
  - `Future<dynamic> get(String path)`
  - `Future<dynamic> send(String method, String path, [Map<String,dynamic>? body])`
  - `set baseUrl(Uri)`
- Model `fromJson`, sesuai bentuk jawaban server di `server/accounts.js`:
  - `Child` dari `publicChild`: id, name, jenjang, kelas, color, limitMin, usedMin, allowStrangers, approveFriends, chat, loginAnak
  - `ChildReport extends`/berisi `Child` + `week: List<DayMinutes{day,minutes}>`, `stats: Map<String,GameStat{main,menang,kalah,seri}>`, `recent: List<GameResult{game,mode,outcome,score,at}>`
  - `Me { Parent? ortu; Child? anak; List<Child> children; }`

**Tests (`api_client_test.dart`, memakai `MockClient`):**
- `set-cookie: bp_ortu=abc; Path=/; HttpOnly` setelah POST `masuk` → `store.load()` berisi `{'bp_ortu':'abc'}`, dan permintaan berikutnya membawa header `cookie: bp_ortu=abc`.
- `Max-Age=0` atau nilai kosong → cookie itu dihapus dari store.
- POST membawa `x-bimbel: 1` dan `content-type: application/json`. GET tidak membawa `x-bimbel`.
- 401 `{"error":"ID masuk atau kata sandi salah."}` → `ApiException(401, 'ID masuk atau kata sandi salah.')`.
- 502 dengan isi HTML → `ApiException(502, 'Terjadi kesalahan di server.')`.
- `MockClient` melempar `SocketException`/`ClientException` → `ApiException(0, 'Server tidak bisa dihubungi. Cek alamat server.')`.
- `manageCookies: false` → tidak ada header `cookie` yang dikirim.

**Tests (`models_test.dart`):** contoh JSON laporan (1 anak, 7 hari, 3 game, 1 hasil terbaru) diubah ke model, dan nilainya cocok.

- [ ] Tulis tes, lalu jalankan `flutter test test/api_client_test.dart`. Hasilnya harus FAIL.
- [ ] Implementasikan, lalu jalankan `flutter test`. Hasilnya harus PASS.

### Task 3: AppState dan alur sesi

**Files:**
- Create: `lib/state/app_state.dart`
- Test: `test/app_state_test.dart`

**Interfaces (Produces):** `class AppState extends ChangeNotifier`

- **Status:**
  - `enum Mode { loading, loggedOut, ortu, anak }`
  - `Mode mode`
  - `Me? me`
  - `List<ChildReport> reports`
  - `Uri serverUrl`
- **Fungsi:**
  - `Future<void> init()`: memuat alamat server dari shared_preferences, lalu `GET saya`.
  - `Future<void> login(String login, String password)`: `POST masuk`, lalu `GET saya`. Jawaban `{sebagai:"anak"}` membuat mode menjadi anak.
  - `Future<void> refreshReports()`: `GET laporan`.
  - `Future<void> updateChild(int id, Map<String,dynamic> patch)`: `PATCH anak/:id`, lalu `refreshReports()`.
  - `Future<void> logout()`: `POST keluar`, lalu hapus store.
  - `Future<void> setServerUrl(Uri)`.
- **401 dari `refreshReports`/`updateChild`:** hapus store, `mode = loggedOut`, lalu notify.

**Tests (memakai `MockClient`):**
- login orang tua → `mode == Mode.ortu`
- login anak → `mode == Mode.anak` dan `me.anak.name` terisi
- 401 di laporan → `loggedOut`
- `logout` → store kosong

- [ ] Tulis tes, pastikan FAIL. Implementasikan, pastikan PASS.

### Task 4: Layar-layar

**Files:**
- Create:
  - `lib/main.dart` (ganti template)
  - `lib/ui/theme.dart`
  - `lib/ui/login_screen.dart`
  - `lib/ui/server_dialog.dart`
  - `lib/ui/parent_dashboard.dart`
  - `lib/ui/week_chart.dart`
  - `lib/ui/child_settings_sheet.dart`
  - `lib/ui/child_home.dart`
- Test: `test/widget_test.dart`

**Isi layar:**
- **Tema:** warna utama diambil dari `game/src/orangtua.css`.
- **LoginScreen:**
  - kolom "ID masuk atau email" dan "Kata sandi"
  - tombol "Masuk" dengan indikator saat memuat
  - pesan galat dari `ApiException.message`
  - tautan "Alamat server" yang membuka `ServerDialog` (tidak tampil di web)
  - tombol "Daftar di web" yang menampilkan alamat `<server>/orangtua.html` untuk disalin
- **ParentDashboard:**
  - AppBar "Dashboard Orang Tua" dengan tombol keluar
  - `RefreshIndicator`
  - untuk setiap anak, satu kartu berisi:
    - nama dan kelas
    - "Hari ini: X dari Y menit", atau "Tanpa batas" bila `limitMin == 0`, dengan `LinearProgressIndicator`
    - `WeekChart`, yaitu 7 batang dari `CustomPaint` atau `Row` dengan label hari
    - tabel statistik catur, scramble, dan kartu
    - 10 permainan terakhir
    - tombol "Pengaturan"
  - kalau belum ada anak, tampilkan pesan dari Review Focus
- **ChildSettingsSheet:**
  - pilihan batas waktu 0/30/60/90/120 ditambah isian bebas 0–600
  - sakelar "Boleh cari lawan" (`allowStrangers`) dan "Pertemanan perlu persetujuan" (`approveFriends`)
  - pilihan chat; nilai yang valid diambil dari `CHAT` di `server/accounts.js`
  - "Simpan" memanggil `updateChild`
- **ChildHome:**
  - "Halo, {name}!"
  - "Sisa waktu bermain hari ini: N menit" (atau tanpa batas)
  - dua kartu "Ruang Bimbel" dan "Ruang Game" bertanda "Segera hadir"
  - tombol keluar (`POST anak/keluar` lewat `logout`)

**Widget tests (`AppState` diisi `MockClient`):**
- login gagal → teks galat tampil
- login orang tua berhasil → judul "Dashboard Orang Tua" dan nama anak tampil
- `limitMin: 0` → teks "Tanpa batas"
- tanpa anak → pesan kosong tampil
- simpan pengaturan → PATCH terkirim dengan `{"limitMin":90}`

- [ ] Tulis tes, pastikan FAIL. Implementasikan, lalu jalankan `flutter analyze` (harus tanpa masalah) dan `flutter test` (harus PASS).

### Task 5: Uji sungguhan, build, dan README

**Files:**
- Modify: `README.md` (bagian baru "Aplikasi Flutter")
- Create: `flutter_app/README.md`

**Langkah:**
- [ ] **Siapkan server percobaan:**
  - `BIMBEL_DB=<scratchpad>/uji.db GAME_SERVER_PORT=2600 node server/index.js` (di latar belakang)
  - buat orang tua lewat `POST /api/daftar`, anak lewat `POST /api/anak` (dengan `loginAnak`/`sandiAnak`, cek nama field di `kredensialAnak`), dan satu hasil lewat `POST /api/hasil` sebagai anak
- [ ] **Uji di web:** `flutter build web`, lalu `node tool/serve_web.mjs --api http://localhost:2600`. Coba di browser pane: login orang tua → dashboard → ubah batas ke 90 → muat ulang, nilainya tetap 90. Lalu keluar → login anak → beranda anak. Ambil screenshot, dan cek juga di ukuran HP.
- [ ] **Uji di Windows:** `flutter build windows`, lalu jalankan exe ke port 2600 dan coba login orang tua.
- [ ] **Uji di Android:** `flutter build apk --debug`. Kalau emulator tersedia, pasang dan coba login lewat `http://10.0.2.2:2600`.
- [ ] **Tutup server percobaan**, lalu pastikan `server/data/bimbel.db` tidak berubah (bandingkan mtime sebelum dan sesudah).
- [ ] **README:** cara memasang Flutter, `flutter run -d windows|chrome|<android>`, cara menjalankan web dengan serve_web, mengatur alamat server (alamat tunnel), dan catatan iOS (perlu Mac).

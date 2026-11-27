# Arena Lebih Halus — Rencana Pelaksanaan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arena 3D tidak lagi kaku dan kotak-kotak: bangunan bersudut membulat dan berdetail lewat kode, alam memakai model CC0, dunia sedikit bergerak, tetap ringan di HP.

**Architecture:** Bentuk membulat dibuat oleh modul geometri murni (`bentuk.js`, bisa diuji di Node). Penempatan hiasan dihitung oleh fungsi murni (`hiasan.js`). Model alam dimuat sekali oleh `alam.js` lalu digandakan (instancing), dengan pohon kode sebagai cadangan. `arena.js` hanya merakit, dan `walls` (tabrakan) tidak boleh berubah.

**Tech Stack:** Babylon.js 9.37 (`@babylonjs/core`, `@babylonjs/loaders/glTF`), Vite 8, uji dengan `node --test` (bawaan Node, tanpa dependensi baru).

**Spec:** [docs/superpowers/specs/2026-11-27-arena-lebih-halus-design.md](../specs/2026-11-27-arena-lebih-halus-design.md)

## Global Constraints

- Tata letak tidak berubah: posisi ruangan, meja, pintu, pertokoan, sawah, kios, dan pohon tetap sama.
- Daftar `walls` yang dikembalikan `createArena` harus **identik** dengan sebelum perubahan (urutan dan angka).
- Avatar, logika game, akun, dan server tidak diubah.
- Model alam: lisensi CC0, total di bawah ±1,5 MB, disimpan di `game/public/model/alam/` beserta `LISENSI.txt`.
- **Unduhan dari luar hanya setelah pemilik proyek menyetujui nama berkas, sumber, dan ukurannya.**
- Tingkat kualitas `rendah`: hiasan dikurangi dan goyangan mati. `sedang`/`tinggi`: penuh.
- Bila model alam gagal dimuat, arena tetap tampil dengan pohon cadangan versi kode.
- Tidak ada dependensi npm baru.

## Review Focus

1. **Tabrakan berubah tanpa sengaja** saat `box()`/`room()` diganti ke bentuk membulat → pemain harus tetap bisa lewat pintu dan tidak menembus dinding. Diuji di Task 1 (snapshot) dan Task 6.
2. **Hiasan menutupi jalan, pintu, atau meja** → rumput/bunga tidak boleh muncul di area itu. Diuji di Task 2 (`tebarHiasan`).
3. **Model alam gagal dimuat** (berkas hilang/jaringan putus) → pohon cadangan tetap tampil dan tidak ada galat yang menghentikan arena. Diuji di Task 4 dan Task 6.
4. **HP lambat** → di kualitas `rendah` jumlah hiasan berkurang dan goyangan mati. Diuji di Task 2 (jumlah) dan Task 5.
5. **Mengganti kualitas di tengah permainan** → hiasan/goyangan menyesuaikan tanpa memuat ulang halaman dan tanpa menggandakan hiasan. Diuji di Task 5.

---

## Struktur berkas

| Berkas | Tanggung jawab |
|---|---|
| `game/src/bentuk.js` (baru) | Geometri kotak membulat (`kotakBulat`) dan fungsi murni penggeser titik (`geserKeSudut`) |
| `game/src/hiasan.js` (baru) | Fungsi murni penempatan hiasan (`tebarHiasan`) dan jumlah per kualitas (`jumlahHiasan`) |
| `game/src/alam.js` (baru) | Memuat model alam `.glb`, menanam pohon/semak/bunga/batu (instancing), cadangan, goyangan, awan |
| `game/src/arena.js` (ubah) | Merakit: `box`/`room` memakai `kotakBulat`, detail bangunan, jalan melengkung, memanggil `alam.js` |
| `game/src/grafis.js` (ubah) | Memberi kabar saat kualitas berubah (`onKualitas`) |
| `game/test/*.test.js` (baru) | Uji Node |
| `game/test/walls-awal.json` (baru) | Snapshot tabrakan sebelum perubahan |
| `game/package.json` (ubah) | Skrip `"test": "node --test test/"` |

---

### Task 1: Snapshot tabrakan + kotak membulat

**Files:**
- Create: `game/src/bentuk.js`, `game/test/bentuk.test.js`, `game/test/walls-awal.json`
- Modify: `game/package.json` (skrip `test`), `game/src/arena.js` (`box`, `room`, ekspos dev)

**Interfaces:**
- Produces: `geserKeSudut(positions: number[], setengah: {x,y,z}, r: {x,y,z}): number[]` (murni).
- Produces: `kotakBulat(scene, name, { w, h, d, r }): Mesh` — `r` angka atau `{x,y,z}`; bila `r` ≤ 0 atau `r` ≥ setengah sisi terkecil, dijepit ke `min(r, sisi/2 - 0.001)`.
- Produces: di mode DEV saja, `window.__arenaWalls = walls` di akhir `createArena`.

- [ ] **Step 1: Ambil snapshot tabrakan sebelum mengubah apa pun.** Tambahkan `if (import.meta.env.DEV) window.__arenaWalls = walls;` sebelum `return` di `createArena`. Jalankan arena (launch `server-proyek` + `arena-proyek`, port 5174), masuk, lalu di konsol jalankan `JSON.stringify(window.__arenaWalls)` dan simpan hasilnya ke `game/test/walls-awal.json`.
- [ ] **Step 2: Tambah skrip `"test": "node --test test/"` di `game/package.json`.**
- [ ] **Step 3: Tulis uji yang gagal** di `game/test/bentuk.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { geserKeSudut } from "../src/bentuk.js";

test("titik bola satuan digeser ke sudut kotak", () => {
  // bola jari-jari r: titik (r,0,0), (-r,0,0), (0,r,0)
  const r = { x: 0.1, y: 0.1, z: 0.1 }, s = { x: 1, y: 0.5, z: 2 };
  const out = geserKeSudut([0.1, 0, 0, -0.1, 0, 0, 0, 0.1, 0], s, r);
  assert.deepEqual(out.map((v) => +v.toFixed(4)), [1, 0, 0, -1, 0, 0, 0, 0.5, 0]);
});
test("semua titik di dalam batas kotak", () => {
  const r = { x: 0.2, y: 0.05, z: 0.2 }, s = { x: 1.5, y: 0.02, z: 5.5 };
  const p = [0.2, 0.05, 0.2, -0.2, -0.05, -0.2, 0.14, 0.03, -0.14];
  const out = geserKeSudut(p, s, r);
  for (let i = 0; i < out.length; i += 3) {
    assert.ok(Math.abs(out[i]) <= s.x + 1e-9 && Math.abs(out[i + 1]) <= s.y + 1e-9 && Math.abs(out[i + 2]) <= s.z + 1e-9);
  }
});
```

- [ ] **Step 4: Jalankan** `npm test --prefix game` → Expected: FAIL (modul belum ada).
- [ ] **Step 5: Implementasi `bentuk.js`.**
  Algoritma `geserKeSudut`: untuk tiap titik `(px,py,pz)` dari bola satuan yang sudah diskalakan ke `r`, hasilnya `p + tanda(p) * (setengah - r)` per sumbu, dengan `tanda(0) = 0`. Titik tepat di 0 tetap di tengah sisi datar; wajah di antaranya meregang menjadi sisi datar kotak.
  `kotakBulat`: `MeshBuilder.CreateSphere` (segments 6, diameter 2) → ambil `positions`, skalakan per sumbu ke `r`, jalankan `geserKeSudut`, tulis kembali. **Normal bola dipakai apa adanya** (sudah benar untuk kotak membulat). Mesh dibuat tidak bisa diubah (`updatable: false`) setelah posisi ditulis.
- [ ] **Step 6: Jalankan** `npm test --prefix game` → Expected: PASS.
- [ ] **Step 7: Ganti isi `box()` di `arena.js`** agar memakai `kotakBulat` dengan `r = min(0.08, w/2, h/2, d/2) * 0.9`. Perhitungan `walls` di `box()` **tidak diubah**.
- [ ] **Step 8: Tambah uji snapshot** `game/test/walls.test.js`: muat `walls-awal.json` lalu pastikan berisi array berpanjang > 0 dan tiap item punya `minX,maxX,minZ,maxZ` angka. (Perbandingan dengan arena hidup dilakukan di Task 6 lewat konsol, karena `createArena` butuh WebGL.)
- [ ] **Step 9: Periksa di browser:** `JSON.stringify(window.__arenaWalls) === <isi walls-awal.json>` → `true`. Ambil tangkapan layar alun-alun.
- [ ] **Step 10: Commit** `feat(arena): kotak bersudut membulat + snapshot tabrakan`.

### Task 2: Penempatan hiasan (fungsi murni)

**Files:**
- Create: `game/src/hiasan.js`, `game/test/hiasan.test.js`

**Interfaces:**
- Produces: `jumlahHiasan(kualitas: "rendah"|"sedang"|"tinggi"): { rumput: number, bunga: number, batu: number, awan: number }` — rendah `{60, 20, 8, 3}`, sedang `{180, 60, 16, 6}`, tinggi `{260, 90, 20, 8}`.
- Produces: `tebarHiasan({ jumlah: number, radius: number, larangan: Array<{minX,maxX,minZ,maxZ}>, lingkaranLarangan: Array<{x,z,r}>, benih: number }): Array<{x:number, z:number, putar:number, skala:number}>` — deterministik untuk `benih` yang sama; semua titik di dalam `radius`, tidak di dalam kotak `larangan` (diperlebar 0.3) maupun lingkaran larangan.

- [ ] **Step 1: Tulis uji yang gagal:**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { tebarHiasan, jumlahHiasan } from "../src/hiasan.js";

const larangan = [{ minX: -1.5, maxX: 1.5, minZ: 8, maxZ: 19 }];
const lingkaranLarangan = [{ x: 0, z: 0, r: 8 }];
test("hiasan tidak masuk area larangan dan tetap di dalam arena", () => {
  const t = tebarHiasan({ jumlah: 300, radius: 36, larangan, lingkaranLarangan, benih: 7 });
  assert.equal(t.length, 300);
  for (const p of t) {
    assert.ok(Math.hypot(p.x, p.z) <= 36);
    assert.ok(Math.hypot(p.x, p.z) >= 8);
    assert.ok(!(p.x > -1.8 && p.x < 1.8 && p.z > 7.7 && p.z < 19.3));
  }
});
test("benih sama → hasil sama", () => {
  const a = tebarHiasan({ jumlah: 20, radius: 36, larangan, lingkaranLarangan, benih: 3 });
  const b = tebarHiasan({ jumlah: 20, radius: 36, larangan, lingkaranLarangan, benih: 3 });
  assert.deepEqual(a, b);
});
test("rendah lebih sedikit dari tinggi", () => {
  assert.ok(jumlahHiasan("rendah").rumput < jumlahHiasan("tinggi").rumput);
  assert.deepEqual(jumlahHiasan("rendah"), { rumput: 60, bunga: 20, batu: 8, awan: 3 });
});
```

- [ ] **Step 2: Jalankan** `npm test --prefix game` → Expected: FAIL.
- [ ] **Step 3: Implementasi.** Pembangkit acak ber-benih (mulberry32). Coba titik acak dalam lingkaran; tolak bila kena larangan; berhenti setelah `jumlah * 20` percobaan (kembalikan sebanyak yang dapat).
- [ ] **Step 4: Jalankan** → Expected: PASS.
- [ ] **Step 5: Commit** `feat(arena): penempatan hiasan deterministik`.

### Task 3: Detail bangunan dan jalan melengkung

**Files:**
- Modify: `game/src/arena.js` (`room`, `tree`, jalan setapak, alun-alun, `mat`)

**Interfaces:**
- Consumes: `kotakBulat` (Task 1).

- [ ] **Step 1: Ruangan:** di `room()` tambahkan, **tanpa `walls`**: lis atas tiap dinding (`kotakBulat`, lebih lebar 0.12 dan tebal 0.12, di puncak dinding, warna dinding digelapkan ~15%), lis bawah tipis, dan dua tiang kusen di kiri-kanan celah pintu (tinggi 1.5).
- [ ] **Step 2: Jalan:** `pathN/E/W/S` dan `jalan-pertokoan` memakai `kotakBulat` dengan `r = { x: min(1.2, w/2), y: 0.02, z: min(1.2, d/2) }` supaya ujungnya membulat. Alun-alun ditambah cincin tepi (`CreateTorus`, diameter 16, tebal 0.25, warna sedikit lebih gelap dari plaza).
- [ ] **Step 3: Tabung:** semua `CreateCylinder` di `arena.js` dengan `tessellation` < 16 dinaikkan ke 16 (kecuali bibit padi).
- [ ] **Step 4: Bahan:** `mat()` diberi `specularPower` 32 dan `specularColor` 0.08; tambah varian `matVariasi(scene, hex, i)` yang menggeser kecerahan ±4% untuk benda berulang (meja, pagar) supaya tidak datar.
- [ ] **Step 5: Pohon cadangan:** `tree()` diganti batang tabung (16 sisi) + 3 bola daun bertumpuk dengan sedikit geser acak (benih dari posisi), menggantikan kerucut. Nama mesh `"leaf"` dipertahankan.
- [ ] **Step 6: Periksa:** jalankan arena, `JSON.stringify(window.__arenaWalls)` sama dengan `walls-awal.json`; tidak ada galat di konsol; tangkapan layar Ruang Bimbel, Ruang Game, Kantor, Pertokoan.
- [ ] **Step 7: Commit** `feat(arena): detail bangunan, jalan melengkung, pohon bulat`.

### Task 4: Model alam CC0

**Files:**
- Create: `game/public/model/alam/*.glb`, `game/public/model/alam/LISENSI.txt`, `game/src/alam.js`
- Modify: `game/src/arena.js` (panggil `tanamAlam`)

**Interfaces:**
- Consumes: `tree()` dari arena sebagai cadangan (diekspor sebagai `pohonCadangan(scene, x, z, s)`).
- Produces: `tanamAlam(scene, { pohon: Array<{x,z,s}> }): Promise<{ jenis: "model"|"cadangan", akar: TransformNode }>`.

- [ ] **Step 1: Pilih paket dan minta izin.** Kandidat: Quaternius (CC0, sumber yang sama dengan model robot) atau Kenney Nature Kit (CC0, kenney.nl). Sampaikan ke pemilik proyek: nama berkas, URL sumber, ukuran unduhan; **tunggu jawaban "ya"**. Unduh ke folder kosong baru di scratchpad, bukan di proyek.
- [ ] **Step 2: Pilih model:** 2–3 pohon, 1 semak, 2 bunga, 1 batu, 1 rumpun rumput. Salin hanya `.glb` terpilih ke `game/public/model/alam/` dengan nama `pohon-1.glb`, `pohon-2.glb`, `semak.glb`, `bunga-1.glb`, `bunga-2.glb`, `batu.glb`, `rumput.glb`. Periksa total `du -sh` < 1,5 MB. Tulis `LISENSI.txt` (nama paket, pembuat, URL, CC0, tanggal).
- [ ] **Step 3: Implementasi `alam.js`:** muat semua model dengan `LoadAssetContainerAsync` (pola `model3d.js`), ukur tinggi lewat `getHierarchyBoundingVectors()` dan skalakan supaya pohon ±3,6 × `s` tinggi. Gandakan dengan `instantiateModelsToScene` atau `createInstance` per mesh; `freezeWorldMatrix()` setelah ditempatkan.
- [ ] **Step 4: Cadangan:** `arena.js` tetap menanam pohon cadangan dulu; setelah model termuat, pohon cadangan di posisi yang sama di-`dispose`. Bila `tanamAlam` gagal (promise ditolak atau ada model null), pohon cadangan dibiarkan dan `console.warn` dicetak sekali.
- [ ] **Step 5: Periksa gagal-muat:** di browser, blokir `/model/alam/` (DevTools atau ubah URL sementara) → arena tampil dengan pohon cadangan, tanpa galat merah.
- [ ] **Step 6: Commit** `feat(arena): pohon dan tanaman dari model CC0 dengan cadangan`.

### Task 5: Hiasan, goyangan, awan, dan kualitas

**Files:**
- Modify: `game/src/alam.js`, `game/src/grafis.js`, `game/src/arena.js`

**Interfaces:**
- Consumes: `tebarHiasan`, `jumlahHiasan` (Task 2); `tanamAlam` (Task 4).
- Produces (grafis.js): `onKualitas(cb: (k) => void): void` — `cb` dipanggil sekali segera dengan kualitas saat ini dan setiap kali berubah.
- Produces (alam.js): `pasangHiasan(scene, { larangan, lingkaranLarangan, grafis }): void`.

- [ ] **Step 1: `grafis.js`:** simpan daftar pendengar; panggil di akhir `setKualitas`; ekspos `onKualitas` pada objek yang dikembalikan.
- [ ] **Step 2: Hiasan:** `larangan` = semua `walls` + kotak jalan setapak + kotak di depan tiap pintu + kotak tiap meja (`tables`, lebar 3×3). `lingkaranLarangan` = alun-alun (r 8.5). Rumput/bunga/batu ditempatkan sebagai instance model (cadangan: bola kecil berwarna). Saat kualitas berubah, instance lama di-`dispose` lalu dibuat ulang dengan `jumlahHiasan(k)` — **tidak pernah menumpuk**.
- [ ] **Step 3: Goyangan:** satu `scene.onBeforeRenderObservable` yang memutar akar pohon/semak `rotation.z = sin(t*1.2 + fase) * 0.03` (fase dari posisi). Mati di `rendah`. Pohon yang bergoyang tidak di-`freezeWorldMatrix`.
- [ ] **Step 4: Awan:** `jumlahHiasan(k).awan` gumpalan 3–4 bola putih (`disableLighting`, `emissiveColor` putih ~0.95), tinggi 18–24, bergerak `x += 0.4 * dt` dan kembali ke sisi lain setelah lewat radius 45.
- [ ] **Step 5: Periksa:** ganti kualitas 3× dengan tombol "✨ Grafis" → jumlah mesh (`scene.meshes.length`) kembali ke angka yang sama untuk kualitas yang sama; di `rendah` pohon diam.
- [ ] **Step 6: Commit** `feat(arena): hiasan, goyangan, awan sesuai kualitas`.

### Task 6: Pemeriksaan akhir

- [ ] **Step 1:** `npm test --prefix game` → semua PASS.
- [ ] **Step 2:** `npm run build --prefix game` → tanpa galat.
- [ ] **Step 3:** Di browser: `JSON.stringify(window.__arenaWalls)` sama persis dengan `game/test/walls-awal.json`.
- [ ] **Step 4:** Jalan ke tiap pintu (Bimbel, Game, Kantor, Ruang Manajer, 3 toko) dan ke tiap meja game → bisa masuk dan duduk seperti sebelumnya.
- [ ] **Step 5:** `resize_window` mobile (375×812), kualitas `rendah` → arena termuat, gerak lancar, tidak ada galat konsol. Kembalikan ke `desktop`.
- [ ] **Step 6:** Tangkapan layar sebelum/sesudah (alun-alun, Ruang Game, Kantor, Pertokoan) untuk pemilik proyek.
- [ ] **Step 7:** Perbarui `README.md` (tabel folder: `model/alam` dan lisensinya) dan `catatan-proyek.md` secara singkat. Commit `docs: arena lebih halus`.

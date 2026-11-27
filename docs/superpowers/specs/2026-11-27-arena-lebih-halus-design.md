# Desain: Arena Bimbel Pro yang lebih halus dan tidak kotak-kotak

Tanggal: 27 November 2026
Status: menunggu persetujuan

## Maksud dan alasan

Arena 3D terasa **terlalu kaku dan kotak-kotak**. Hampir semua benda dibuat dari bentuk dasar Babylon.js
(`CreateBox`, `CreateCylinder` dengan sedikit sisi, pohon berbentuk kerucut 6 sisi) dengan sudut tajam
dan warna polos. Tujuannya: dunia yang terasa lembut, hidup, dan ramah anak, tanpa membuat aplikasi
berat di HP.

## Sasaran

- Bangunan, meja, jalan, dan lantai tidak lagi terlihat seperti kotak polos: sudut membulat, tepi lebih lembut, ada detail kecil (lis atap, jendela, kusen pintu).
- Alam (pohon, semak, bunga, batu, rumput) memakai **model 3D jadi berlisensi CC0**, sehingga tampak organik.
- Dunia terasa hidup: daun/semak sedikit bergoyang, awan bergerak pelan.
- Jalan setapak dan alun-alun tampak alami (pinggiran melengkung, bukan persegi panjang lurus).

## Bukan sasaran

- Tata letak arena tidak berubah: letak Ruang Bimbel, Ruang Game, Kantor, Sawah, Pertokoan, Kios Toko, dan semua meja tetap sama.
- Avatar dan aksesori tidak diubah.
- Logika game, akun, dan server tidak diubah.

## Anti-sasaran (gagal walau "jalan")

- Arena jadi lambat dimuat atau patah-patah di HP.
- Tabrakan (`walls`) berubah, sehingga pemain bisa menembus dinding atau tersangkut di tempat yang dulu bisa dilewati.
- Gaya model jadi campur aduk dan tidak cocok dengan avatar yang ada.
- Arena kosong/rusak bila model gagal dimuat.

## Batasan

- Browser, Babylon.js, berjalan di laptop, tablet, dan HP.
- Sudah ada pola memuat `.glb` di [game/src/model3d.js](../../../game/src/model3d.js) (dengan cadangan bila gagal) dan pola lisensi `LISENSI.txt` di `game/public/model/robot/`.
- Tiga tingkat kualitas grafis di [game/src/grafis.js](../../../game/src/grafis.js) tetap berlaku.
- Model dari luar hanya diunduh setelah pemilik proyek menyetujui nama berkas, sumber, dan ukurannya.

## Pendekatan yang dipertimbangkan

| | Cara | Kelebihan | Kekurangan |
|---|---|---|---|
| A | Bentuk dasar diperhalus lewat kode saja | Tanpa unduhan, paling ringan | Pohon/tanaman tetap terasa "buatan" |
| B | Semua diganti model jadi | Paling detail | Paling berat, gaya bisa tidak cocok, banyak unduhan |
| **C** | **Campuran: bangunan lewat kode, alam pakai model jadi** | Alam tampak organik, bangunan tetap ringan dan tata letak aman | Tetap perlu unduhan (sedikit) |

**Dipilih: C** (keputusan pemilik proyek).

## Rancangan

### 1. Bangunan dan perabot (lewat kode, di `arena.js`)

- Fungsi bantu baru untuk kotak bersudut membulat. Fungsi `box()` dan `room()` dipakai seperti sekarang, jadi ukuran dan `walls` tidak berubah.
- Dinding ruangan diberi lis bawah, lis atas/atap tipis menjorok, dan kusen di pintu.
- Tabung (kaki meja, tiang kios) memakai lebih banyak sisi supaya bulat.
- Jalan setapak diganti bentuk pipih dengan ujung melengkung, alun-alun diberi cincin tepi.
- Bahan (material) diberi sedikit variasi warna/kilap supaya tidak datar.

### 2. Alam (model jadi CC0)

- Sumber yang diutamakan: paket alam low-poly bergaya kartun dari **Quaternius** (pembuat model robot yang sudah dipakai) atau **Kenney Nature Kit**. Keduanya CC0. Paket dipilih berdasarkan gaya yang paling cocok dengan avatar.
- Hanya diambil beberapa model: 2–3 jenis pohon, semak, bunga, batu, dan rumpun rumput. Target ukuran total **di bawah ±1,5 MB**.
- Disimpan di `game/public/model/alam/` beserta `LISENSI.txt`.
- Modul baru `game/src/alam.js` memuat model sekali, lalu menggandakannya dengan *instancing* (hemat untuk HP). Pohon di posisi yang sama seperti sekarang.
- Cadangan: bila gagal dimuat, pohon versi kode (yang diperhalus) tetap tampil.

### 3. Suasana hidup

- Goyangan halus pada pohon/semak (rotasi kecil berirama, tidak semua bersamaan).
- Beberapa awan bulat melayang pelan di langit.
- Rumput dan bunga hiasan ditebar di area hijau, **di luar** jalan dan pintu.

### 4. Kinerja

- Tingkat **Rendah**: jumlah hiasan (rumput/bunga/awan) dikurangi dan goyangan dimatikan.
- Benda yang tidak bergerak dibekukan (`freezeWorldMatrix`) dan memakai instancing.

## Diserahkan ke pembangun

- Jumlah pasti hiasan dan posisinya (asal tidak menghalangi jalan, pintu, dan meja).
- Warna dan detail lis, selama sesuai palet hangat di `grafis.js`.
- Model mana yang dipakai dari paket terpilih.

## Cara memeriksa hasil

- Bandingkan tangkapan layar sebelum/sesudah dari sudut yang sama (alun-alun, Ruang Game, Kantor, Pertokoan).
- Jalan ke semua meja dan pintu: tabrakan sama seperti sebelumnya.
- Ukuran HP (375×812): arena tetap lancar dan termuat.
- Model alam diblokir/gagal: arena tetap tampil dengan pohon cadangan.

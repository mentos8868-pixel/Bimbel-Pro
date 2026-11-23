# Laporan audit Bimbel Pro

Audit lokal 22 November 2026.

## Perbaikan

| Area | Perbaikan |
| --- | --- |
| Arena | Avatar pemain lain dibersihkan saat koneksi putus. Kata pertama yang panjang tidak lagi memakan baris kosong pada gelembung chat. |
| Catur | Giliran bot yang tertunda dibatalkan saat permainan ditutup atau pemain menyerah. Nama pemain dirender sebagai teks. |
| Scramble | Tampilan ronde direset meski hurufnya sama dengan ronde sebelumnya. Input dikunci sesuai status pemain. Server menolak jawaban tepat saat waktu habis. |
| Kartu Kilat | Pilihan warna dan timer dari giliran lama dibersihkan. Bot berhenti saat permainan selesai. |
| Akun dan dasbor | Respons undangan yang kedaluwarsa diabaikan. Dasbor menampilkan pesan ketika gagal dimuat dan mengabaikan respons yang lebih lama. API memeriksa bentuk JSON dan peran sesi yang tersimpan. |
| Bimbel | Latihan dan tryout memvalidasi seluruh jawaban numerik agar string yang hanya sebagian berupa angka tidak dinilai benar. Pemeriksa bank soal mempertahankan perbedaan huruf besar dan kecil pada pilihan, yang relevan untuk soal kapitalisasi dan genotipe. |

## Verifikasi

- Build produksi Vite lulus. Vite memperingatkan ukuran bundel utama sekitar 6,53 MB sebelum gzip.
- Smoke test HTTP pada SQLite dalam memori lulus untuk akun tamu, pendaftaran orang tua, pembuatan akun dan login PIN anak, serta laporan orang tua.
- Dua klien Colyseus berhasil memasuki arena, memainkan langkah pembuka catur, dan memulai Scramble serta Kartu Kilat.
- Uji terfokus lulus untuk batas waktu Scramble, pembersihan giliran bot dan timer, langkah awal Otello dan Papan Kata, tabrakan arena, serta 12 kasus penilaian jawaban.

- Audit bank soal mencakup 9.982 butir, 78.000 sesi latihan, dan 2.320 simulasi tryout. Pemeriksaan format, sesi, dan tryout tidak menemukan masalah. Ada 21 kombinasi otomatis dengan variasi rendah.

## Cakupan yang belum teruji

Pengujian interaktif browser dan WebGL, pertandingan multiplayer penuh, integrasi Ollama, dan lingkungan produksi belum diverifikasi. Simulasi bank soal hanya mencakup aspek yang diperiksa oleh skrip audit.

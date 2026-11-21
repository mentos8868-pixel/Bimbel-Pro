// Dashboard anak: halaman pertama setelah anak masuk. Menu: Home, Tugas, Arena, Bimbel, Report, Chat, Avatar, Toko Avatar.
// Hanya data milik anak itu sendiri (dari /api/saya, /api/kamarku, /api/toko). Pengaturan tetap di tangan orang tua.
import { api } from "./api.js";
import { avatarPicker } from "./avatar-picker.js";
import { avatarSvg } from "./avatar-svg.js";
import { namaKelas, kurikulumName, negaraName } from "../../shared/negara.js";
import { SLOT } from "../../shared/aksesori.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NAMA_GAME = { catur: "Catur", scramble: "Scramble", kartu: "Kartu Kilat" };
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const menit = (m) => (m >= 60 ? `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${m} menit`);
const bar = (persen, warna = "") => `<span class="bar"><span class="bar-fill ${warna}" style="width:${Math.max(0, Math.min(100, persen))}%"></span></span>`;

const HAL = {
  home: ["", "Apa yang mau kamu lakukan hari ini?"],
  tugas: ["Tugas", "Tugas dari orang tua dan misi belajar hari ini."],
  arena: ["Arena", "Dunia 3D tempat bermain bersama teman."],
  bimbel: ["Bimbel", "Belajar dan tryout di Ruang Pintar."],
  keuangan: ["Keuangan", "Uang saku dari orang tua. Catat sendiri uang yang kamu dapat, belanja, dan tabunganmu."],
  report: ["Report", "Catatan bermain dan belajarmu."],
  chat: ["Chat", "Pesan dengan orang tua."],
  avatar: ["Avatar", "Pilih avatar kesukaanmu."],
  toko: ["Toko Avatar", "Tukar bintang dengan aksesori untuk avatarmu."],
};
let hal = HAL[location.hash.slice(1)] ? location.hash.slice(1) : "home";
let anak = null;   // profil dari /api/saya
let k = null;      // ringkasan dari /api/kamarku
let toko = null;   // isi toko dari /api/toko (dimuat saat menu Toko Avatar dibuka)
let tg = null;     // tugas dari orang tua: /api/tugas/saya
let ch = { n: 0, terakhir: null, namaOrtu: "Orang tua" };   // ringkasan chat keluarga: /api/chat/belum
let chatTimer = 0;
let uang = null;   // uang saku (diberi orang tua) dan belanja/tabungan (dicatat anak): /api/keuangan/saya
let yakinBeli = null;

const galat = (t) => { $("galat").textContent = t || ""; $("galat").hidden = !t; };
const gambarAvatar = (coba) => avatarSvg(anak.avatar, anak.color, {
  aksesori: coba ? [...(toko?.pakai || []), coba] : (toko?.pakai || String(anak.aksesori || "").split(",").filter(Boolean)),
  aura: toko?.aura ?? anak.aura ?? "",
});

// ---------- potongan tampilan ----------
function kepala() {
  const persen = Math.round((k.xpLevel / k.xpPerLevel) * 100);
  const aura = k.auraBerikut ? `${esc(k.auraBerikut.nama)} di Level ${k.auraBerikut.level}` : `${esc(k.aura)} (tertinggi)`;
  const info = [anak.kelas ? namaKelas(anak.kelas, anak.kurikulum) : anak.jenjang, kurikulumName(anak.kurikulum), negaraName(anak.negara)].join(" · ");
  return `<section class="panel kepala-anak">
    <span class="ava-besar av-face">${gambarAvatar()}</span>
    <div class="kepala-isi"><h2>${esc(anak.name)}</h2><span class="muted">${esc(info)}</span>
      <div class="level-baris"><span class="lv">Level ${k.level}</span>${bar(persen)}<span class="muted">${k.xpLevel}/${k.xpPerLevel} XP · ${aura}</span></div></div>
  </section>`;
}
function kotakWaktu() {
  const w = k.waktu;
  return w.sisaMin === null
    ? `<div class="kotak"><span class="judul">⏰ Waktu main</span><span class="besar">${menit(w.usedMin)}</span><span class="kecil">sudah bermain hari ini</span></div>`
    : `<div class="kotak"><span class="judul">⏰ Sisa waktu main</span><span class="besar">${menit(w.sisaMin)}</span>
       ${bar(Math.round((w.sisaMin / w.limitMin) * 100), w.sisaMin <= 5 ? "warn" : "")}<span class="kecil">${menit(w.usedMin)} dari ${menit(w.limitMin)} hari ini</span></div>`;
}
function kotakAngka() {
  const b = k.belajar;
  const target = k.target ? (k.target.kurang > 0 ? `Kurang ${k.target.kurang} lagi untuk ${esc(k.target.name)}` : `Cukup untuk ${esc(k.target.name)}!`) : "Semua aksesori sudah kamu punya!";
  return `<div class="tiga">${kotakWaktu()}
    <div class="kotak"><span class="judul">⭐ Bintang</span><span class="besar">${k.bintang}</span><span class="kecil">${target}</span></div>
    <div class="kotak"><span class="judul">🏅 Medali</span><span class="besar">${b ? `${b.medali.punya} / ${b.medali.total}` : "0"}</span>
      <span class="kecil">${b?.medali.terbaru ? `Terbaru: ${esc(b.medali.terbaru)}` : "Berlatih di Ruang Pintar untuk medali pertama"}</span></div></div>`;
}
function daftarMisi() {
  const b = k.belajar;
  if (!b) return `<p class="muted">Misi belajar muncul setelah kamu membuka Ruang Pintar.</p>`;
  const baris = (ok, teks, kanan) => `<li class="${ok ? "beres" : ""}"><span class="cek">${ok ? "✔" : "○"}</span><span>${teks}</span><span class="muted">${kanan}</span></li>`;
  return `<ul class="daftar">${b.misi.tryout.map((t) => baris(t.selesai, `Tryout ${esc(t.nama)}`, t.selesai ? (t.bintang !== null ? "★".repeat(t.bintang) : "selesai") : "belum")).join("")}
    ${baris(b.misi.latihanHariIni > 0, "Latihan 1 topik", b.misi.latihanHariIni ? `${b.misi.latihanHariIni} sesi hari ini` : "belum")}</ul>`;
}
// Tugas dari orang tua untuk hari ini, dengan tombol "Sudah".
const IKON_JENIS = { ibadah: "🕌", rumah: "🏠", belajar: "📚", lainnya: "⭐" };
function daftarTugas(semua = false) {
  if (!tg) return `<p class="muted">Tugas tidak bisa dimuat.</p>`;
  const list = tg.tugas.filter((t) => semua || t.hariIni);
  if (!list.length) return `<p class="muted">${semua ? "Belum ada tugas dari orang tua." : "Tidak ada tugas dari orang tua hari ini."}</p>`;
  return `<ul class="daftar tugas">${list.map((t) => {
    const kanan = !t.hariIni ? `<span class="muted">bukan hari ini</span>`
      : t.status === "disetujui" ? `<span class="on">✔ disetujui${t.bintang ? ` +${t.bintang}★` : ""}</span>`
      : t.status === "menunggu" ? `<span class="tunggu">⏳ menunggu dicek</span>`
      : `<button class="primary" data-sudah="${t.id}">${t.status === "belum" ? "Sudah (lagi)" : "Sudah"}</button>`;
    return `<li class="${t.status === "disetujui" ? "beres" : ""}"><span class="cek">${IKON_JENIS[t.jenis] || "⭐"}</span>
      <span>${esc(t.judul)}${t.bintang ? ` <span class="muted">★${t.bintang}</span>` : ""}${t.status === "belum" ? ` <span class="ulang">· diminta mengulang</span>` : ""}</span>${kanan}</li>`;
  }).join("")}</ul>`;
}
const segera = (judul, teks) => `<section class="panel segera"><h3>${judul}</h3><p class="muted">${teks}</p></section>`;
const tombolArena = () => `<a class="btn btn-utama btn-besar" href="/?arena=1">🌍 Masuk arena</a>`;
const tombolBimbel = () => `<a class="btn btn-besar" href="/bimbel/index.html">📚 Buka Ruang Pintar</a>`;

function kemajuan() {
  const b = k.belajar;
  if (!b) return `<p class="muted">Belum ada kemajuan. Mulai berlatih di Ruang Pintar.</p>`;
  return `<div class="mapel">${b.mapel.map((m) => `<div class="mapel-baris"><span>${esc(m.nama)}</span>${bar(m.total ? (m.selesai / m.total) * 100 : 0)}<span class="muted">${m.selesai}/${m.total} topik</span></div>`).join("")}</div>
    ${b.ulangi ? `<p class="catatan">💪 Coba ulangi: ${esc(b.ulangi.nama)} (${b.ulangi.best} ★ dari 3)</p>` : ""}`;
}
function permainanku() {
  return `<table class="stats"><thead><tr><th>Game</th><th>Main</th><th>Menang</th><th>Seri</th></tr></thead><tbody>
    ${Object.entries(k.games).map(([g, s]) => `<tr><td>${NAMA_GAME[g] || g}</td><td>${s.main}</td><td>${s.menang}</td><td>${s.seri}</td></tr>`).join("")}</tbody></table>`;
}
function daftarTeman() {
  const catatan = [k.permintaan ? `${k.permintaan} permintaan teman untukmu (jawab di panel Teman dalam arena)` : "",
    k.menunggu ? `${k.menunggu} pertemanan menunggu jawaban atau izin orang tua` : ""].filter(Boolean).map((t) => `<p class="catatan">${t}</p>`).join("");
  return (k.teman.length
    ? `<ul class="daftar">${k.teman.map((t) => `<li><span class="cek ${t.online ? "on" : ""}">●</span><span>${esc(t.name)} <span class="muted">(${esc(t.jenjang)})</span></span><span class="${t.online ? "on" : "muted"}">${t.online ? "di arena" : "tidak aktif"}</span></li>`).join("")}</ul>`
    : `<p class="muted">Belum ada teman. Klik avatar pemain lain di arena untuk berteman.</p>`) + catatan;
}
function grafikMinggu() {
  const max = Math.max(30, ...k.minggu.map((d) => d.minutes));
  return `<div class="week">${k.minggu.map((d) => `<div class="col" title="${d.day}: ${d.minutes} menit"><span class="val">${d.minutes}</span>
    <span class="stick" style="height:${Math.round((d.minutes / max) * 70)}px"></span><span class="day">${HARI[new Date(d.day + "T12:00:00+07:00").getDay()]}</span></div>`).join("")}</div>`;
}

// Uang saku dari orang tua; belanja, tabungan, dan target dicatat anak sendiri.
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
function uangSakuku(lengkap = false) {
  if (!uang || (!uang.riwayat.length && !uang.target)) return lengkap ? `<section class="panel"><h3>💰 Uang sakuku</h3><p class="muted">Belum ada uang saku dari orang tua.</p></section>` : "";
  const t = uang.target;
  const riwayat = lengkap && uang.riwayat.length ? `<ul class="daftar">${uang.riwayat.slice(0, 8).map((r) => `<li><span class="cek">${{ masuk: "➕", luar: "🎁", keluar: "🛒", tabung: "🐷", ambil: "↩️" }[r.jenis]}</span>
      <span>${{ masuk: `Uang saku dari ${esc(ch.namaOrtu)}`, luar: "Aku dapat uang", keluar: "Aku belanja", tabung: "Aku menabung", ambil: "Ambil dari tabungan" }[r.jenis]}${r.catatan ? ` <span class="muted">· ${esc(r.catatan)}</span>` : ""}</span>
      <span class="muted">${rp(r.jumlah)}</span>${r.oleh === "anak" ? `<button class="ghost kecil" data-hapus-uangku="${r.id}" title="Hapus catatan ini">✕</button>` : ""}</li>`).join("")}</ul>` : "";
  return `<section class="panel"><h3>💰 Uang sakuku</h3>
    <div class="dua-kecil"><div class="kotak"><span class="judul">👛 Dompet</span><span class="besar">${rp(uang.dompet)}</span></div>
      <div class="kotak"><span class="judul">🐷 Tabungan</span><span class="besar">${rp(uang.tabungan)}</span></div></div>
    ${t ? `<p class="target">🎯 Target <b>${esc(t.nama)}</b>: ${rp(uang.tabungan)} dari ${rp(t.jumlah)}</p>${bar(t.persen)}
      <p class="muted kecil">${t.kurang ? `Kurang ${rp(t.kurang)} lagi. Semangat menabung!` : "Target tercapai! 🎉"}</p>` : ""}
    ${riwayat}</section>`;
}

// ---------- isi tiap menu ----------
const ISI = {
  home: () => `${kepala()}${kotakAngka()}
    <div class="dua">
      <section class="panel"><h3>✅ Tugas hari ini</h3>${daftarTugas()}<h3 class="sub-judul">🎯 Misi belajar</h3>${daftarMisi()}</section>
      <section class="panel"><h3>Mau ke mana?</h3><div class="aksi-besar">${tombolArena()}${tombolBimbel()}</div>
        <h3 class="sub-judul">💬 Pesan dari ${esc(ch.namaOrtu)}</h3>${ch.terakhir
          ? `<p class="pesan-ortu">"${esc(ch.terakhir.isi)}"</p><button data-ke-hal="chat">${ch.n ? `Baca ${ch.n} pesan baru` : "Balas"}</button>`
          : `<p class="muted kecil">Belum ada pesan. <button class="link" data-ke-hal="chat">Kirim pesan</button></p>`}</section>
    </div>
    ${uangSakuku()}`,
  keuangan: () => {
    const b = uang?.bulanIni;
    return `<div class="tiga">
      <div class="kotak"><span class="judul">➕ Uang saku bulan ini</span><span class="besar">${b ? rp(b.masuk) : "–"}</span><span class="kecil">diberikan orang tua${b?.luar ? ` · +${rp(b.luar)} dari luar` : ""}</span></div>
      <div class="kotak"><span class="judul">🛒 Dibelanjakan</span><span class="besar">${b ? rp(b.keluar) : "–"}</span><span class="kecil">bulan ini</span></div>
      <div class="kotak"><span class="judul">🐷 Ditabung</span><span class="besar">${b ? rp(Math.max(0, b.tabung)) : "–"}</span><span class="kecil">bulan ini</span></div></div>
    <div class="dua">
      <form class="panel" id="form-uangku"><h3>✏️ Catat uangku</h3>
        <label>Apa yang kamu lakukan? <select name="jenis"><option value="keluar">🛒 Aku belanja</option><option value="luar">🎁 Aku dapat uang (bukan uang saku)</option><option value="tabung">🐷 Aku menabung</option><option value="ambil">↩️ Ambil dari tabungan</option></select></label>
        <label>Berapa? (Rp) <input name="jumlah" inputmode="numeric" required placeholder="Contoh: 5000" autocomplete="off" /></label>
        <label>Keterangan (boleh kosong) <input name="catatan" maxlength="80" placeholder="Contoh: jajan, beli buku, hadiah dari nenek" /></label>
        <div><button class="primary" type="submit">Simpan</button></div></form>
      <form class="panel" id="form-targetku"><h3>🎯 Target tabunganku</h3>
        ${uang?.target ? `<p class="target"><b>${esc(uang.target.nama)}</b>: ${rp(uang.tabungan)} dari ${rp(uang.target.jumlah)}</p>${bar(uang.target.persen)}` : `<p class="muted">Mau menabung untuk apa?</p>`}
        <label>Nama target <input name="nama" maxlength="40" value="${uang?.target ? esc(uang.target.nama) : ""}" placeholder="Contoh: Sepeda" /></label>
        <label>Jumlah (Rp) <input name="jumlah" inputmode="numeric" value="${uang?.target ? uang.target.jumlah : ""}" placeholder="Contoh: 500000" autocomplete="off" /></label>
        <div class="row"><button class="primary" type="submit">${uang?.target ? "Ubah target" : "Pasang target"}</button>${uang?.target ? `<button type="button" class="ghost" id="hapus-targetku">Hapus target</button>` : ""}</div></form>
    </div>
    ${uangSakuku(true)}
    <p class="muted kecil">Ini hanya catatan, bukan uang sungguhan di aplikasi. Bintang tetap untuk Toko Avatar.</p>`;
  },
  tugas: () => `<div class="tiga">
      <div class="kotak"><span class="judul">✅ Hari ini</span><span class="besar">${tg ? `${tg.hariIni.disetujui} / ${tg.hariIni.total}` : "–"}</span><span class="kecil">tugas disetujui orang tua</span></div>
      <div class="kotak"><span class="judul">⏳ Menunggu dicek</span><span class="besar">${tg ? tg.hariIni.menunggu : "–"}</span><span class="kecil">orang tua akan mengecek</span></div>
      <div class="kotak"><span class="judul">📅 7 hari terakhir</span><span class="besar">${tg?.minggu.persen ?? "–"}${tg?.minggu.persen != null ? "%" : ""}</span><span class="kecil">tugas selesai</span></div></div>
    <section class="panel"><h3>✅ Tugas dari orang tua</h3><p class="muted kecil">Tekan "Sudah" setelah selesai. Bintang masuk setelah orang tua menyetujui.</p>${daftarTugas(true)}</section>
    <section class="panel"><h3>🎯 Misi belajar hari ini</h3>${daftarMisi()}</section>`,
  arena: () => `<div class="dua">
      <section class="panel"><h3>🌍 Dunia arena</h3><p class="muted">Jalan-jalan, main Catur, Scramble, dan Kartu Kilat, lalu belanja di Toko Avatar.</p>
        ${kotakWaktu()}<div class="aksi-besar">${tombolArena()}</div></section>
      <section class="panel"><h3>🤝 Teman</h3>${daftarTeman()}</section>
    </div>
    <section class="panel"><h3>🎲 Permainanku</h3>${permainanku()}</section>`,
  bimbel: () => `<div class="dua">
      <section class="panel"><h3>📚 Ruang Pintar</h3><p class="muted">Latihan soal dan tryout sesuai kelasmu. Bintang dan XP didapat dari sini.</p>
        <div class="aksi-besar">${tombolBimbel()}</div></section>
      <section class="panel"><h3>🎯 Misi hari ini</h3>${daftarMisi()}</section>
    </div>
    <section class="panel"><h3>📈 Kemajuan belajar</h3>${kemajuan()}</section>`,
  report: () => {
    const b = k.belajar;
    const tryout = b?.tryoutTerakhir.length
      ? `<ul class="daftar">${b.tryoutTerakhir.map((t) => `<li><span class="cek">📝</span><span>${esc(t.mapel)}: nilai ${t.score} (${t.c}/${t.n} benar)</span><span class="muted">${new Date(t.d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span></li>`).join("")}</ul>`
      : `<p class="muted">Belum ada tryout.</p>`;
    return `${kotakAngka()}
      <section class="panel"><h3>⏰ Waktu bermain 7 hari</h3>${grafikMinggu()}</section>
      <div class="dua"><section class="panel"><h3>📝 Tryout terakhir</h3>${tryout}</section>
        <section class="panel"><h3>🎲 Permainanku</h3>${permainanku()}</section></div>
      ${uangSakuku(true)}`;
  },
  chat: () => `<section class="panel chat-keluarga"><h3>💬 Chat dengan ${esc(ch.namaOrtu)}</h3>
      <div class="gelembung" id="gelembung"><p class="muted">Memuat…</p></div>
      <form id="form-chat" class="chat-form"><textarea name="isi" rows="2" maxlength="300" placeholder="Tulis pesan untuk ${esc(ch.namaOrtu)}…"></textarea><button class="primary" type="submit">Kirim</button></form>
      <p class="muted kecil">Chat dengan pemain lain tetap ada di dalam arena.</p></section>`,
  avatar: () => `${kepala()}
    <section class="panel"><h3>🐻 Pilih avatar</h3><div id="pilih-avatar"></div><span id="avatar-ok" class="muted" hidden>Avatar tersimpan ✓</span>
      <p class="muted kecil">Mau hiasan baru? <button class="link" data-ke-hal="toko">Buka Toko Avatar</button></p></section>`,
  toko: () => `${kepala()}
    <section class="panel"><h3>🛍️ Toko Avatar <span class="saldo">★ ${toko ? toko.bintang : k.bintang} bintang</span></h3>
      <p class="muted">Tukar bintang dari Ruang Pintar dengan aksesori. Aksesori yang dipakai juga terlihat di arena.</p><div id="toko-isi">${toko ? isiToko() : "<p class=\"muted\">Memuat toko…</p>"}</div></section>`,
};

function isiToko() {
  return SLOT.map((sl) => {
    const items = toko.items.filter((a) => a.slot === sl.id);
    if (!items.length) return "";
    return `<h4>${esc(sl.name)}</h4><div class="toko-grid">${items.map((a) => {
      const punya = toko.punya.includes(a.id), pakai = toko.pakai.includes(a.id), cukup = toko.bintang >= a.harga;
      const tombol = punya ? `<button data-pakai="${a.id}" data-on="${pakai ? 0 : 1}" class="${pakai ? "" : "primary"}">${pakai ? "Lepas" : "Pakai"}</button>`
        : yakinBeli === a.id ? `<button data-beli="${a.id}" class="yakin">Yakin? ★ ${a.harga}</button>`
        : `<button data-beli="${a.id}" ${cukup ? "" : "disabled"}>${cukup ? "Beli" : "Bintang kurang"}</button>`;
      return `<div class="toko-item ${pakai ? "pakai" : ""}"><span class="av-face">${gambarAvatar(a.id)}</span><b>${esc(a.name)}</b>
        <span class="muted">${punya ? (pakai ? "Sedang dipakai" : "Sudah dimiliki") : `★ ${a.harga}`}</span>${tombol}</div>`;
    }).join("")}</div>`;
  }).join("");
}

// ---------- menggambar menu ----------
function gambar() {
  const [judul, sub] = HAL[hal];
  $("judul").textContent = hal === "home" ? `Halo, ${anak.name}!` : judul;
  $("sub").textContent = sub;
  $("menu").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.ke === hal));
  clearInterval(chatTimer);
  $("halaman").innerHTML = ISI[hal]();
  if (hal === "avatar") pasangAvatar();
  if (hal === "toko" && !toko) {
    api("GET", "toko").then((j) => { toko = j; if (hal === "toko") gambar(); }).catch((x) => galat(x.message));
  }
  if (hal === "chat") pasangChat();
  if (hal === "keuangan") pasangKeuangan();
  tandaChat();
}
function tandaChat() { $("chat-badge").textContent = ch.n; $("chat-badge").hidden = !ch.n || hal === "chat"; }

// Chat keluarga: pesan dimuat ulang tiap 5 detik selama menu Chat terbuka. Enter mengirim, Shift+Enter baris baru.
function pasangChat() {
  const f = $("form-chat");
  const muat = async () => {
    if (hal !== "chat") return clearInterval(chatTimer);
    try {
      const { pesan } = await api("GET", "chat/keluarga?sebagai=anak");
      const g = $("gelembung");
      if (!g) return;
      const bawah = g.scrollTop + g.clientHeight >= g.scrollHeight - 20;
      g.innerHTML = pesan.length
        ? pesan.map((p) => `<div class="gel ${p.dari === "anak" ? "saya" : "dia"}"><div>${esc(p.isi).replace(/\n/g, "<br>")}</div>
            <span class="muted kecil">${new Date(p.at).toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit" })}${p.dari === "anak" && p.dibaca ? " · dibaca" : ""}</span></div>`).join("")
        : `<p class="muted">Belum ada pesan. Kirim salam ke ${esc(ch.namaOrtu)}!</p>`;
      if (bawah || !g.dataset.sudah) { g.scrollTop = g.scrollHeight; g.dataset.sudah = "1"; }
      ch.n = 0;
      tandaChat();
    } catch (x) { galat(x.message); }
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    galat("");
    if (!f.isi.value.trim()) return;
    f.querySelector("button").disabled = true;
    try {
      await api("POST", "chat/keluarga", { sebagai: "anak", isi: f.isi.value });
      f.isi.value = "";
      await muat();
      $("gelembung").scrollTop = $("gelembung").scrollHeight;
    } catch (x) { galat(x.message); } finally { f.querySelector("button").disabled = false; f.isi.focus(); }
  };
  f.isi.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
  muat();
  chatTimer = setInterval(muat, 5000);
}
function keHal(h) {
  hal = h;
  galat("");
  history.replaceState(null, "", h === "home" ? location.pathname : `#${h}`);
  gambar();
  window.scrollTo(0, 0);
}
$("menu").addEventListener("click", (e) => { const b = e.target.closest("[data-ke]"); if (b) keHal(b.dataset.ke); });
$("halaman").addEventListener("click", (e) => { const b = e.target.closest("[data-ke-hal]"); if (b) keHal(b.dataset.keHal); });

function pasangAvatar() {
  let okTimer = 0;
  avatarPicker($("pilih-avatar"), {
    value: anak.avatar, accent: anak.color,
    onPick: async (avatar) => {
      galat("");
      try {
        await api("POST", "avatar", { avatar, sebagai: "anak" });
        anak.avatar = avatar;
        document.querySelectorAll(".kepala-anak .ava-besar").forEach((el) => (el.innerHTML = gambarAvatar()));
        $("avatar-ok").hidden = false;
        clearTimeout(okTimer);
        okTimer = setTimeout(() => ($("avatar-ok").hidden = true), 2000);
      } catch (x) { galat(x.message); }
    },
  });
}
// Menu Keuangan: mencatat belanja/menabung/ambil tabungan, memasang target, menghapus catatan sendiri.
function pasangKeuangan() {
  const kirim = async (form, fn) => {
    galat("");
    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try { uang = await fn(); gambar(); }
    catch (x) { galat(x.message); form.querySelectorAll("button").forEach((b) => (b.disabled = false)); }
  };
  const fu = $("form-uangku");
  fu.onsubmit = (e) => { e.preventDefault(); kirim(fu, () => api("POST", "keuangan/saya", { jenis: fu.jenis.value, jumlah: fu.jumlah.value, catatan: fu.catatan.value })); };
  const ft = $("form-targetku");
  ft.onsubmit = (e) => { e.preventDefault(); kirim(ft, () => api("PUT", "keuangan/saya/target", { nama: ft.nama.value, jumlah: ft.jumlah.value })); };
  const ht = $("hapus-targetku");
  if (ht) ht.onclick = () => kirim(ft, () => api("DELETE", "keuangan/saya/target"));
}
$("halaman").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-hapus-uangku]");
  if (!b || !confirm("Hapus catatan ini?")) return;
  galat("");
  try { uang = await api("DELETE", `keuangan/saya/${b.dataset.hapusUangku}`); gambar(); } catch (x) { galat(x.message); }
});
// Menandai tugas "Sudah".
$("halaman").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-sudah]");
  if (!b) return;
  galat("");
  b.disabled = true;
  try { tg = await api("POST", `tugas/${b.dataset.sudah}/sudah`); gambar(); }
  catch (x) { galat(x.message); b.disabled = false; }
});
// Beli (klik kedua untuk yakin) dan pakai/lepas aksesori di menu Toko Avatar.
$("halaman").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-beli], button[data-pakai]");
  if (!b || b.disabled || !toko) return;
  galat("");
  try {
    if (b.dataset.beli) {
      const id = b.dataset.beli;
      if (yakinBeli !== id) { yakinBeli = id; $("toko-isi").innerHTML = isiToko(); return; }
      yakinBeli = null;
      b.disabled = true;
      toko = { ...toko, ...(await api("POST", "toko/beli", { id })) };
      toko = { ...toko, ...(await api("POST", "toko/pakai", { id, pakai: true })) };
    } else {
      b.disabled = true;
      toko = { ...toko, ...(await api("POST", "toko/pakai", { id: b.dataset.pakai, pakai: b.dataset.on === "1" })) };
    }
    k.bintang = toko.bintang;
    anak.aksesori = toko.pakai.join(",");
  } catch (x) { galat(x.message); }
  gambar();
});

$("btn-keluar").onclick = async () => {
  await api("POST", "anak/keluar").catch(() => {});
  location.href = "/";
};

// ---------- muat ----------
async function muat() {
  let me;
  try { me = await api("GET", "saya"); } catch (x) { $("memuat").textContent = x.message; return; }
  $("memuat").hidden = true;
  if (!me.anak) { $("belum").hidden = false; return; }
  anak = me.anak;
  try { k = await api("GET", "kamarku"); } catch (x) { $("memuat").hidden = false; $("memuat").textContent = x.message; return; }
  tg = await api("GET", "tugas/saya").catch(() => null);
  uang = await api("GET", "keuangan/saya").catch(() => null);
  ch = await api("GET", "chat/belum?sebagai=anak").catch(() => ch);
  // Bintang bisa bertambah saat orang tua menyetujui tugas: segarkan ringkasan sesekali.
  setInterval(async () => {
    if (document.hidden) return;
    const [k2, tg2, ch2, u2] = await Promise.all([api("GET", "kamarku").catch(() => null), api("GET", "tugas/saya").catch(() => null), api("GET", "chat/belum?sebagai=anak").catch(() => null), api("GET", "keuangan/saya").catch(() => null)]);
    let beda = (k2 && k2.bintang !== k.bintang) || (tg2 && JSON.stringify(tg2) !== JSON.stringify(tg)) || (ch2 && JSON.stringify(ch2) !== JSON.stringify(ch));
    if (k2) k = k2;
    if (tg2) tg = tg2;
    if (u2) { if (JSON.stringify(u2) !== JSON.stringify(uang)) beda = true; uang = u2; }
    if (ch2 && hal !== "chat") ch = ch2;
    if (beda && !["avatar", "toko", "chat", "keuangan"].includes(hal)) gambar(); else tandaChat();
  }, 30000);
  $("dash").hidden = false;
  $("top-nav").hidden = false;
  document.title = `Dashboard ${anak.name}`;
  gambar();
}
muat();

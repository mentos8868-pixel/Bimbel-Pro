// Dashboard anak: halaman pertama setelah anak masuk. Menu: Home, Tugas, Arena, Bimbel, Report, Chat, Avatar.
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
  report: ["Report", "Catatan bermain dan belajarmu."],
  chat: ["Chat", "Pesan dengan orang tua."],
  avatar: ["Avatar", "Pilih avatar dan hias dengan aksesori."],
};
let hal = HAL[location.hash.slice(1)] ? location.hash.slice(1) : "home";
let anak = null;   // profil dari /api/saya
let k = null;      // ringkasan dari /api/kamarku
let toko = null;   // isi toko dari /api/toko (dimuat saat menu Avatar dibuka)
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

// ---------- isi tiap menu ----------
const ISI = {
  home: () => `${kepala()}${kotakAngka()}
    <div class="dua">
      <section class="panel"><h3>🎯 Hari ini</h3>${daftarMisi()}<p class="muted kecil">Tugas dari orang tua segera hadir di sini.</p></section>
      <section class="panel"><h3>Mau ke mana?</h3><div class="aksi-besar">${tombolArena()}${tombolBimbel()}</div>
        <p class="muted kecil">💬 Pesan dari orang tua segera hadir.</p></section>
    </div>`,
  tugas: () => `<section class="panel"><h3>🎯 Misi belajar hari ini</h3>${daftarMisi()}</section>
    ${segera("Tugas dari orang tua", "Segera hadir. Orang tuamu akan bisa memberi tugas seperti salat, mencuci piring, atau belajar. Kamu tinggal menekan \"Sudah\", lalu orang tua memberi bintang.")}`,
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
        <section class="panel"><h3>🎲 Permainanku</h3>${permainanku()}</section></div>`;
  },
  chat: () => segera("Chat dengan orang tua", "Segera hadir. Di sini kamu bisa mengirim pesan ke orang tuamu. Chat dengan pemain lain tetap ada di dalam arena."),
  avatar: () => `${kepala()}
    <section class="panel"><h3>🐻 Pilih avatar</h3><div id="pilih-avatar"></div><span id="avatar-ok" class="muted" hidden>Avatar tersimpan ✓</span></section>
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
  $("halaman").innerHTML = ISI[hal]();
  if (hal === "avatar") pasangAvatar();
}
function keHal(h) {
  hal = h;
  galat("");
  history.replaceState(null, "", h === "home" ? location.pathname : `#${h}`);
  gambar();
  window.scrollTo(0, 0);
}
$("menu").addEventListener("click", (e) => { const b = e.target.closest("[data-ke]"); if (b) keHal(b.dataset.ke); });

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
        if (toko) $("toko-isi").innerHTML = isiToko();
        $("avatar-ok").hidden = false;
        clearTimeout(okTimer);
        okTimer = setTimeout(() => ($("avatar-ok").hidden = true), 2000);
      } catch (x) { galat(x.message); }
    },
  });
  if (!toko) {
    api("GET", "toko").then((j) => { toko = j; if (hal === "avatar") gambar(); }).catch((x) => galat(x.message));
  }
}
// Beli (klik kedua untuk yakin) dan pakai/lepas aksesori di menu Avatar.
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
  $("dash").hidden = false;
  $("top-nav").hidden = false;
  document.title = `Dashboard ${anak.name}`;
  gambar();
}
muat();

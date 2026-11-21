// Dashboard orang tua: masuk/daftar, laporan per anak, pengaturan, kode masuk, dan hapus data.
import { api } from "./api.js";
import { avatarPicker } from "./avatar-picker.js";
import { avatarSvg } from "./avatar-svg.js";
import { NEGARA, DEFAULT_NEGARA, negaraName, KURIKULUM, kurikulumName, namaKelas } from "../../shared/negara.js";

const $ = (id) => document.getElementById(id);
// Pilihan kelas mengikuti kurikulum: Merdeka "Kelas 1 SD" … "Kelas 12 SMA", Cambridge/Singapore "Primary 1 (P1)" ….
function fillKelasOptions(sel, kur, kelas) {
  sel.replaceChildren();
  if (!kur) { sel.add(new Option("Pilih kurikulum dulu", "", true, true)); sel.disabled = true; return; }
  sel.disabled = false;
  sel.add(new Option("Pilih kelas", "", !kelas, !kelas));
  for (let k = 1; k <= 12; k++) sel.add(new Option(namaKelas(k, kur), String(k)));
  sel.value = kelas ? String(kelas) : "";
}
// Isi pilihan kurikulum (dipilih dulu), kelas, dan negara pada sebuah formulir.
// kurikulum = "" untuk formulir anak baru: kelas baru bisa dipilih setelah kurikulum dipilih.
function fillKelasNegara(root, kelas, negara, kurikulum = "") {
  const kurSel = root.querySelector(".pilih-kurikulum"), kelSel = root.querySelector(".pilih-kelas");
  if (!kurSel.options.length) {
    kurSel.add(new Option("Pilih kurikulum", ""));
    for (const k of KURIKULUM) kurSel.add(new Option(k.name, k.id));
    kurSel.addEventListener("change", () => fillKelasOptions(kelSel, kurSel.value, Number(kelSel.value) || 0));
  }
  kurSel.value = kurikulum;
  fillKelasOptions(kelSel, kurikulum, kelas);
  root.querySelectorAll(".pilih-negara").forEach((s) => {
    if (!s.options.length) for (const n of NEGARA) s.add(new Option(n.name, n.id));
    s.value = negara || DEFAULT_NEGARA;
  });
}
const kelasText = (c) => `${kurikulumName(c.kurikulum)} · ${c.kelas ? namaKelas(c.kelas, c.kurikulum) : c.jenjang} · ${negaraName(c.negara)}`;
const COLORS = ["#4f9cf0", "#ef6f5e", "#f2b134", "#3e9b4f", "#9b7bd8", "#ec7fb5"];
const GAME_NAME = { catur: "Catur", scramble: "Scramble", kartu: "Kartu Kilat" };
const OUTCOME = { menang: "menang", kalah: "kalah", seri: "seri" };
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const setErr = (root, text) => {
  const e = root.querySelector(".error");
  e.textContent = text || "";
  e.hidden = !text;
};
const busy = (form, on) => form.querySelectorAll("button").forEach((b) => (b.disabled = on));

function colorPicker(wrap, initial, onPick) {
  let chosen = initial;
  wrap.replaceChildren(...COLORS.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.style.background = c;
    b.setAttribute("aria-label", "Warna " + c);
    b.className = c === chosen ? "on" : "";
    b.onclick = () => {
      chosen = c;
      wrap.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      onPick(c);
    };
    return b;
  }));
}

// ---------------- masuk / daftar ----------------
// Hiasan perkenalan: satu keluarga avatar (ayah, ibu, dua anak).
$("intro-family").innerHTML = ["beruang-ayah", "beruang-ibu", "beruang-putri", "beruang-putra"]
  .map((id) => `<span class="fam">${avatarSvg(id, "#4f9cf0", { sized: true })}</span>`).join("");
// Tombol "Lihat" untuk menampilkan/menyembunyikan kata sandi (membantu saat mengetik di HP).
document.querySelectorAll(".pw-eye").forEach((b) => {
  b.onclick = () => {
    const inp = b.previousElementSibling;
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.textContent = show ? "Sembunyikan" : "Lihat";
    b.setAttribute("aria-label", show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
  };
});
// Tampilkan salah satu formulir: masuk | daftar | lupa | atur. Tab hanya terlihat untuk masuk/daftar.
function showAuth(which) {
  for (const k of ["masuk", "daftar", "lupa", "atur"]) $("form-" + k).hidden = k !== which;
  document.querySelector(".tabs").hidden = which === "lupa" || which === "atur";
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x.dataset.tab === which));
}
document.querySelectorAll(".tabs button").forEach((t) => { t.onclick = () => showAuth(t.dataset.tab); });
document.querySelectorAll("[data-show]").forEach((b) => {
  b.onclick = () => {
    if (b.dataset.show === "lupa") $("form-lupa").email.value = $("form-masuk").email.value;
    if (location.hash) history.replaceState(null, "", location.pathname);
    showAuth(b.dataset.show);
  };
});

$("form-lupa").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const notice = f.querySelector(".notice");
  setErr(f, "");
  notice.hidden = true;
  busy(f, true);
  try {
    await api("POST", "lupa-sandi", { email: f.email.value });
    notice.textContent = `Bila ${f.email.value.trim()} terdaftar, tautan sudah dikirim ke email tersebut. Periksa juga folder Spam.`;
    notice.hidden = false;
  } catch (x) { setErr(f, x.message); } finally { busy(f, false); }
});

// Tautan dari email: orangtua.html#atur=<token>. Token disimpan di memori lalu dihapus dari alamat.
let resetToken = "";
{
  const m = location.hash.match(/^#atur=([\w-]+)$/);
  if (m) {
    resetToken = m[1];
    history.replaceState(null, "", location.pathname);
    showAuth("atur");
  }
}
$("form-atur").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  setErr(f, "");
  if (!resetToken) return setErr(f, "Tautan tidak lengkap. Minta tautan baru lewat \"Lupa kata sandi?\".");
  busy(f, true);
  try {
    await api("POST", "atur-sandi", { token: resetToken, password: f.password.value });
    resetToken = "";
    f.reset();
    showAuth("masuk");
    await load();
  } catch (x) { setErr(f, x.message); } finally { busy(f, false); }
});

$("form-masuk").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  setErr(f, "");
  busy(f, true);
  try {
    await api("POST", "masuk", { email: f.email.value, password: f.password.value });
    f.reset();
    await load();
  } catch (x) { setErr(f, x.message); } finally { busy(f, false); }
});

$("form-daftar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  setErr(f, "");
  if (!f.consent.checked) return setErr(f, "Centang persetujuan orang tua dulu.");
  busy(f, true);
  try {
    await api("POST", "daftar", { name: f.name.value, email: f.email.value, password: f.password.value, consent: true });
    f.reset();
    await load();
  } catch (x) { setErr(f, x.message); } finally { busy(f, false); }
});

$("btn-keluar").onclick = async () => {
  await api("POST", "keluar").catch(() => {});
  load();
};

// ---------------- tambah anak ----------------
let newColor = COLORS[0];
const newAvatar = avatarPicker($("avatar-baru"), { accent: newColor });
colorPicker($("warna-baru"), newColor, (c) => { newColor = c; newAvatar.setAccent(c); });
fillKelasNegara($("form-anak"), 0, DEFAULT_NEGARA);
$("form-anak").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  setErr(f, "");
  if (!f.kurikulum.value) return setErr(f, "Pilih kurikulum sekolah dulu.");
  if (!f.kelas.value) return setErr(f, "Pilih kelas anak.");
  if (!/^\d{4}$/.test(f.pin.value)) return setErr(f, "PIN harus 4 angka.");
  busy(f, true);
  try {
    await api("POST", "anak", { name: f.name.value, kelas: Number(f.kelas.value), kurikulum: f.kurikulum.value, negara: f.negara.value, pin: f.pin.value, color: newColor, avatar: newAvatar.get() });
    f.reset();
    fillKelasNegara(f, 0, DEFAULT_NEGARA);
    await load();
  } catch (x) { setErr(f, x.message); } finally { busy(f, false); }
});

// ---------------- hapus akun ----------------
$("form-hapus-akun").addEventListener("submit", async (e) => {
  e.preventDefault();
  const box = e.target.closest("details");
  setErr(box, "");
  if (!confirm("Hapus akun orang tua beserta semua akun anak dan riwayatnya? Ini tidak bisa dibatalkan.")) return;
  try {
    await api("DELETE", "akun", { password: e.target.password.value });
    load();
  } catch (x) { setErr(box, x.message); }
});

// ---------------- kartu per anak ----------------
function li(text, buttons) {
  const el = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = text;
  const btns = document.createElement("span");
  btns.className = "row";
  for (const [label, cls, fn] of buttons) {
    const b = document.createElement("button");
    b.textContent = label;
    if (cls) b.className = cls;
    b.onclick = fn;
    btns.appendChild(b);
  }
  el.append(span, btns);
  return el;
}

function renderSocial(el, c, soc) {
  const run = async (fn) => {
    setErr(el, "");
    try { await fn(); load(); } catch (x) { setErr(el, x.message); }
  };
  const approvals = el.querySelector(".approvals");
  approvals.replaceChildren(...(soc?.approvals || []).map((a) => {
    const row = li(
      a.direction === "masuk"
        ? `${a.name} (${a.jenjang}) ingin berteman dengan ${c.name}` + (a.childAccepted ? "" : " — belum dijawab anak")
        : `${c.name} ingin berteman dengan ${a.name} (${a.jenjang})` + (a.childAccepted ? "" : " — menunggu jawaban teman"),
      [["Setujui", "primary", () => run(() => api("POST", `teman/${a.id}/setujui`))],
       ["Tolak", "", () => run(() => api("POST", `teman/${a.id}/tolak`))]],
    );
    row.className = "approval";
    return row;
  }));
  const friends = el.querySelector(".friends");
  const list = soc?.friends || [];
  friends.replaceChildren(...(list.length ? list.map((f) => li(`${f.name} (${f.jenjang})`, [
    ["Hapus pertemanan", "ghost danger-text", () => confirm(`Hapus pertemanan ${c.name} dengan ${f.name}?`) && run(() => api("DELETE", `teman/${f.id}`))],
  ])) : [Object.assign(document.createElement("li"), { textContent: "Belum ada teman." })]));
  const blocks = soc?.blocks || [];
  el.querySelector(".blocks-box").hidden = !blocks.length;
  el.querySelector(".blocks").replaceChildren(...blocks.map((b) => li(b.name, [
    ["Buka blokir", "", () => run(() => api("DELETE", "blokir", { childId: c.id, uid: b.uid }))],
  ])));
}

// Kemajuan Ruang Pintar (dari /api/laporan → belajar; null bila anak belum pernah membukanya).
function renderBelajar(box, b) {
  const q = (sel) => box.querySelector(sel);
  if (!b) {
    q(".belajar-ringkas").textContent = "Belum ada kemajuan. Kemajuan muncul setelah anak berlatih di Ruang Pintar (Ruang Bimbel di arena).";
    q(".belajar-tryout-box").hidden = true;
    return;
  }
  q(".belajar-ringkas").textContent = `${b.sesi} sesi latihan · ${b.latihan7Hari} dalam 7 hari terakhir`
    + (b.medali.total ? ` · ${b.medali.punya} dari ${b.medali.total} medali` : "");
  q(".belajar-mapel").replaceChildren(...b.mapel.map((m) => {
    const row = document.createElement("div");
    row.className = "belajar-baris";
    const nama = document.createElement("span");
    nama.textContent = m.nama;
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.width = `${m.total ? Math.round((m.selesai / m.total) * 100) : 0}%`;
    bar.appendChild(fill);
    const angka = document.createElement("span");
    angka.className = "muted";
    angka.textContent = `${m.selesai}/${m.total} topik`;
    row.append(nama, bar, angka);
    return row;
  }));
  q(".belajar-ulangi").textContent = b.ulangi ? `Perlu diulang: ${b.ulangi.nama} (${b.ulangi.best} dari 3 bintang)` : "";
  const list = q(".belajar-tryout");
  list.replaceChildren(...(b.tryoutTerakhir.length ? b.tryoutTerakhir : [null]).map((t) => {
    const li = document.createElement("li");
    li.textContent = t
      ? `${t.mapel}: nilai ${t.score} (${t.c} dari ${t.n} benar) · ${new Date(t.d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`
      : "Belum ada tryout.";
    return li;
  }));
}

function renderKid(c, soc) {
  const el = $("tpl-anak").content.firstElementChild.cloneNode(true);
  const dot = el.querySelector(".dot");
  dot.classList.add("av-face");
  dot.innerHTML = avatarSvg(c.avatar, c.color, { aksesori: c.aksesori, aura: c.aura });
  avatarPicker(el.querySelector(".av-edit-picker"), {
    value: c.avatar, accent: c.color,
    onPick: async (avatar) => {
      setErr(el, "");
      try {
        await api("PATCH", `anak/${c.id}`, { avatar });
        dot.innerHTML = avatarSvg(avatar, c.color, { aksesori: c.aksesori, aura: c.aura });
        const ok = el.querySelector(".av-saved");
        ok.hidden = false;
        setTimeout(() => (ok.hidden = true), 2000);
      } catch (x) { setErr(el, x.message); }
    },
  });
  el.querySelector(".nama").textContent = c.name;
  el.querySelector(".jenjang").textContent = kelasText(c);

  const used = c.week.at(-1)?.minutes ?? c.usedMin;
  const fill = el.querySelector(".bar-fill");
  if (c.limitMin) {
    el.querySelector(".today-text").textContent = `${used} dari ${c.limitMin} menit`;
    const pct = Math.min(100, (used / c.limitMin) * 100);
    fill.style.width = pct + "%";
    fill.classList.toggle("warn", pct >= 75 && pct < 100);
    fill.classList.toggle("full", pct >= 100);
  } else {
    el.querySelector(".today-text").textContent = `${used} menit (tanpa batas)`;
    fill.style.width = "0%";
  }

  const max = Math.max(30, ...c.week.map((d) => d.minutes));
  el.querySelector(".week").replaceChildren(...c.week.map((d) => {
    const col = document.createElement("div");
    col.className = "col";
    const val = document.createElement("span");
    val.className = "val";
    val.textContent = d.minutes;
    const stick = document.createElement("span");
    stick.className = "stick";
    stick.style.height = `${Math.round((d.minutes / max) * 70)}px`;
    const day = document.createElement("span");
    day.className = "day";
    day.textContent = HARI[new Date(d.day + "T12:00:00+07:00").getDay()];
    col.title = `${d.day}: ${d.minutes} menit`;
    col.append(val, stick, day);
    return col;
  }));

  el.querySelector(".stats tbody").replaceChildren(...Object.entries(c.stats).map(([g, s]) => {
    const tr = document.createElement("tr");
    for (const v of [GAME_NAME[g], s.main, s.menang, s.kalah, s.seri]) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    }
    return tr;
  }));

  const recent = el.querySelector(".recent");
  if (!c.recent.length) {
    const li = document.createElement("li");
    li.textContent = "Belum ada permainan.";
    recent.appendChild(li);
  }
  for (const r of c.recent) {
    const li = document.createElement("li");
    const when = new Date(r.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    li.textContent = `${GAME_NAME[r.game]} (${r.mode === "bot" ? "lawan bot" : "online"}): ${OUTCOME[r.outcome]}`
      + (r.game === "scramble" ? `, ${r.score} poin` : "") + ` · ${when}`;
    recent.appendChild(li);
  }

  renderBelajar(el.querySelector(".belajar"), c.belajar);

  // Pengaturan
  const s = el.querySelector(".settings");
  fillKelasNegara(s, c.kelas, c.negara, c.kurikulum);
  s.limitMin.value = String(c.limitMin);
  if (![...s.limitMin.options].some((o) => o.value === String(c.limitMin))) {
    s.limitMin.add(new Option(`${c.limitMin} menit`, String(c.limitMin), true, true));
  }
  s.allowStrangers.checked = c.allowStrangers;
  s.chat.value = c.chat;
  s.approveFriends.checked = c.approveFriends;
  renderSocial(el, c, soc);
  if (c.jenjang === "SD") s.chat.querySelector('[value="bebas"]').disabled = true;
  s.addEventListener("submit", async (e) => {
    e.preventDefault();
    setErr(el, "");
    if (!s.kelas.value) return setErr(el, "Pilih kelas anak.");
    busy(s, true);
    try {
      const r = await api("PATCH", `anak/${c.id}`, {
        kelas: Number(s.kelas.value), kurikulum: s.kurikulum.value, negara: s.negara.value,
        limitMin: Number(s.limitMin.value), allowStrangers: s.allowStrangers.checked, chat: s.chat.value,
        approveFriends: s.approveFriends.checked,
      });
      Object.assign(c, r.child);
      el.querySelector(".jenjang").textContent = kelasText(c);
      const ok = s.querySelector(".saved");
      ok.hidden = false;
      setTimeout(() => (ok.hidden = true), 2000);
    } catch (x) { setErr(el, x.message); } finally { busy(s, false); }
  });

  el.querySelector(".btn-kode").onclick = async () => {
    setErr(el, "");
    try {
      const r = await api("POST", `anak/${c.id}/kode`);
      const until = new Date(r.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const box = el.querySelector(".kode-box");
      box.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = r.code;
      box.append(`Kode masuk untuk ${c.name}: `, strong,
        ` — berlaku sekali sampai pukul ${until}. Di HP/tablet anak, buka arena lalu pilih "Saya anak: pakai kode masuk".`);
      box.hidden = false;
    } catch (x) { setErr(el, x.message); }
  };
  el.querySelector(".btn-pin").onclick = async () => {
    const pin = prompt(`PIN baru untuk ${c.name} (4 angka):`);
    if (pin === null) return;
    if (!/^\d{4}$/.test(pin)) return setErr(el, "PIN harus 4 angka.");
    try {
      await api("PATCH", `anak/${c.id}`, { pin });
      setErr(el, "");
      alert("PIN sudah diganti.");
    } catch (x) { setErr(el, x.message); }
  };
  el.querySelector(".btn-hapus").onclick = async () => {
    if (!confirm(`Hapus akun ${c.name} beserta laporan dan riwayatnya? Ini tidak bisa dibatalkan.`)) return;
    try {
      await api("DELETE", `anak/${c.id}`);
      load();
    } catch (x) { setErr(el, x.message); }
  };
  return el;
}

// ---------------- menu samping ----------------
// Setiap bagian ditandai data-hal="<menu> [menu lain]". Menu yang tidak aktif disembunyikan dengan kelas
// "luar" (bukan atribut hidden, karena beberapa bagian memakai hidden untuk keperluan lain).
const HAL = {
  home: ["Home", "Ringkasan semua anak hari ini."],
  tugas: ["Tugas", "Tugas rumah, ibadah, dan belajar untuk anak."],
  arena: ["Arena", "Hasil permainan, teman, dan izin di arena."],
  keuangan: ["Keuangan", "Uang saku dan tabungan anak."],
  chat: ["Chat", "Pesan keluarga dan riwayat chat arena."],
  report: ["Report", "Waktu bermain dan kemajuan belajar."],
  setting: ["Setting", "Data anak, batas waktu, PIN, dan akun Anda."],
};
// Menu yang isinya per anak (menampilkan pilihan anak di atas).
const PER_ANAK = new Set(["tugas", "arena", "report", "setting"]);
let hal = HAL[location.hash.slice(1)] ? location.hash.slice(1) : "home";
let anakDipilih = null;
try { anakDipilih = Number(sessionStorage.getItem("ortu_anak")) || null; } catch { /* abaikan */ }
let namaOrtu = "";

function terapkanHal() {
  const [judul, sub] = HAL[hal];
  $("halo").textContent = hal === "home" ? `Halo, ${namaOrtu}!` : judul;
  $("sub-hal").textContent = sub;
  $("menu").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.ke === hal));
  $("dash").querySelectorAll("[data-hal]").forEach((el) => el.classList.toggle("luar", !el.dataset.hal.split(" ").includes(hal)));
  const kids = [...$("kids").children];
  if (kids.length && !kids.some((k) => Number(k.dataset.anak) === anakDipilih)) anakDipilih = Number(kids[0].dataset.anak);
  for (const k of kids) k.hidden = !PER_ANAK.has(hal) || Number(k.dataset.anak) !== anakDipilih;
  $("pilih-anak").hidden = !PER_ANAK.has(hal) || kids.length < 2;
  $("pilih-anak").querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.anak) === anakDipilih));
  if (hal === "tugas") gambarTugas();
  if (hal === "home") gambarHome();
}
// Kartu Home digambar ulang setiap kali dibuka, supaya angka tugas yang baru disetujui ikut berubah.
let dataHome = { children: [], byId: {} };
function gambarHome() {
  const { children, byId } = dataHome;
  const kosong = Object.assign(document.createElement("section"), { className: "panel" });
  kosong.innerHTML = '<h2>Belum ada akun anak</h2><p class="muted">Tambahkan akun anak di menu Setting.</p><div><button class="primary">⚙️ Ke Setting</button></div>';
  kosong.querySelector("button").onclick = () => keHal("setting");
  $("home").replaceChildren(...(children.length ? children.map((c) => kartuHome(c, byId[c.id])) : [kosong]));
}
function keHal(h, idAnak) {
  hal = h;
  if (idAnak) anakDipilih = idAnak;
  try { sessionStorage.setItem("ortu_anak", String(anakDipilih || "")); } catch { /* abaikan */ }
  history.replaceState(null, "", h === "home" ? location.pathname : `#${h}`);
  terapkanHal();
  window.scrollTo(0, 0);
}
$("menu").addEventListener("click", (e) => { const b = e.target.closest("[data-ke]"); if (b) keHal(b.dataset.ke); });
$("pilih-anak").addEventListener("click", (e) => { const b = e.target.closest("[data-anak]"); if (b) keHal(hal, Number(b.dataset.anak)); });

// ---------------- menu Tugas ----------------
// Data dari GET /api/tugas: { anak: { <id>: { tugas, menunggu, hariIni, minggu } } }.
let dataTugas = {};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const IKON_JENIS = { ibadah: "🕌", rumah: "🏠", belajar: "📚", lainnya: "⭐" };
const NAMA_JENIS = { ibadah: "Ibadah", rumah: "Rumah", belajar: "Belajar", lainnya: "Lainnya" };
const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const jadwalTeks = (t) => (t.jadwal === "harian" ? "Setiap hari" : t.jadwal === "sekali" ? "Sekali" : t.hari.map((h) => NAMA_HARI[h]).join(", "));
const STATUS = { "": ["○", "belum dikerjakan", ""], menunggu: ["⏳", "menunggu dicek", "tunggu"], disetujui: ["✔", "disetujui", "ok"], belum: ["↺", "diminta mengulang", "ulang"] };
function tanggalTeks(tgl) {
  const hariIni = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const kemarin = new Date(Date.now() + 7 * 3600e3 - 86400e3).toISOString().slice(0, 10);
  return tgl === hariIni ? "hari ini" : tgl === kemarin ? "kemarin" : new Date(tgl + "T12:00:00+07:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

function gambarTugas() {
  const box = $("tugas-isi");
  const d = dataTugas[anakDipilih];
  if (!d) { box.innerHTML = '<section class="panel"><p class="muted">Tambahkan akun anak dulu di menu Setting.</p></section>'; return; }
  const nama = esc(document.querySelector(`#pilih-anak [data-anak="${anakDipilih}"]`)?.textContent || "anak");
  const kotak = (judul, isi, kecil) => `<div class="kotak-ortu"><span class="muted">${judul}</span><b>${isi}</b><span class="muted kecil">${kecil}</span></div>`;
  const tunggu = d.menunggu.length
    ? d.menunggu.map((t) => `<li class="approval"><span>${IKON_JENIS[t.jenis] || ""} <b>${esc(t.judul)}</b> · ${tanggalTeks(t.tanggal)}${t.bintang ? ` · ★${t.bintang}` : ""}</span>
        <span class="row"><button class="primary" data-setujui="${t.id}" data-tgl="${t.tanggal}">Setujui</button><button data-belum="${t.id}" data-tgl="${t.tanggal}">Belum</button></span></li>`).join("")
    : `<li class="muted kosong">Tidak ada tugas yang menunggu dicek.</li>`;
  const daftar = d.tugas.length
    ? d.tugas.map((t) => {
        const [ikon, teks, kelas] = STATUS[t.status] || STATUS[""];
        return `<li><span class="tugas-ikon">${IKON_JENIS[t.jenis] || ""}</span><span class="tugas-judul"><b>${esc(t.judul)}</b><span class="muted kecil">${NAMA_JENIS[t.jenis]} · ${jadwalTeks(t)}${t.bintang ? ` · ★${t.bintang}` : ""}</span></span>
          <span class="tugas-status ${kelas}">${t.hariIni ? `${ikon} ${teks}` : '<span class="muted">bukan hari ini</span>'}</span>
          <button class="ghost danger-text" data-hapus="${t.id}">Hapus</button></li>`;
      }).join("")
    : `<li class="muted kosong">Belum ada tugas. Buat tugas pertama di bawah.</li>`;
  box.innerHTML = `
    <div class="tiga-ortu">
      ${kotak("Tugas hari ini", `${d.hariIni.disetujui} / ${d.hariIni.total}`, "sudah disetujui")}
      ${kotak("Menunggu dicek", d.menunggu.length, d.menunggu.length ? "perlu tindakan Anda" : "semua sudah dicek")}
      ${kotak("7 hari terakhir", d.minggu.persen === null ? "–" : `${d.minggu.persen}%`, `${d.minggu.beres} dari ${d.minggu.wajib} tugas selesai`)}
    </div>
    <section class="panel"><h2>Menunggu dicek</h2><ul class="tugas-list">${tunggu}</ul></section>
    <section class="panel"><h2>Tugas ${nama}</h2><ul class="tugas-list">${daftar}</ul></section>
    <form class="panel" id="form-tugas">
      <h2>Tugas baru untuk ${nama}</h2>
      <div class="grid2">
        <label>Nama tugas <input name="judul" maxlength="60" required placeholder="Contoh: Salat Subuh, Mencuci piring" /></label>
        <label>Jenis <select name="jenis">${Object.entries(NAMA_JENIS).map(([k, v]) => `<option value="${k}">${IKON_JENIS[k]} ${v}</option>`).join("")}</select></label>
        <label>Jadwal <select name="jadwal"><option value="harian">Setiap hari</option><option value="hari">Hari tertentu</option><option value="sekali">Sekali saja</option></select></label>
        <label>Bintang hadiah (masuk saat Anda setujui) <select name="bintang">${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>${n ? "★".repeat(n) + ` (${n})` : "Tanpa bintang"}</option>`).join("")}</select></label>
      </div>
      <div class="pilih-hari" hidden>${NAMA_HARI.map((h, i) => `<label class="check"><input type="checkbox" name="hari" value="${i}" /><span>${h}</span></label>`).join("")}</div>
      <p class="error" hidden></p>
      <div><button class="primary" type="submit">Tambah tugas</button></div>
    </form>`;
  const f = $("form-tugas");
  f.jadwal.onchange = () => (f.querySelector(".pilih-hari").hidden = f.jadwal.value !== "hari");
  f.onsubmit = async (e) => {
    e.preventDefault();
    setErr(f, "");
    const hari = [...f.querySelectorAll('[name="hari"]:checked')].map((x) => Number(x.value));
    if (f.jadwal.value === "hari" && !hari.length) return setErr(f, "Pilih minimal satu hari.");
    busy(f, true);
    try {
      dataTugas[anakDipilih] = await api("POST", "tugas", { childId: anakDipilih, judul: f.judul.value, jenis: f.jenis.value, jadwal: f.jadwal.value, hari, bintang: Number(f.bintang.value) });
      gambarTugas();
    } catch (x) { setErr(f, x.message); busy(f, false); }
  };
}
// Tombol Setujui / Belum / Hapus di menu Tugas.
$("tugas-isi").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-setujui], button[data-belum], button[data-hapus]");
  if (!b) return;
  try {
    if (b.dataset.hapus) {
      const judul = b.closest("li").querySelector(".tugas-judul b").textContent;
      if (!confirm(`Hapus tugas "${judul}"? Riwayatnya tetap tersimpan.`)) return;
      dataTugas[anakDipilih] = await api("DELETE", `tugas/${b.dataset.hapus}`);
    } else {
      b.disabled = true;
      const aksi = b.dataset.setujui ? "setujui" : "belum";
      dataTugas[anakDipilih] = await api("POST", `tugas/${b.dataset.setujui || b.dataset.belum}/${aksi}`, { tanggal: b.dataset.tgl });
    }
    gambarTugas();
  } catch (x) { alert(x.message); b.disabled = false; }
});

// Kartu ringkas per anak di Home.
function kartuHome(c, soc) {
  const el = document.createElement("article");
  el.className = "panel home-kartu";
  const used = c.week.at(-1)?.minutes ?? c.usedMin;
  const persen = c.limitMin ? Math.min(100, Math.round((used / c.limitMin) * 100)) : 0;
  const tunggu = (soc?.approvals || []).length;
  const tg = dataTugas[c.id];
  const b = c.belajar;
  el.innerHTML = `<header class="kid-head"><span class="dot av-face"></span><div><h2 class="nama"></h2><span class="muted jenjang"></span></div></header>
    <div><div class="today-label"><strong>Hari ini</strong><span class="t"></span></div>
      <div class="bar"><span class="bar-fill ${persen >= 100 ? "full" : persen >= 75 ? "warn" : ""}" style="width:${persen}%"></span></div></div>
    <ul class="home-poin"></ul>
    <div class="row"><button data-buka="tugas">✅ Tugas</button><button data-buka="report">📊 Report</button><button data-buka="arena">🎮 Arena</button><button data-buka="setting">⚙️ Setting</button></div>`;
  el.querySelector(".dot").innerHTML = avatarSvg(c.avatar, c.color, { aksesori: c.aksesori, aura: c.aura });
  el.querySelector(".nama").textContent = c.name;
  el.querySelector(".jenjang").textContent = kelasText(c);
  el.querySelector(".t").textContent = c.limitMin ? `${used} dari ${c.limitMin} menit` : `${used} menit (tanpa batas)`;
  const menang = Object.values(c.stats).reduce((n, s) => n + s.menang, 0), main = Object.values(c.stats).reduce((n, s) => n + s.main, 0);
  const poin = [
    b ? `📚 ${b.latihan7Hari} latihan minggu ini · ${b.medali.punya}/${b.medali.total} medali` : "📚 Belum berlatih di Ruang Pintar",
    b?.ulangi ? `💪 Perlu diulang: ${b.ulangi.nama}` : "",
    tg && tg.hariIni.total ? `✅ Tugas hari ini ${tg.hariIni.disetujui}/${tg.hariIni.total} disetujui` : "✅ Belum ada tugas hari ini",
    tg?.menunggu.length ? `⏳ ${tg.menunggu.length} tugas menunggu Anda cek` : "",
    `🎮 ${main} permainan · ${menang} menang`,
    tunggu ? `⚠️ ${tunggu} permintaan teman menunggu persetujuan Anda` : "",
  ].filter(Boolean);
  el.querySelector(".home-poin").replaceChildren(...poin.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
  el.addEventListener("click", (e) => { const x = e.target.closest("[data-buka]"); if (x) keHal(x.dataset.buka, c.id); });
  return el;
}

// ---------------- muat ----------------
async function load() {
  $("memuat").hidden = false;
  let me;
  try {
    me = await api("GET", "saya");
  } catch (x) {
    $("memuat").textContent = x.message;
    return;
  }
  $("memuat").hidden = true;
  // Tautan atur ulang kata sandi tetap ditampilkan walaupun perangkat ini masih masuk.
  const masuk = !!me.ortu && !resetToken;
  $("auth").hidden = masuk;
  $("dash").hidden = !masuk;
  $("top-nav").hidden = !masuk;
  if (!masuk) return;
  namaOrtu = me.ortu.name;
  const [{ children }, social, tugas] = await Promise.all([api("GET", "laporan"), api("GET", "teman"), api("GET", "tugas")]);
  dataTugas = tugas.anak;
  const byId = Object.fromEntries(social.children.map((s) => [s.childId, s]));
  $("kids").replaceChildren(...children.map((c) => {
    const el = renderKid(c, byId[c.id]);
    el.dataset.anak = c.id;
    return el;
  }));
  $("pilih-anak").replaceChildren(...children.map((c) => {
    const b = document.createElement("button");
    b.dataset.anak = c.id;
    b.textContent = c.name;
    return b;
  }));
  dataHome = { children, byId };
  $("form-anak").querySelector("h2").textContent = children.length ? "Tambah akun anak" : "Mulai dengan menambah akun anak";
  terapkanHal();
}

load();

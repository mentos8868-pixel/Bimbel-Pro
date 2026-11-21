// Dashboard orang tua: masuk/daftar, laporan per anak, pengaturan, kode masuk, dan hapus data.
import { api } from "./api.js";
import { pasangSuara } from "./chat-suara.js";
import { gelembungChat, kotakPesanChat } from "./chat-tampilan.js";
import { avatarPicker } from "./avatar-picker.js";
import { AVATAR_AWAL_ANAK, DEFAULT_ORTU_AVATAR } from "../../shared/avatars.js";
import { avatarSvg } from "./avatar-svg.js";
import { AKSESORI, SLOT } from "../../shared/aksesori.js";
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
// Tanda pesan baru di menu Chat diperbarui tiap 30 detik.
setInterval(() => { if (!$("dash").hidden && !document.hidden) segarkanBelum().then(() => { if (hal === "home") gambarHome(); }); }, 30000);
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

// Pilihan berbentuk kartu bergambar (dipakai untuk peran Ayah/Ibu dan jenis anak). Mengembalikan { get, set }.
function pilihKartu(wrap, opsi, awal, onPick = () => {}) {
  let nilai = awal;
  const gambar = () => {
    wrap.replaceChildren(...opsi.map((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kartu-peran" + (o.id === nilai ? " on" : "");
      b.setAttribute("aria-pressed", o.id === nilai);
      b.innerHTML = `<span class="av-face">${avatarSvg(o.avatar, o.warna || "#4f9cf0")}</span><b></b>`;
      b.querySelector("b").textContent = o.label;
      b.onclick = () => { nilai = o.id; gambar(); onPick(o.id); };
      return b;
    }));
  };
  gambar();
  return { get: () => nilai, set: (v) => { nilai = v; gambar(); } };
}
const PILIH_PERAN = [
  { id: "ayah", label: "Ayah", avatar: "manusia-ayah", warna: "#5b6b7c" },
  { id: "ibu", label: "Ibu", avatar: "manusia-ibu", warna: "#5b6b7c" },
];
const peranDaftar = pilihKartu($("peran-daftar"), PILIH_PERAN, "");

$("form-daftar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  setErr(f, "");
  if (!peranDaftar.get()) return setErr(f, "Pilih dulu: Ayah atau Ibu.");
  if (!f.consent.checked) return setErr(f, "Centang persetujuan orang tua dulu.");
  busy(f, true);
  try {
    await api("POST", "daftar", { name: f.name.value, email: f.email.value, password: f.password.value, consent: true, peran: peranDaftar.get(), kode: f.kode.value });
    peranDaftar.set("");
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
// Anak baru langsung memilih Anak laki-laki atau Anak perempuan (avatar manusia; avatar lain dibeli di Toko).
const PILIH_ANAK = [
  { id: AVATAR_AWAL_ANAK[0], label: "Anak laki-laki", avatar: AVATAR_AWAL_ANAK[0] },
  { id: AVATAR_AWAL_ANAK[1], label: "Anak perempuan", avatar: AVATAR_AWAL_ANAK[1] },
];
const newAvatar = pilihKartu($("avatar-baru"), PILIH_ANAK, AVATAR_AWAL_ANAK[0]);
colorPicker($("warna-baru"), newColor, (c) => { newColor = c; });
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
    dimiliki: c.avatarPunya,
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
  avatar: ["Avatar", "Avatar Anda sendiri, dipakai saat bermain di arena."],
  setting: ["Setting", "Data anak, batas waktu, PIN, dan akun Anda."],
};
// Menu yang isinya per anak (menampilkan pilihan anak di atas).
const PER_ANAK = new Set(["tugas", "arena", "keuangan", "chat", "report", "setting"]);
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
  $("pilih-anak").hidden = hal === "chat" || !PER_ANAK.has(hal) || kids.length < 2;
  $("pilih-anak").querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.anak) === anakDipilih));
  if (hal === "tugas") gambarTugas();
  if (hal === "keuangan") gambarKeuangan();
  if (hal === "avatar") gambarAvatarOrtu();
  if (hal === "home") gambarHome();
  if (hal === "chat") gambarChat();
  else { clearInterval(chatTimer); bersihkanSuara?.(); bersihkanSuara = null; }
  tandaChat();
}
// Kartu Home digambar ulang setiap kali dibuka, supaya angka tugas yang baru disetujui ikut berubah.
let dataHome = { children: [], byId: {} };
function gambarHome() {
  const { children, byId } = dataHome;
  if (children.length) {
    const daftar = children.flatMap((c) => (dataTugas[c.id]?.menunggu ?? []).map((t) => ({ ...t, anak: c })));
    daftar.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const persetujuan = document.createElement("section");
    persetujuan.className = "panel home-persetujuan";
    persetujuan.innerHTML = `<h2>Tugas perlu disetujui</h2>${daftar.length
      ? `<ul class="tugas-list">${daftar.map((t) => `<li class="approval">
        <span class="tugas-judul"><b>${esc(t.judul)}</b><span class="muted kecil">${esc(t.anak.name)} · ${tanggalTeks(t.tanggal)}${t.bintang ? ` · ★ ${t.bintang}` : ""}</span></span>
        <button type="button" data-cek-anak="${t.anak.id}" aria-label="Cek tugas ${esc(t.judul)} untuk ${esc(t.anak.name)}">Cek tugas</button>
      </li>`).join("")}</ul>`
      : '<p class="muted">Tidak ada tugas yang menunggu persetujuan.</p>'}`;
    persetujuan.addEventListener("click", (e) => {
      const tombol = e.target.closest("[data-cek-anak]");
      if (tombol) keHal("tugas", Number(tombol.dataset.cekAnak));
    });
    $("home").replaceChildren(persetujuan, ...children.map((c) => kartuHome(c, byId[c.id])));
    return;
  }
  const kosong = Object.assign(document.createElement("section"), { className: "panel" });
  kosong.innerHTML = '<h2>Belum ada akun anak</h2><p class="muted">Tambahkan akun anak di menu Setting.</p><div><button class="primary">⚙️ Ke Setting</button></div>';
  kosong.querySelector("button").onclick = () => keHal("setting");
  $("home").replaceChildren(kosong);
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
// Alamat #menu diubah dari luar (tautan, tombol Kembali): pindah menu juga.
window.addEventListener("hashchange", () => { const h = location.hash.slice(1) || "home"; if (HAL[h] && h !== hal && !$("dash").hidden) keHal(h); });
$("pilih-anak").addEventListener("click", (e) => { const b = e.target.closest("[data-anak]"); if (b) keHal(hal, Number(b.dataset.anak)); });

// ---------------- menu Tugas ----------------
// Data dari GET /api/tugas: { anak: { <id>: { tugas, menunggu, hariIni, minggu } } }.
let dataTugas = {};
let kuotaBintangTugas = null;
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
    <section class="panel"><h2>Menunggu dicek</h2>
      ${kuotaBintangTugas ? `<p class="muted">Sisa kuota hari ini: ${kuotaBintangTugas.sisa} dari ${kuotaBintangTugas.batas} bintang untuk semua anak. Kuota direset setiap pukul 00.00 WIB.</p>` : ""}
      <ul class="tugas-list">${tunggu}</ul></section>
    <section class="panel"><h2>Tugas ${nama}</h2><ul class="tugas-list">${daftar}</ul></section>
    <form class="panel" id="form-tugas">
      <h2>Tugas baru untuk ${nama}</h2>
      <div class="grid2">
        <label>Nama tugas <input name="judul" maxlength="60" required placeholder="Contoh: Salat Subuh, Mencuci piring" /></label>
        <label>Jenis <select name="jenis">${Object.entries(NAMA_JENIS).map(([k, v]) => `<option value="${k}">${IKON_JENIS[k]} ${v}</option>`).join("")}</select></label>
        <label>Jadwal <select name="jadwal"><option value="harian">Setiap hari</option><option value="hari">Hari tertentu</option><option value="sekali">Sekali saja</option></select></label>
        <label>Bintang hadiah (masuk saat Anda setujui) <select name="bintang">${[1, 2, 3].map((n) => `<option value="${n}">${"★".repeat(n)} (${n})</option>`).join("")}</select></label>
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
  // Bintang dari tugas bisa ditukar dengan hadiah dari orang tua.
  gambarHadiah(box, esc(document.querySelector(`#pilih-anak [data-anak="${anakDipilih}"]`)?.dataset.nama || "anak"));
}
// Tombol Setujui / Belum / Hapus di menu Tugas.
$("tugas-isi").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-setujui], button[data-belum], button[data-hapus]");
  if (!b) return;
  const childId = anakDipilih;
  try {
    if (b.dataset.hapus) {
      const judul = b.closest("li").querySelector(".tugas-judul b").textContent;
      if (!confirm(`Hapus tugas "${judul}"? Riwayatnya tetap tersimpan.`)) return;
      dataTugas[childId] = await api("DELETE", `tugas/${b.dataset.hapus}`);
    } else {
      b.disabled = true;
      const aksi = b.dataset.setujui ? "setujui" : "belum";
      const { kuotaBintang, ...ringkasan } = await api("POST", `tugas/${b.dataset.setujui || b.dataset.belum}/${aksi}`, { tanggal: b.dataset.tgl });
      dataTugas[childId] = ringkasan;
      kuotaBintangTugas = kuotaBintang;
    }
    gambarTugas();
  } catch (x) { alert(x.message); b.disabled = false; }
});

// ---------------- menu Chat ----------------
// Chat keluarga dan riwayat arena untuk anak yang dipilih.
let belumDibaca = {};   // { <id anak>: jumlah pesan anak yang belum dibaca }
let chatTimer = 0;
let bersihkanSuara;
const jam = (at) => new Date(at).toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit" });
const CHAT_ARENA = { mati: "Chat arena anak sedang dimatikan, jadi tidak ada pesan baru.", siap: "Anak hanya bisa memakai pesan siap pakai di arena.", bebas: "Anak boleh menulis teks bebas (disaring) di arena." };

function tandaChat() {
  const n = Object.values(belumDibaca).reduce((a, b) => a + b, 0);
  $("chat-badge").textContent = n;
  $("chat-badge").hidden = !n;
  $("pilih-anak").querySelectorAll("button").forEach((b) => {
    const k = belumDibaca[b.dataset.anak] || 0;
    b.textContent = b.dataset.nama + (k && hal === "chat" ? ` (${k})` : "");
  });
  $("chat-isi").querySelectorAll("[data-chat-anak]").forEach((b) => {
    const n = belumDibaca[b.dataset.chatAnak] || 0;
    const badge = b.querySelector(".chat-belum");
    badge.textContent = n;
    badge.hidden = !n;
  });
}
async function segarkanBelum() {
  try { belumDibaca = (await api("GET", "chat/belum?sebagai=ortu")).anak; tandaChat(); } catch { /* abaikan */ }
}

async function gambarChat() {
  const box = $("chat-isi");
  clearInterval(chatTimer);
  bersihkanSuara?.();
  bersihkanSuara = null;
  const id = anakDipilih;
  const pilihan = [...$("pilih-anak").querySelectorAll("[data-anak]")];
  const namaAnak = pilihan.find((b) => Number(b.dataset.anak) === id)?.dataset.nama || "Anak";
  const nama = esc(namaAnak);
  box.innerHTML = `<div class="chat-jendela">
    <nav class="chat-daftar" aria-label="Percakapan"><h2>Percakapan</h2>
      <ul class="chat-prioritas">
        <li><span>Family</span><small>Grup belum tersedia</small></li>
        <li><span>Papa</span><small>Belum terhubung</small></li>
        <li><span>Mama</span><small>Belum terhubung</small></li>
        <li class="chat-grup-anak"><span>Anak</span>
          ${pilihan.length ? pilihan.map((b) => `<button type="button" data-chat-anak="${b.dataset.anak}" aria-pressed="${Number(b.dataset.anak) === id}">
        <span class="chat-inisial" aria-hidden="true">${esc(b.dataset.nama.slice(0, 1).toUpperCase())}</span><span>${esc(b.dataset.nama)}</span><span class="chat-belum" hidden></span>
          </button>`).join("") : '<small>Belum ada akun anak</small>'}
        </li>
        <li><span>Teman</span><small>Chat teman di arena</small></li>
      </ul>
    </nav>
    ${id ? `<section class="chat-keluarga" aria-labelledby="judul-chat">
      <header class="chat-kepala"><h2 id="judul-chat">${nama}</h2>
        <button type="button" id="btn-chat-arena" aria-controls="chat-arena" aria-expanded="false">Riwayat arena</button>
      </header>
      <section class="chat-arena" id="chat-arena" hidden aria-label="Riwayat chat arena ${nama}"><p class="muted kecil" id="arena-ket"></p><ul class="arena-log" id="arena-log"></ul></section>
      ${kotakPesanChat(namaAnak)}
      <p class="error" role="status" hidden></p>
    </section>` : '<p class="muted chat-kosong">Tambahkan akun anak di menu Setting untuk memulai percakapan.</p>'}
  </div>`;
  if (!id) return;
  tandaChat();
  box.querySelectorAll("[data-chat-anak]").forEach((b) => {
    b.onclick = () => { if (Number(b.dataset.chatAnak) !== id) keHal("chat", Number(b.dataset.chatAnak)); };
  });
  const f = $("form-chat");
  const g = $("gelembung");
  const sec = f.closest(".chat-keluarga");
  const aktif = () => hal === "chat" && f.isConnected && !$("dash").hidden;
  let versiMuat = 0;
  let isiTerakhir;
  const muatPesan = async () => {
    if (!aktif()) return;
    const versi = ++versiMuat;
    try {
      const { pesan } = await api("GET", `chat/keluarga?sebagai=ortu&anak=${id}`);
      if (!aktif() || versi !== versiMuat) return;
      const isi = pesan.length ? pesan.map((p) => gelembungChat(p, "ortu", `sebagai=ortu&anak=${id}`, jam, { saya: dataOrtu.id })).join("") : `<p class="muted chat-kosong">Belum ada pesan dengan ${nama}.</p>`;
      if (isi !== isiTerakhir && ![...g.querySelectorAll("audio")].some((audio) => !audio.paused)) {
        const bawah = g.scrollTop + g.clientHeight >= g.scrollHeight - 20;
        g.innerHTML = isi;
        if (bawah || isiTerakhir === undefined) g.scrollTop = g.scrollHeight;
        isiTerakhir = isi;
      }
      belumDibaca[id] = 0;
      tandaChat();
    } catch (x) { if (aktif() && versi === versiMuat) setErr(sec, x.message); }
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    setErr(sec, "");
    const kirimTeks = f.querySelector('[type="submit"]');
    if (kirimTeks.disabled || !f.isi.value.trim()) return;
    kirimTeks.disabled = true;
    try {
      await api("POST", "chat/keluarga", { sebagai: "ortu", anak: id, isi: f.isi.value });
      f.isi.value = "";
      await muatPesan();
      g.scrollTop = g.scrollHeight;
    } catch (x) { if (aktif()) setErr(sec, x.message); } finally { kirimTeks.disabled = false; if (aktif()) f.isi.focus(); }
  };
  // Enter mengirim, Shift+Enter membuat baris baru (nyaman di laptop).
  f.isi.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } });
  bersihkanSuara = pasangSuara(f, { sebagai: "ortu", anak: id }, async () => {
    await muatPesan();
    g.scrollTop = g.scrollHeight;
  }, (pesan) => setErr(sec, pesan));
  chatTimer = setInterval(muatPesan, 5000);
  muatPesan();
  const tombolArena = $("btn-chat-arena");
  const arena = $("chat-arena");
  const ket = $("arena-ket");
  const log = $("arena-log");
  tombolArena.onclick = async () => {
    arena.hidden = !arena.hidden;
    tombolArena.setAttribute("aria-expanded", String(!arena.hidden));
    if (arena.hidden) return;
    log.innerHTML = '<li class="muted">Memuat…</li>';
    try {
      const r = await api("GET", `chat/arena?sebagai=ortu&anak=${id}`);
      ket.textContent = `${CHAT_ARENA[r.chat] || ""} Pesan kiriman ${namaAnak} disimpan selama ${r.simpanHari} hari.`;
      log.innerHTML = r.pesan.length
        ? r.pesan.map((p) => `<li><span>${esc(p.isi)}${p.preset ? ' <span class="muted kecil">(pesan siap pakai)</span>' : ""}</span><span class="muted kecil">${jam(p.at)}</span></li>`).join("")
        : '<li class="muted">Belum ada chat di arena.</li>';
    } catch (x) { log.innerHTML = `<li class="error">${esc(x.message)}</li>`; }
  };
}

// ---------------- menu Keuangan ----------------
// Catatan uang saku dan tabungan anak (dari GET /api/keuangan). Hanya catatan, tidak ada uang yang berpindah.
// Orang tua hanya memberi uang saku; belanja, tabungan, dan target dicatat anak sendiri (orang tua melihat).
let dataUang = {};
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const UANG = {
  masuk: ["➕", "Uang saku masuk", "masuk"], luar: ["🎁", "Pemasukan dari luar", "masuk"], keluar: ["🛒", "Dibelanjakan", "keluar"],
  tabung: ["🐷", "Ditabung", "tabung"], ambil: ["↩️", "Diambil dari tabungan", "ambil"],
};
function gambarKeuangan() {
  const box = $("keuangan-isi");
  const d = dataUang[anakDipilih];
  if (!d) { box.innerHTML = '<section class="panel"><p class="muted">Tambahkan akun anak dulu di menu Setting.</p></section>'; return; }
  const nama = esc(document.querySelector(`#pilih-anak [data-anak="${anakDipilih}"]`)?.dataset.nama || "anak");
  const hariIni = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const kotak = (judul, isi, kecil) => `<div class="kotak-ortu"><span class="muted">${judul}</span><b>${isi}</b><span class="muted kecil">${kecil}</span></div>`;
  const t = d.target;
  box.innerHTML = `
    <div class="tiga-ortu">
      ${kotak("👛 Dompet", rp(d.dompet), "uang saku yang dipegang")}
      ${kotak("🐷 Tabungan", rp(d.tabungan), t ? `${t.persen}% dari target ${esc(t.nama)}` : "belum ada target")}
      ${kotak("📅 Bulan ini", rp(d.bulanIni.masuk), `uang saku${d.bulanIni.luar ? ` · ${rp(d.bulanIni.luar)} dari luar` : ""} · ${rp(d.bulanIni.keluar)} dibelanjakan · ${rp(d.bulanIni.tabung)} ditabung`)}
    </div>
    <div class="dua-ortu">
      <form class="panel" id="form-uang">
        <h2>➕ Beri uang saku ke ${nama}</h2>
        <div class="grid2">
          <label>Jumlah (Rp) <input name="jumlah" inputmode="numeric" required placeholder="Contoh: 20000" autocomplete="off" /></label>
          <label>Tanggal <input name="tanggal" type="date" value="${hariIni}" max="${hariIni}" /></label>
        </div>
        <label>Keterangan (boleh kosong) <input name="catatan" maxlength="80" placeholder="Contoh: uang saku minggu ini" /></label>
        <p class="error" hidden></p>
        <div><button class="primary" type="submit">Beri uang</button></div>
        <p class="muted kecil">Uang dari luar (mis. hadiah), belanja, menabung, dan target tabungan dicatat ${nama} sendiri di dashboard anak.</p>
      </form>
      <section class="panel">
        <h2>🎯 Target tabungan ${nama}</h2>
        ${t ? `<p><b>${esc(t.nama)}</b>: ${rp(d.tabungan)} dari ${rp(t.jumlah)}</p>
          <span class="bar"><span class="bar-fill" style="width:${t.persen}%"></span></span>
          <p class="muted">${t.kurang ? `Kurang ${rp(t.kurang)} lagi.` : "Target tercapai! 🎉"}</p>` : `<p class="muted">${nama} belum memasang target. Target dipasang anak sendiri di dashboard anak.</p>`}
      </section>
    </div>
    <section class="panel"><h2>Riwayat</h2><ul class="tugas-list">${d.riwayat.length ? d.riwayat.map((r) => {
      const [ik, tx, kelas] = UANG[r.jenis];
      return `<li><span class="tugas-ikon">${ik}</span><span class="tugas-judul"><b>${tx}</b><span class="muted kecil">${tanggalTeks(r.tanggal)} · dicatat ${r.oleh === "anak" ? nama : "Anda"}${r.catatan ? ` · ${esc(r.catatan)}` : ""}</span></span>
        <span class="uang ${kelas}">${r.jenis === "keluar" ? "−" : r.jenis === "masuk" || r.jenis === "luar" ? "+" : ""}${rp(r.jumlah)}</span>${r.oleh !== "anak" && r.jenis === "masuk" ? `<button class="ghost danger-text" data-hapus-uang="${r.id}">Hapus</button>` : ""}</li>`;
    }).join("") : '<li class="muted kosong">Belum ada catatan.</li>'}</ul></section>`;

  const fu = $("form-uang");
  fu.onsubmit = async (e) => {
    e.preventDefault();
    setErr(fu, "");
    busy(fu, true);
    try {
      dataUang[anakDipilih] = await api("POST", "keuangan", { childId: anakDipilih, jenis: "masuk", jumlah: fu.jumlah.value, catatan: fu.catatan.value, tanggal: fu.tanggal.value });
      gambarKeuangan();
    } catch (x) { setErr(fu, x.message); busy(fu, false); }
  };
}

// ---------------- Hadiah tukar bintang (di menu Tugas) ----------------
// Daftar hadiah berlaku untuk semua anak. Penukaran per anak menunggu persetujuan orang tua;
// bintang baru berkurang saat disetujui, dan hadiah uang otomatis tercatat sebagai uang saku masuk.
let dataHadiah = { hadiah: [], anak: {} };
const STATUS_TUKAR = { menunggu: ["⏳", "menunggu", "tunggu"], disetujui: ["✔", "disetujui", "ok"], ditolak: ["✕", "ditolak", "ulang"], batal: ["↩", "dibatalkan anak", ""] };
function gambarHadiah(box, nama) {
  const a = dataHadiah.anak[anakDipilih] || { bintang: 0, riwayat: [] };
  const menunggu = a.riwayat.filter((t) => t.status === "menunggu");
  const lain = a.riwayat.filter((t) => t.status !== "menunggu").slice(0, 8);
  const harga = (h) => `${h.bintang} ⭐ → ${h.rupiah ? rp(h.rupiah) : "hadiah bukan uang"}`;
  box.insertAdjacentHTML("beforeend", `
    <section class="panel"><h2>🎁 Hadiah tukar bintang <span class="saldo-ortu">${nama} punya ${a.bintang} ⭐</span></h2>
      <p class="muted">Anak menukar bintang dengan hadiah yang Anda buat. Bintang baru berkurang setelah Anda setujui; hadiah uang otomatis tercatat sebagai uang saku masuk.</p>
      <h3>Menunggu persetujuan</h3>
      <ul class="tugas-list">${menunggu.length ? menunggu.map((t) => `<li class="approval"><span>🎁 <b>${esc(t.nama)}</b> · ${t.bintang} ⭐${t.rupiah ? ` → ${rp(t.rupiah)}` : ""} · ${jam(t.at)}</span>
        <span class="row"><button class="primary" data-tukar-setujui="${t.id}">Setujui</button><button data-tukar-tolak="${t.id}">Tolak</button></span></li>`).join("")
        : `<li class="muted kosong">Tidak ada penukaran yang menunggu.</li>`}</ul>
      <h3>Daftar hadiah keluarga</h3>
      <ul class="tugas-list">${dataHadiah.hadiah.length ? dataHadiah.hadiah.map((h) => `<li><span class="tugas-ikon">${h.rupiah ? "💵" : "🎁"}</span>
        <span class="tugas-judul"><b>${esc(h.nama)}</b><span class="muted kecil">${harga(h)}</span></span><button class="ghost danger-text" data-hapus-hadiah="${h.id}">Hapus</button></li>`).join("")
        : `<li class="muted kosong">Belum ada hadiah. Contoh: "Uang saku", 50 bintang, Rp10.000.</li>`}</ul>
      <form id="form-hadiah" class="hadiah-form">
        <label>Nama hadiah <input name="nama" maxlength="50" required placeholder="Contoh: Uang saku, Jalan-jalan ke taman" /></label>
        <label>Harga (bintang) <input name="bintang" inputmode="numeric" required placeholder="50" autocomplete="off" /></label>
        <label>Uang (Rp, kosongkan bila bukan uang) <input name="rupiah" inputmode="numeric" placeholder="10000" autocomplete="off" /></label>
        <div><button class="primary" type="submit">Tambah hadiah</button></div>
      </form>
      <p class="error" hidden></p>
      ${lain.length ? `<h3>Riwayat penukaran ${nama}</h3><ul class="tugas-list">${lain.map((t) => {
        const [ik, tx, kelas] = STATUS_TUKAR[t.status] || ["", t.status, ""];
        return `<li><span class="tugas-judul"><b>${esc(t.nama)}</b><span class="muted kecil">${t.bintang} ⭐${t.rupiah ? ` → ${rp(t.rupiah)}` : ""} · ${jam(t.at)}</span></span><span class="tugas-status ${kelas}">${ik} ${tx}</span></li>`;
      }).join("")}</ul>` : ""}
    </section>`);
  const f = $("form-hadiah");
  const sec = f.closest("section");
  f.onsubmit = async (e) => {
    e.preventDefault();
    setErr(sec, "");
    busy(f, true);
    try {
      dataHadiah = await api("POST", "hadiah", { nama: f.nama.value, bintang: f.bintang.value, rupiah: f.rupiah.value });
      gambarTugas();
    } catch (x) { setErr(sec, x.message); busy(f, false); }
  };
}

$("keuangan-isi").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-hapus-uang]");
  if (!b || !confirm("Hapus catatan pemberian uang ini?")) return;
  try { dataUang[anakDipilih] = await api("DELETE", `keuangan/${b.dataset.hapusUang}`); gambarKeuangan(); }
  catch (x) { alert(x.message); }
});
// Tombol hadiah di menu Tugas: setujui/tolak penukaran, hapus hadiah.
$("tugas-isi").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-tukar-setujui], button[data-tukar-tolak], button[data-hapus-hadiah]");
  if (!b) return;
  try {
    if (b.dataset.hapusHadiah) {
      if (!confirm("Hapus hadiah ini? Penukaran yang masih menunggu ikut dibatalkan.")) return;
      dataHadiah = await api("DELETE", `hadiah/${b.dataset.hapusHadiah}`);
    } else {
      b.disabled = true;
      const id = b.dataset.tukarSetujui || b.dataset.tukarTolak;
      dataHadiah = await api("POST", `hadiah/tukar/${id}/${b.dataset.tukarSetujui ? "setujui" : "tolak"}`);
      // Hadiah uang menambah uang saku: muat ulang angka Keuangan anak.
      if (b.dataset.tukarSetujui) dataUang = (await api("GET", "keuangan")).anak;
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
    <div class="row"><button data-buka="tugas">✅ Tugas</button><button data-buka="chat">💬 Chat</button><button data-buka="report">📊 Report</button><button data-buka="arena">🎮 Arena</button><button data-buka="setting">⚙️ Setting</button></div>`;
  el.querySelector(".dot").innerHTML = avatarSvg(c.avatar, c.color, { aksesori: c.aksesori, aura: c.aura });
  el.querySelector(".nama").textContent = c.name;
  el.querySelector(".jenjang").textContent = kelasText(c);
  el.querySelector(".t").textContent = c.limitMin ? `${used} dari ${c.limitMin} menit` : `${used} menit (tanpa batas)`;
  const menang = Object.values(c.stats).reduce((n, s) => n + s.menang, 0), main = Object.values(c.stats).reduce((n, s) => n + s.main, 0);
  const poin = [
    b ? `📚 ${b.latihan7Hari} latihan minggu ini · ${b.medali.punya}/${b.medali.total} medali` : "📚 Belum berlatih di Ruang Pintar",
    b?.ulangi ? `💪 Perlu diulang: ${b.ulangi.nama}` : "",
    tg && tg.hariIni.total ? `✅ Tugas hari ini ${tg.hariIni.disetujui}/${tg.hariIni.total} disetujui` : "✅ Belum ada tugas hari ini",
    belumDibaca[c.id] ? `💬 ${belumDibaca[c.id]} pesan baru dari ${c.name}` : "",
    (dataHadiah.anak[c.id]?.riwayat || []).some((t) => t.status === "menunggu") ? `🎁 ${c.name} ingin menukar bintang dengan hadiah` : "",
    dataUang[c.id] ? `💰 Dompet ${rp(dataUang[c.id].dompet)} · Tabungan ${rp(dataUang[c.id].tabungan)}` : "",
    `🎮 ${main} permainan · ${menang} menang`,
    tunggu ? `⚠️ ${tunggu} permintaan teman menunggu persetujuan Anda` : "",
  ].filter(Boolean);
  el.querySelector(".home-poin").replaceChildren(...poin.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
  el.addEventListener("click", (e) => { const x = e.target.closest("[data-buka]"); if (x) keHal(x.dataset.buka, c.id); });
  return el;
}

// ---------------- menu Avatar: avatar orang tua ----------------
// Dibuat seperti menu Avatar anak: kartu besar di atas, lalu tab Karakter dan Aksesori.
// Aksesori gratis untuk orang tua (tidak memakai bintang). Aura tetap khusus hadiah belajar anak.
const WARNA_ORTU = "#5b6b7c";
let dataOrtu = { name: "", email: "", avatar: DEFAULT_ORTU_AVATAR, aksesori: [] };
let tabAvatarOrtu = "karakter";
const gambarOrtu = (coba) => avatarSvg(dataOrtu.avatar, WARNA_ORTU, { aksesori: coba ? [...dataOrtu.aksesori, coba] : dataOrtu.aksesori });

function gambarAvatarOrtu() {
  const box = $("avatar-ortu-isi");
  const dipakai = dataOrtu.aksesori.map((id) => AKSESORI.find((a) => a.id === id)?.name).filter(Boolean);
  const isiAksesori = SLOT.map((sl) => {
    const items = AKSESORI.filter((a) => a.slot === sl.id);
    if (!items.length) return "";
    return `<h3>${esc(sl.name)}</h3><div class="toko-grid">${items.map((a) => {
      const pakai = dataOrtu.aksesori.includes(a.id);
      return `<div class="toko-item ${pakai ? "pakai" : ""}"><span class="av-face" style="width:80px;height:80px">${gambarOrtu(a.id)}</span><b>${esc(a.name)}</b>
        <span class="muted kecil">${pakai ? "Sedang dipakai" : "Gratis untuk orang tua"}</span>
        <button data-aks-ortu="${a.id}" data-on="${pakai ? 0 : 1}" class="${pakai ? "" : "primary"}">${pakai ? "Lepas" : "Pakai"}</button></div>`;
    }).join("")}</div>`;
  }).join("");
  box.innerHTML = `
    <section class="panel kepala-ortu">
      <span class="ava-besar av-face" style="width:110px;height:110px">${gambarOrtu()}</span>
      <div><h2>${esc(dataOrtu.name)}</h2><span class="muted">Orang tua · dipakai saat Anda bermain di arena bersama anak</span>
        <p class="muted kecil">${dipakai.length ? `Aksesori: ${dipakai.map(esc).join(", ")}` : "Belum memakai aksesori"}</p></div>
    </section>
    <div class="tab-avatar" role="tablist">
      <button role="tab" data-tab-ortu="karakter" class="${tabAvatarOrtu === "karakter" ? "on" : ""}" aria-selected="${tabAvatarOrtu === "karakter"}">🐻 Karakter</button>
      <button role="tab" data-tab-ortu="aksesori" class="${tabAvatarOrtu === "aksesori" ? "on" : ""}" aria-selected="${tabAvatarOrtu === "aksesori"}">🎀 Aksesori</button>
    </div>
    ${tabAvatarOrtu === "aksesori"
      ? `<section class="panel"><h2>🎀 Aksesori</h2><p class="muted">Semua aksesori gratis untuk orang tua. Satu aksesori untuk setiap tempat (kepala, wajah, leher).</p>${isiAksesori}</section>`
      : `<section class="panel"><h2>🐻 Pilih karakter</h2><div id="ortu-avatar-picker"></div><span id="ortu-av-ok" class="muted" hidden>Avatar tersimpan ✓</span></section>`}`;
  if (tabAvatarOrtu !== "karakter") return;
  let okTimer = 0;
  avatarPicker($("ortu-avatar-picker"), {
    value: dataOrtu.avatar, accent: WARNA_ORTU, dimiliki: dataOrtu.avatarPunya,
    onPick: async (pilih) => {
      try {
        await api("POST", "avatar", { avatar: pilih, sebagai: "ortu" });
        dataOrtu.avatar = pilih;
        box.querySelector(".kepala-ortu .ava-besar").innerHTML = gambarOrtu();
        $("ortu-av-ok").hidden = false;
        clearTimeout(okTimer);
        okTimer = setTimeout(() => ($("ortu-av-ok").hidden = true), 2000);
      } catch (x) { alert(x.message); }
    },
  });
}
$("avatar-ortu-isi").addEventListener("click", async (e) => {
  const tab = e.target.closest("[data-tab-ortu]");
  if (tab) { tabAvatarOrtu = tab.dataset.tabOrtu; gambarAvatarOrtu(); return; }
  const b = e.target.closest("button[data-aks-ortu]");
  if (!b) return;
  b.disabled = true;
  try {
    dataOrtu.aksesori = (await api("POST", "avatar/aksesori", { id: b.dataset.aksOrtu, pakai: b.dataset.on === "1" })).aksesori;
    gambarAvatarOrtu();
  } catch (x) { alert(x.message); b.disabled = false; }
});

// ---------------- Keluarga (menu Setting) ----------------
// Kepala keluarga dan orang tua kedua punya hak yang sama atas anak-anak. Orang tua kedua bergabung
// dengan kode undangan (berlaku 24 jam, sekali pakai). Hanya kepala keluarga yang bisa mengeluarkannya.
let dataKeluarga = { anggota: [], undangan: null, sayaKepala: true };
const NAMA_PERAN = { ayah: "Ayah", ibu: "Ibu" };
function gambarKeluarga() {
  const k = dataKeluarga;
  const saya = k.anggota.find((a) => a.saya);
  const pasangan = saya?.peran === "ayah" ? "Ibu" : "Ayah";
  const baris = k.anggota.map((a) => `<li><span class="av-face kecil-ava">${avatarSvg(a.peran === "ibu" ? "manusia-ibu" : "manusia-ayah", WARNA_ORTU)}</span>
    <span class="tugas-judul"><b>${esc(a.name)}${a.saya ? " (Anda)" : ""}</b><span class="muted kecil">${NAMA_PERAN[a.peran] || a.peran} · ${esc(a.email)}</span></span>
    ${a.kepala ? '<span class="lencana">👑 Kepala keluarga</span>' : ""}
    ${k.sayaKepala && !a.kepala ? `<button class="ghost danger-text" data-keluarkan="${a.id}">Keluarkan</button>` : ""}</li>`).join("");
  const undang = k.anggota.length >= 2 ? ""
    : k.undangan
      ? `<p class="kode-box">Kode undangan untuk ${pasangan}: <strong>${esc(k.undangan.kode)}</strong> — berlaku sampai ${new Date(k.undangan.sampai).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}.
          ${pasangan} membuka halaman ini, memilih <b>Daftar</b>, memilih "${pasangan}", lalu memasukkan kode ini.</p>
        <div class="row"><button data-undang>Buat kode baru</button><button class="ghost" data-batal-undang>Batalkan kode</button></div>`
      : `<p class="muted">Ajak ${pasangan} bergabung supaya bisa mengurus anak-anak bersama: tugas, uang saku, chat, dan pengaturan.</p>
        <div><button class="primary" data-undang>➕ Undang ${pasangan}</button></div>`;
  $("keluarga-box").innerHTML = `<h2>👪 Keluarga</h2>
    <ul class="tugas-list">${baris}</ul>
    ${undang}
    <label class="peran-saya">Peran saya
      <select id="peran-saya">${Object.entries(NAMA_PERAN).map(([id, n]) => `<option value="${id}" ${saya?.peran === id ? "selected" : ""}>${n}</option>`).join("")}</select>
    </label>
    <p class="error" hidden></p>`;
  $("hapus-akun-teks").textContent = k.sayaKepala
    ? "Anda kepala keluarga: seluruh keluarga ikut terhapus, termasuk akun anak, laporan, riwayat permainan, dan akun pasangan Anda. Ini permanen dan tidak bisa dikembalikan."
    : "Hanya akun Anda yang terhapus. Anak-anak dan data keluarga tetap ada dan diurus kepala keluarga.";
  $("peran-saya").onchange = (e) => kirimKeluarga("PATCH", "keluarga/peran", { peran: e.target.value });
}
async function kirimKeluarga(metode, alamat, isi) {
  setErr($("keluarga-box"), "");
  try { dataKeluarga = await api(metode, alamat, isi); }
  catch (x) { gambarKeluarga(); return setErr($("keluarga-box"), x.message); }
  gambarKeluarga();
}
$("keluarga-box").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-undang")) return kirimKeluarga("POST", "keluarga/undang");
  if (b.hasAttribute("data-batal-undang")) return kirimKeluarga("DELETE", "keluarga/undang");
  if (b.dataset.keluarkan) {
    const nama = b.closest("li").querySelector("b").textContent;
    if (!confirm(`Keluarkan ${nama} dari keluarga? Akunnya tetap ada, tetapi tidak bisa lagi mengurus anak-anak.`)) return;
    return kirimKeluarga("POST", `keluarga/anggota/${b.dataset.keluarkan}/keluarkan`);
  }
});

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
  if (!masuk) { clearInterval(chatTimer); bersihkanSuara?.(); bersihkanSuara = null; return; }
  namaOrtu = me.ortu.name;
  dataOrtu = { ...me.ortu, aksesori: me.ortu.aksesori || [] };
  const [{ children }, social, tugas, belum, uang, hadiah, keluarga] = await Promise.all([api("GET", "laporan"), api("GET", "teman"), api("GET", "tugas"), api("GET", "chat/belum?sebagai=ortu"), api("GET", "keuangan"), api("GET", "hadiah"), api("GET", "keluarga")]);
  dataTugas = tugas.anak;
  kuotaBintangTugas = tugas.kuotaBintang;
  belumDibaca = belum.anak;
  dataUang = uang.anak;
  dataHadiah = hadiah;
  dataKeluarga = keluarga;
  gambarKeluarga();
  const byId = Object.fromEntries(social.children.map((s) => [s.childId, s]));
  $("kids").replaceChildren(...children.map((c) => {
    const el = renderKid(c, byId[c.id]);
    el.dataset.anak = c.id;
    return el;
  }));
  $("pilih-anak").replaceChildren(...children.map((c) => {
    const b = document.createElement("button");
    b.dataset.anak = c.id;
    b.dataset.nama = c.name;
    b.textContent = c.name;
    return b;
  }));
  dataHome = { children, byId };
  $("form-anak").querySelector("h2").textContent = children.length ? "Tambah akun anak" : "Mulai dengan menambah akun anak";
  terapkanHal();
}

load();

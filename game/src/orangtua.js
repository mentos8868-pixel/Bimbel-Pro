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

function renderKid(c, soc) {
  const el = $("tpl-anak").content.firstElementChild.cloneNode(true);
  const dot = el.querySelector(".dot");
  dot.classList.add("av-face");
  dot.innerHTML = avatarSvg(c.avatar, c.color);
  avatarPicker(el.querySelector(".av-edit-picker"), {
    value: c.avatar, accent: c.color,
    onPick: async (avatar) => {
      setErr(el, "");
      try {
        await api("PATCH", `anak/${c.id}`, { avatar });
        dot.innerHTML = avatarSvg(avatar, c.color);
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
  $("halo").textContent = `Halo, ${me.ortu.name}!`;
  const [{ children }, social] = await Promise.all([api("GET", "laporan"), api("GET", "teman")]);
  const byId = Object.fromEntries(social.children.map((s) => [s.childId, s]));
  $("kids").replaceChildren(...children.map((c) => renderKid(c, byId[c.id])));
  $("form-anak").querySelector("h2").textContent = children.length ? "Tambah akun anak" : "Mulai dengan menambah akun anak";
}

load();

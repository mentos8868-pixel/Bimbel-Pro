// Layar masuk: anak (kode masuk atau PIN di perangkat keluarga) atau orang tua. Tanpa akun tidak bisa masuk.
import { api } from "./api.js";
import { avatarPicker } from "./avatar-picker.js";
import { avatarSvg } from "./avatar-svg.js";
import { DEFAULT_ORTU_AVATAR } from "../../shared/avatars.js";

const $ = (id) => document.getElementById(id);
const box = () => $("login");

function show(step) {
  box().querySelectorAll("[data-step]").forEach((el) => (el.hidden = el.dataset.step !== step));
  box().querySelectorAll(".error").forEach((e) => (e.hidden = true));
  const first = box().querySelector(`[data-step="${step}"] input`);
  if (first) setTimeout(() => first.focus(), 50);
}

function err(step, text) {
  const e = box().querySelector(`[data-step="${step}"] .error`);
  e.textContent = text;
  e.hidden = !text;
}

function busy(el, on) {
  el.querySelectorAll("button").forEach((b) => (b.disabled = on));
}

const childProfile = (c) => ({ role: "anak", name: c.name, jenjang: c.jenjang, gameJenjang: c.jenjang, color: c.color, avatar: c.avatar, chat: c.chat });

// Memanggil onStart(profile, playingAs) saat pemain siap masuk arena.
export function setupLogin(onStart) {
  let me = null;
  let pinChild = null;
  let ortuLevel = "SD";
  // Avatar anak hanya dipilih orang tua (dashboard); di sini anak hanya melihatnya.
  // Avatar orang tua disimpan langsung saat dipilih (sebagai=ortu).
  const save = (body) => api("POST", "avatar", body).catch(() => {});
  const ortuPicker = avatarPicker($("ortu-avatar"), {
    value: DEFAULT_ORTU_AVATAR, accent: "#5b6b7c",
    onPick: (avatar) => { if (me?.ortu) { me.ortu.avatar = avatar; save({ avatar, sebagai: "ortu" }); } },
  });

  const go = (step) => show(step);
  const refresh = async () => {
    show("muat");
    try {
      me = await api("GET", "saya");
    } catch {
      me = { ortu: null, anak: null, children: [], offline: true };
    }
    if (me.anak) {
      $("siap-judul").textContent = `Halo, ${me.anak.name}!`;
      const sisa = me.anak.limitMin ? Math.max(0, me.anak.limitMin - me.anak.usedMin) : null;
      $("siap-avatar").innerHTML = avatarSvg(me.anak.avatar, me.anak.color);
      $("siap-info").textContent = `${me.anak.jenjang}` + (sisa !== null ? ` · sisa waktu bermain hari ini ${sisa} menit` : "");
      return go("siap");
    }
    if (me.ortu) {
      ortuPicker.set(me.ortu.avatar || DEFAULT_ORTU_AVATAR);
      return renderFamily();
    }
    go("pilih");
  };

  function renderFamily() {
    $("keluarga-judul").textContent = `Keluarga ${me.ortu.name}: siapa yang main?`;
    const list = $("anak-list");
    list.replaceChildren(...me.children.map((c) => {
      const b = document.createElement("button");
      b.className = "kid";
      const dot = document.createElement("span");
      dot.className = "dot av-face";
      dot.innerHTML = avatarSvg(c.avatar, c.color);
      const n = document.createElement("strong");
      n.textContent = c.name;
      const s = document.createElement("small");
      s.textContent = c.jenjang;
      b.append(dot, n, s);
      b.onclick = () => {
        pinChild = c;
        $("pin-judul").textContent = `PIN ${c.name}`;
        $("pin-input").value = "";
        go("pin");
      };
      return b;
    }));
    $("anak-kosong").hidden = me.children.length > 0;
    go("keluarga");
  }

  // Navigasi tombol
  box().addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.level) {
      ortuLevel = b.dataset.level;
      $("ortu-level").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      return;
    }
    const act = b.dataset.act;
    if (act === "keluar") {
      await api("POST", "keluar").catch(() => {});
      return refresh();
    }
    if (act === "ganti") {
      await api("POST", "anak/keluar").catch(() => {});
      return refresh();
    }
    if (act === "main-anak") {
      const sec = b.closest("[data-step]");
      busy(sec, true);
      try {
        await api("GET", "tiket?sebagai=anak"); // memastikan waktu bermain masih ada
        box().hidden = true;
        onStart(childProfile(me.anak), "anak");
      } catch (x) {
        err("siap", x.message);
      } finally { busy(sec, false); }
      return;
    }
    if (act === "main-ortu") {
      box().hidden = true;
      onStart({ role: "ortu", name: me.ortu.name, jenjang: "Orang tua", gameJenjang: ortuLevel, color: "#5b6b7c", avatar: ortuPicker.get() }, "ortu");
    }
  });

  // Kode masuk
  $("kode-input").addEventListener("input", () => err("kode", ""));
  $("form-kode").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("kode-input").value.trim();
    if (code.length !== 6) return err("kode", "Kode masuk terdiri dari 6 huruf/angka.");
    busy(e.target, true);
    try {
      await api("POST", "kode", { code });
      await refresh();
    } catch (x) {
      err("kode", x.message);
    } finally { busy(e.target, false); }
  });

  // PIN di perangkat keluarga
  $("pin-input").addEventListener("input", () => err("pin", ""));
  $("form-pin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = $("pin-input").value.trim();
    if (!/^\d{4}$/.test(pin)) return err("pin", "PIN terdiri dari 4 angka.");
    busy(e.target, true);
    try {
      await api("POST", `anak/${pinChild.id}/masuk`, { pin });
      await refresh();
    } catch (x) {
      err("pin", x.message);
      $("pin-input").value = "";
    } finally { busy(e.target, false); }
  });

  refresh();
}

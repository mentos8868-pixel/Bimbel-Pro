// Layar masuk: anak (kode masuk atau PIN di perangkat keluarga) atau orang tua. Tanpa akun tidak bisa masuk.
import { api } from "./api.js";
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

const childProfile = (c) => ({ role: "anak", childId: c.id, name: c.name, jenjang: c.jenjang, gameJenjang: c.jenjang, negara: c.negara, kelas: c.kelas, kurikulum: c.kurikulum, color: c.color, avatar: c.avatar, aksesori: c.aksesori, aura: c.aura, chat: c.chat });

// Memanggil onStart(profile, playingAs) saat pemain siap masuk arena.
export function setupLogin(onStart) {
  let me = null;
  let pinChild = null;
  // Avatar tidak dipilih di sini lagi: layar masuk menampilkan avatar yang dipilih di dashboard
  // (menu Avatar orang tua / anak), lengkap dengan aksesori. Gantinya lewat tautan ke dashboard.
  const WARNA_ORTU = "#5b6b7c";

  // Orang tua tidak memilih SD/SMP/SMA: tingkat soal mengikuti anak termuda di keluarga (SD bila belum ada anak).
  const jenjangOrtu = () => {
    const anak = [...(me?.children || [])].sort((a, b) => (a.kelas || 99) - (b.kelas || 99))[0];
    return anak?.jenjang || "SD";
  };

  const go = (step) => show(step);
  const refresh = async () => {
    show("muat");
    try {
      me = await api("GET", "saya");
    } catch {
      me = { ortu: null, anak: null, children: [], offline: true };
    }
    if (me.anak) {
      // Anak selalu mulai dari dashboard anak. Tombol "Masuk arena" di sana membuka /?arena=1.
      const keArena = new URLSearchParams(location.search).has("arena");
      if (!keArena) { location.replace("/anak.html"); return; }
      history.replaceState(null, "", location.pathname);
      $("siap-judul").textContent = `Halo, ${me.anak.name}!`;
      const sisa = me.anak.limitMin ? Math.max(0, me.anak.limitMin - me.anak.usedMin) : null;
      $("siap-avatar").innerHTML = avatarSvg(me.anak.avatar, me.anak.color, { aksesori: me.anak.aksesori, aura: me.anak.aura });
      $("siap-info").textContent = `${me.anak.jenjang}` + (sisa !== null ? ` · sisa waktu bermain hari ini ${sisa} menit` : "");
      // Langsung masuk arena. Bila gagal (mis. waktu bermain habis), tampilkan layar siap beserta pesannya.
      try {
        await api("GET", "tiket?sebagai=anak");
        box().hidden = true;
        onStart(childProfile(me.anak), "anak");
      } catch (x) {
        go("siap");
        err("siap", x.message);
      }
      return;
    }
    if (me.ortu) {
      $("ortu-avatar").innerHTML = avatarSvg(me.ortu.avatar || DEFAULT_ORTU_AVATAR, WARNA_ORTU, { aksesori: me.ortu.aksesori || [] });
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
      dot.innerHTML = avatarSvg(c.avatar, c.color, { aksesori: c.aksesori, aura: c.aura });
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
      onStart({ role: "ortu", name: me.ortu.name, jenjang: "Orang tua", gameJenjang: jenjangOrtu(), color: WARNA_ORTU, avatar: me.ortu.avatar || DEFAULT_ORTU_AVATAR, aksesori: (me.ortu.aksesori || []).join(",") }, "ortu");
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

  // Kode undangan keluarga (orang tua kedua): diperiksa dulu, lalu diantar ke formulir daftar
  // di dashboard orang tua dengan kode dan peran yang masih kosong sudah terisi.
  const NAMA_PERAN = { ayah: "Ayah", ibu: "Ibu" };
  const inputUndangan = $("undangan-input");
  let versiUndangan = 0;
  inputUndangan.addEventListener("input", () => {
    versiUndangan++;
    err("undangan", "");
    $("undangan-info").hidden = true;
    $("undangan-lanjut").hidden = true;
    $("undangan-cek").hidden = false;
  });
  $("form-undangan").addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("undangan-cek").disabled) return;
    const kode = inputUndangan.value.trim().toUpperCase();
    if (kode.length !== 6) return err("undangan", "Kode undangan terdiri dari 6 huruf/angka.");
    const versi = versiUndangan;
    busy(e.target, true);
    try {
      const u = await api("GET", `undangan?kode=${encodeURIComponent(kode)}`);
      if (versi !== versiUndangan) return;
      $("undangan-info").textContent = `Kode benar. Anda akan bergabung ke keluarga ${u.namaKepala} sebagai ${NAMA_PERAN[u.peran] || "orang tua"}.`;
      $("undangan-info").hidden = false;
      $("undangan-lanjut").href = `/orangtua.html#daftar=${encodeURIComponent(u.kode)}&peran=${u.peran || ""}`;
      $("undangan-lanjut").hidden = false;
      $("undangan-cek").hidden = true;
    } catch (x) {
      if (versi === versiUndangan) err("undangan", x.message);
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

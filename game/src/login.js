// Layar masuk anak dan orang tua. Anak memakai kata sandi.
import { api } from "./api.js";
import { avatarSvg } from "./avatar-svg.js";
import { DEFAULT_ORTU_AVATAR } from "../../shared/avatars.js";
import { TEMPAT_KERJA } from "../../shared/tempat-kerja.js";

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
  // Avatar tidak dipilih di sini lagi: layar masuk menampilkan avatar yang dipilih di dashboard
  // (menu Avatar orang tua / anak), lengkap dengan aksesori. Gantinya lewat tautan ke dashboard.
  const WARNA_ORTU = "#5b6b7c";

  // Orang tua tidak memilih SD/SMP/SMA: tingkat soal mengikuti anak termuda di keluarga (SD bila belum ada anak).
  const jenjangOrtu = () => {
    const anak = [...(me?.children || [])].sort((a, b) => (a.kelas || 99) - (b.kelas || 99))[0];
    return anak?.jenjang || "SD";
  };

  const go = (step) => show(step);
  let timerKerja = 0;
  const masukArenaOrtu = () => {
    if (box().hidden) return;
    clearInterval(timerKerja);
    box().hidden = true;
    onStart({ role: "ortu", name: me.ortu.name, negara: me.ortu.negara || "", jenjang: "Orang tua", gameJenjang: jenjangOrtu(), color: WARNA_ORTU, avatar: me.ortu.avatar || DEFAULT_ORTU_AVATAR, aksesori: (me.ortu.aksesori || []).join(",") }, "ortu");
  };
  const tampilBekerja = (statusAwal) => {
    clearInterval(timerKerja);
    let status = statusAwal;
    let memuat = false;
    let cekLagi = 0;
    const detak = () => {
      const sekarang = Date.now();
      const detik = Math.max(0, Math.ceil((status.berikutAt - sekarang) / 1000));
      const waktu = [Math.floor(detik / 3600), Math.floor(detik / 60) % 60, detik % 60].map((n) => String(n).padStart(2, "0")).join(":");
      $("bekerja-sisa").textContent = `Jam penuh berikutnya · ${waktu}`;
      const tempat = TEMPAT_KERJA[status.pekerjaan]?.nama || "tempat kerja";
      $("bekerja-info").textContent = `${tempat} · ${status.hariIni + status.tertundaHariIni}/${status.batasHarian} bintang kerja hari ini (${status.tertundaHariIni} belum cair).`;
      if (memuat || sekarang < cekLagi) return;
      cekLagi = sekarang + 5000;
      memuat = true;
      api("GET", "kantor").then((terbaru) => {
        if (terbaru.mulaiAt == null) masukArenaOrtu();
        else status = terbaru;
      }).catch(() => {}).finally(() => { memuat = false; });
    };
    go("bekerja");
    detak();
    timerKerja = setInterval(detak, 1000);
  };
  const mainOrtu = async () => {
    const kerja = await api("GET", "kantor").catch(() => null);
    if (kerja?.mulaiAt != null) return tampilBekerja(kerja);
    masukArenaOrtu();
  };
  const refresh = async () => {
    show("muat");
    try {
      me = await api("GET", "saya");
    } catch {
      me = { ortu: null, anak: null, children: [], offline: true };
    }
    const arena = new URLSearchParams(location.search);
    if (arena.get("arena") === "ortu") {
      if (!me.ortu) {
        if (me.offline) { go("pilih"); return; }
        location.replace("/orangtua.html");
        return;
      }
      mainOrtu();
      return;
    }
    if (me.anak) {
      // Anak selalu mulai dari dashboard anak. Tombol "Masuk arena" di sana membuka /?arena=1.
      const keArena = arena.has("arena");
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
      b.onclick = () => { location.href = "/orangtua.html?login"; };
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
    if (act === "lihat-kelas") {
      box().hidden = true;
      onStart({ name: "Pengunjung", avatar: DEFAULT_ORTU_AVATAR, color: "#5b6b7c", role: "ortu" }, null);
      return;
    }
    if (act === "keluar") {
      await api("POST", "keluar").catch(() => { });
      return refresh();
    }
    if (act === "ganti") {
      await api("POST", "anak/keluar").catch(() => { });
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
    if (act === "main-ortu") mainOrtu();
    if (act === "stop-kerja" && !b.disabled) {
      b.disabled = true;
      try {
        const hasil = await api("POST", "kantor/stop");
        if (hasil.mulaiAt == null) masukArenaOrtu();
      } catch (e) {
        err("bekerja", e.message);
      } finally {
        b.disabled = false;
      }
    }
  });



  refresh();
}

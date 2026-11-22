// Chat keluarga di dalam arena: percakapan Family (seluruh keluarga) dan chat pribadi orang tua ↔ anak,
// sama dengan menu Chat di dashboard (API /api/chat/keluarga), jadi pesannya tersimpan dan terlihat di kedua tempat.
// Anak: Family + orang tuanya. Orang tua: Family + tiap anaknya.
import { api } from "./api.js";
import { gelembungChat } from "./chat-tampilan.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const jam = (at) => new Date(at).toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit" });

export async function pasangChatKeluarga(sebagai) {
  const btn = $("btn-keluarga"), panel = $("keluarga-panel"), badge = $("keluarga-badge");
  const log = $("keluarga-log"), form = $("keluarga-form"), input = $("keluarga-input"), galat = $("keluarga-error");
  if (!btn || (sebagai !== "anak" && sebagai !== "ortu")) return;

  // Daftar percakapan: "family" atau id ruang pribadi ("ortu" untuk anak, id anak untuk orang tua).
  let kontak = [{ id: "family", label: "Family" }];
  let ruang = "family";
  let belum = {};
  let saya = null;   // id orang tua yang sedang masuk (pesan orang tua lain tampil di kiri)
  try {
    if (sebagai === "anak") {
      const b = await api("GET", "chat/belum?sebagai=anak");
      kontak.push({ id: "ortu", label: b.namaChat || b.namaOrtu || "Orang tua" });
    } else {
      const me = await api("GET", "saya");
      saya = me.ortu?.id ?? null;
      for (const c of me.children || []) kontak.push({ id: String(c.id), label: c.name });
    }
  } catch { return; }   // tidak masuk sebagai keluarga: tombol tetap tersembunyi
  btn.hidden = false;

  const query = () => {
    const q = new URLSearchParams({ sebagai });
    if (ruang === "family") q.set("grup", "1");
    else if (sebagai === "ortu") q.set("anak", ruang);
    return q.toString();
  };
  const tampilGalat = (t) => { galat.textContent = t || ""; galat.hidden = !t; };

  // Tanda belum dibaca, di tombol arena dan di tiap tab.
  async function segarkanTanda() {
    try {
      const b = await api("GET", `chat/belum?sebagai=${sebagai}`);
      belum = { family: b.family || 0 };
      if (sebagai === "anak") belum.ortu = b.n || 0;
      else for (const [id, n] of Object.entries(b.anak || {})) belum[id] = n;
    } catch { return; }
    const total = Object.entries(belum).filter(([id]) => panel.hidden || id !== ruang).reduce((s, [, n]) => s + n, 0);
    badge.textContent = total;
    badge.hidden = !total;
    gambarTab();
  }

  function gambarTab() {
    $("keluarga-tab").innerHTML = kontak.map((k) => {
      const n = k.id === ruang && !panel.hidden ? 0 : belum[k.id] || 0;
      return `<button type="button" data-ruang="${esc(k.id)}" aria-pressed="${k.id === ruang}" class="${k.id === ruang ? "on" : ""}">${esc(k.label)}${n ? ` <span class="badge">${n}</span>` : ""}</button>`;
    }).join("");
  }

  async function muat(kebawah = false) {
    if (panel.hidden) return;
    try {
      const q = query();
      const { pesan } = await api("GET", `chat/keluarga?${q}`);
      const bawah = kebawah || log.scrollTop + log.clientHeight >= log.scrollHeight - 20;
      log.innerHTML = pesan.length
        ? pesan.map((p) => gelembungChat(p, sebagai, q, jam, { saya })).join("")
        : `<p class="muted small">Belum ada pesan. Kirim salam!</p>`;
      if (bawah) log.scrollTop = log.scrollHeight;
      belum[ruang] = 0;
      gambarTab();
    } catch (x) { tampilGalat(x.message); }
  }

  let timer = 0;
  const buka = () => {
    // Panel chat arena dan Teman ada di tempat yang sama: tutup supaya tidak bertumpuk.
    for (const id of ["chat-panel", "teman-panel"]) if ($(id)) $(id).hidden = true;
    panel.hidden = false;
    tampilGalat("");
    gambarTab();
    muat(true);
    clearInterval(timer);
    timer = setInterval(() => { muat(); segarkanTanda(); }, 5000);
    segarkanTanda();
  };
  const tutup = () => { panel.hidden = true; clearInterval(timer); segarkanTanda(); };
  btn.onclick = () => (panel.hidden ? buka() : tutup());
  panel.querySelector("[data-close]").onclick = tutup;

  $("keluarga-tab").onclick = (e) => {
    const b = e.target.closest("[data-ruang]");
    if (!b || b.dataset.ruang === ruang) return;
    ruang = b.dataset.ruang;
    log.innerHTML = `<p class="muted small">Memuat…</p>`;
    tampilGalat("");
    gambarTab();
    muat(true);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const isi = input.value.trim();
    if (!isi) return;
    tampilGalat("");
    const kirim = form.querySelector("button");
    kirim.disabled = true;
    try {
      const body = { sebagai, isi };
      if (ruang === "family") body.grup = true;
      else if (sebagai === "ortu") body.anak = ruang;
      await api("POST", "chat/keluarga", body);
      input.value = "";
      await muat(true);
    } catch (x) { tampilGalat(x.message); } finally { kirim.disabled = false; input.focus(); }
  };

  segarkanTanda();
  setInterval(() => { if (panel.hidden) segarkanTanda(); }, 20000);
}

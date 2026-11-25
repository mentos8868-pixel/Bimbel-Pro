// Panel Toko Aksesori di kios alun-alun. Anak menukar bintang (dari Ruang Pintar) dengan aksesori avatar.
// Saldo, kepemilikan, dan harga diperiksa server (server/toko.js); panel ini hanya menampilkan.
import { api } from "./api.js";
import { avatarSvg } from "./avatar-svg.js";
import { SLOT } from "../../shared/aksesori.js";
import { parseAvatar } from "../../shared/avatars.js";
import { katalogAvatar } from "./katalog-avatar.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const svgSrc = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export class TokoUI {
  // onClose(): panel ditutup. onBerubah(keadaan): aksesori yang dipakai berubah (avatar arena perlu dibuat ulang).
  constructor({ onClose, onBerubah }) {
    this.onClose = onClose;
    this.onBerubah = onBerubah;
    this.k = null;        // keadaan dari server: { bintang, punya, pakai, items, aura, ... }
    this.yakin = null;    // id aksesori yang menunggu klik kedua "Yakin beli?"
    $("toko-tutup").onclick = () => this.close();
    $("toko-panel").addEventListener("click", (e) => { if (e.target.id === "toko-panel") this.close(); });
    $("toko-isi").addEventListener("click", (e) => this.klik(e));
  }

  async open(profile, sebagai) {
    this.sebagai = sebagai;
    this.alamat = sebagai === "ortu" ? "toko-ortu" : "toko";
    this.profile = profile;
    this.yakin = null;
    this.err("");
    $("toko-panel").hidden = false;
    $("toko-isi").innerHTML = '<p class="muted">Memuat toko…</p>';
    try {
      this.k = await api("GET", this.alamat);
      this.render();
    } catch (x) {
      $("toko-isi").innerHTML = "";
      this.err(x.message);
    }
  }

  close() {
    $("toko-panel").hidden = true;
    this.onClose();
  }

  err(t) {
    $("toko-error").textContent = t;
    $("toko-error").hidden = !t;
  }

  gambar(coba) {
    const p = this.profile, k = this.k;
    return svgSrc(avatarSvg(k.avatar, p.color, { aksesori: coba ? [...k.pakai, coba] : k.pakai, aura: k.aura || p.aura || "" }));
  }

  render() {
    const k = this.k;
    $("toko-saldo").textContent = `★ ${k.bintang} bintang`;
    $("toko-preview").src = this.gambar();
    const kartu = (a) => {
      const punya = k.punya.includes(a.id), pakai = k.pakai.includes(a.id), cukup = k.bintang >= a.harga;
      const tombol = punya
        ? `<button data-pakai="${a.id}" data-on="${pakai ? 0 : 1}" class="${pakai ? "ghost" : "primary"}">${pakai ? "Lepas" : "Pakai"}</button>`
        : this.yakin === a.id
          ? `<button data-beli="${a.id}" class="yakin">Yakin? ★ ${a.harga}</button>`
          : `<button data-beli="${a.id}" ${cukup ? "" : "disabled"}>${cukup ? "Beli" : "Bintang kurang"}</button>`;
      return `<div class="toko-item ${pakai ? "pakai" : ""}"><img src="${this.gambar(a.id)}" alt="" />
        <b>${esc(a.name)}</b><span class="harga">${punya ? (pakai ? "Sedang dipakai" : "Sudah dimiliki") : `★ ${a.harga}`}</span>${tombol}</div>`;
    };
    const isi = $("toko-isi");
    const daftar = this.sebagai === "ortu" ? k.katalog
      : k.katalog.map((a) => ({ ...a, nama: parseAvatar(a.id).family.name }));
    const katalog = katalogAvatar(k, this.profile.color, this.yakin, isi.querySelector("[data-katalog-avatar]")?.open ?? true, daftar);
    isi.innerHTML = katalog + SLOT.map((s) => {
      const items = k.items.filter((a) => a.slot === s.id);
      return items.length ? `<h3 class="toko-slot">${s.name}</h3><div class="toko-grid">${items.map(kartu).join("")}</div>` : "";
    }).join("");
  }

  async klik(e) {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    this.err("");
    try {
      if (b.dataset.beliAvatar) {
        const id = b.dataset.beliAvatar;
        if (this.yakin !== id) { this.yakin = id; this.render(); return; }
        this.yakin = null;
        b.disabled = true;
        const harga = this.k.katalog.find((item) => item.id === id).harga;
        this.k = { ...this.k, ...(await api("POST", this.alamat + "/beli-avatar", { id, harga })) };
        this.onBerubah(this.k);
      } else if (b.dataset.pakaiAvatar) {
        b.disabled = true;
        const { avatar } = await api("POST", "avatar", { avatar: b.dataset.pakaiAvatar, sebagai: this.sebagai });
        this.k.avatar = avatar;
        this.onBerubah(this.k);
      } else if (b.dataset.beli) {
        const id = b.dataset.beli;
        // Klik pertama minta konfirmasi di tombol itu sendiri (tanpa dialog browser yang bisa diblokir).
        if (this.yakin !== id) { this.yakin = id; this.render(); return; }
        this.yakin = null;
        b.disabled = true;
        const harga = this.k.items.find((item) => item.id === id).harga;
        this.k = { ...this.k, ...(await api("POST", this.alamat + "/beli", { id, harga })) };
        this.k = { ...this.k, ...(await api("POST", this.alamat + "/pakai", { id, pakai: true })) };
        this.onBerubah(this.k);
      } else if (b.dataset.pakai) {
        b.disabled = true;
        this.k = { ...this.k, ...(await api("POST", this.alamat + "/pakai", { id: b.dataset.pakai, pakai: b.dataset.on === "1" })) };
        this.onBerubah(this.k);
      }
    } catch (x) {
      this.err(x.message);
      if (x.status === 409 || b.dataset.beli || b.dataset.beliAvatar) {
        try { this.k = await api("GET", this.alamat); } catch { /* tampilkan pesan gagal beli */ }
      }
    }
    this.render();
  }
}

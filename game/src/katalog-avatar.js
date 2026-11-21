import { KATALOG_AVATAR } from "../../shared/avatars.js";
import { avatarSvg } from "./avatar-svg.js";

// daftar: katalog yang ditampilkan (bawaan semua; orang tua hanya karakter sesuai perannya).
export function katalogAvatar(toko, warna, konfirmasi, terbuka, daftar = KATALOG_AVATAR) {
  const kartu = daftar.map(({ id, nama, harga }) => {
    const dipakai = toko.avatar === id;
    const dimiliki = toko.avatarPunya.includes(id);
    const tombol = dimiliki
      ? `<button data-pakai-avatar="${id}" ${dipakai ? "disabled" : ""}>${dipakai ? "Dipakai" : "Pakai"}</button>`
      : `<button data-beli-avatar="${id}" ${toko.bintang < harga ? "disabled" : ""}>${konfirmasi === id ? "Beli dan pakai?" : toko.bintang < harga ? "Bintang kurang" : "Beli"}</button>`;
    return `<div class="toko-item ${dipakai ? "pakai" : ""}">
      <span class="av-face">${avatarSvg(id, warna)}</span><b>${nama}</b>
      <span class="muted">${dimiliki ? "Dimiliki" : `★ ${harga}`}</span>${tombol}
    </div>`;
  }).join("");
  return `<details data-katalog-avatar ${terbuka ? "open" : ""}><summary>Belanja avatar · 10 bintang per avatar</summary><div class="toko-grid">${kartu}</div></details>`;
}

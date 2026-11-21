import { tombolSuara, panelSuara, pemutarSuara } from "./chat-suara.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
}[c]));

export function kotakPesanChat(nama) {
  const label = esc(nama);
  return `<div class="gelembung" id="gelembung" role="region" aria-label="Pesan dengan ${label}" tabindex="0"><p class="muted">Memuat…</p></div>
    <form id="form-chat" class="chat-form">${tombolSuara}<textarea name="isi" rows="1" maxlength="300" aria-label="Pesan untuk ${label}" placeholder="Tulis pesan…"></textarea><button class="primary" type="submit">Kirim</button></form>
    ${panelSuara}`;
}

// opsi.saya = id orang tua yang sedang membuka (keluarga bisa punya Ayah dan Ibu): pesan orang tua lain
// tampil di sisi kiri beserta namanya. Anak melihat nama orang tua pengirim di atas pesannya.
export function gelembungChat(pesan, sebagai, query, formatWaktu, opsi = {}) {
  const pesanOrtuLain = sebagai === "ortu" && pesan.dari === "ortu" && opsi.saya != null && pesan.ortuId != null && pesan.ortuId !== opsi.saya;
  const milikSaya = pesan.dari === sebagai && !pesanOrtuLain;
  const nama = !milikSaya && pesan.dari === "ortu" && pesan.nama ? `<span class="muted kecil gel-nama">${esc(pesan.nama)}</span>` : "";
  const isi = pesan.suara ? pemutarSuara(pesan, query) : esc(pesan.isi).replace(/\n/g, "<br>");
  return `<div class="gel ${milikSaya ? "saya" : "dia"}">${nama}<div>${isi}</div><span class="muted kecil">${formatWaktu(pesan.at)}${milikSaya && pesan.dibaca ? " · dibaca" : ""}</span></div>`;
}

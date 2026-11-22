// Ruang tunggu meja game online (Scramble, Kartu Kilat): daftar pemain dengan status Siap,
// teks petunjuk, dan tombol Siap / Batal siap. Permainan dimulai server saat minimal 2 pemain dan semuanya Siap.
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// v.players: [{ id, name, siap }]; info: teks tambahan (mis. bahasa atau jenis kartu dan kode meja privat).
export function gambarRuangTunggu({ v, myId, online, info, teksEl, daftarEl, tombolEl, maks }) {
  const n = v.players.length, nSiap = v.players.filter((p) => p.siap).length;
  const saya = v.players.find((p) => p.id === myId);
  teksEl.textContent = info + (n < 2
    ? "Menunggu pemain lain duduk di meja…"
    : nSiap === n ? "Semua siap. Mulai!" : `Tekan Siap. Permainan mulai saat semua pemain siap (${nSiap}/${n} siap).`);
  const baris = v.players.map((p) => `<li class="${p.siap ? "siap" : ""}"><span>${esc(p.name)}${p.id === myId ? ' <span class="muted">(kamu)</span>' : ""}</span><b>${p.siap ? "✅ Siap" : "⏳ Belum siap"}</b></li>`);
  if (n < maks) baris.push(`<li class="kosong"><span>Kursi kosong (${n}/${maks} pemain)</span></li>`);
  daftarEl.innerHTML = baris.join("");
  daftarEl.hidden = !online;
  tombolEl.hidden = !online;
  tombolEl.textContent = saya?.siap ? "Batal siap" : "✅ Siap";
  tombolEl.classList.toggle("primary", !saya?.siap);
}

// Kirim Siap atau Batal siap untuk pemain ini.
export function kirimSiap(room, v, myId) {
  const saya = v?.players.find((p) => p.id === myId);
  room?.send("siap", !saya?.siap);
}

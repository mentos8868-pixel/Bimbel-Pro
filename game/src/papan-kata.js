import { kamusKata, pemeriksaKata, muatKamusBesar } from "../../shared/kamus-kata.js";

const UKURAN = 11;
const TENGAH = 60;
const ARAH = [1, UKURAN];
const nilai = (huruf) => "AEIOUNRST".includes(huruf) ? 1 : 2;
const bonus = (i) => [24, 30, 90, 96].includes(i) ? 2 : 1;
const acak = (huruf) => {
  for (let i = huruf.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [huruf[i], huruf[j]] = [huruf[j], huruf[i]];
  }
  return huruf;
};
const lanjut = (i, arah) => i + arah < UKURAN ** 2 && (arah !== 1 || i % UKURAN < UKURAN - 1);
const mundur = (i, arah) => i >= arah && (arah !== 1 || i % UKURAN > 0);

export function nilaiLangkah(papan, pasang, kamus) {
  const posisi = [...pasang.keys()].sort((a, b) => a - b);
  const gagal = (pesan) => ({ pesan });
  if (!posisi.length) return gagal("Pasang huruf dari rak dahulu.");
  const awal = posisi[0], akhir = posisi.at(-1);
  const arah = posisi.length === 1 || Math.floor(awal / UKURAN) === Math.floor(akhir / UKURAN) ? 1 : UKURAN;
  if (arah === UKURAN && posisi.some((i) => i % UKURAN !== awal % UKURAN)) return gagal("Huruf baru harus sebidang dalam satu baris atau kolom.");
  const ambil = (i) => pasang.get(i) || papan[i];
  for (let i = awal; i <= akhir; i += arah) if (!ambil(i)) return gagal("Isi celah antarkeping.");
  const pertama = !papan.some(Boolean);
  if (pertama && !pasang.has(TENGAH)) return gagal("Kata pertama harus melewati petak tengah.");
  const kata = new Map();
  let terhubung = pertama;
  for (const i of posisi) {
    for (const langkah of ARAH) {
      let mulai = i;
      while (mundur(mulai, langkah) && ambil(mulai - langkah)) mulai -= langkah;
      const petak = [mulai];
      while (lanjut(petak.at(-1), langkah) && ambil(petak.at(-1) + langkah)) petak.push(petak.at(-1) + langkah);
      if (petak.length < 2) continue;
      if (petak.some((p) => papan[p])) terhubung = true;
      kata.set(`${mulai}:${langkah}`, petak);
    }
  }
  if (!terhubung) return gagal("Sambungkan kata dengan huruf yang sudah ada.");
  if (!kata.size) return gagal("Bentuk kata dengan minimal dua huruf.");
  let poin = 0;
  for (const petak of kata.values()) {
    const teks = petak.map(ambil).join("");
    if (!kamus.has(teks)) return gagal(`Kata ${teks} belum ada di daftar kata permainan.`);
    for (const i of petak) poin += nilai(ambil(i)) * (pasang.has(i) ? bonus(i) : 1);
  }
  return { poin };
}

function cariLangkah(papan, kamus, untukBot = false) {
  const kosong = !papan.some(Boolean);
  let terbaik;
  // Bot mencoba kata dalam urutan acak supaya langkahnya tidak selalu sama.
  for (const kata of untukBot ? acak([...kamus]) : kamus) {
    for (let mulai = 0; mulai < papan.length; mulai++) {
      for (const arah of ARAH) {
        const akhir = mulai + (kata.length - 1) * arah;
        if (akhir >= papan.length || (arah === 1 && Math.floor(mulai / UKURAN) !== Math.floor(akhir / UKURAN))) continue;
        if (kosong && !Array.from(kata, (_, i) => mulai + i * arah).includes(TENGAH)) continue;
        const pasang = new Map();
        let cocok = true;
        for (let i = 0; i < kata.length; i++) {
          const p = mulai + i * arah;
          if (!papan[p]) pasang.set(p, kata[i]);
          else if (papan[p] !== kata[i]) { cocok = false; break; }
        }
        if (!cocok || !pasang.size || pasang.size > 7) continue;
        const { poin } = nilaiLangkah(papan, pasang, kamus);
        if (poin && untukBot) return { pasang, poin };
        if (poin && (!terbaik || terbaik.poin < poin)) terbaik = { pasang, poin };
      }
    }
  }
  return terbaik;
}

export function pasangPapanKata(panel, tutup, lapor) {
  const papanEl = panel.querySelector("[data-papan]");
  const rakEl = panel.querySelector("[data-rak]");
  const pesan = panel.querySelector("[data-pesan]");
  const skor = panel.querySelector("[data-skor]");
  const main = panel.querySelector("[data-main]");
  let langkahBotTerakhir = new Set();
  let papan, kamus, kamusPemain, rak, draft, pilih, skorSaya, skorBot, giliran, selesai, bahasaAktif, profil;

  function rakBaru() {
    const calon = cariLangkah(papan, kamus);
    const huruf = calon ? [...calon.pasang.values()] : [];
    const kumpulan = [...kamus].join("");
    while (huruf.length < 7) huruf.push(kumpulan[Math.floor(Math.random() * kumpulan.length)]);
    return acak(huruf);
  }

  function gambar() {
    skor.textContent = `Kamu ${skorSaya} · Bot ${skorBot} · Giliran ${Math.min(giliran, 6)}/6`;
    for (const [i, tombol] of [...papanEl.children].entries()) {
      const huruf = papan[i] || rak[draft.get(i)];
      // Keping: huruf besar + nilai kecil di pojok. Petak kosong: tanda bonus/tengah.
      if (huruf) tombol.innerHTML = `<span class="huruf">${huruf}</span><span class="nilai">${nilai(huruf)}</span>`;
      else tombol.textContent = i === TENGAH ? "★" : bonus(i) === 2 ? "2×" : "";
      tombol.dataset.isi = papan[i] ? "tetap" : huruf ? "baru" : "kosong";
      tombol.toggleAttribute("data-bot", langkahBotTerakhir.has(i));
      tombol.disabled = selesai || !!papan[i];
      tombol.setAttribute("aria-label", `Baris ${Math.floor(i / UKURAN) + 1}, kolom ${i % UKURAN + 1}${huruf ? `, ${huruf}` : ""}`);
    }
    const terpakai = new Set(draft.values());
    rakEl.replaceChildren(...rak.map((huruf, i) => {
      const b = document.createElement("button");
      b.className = "keping";
      b.innerHTML = `<span class="huruf">${huruf}</span><span class="nilai">${nilai(huruf)}</span>`;
      b.setAttribute("aria-label", `Huruf ${huruf}, nilai ${nilai(huruf)}`);
      b.dataset.keping = i;
      b.disabled = selesai || terpakai.has(i);
      b.setAttribute("aria-pressed", String(pilih === i));
      return b;
    }));
    for (const b of panel.querySelectorAll("[data-perlu-giliran]")) b.disabled = selesai;
  }

  function lanjutGiliran(teks) {
    const langkahBot = cariLangkah(papan, kamus, true);
    langkahBotTerakhir = new Set();
    if (langkahBot) {
      for (const [i, huruf] of langkahBot.pasang) papan[i] = huruf;
      langkahBotTerakhir = new Set(langkahBot.pasang.keys());   // disorot sebentar supaya terlihat langkah bot
      skorBot += langkahBot.poin;
    }
    giliran++;
    pilih = null;
    draft.clear();
    selesai = giliran > 6 || !cariLangkah(papan, kamus, true);
    if (!selesai) rak = rakBaru();
    const hasil = skorSaya === skorBot ? "draw" : skorSaya > skorBot ? "win" : "loss";
    pesan.textContent = selesai
      ? `Permainan selesai. ${{ win: "Kamu menang!", loss: "Bot menang.", draw: "Hasil seri." }[hasil]}`
      : `${teks} ${langkahBot ? `Bot mendapat ${langkahBot.poin} poin.` : "Bot melewati giliran."}`;
    if (selesai) lapor(profil, hasil, skorSaya);
    gambar();
  }

  papanEl.replaceChildren(...Array.from({ length: UKURAN ** 2 }, (_, i) => {
    const b = document.createElement("button");
    b.dataset.petak = i;
    if (i === TENGAH || bonus(i) === 2) b.classList.add("petak-bonus");
    if (i === TENGAH) b.classList.add("petak-tengah");
    return b;
  }));
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.matches("[data-tutup]")) { panel.hidden = true; tutup(); return; }
    if (b.matches("[data-main]")) { mulai(profil, bahasaAktif); return; }
    if (selesai) return;
    if (b.dataset.keping !== undefined) pilih = Number(b.dataset.keping);
    if (b.dataset.petak !== undefined) {
      const i = Number(b.dataset.petak);
      if (draft.has(i)) { pilih = draft.get(i); draft.delete(i); }
      else if (pilih !== null) { draft.set(i, pilih); pilih = null; }
    }
    if (b.matches("[data-batal]")) { draft.clear(); pilih = null; }
    if (b.matches("[data-lewati]")) { lanjutGiliran("Kamu melewati giliran."); return; }
    if (b.matches("[data-kirim]")) {
      const pasang = new Map([...draft].map(([i, k]) => [i, rak[k]]));
      const hasil = nilaiLangkah(papan, pasang, kamusPemain);   // pemain boleh memakai semua kata di kamus besar
      if (hasil.pesan) { pesan.textContent = hasil.pesan; return; }
      for (const [i, huruf] of pasang) papan[i] = huruf;
      skorSaya += hasil.poin;
      lanjutGiliran(`Kamu mendapat ${hasil.poin} poin.`);
      return;
    }
    const fokus = b.dataset.keping;
    gambar();
    if (fokus !== undefined) rakEl.querySelector(`[data-keping="${fokus}"]`)?.focus();
  });

  function mulai(p, bahasa) {
    profil = p;
    bahasaAktif = bahasa;
    kamus = kamusKata(bahasa);
    kamusPemain = pemeriksaKata(bahasa);
    muatKamusBesar(bahasa);
    papan = Array(UKURAN ** 2).fill("");
    langkahBotTerakhir = new Set();
    draft = new Map();
    pilih = null;
    skorSaya = skorBot = 0;
    giliran = 1;
    selesai = false;
    rak = rakBaru();
    pesan.textContent = "Pilih huruf dari rak, lalu petak di papan. Kata pertama melewati ✦.";
    panel.hidden = false;
    gambar();
    main.focus();
  }
  return mulai;
}

const UKURAN = 8;
const ARAH = [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => [y, x])).filter(([y, x]) => x || y);

export function kepingTerbalik(papan, i, sisi) {
  if (!Number.isInteger(i) || i < 0 || i >= papan.length || papan[i]) return [];
  const lawan = 3 - sisi;
  const baris = Math.floor(i / UKURAN), kolom = i % UKURAN;
  const hasil = [];
  for (const [dy, dx] of ARAH) {
    let y = baris + dy, x = kolom + dx;
    const kandidat = [];
    while (y >= 0 && y < UKURAN && x >= 0 && x < UKURAN) {
      const j = y * UKURAN + x;
      if (papan[j] === sisi) { hasil.push(...kandidat); break; }
      if (papan[j] !== lawan) break;
      kandidat.push(j);
      y += dy;
      x += dx;
    }
  }
  return hasil;
}

function langkahSah(papan, sisi) {
  return papan.flatMap((_, i) => {
    const balik = kepingTerbalik(papan, i, sisi);
    return balik.length ? [{ i, balik }] : [];
  });
}

export function pasangOtello(panel, tutup) {
  const papanEl = panel.querySelector("[data-papan]");
  const skor = panel.querySelector("[data-skor]");
  const pesan = panel.querySelector("[data-pesan]");
  const tombolMain = panel.querySelector("[data-main]");
  let papan, langkah, timer;
  const petak = Array.from({ length: UKURAN ** 2 }, (_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.petak = i;
    return b;
  });
  papanEl.replaceChildren(...petak);

  function gambar(teks) {
    const biru = papan.filter((v) => v === 1).length;
    const jingga = papan.filter((v) => v === 2).length;
    skor.textContent = `Kamu ${biru} · Bot ${jingga}`;
    pesan.textContent = teks || (biru === jingga ? "Permainan selesai. Seri!" : biru > jingga ? "Permainan selesai. Kamu menang!" : "Permainan selesai. Bot menang.");
    petak.forEach((b, i) => {
      const sah = langkah.some((p) => p.i === i);
      b.dataset.sah = String(sah);
      b.dataset.sisi = papan[i];
      b.disabled = !sah;
      const isi = papan[i] === 1 ? "biru" : papan[i] === 2 ? "jingga" : sah ? "langkah tersedia" : "kosong";
      b.setAttribute("aria-label", `Baris ${Math.floor(i / UKURAN) + 1}, kolom ${i % UKURAN + 1}, ${isi}`);
    });
  }

  function letakkan({ i, balik }, sisi) {
    papan[i] = sisi;
    for (const j of balik) papan[j] = sisi;
  }

  function giliranBot() {
    const opsi = langkahSah(papan, 2);
    if (!opsi.length) {
      langkah = langkahSah(papan, 1);
      gambar(langkah.length ? "Bot melewati giliran. Giliranmu." : "");
      return;
    }
    langkah = [];
    gambar("Giliran bot…");
    timer = setTimeout(() => {
      const nilai = ({ i, balik }) => balik.length + ([0, 7, 56, 63].includes(i) ? 20 : 0);
      opsi.sort((a, b) => nilai(b) - nilai(a));
      letakkan(opsi[0], 2);
      langkah = langkahSah(papan, 1);
      if (langkah.length) gambar("Giliranmu.");
      else giliranBot();
    }, 350);
  }

  function mulai() {
    clearTimeout(timer);
    papan = Array(UKURAN ** 2).fill(0);
    papan[27] = papan[36] = 2;
    papan[28] = papan[35] = 1;
    langkah = langkahSah(papan, 1);
    panel.hidden = false;
    gambar("Giliranmu.");
    petak[langkah[0].i].focus();
  }
  tombolMain.onclick = mulai;
  panel.querySelector("[data-tutup]").onclick = () => {
    clearTimeout(timer);
    panel.hidden = true;
    tutup();
  };
  papanEl.onclick = (e) => {
    const pilihan = langkah.find(({ i }) => i === Number(e.target.closest("[data-petak]")?.dataset.petak));
    if (!pilihan) return;
    letakkan(pilihan, 1);
    giliranBot();
  };
  return mulai;
}

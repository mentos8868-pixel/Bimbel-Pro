import { ADEGAN_BEDA, MEJA_BEDA, targetAdegan } from "../../shared/beda-gambar.js";

export function pasangBedaGambar(panel, tutup, room) {
  const judul = panel.querySelector("[data-judul-beda]");
  const skor = panel.querySelector("[data-skor-beda]");
  const pesan = panel.querySelector("[data-pesan-beda]");
  const lanjut = panel.querySelector("[data-lanjut-beda]");
  const gambar = [...panel.querySelectorAll("[data-gambar-beda]")];
  const ulang = panel.querySelector("[data-ulang-beda]");
  const berdua = panel.querySelector("[data-berdua-beda]");
  const lobi = panel.querySelector("[data-lobi-beda]");
  const isi = panel.querySelector("[data-isi-beda]");
  let putaran, ditemukan, target, meja, online = false, statusOnline;

  function keluarBerdua() {
    if (online) room?.send("beda-keluar");
    online = false;
    statusOnline = undefined;
    berdua.hidden = true;
    ulang.hidden = false;
    ulang.textContent = "Main ulang";
  }

  function mulaiAdegan(indeks, targetBersama) {
    putaran = indeks;
    ditemukan = new Set();
    const adegan = ADEGAN_BEDA[putaran];
    target = targetBersama ? new Set(targetBersama) : targetAdegan(putaran);
    judul.textContent = `${adegan.nama} · Adegan ${putaran + 1}/${ADEGAN_BEDA.length}`;
    pesan.textContent = "Tandai benda yang berbeda di salah satu gambar.";
    skor.textContent = `0 dari ${target.size} perbedaan`;
    lanjut.hidden = true;
    gambar.forEach((wadah, versi) => {
      wadah.style.backgroundPosition = `${(putaran % 3) * 50}% ${putaran < 3 ? 0 : 100}%`;
      const tombol = adegan.benda.map(([label, x, y], i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.benda = i;
        b.style.left = `${x}%`;
        b.style.top = `${y}%`;
        b.setAttribute("aria-label", label);
        b.setAttribute("aria-pressed", "false");
        return b;
      });
      const perubahan = [...target].filter((i) => i % 2 === versi).map((i) => {
        const [, x, y, sprite, lebar] = adegan.benda[i];
        const benda = document.createElement("span");
        benda.className = "beda-foto-varian";
        benda.style.left = `${x}%`;
        benda.style.top = `${y}%`;
        benda.style.width = `${lebar}%`;
        benda.style.backgroundPosition = `${(sprite % 6) * 20}% ${Math.floor(sprite / 6) * 100 / 3}%`;
        benda.setAttribute("aria-hidden", "true");
        return benda;
      });
      wadah.replaceChildren(...tombol, ...perubahan);
    });
  }

  for (const wadah of gambar) wadah.onclick = (e) => {
    const b = e.target.closest("[data-benda]");
    if (!b || ditemukan.size === target.size || (online && statusOnline !== "main")) return;
    const i = Number(b.dataset.benda);
    if (ditemukan.has(i)) return;
    if (online) {
      room.send("beda-pilih", { adegan: putaran, benda: i });
      return;
    }
    if (!target.has(i)) {
      pesan.textContent = "Benda ini sama di kedua gambar. Coba bagian lain.";
      return;
    }
    ditemukan.add(i);
    for (const g of gambar) g.children[i].setAttribute("aria-pressed", "true");
    skor.textContent = `${ditemukan.size} dari ${target.size} perbedaan`;
    if (ditemukan.size === target.size) {
      pesan.textContent = putaran + 1 < ADEGAN_BEDA.length ? "Semua perbedaan ditemukan!" : "Semua adegan selesai!";
      lanjut.hidden = putaran + 1 >= ADEGAN_BEDA.length;
    } else {
      pesan.textContent = "Betul, kamu menemukan perbedaan!";
    }
  };

  function mulai(mejaArena) {
    keluarBerdua();
    if (mejaArena) meja = MEJA_BEDA.findIndex((p) => p.x === mejaArena.x && p.z === mejaArena.z);
    panel.hidden = false;
    if (mejaArena && room) {
      online = true;
      statusOnline = "menunggu";
      judul.textContent = "Lobi meja";
      skor.textContent = "";
      lobi.hidden = false;
      lobi.replaceChildren();
      isi.hidden = true;
      lanjut.hidden = true;
      ulang.textContent = "Latihan sendiri";
      pesan.textContent = "Menghubungi meja…";
      room.send("beda-gabung", meja);
    } else {
      lobi.hidden = true;
      isi.hidden = false;
      mulaiAdegan(0);
    }
    judul.focus();
  }
  lanjut.onclick = () => {
    if (online) { room.send("beda-lanjut", putaran); return; }
    mulaiAdegan(putaran + 1);
    judul.focus();
  };
  ulang.onclick = () => mulai();
  berdua.onclick = () => {
    if (!room || !online || statusOnline !== "menunggu") return;
    berdua.disabled = true;
    room.send("beda-ready");
  };
  room?.onMessage("beda-status", (data) => {
    if (!online || panel.hidden) return;
    if (data.status === "menunggu") {
      lobi.replaceChildren(...[0, 1].map((i) => {
        const p = data.skor[i];
        const baris = document.createElement("li");
        baris.textContent = `Player ${i + 1} · ${p ? `${p.id === room.sessionId ? "Kamu" : p.nama} · ${p.siap ? "Ready" : "Belum ready"}` : "Menunggu pemain"}`;
        return baris;
      }));
      berdua.hidden = false;
      berdua.disabled = data.skor.some((p) => p.id === room.sessionId && p.siap);
      pesan.textContent = "Permainan dimulai saat kedua pemain Ready.";
      return;
    }
    lobi.hidden = true;
    isi.hidden = false;
    berdua.hidden = true;
    ulang.hidden = true;
    if (statusOnline === "menunggu" || putaran !== data.adegan) mulaiAdegan(data.adegan, data.target);
    statusOnline = data.status;
    ditemukan = new Set(data.ditemukan);
    for (const g of gambar) {
      for (const [i, b] of [...g.querySelectorAll("[data-benda]")].entries()) {
        b.setAttribute("aria-pressed", String(ditemukan.has(i)));
        b.disabled = statusOnline !== "main";
      }
    }
    skor.textContent = data.skor.map(({ id, nama, poin }) => `${id === room.sessionId ? "Kamu" : nama} ${poin}`).join(" · ")
      + ` · ${ditemukan.size}/${target.size} perbedaan`;
    lanjut.hidden = statusOnline !== "lanjut";
    if (statusOnline === "selesai") {
      const [a, b] = data.skor;
      const menang = a.poin > b.poin ? a : b;
      pesan.textContent = a.poin === b.poin ? "Permainan selesai. Seri!" : `${menang.id === room.sessionId ? "Kamu" : menang.nama} menang!`;
    } else {
      pesan.textContent = {
        main: "Siapa cepat, dia dapat poin. Tandai benda yang berbeda.",
        lanjut: "Semua perbedaan ditemukan. Lanjut ke adegan berikutnya.",
      }[statusOnline];
    }
  });
  room?.onMessage("beda-gagal", (teks) => {
    if (!online) return;
    if (statusOnline === "menunggu") mulai();
    pesan.textContent = teks;
  });
  room?.onMessage("beda-berakhir", () => {
    if (!online) return;
    if (statusOnline === "selesai") { keluarBerdua(); return; }
    mulai();
    pesan.textContent = "Pemain lain meninggalkan meja. Kamu kembali ke latihan.";
  });
  room?.onLeave(() => {
    room = null;
    if (online) {
      online = false;
      mulai();
      pesan.textContent = "Koneksi terputus. Kamu bisa lanjut latihan sendiri.";
    }
    berdua.hidden = true;
  });
  panel.querySelector("[data-tutup-beda]").onclick = () => {
    keluarBerdua();
    panel.hidden = true;
    tutup();
  };
  return mulai;
}

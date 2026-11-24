import { JUMLAH_RONDE, MODE_LOMBA, TINGKAT_LOMBA, soalLomba } from "../../shared/lomba-matematika.js";
export function pasangLombaMatematika(panel, keluarMeja, joinLombaMatematika) {
  const elemen = (nama) => panel.querySelector(`[data-mat-${nama}]`);
  const pilihan = [...panel.querySelectorAll("[data-mat-pilih]")];
  const online = elemen("online");
  const latihan = elemen("latihan");
  const skor = elemen("skor");
  const status = elemen("status");
  const bar = elemen("bar");
  const pengaturan = elemen("pengaturan");
  const tingkat = elemen("tingkat");
  const mode = elemen("mode");
  const tunggu = elemen("tunggu");
  const siap = elemen("siap");
  for (const [id, level] of Object.entries(TINGKAT_LOMBA)) tingkat.add(new Option(level.nama, id));
  for (const [id, m] of Object.entries(MODE_LOMBA)) mode.add(new Option(m.nama, id));
  tingkat.value = "sedang";
  let room, meja, timer, versi = 0, nomor, kunci, batas, poin, terkirim;
  let tingkatLatihan;

  function tampilTingkat(id, terkunci = false) {
    const level = TINGKAT_LOMBA[id];
    tingkat.value = id;
    tingkat.disabled = terkunci;
    elemen("tingkat-info").textContent = `${level.keterangan} ${level.jumlahPilihan} pilihan, ${level.waktu} detik per soal.${terkunci ? " Pemain pertama memilih tingkat." : ""}`;
  }
  function tampilMode(id, terkunci = false) {
    mode.value = id;
    mode.disabled = terkunci;
    elemen("mode-info").textContent = MODE_LOMBA[id].keterangan;
  }

  function pesan(teks) {
    if (status.textContent !== teks) status.textContent = teks;
  }
  function tampilSoal(ronde, soal, jawaban, sisa, idTingkat, terkunci) {
    elemen("ronde").hidden = false;
    elemen("angka").textContent = `${TINGKAT_LOMBA[idTingkat].nama} · Ronde ${ronde}/${JUMLAH_RONDE}`;
    elemen("waktu").textContent = `${sisa} detik`;
    elemen("soal").textContent = soal;
    bar.max = TINGKAT_LOMBA[idTingkat].waktu;
    bar.value = sisa;
    pilihan.forEach((b, i) => {
      b.hidden = i >= jawaban.length;
      b.textContent = jawaban[i] ?? "";
      b.disabled = b.hidden || Boolean(terkunci);
    });
  }
  function tampilSkor(pemain) {
    skor.replaceChildren(...pemain.map(([nama, poinPemain]) => {
      const item = document.createElement("li");
      item.textContent = `${nama} · ${poinPemain} poin`;
      return item;
    }));
  }
  function tampilOnline(s) {
    if (!s?.status || !TINGKAT_LOMBA[s.tingkat] || !MODE_LOMBA[s.mode]) return;
    const saya = s.pemain.get(room.sessionId);
    const menunggu = s.status === "menunggu";
    tunggu.hidden = !menunggu;
    pengaturan.hidden = !menunggu;
    skor.hidden = menunggu;
    if (!menunggu) tampilSkor([...s.pemain.values()].map((p) => [p.nama, p.poin]));
    if (s.status === "bermain") {
      latihan.hidden = true;
      const sudah = saya?.dijawab || terkirim === s.ronde;
      pesan(sudah ? "Jawaban dikirim. Tunggu ronde berikutnya." : MODE_LOMBA[s.mode].nama);
      tampilSoal(s.ronde, s.soal, s.pilihan, s.sisa, s.tingkat, sudah);
    } else if (s.status === "selesai") {
      elemen("ronde").hidden = true;
      latihan.hidden = false;
      pesan(s.pemenang ? `Pemenang: ${s.pemenang}` : "Hasil seri.");
    } else {
      tampilTingkat(s.tingkat, s.host !== room.sessionId);
      tampilMode(s.mode, s.host !== room.sessionId);
      const pemain = [...s.pemain.entries()];
      const baris = Array.from({ length: 2 }, (_, i) => {
        const [id, p] = pemain[i] || [];
        const item = document.createElement("li");
        const nama = document.createElement("b");
        const keadaan = document.createElement("span");
        nama.textContent = p ? `${p.nama}${id === room.sessionId ? " (kamu)" : ""}` : "Slot kosong";
        keadaan.textContent = p ? (p.siap ? "Siap" : "Belum siap") : "Menunggu pemain";
        item.append(nama, keadaan);
        return item;
      });
      elemen("pemain").replaceChildren(...baris);
      siap.textContent = saya?.siap ? "Batalkan siap" : "Siap";
      siap.disabled = !saya;
      pesan(s.pemain.size < 2 ? "Menunggu pemain kedua di meja ini." : "Lomba dimulai setelah kedua pemain menekan Siap.");
    }
  }
  function hentikan() {
    versi++;
    clearInterval(timer);
    const koneksi = room;
    room = null;
    koneksi?.leave().catch(() => {});
    elemen("ronde").hidden = true;
    tunggu.hidden = true;
  }
  function rondeLatihan() {
    if (nomor >= JUMLAH_RONDE) {
      clearInterval(timer);
      elemen("ronde").hidden = true;
      latihan.hidden = false;
      online.hidden = !meja;
      pengaturan.hidden = false;
      pesan(`Latihan selesai. ${poin}/${JUMLAH_RONDE} jawaban benar.`);
      return;
    }
    const soal = soalLomba(nomor++, tingkatLatihan);
    const waktu = TINGKAT_LOMBA[tingkatLatihan].waktu;
    kunci = soal.kunci;
    batas = Date.now() + waktu * 1000;
    tampilSoal(nomor, soal.teks, soal.pilihan, waktu, tingkatLatihan, false);
  }
  latihan.onclick = () => {
    hentikan();
    tingkatLatihan = tingkat.value;
    tampilTingkat(tingkatLatihan);
    pengaturan.hidden = true;
    skor.hidden = false;
    nomor = 0;
    poin = 0;
    online.hidden = latihan.hidden = true;
    pesan("");
    tampilSkor([["Kamu", poin]]);
    rondeLatihan();
    timer = setInterval(() => {
      const sisa = Math.max(0, Math.ceil((batas - Date.now()) / 1000));
      if (!sisa) rondeLatihan();
      else { elemen("waktu").textContent = `${sisa} detik`; bar.value = sisa; }
    }, 200);
  };
  online.onclick = async () => {
    const permintaan = ++versi;
    terkirim = 0;
    online.hidden = true;
    pesan("Menghubungkan ke meja…");
    try {
      const koneksi = await joinLombaMatematika(meja, tingkat.value, mode.value);
      if (permintaan !== versi) { await koneksi.leave(); return; }
      room = koneksi;
      room.onStateChange((s) => { if (room === koneksi) tampilOnline(s); });
      room.onLeave(() => {
        if (room !== koneksi) return;
        room = null;
        elemen("ronde").hidden = true;
        tunggu.hidden = true;
        pengaturan.hidden = false;
        tampilTingkat(tingkat.value);
        tampilMode(mode.value);
        online.hidden = latihan.hidden = false;
        pesan("Koneksi ke meja terputus.");
      });
      tampilOnline(room.state);
    } catch (e) {
      if (permintaan !== versi) return;
      online.hidden = false;
      pesan(e.message || "Meja belum bisa dihubungi.");
    }
  };
  tingkat.onchange = () => {
    if (room?.state.status === "menunggu") room.send("tingkat", tingkat.value);
    tampilTingkat(tingkat.value, Boolean(room && room.state.host !== room.sessionId));
  };
  mode.onchange = () => {
    if (room?.state.status === "menunggu") room.send("mode", mode.value);
    tampilMode(mode.value, Boolean(room && room.state.host !== room.sessionId));
  };
  siap.onclick = () => {
    const state = room?.state;
    const saya = state?.pemain.get(room.sessionId);
    if (saya && state.status === "menunggu") room.send("siap", { siap: !saya.siap, tingkat: tingkat.value, mode: mode.value });
  };
  pilihan.forEach((b, i) => {
    b.onclick = () => {
      if (room) {
        terkirim = room.state.ronde;
        room.send("jawab", { ronde: terkirim, pilihan: i });
        tampilOnline(room.state);
      } else if (Date.now() < batas) {
        if (i === kunci) poin++;
        tampilSkor([["Kamu", poin]]);
        rondeLatihan();
      }
    };
  });
  elemen("tutup").onclick = keluarMeja;
  return {
    buka(kunciMeja) {
      meja = kunciMeja;
      panel.hidden = false;
      pengaturan.hidden = false;
      tampilTingkat(tingkat.value);
      tampilMode(mode.value);
      online.hidden = !meja;
      latihan.hidden = false;
      skor.replaceChildren();
      pesan("Pilih satu jawaban di setiap ronde. Jawaban benar bernilai satu poin.");
      (meja ? online : latihan).focus();
    },
    tutup() {
      hentikan();
      panel.hidden = true;
    },
  };
}

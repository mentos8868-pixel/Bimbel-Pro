const el = id => document.getElementById(id);
const jamValid = /^([01]\d|2[0-3]):[0-5]\d$/;

function berikutnya(jam) {
  const [h, m] = jam.split(":").map(Number);
  const waktu = new Date();
  waktu.setHours(h, m, 0, 0);
  if (waktu <= Date.now()) waktu.setDate(waktu.getDate() + 1);
  return waktu.getTime();
}

export function buatAlarm(idAnak) {
  const key = "bimbel-alarm:" + idAnak;
  const editor = el("alarm-editor"), form = el("alarm-form");
  let daftar = [], edit = false, pilihan = null, timer, audio;

  function baca() {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      daftar = Array.isArray(data) ? data.filter(a => a && jamValid.test(a.jam)) : [];
    } catch { daftar = []; }
  }
  function suaraSiap() {
    if (!window.AudioContext) return;
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
  }
  document.addEventListener("click", suaraSiap, { once: true });
  function simpan() {
    localStorage.setItem(key, JSON.stringify(daftar));
    jadwalkan();
    tampilkan();
  }
  function jadwalkan() {
    clearTimeout(timer);
    const aktif = daftar.filter(a => a.target);
    if (!aktif.length) return;
    timer = setTimeout(() => {
      baca();
      const jatuhTempo = daftar.filter(a => a.target && a.target <= Date.now());
      if (!jatuhTempo.length) { jadwalkan(); return; }
      for (const a of jatuhTempo) a.target = a.harian ? berikutnya(a.jam) : null;
      simpan();
      el("alarm-rincian").textContent = jatuhTempo.map(a => a.jam + " · " + a.nama).join(", ");
      if (!el("alarm-pesan").open) el("alarm-pesan").showModal();
      if (audio?.state === "running") {
        const nada = audio.createOscillator(), volume = audio.createGain();
        volume.gain.value = 0.1;
        nada.connect(volume).connect(audio.destination);
        nada.start();
        nada.stop(audio.currentTime + 0.8);
      }
    }, Math.max(0, Math.min(...aktif.map(a => a.target)) - Date.now()));
  }
  function buka(a) {
    pilihan = a?.id ?? null;
    form.reset();
    form.elements.jam.value = a?.jam ?? "";
    form.elements.nama.value = a?.nama ?? "";
    form.elements.harian.checked = !!a?.harian;
    el("alarm-edit-judul").textContent = a ? "Edit alarm" : "Tambah alarm";
    editor.showModal();
  }
  el("alarm-kembali").onclick = () => editor.close();
  form.onsubmit = e => {
    e.preventDefault();
    const jam = form.elements.jam.value;
    const item = { id: pilihan ?? crypto.randomUUID(), jam, nama: form.elements.nama.value.trim() || "Alarm",
      harian: form.elements.harian.checked, target: berikutnya(jam) };
    const i = daftar.findIndex(a => a.id === pilihan);
    if (i < 0) daftar.push(item);
    else daftar[i] = item;
    suaraSiap();
    editor.close();
    simpan();
  };
  function tampilkan() {
    const panel = el("alarm-anak");
    if (!panel) return;
    panel.innerHTML = '<header><h3>Alarm</h3><div><button type="button" data-edit>Edit</button> <button type="button" data-tambah aria-label="Tambah alarm">＋</button></div></header><p class="muted kecil">Biarkan dasbor terbuka agar alarm berbunyi.</p>';
    const tombolEdit = panel.querySelector("[data-edit]");
    tombolEdit.hidden = !daftar.length;
    tombolEdit.textContent = edit ? "Selesai" : "Edit";
    tombolEdit.onclick = () => { edit = !edit; tampilkan(); };
    panel.querySelector("[data-tambah]").onclick = () => buka();
    for (const a of [...daftar].sort((x,y) => x.jam.localeCompare(y.jam))) {
      const row = document.createElement("div");
      row.className = "alarm-baris";
      row.innerHTML = '<button class="alarm-detail"><strong></strong><span></span></button>';
      row.querySelector("strong").textContent = a.jam;
      row.querySelector("span").textContent = a.nama + (a.harian ? " · Setiap hari" : " · Sekali");
      row.querySelector("button").onclick = () => buka(a);
      if (edit) {
        const hapus = document.createElement("button");
        hapus.textContent = "Hapus";
        hapus.onclick = () => { daftar = daftar.filter(x => x.id !== a.id); if (!daftar.length) edit = false; simpan(); };
        row.append(hapus);
      } else {
        const sakelar = document.createElement("input");
        sakelar.type = "checkbox";
        sakelar.setAttribute("role","switch");
        sakelar.setAttribute("aria-label","Aktifkan alarm " + a.jam + " " + a.nama);
        sakelar.checked = !!a.target;
        sakelar.onchange = () => { a.target = sakelar.checked ? berikutnya(a.jam) : null; suaraSiap(); simpan(); };
        row.append(sakelar);
      }
      panel.append(row);
    }
  }
  window.addEventListener("storage", e => {
    if (e.key === key || e.key === null) { baca(); jadwalkan(); tampilkan(); }
  });
  baca();
  jadwalkan();
  return { tampilkan };
}

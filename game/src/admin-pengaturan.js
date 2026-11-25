import { api } from "./api.js";
import { BATAS_PENGATURAN } from "../../shared/pengaturan-game.js";

const panel = document.getElementById("pengaturan-admin");
const game = document.getElementById("form-game");
const toko = document.getElementById("form-katalog");
const statusGame = document.getElementById("status-game");
const statusToko = document.getElementById("status-katalog");
const level = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };
const namaKolom = { jumlahSoal: "Jumlah soal", waktu: "Detik per soal", jumlahPilihan: "Pilihan jawaban" };
let token = "";

function angka(nilai, [min, max], label) {
  const input = document.createElement("input");
  Object.assign(input, { type: "number", min, max, step: 1, value: nilai, required: true });
  input.setAttribute("aria-label", label);
  return input;
}

function tabel(judul, kolom) {
  const table = document.createElement("table");
  const caption = table.createCaption();
  caption.textContent = judul;
  const header = table.createTHead().insertRow();
  for (const nama of kolom) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = nama;
    header.append(th);
  }
  return table;
}

function tampilGame(config) {
  const isi = document.getElementById("aturan-game");
  isi.replaceChildren();
  const masukan = {};
  for (const [grup, judul] of [["latihan", "Latihan Ruang Pintar"], ["matematika", "Lomba Matematika"]]) {
    const kolom = Object.entries(BATAS_PENGATURAN[grup]);
    const table = tabel(judul, ["Kesulitan", ...kolom.map(([id]) => namaKolom[id])]);
    const body = table.createTBody();
    masukan[grup] = {};
    for (const [id, nama] of Object.entries(level)) {
      const row = body.insertRow();
      row.insertCell().textContent = nama;
      masukan[grup][id] = {};
      for (const [field, batas] of kolom) {
        const input = angka(config[grup][id][field], batas, `${judul}, ${nama}, ${namaKolom[field]}`);
        row.insertCell().append(input);
        masukan[grup][id][field] = input;
      }
    }
    isi.append(table);
  }
  const tryout = tabel("Komposisi Tryout", ["Kesulitan", "Persentase"]);
  const body = tryout.createTBody();
  const persen = {};
  for (const id of ["sulit", "sedang"]) {
    const row = body.insertRow();
    row.insertCell().textContent = level[id];
    persen[id] = angka(config.tryout[id], BATAS_PENGATURAN.tryout[id], `Persentase soal ${id}`);
    row.insertCell().append(persen[id], " %");
  }
  const row = body.insertRow();
  row.insertCell().textContent = "Mudah";
  const mudah = row.insertCell();
  const perbarui = () => { mudah.textContent = `${100 - Number(persen.sulit.value) - Number(persen.sedang.value)} %`; };
  for (const input of Object.values(persen)) input.addEventListener("input", perbarui);
  perbarui();
  isi.append(tryout);

  const nilai = (fields) => Object.fromEntries(Object.entries(fields).map(([id, input]) => [id, input.valueAsNumber]));
  game.onsubmit = (event) => {
    event.preventDefault();
    const config = { tryout: nilai(persen) };
    for (const [grup, levels] of Object.entries(masukan)) {
      config[grup] = Object.fromEntries(Object.entries(levels).map(([id, fields]) => [id, nilai(fields)]));
    }
    simpan(game, statusGame, "admin/pengaturan-game", { config });
  };
}

function tampilKatalog(items) {
  const isi = document.getElementById("katalog-admin");
  isi.replaceChildren();
  const masukan = [];
  for (const [jenis, nama] of [["aksesori", "Aksesori"], ["avatar", "Karakter avatar"]]) {
    const rincian = document.createElement("details");
    const judul = document.createElement("summary");
    judul.textContent = nama;
    const bungkus = document.createElement("div");
    bungkus.className = "tabel-akun";
    const table = tabel(nama, jenis === "avatar" ? ["Karakter", "Varian", "Harga", "Dijual"] : ["Item", "Harga", "Dijual"]);
    const body = table.createTBody();
    for (const item of items.filter((item) => item.jenis === jenis)) {
      const row = body.insertRow();
      const label = item.varian ? `${item.nama} (${item.varian})` : item.nama;
      row.insertCell().textContent = item.nama;
      if (jenis === "avatar") row.insertCell().textContent = item.varian;
      const harga = angka(item.harga, [0, 10000], `Harga ${label}`);
      const dijual = document.createElement("input");
      Object.assign(dijual, { type: "checkbox", checked: item.dijual });
      dijual.setAttribute("aria-label", `Jual ${label}`);
      row.insertCell().append(harga);
      row.insertCell().append(dijual);
      masukan.push({ item, harga, dijual });
    }
    bungkus.append(table);
    rincian.append(judul, bungkus);
    isi.append(rincian);
  }
  toko.onsubmit = async (event) => {
    event.preventDefault();
    const perubahan = masukan.filter(({ item, harga, dijual }) =>
      item.harga !== harga.valueAsNumber || item.dijual !== dijual.checked);
    if (!perubahan.length) { statusToko.textContent = "Belum ada perubahan."; return; }
    const items = perubahan.map(({ item, harga, dijual }) => ({
      id: item.id, harga: harga.valueAsNumber, dijual: dijual.checked,
    }));
    if (await simpan(toko, statusToko, "admin/katalog-toko", { items })) {
      perubahan.forEach(({ item }, i) => Object.assign(item, items[i]));
    }
  };
}

async function simpan(form, status, path, data) {
  if (!token) return false;
  const inputs = [...form.querySelectorAll("input, button")];
  inputs.forEach((input) => { input.disabled = true; });
  status.textContent = "Menyimpan…";
  try {
    await api("PUT", path, { token, ...data });
    status.textContent = "Perubahan tersimpan.";
    return true;
  } catch (error) {
    status.textContent = error.message;
    return false;
  } finally {
    inputs.forEach((input) => { input.disabled = false; });
  }
}

export function tutupPengaturan() {
  token = "";
  panel.hidden = true;
}

export async function bukaPengaturan(kunci) {
  if (token === kunci && !panel.hidden) return;
  token = kunci;
  panel.hidden = true;
  const [config, items] = await Promise.all([
    api("GET", "pengaturan-game"),
    api("POST", "admin/katalog-toko", { token: kunci }),
  ]);
  if (token !== kunci) return;
  tampilGame(config);
  tampilKatalog(items);
  statusGame.textContent = statusToko.textContent = "";
  panel.hidden = false;
}

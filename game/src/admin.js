import { api } from "./api.js";
import { negaraName } from "../../shared/negara.js";

const form = document.getElementById("akses-admin");
const statistik = document.getElementById("statistik");
const status = document.getElementById("status-admin");
const angka = new Intl.NumberFormat("id-ID");
const tombol = form.querySelector("button");
const rincian = document.getElementById("rincian-akun");
const jenis = document.getElementById("jenis-akun");
const daftar = document.getElementById("daftar-akun");
const sebelumnya = document.getElementById("akun-sebelumnya");
const berikutnya = document.getElementById("akun-berikutnya");
const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
let token = "";
let halaman = 1;
let totalHalaman = 1;
let jenisTerakhir = jenis.value;

async function perbarui(tujuan = halaman) {
  if (tombol.disabled || !token) return;
  tombol.disabled = true;
  jenis.disabled = sebelumnya.disabled = berikutnya.disabled = true;
  try {
    const data = await api("POST", "admin/statistik", { token, jenis: jenis.value, halaman: tujuan });
    for (const key of ["orangTua", "anak", "aktif", "arena"]) {
      document.getElementById(key).textContent = angka.format(data[key]);
    }
    const akun = data.akun;
    daftar.replaceChildren(...akun.daftar.map((item) => {
      const baris = document.createElement("tr");
      const negara = item.negara ? negaraName(item.negara) : "—";
      for (const nilai of [item.login || "—", item.name, negara, tanggal.format(item.dibuat), item.status]) {
        baris.insertCell().textContent = nilai;
      }
      return baris;
    }));
    jenisTerakhir = jenis.value;
    halaman = akun.halaman;
    totalHalaman = akun.totalHalaman;
    document.getElementById("halaman-akun").textContent = `Halaman ${halaman} dari ${totalHalaman}`;
    document.getElementById("akun-kosong").hidden = akun.daftar.length > 0;
    rincian.hidden = false;
    statistik.hidden = false;
    status.textContent = "Diperbarui pukul " + new Date().toLocaleTimeString("id-ID");
  } catch (error) {
    jenis.value = jenisTerakhir;
    if (error.status === 403) {
      token = "";
      statistik.hidden = true;
      rincian.hidden = true;
      daftar.replaceChildren();
    }
    status.textContent = error.message;
  } finally {
    tombol.disabled = false;
    jenis.disabled = false;
    sebelumnya.disabled = halaman <= 1;
    berikutnya.disabled = halaman >= totalHalaman;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (tombol.disabled) return;
  token = form.elements.kunci.value.trim();
  form.reset();
  perbarui();
});

jenis.addEventListener("change", () => perbarui(1));
sebelumnya.addEventListener("click", () => perbarui(halaman - 1));
berikutnya.addEventListener("click", () => perbarui(halaman + 1));

setInterval(() => {
  if (document.visibilityState === "visible") perbarui();
}, 15_000);

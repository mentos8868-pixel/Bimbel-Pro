// Laporan Ruang Pintar untuk dashboard orang tua (menu Report). Data dari /api/laporan → belajar.laporan.
// Menampilkan SEMUA pelajaran dan topik di kelas dan kurikulum anak (yang belum dilatih ditandai "Belum dilatih"),
// ringkasan angka, saran, topik lain yang pernah dilatih, dan 10 tryout terakhir.
import { api } from "./api.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function daftarSoal(el, id) {
  const detail = el.querySelector(".rp-soal");
  if (!detail || !id) return;
  const daftar = detail.querySelector("ol");
  const status = detail.querySelector("[role=status]");
  const tombol = detail.querySelector("button");
  let berikut = null;
  async function muat() {
    if (tombol.disabled) return;
    tombol.disabled = true;
    status.textContent = "Memuat soal…";
    try {
      const data = await api("GET", `progres/soal/${id}${berikut ? `?sebelum=${berikut}` : ""}`);
      daftar.insertAdjacentHTML("beforeend", data.soal.map((s) => `<li>
        <small class="muted">${s.jenis === "tryout" ? "Tryout" : "Latihan"} · ${esc(s.topik)} · Soal ${s.nomor} · ${esc(new Date(s.waktu).toLocaleString("id-ID"))}</small>
        <div>${esc(s.soal)}</div><small>Jawaban anak: <b>${esc(s.jawaban)}</b> · ${s.benar ? "Benar" : "Salah"}</small>
      </li>`).join(""));
      berikut = data.berikut;
      tombol.hidden = !berikut;
      status.textContent = daftar.childElementCount ? "" : "Belum ada rincian soal yang tersimpan.";
    } catch (e) {
      status.textContent = e.message;
      tombol.hidden = false;
    } finally {
      tombol.disabled = false;
    }
  }
  detail.addEventListener("toggle", () => { if (detail.open) muat(); }, { once: true });
  tombol.addEventListener("click", muat);
}

// Daftar pelajaran dan topik diambil dari Ruang Pintar sendiri (satu sumber), lewat iframe tersembunyi
// /bimbel/index.html?daftar-topik yang hanya mengirim daftar topik lalu berhenti. Dimuat sekali per halaman.
let daftar = null;
function muatDaftarTopik() {
  if (daftar) return daftar;
  daftar = new Promise((selesai) => {
    const f = document.createElement("iframe");
    f.hidden = true;
    f.setAttribute("aria-hidden", "true");
    f.src = "/bimbel/index.html?daftar-topik";
    const habis = setTimeout(() => akhiri(null), 20000);
    function akhiri(hasil) {
      clearTimeout(habis);
      window.removeEventListener("message", terima);
      f.remove();
      if (!hasil) daftar = null;   // gagal: coba lagi lain kali
      selesai(hasil);
    }
    function terima(e) {
      if (e.origin === location.origin && e.source === f.contentWindow && e.data?.daftarTopik) {
        akhiri({ peta: e.data.daftarTopik, kurikulum: e.data.kurikulum || {} });
      }
    }
    window.addEventListener("message", terima);
    document.body.append(f);
  });
  return daftar;
}

const STATUS = { perlu: ["lo", "Perlu latihan"], berkembang: ["mid", "Berkembang"], kuat: ["hi", "Sudah kuat"], belum: ["none", "Belum dilatih"] };
const statusDari = (persen) => (persen == null ? "belum" : persen < 60 ? "perlu" : persen < 85 ? "berkembang" : "kuat");
const LVNAMA = { 1: "Mudah", 2: "Sedang", 3: "Sulit" };

// anak = { name, kurikulum, kelas } dari data anak di dashboard.
export function renderLaporanRP(el, l, anak) {
  if (!el) return;
  if (!l) { el.innerHTML = ""; return; }
  gambar(el, l, anak, null);
  muatDaftarTopik().then((d) => { if (el.isConnected) gambar(el, l, anak, d); });
}

function gambar(el, l, anak, d) {
  const namaAnak = anak?.name || "anak";
  const tgl = (x) => new Date(x).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const kotak = (k, v) => `<div class="rp-kotak"><span class="muted">${k}</span><b>${v}</b></div>`;

  // Gabungkan kemajuan per topik (satu topik bisa dilatih di beberapa tingkat).
  const latih = new Map();
  for (const t of l.topik) {
    const x = latih.get(t.id) || { soal: 0, benar: 0, lv: new Set(), cadangan: t };
    x.soal += t.soal;
    x.benar += t.benar ?? Math.round((t.persen / 100) * t.soal);
    if (t.lv) x.lv.add(t.lv);
    latih.set(t.id, x);
  }
  const benar = l.benar ?? [...latih.values()].reduce((jumlah, topik) => jumlah + topik.benar, 0);
  const info = (id) => d?.peta?.[id] || latih.get(id)?.cadangan || { nama: id };
  const persenDari = (x) => (x?.soal ? Math.round((x.benar / x.soal) * 100) : null);

  const baris = (id, { denganPelajaran = false } = {}) => {
    const t = info(id), x = latih.get(id), persen = persenDari(x), st = statusDari(persen);
    const [kls, label] = STATUS[st];
    const tingkat = x ? [...x.lv].sort().map((v) => LVNAMA[v]).join(", ") : "–";
    const judul = d || t.nama
      ? `${denganPelajaran ? `<span class="muted kecil">${esc(t.kur)}${t.kur && t.mapel ? " · " : ""}${esc(t.mapel)}${t.kelas ? ` · ${esc(t.kelas)}` : ""}</span><br>` : ""}<b>${esc(t.nama)}</b>${t.mix ? ' <span class="muted kecil">(campuran)</span>' : ""}`
      : `<span class="muted kecil">Memuat nama topik…</span>`;
    return `<tr class="${st === "belum" ? "rp-belum" : ""}"><td>${judul}</td><td>${tingkat}</td><td>${x ? x.soal : "–"}</td>
      <td>${persen == null ? '<span class="muted">–</span>' : `<div class="rp-acc"><span class="rp-bar"><i class="${kls}" style="width:${persen}%"></i></span><span>${persen}% <span class="muted">(${x.benar}/${x.soal})</span></span></div>`}</td>
      <td><span class="rp-pill ${kls}">${label}</span></td></tr>`;
  };
  const tabel = (ids, opsi) => `<div class="rp-tabel"><table><thead><tr><th>Topik</th><th>Tingkat dilatih</th><th>Soal</th><th>Ketepatan</th><th>Status</th></tr></thead>
    <tbody>${ids.map((id) => baris(id, opsi)).join("")}</tbody></table></div>`;

  // Semua pelajaran dan topik di kelas dan kurikulum anak.
  const kurId = anak?.kurikulum && d?.kurikulum?.[anak.kurikulum] ? anak.kurikulum : "merdeka";
  const K = d?.kurikulum?.[kurId];
  const kelas = Number(anak?.kelas) || 0;
  const diKelas = new Set();
  let bagianKelas = "";
  if (d && K && kelas) {
    const perPelajaran = K.mapel.map(([mapelId, mapelNama]) => {
      const ids = Object.entries(d.peta).filter(([, t]) => t.kurId === kurId && t.mapelId === mapelId && t.k === kelas).map(([id]) => id);
      ids.forEach((id) => diKelas.add(id));
      const utama = ids.filter((id) => !d.peta[id].mix);
      const n = utama.filter((id) => latih.has(id)).length;
      return `<div class="rp-pelajaran"><h5>${esc(mapelNama)} <span class="muted">${n}/${utama.length} topik dilatih</span></h5>
        ${ids.length ? tabel(ids) : '<p class="muted kecil">Belum ada topik untuk kelas ini.</p>'}</div>`;
    }).join("");
    bagianKelas = `<h4>Semua pelajaran dan topik · ${esc(K.kelas[kelas] || `Kelas ${kelas}`)} · ${esc(K.nama)}</h4>${perPelajaran}`;
  } else if (d && !kelas) {
    bagianKelas = '<p class="muted">Kelas anak belum diatur, jadi daftar semua topik belum bisa ditampilkan. Atur kelas di menu Setting.</p>';
  } else if (!d) {
    bagianKelas = '<p class="muted kecil">Memuat daftar pelajaran dan topik…</p>';
  }

  // Topik yang pernah dilatih di luar kelas/kurikulum anak saat ini.
  const lain = [...latih.keys()].filter((id) => !diKelas.has(id)).sort((a, b) => (persenDari(latih.get(a)) ?? 0) - (persenDari(latih.get(b)) ?? 0));
  const bagianLain = d && lain.length
    ? `<h4>${diKelas.size ? "Topik lain yang pernah dilatih" : "Topik yang pernah dilatih"}</h4>${tabel(lain, { denganPelajaran: true })}` : "";

  // Saran dari semua topik yang pernah dilatih.
  const dilatih = [...latih.keys()].map((id) => ({ id, t: info(id), persen: persenDari(latih.get(id)) }));
  const lemah = dilatih.filter((x) => statusDari(x.persen) === "perlu"), kuat = dilatih.filter((x) => statusDari(x.persen) === "kuat");
  const sebut = (x) => `${x.t.mapel ? `${esc(x.t.mapel)} – ` : ""}${esc(x.t.nama)}`;
  const saran = d && dilatih.length ? `<p class="rp-saran">${lemah.length ? `<b>Saran:</b> ajak ${esc(namaAnak)} berlatih lagi: ${lemah.map(sebut).join("; ")}.` : "<b>Bagus!</b> Belum ada topik yang tertinggal."}
    ${kuat.length ? ` Sudah kuat di: ${kuat.map(sebut).join("; ")}.` : ""}</p>` : "";

  const tryout = l.tryout.length ? `<h4>Riwayat tryout</h4><ul class="rp-tryout">${l.tryout.map((t) =>
    `<li><b>${esc(t.mapel)}</b>: nilai ${t.score} (${t.c} dari ${t.n} benar)${t.max ? ` · ${"★".repeat(t.stars)}${"☆".repeat(Math.max(0, t.max - t.stars))}` : ""}<span class="muted"> · ${tgl(t.d)}</span></li>`).join("")}</ul>` : "";

  const detailSoal = el.querySelector(".rp-soal");
  el.innerHTML = `<h4>Laporan Ruang Pintar</h4>
    <p class="muted kecil">Perkembangan belajar ${esc(namaAnak)}${l.terakhir ? ` · terakhir berlatih ${tgl(l.terakhir)}` : ""}</p>
    <div class="rp-ringkas">${kotak("Soal dikerjakan", l.soal)}${kotak("Jawaban benar", l.benarPersen == null ? "–" : `${benar}/${l.soal} (${l.benarPersen}%)`)}${kotak("Sesi latihan", l.sesi)}</div>
    ${anak?.id ? `<details class="rp-soal"><summary>Soal yang dijawab</summary>
      <p class="muted kecil">Rincian tersedia untuk soal yang tercatat sejak fitur ini aktif.</p>
      <ol></ol><p class="muted kecil" role="status"></p>
      <button type="button" hidden>Muat soal berikutnya</button></details>` : ""}
    ${saran}${bagianKelas}${bagianLain}${tryout}`;
  if (detailSoal && anak?.id) el.querySelector(".rp-soal").replaceWith(detailSoal);
  else daftarSoal(el, anak?.id);
}

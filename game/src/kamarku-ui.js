// Panel Kamarku: dashboard anak di arena (tombol "Kamarku" atau tombol K).
// Tahap 1: profil dan level, waktu main, bintang, permainan, dan teman (semua dari server).
// Kemajuan Ruang Pintar menyusul setelah datanya disimpan di server.
import { api } from "./api.js";
import { avatarSvg } from "./avatar-svg.js";
import { namaKelas, kurikulumName, negaraName } from "../../shared/negara.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const svgSrc = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
const NAMA_GAME = { catur: "Catur", scramble: "Scramble", kartu: "Kartu Kilat" };
const menit = (m) => (m >= 60 ? `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${m} menit`);

export class KamarkuUI {
  // onClose(): panel ditutup. onKe(tujuan): tombol cepat "bimbel" | "game" | "toko".
  constructor({ onClose, onKe }) {
    this.onClose = onClose;
    this.onKe = onKe;
    this.terbuka = false;
    $("kamar-tutup").onclick = () => this.close();
    $("kamarku-panel").addEventListener("click", (e) => {
      if (e.target.id === "kamarku-panel") return this.close();
      const ke = e.target.closest("[data-ke]")?.dataset.ke;
      if (ke) { this.close(); this.onKe(ke); }
    });
  }

  async open(profile) {
    this.terbuka = true;
    const p = profile;
    $("kamarku-panel").hidden = false;
    $("kamar-judul").textContent = `Kamar ${p.name}`;
    $("kamar-info").textContent = [p.kelas ? namaKelas(p.kelas, p.kurikulum) : p.jenjang, kurikulumName(p.kurikulum), negaraName(p.negara)].filter(Boolean).join(" · ");
    $("kamar-avatar").src = svgSrc(avatarSvg(p.avatar, p.color, { aksesori: String(p.aksesori || "").split(",").filter(Boolean), aura: p.aura || "" }));
    $("kamar-level").innerHTML = "";
    $("kamar-isi").innerHTML = '<p class="muted">Memuat kamarmu…</p>';
    this.err("");
    try {
      this.render(await api("GET", "kamarku"));
    } catch (x) {
      $("kamar-isi").innerHTML = "";
      this.err(x.message);
    }
  }

  close() {
    if (!this.terbuka) return;
    this.terbuka = false;
    $("kamarku-panel").hidden = true;
    this.onClose();
  }

  err(t) {
    $("kamar-error").textContent = t;
    $("kamar-error").hidden = !t;
  }

  render(k) {
    const persen = Math.round((k.xpLevel / k.xpPerLevel) * 100);
    const aura = k.auraBerikut ? `${esc(k.auraBerikut.nama)} di Level ${k.auraBerikut.level}` : `${esc(k.aura)} (tertinggi)`;
    $("kamar-level").innerHTML = `<span class="lv">Level ${k.level}</span>
      <span class="kamar-bar"><i style="width:${persen}%"></i></span>
      <span class="muted">${k.xpLevel}/${k.xpPerLevel} XP · ${aura}</span>`;

    // Waktu main hari ini (dari batas yang diatur orang tua).
    const w = k.waktu;
    const waktu = w.sisaMin === null
      ? `<span class="besar">${menit(w.usedMin)}</span><span class="kecil">sudah bermain hari ini</span>`
      : `<span class="besar">Sisa ${menit(w.sisaMin)}</span>
         <span class="kamar-bar ${w.sisaMin <= 5 ? "oranye" : "hijau"}"><i style="width:${Math.round((w.sisaMin / w.limitMin) * 100)}%"></i></span>
         <span class="kecil">${menit(w.usedMin)} dari ${menit(w.limitMin)} hari ini</span>`;

    const target = k.target
      ? (k.target.kurang > 0 ? `Kurang ${k.target.kurang} lagi untuk ${esc(k.target.name)}` : `Cukup untuk ${esc(k.target.name)}!`)
      : "Semua aksesori sudah kamu punya!";

    const games = Object.entries(k.games).map(([g, s]) => `<div class="kamar-baris"><span>${NAMA_GAME[g] || g}</span>
      <span class="muted">${s.main ? `menang ${s.menang} · main ${s.main}` : "belum dicoba"}</span></div>`).join("");

    const teman = k.teman.length
      ? k.teman.map((t) => `<div class="kamar-baris"><span>${esc(t.name)} <span class="muted small">(${esc(t.jenjang)})</span></span>
          <span class="${t.online ? "on" : "muted"}">${t.online ? "● di arena" : "○ tidak aktif"}</span></div>`).join("")
      : '<p class="muted small">Belum ada teman. Klik avatar pemain lain di arena untuk berteman.</p>';
    const catatan = [
      k.permintaan ? `${k.permintaan} permintaan teman untukmu (buka panel Teman)` : "",
      k.menunggu ? `${k.menunggu} pertemanan menunggu jawaban atau izin orang tua` : "",
    ].filter(Boolean).map((t) => `<div class="kamar-catatan">${t}</div>`).join("");

    const b = k.belajar;
    // Kotak ketiga: medali bila sudah pernah ke Ruang Pintar, selain itu aksesori.
    const kotak3 = b && b.medali.total
      ? `<div class="kamar-kotak"><span class="judul">🏅 Medali</span><span class="besar">${b.medali.punya} / ${b.medali.total}</span>
         <span class="kecil">${b.medali.terbaru ? `Terbaru: ${esc(b.medali.terbaru)}` : "Selesaikan latihan untuk medali pertama"}</span></div>`
      : `<div class="kamar-kotak"><span class="judul">🎀 Aksesori</span><span class="besar">${k.punya} / ${k.totalAksesori}</span><span class="kecil">${k.dipakai} sedang dipakai</span></div>`;

    $("kamar-isi").innerHTML = `
      <div class="kamar-angka">
        <div class="kamar-kotak"><span class="judul">⏰ Waktu main</span>${waktu}</div>
        <div class="kamar-kotak"><span class="judul">⭐ Bintang</span><span class="besar">${k.bintang}</span><span class="kecil">${target}</span></div>
        ${kotak3}
      </div>
      <div class="kamar-dua">
        <div>${b ? this.belajar(b) : `<h3>📚 Belajar</h3>
          <p class="muted">Kemajuan belajarmu muncul di sini setelah kamu berlatih di Ruang Pintar.</p>
          <button data-ke="bimbel" class="primary">Mulai di Ruang Bimbel</button>`}</div>
        <div><h3>🎲 Permainanku</h3>${games}
          <h3 class="kamar-sub">🤝 Teman</h3>${teman}${catatan}</div>
      </div>`;
  }

  // Misi hari ini dan kemajuan per pelajaran (dari Ruang Pintar).
  belajar(b) {
    const ok = '<span class="cek on">✔</span>', belum = '<span class="cek">○</span>';
    const misi = [
      ...b.misi.tryout.map((t) => `<div class="kamar-baris">${t.selesai ? ok : belum}<span>Tryout ${esc(t.nama)}</span>
        <span class="${t.selesai ? "on" : "muted"}">${t.selesai ? (t.bintang !== null ? `${"★".repeat(t.bintang)}${"☆".repeat(Math.max(0, 5 - t.bintang))}` : "selesai") : "belum"}</span></div>`),
      `<div class="kamar-baris">${b.misi.latihanHariIni ? ok : belum}<span>Latihan 1 topik</span>
        <span class="${b.misi.latihanHariIni ? "on" : "muted"}">${b.misi.latihanHariIni ? `${b.misi.latihanHariIni} sesi hari ini` : "belum"}</span></div>`,
    ].join("");
    const mapel = b.mapel.map((m) => {
      const persen = m.total ? Math.round((m.selesai / m.total) * 100) : 0;
      return `<div class="kamar-mapel"><div><span>${esc(m.nama)}</span><span class="muted small">${m.selesai} dari ${m.total} topik</span></div>
        <span class="kamar-bar hijau"><i style="width:${persen}%"></i></span></div>`;
    }).join("");
    const ulangi = b.ulangi ? `<div class="kamar-catatan">💪 Coba ulangi: ${esc(b.ulangi.nama)} (${b.ulangi.best} ★ dari 3)</div>` : "";
    return `<h3>🎯 Misi hari ini</h3>${misi}<h3 class="kamar-sub">📚 Kemajuan belajar</h3>${mapel}${ulangi}`;
  }
}

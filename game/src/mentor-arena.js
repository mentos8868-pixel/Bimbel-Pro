import { api } from "./api.js";

export function siapkanMentor(onClose) {
  const el = id => document.getElementById(id);
  const panel = el("mentor-panel"), input = el("mentor-input");
  const jawaban = el("mentor-jawaban"), pilihan = el("mentor-pilihan");
  const kirim = el("mentor-form").querySelector("button");
  let sesi = 0, riwayat = [];

  function sibuk(ya) {
    kirim.disabled = ya;
    for (const b of pilihan.children) b.disabled = ya;
  }

  async function tanya(teks) {
    if (!teks || kirim.disabled) return;
    const saatMulai = sesi;
    sibuk(true);
    input.value = teks;
    jawaban.textContent = "Mentor sedang berpikir…";
    try {
      const hasil = await api("POST", "mentor/tanya", { pertanyaan: teks, riwayat });
      if (saatMulai !== sesi) return;
      riwayat = [...riwayat, { role: "user", content: teks },
        { role: "assistant", content: hasil.jawaban.slice(0, 1800) }].slice(-6);
      jawaban.textContent = hasil.jawaban;
      if (input.value === teks) input.value = "";
    } catch (err) {
      if (saatMulai === sesi) jawaban.textContent = err.message;
    } finally {
      if (saatMulai === sesi) { sibuk(false); input.focus(); }
    }
  }

  for (const contoh of ["Mengapa langit biru?", "Bagaimana robot melihat?"]) {
    const b = document.createElement("button");
    b.className = "ghost";
    b.textContent = contoh;
    b.onclick = () => tanya(contoh);
    pilihan.append(b);
  }
  el("mentor-form").onsubmit = e => { e.preventDefault(); tanya(input.value.trim()); };
  el("mentor-tutup").onclick = () => { sesi++; riwayat = []; panel.hidden = true; onClose(); };
  panel.onkeydown = e => {
    e.stopPropagation();
    if (e.key === "Escape") el("mentor-tutup").click();
  };
  return () => {
    input.value = "";
    jawaban.textContent = "Aku Elon versi simulasi. Apa yang ingin kamu tanyakan?";
    sibuk(false);
    panel.hidden = false;
    input.focus();
  };
}

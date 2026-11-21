import { api } from "./api.js";
import "./chat-suara.css";

export const tombolSuara = '<button type="button" class="chat-rekam" aria-label="Rekam pesan suara" title="Rekam pesan suara">🎙</button>';
export const panelSuara = '<div class="chat-rekaman" hidden><span role="status"></span><audio controls hidden aria-label="Pratinjau pesan suara"></audio><button type="button" data-kirim-suara hidden>Kirim suara</button><button type="button" data-batal-suara>Batal</button></div>';

export function pemutarSuara(pesan, query) {
  return `<audio class="chat-audio" controls preload="none" aria-label="Pesan suara" src="/api/chat/keluarga/suara/${Number(pesan.id)}?${query}"></audio>`;
}

export function pasangSuara(form, pengirim, selesai, galat) {
  const tombol = form.querySelector(".chat-rekam");
  const panel = form.nextElementSibling;
  const status = panel.querySelector("[role=status]");
  const audio = panel.querySelector("audio");
  const kirim = panel.querySelector("[data-kirim-suara]");
  const batal = panel.querySelector("[data-batal-suara]");
  let stream, recorder, timer, rekaman, preview;
  let sesi = 0;
  const lepaskanMikrofon = () => {
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
  function reset() {
    sesi++;
    if (recorder?.state === "recording") recorder.stop();
    lepaskanMikrofon();
    recorder = null;
    rekaman = null;
    if (preview) URL.revokeObjectURL(preview);
    preview = null;
    audio.removeAttribute("src");
    audio.load();
    panel.hidden = audio.hidden = kirim.hidden = true;
    tombol.disabled = kirim.disabled = batal.disabled = false;
    tombol.setAttribute("aria-label", "Rekam pesan suara");
    tombol.title = "Rekam pesan suara";
    tombol.textContent = "🎙";
  }
  tombol.onclick = async () => {
    if (recorder?.state === "recording") {
      recorder.stop();
      lepaskanMikrofon();
      tombol.disabled = true;
      return;
    }
    galat("");
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]
      .find((type) => window.MediaRecorder?.isTypeSupported(type));
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      galat("Rekaman suara memerlukan browser yang mendukung mikrofon dan koneksi HTTPS atau localhost.");
      return;
    }
    const id = ++sesi;
    tombol.disabled = true;
    panel.hidden = false;
    status.textContent = "Menunggu izin mikrofon…";
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== sesi || !form.isConnected) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;
      recorder = new MediaRecorder(media, { mimeType: mime, audioBitsPerSecond: 32000 });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => {
        if (id !== sesi) return;
        reset();
        galat("Rekaman gagal. Coba rekam lagi.");
      };
      recorder.onstop = () => {
        if (id !== sesi) return;
        lepaskanMikrofon();
        rekaman = new Blob(chunks, { type: mime.split(";")[0] });
        if (!rekaman.size || rekaman.size > 512 * 1024) {
          reset();
          galat("Rekaman kosong atau terlalu besar. Coba rekam lagi.");
          return;
        }
        preview = URL.createObjectURL(rekaman);
        audio.src = preview;
        audio.hidden = kirim.hidden = false;
        status.textContent = "Dengarkan sebelum mengirim.";
      };
      recorder.start();
      timer = setTimeout(() => { if (id === sesi && recorder.state === "recording") tombol.click(); }, 30000);
      tombol.disabled = false;
      tombol.setAttribute("aria-label", "Hentikan rekaman");
      tombol.title = "Hentikan rekaman";
      tombol.textContent = "■";
      status.textContent = "Sedang merekam, maksimal 30 detik.";
    } catch {
      if (id !== sesi) return;
      reset();
      galat("Mikrofon tidak dapat dibuka. Periksa izin mikrofon di browser.");
    }
  };
  batal.onclick = reset;
  kirim.onclick = async () => {
    const id = sesi;
    kirim.disabled = batal.disabled = true;
    galat("");
    try {
      const tipe = rekaman.type;
      const bytes = new Uint8Array(await rekaman.arrayBuffer());
      if (id !== sesi) return;
      const suara = bytes.toBase64 ? bytes.toBase64() : btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
      await api("POST", "chat/keluarga", { ...pengirim, tipe, suara });
      if (id !== sesi) return;
      reset();
      await selesai();
    } catch (e) {
      if (id !== sesi) return;
      galat(e.message);
      kirim.disabled = batal.disabled = false;
    }
  };
  return reset;
}

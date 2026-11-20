// Pengirim email (saat ini hanya untuk tautan lupa kata sandi orang tua).
// - Bila RESEND_API_KEY dan MAIL_FROM diisi, email dikirim lewat layanan Resend (https://resend.com).
// - Bila belum diisi (masa pengembangan), isi email ditulis ke log server supaya tautannya tetap bisa dicoba.
// APP_URL = alamat halaman web untuk tautan di email, misalnya https://bimbelpro.id (bawaan: http://localhost:5173).
// Alamat ini sengaja tidak diambil dari permintaan (header Host), supaya tautan tidak bisa diarahkan ke situs lain.

export const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");

export async function sendMail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.log(`[email belum dipasang] Untuk: ${to}\nJudul: ${subject}\n${text}\n`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!r.ok) throw new Error(`Gagal mengirim email (${r.status})`);
}

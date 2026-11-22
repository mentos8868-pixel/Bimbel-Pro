import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

async function kunciMentor() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  try {
    const isi = await readFile(new URL("./.env", import.meta.url), "utf8");
    return parseEnv(isi).OPENAI_API_KEY?.trim();
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

let aktif = 0;
const arahan = "Kamu mentor AI fiktif bernama Elon versi simulasi di Bimbel Pro, bukan Elon Musk asli. Jawab pertanyaan pengguna secara langsung dalam bahasa Indonesia yang ramah anak. Gunakan contoh konkret dan ringkas. Untuk pertanyaan lanjutan, gunakan konteks percakapan. Jangan meminta data pribadi. Jangan memberi instruksi berbahaya; tawarkan penjelasan aman. Jika tidak tahu, katakan terus terang.";

export async function tanyaMentor(body, ApiError) {
  const { pertanyaan, riwayat = [] } = body ?? {};
  if (typeof pertanyaan !== "string" || !pertanyaan.trim() || pertanyaan.length > 600 ||
      !Array.isArray(riwayat) || riwayat.length > 6 || riwayat.some((m, i) =>
        !m || m.role !== (i % 2 ? "assistant" : "user") || typeof m.content !== "string" || m.content.length > 1800)) {
    throw new ApiError(400, "Pertanyaan atau riwayat percakapan terlalu panjang atau tidak valid.");
  }
  const key = await kunciMentor();
  if (!key) throw new ApiError(503, "Mentor belum terhubung. Minta pengelola memasang kunci API OpenAI di server.");
  if (aktif >= 3) throw new ApiError(429, "Mentor sedang melayani pemain lain. Coba lagi sebentar.");
  aktif++;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini", store: false,
        messages: [{ role: "system", content: arahan }, ...riwayat.map(({ role, content }) => ({ role, content })), { role: "user", content: pertanyaan.trim() }],
        max_completion_tokens: 400,
      }),
    });
    if (!r.ok) throw new Error();
    const jawaban = (await r.json()).choices?.[0]?.message?.content?.trim();
    if (!jawaban) throw new Error();
    return { jawaban };
  } catch {
    throw new ApiError(503, "Mentor belum bisa mendapat jawaban dari OpenAI. Coba lagi sebentar.");
  } finally { aktif--; }
}

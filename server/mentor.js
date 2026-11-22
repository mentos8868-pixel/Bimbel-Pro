// Inferensi lokal. Hanya percakapan di panel mentor yang dikirim ke Ollama.
let aktif = 0;
const arahan = "Kamu mentor AI fiktif bernama Elon versi simulasi di Bimbel Pro, bukan Elon Musk asli. Jawab pertanyaan pengguna secara langsung dalam bahasa Indonesia yang ramah anak. Gunakan contoh konkret dan ringkas. Untuk pertanyaan lanjutan, gunakan konteks percakapan. Jangan meminta data pribadi. Jangan memberi instruksi berbahaya; tawarkan penjelasan aman. Jika tidak tahu, katakan terus terang.";

export async function tanyaMentor(body, ApiError) {
  const { pertanyaan, riwayat = [] } = body ?? {};
  if (typeof pertanyaan !== "string" || !pertanyaan.trim() || pertanyaan.length > 600 ||
      !Array.isArray(riwayat) || riwayat.length > 6 || riwayat.some((m, i) =>
        !m || m.role !== (i % 2 ? "assistant" : "user") || typeof m.content !== "string" || m.content.length > 1800)) {
    throw new ApiError(400, "Pertanyaan atau riwayat percakapan terlalu panjang atau tidak valid.");
  }
  if (aktif >= 3) throw new ApiError(429, "Mentor sedang melayani pemain lain. Coba lagi sebentar.");
  aktif++;
  try {
    const r = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: process.env.BIMBEL_MODEL || "qwen2.5:1.5b", stream: false,
        messages: [{ role: "system", content: arahan }, ...riwayat, { role: "user", content: pertanyaan.trim() }],
        options: { num_predict: 220, num_ctx: 4096 },
      }),
    });
    if (!r.ok) throw new Error();
    const jawaban = (await r.json()).message?.content?.trim();
    if (!jawaban) throw new Error();
    return { jawaban };
  } catch {
    throw new ApiError(503, "AI lokal belum bisa menjawab. Pastikan Ollama dan model mentor tersedia, lalu coba lagi.");
  } finally { aktif--; }
}

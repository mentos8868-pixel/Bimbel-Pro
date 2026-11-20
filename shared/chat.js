// Chat ramah anak: pesan siap pakai (untuk semua) dan teks bebas yang disaring (SMP/SMA bila diizinkan orang tua).
// Dipakai server (penentu akhir) dan browser (umpan balik cepat).

export const PRESETS = [
  "Halo!", "Ayo main!", "Main catur yuk", "Main scramble yuk", "Main Kartu Kilat yuk",
  "Langkah bagus!", "Hebat!", "Selamat ya!", "Coba lagi yuk", "Terima kasih", "Sama-sama",
  "Tunggu sebentar ya", "Aku belajar dulu ya", "Sampai jumpa!",
];

export const MAX_TEXT = 80;

// Kata kasar/tidak pantas (dicocokkan sebagai kata utuh setelah huruf disamarkan dinormalkan).
const BAD_WORDS = [
  "anjing", "anjir", "anjay", "babi", "bangsat", "bajingan", "brengsek", "kampret", "goblok", "goblog", "tolol",
  "bego", "bodoh", "idiot", "dungu", "kontol", "memek", "ngentot", "entot", "jancok", "jancuk", "cok", "asu", "tai",
  "taik", "setan", "keparat", "sialan", "pelacur", "lonte", "bencong", "kafir", "mati", "bunuh",
  "fuck", "fck", "shit", "bitch", "bastard", "stupid", "dumb", "dick", "pussy", "sex", "seks", "porn", "porno",
  "nude", "kill", "hate",
];
const BAD_SET = new Set(BAD_WORDS.map((w) => w.replace(/(.)\1+/g, "$1")));
// Kata yang diblokir walau menjadi bagian kata lain.
const BAD_PARTS = ["ngentot", "kontol", "memek", "fuck", "bangsat", "bajingan", "porno", "jancok"];

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };

function normalizeWords(text) {
  const lower = text.toLowerCase().replace(/[0134578@$!]/g, (c) => LEET[c] || c);
  return lower
    .replace(/[^a-z\s]/g, " ")
    .replace(/(.)\1{2,}/g, "$1$1") // "anjiiiing" -> "anjiing"
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/(.)\1+/g, "$1")); // lalu "anjing"
}

// Mengembalikan { ok: true, text } atau { ok: false, reason }.
export function checkText(raw) {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "Pesan kosong." };
  if (text.length > MAX_TEXT) return { ok: false, reason: `Pesan maksimal ${MAX_TEXT} huruf.` };
  // Lindungi data pribadi: nomor telepon, email, tautan, akun media sosial.
  if (/\d[\d\s\-.]{4,}\d/.test(text)) return { ok: false, reason: "Jangan bagikan nomor telepon atau angka pribadi ya." };
  if (/@|https?:|www\.|\.(com|id|net|org|me|co)\b|wa\.me|t\.me/i.test(text)) {
    return { ok: false, reason: "Jangan bagikan email, tautan, atau akun media sosial ya." };
  }
  if (/\b(ig|instagram|tiktok|whatsapp|wa|telegram|line|discord|snapchat|facebook|fb|alamat|rumahku)\b/i.test(text)) {
    return { ok: false, reason: "Demi keamanan, jangan bagikan akun media sosial atau alamat ya." };
  }
  const words = normalizeWords(text);
  const joined = words.join("");
  if (words.some((w) => BAD_SET.has(w)) || BAD_PARTS.some((p) => joined.includes(p))) {
    return { ok: false, reason: "Pesan berisi kata yang tidak sopan." };
  }
  return { ok: true, text };
}

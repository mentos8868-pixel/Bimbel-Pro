// Membuat akun contoh untuk mencoba arena di komputer sendiri (server harus sudah jalan: npm run dev).
// Jalankan: npm run seed:contoh   (aman dijalankan berulang; akun yang sudah ada tidak dibuat ulang)
// Hanya untuk pengembangan lokal. Jangan dipakai di server sungguhan.

const API = process.env.API_URL || "http://localhost:2567/api";

export const ORTU = { name: "Ortu Contoh", email: "ortu@contoh.test", password: "contoh1234" };
export const ANAK = [
  { name: "Budi", kelas: 4, pin: "1111", avatar: "beruang-putra", color: "#4f9cf0", limitMin: 0, allowStrangers: true, chat: "siap" },
  { name: "Sari", kelas: 8, pin: "2222", avatar: "kelinci-putri", color: "#ec7fb5", limitMin: 0, allowStrangers: true, chat: "siap" },
];

let cookie = "";
async function api(method, path, body) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-bimbel": "1", ...(cookie && { cookie }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() || [];
  for (const c of set) if (c.startsWith("bp_ortu=")) cookie = c.split(";")[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  let r = await api("POST", "daftar", { ...ORTU, consent: true });
  if (r.status === 409) r = await api("POST", "masuk", ORTU);
  if (r.status !== 200) throw new Error(`Akun orang tua gagal: ${r.data.error || r.status}`);
  console.log(`Orang tua: ${ORTU.email}`);

  const me = await api("GET", "saya");
  const ada = new Set((me.data.children || []).map((c) => c.name));
  for (const a of ANAK) {
    if (ada.has(a.name)) { console.log(`Anak ${a.name}: sudah ada`); continue; }
    const c = await api("POST", "anak", a);
    if (c.status !== 200) throw new Error(`Anak ${a.name} gagal: ${c.data.error || c.status}`);
    console.log(`Anak ${a.name}: dibuat (kelas ${a.kelas})`);
  }
  console.log("Selesai. Masuk di http://localhost:5173 → \"Saya orang tua\", lalu pilih anak dan masukkan PIN-nya (lihat server/seed-contoh.js).");
}

main().catch((e) => {
  console.error(e.cause?.code === "ECONNREFUSED" ? "Server belum jalan. Jalankan dulu: npm run dev" : e.message);
  process.exit(1);
});

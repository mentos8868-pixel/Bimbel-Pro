// Pemanggil API akun. Sesi disimpan di cookie HttpOnly oleh server (tidak bisa dibaca skrip).
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(method, path, body) {
  let r;
  try {
    r = await fetch(`/api/${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Bimbel": "1" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Server belum tersambung. Coba lagi sebentar lagi.");
  }
  let data = {};
  try { data = await r.json(); } catch { /* kosong */ }
  if (!r.ok) throw new ApiError(r.status, data.error || "Terjadi kesalahan.");
  return data;
}

// Kirim hasil permainan (hanya dicatat untuk akun anak). Gagal kirim tidak mengganggu permainan.
export function reportResult(game, mode, outcome, score = 0) {
  api("POST", "hasil", { game, mode, outcome, score }).catch(() => {});
}

export function pantauAktivitas(sebagai, dashboard) {
  function kirim() {
    if (document.visibilityState === "visible" && !dashboard.hidden) {
      api("POST", "aktivitas", { sebagai }).catch(() => {});
    }
  }
  document.addEventListener("visibilitychange", kirim);
  setInterval(kirim, 45_000);
  return kirim;
}

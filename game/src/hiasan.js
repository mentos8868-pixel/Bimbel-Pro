// Penempatan hiasan arena (rumput, bunga, batu, awan). Murni tanpa Babylon supaya bisa diuji di Node.

const JUMLAH = {
  rendah: { rumput: 60, bunga: 20, batu: 8, awan: 3 },
  sedang: { rumput: 180, bunga: 60, batu: 16, awan: 6 },
  tinggi: { rumput: 260, bunga: 90, batu: 20, awan: 8 },
};
export function jumlahHiasan(kualitas) {
  return { ...(JUMLAH[kualitas] || JUMLAH.sedang) };
}

// Pembangkit acak ber-benih (mulberry32): susunan hiasan sama di setiap perangkat.
function acak(benih) {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const JARAK_AMAN = 0.3;   // kotak larangan diperlebar sedikit supaya hiasan tidak menempel di dinding/jalan

export function tebarHiasan({ jumlah, radius, larangan = [], lingkaranLarangan = [], benih = 1 }) {
  const r = acak(benih);
  const hasil = [];
  const kena = (x, z) =>
    larangan.some((b) => x > b.minX - JARAK_AMAN && x < b.maxX + JARAK_AMAN && z > b.minZ - JARAK_AMAN && z < b.maxZ + JARAK_AMAN)
    || lingkaranLarangan.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);
  for (let coba = 0; hasil.length < jumlah && coba < jumlah * 20; coba++) {
    // Akar kuadrat supaya tersebar merata di seluruh lingkaran, tidak menumpuk di tengah.
    const jarak = Math.sqrt(r()) * radius;
    const sudut = r() * Math.PI * 2;
    const x = Math.cos(sudut) * jarak, z = Math.sin(sudut) * jarak;
    const putar = r() * Math.PI * 2, skala = 0.75 + r() * 0.5;
    if (!kena(x, z)) hasil.push({ x, z, putar, skala });
  }
  return hasil;
}

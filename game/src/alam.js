// Alam arena dari model jadi (Kenney Nature Kit, CC0; lihat game/public/model/alam/LISENSI.txt).
// Tiap model dimuat sekali lalu digandakan dengan instance (hemat untuk HP).
// Pohon versi kode (pohonCadangan di arena.js) tampil lebih dulu dan baru dibuang setelah semua model berhasil dimuat,
// jadi arena tidak pernah kosong walau berkas model gagal diambil.
import { Color3, LoadAssetContainerAsync, StandardMaterial, TransformNode } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

const FOLDER = "/model/alam/";
export const MODEL_ALAM = {
  pohon: ["pohon-1", "pohon-2", "pohon-3"],
  semak: ["semak"],
  bunga: ["bunga-1", "bunga-2"],
  batu: ["batu"],
  rumput: ["rumput"],
};
// Tinggi sasaran di arena (meter) sebelum dikali skala tiap benda.
const TINGGI = { pohon: 3.6, semak: 0.8, bunga: 0.45, batu: 0.35, rumput: 0.3 };

// Bahan model Kenney bertipe PBR dengan metallic = 1; tanpa peta lingkungan hasilnya abu-abu kusam.
// Diganti StandardMaterial berwarna sama, seperti benda lain di arena (lihat mat() di arena.js).
const bahanStandar = new Map();   // scene.uid + warna → StandardMaterial
function samakanBahan(scene, c) {
  for (const m of c.meshes) {
    const asal = m.material;
    if (!asal || asal.getClassName() !== "PBRMaterial") continue;
    let warna = asal.albedoColor.toGammaSpace();
    // Daun Kenney berwarna hijau toska; digeser ke hijau daun supaya cocok dengan palet hangat arena.
    const hsv = warna.toHSV();
    if (hsv.r > 140 && hsv.r < 200) warna = Color3.FromHSV(hsv.r - 50, hsv.g * 0.85, hsv.b * 0.85);
    const kunci = scene.uid + warna.toHexString();
    if (!bahanStandar.has(kunci)) {
      const s = new StandardMaterial(`alam-${warna.toHexString()}`, scene);
      s.diffuseColor = warna;
      s.specularColor = new Color3(0.06, 0.06, 0.06);
      bahanStandar.set(kunci, s);
    }
    m.material = bahanStandar.get(kunci);
  }
  for (const asal of c.materials.splice(0)) asal.dispose();
}

const wadah = new Map();   // scene.uid + nama → Promise<{ wadah, tinggi }>
function muat(scene, nama) {
  const kunci = scene.uid + nama;
  if (!wadah.has(kunci)) {
    wadah.set(kunci, LoadAssetContainerAsync(`${FOLDER}${nama}.glb`, scene).then((c) => {
      samakanBahan(scene, c);
      // Ukur tinggi asli sekali dari salinan sementara.
      const coba = c.instantiateModelsToScene((n) => n, false);
      const akar = coba.rootNodes[0];
      const { min, max } = akar.getHierarchyBoundingVectors(true);
      coba.dispose();
      return { wadah: c, tinggi: Math.max(0.01, max.y - min.y) };
    }).catch((e) => { wadah.delete(kunci); throw e; }));
  }
  return wadah.get(kunci);
}

// Muat semua model satu jenis; gagal bila salah satu gagal.
export function muatJenis(scene, jenis) {
  return Promise.all(MODEL_ALAM[jenis].map((nama) => muat(scene, nama)));
}

// Satu salinan model di (x, z). `i` memilih varian; putaran dan skala dari pemanggil.
export function tanam(scene, model, jenis, { x, z, putar = 0, skala = 1, i = 0 }, induk) {
  const { wadah: c, tinggi } = model[i % model.length];
  const hasil = c.instantiateModelsToScene((n) => `${jenis}-${n}`, false);
  const akar = new TransformNode(jenis, scene);
  for (const r of hasil.rootNodes) r.parent = akar;
  const s = (TINGGI[jenis] / tinggi) * skala;
  akar.scaling.setAll(s);
  akar.position.set(x, 0, z);
  akar.rotation.y = putar;
  if (induk) akar.parent = induk;
  return akar;
}

// pohon: [{ x, z, s, mesh }] — mesh = pohon cadangan yang dibuang setelah model berhasil dimuat.
export async function tanamAlam(scene, { pohon }) {
  const induk = new TransformNode("alam", scene);
  try {
    const model = await muatJenis(scene, "pohon");
    const akarPohon = pohon.map((p, i) => {
      // Putaran tetap dari posisi, supaya susunan sama di setiap perangkat.
      const putar = (Math.sin(p.x * 3.1 + p.z * 7.7) + 1) * Math.PI;
      const a = tanam(scene, model, "pohon", { x: p.x, z: p.z, putar, skala: p.s, i }, induk);
      a.metadata = { fase: p.x * 0.7 + p.z * 1.3 };
      return a;
    });
    for (const p of pohon) p.mesh?.dispose(false, true);
    return { jenis: "model", akar: induk, pohon: akarPohon };
  } catch (e) {
    console.warn("Model alam gagal dimuat, memakai pohon versi kode:", e?.message || e);
    induk.dispose();
    return { jenis: "cadangan", akar: null, pohon: pohon.map((p) => p.mesh).filter(Boolean) };
  }
}

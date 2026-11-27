// Alam arena dari model jadi (Kenney Nature Kit, CC0; lihat game/public/model/alam/LISENSI.txt).
// Tiap model dimuat sekali lalu digandakan dengan instance (hemat untuk HP).
// Pohon versi kode (pohonCadangan di arena.js) tampil lebih dulu dan baru dibuang setelah semua model berhasil dimuat,
// jadi arena tidak pernah kosong walau berkas model gagal diambil.
import { Color3, LoadAssetContainerAsync, MeshBuilder, StandardMaterial, TransformNode } from "@babylonjs/core";
import { jumlahHiasan, tebarHiasan } from "./hiasan.js";
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

// ---------- hiasan, goyangan pohon, dan awan (mengikuti tingkat kualitas grafis) ----------

const JENIS_HIASAN = [["rumput", 11], ["bunga", 23], ["batu", 37]];   // [jenis, benih]
const WARNA_CADANGAN = { rumput: "#6fae4f", bunga: "#e8618d", batu: "#a39a8c" };

// Hiasan kecil cadangan (bila model gagal dimuat): bola pipih berwarna.
function hiasanCadangan(scene, jenis, p, induk) {
  const m = MeshBuilder.CreateSphere(jenis, { diameter: jenis === "batu" ? 0.35 : 0.22, segments: 6 }, scene);
  m.scaling.y = 0.6;
  m.position.set(p.x, 0.06, p.z);
  if (!bahanStandar.has(scene.uid + jenis)) {
    const b = new StandardMaterial(`hiasan-${jenis}`, scene);
    b.diffuseColor = Color3.FromHexString(WARNA_CADANGAN[jenis]);
    b.specularColor = new Color3(0.05, 0.05, 0.05);
    bahanStandar.set(scene.uid + jenis, b);
  }
  m.material = bahanStandar.get(scene.uid + jenis);
  m.parent = induk;
  return m;
}

function buatAwan(scene, jumlah, induk) {
  const bahan = new StandardMaterial("awan", scene);
  bahan.disableLighting = true;
  bahan.emissiveColor = new Color3(0.97, 0.97, 0.97);
  const awan = [];
  for (let i = 0; i < jumlah; i++) {
    const a = new TransformNode("awan", scene);
    a.parent = induk;
    a.position.set(-45 + (i * 90) / jumlah, 18 + (i % 3) * 3, -30 + ((i * 37) % 60));
    for (let j = 0; j < 4; j++) {
      const b = MeshBuilder.CreateSphere("awan", { diameter: 3 + (j % 2) * 1.5, segments: 10 }, scene);
      b.material = bahan;
      b.position.set(j * 1.7 - 2.5, (j % 2) * 0.6, (j % 3) * 0.5);
      b.scaling.y = 0.7;
      b.parent = a;
    }
    awan.push(a);
  }
  return { awan, bahan };
}

// larangan: kotak {minX,maxX,minZ,maxZ} tempat hiasan tidak boleh muncul (dinding, lantai ruangan, jalan, pintu, meja).
// pohon: akar pohon yang boleh bergoyang (dari tanamAlam).
export function pasangHiasan(scene, { larangan, lingkaranLarangan, radius, grafis, pohon = [] }) {
  let induk = null, awan = [], bahanAwan = null, goyang = false, giliran = 0;

  async function bangun(k) {
    const ini = ++giliran;
    induk?.dispose(false, false);
    bahanAwan?.dispose();
    const akar = new TransformNode("hiasan", scene);
    induk = akar;
    const jumlah = jumlahHiasan(k);
    for (const [jenis, benih] of JENIS_HIASAN) {
      const titik = tebarHiasan({ jumlah: jumlah[jenis], radius, larangan, lingkaranLarangan, benih });
      let model = null;
      try { model = await muatJenis(scene, jenis); } catch { /* pakai cadangan */ }
      // Kualitas diganti lagi saat model sedang dimuat: hasil lama dibuang, tidak menumpuk.
      if (ini !== giliran) return;
      titik.forEach((p, i) => {
        const n = model ? tanam(scene, model, jenis, { ...p, i }, akar) : hiasanCadangan(scene, jenis, p, akar);
        n.computeWorldMatrix(true);
        for (const m of [n, ...n.getChildMeshes(false)]) {
          m.metadata = { ...(m.metadata || {}), tanpaBayangan: true };
          if (m.getClassName() !== "TransformNode") { m.isPickable = false; m.freezeWorldMatrix(); }
        }
      });
    }
    const hasil = buatAwan(scene, jumlah.awan, akar);
    awan = hasil.awan;
    bahanAwan = hasil.bahan;
    goyang = k !== "rendah";
    if (!goyang) for (const p of pohon) p.rotation.z = 0;
  }

  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;
    for (const a of awan) {
      a.position.x += 0.4 * dt;
      if (a.position.x > 45) a.position.x = -45;
    }
    if (!goyang) return;
    for (const p of pohon) {
      const fase = p.metadata?.fase ?? (p.position.x * 0.7 + p.position.z * 1.3);
      p.rotation.z = Math.sin(t * 1.2 + fase) * 0.03;
    }
  });

  grafis.onKualitas((k) => { bangun(k); });
}

// Model 3D sungguhan (.glb) untuk karakter avatar. Uji coba pertama: karakter "Robo" memakai
// RobotExpressive (CC0, Tomás Laulhé/Quaternius; lihat game/public/model/robot/LISENSI.txt).
// Model dimuat sekali per adegan lalu digandakan per avatar. Selama memuat (atau bila gagal),
// avatar bentuk sederhana dari avatar3d.js tetap tampil sebagai cadangan.
import { LoadAssetContainerAsync } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

export const MODEL = {
  robo: {
    url: "/model/robot/RobotExpressive.glb",
    tinggiAsli: 4.6, tinggi: 1.75,   // tinggi model asli → tinggi di arena (sebelum ukuran anggota keluarga)
    diam: "Idle", jalan: "Walking", duduk: "Sitting",   // nama animasi di file
    kepala: "Head",   // tulang kepala, tempat aksesori ditempel
    // Ukuran kepala relatif terhadap tulang kepala (diukur dari model): untuk posisi topi, kacamata, syal.
    h: { y: 0.25, r: 0.42, z: 0, front: 0.58, neck: -0.08, eye: { y: 0.3, z: 0.52, gap: 0.2 } },
  },
};

const wadah = new Map();   // scene.uid + jenis → Promise<AssetContainer>
export function muatWadah(scene, jenis) {
  const kunci = scene.uid + jenis;
  if (!wadah.has(kunci)) {
    wadah.set(kunci, LoadAssetContainerAsync(MODEL[jenis].url, scene).catch((e) => {
      console.warn("Model 3D gagal dimuat, memakai avatar sederhana:", e?.message || e);
      wadah.delete(kunci);
      return null;
    }));
  }
  return wadah.get(kunci);
}

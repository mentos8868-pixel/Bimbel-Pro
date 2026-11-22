// Tampilan arena yang lebih hangat dan lembut (gaya ilustrasi 3D seperti mainan), tetap real-time di browser.
// Tiga tingkat kualitas (disimpan per perangkat):
//   rendah : warna ala film (tone mapping) saja — paling ringan
//   sedang : + bayangan lembut matahari, anti-gerigi (FXAA), cahaya pendar halus, vinyet tipis
//   tinggi : + bayangan lebih tajam, ambient occlusion (sudut dan celah sedikit gelap), anti-gerigi MSAA
import {
  ShadowGenerator, DefaultRenderingPipeline, SSAO2RenderingPipeline, ImageProcessingConfiguration, Color3, Color4, Vector3, Scene,
} from "@babylonjs/core";

const KUNCI = "arena_kualitas";
export const KUALITAS = ["rendah", "sedang", "tinggi"];
export const NAMA_KUALITAS = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" };

function kualitasAwal(engine) {
  try { const k = localStorage.getItem(KUNCI); if (KUALITAS.includes(k)) return k; } catch { /* abaikan */ }
  // Perkiraan awal: WebGL2 dan prosesor cukup → tinggi; selain itu sedang.
  return engine.webGLVersion >= 2 && (navigator.hardwareConcurrency || 4) >= 8 ? "tinggi" : "sedang";
}

// Mesh yang tidak ikut membuat bayangan: papan tulisan, gelembung chat, aura, dan bayangan bulat avatar.
const tanpaBayangan = (m) => {
  const mt = m.material;
  // Model beranimasi (bertulang) cukup memakai bayangan bulat di kaki: menggambar ulang tulangnya ke peta bayangan tiap frame terlalu berat.
  return !mt || m.skeleton || mt.disableLighting || mt.alpha < 1 || mt.useAlphaFromDiffuseTexture || m.name === "sign" || m.name === "bayang" || m.name === "aura";
};

export function pasangGrafis({ scene, camera, sun, hemi }) {
  const engine = scene.getEngine();

  // ---------- warna dan cahaya hangat (semua tingkat) ----------
  scene.clearColor = Color4.FromHexString("#d6ecf2ff");
  scene.ambientColor = new Color3(0.25, 0.23, 0.2);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.006;
  scene.fogColor = Color3.FromHexString("#e4efe9");
  hemi.diffuse = Color3.FromHexString("#fff4e4");
  hemi.groundColor = Color3.FromHexString("#b4a98f");
  hemi.specular = new Color3(0.1, 0.1, 0.1);
  hemi.intensity = 0.6;
  sun.direction = new Vector3(-0.55, -1, 0.45).normalize();
  sun.position = sun.direction.scale(-60);
  sun.diffuse = Color3.FromHexString("#fff0dc");
  sun.intensity = 0.8;

  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 0.95;
  ip.contrast = 1.08;

  let bayangan = null, pipeline = null, ssao = null, kualitas = null;
  const daftarkan = (m) => {
    m.receiveShadows = true;
    if (bayangan && !tanpaBayangan(m)) bayangan.addShadowCaster(m, false);
  };
  // Mesh baru (avatar pemain yang datang, gelembung chat, dst.) ikut menerima dan membuat bayangan.
  // Bahan bisa dipasang sesudah mesh dibuat, jadi diperiksa pada frame berikutnya.
  scene.onNewMeshAddedObservable.add((m) => scene.onAfterRenderObservable.addOnce(() => { if (!m.isDisposed()) daftarkan(m); }));

  function lepas() {
    bayangan?.dispose(); bayangan = null;
    pipeline?.dispose(); pipeline = null;
    if (ssao) { scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(ssao.name, camera); ssao.dispose(); ssao = null; }
  }

  function setKualitas(k) {
    if (!KUALITAS.includes(k) || k === kualitas) return kualitas;
    kualitas = k;
    try { localStorage.setItem(KUNCI, k); } catch { /* abaikan */ }
    lepas();
    if (k === "rendah") return k;

    // Bayangan lembut dari matahari.
    sun.autoUpdateExtends = true;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 140;
    bayangan = new ShadowGenerator(k === "tinggi" ? 2048 : 1024, sun);
    if (engine.webGLVersion >= 2) {
      bayangan.usePercentageCloserFiltering = true;
      bayangan.filteringQuality = k === "tinggi" ? ShadowGenerator.QUALITY_HIGH : ShadowGenerator.QUALITY_MEDIUM;
    } else {
      bayangan.useBlurExponentialShadowMap = true;
      bayangan.blurKernel = 16;
    }
    bayangan.bias = 0.0008;
    bayangan.normalBias = 0.02;
    bayangan.darkness = 0.35;   // bayangan lembut, tidak hitam pekat
    for (const m of scene.meshes) daftarkan(m);

    // Efek ala film: anti-gerigi, cahaya pendar halus, vinyet tipis.
    pipeline = new DefaultRenderingPipeline("halus", true, scene, [camera]);
    pipeline.samples = k === "tinggi" && engine.webGLVersion >= 2 ? 4 : 1;
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.95;
    pipeline.bloomWeight = 0.1;
    pipeline.bloomKernel = 48;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipeline.imageProcessing.exposure = 0.95;
    pipeline.imageProcessing.contrast = 1.08;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 1.1;
    pipeline.imageProcessing.vignetteColor = new Color4(0.25, 0.2, 0.15, 0);

    // Ambient occlusion: sudut, celah, dan bagian bawah benda sedikit lebih gelap (hanya tinggi, butuh WebGL2).
    if (k === "tinggi" && engine.webGLVersion >= 2 && SSAO2RenderingPipeline.IsSupported) {
      ssao = new SSAO2RenderingPipeline("ao", scene, { ssaoRatio: 0.5, blurRatio: 0.5 }, [camera]);
      ssao.radius = 1.6;
      ssao.totalStrength = 0.9;
      ssao.base = 0.15;
      ssao.samples = 16;
      ssao.maxZ = 60;
    }
    return k;
  }

  setKualitas(kualitasAwal(engine));
  return { setKualitas, get kualitas() { return kualitas; } };
}

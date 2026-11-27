// Alat pengembang (hanya lewat Vite dev): tampilkan arena tanpa masuk akun, untuk tangkapan layar
// dan untuk memastikan batas tabrakan sama dengan snapshot.
// Pakai di konsol: const { lihatArena } = await import('/test/lihat-arena.js'); await lihatArena(...)
export async function lihatArena({ alpha = -Math.PI / 2 - 0.5, beta = 1, radius = 34, x = 0, z = 4, kualitas } = {}) {
  document.getElementById("__cv")?.remove();
  window.__a?.engine.dispose();
  const awal = await fetch("/test/walls-awal.json").then((r) => r.text());
  const m = await import(`/src/arena.js?t=${Date.now()}`);
  const c = document.createElement("canvas");
  c.id = "__cv";
  Object.assign(c.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", zIndex: 99999 });
  document.body.append(c);
  const a = m.createArena(c);
  window.__a = a;
  if (kualitas) a.grafis.setKualitas(kualitas);
  Object.assign(a.camera, { upperRadiusLimit: 80, alpha, beta, radius });
  a.camera.target.set(x, 1, z);
  a.engine.runRenderLoop(() => a.scene.render());
  a.engine.resize();
  const alam = await a.alam;
  await new Promise((r) => setTimeout(r, 2500));
  return { wallsSama: JSON.stringify(a.walls) === awal.trim(), mesh: a.scene.meshes.length, alam: alam?.jenis };
}

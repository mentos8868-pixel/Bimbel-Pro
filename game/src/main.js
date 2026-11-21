import { Vector3, Scalar, PointerEventTypes } from "@babylonjs/core";
import { createArena, createAvatar, disposeAvatar, moveWithCollision, showBubble } from "./arena.js";
import { SocialUI } from "./social-ui.js";
import {
  joinArena, findChessMatch, createChessTable, joinChessTable,
  findScrambleMatch, createScrambleTable, joinScrambleTable,
  findKartuMatch, createKartuTable, joinKartuTable,
  setPlayingAs, canGoOnline,
} from "./net.js";
import { setupLogin } from "./login.js";
import { KartuUI } from "./kartu-ui.js";
import { ChessUI } from "./chess-ui.js";
import { ScrambleUI } from "./scramble-ui.js";
import { TokoUI } from "./toko-ui.js";

const $ = (id) => document.getElementById(id);
const SPEED = 5.5; // meter per detik


// ---------------- Pesan singkat ----------------
let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2500);
}

// ---------------- Joystick layar sentuh ----------------
const joy = { x: 0, y: 0 };
function setupJoystick() {
  const isTouch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  const base = $("joystick");
  const knob = $("joystick-knob");
  base.hidden = false;
  $("hud-hint").textContent = "Geser lingkaran untuk berjalan";
  let id = null;
  const R = 45;
  const update = (e) => {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R;
    joy.y = -dy / R;
  };
  base.addEventListener("pointerdown", (e) => { id = e.pointerId; base.setPointerCapture(id); update(e); });
  base.addEventListener("pointermove", (e) => { if (e.pointerId === id) update(e); });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; joy.x = 0; joy.y = 0; knob.style.transform = "";
  };
  base.addEventListener("pointerup", end);
  base.addEventListener("pointercancel", end);
}

// ---------------- Permainan utama ----------------
// Pesan galat yang ramah anak saat gagal bergabung ke meja online.
function onlineError(e, mode) {
  if (!canGoOnline()) return "Main online butuh akun. Minta orang tua membuatkan akun, lalu masuk dengan kode masuk.";
  if (e && (e.code === 4401 || e.code === 4403 || e.status)) return e.message;
  return mode === "gabung" ? "Meja tidak ditemukan, sudah penuh, atau sudah mulai." : "Server belum tersambung. Coba lawan bot dulu.";
}

function timeUp(text) {
  document.querySelectorAll(".overlay").forEach((o) => (o.hidden = true));
  $("time-up-text").textContent = text;
  $("time-up").hidden = false;
}

async function start(profile, playingAs) {
  setPlayingAs(playingAs);
  const { engine, scene, camera, walls, tables } = createArena($("arena"));
  const me = createAvatar(scene, profile);
  me.root.position.set(0, 0, -3);
  // Membuat ulang figur avatar (mis. setelah membeli aksesori) di posisi dan arah yang sama.
  function gantiAvatar(lama, opsi) {
    const baru = createAvatar(scene, opsi);
    baru.root.position.copyFrom(lama.root.position);
    baru.root.rotation.copyFrom(lama.root.rotation);
    disposeAvatar(lama);   // material bersama tidak ikut dibuang
    return baru;
  }

  $("hud").hidden = false;
  setupJoystick();

  // Keyboard
  const keys = new Set();
  let uiOpen = false;
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === "e" && !uiOpen && nearTable) useTable(nearTable);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  // ---------- Multiplayer arena ----------
  let room = null;
  const others = new Map();
  try {
    if (!playingAs) throw new Error("tamu");
    room = await joinArena();
    room.onMessage("waktu-hampir", (m) => toast(`Waktu bermain tinggal ${m} menit lagi.`));
    room.onMessage("waktu-habis", (m) => timeUp(m));
    $("hud-status").textContent = "Online";
    room.state.players.onAdd((p, id) => {
      if (id === room.sessionId) {
        me.root.position.set(p.x, 0, p.z);
        // Aksesori atau aura sendiri berubah di server (mis. naik level di Ruang Pintar): perbarui figur.
        const cocokkan = () => {
          if ((p.aksesori || "") === (profile.aksesori || "") && (p.aura || "") === (profile.aura || "")) return;
          profile.aksesori = p.aksesori || "";
          profile.aura = p.aura || "";
          Object.assign(me, gantiAvatar(me, profile));
        };
        p.listen("aksesori", cocokkan);
        p.listen("aura", cocokkan);
        return;
      }
      const opsi = () => ({ name: p.name, jenjang: p.jenjang, negara: p.negara, kelas: p.kelas, kurikulum: p.kurikulum, color: p.color, avatar: p.avatar, aksesori: p.aksesori, aura: p.aura, sid: id });
      const o = { av: createAvatar(scene, opsi()), p };
      o.av.root.position.set(p.x, 0, p.z);
      others.set(id, o);
      // Pemain lain mengganti aksesori di Toko atau naik ke aura baru: buat ulang avatarnya.
      const ganti = () => { if (others.get(id) === o) o.av = gantiAvatar(o.av, opsi()); };
      p.listen("aksesori", (v, lama) => { if (lama !== undefined) ganti(); });
      p.listen("aura", (v, lama) => { if (lama !== undefined) ganti(); });
    });
    room.state.players.onRemove((_, id) => {
      const o = others.get(id);
      if (o) { disposeAvatar(o.av); others.delete(id); }
    });
    if (playingAs === "anak") {
      let terakhir = 0;
      const segarkan = () => {
        if (!room || Date.now() - terakhir < 1500) return;
        terakhir = Date.now();
        room.send("segarkan-avatar");
      };
      // Kembali dari tab Ruang Pintar: ambil aura terbaru dari server.
      window.addEventListener("focus", segarkan);
    }
    room.onLeave((code) => {
      room = null;
      $("hud-status").textContent = "Offline";
      if (code !== 4000) toast("Koneksi ke server terputus.");
    });
  } catch (e) {
    if (e?.code === 4403) return timeUp(e.message);
    $("hud-status").textContent = playingAs ? "Offline (lawan bot tetap bisa)" : "Mode tamu: lawan bot saja";
  }
  const updateCount = () => {
    if (room) $("hud-status").textContent = `Online · ${others.size + 1} pemain di arena`;
  };
  setInterval(updateCount, 1000);

  // ---------- Catur ----------
  const chessUI = new ChessUI({ onClose: () => (uiOpen = false) });
  const menu = $("chess-menu");
  const menuError = (t) => {
    $("chess-menu-error").textContent = t;
    $("chess-menu-error").hidden = !t;
  };
  $("join-code").addEventListener("input", () => menuError(""));
  menu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.level) {
      menu.hidden = true;
      chessUI.startBot(profile, Number(btn.dataset.level));
      return;
    }
    const mode = btn.dataset.mode;
    if (mode === "tutup") { menu.hidden = true; uiOpen = false; return; }
    if (mode === "bot") { $("bot-levels").hidden = false; return; }
    menuError("");
    try {
      let r;
      if (mode === "cari") r = await findChessMatch(profile);
      else if (mode === "buat") r = await createChessTable(profile);
      else if (mode === "gabung") {
        const code = $("join-code").value.trim();
        if (code.length !== 4) return menuError("Masukkan 4 huruf kode meja.");
        r = await joinChessTable(code, profile);
      }
      if (r) { menu.hidden = true; chessUI.startOnline(profile, r); }
    } catch (err) {
      menuError(onlineError(err, mode));
    }
  });

  // ---------- Scramble ----------
  const scrambleUI = new ScrambleUI({ onClose: () => (uiOpen = false) });
  const sMenu = $("scramble-menu");
  let scrLang = "ID";
  const sError = (t) => {
    $("scr-menu-error").textContent = t;
    $("scr-menu-error").hidden = !t;
  };
  $("scr-join-code").addEventListener("input", () => sError(""));
  sMenu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.lang) {
      scrLang = btn.dataset.lang;
      $("scr-lang").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      return;
    }
    if (btn.dataset.level) {
      sMenu.hidden = true;
      scrambleUI.startBot(profile, scrLang, Number(btn.dataset.level));
      return;
    }
    const mode = btn.dataset.mode;
    if (mode === "tutup") { sMenu.hidden = true; uiOpen = false; return; }
    if (mode === "bot") { $("scr-bot-levels").hidden = false; return; }
    sError("");
    try {
      let r;
      if (mode === "cari") r = await findScrambleMatch(profile, scrLang);
      else if (mode === "buat") r = await createScrambleTable(profile, scrLang);
      else if (mode === "gabung") {
        const code = $("scr-join-code").value.trim();
        if (code.length !== 4) return sError("Masukkan 4 huruf kode meja.");
        r = await joinScrambleTable(code, profile);
      }
      if (r) { sMenu.hidden = true; scrambleUI.startOnline(profile, r); }
    } catch (err) {
      sError(onlineError(err, mode));
    }
  });

  // ---------- Kartu Kilat ----------
  const kartuUI = new KartuUI({ onClose: () => (uiOpen = false) });
  const kMenu = $("kartu-menu");
  let kMode = "hitung";
  let kBots = 2;
  const kError = (t) => {
    $("ktr-menu-error").textContent = t;
    $("ktr-menu-error").hidden = !t;
  };
  $("ktr-join-code").addEventListener("input", () => kError(""));
  kMenu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const toggle = (group, b) => $(group).querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    if (btn.dataset.kmode) { kMode = btn.dataset.kmode; toggle("ktr-mode", btn); return; }
    if (btn.dataset.bots) { kBots = Number(btn.dataset.bots); toggle("ktr-bots", btn); return; }
    if (btn.dataset.level) {
      kMenu.hidden = true;
      kartuUI.startBot(profile, kMode, Number(btn.dataset.level), kBots);
      return;
    }
    const mode = btn.dataset.mode;
    if (mode === "tutup") { kMenu.hidden = true; uiOpen = false; return; }
    if (mode === "bot") { $("ktr-bot-opts").hidden = false; return; }
    kError("");
    try {
      let r;
      if (mode === "cari") r = await findKartuMatch(profile, kMode);
      else if (mode === "buat") r = await createKartuTable(profile, kMode);
      else if (mode === "gabung") {
        const code = $("ktr-join-code").value.trim();
        if (code.length !== 4) return kError("Masukkan 4 huruf kode meja.");
        r = await joinKartuTable(code, profile);
      }
      if (r) { kMenu.hidden = true; kartuUI.startOnline(profile, r); }
    } catch (err) {
      kError(onlineError(err, mode));
    }
  });

  // ---------- Chat & teman ----------
  // Meja online yang sedang menunggu pemain (untuk mengundang teman).
  const currentTable = () => {
    if (chessUI.mode === "online" && chessUI.room && chessUI.serverStatus === "menunggu") return { game: "catur", code: chessUI.room.roomId };
    if (scrambleUI.mode === "online" && scrambleUI.room && scrambleUI.view?.status === "menunggu") return { game: "scramble", code: scrambleUI.room.roomId };
    if (kartuUI.kind === "online" && kartuUI.room && kartuUI.view?.status === "menunggu") return { game: "kartu", code: kartuUI.room.roomId };
    return null;
  };
  // Menerima undangan teman: tutup meja/menu yang terbuka, lalu gabung ke meja dengan kodenya.
  async function joinInvite(game, code) {
    for (const ui of [chessUI, scrambleUI, kartuUI]) if (!ui.el.hidden) ui.close();
    for (const id of ["chess-menu", "scramble-menu", "kartu-menu", "toko-panel", "teman-panel", "profil"]) $(id).hidden = true;
    uiOpen = true;
    keys.clear();
    try {
      if (game === "catur") chessUI.startOnline(profile, await joinChessTable(code));
      else if (game === "scramble") scrambleUI.startOnline(profile, await joinScrambleTable(code));
      else kartuUI.startOnline(profile, await joinKartuTable(code));
    } catch (err) {
      uiOpen = false;
      toast(onlineError(err, "gabung"));
    }
  }
  let social = null;
  if (room) {
    social = new SocialUI({
      profile,
      getRoom: () => room,
      toast,
      currentTable,
      joinInvite,
      onBubble: (sid, text) => {
        const av = sid === room?.sessionId ? me : others.get(sid)?.av;
        if (av) showBubble(scene, av, text);
      },
    });
    social.attach(room);
    // Ketuk avatar pemain lain untuk membuka profilnya.
    scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERTAP || uiOpen) return;
      const sid = pi.pickInfo?.pickedMesh?.metadata?.sid;
      if (sid) social.openProfile(sid);
    });
  }

  function useTable(t) {
    if (t.id === "toko") {
      if (playingAs !== "anak") return toast("Toko Avatar khusus untuk akun anak.");
      uiOpen = true;
      keys.clear();
      toko.open(profile);
      return;
    }
    if (t.id === "bimbel") {
      // Tab baru, supaya sesi arena tetap tersambung.
      window.open("/bimbel/index.html", "_blank", "noopener");
      return;
    }
    if (t.id === "kartu") {
      uiOpen = true;
      keys.clear();
      $("ktr-bot-opts").hidden = true;
      kError("");
      kMenu.hidden = false;
      return;
    }
    if (t.id === "catur") {
      uiOpen = true;
      keys.clear();
      $("bot-levels").hidden = true;
      menuError("");
      menu.hidden = false;
    } else if (t.id === "scramble") {
      uiOpen = true;
      keys.clear();
      $("scr-bot-levels").hidden = true;
      sError("");
      sMenu.hidden = false;
    } else {
      toast(`${t.label} segera hadir!`);
    }
  }
  // Toko Aksesori: setelah beli/pakai/lepas, avatar sendiri dibuat ulang dan server diminta
  // membaca ulang aksesori dari database supaya pemain lain ikut melihat.
  const toko = new TokoUI({
    onClose: () => (uiOpen = false),
    onBerubah: (k) => {
      profile.aksesori = k.pakai.join(",");
      if (k.aura !== undefined) profile.aura = k.aura;
      Object.assign(me, gantiAvatar(me, profile));
      room?.send("segarkan-avatar");
    },
  });

  // ---------- Kembali ke dashboard anak ----------
  if (playingAs === "anak") {
    $("social-btns").hidden = false;
    $("btn-dashboard").hidden = false;
    $("btn-dashboard").onclick = () => (location.href = "/anak.html");
    if (!social) { $("btn-chat").hidden = true; $("btn-teman").hidden = true; }
  }

  let nearTable = null;
  $("action-btn").onclick = () => nearTable && !uiOpen && useTable(nearTable);

  // ---------- Loop per frame ----------
  let sendTimer = 0;
  let lastSent = "";
  let walkT = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);

    // Arah gerak relatif terhadap kamera
    let ix = joy.x, iz = joy.y;
    if (!uiOpen) {
      if (keys.has("w") || keys.has("arrowup")) iz += 1;
      if (keys.has("s") || keys.has("arrowdown")) iz -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
    } else { ix = 0; iz = 0; }
    const len = Math.hypot(ix, iz);
    const pos = me.root.position;
    if (len > 0.1) {
      const fwd = camera.target.subtract(camera.position);
      fwd.y = 0;
      fwd.normalize();
      const right = Vector3.Cross(Vector3.Up(), fwd);
      const dir = fwd.scale(iz).add(right.scale(ix));
      const n = Math.min(len, 1) / dir.length();
      moveWithCollision(pos, dir.x * n * SPEED * dt, dir.z * n * SPEED * dt, walls);
      const target = Math.atan2(dir.x, dir.z);
      me.root.rotation.y = Scalar.LerpAngle(me.root.rotation.y, target, 0.25);
      walkT += dt * 10;
      me.body.position.y = Math.abs(Math.sin(walkT)) * 0.08;
    } else {
      me.body.position.y = 0;
    }
    camera.target.copyFrom(pos.add(new Vector3(0, 1, 0)));

    // Kirim posisi ke server 10x per detik bila berubah
    sendTimer += dt;
    if (room && sendTimer > 0.1) {
      sendTimer = 0;
      const msg = { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), ry: +me.root.rotation.y.toFixed(2) };
      const key = `${msg.x},${msg.z},${msg.ry}`;
      if (key !== lastSent) { room.send("move", msg); lastSent = key; }
    }

    // Gerakkan pemain lain dengan halus
    for (const { av, p } of others.values()) {
      const rp = av.root.position;
      const moving = Math.hypot(p.x - rp.x, p.z - rp.z) > 0.05;
      rp.x = Scalar.Lerp(rp.x, p.x, 0.2);
      rp.z = Scalar.Lerp(rp.z, p.z, 0.2);
      av.root.rotation.y = Scalar.LerpAngle(av.root.rotation.y, p.ry, 0.2);
      av.body.position.y = moving ? Math.abs(Math.sin(performance.now() / 100)) * 0.08 : 0;
    }

    // Meja terdekat
    nearTable = null;
    for (const t of tables) {
      if (Math.hypot(pos.x - t.x, pos.z - t.z) < 2.6) { nearTable = t; break; }
    }
    const btn = $("action-btn");
    if (nearTable && !uiOpen) {
      const label = nearTable.action ? nearTable.action : nearTable.ready ? `Main ${nearTable.label}` : `${nearTable.label} (segera hadir)`;
      btn.textContent = matchMedia("(pointer: coarse)").matches ? label : `${label} [E]`;
      btn.hidden = false;
    } else {
      btn.hidden = true;
    }
  });

  engine.runRenderLoop(() => scene.render());
}

setupLogin(start);

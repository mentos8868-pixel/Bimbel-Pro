import colyseus from "colyseus";
import { authPlayer } from "../room-auth.js";
import { addPlaySeconds, secondsToday } from "../accounts.js";
import { setupSocial, socialJoin, socialLeave } from "./arena-social.js";
import { uidOf } from "../social.js";
import { avatarOr } from "../../shared/avatars.js";
import { db } from "../db.js";
import { sedangBekerja } from "../kantor.js";
import { siapkanKursiGame } from "./kursi-game.js";
import { rapikanAksesori } from "../../shared/aksesori.js";
import { levelDariXp, auraUntukLevel } from "../../shared/aura.js";
import { JARAK_INTERAKSI_BIMBEL, POSISI_KURSI_BIMBEL, TITIK_BIMBEL } from "../../shared/kursi-bimbel.js";


const { Room, ServerError } = colyseus;
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";

export const ARENA_RADIUS = 38;
const JENJANG = ["SD", "SMP", "SMA"];
const WARNA = /^#[0-9a-fA-F]{6}$/;

export class Player extends Schema {}
defineTypes(Player, {
  uid: "string",
  name: "string",
  jenjang: "string",
  color: "string",
  avatar: "string",
  negara: "string",   // kode negara, atau kosong bila belum diatur
  kelas: "number",    // 1–12, 0 = belum diisi / orang tua
  aksesori: "string",  // aksesori Toko yang dipakai, dipisah koma
  aura: "string",      // aura avatar menurut level ("" = belum ada, lihat shared/aura.js)
  kurikulum: "string", // nama kelas di papan nama mengikuti kurikulum (Kelas 4 / P4)
  x: "number",
  z: "number",
  ry: "number",
  kursiBimbel: "number", // 0 = berdiri, 1 dst. = nomor kursi
  mejaGame: "number",
  kursiGame: "number",
  pekerjaan: "string",
});

export class ArenaState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(ArenaState, { players: { map: Player } });

const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

export class ArenaRoom extends Room {
  maxClients = 50;

  onCreate() {
    this.setState(new ArenaState());
    this.timers = new Map(); // childId -> { clients, last, warned, limitMin }
    this.clock.setInterval(() => {
      const now = Date.now();
      for (const id of [...this.timers.keys()]) this.checkTime(id, now);
    }, 15000);
    this.clock.setInterval(() => this.segarkanStatusKerja(), 1000);

    setupSocial(this);
    this.lepasKursiGame = siapkanKursiGame(this);
    this.posisiSebelumBelajar = new Map();

    this.onMessage("belajar-bimbel", (client, mulai) => {
      const id = client.sessionId;
      const p = this.state.players.get(id);
      if (!p || p.mejaGame || client.auth?.role !== "anak") return;
      if (mulai === false && p.kursiBimbel) {
        Object.assign(p, this.posisiSebelumBelajar.get(id));
        this.posisiSebelumBelajar.delete(id);
        p.kursiBimbel = 0;
      }
      if (mulai !== true || p.kursiBimbel) return;
      if (Math.hypot(p.x - TITIK_BIMBEL.x, p.z - TITIK_BIMBEL.z) > JARAK_INTERAKSI_BIMBEL + 0.02) {
        return client.send("kursi-bimbel-gagal", "Dekati meja guru untuk duduk di kelas.");
      }
      const terisi = new Set([...this.state.players.values()].map((pemain) => pemain.kursiBimbel));
      const indeks = POSISI_KURSI_BIMBEL.findIndex((_, i) => !terisi.has(i + 1));
      if (indeks === -1) {
        return client.send("kursi-bimbel-gagal", "Kursi Bimbel penuh. Kamu tetap bisa belajar di Ruang Pintar.");
      }
      this.posisiSebelumBelajar.set(id, { x: p.x, z: p.z, ry: p.ry });
      Object.assign(p, POSISI_KURSI_BIMBEL[indeks]);
      p.kursiBimbel = indeks + 1;
    });

    this.onMessage("move", (client, data = {}) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.kursiBimbel || p.mejaGame) return;
      let x = num(data.x, p.x);
      let z = num(data.z, p.z);
      // Jaga pemain tetap di dalam arena.
      const d = Math.hypot(x, z);
      if (d > ARENA_RADIUS) {
        x = (x / d) * ARENA_RADIUS;
        z = (z / d) * ARENA_RADIUS;
      }
      p.x = x;
      p.z = z;
      p.ry = num(data.ry, p.ry);
    });

    // Setelah anak membeli/memakai aksesori di Toko (atau naik level): baca ulang dari database,
    // jadi isi pesan dari browser tidak dipercaya. Pemain lain langsung melihat avatar barunya.
    this.onMessage("segarkan-avatar", (client) => {
      const p = this.state.players.get(client.sessionId);
      const a = client.auth;
      if (!p || a?.role !== "anak") return;
      const now = Date.now();   // paling sering dua kali per detik
      if (now - (client.userData?.avatarAt || 0) < 500) return;
      client.userData = { ...client.userData, avatarAt: now };
      const c = db.prepare("SELECT avatar, aksesori_pakai, xp FROM children WHERE id = ?").get(a.childId);
      if (!c) return;
      p.avatar = avatarOr(c.avatar);
      p.aksesori = rapikanAksesori(c.aksesori_pakai).join(",");
      p.aura = auraUntukLevel(levelDariXp(c.xp))?.id || "";
    });
  }

  onAuth(client, options) {
    const p = authPlayer(options);
    // Orang tua yang sedang bekerja (Kantor/Sawah) tidak bisa masuk arena sampai sesi selesai atau dihentikan.
    const kerja = p.role === "ortu" ? sedangBekerja(p.parentId) : "";
    if (kerja) throw new ServerError(4409, `Kamu sedang bekerja di ${kerja === "sawah" ? "Sawah" : "Kantor"}. Tekan Stop kerja dulu untuk masuk arena.`);
    return p;
  }

  segarkanStatusKerja(sekarang = Date.now()) {
    for (const client of this.clients) {
      if (client.auth?.role !== "ortu") continue;
      const p = this.state.players.get(client.sessionId);
      if (p) p.pekerjaan = sedangBekerja(client.auth.parentId, sekarang);
    }
  }

  onJoin(client) {
    const a = client.auth;
    const p = new Player();
    p.uid = uidOf(a);
    p.name = a.name;
    p.jenjang = a.role === "ortu" ? "Orang tua" : a.jenjang;
    p.color = WARNA.test(a.color || "") ? a.color : "#4f9cf0";
    p.avatar = avatarOr(a.avatar);
    p.negara = a.negara || "";
    p.kelas = a.role === "anak" ? a.kelas || 0 : 0;
    p.kurikulum = a.role === "anak" ? a.kurikulum || "merdeka" : "";
    p.aksesori = a.aksesori || "";   // anak: dari Toko; orang tua: dipilih di dashboard (gratis)
    p.aura = a.role === "anak" ? a.aura || "" : "";
    // Muncul di sekitar alun-alun.
    const ang = Math.random() * Math.PI * 2;
    p.x = Math.cos(ang) * 3;
    p.z = Math.sin(ang) * 3;
    p.ry = 0;
    p.kursiBimbel = 0;
    p.mejaGame = p.kursiGame = 0;
    p.pekerjaan = a.role === "ortu" ? sedangBekerja(a.parentId) : "";
    this.state.players.set(client.sessionId, p);
    socialJoin(client);
    if (a.role === "anak") {
      let t = this.timers.get(a.childId);
      if (!t) { t = { clients: new Set(), last: Date.now(), warned: false, limitMin: a.limitMin }; this.timers.set(a.childId, t); }
      t.clients.add(client);
      this.checkTime(a.childId, Date.now());
    }
  }

  onLeave(client) {
    if (client.auth) this.lepasKursiGame(client);
    this.posisiSebelumBelajar.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    if (client.auth) socialLeave(this, client);
    const a = client.auth;
    if (a?.role === "anak") {
      const t = this.timers.get(a.childId);
      if (t) {
        t.clients.delete(client);
        if (!t.clients.size) {
          addPlaySeconds(a.childId, (Date.now() - t.last) / 1000);
          this.timers.delete(a.childId);
        }
      }
    }
  }

  // Catat waktu bermain (sekali per anak walau membuka dua tab) dan tegakkan batas harian.
  checkTime(childId, now) {
    const t = this.timers.get(childId);
    if (!t) return;
    addPlaySeconds(childId, (now - t.last) / 1000);
    t.last = now;
    if (!t.limitMin) return;
    const left = t.limitMin * 60 - secondsToday(childId, now);
    if (left <= 0) {
      for (const c of t.clients) {
        c.send("waktu-habis", "Waktu bermain hari ini sudah habis. Sampai jumpa besok!");
        c.leave(4000);
      }
    } else if (left <= 5 * 60 && !t.warned) {
      t.warned = true;
      for (const c of t.clients) c.send("waktu-hampir", Math.ceil(left / 60));
    }
  }

  onDispose() {
    const now = Date.now();
    for (const [childId, t] of this.timers) addPlaySeconds(childId, (now - t.last) / 1000);
  }
}

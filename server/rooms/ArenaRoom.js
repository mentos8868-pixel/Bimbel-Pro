import colyseus from "colyseus";
import { authPlayer } from "../room-auth.js";
import { addPlaySeconds, secondsToday } from "../accounts.js";
import { setupSocial, socialJoin, socialLeave } from "./arena-social.js";
import { uidOf } from "../social.js";
import { avatarOr } from "../../shared/avatars.js";


const { Room } = colyseus;
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
  x: "number",
  z: "number",
  ry: "number",
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

    setupSocial(this);

    this.onMessage("move", (client, data = {}) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
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
  }

  onAuth(client, options) {
    return authPlayer(options);
  }

  onJoin(client) {
    const a = client.auth;
    const p = new Player();
    p.uid = uidOf(a);
    p.name = a.name;
    p.jenjang = a.role === "ortu" ? "Orang tua" : a.jenjang;
    p.color = WARNA.test(a.color || "") ? a.color : "#4f9cf0";
    p.avatar = avatarOr(a.avatar);
    // Muncul di sekitar alun-alun.
    const ang = Math.random() * Math.PI * 2;
    p.x = Math.cos(ang) * 3;
    p.z = Math.sin(ang) * 3;
    p.ry = 0;
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

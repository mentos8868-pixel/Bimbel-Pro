import colyseus from "colyseus";
import { authTable } from "../room-auth.js";
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";
import { ScrambleEngine } from "../../shared/scramble-engine.js";
import { tambahKamusBesar } from "../../shared/kamus-kata.js";
import { readFileSync } from "node:fs";

// Kamus besar untuk menerima anagram sah (file yang sama dengan yang dimuat browser).
for (const bahasa of ["ID", "EN"]) {
  try { tambahKamusBesar(bahasa, readFileSync(new URL(`../../game/public/kamus/${bahasa.toLowerCase()}.txt`, import.meta.url), "utf8")); }
  catch { console.warn(`Kamus ${bahasa} tidak ditemukan; Scramble memakai kamus umum saja.`); }
}

const { Room } = colyseus;

export class ScramblePlayer extends Schema {}
defineTypes(ScramblePlayer, { name: "string", score: "number", solved: "boolean", siap: "boolean" });

export class ScrambleState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(ScrambleState, {
  status: "string", // menunggu | main | jeda | selesai
  round: "number",
  totalRounds: "number",
  scrambled: "string",
  clue: "string",
  lastWord: "string",
  secondsLeft: "number",
  startIn: "number", // tidak dipakai lagi (dulu hitung mundur otomatis); permainan mulai saat semua pemain Siap
  result: "string",
  lang: "string",
  jenjang: "string",
  hostId: "string",
  players: { map: ScramblePlayer },
});

const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const buatKode = () =>
  Array.from({ length: 4 }, () => HURUF[Math.floor(Math.random() * HURUF.length)]).join("");

export class ScrambleRoom extends Room {
  maxClients = 4;

  onCreate(options = {}) {
    this.roomId = buatKode();
    if (options.private) this.setPrivate(true);
    this.engine = new ScrambleEngine({ jenjang: options.jenjang, lang: options.lang });
    this.siap = new Set();   // ruang tunggu: sessionId pemain yang sudah menekan Siap

    const s = new ScrambleState();
    Object.assign(s, {
      status: "menunggu", round: 0, totalRounds: this.engine.rounds, scrambled: "", clue: "",
      lastWord: "", secondsLeft: 0, startIn: 0, result: "",
      lang: this.engine.lang, jenjang: this.engine.jenjang, hostId: "",
    });
    this.setState(s);

    // Ruang tunggu: tiap pemain menekan Siap; mulai saat minimal 2 pemain dan semuanya Siap.
    this.onMessage("siap", (client, nilai) => {
      if (this.engine.status !== "menunggu" || !this.engine.players.has(client.sessionId)) return;
      if (nilai === false) this.siap.delete(client.sessionId); else this.siap.add(client.sessionId);
      this.tryStart();
      this.sync();
    });
    this.onMessage("jawab", (client, data = {}) => {
      const r = this.engine.answer(client.sessionId, data.word, Date.now());
      client.send("hasil", r);
      this.sync();
    });
    this.setSimulationInterval(() => this.update(), 250);
  }

  tryStart() {
    if (this.engine.status !== "menunggu" || this.engine.players.size < 2) return;
    if (![...this.engine.players.keys()].every((id) => this.siap.has(id))) return;
    this.lock();
    this.engine.start(Date.now());
    this.sync();
  }

  update() {
    const now = Date.now();
    if (this.engine.status !== "menunggu") this.engine.tick(now);
    this.sync();
  }

  sync() {
    const now = Date.now();
    const snap = this.engine.snapshot(now);
    const s = this.state;
    s.status = snap.status;
    s.round = snap.round;
    s.scrambled = snap.scrambled;
    s.clue = snap.clue;
    s.lastWord = snap.lastWord;
    s.secondsLeft = snap.secondsLeft;
    s.result = snap.result;
    s.startIn = 0;
    for (const p of snap.players) {
      let sp = s.players.get(p.id);
      if (!sp) { sp = new ScramblePlayer(); s.players.set(p.id, sp); }
      sp.name = p.name;
      sp.score = p.score;
      sp.solved = p.solved;
      sp.siap = this.siap.has(p.id);
    }
    for (const id of [...s.players.keys()]) if (!this.engine.players.has(id)) s.players.delete(id);
  }

  onAuth(client, options) {
    return authTable(this, options);
  }

  onJoin(client) {
    const name = client.auth.name;
    this.engine.addPlayer(client.sessionId, name);
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    this.sync();
  }

  onLeave(client) {
    this.engine.removePlayer(client.sessionId);
    this.siap.delete(client.sessionId);
    this.tryStart();   // sisa pemain mungkin sudah Siap semua
    if (this.state.hostId === client.sessionId) {
      this.state.hostId = this.engine.players.keys().next().value || "";
    }
    const st = this.engine.status;
    if ((st === "main" || st === "jeda") && this.engine.players.size < 2) this.engine.finish();
    this.sync();
  }
}

import colyseus from "colyseus";
import { authTable } from "../room-auth.js";
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";
import { KartuEngine } from "../../shared/kartu-engine.js";

const { Room } = colyseus;

export class KartuPlayer extends Schema {}
defineTypes(KartuPlayer, { name: "string", count: "number", seat: "number" });

// Hanya informasi umum. Isi kartu di tangan dikirim terpisah ke pemiliknya saja.
export class KartuState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(KartuState, {
  status: "string",
  mode: "string",
  jenjang: "string",
  topColor: "string",
  topKind: "string",
  topLabel: "string",
  color: "string",
  turnId: "string",
  dir: "number",
  drew: "boolean",
  deckCount: "number",
  turnLeft: "number",
  startIn: "number",
  message: "string",
  result: "string",
  hostId: "string",
  winner: "string",
  players: { map: KartuPlayer },
});

const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const buatKode = () =>
  Array.from({ length: 4 }, () => HURUF[Math.floor(Math.random() * HURUF.length)]).join("");
const AUTO_START_MS = 10000;

export class KartuRoom extends Room {
  maxClients = 4;

  onCreate(options = {}) {
    this.roomId = buatKode();
    if (options.private) this.setPrivate(true);
    this.engine = new KartuEngine({ jenjang: options.jenjang, mode: options.mode, turnSecs: 30 });
    this.autoStartAt = 0;
    const s = new KartuState();
    Object.assign(s, {
      status: "menunggu", mode: this.engine.mode, jenjang: this.engine.jenjang, topColor: "", topKind: "", topLabel: "",
      color: "", turnId: "", dir: 1, drew: false, deckCount: 0, turnLeft: 0, startIn: 0, message: "", result: "", hostId: "", winner: "",
    });
    this.setState(s);

    this.onMessage("mulai", (client) => {
      if (client.sessionId === this.state.hostId) this.tryStart();
    });
    this.onMessage("main", (client, d = {}) => this.act(client, this.engine.play(client.sessionId, Number(d.cardId), d.color, Date.now())));
    this.onMessage("ambil", (client) => this.act(client, this.engine.draw(client.sessionId, Date.now())));
    this.onMessage("lewat", (client) => this.act(client, this.engine.pass(client.sessionId, Date.now())));
    this.setSimulationInterval(() => this.update(), 250);
  }

  act(client, result) {
    client.send("hasil", result);
    this.sync(true);
  }

  tryStart() {
    if (this.engine.status !== "menunggu" || this.engine.players.length < 2) return;
    this.lock();
    this.engine.start(Date.now());
    this.sync(true);
  }

  update() {
    const now = Date.now();
    let changed = false;
    if (this.engine.status === "menunggu") {
      if (this.engine.players.length >= 2) {
        if (!this.autoStartAt) this.autoStartAt = now + AUTO_START_MS;
        if (now >= this.autoStartAt) this.tryStart();
      } else {
        this.autoStartAt = 0;
      }
    } else {
      changed = this.engine.tick(now);
    }
    this.sync(changed);
  }

  sync(sendHands = false) {
    const now = Date.now();
    const p = this.engine.publicState(now);
    const s = this.state;
    s.status = p.status;
    s.topColor = p.top?.color || "";
    s.topKind = p.top?.kind || "";
    s.topLabel = p.top?.label || "";
    s.color = p.color || "";
    s.turnId = p.turnId;
    s.dir = p.dir;
    s.drew = p.drew;
    s.deckCount = p.deckCount;
    s.turnLeft = p.turnLeft;
    s.message = p.message;
    s.result = p.result;
    s.winner = p.winner || "";
    s.startIn = this.autoStartAt && p.status === "menunggu" ? Math.max(0, Math.ceil((this.autoStartAt - now) / 1000)) : 0;
    p.players.forEach((pl, seat) => {
      let sp = s.players.get(pl.id);
      if (!sp) { sp = new KartuPlayer(); s.players.set(pl.id, sp); }
      sp.name = pl.name;
      sp.count = pl.count;
      sp.seat = seat;
    });
    for (const id of [...s.players.keys()]) if (!this.engine.find(id)) s.players.delete(id);
    if (sendHands) for (const c of this.clients) c.send("tangan", this.engine.handOf(c.sessionId));
  }

  onAuth(client, options) {
    return authTable(this, options);
  }

  onJoin(client) {
    const name = client.auth.name;
    this.engine.addPlayer(client.sessionId, name);
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    this.sync(true);
  }

  onLeave(client) {
    this.engine.removePlayer(client.sessionId, Date.now());
    if (this.state.hostId === client.sessionId) this.state.hostId = this.engine.players[0]?.id || "";
    this.sync(true);
  }
}

// Tampilan Kartu Kilat. Mode "bot": mesin berjalan di browser. Mode "online": server yang menentukan,
// dan kartu di tangan hanya dikirim ke pemiliknya.
import { KartuEngine, botMove, COLOR_NAME } from "../../shared/kartu-engine.js";
import { reportResult } from "./api.js";
import { gambarRuangTunggu, kirimSiap } from "./ruang-tunggu.js";

const $ = (id) => document.getElementById(id);
const BOT_NAMES = { 1: "Bot Pemula", 2: "Bot Menengah", 3: "Bot Mahir" };
const SYM = { lewati: "⦸", balik: "⇄", ambil2: "+2", warna: "★" };
const BOT_DELAY = 1100;

export function makeCard(card, { big = false } = {}) {
  const el = document.createElement(big ? "div" : "button");
  el.className = `kcard ${card.kind === "warna" ? "warna" : card.color}${big ? " big" : ""}`;
  if (card.kind === "angka") {
    el.textContent = card.label;
  } else {
    const s = document.createElement("span");
    s.className = "sym";
    s.textContent = SYM[card.kind];
    const l = document.createElement("small");
    l.textContent = card.label;
    el.append(s, l);
  }
  el.setAttribute("aria-label", `${card.label}, ${card.color ? COLOR_NAME[card.color] : "semua warna"}`);
  return el;
}

export class KartuUI {
  constructor({ onClose }) {
    this.onClose = onClose;
    this.el = $("kartu");
    this.view = null;
    this.hand = [];
    this.pendingWild = null;

    $("ktr-close").onclick = () => this.close();
    $("ktr-deck").onclick = () => this.draw();
    $("ktr-pass").onclick = () => this.pass();
    $("ktr-start").onclick = () => kirimSiap(this.room, this.view, this.myId);
    $("ktr-again").onclick = () => this.startBot(this.profile, this.mode, this.level, this.bots);
    $("ktr-colors").addEventListener("click", (e) => {
      const c = e.target.closest("button")?.dataset.color;
      if (c && this.pendingWild != null) this.play(this.pendingWild, c);
    });
  }

  // ---------- mulai ----------
  startBot(profile, mode, level, bots) {
    this.cleanup();
    Object.assign(this, { kind: "bot", profile, mode, level, bots, myId: "me" });
    const e = new KartuEngine({ jenjang: profile.gameJenjang, mode, turnSecs: 0 });
    e.addPlayer("me", profile.name);
    for (let i = 1; i <= bots; i++) e.addPlayer("bot" + i, bots > 1 ? `${BOT_NAMES[level]} ${i}` : BOT_NAMES[level]);
    e.start(Date.now());
    this.engine = e;
    this.lastAction = Date.now();
    this.timer = setInterval(() => this.botTick(), 250);
    this.show();
    this.refreshLocal();
  }

  botTick() {
    const e = this.engine;
    if (!e || e.status !== "main") return;
    const cur = e.current();
    if (cur.id === "me" || Date.now() - this.lastAction < BOT_DELAY) return;
    const m = botMove(e, cur.id, this.level);
    const now = Date.now();
    if (m.type === "play") e.play(cur.id, m.cardId, m.color, now);
    else if (m.type === "draw") e.draw(cur.id, now);
    else e.pass(cur.id, now);
    this.lastAction = now;
    this.refreshLocal();
  }

  refreshLocal() {
    const e = this.engine;
    this.hand = e.handOf("me");
    this.setView({ ...e.publicState(Date.now()), hostId: "me", startIn: 0 });
  }

  startOnline(profile, room, privat = true) {
    this.privat = privat;
    this.cleanup();
    Object.assign(this, { kind: "online", profile, room, myId: room.sessionId });
    this.mode = room.state.mode;
    room.onMessage("tangan", (h) => { this.hand = h; this.render(); });
    room.onMessage("hasil", (r) => this.onResult(r));
    room.onStateChange((s) => this.setView(this.fromServer(s)));
    room.onLeave(() => {
      if (this.kind === "online" && this.view?.status !== "selesai") this.say("Koneksi meja terputus.");
    });
    this.show();
    this.setView(this.fromServer(room.state));
  }

  fromServer(s) {
    const players = [];
    s.players.forEach((p, id) => players.push({ id, name: p.name, count: p.count, seat: p.seat, siap: !!p.siap }));
    players.sort((a, b) => a.seat - b.seat);
    this.mode = s.mode;
    return {
      status: s.status, mode: s.mode, color: s.color || null, turnId: s.turnId, dir: s.dir, drew: s.drew,
      deckCount: s.deckCount, turnLeft: s.turnLeft, message: s.message, result: s.result,
      hostId: s.hostId, startIn: s.startIn, players, winner: s.winner || null,
      top: s.topKind ? { color: s.topColor || null, kind: s.topKind, label: s.topLabel } : null,
    };
  }

  show() {
    this.reported = false;
    this.el.hidden = false;
    this.pendingWild = null;
    $("ktr-colors").hidden = true;
  }

  cleanup() {
    clearInterval(this.timer);
    clearTimeout(this.hintTimer);
    this.hint = "";
    this.lastClicked = null;
    if (this.room) {
      this.room.removeAllListeners();
      this.room.leave();
      this.room = null;
    }
    this.engine = null;
    this.hand = [];
  }

  close() {
    this.cleanup();
    this.kind = null;
    this.el.hidden = true;
    this.onClose?.();
  }

  // ---------- aksi ----------
  myTurn() {
    return this.view?.status === "main" && this.view.turnId === this.myId;
  }

  // Sorotan kartu yang bisa dimainkan hanya di mode angka biasa;
  // di mode hitung anak harus menghitung sendiri.
  canPlayHint(card) {
    const v = this.view;
    if (!v?.top || this.mode !== "biasa") return false;
    if (card.kind === "warna" || card.color === v.color) return true;
    if (card.kind === "angka" && v.top.kind === "angka") return String(card.value) === v.top.label;
    return card.kind !== "angka" && card.kind === v.top.kind;
  }

  clickCard(card, el) {
    if (!this.myTurn()) return this.say("Tunggu giliranmu ya.");
    if (card.kind === "warna") {
      this.pendingWild = card.id;
      $("ktr-colors").hidden = false;
      this.say("Pilih warna baru.");
      return;
    }
    this.lastClicked = el;
    this.play(card.id);
  }

  play(cardId, color) {
    $("ktr-colors").hidden = true;
    this.pendingWild = null;
    if (!this.myTurn()) return;
    if (this.kind === "online") return this.room.send("main", { cardId, color });
    const r = this.engine.play("me", cardId, color, Date.now());
    this.lastAction = Date.now();
    this.onResult(r);
    this.refreshLocal();
  }

  draw() {
    if (!this.myTurn()) return this.say("Tunggu giliranmu ya.");
    if (this.view.drew) return this.say("Kamu sudah mengambil kartu. Mainkan atau lewati giliran.");
    if (this.kind === "online") return this.room.send("ambil");
    const r = this.engine.draw("me", Date.now());
    this.lastAction = Date.now();
    this.refreshLocal();
    if (r.ok && r.playable) this.say("Kartu yang kamu ambil bisa dimainkan! Mainkan atau lewati giliran.");
  }

  pass() {
    if (this.kind === "online") return this.room.send("lewat");
    this.engine.pass("me", Date.now());
    this.lastAction = Date.now();
    this.refreshLocal();
  }

  onResult(r) {
    if (r.ok) return;
    if (r.reason === "tidak-cocok") {
      this.lastClicked?.classList.remove("bad");
      void this.lastClicked?.offsetWidth;
      this.lastClicked?.classList.add("bad");
      this.say(this.mode === "hitung"
        ? "Belum cocok. Hitung lagi: warnanya atau hasilnya harus sama dengan kartu di meja."
        : "Belum cocok. Warna atau angkanya harus sama.");
    } else if (r.reason === "bukan-giliran") this.say("Tunggu giliranmu ya.");
  }

  say(t) {
    this.hint = t;
    $("ktr-turn").textContent = t;
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => { this.hint = ""; this.render(); }, 3000);
  }

  // ---------- gambar ----------
  setView(v) {
    this.view = v;
    if (!this.myTurn()) this.pendingWild = null;
    if (v.status === "selesai" && !this.reported) {
      clearInterval(this.timer);
      this.reported = true;
      reportResult("kartu", this.kind, v.winner === this.myId ? "menang" : "kalah");
    }
    this.render();
  }

  render() {
    const v = this.view;
    if (!v || this.el.hidden) return;
    const waiting = v.status === "menunggu";
    $("ktr-wait").hidden = !waiting;
    $("ktr-table").hidden = waiting;
    $("ktr-opponents").hidden = waiting;   // saat menunggu, daftar pemain ada di ruang tunggu

    $("ktr-opponents").replaceChildren(...v.players.map((p) => {
      const d = document.createElement("div");
      d.className = "opp" + (p.id === v.turnId ? " turn" : "");
      d.textContent = `${p.id === this.myId ? "Kamu" : p.name} · ${p.count} kartu`;
      return d;
    }));

    if (waiting) {
      let info = this.room && this.privat ? `Kode meja privat: ${this.room.roomId}. ` : "";
      info += `Jenis: ${v.mode === "biasa" ? "Angka biasa" : "Hitung"}. `;
      gambarRuangTunggu({ v, myId: this.myId, online: !!this.room, info, maks: 4,
        teksEl: $("ktr-wait-text"), daftarEl: $("ktr-wait-list"), tombolEl: $("ktr-start") });
    }

    if (v.top) $("ktr-top").replaceChildren(makeCard(v.top, { big: true }));
    else $("ktr-top").replaceChildren();
    $("ktr-deck-count").textContent = `${v.deckCount} kartu`;
    const col = $("ktr-color");
    col.className = "pill " + (v.color || "");
    col.textContent = v.color ? `Warna: ${COLOR_NAME[v.color]}` : "";
    $("ktr-dir").textContent = v.status === "main" ? (v.dir === 1 ? "Arah: ↻" : "Arah: ↺") : "";
    $("ktr-timer").textContent = v.status === "main" && v.turnLeft ? `⏱ ${v.turnLeft} dtk` : "";
    $("ktr-timer").classList.toggle("low", v.turnLeft > 0 && v.turnLeft <= 5);

    $("ktr-message").textContent = v.status === "selesai" ? v.result : v.message;
    if (!this.hint) {
      const cur = v.players.find((p) => p.id === v.turnId);
      $("ktr-turn").textContent = v.status !== "main" ? "" : this.myTurn()
        ? (v.drew ? "Mainkan kartu yang cocok, atau lewati giliran." : "Giliranmu! Pilih kartu, atau ambil dari tumpukan.")
        : `Giliran ${cur?.name || ""}…`;
    }

    const mine = this.myTurn();
    $("ktr-hand").replaceChildren(...this.hand.map((c) => {
      const el = makeCard(c);
      if (mine && this.canPlayHint(c)) el.classList.add("can");
      if (!mine) el.classList.add("dim");
      el.onclick = () => this.clickCard(c, el);
      return el;
    }));
    $("ktr-pass").hidden = !(mine && v.drew);
    $("ktr-deck").disabled = !mine || v.drew;
    if (!mine) $("ktr-colors").hidden = true;
    $("ktr-again").hidden = !(v.status === "selesai" && this.kind === "bot");
  }
}

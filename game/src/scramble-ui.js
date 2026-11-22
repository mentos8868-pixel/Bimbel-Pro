// Tampilan permainan Scramble: susun huruf acak menjadi kata.
// Mode "bot": mesin permainan berjalan di browser. Mode "online": server yang menentukan.
import { ScrambleEngine } from "../../shared/scramble-engine.js";
import { muatKamusBesar } from "../../shared/kamus-kata.js";
import { reportResult } from "./api.js";

const $ = (id) => document.getElementById(id);
const BOT = {
  1: { name: "Bot Pemula", chance: 0.55, min: 14, max: 26 },
  2: { name: "Bot Menengah", chance: 0.8, min: 9, max: 18 },
  3: { name: "Bot Mahir", chance: 0.95, min: 5, max: 11 },
};

export class ScrambleUI {
  constructor({ onClose }) {
    this.onClose = onClose;
    this.el = $("scramble");
    this.view = null;
    this.letters = [];
    this.picked = [];
    this.lastRound = 0;
    this.locked = false;

    $("scr-close").onclick = () => this.close();
    $("scr-clear").onclick = () => { this.picked = []; this.renderTiles(); };
    $("scr-submit").onclick = () => this.submit();
    $("scr-start").onclick = () => this.room?.send("mulai");
    $("scr-again").onclick = () => this.startBot(this.profile, this.lang, this.level);
    window.addEventListener("keydown", (e) => this.onKey(e));
  }

  // ---------- mulai ----------
  startBot(profile, lang, level) {
    this.cleanup();
    this.mode = "bot";
    this.profile = profile;
    this.lang = lang;
    this.level = level;
    this.myId = "me";
    muatKamusBesar(lang);
    const engine = new ScrambleEngine({ jenjang: profile.gameJenjang, lang });
    engine.addPlayer("me", profile.name);
    engine.addPlayer("bot", BOT[level].name);
    engine.start(Date.now());
    this.engine = engine;
    this.botRound = 0;
    this.timer = setInterval(() => this.botTick(), 250);
    this.show();
    this.botTick();
  }

  botTick() {
    const e = this.engine;
    const now = Date.now();
    if (e.status === "main" && this.botRound !== e.round) {
      // Rencanakan kapan bot menjawab di ronde ini.
      this.botRound = e.round;
      const b = BOT[this.level];
      const extra = Math.max(0, e.word.length - 5) * 0.6;
      this.botAt = Math.random() < b.chance ? now + (b.min + Math.random() * (b.max - b.min) + extra) * 1000 : Infinity;
    }
    if (e.status === "main" && now >= this.botAt) {
      e.answer("bot", e.word, now);
      this.botAt = Infinity;
    }
    e.tick(now);
    this.setView({ ...e.snapshot(now), startIn: 0, hostId: "me" });
    if (e.status === "selesai") clearInterval(this.timer);
  }

  startOnline(profile, room) {
    this.cleanup();
    this.mode = "online";
    this.profile = profile;
    this.room = room;
    this.myId = room.sessionId;
    room.onStateChange((s) => this.setView(this.fromServer(s)));
    room.onMessage("hasil", (r) => this.onResult(r));
    room.onLeave(() => {
      if (this.mode === "online" && this.view?.status !== "selesai") this.feedback("Koneksi meja terputus.");
    });
    this.show();
    this.setView(this.fromServer(room.state));
  }

  fromServer(s) {
    const players = [];
    s.players.forEach((p, id) => players.push({ id, name: p.name, score: p.score, solved: p.solved }));
    return {
      status: s.status, round: s.round, totalRounds: s.totalRounds, scrambled: s.scrambled, clue: s.clue,
      lastWord: s.lastWord, secondsLeft: s.secondsLeft, startIn: s.startIn, result: s.result,
      hostId: s.hostId, lang: s.lang, players,
    };
  }

  show() {
    this.reported = false;
    this.el.hidden = false;
    this.lastRound = 0;
    this.locked = false;
    this.feedback("");
  }

  cleanup() {
    clearInterval(this.timer);
    if (this.room) {
      this.room.removeAllListeners();
      this.room.leave();
      this.room = null;
    }
    this.engine = null;
  }

  close() {
    this.cleanup();
    this.mode = null;
    this.el.hidden = true;
    this.onClose?.();
  }

  // ---------- menyusun jawaban ----------
  me() {
    return this.view?.players.find((p) => p.id === this.myId);
  }

  canPlay() {
    const me = this.me();
    return this.view?.status === "main" && !!me && !me.solved && !this.locked;
  }

  pick(i) {
    if (!this.canPlay() || this.picked.includes(i)) return;
    this.picked.push(i);
    this.renderTiles();
    if (this.picked.length === this.letters.length) this.submit();
  }

  unpick(pos) {
    if (!this.canPlay()) return;
    this.picked.splice(pos, 1);
    this.renderTiles();
  }

  onKey(e) {
    if (this.el.hidden || !this.mode || e.target.tagName === "INPUT" || !this.canPlay()) return;
    if (e.key === "Enter" && e.target.tagName !== "BUTTON") return this.submit();
    if (e.key === "Backspace") return this.unpick(this.picked.length - 1);
    const k = e.key.toUpperCase();
    if (/^[A-Z]$/.test(k)) {
      const i = this.letters.findIndex((l, idx) => l === k && !this.picked.includes(idx));
      if (i >= 0) this.pick(i);
    }
  }

  submit() {
    if (!this.canPlay() || !this.picked.length) return;
    const word = this.picked.map((i) => this.letters[i]).join("");
    if (this.mode === "online") {
      this.locked = true; // tunggu jawaban server
      this.room.send("jawab", { word });
    } else {
      this.onResult(this.engine.answer("me", word, Date.now()));
      this.botTick();
    }
  }

  onResult(r) {
    this.locked = false;
    const ans = $("scr-answer");
    if (r.ok) {
      ans.classList.add("ok");
      this.feedback(`Benar! +${r.points} poin`);
    } else if (r.reason === "salah") {
      ans.classList.remove("bad");
      void ans.offsetWidth; // ulang animasi goyang
      ans.classList.add("bad");
      this.feedback("Belum tepat, coba lagi!");
      this.picked = [];
      this.renderTiles();
    }
  }

  feedback(t) {
    $("scr-feedback").textContent = t;
  }

  // ---------- gambar ----------
  setView(v) {
    this.view = v;
    if (v.status === "selesai" && !this.reported && this.me()) {
      this.reported = true;
      const mine = this.me().score;
      const best = Math.max(...v.players.map((p) => p.score));
      const tie = v.players.filter((p) => p.score === best).length > 1;
      reportResult("scramble", this.mode, mine < best ? "kalah" : tie ? "seri" : "menang", mine);
    }
    if (v.scrambled && v.round !== this.lastRound) {
      // Ronde baru
      this.lastRound = v.round;
      this.letters = v.scrambled.split("");
      this.picked = [];
      this.locked = false;
      $("scr-answer").classList.remove("ok", "bad");
      this.feedback("");
    }
    this.render();
  }

  render() {
    const v = this.view;
    if (!v || this.el.hidden) return;
    const waiting = v.status === "menunggu";
    $("scr-wait").hidden = !waiting;
    $("scr-play").hidden = v.status !== "main";

    if (waiting) {
      const n = v.players.length;
      let t = this.room ? `Kode meja: ${this.room.roomId}. ` : "";
      t += n < 2 ? "Menunggu pemain lain…" : `Mulai otomatis dalam ${v.startIn} detik.`;
      $("scr-wait-text").textContent = t;
      $("scr-start").hidden = !(v.hostId === this.myId && n >= 2);
      $("scr-round").textContent = `Pemain: ${n}/4`;
      $("scr-timer").textContent = "";
    } else {
      $("scr-round").textContent = v.status === "selesai" ? "Selesai" : `Ronde ${v.round}/${v.totalRounds}`;
      const timer = $("scr-timer");
      timer.textContent = v.status === "main" ? `⏱ ${v.secondsLeft} dtk` : "";
      timer.classList.toggle("low", v.status === "main" && v.secondsLeft <= 5);
    }

    if (v.status === "main") {
      $("scr-clue").textContent = `Petunjuk: ${v.clue}`;
      if (this.me()?.solved) this.feedback(this.view.players.every((p) => p.solved) ? "Semua benar!" : "Benar! Tunggu pemain lain…");
    } else if (v.status === "jeda") {
      $("scr-clue").textContent = "";
      this.feedback(`Jawabannya: ${v.lastWord}`);
    } else if (v.status === "selesai") {
      this.feedback(v.result);
    }
    this.renderTiles();

    const list = [...v.players].sort((a, b) => b.score - a.score);
    $("scr-scores").replaceChildren(...list.map((p) => {
      const li = document.createElement("li");
      li.className = p.id === this.myId ? "me" : "";
      li.textContent = `${p.name}${p.id === this.myId ? " (kamu)" : ""}: ${p.score} poin `;
      if (v.status === "main" && p.solved) {
        const s = document.createElement("span");
        s.className = "solved";
        s.textContent = "✓";
        li.appendChild(s);
      }
      return li;
    }));
    $("scr-again").hidden = !(v.status === "selesai" && this.mode === "bot");
  }

  renderTiles() {
    const v = this.view;
    const solved = this.me()?.solved;
    const showAnswer = v?.status === "main";
    const ansEl = $("scr-answer");
    const tilesEl = $("scr-tiles");
    if (!showAnswer) { ansEl.replaceChildren(); tilesEl.replaceChildren(); return; }
    ansEl.replaceChildren(...this.picked.map((i, pos) => {
      const b = document.createElement("button");
      b.textContent = this.letters[i];
      b.onclick = () => !solved && this.unpick(pos);
      return b;
    }));
    tilesEl.replaceChildren(...this.letters.map((l, i) => {
      const b = document.createElement("button");
      b.textContent = l;
      if (this.picked.includes(i) || solved) b.classList.add("used");
      b.onclick = () => this.pick(i);
      return b;
    }));
    $("scr-clear").disabled = solved;
    $("scr-submit").disabled = solved;
  }
}

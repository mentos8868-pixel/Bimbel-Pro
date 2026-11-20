// Mesin permainan Scramble (susun kata). Dipakai di server (online) dan di browser (lawan bot).
// Tidak bergantung pada jam sistem: waktu "now" (milidetik) selalu diberikan oleh pemanggil.
import { WORDS, JENJANG, LANGS } from "./scramble-words.js";

const letters = (w) => w.split("").sort().join("");
export const normalize = (w) => String(w || "").toUpperCase().replace(/[^A-Z]/g, "");

function shuffleWord(word, rng) {
  if (new Set(word).size < 2) return word;
  let out = word;
  for (let i = 0; i < 20 && out === word; i++) {
    const a = word.split("");
    for (let j = a.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      [a[j], a[k]] = [a[k], a[j]];
    }
    out = a.join("");
  }
  return out;
}

export class ScrambleEngine {
  constructor({ jenjang = "SD", lang = "ID", rounds = 6, roundSecs = 30, pauseSecs = 4, rng = Math.random } = {}) {
    this.jenjang = JENJANG.includes(jenjang) ? jenjang : "SD";
    this.lang = LANGS.includes(lang) ? lang : "ID";
    this.rounds = rounds;
    this.roundMs = roundSecs * 1000;
    this.pauseMs = pauseSecs * 1000;
    this.rng = rng;
    this.players = new Map(); // id -> { name, score, solved }
    this.status = "menunggu"; // menunggu | main | jeda | selesai
    this.round = 0;
    this.word = "";
    this.clue = "";
    this.scrambled = "";
    this.lastWord = "";
    this.result = "";
    this.phaseEnds = 0;
    this.firstSolver = null;
    // Kata lain dalam bahasa yang sama boleh diterima bila hurufnya persis sama (anagram yang sah).
    this.dictionary = new Set(JENJANG.flatMap((j) => WORDS[j][this.lang].map(([w]) => w)));
  }

  addPlayer(id, name) {
    this.players.set(id, { name, score: 0, solved: false });
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  start(now) {
    const pool = [...WORDS[this.jenjang][this.lang]];
    for (let i = pool.length - 1; i > 0; i--) {
      const k = Math.floor(this.rng() * (i + 1));
      [pool[i], pool[k]] = [pool[k], pool[i]];
    }
    this.queue = pool.slice(0, this.rounds);
    for (const p of this.players.values()) p.score = 0;
    this.round = 0;
    this.result = "";
    this.nextRound(now);
  }

  nextRound(now) {
    if (this.round >= this.queue.length) return this.finish();
    const [word, clue] = this.queue[this.round];
    this.round += 1;
    this.word = word;
    this.clue = clue;
    this.scrambled = shuffleWord(word, this.rng);
    this.firstSolver = null;
    for (const p of this.players.values()) p.solved = false;
    this.status = "main";
    this.phaseEnds = now + this.roundMs;
  }

  endRound(now) {
    this.lastWord = this.word;
    this.status = "jeda";
    this.phaseEnds = now + this.pauseMs;
  }

  finish() {
    this.status = "selesai";
    const list = [...this.players.values()].sort((a, b) => b.score - a.score);
    if (!list.length) this.result = "Permainan selesai.";
    else if (list.length > 1 && list[0].score === list[1].score) this.result = `Seri dengan ${list[0].score} poin!`;
    else this.result = `${list[0].name} menang dengan ${list[0].score} poin!`;
  }

  // Panggil berkala. Mengembalikan true bila fase berganti.
  tick(now) {
    if (this.status === "main") {
      const all = this.players.size > 0 && [...this.players.values()].every((p) => p.solved);
      if (now >= this.phaseEnds || all) { this.endRound(now); return true; }
    } else if (this.status === "jeda" && now >= this.phaseEnds) {
      this.nextRound(now);
      return true;
    }
    return false;
  }

  secondsLeft(now) {
    return Math.max(0, Math.ceil((this.phaseEnds - now) / 1000));
  }

  // Mengembalikan { ok, points } atau { ok: false, reason }.
  answer(id, raw, now) {
    const p = this.players.get(id);
    if (!p || this.status !== "main") return { ok: false, reason: "bukan-waktunya" };
    if (p.solved) return { ok: false, reason: "sudah" };
    const w = normalize(raw);
    const correct = w === this.word || (letters(w) === letters(this.word) && this.dictionary.has(w));
    if (!correct) return { ok: false, reason: "salah" };
    let points = 5 + Math.ceil(this.secondsLeft(now) / 3);
    if (!this.firstSolver) { this.firstSolver = id; points += 3; }
    p.solved = true;
    p.score += points;
    return { ok: true, points };
  }

  snapshot(now) {
    return {
      status: this.status,
      round: this.round,
      totalRounds: this.rounds,
      scrambled: this.status === "main" ? this.scrambled : "",
      clue: this.status === "main" ? this.clue : "",
      lastWord: this.lastWord,
      secondsLeft: this.secondsLeft(now),
      result: this.result,
      lang: this.lang,
      players: [...this.players.entries()].map(([id, p]) => ({ id, ...p })),
    };
  }
}

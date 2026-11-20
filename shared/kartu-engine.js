// Kartu Kilat: permainan kartu buatan sendiri untuk proyek parenting.
// Tujuan: jadi yang pertama menghabiskan kartu di tangan.
// Kartu boleh dimainkan bila WARNANYA sama dengan warna sekarang, atau HASIL ANGKANYA sama dengan kartu teratas.
// Mode "hitung": kartu angka bertuliskan soal (misalnya "3 + 4"), jadi anak harus menghitung untuk mencocokkan.
// Dipakai di server (online) dan di browser (lawan bot). Waktu "now" selalu diberikan pemanggil.

export const COLORS = ["oranye", "hijau", "biru", "ungu"];
export const COLOR_NAME = { oranye: "Matahari", hijau: "Daun", biru: "Laut", ungu: "Anggur" };
export const KIND_LABEL = { lewati: "Lewati", balik: "Balik Arah", ambil2: "Ambil 2", warna: "Ganti Warna" };
const JENJANG = ["SD", "SMP", "SMA"];
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const randInt = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));

// Soal hitungan yang hasilnya v (1–9), tingkat kesulitan sesuai jenjang.
export function makeExpression(v, jenjang, rng = Math.random) {
  const forms = [];
  // SD: tambah dan kurang
  if (v >= 2) { const a = randInt(1, v - 1, rng); forms.push(`${a} + ${v - a}`); }
  { const b = randInt(1, 9, rng); forms.push(`${v + b} − ${b}`); }
  if (jenjang === "SMP" || jenjang === "SMA") {
    forms.length = 0;
    const b = randInt(2, 6, rng);
    forms.push(`${v * b} ÷ ${b}`);
    const factors = [];
    for (let a = 2; a < v; a++) if (v % a === 0) factors.push(a);
    if (factors.length) { const a = pick(factors, rng); forms.push(`${a} × ${v / a}`); }
    const c = randInt(2, 4, rng), e = randInt(2, 3, rng);
    if (c * e > v) forms.push(`${c} × ${e} − ${c * e - v}`);
    const x = randInt(1, 9, rng);
    forms.push(`${v + x} − ${x}`);
  }
  if (jenjang === "SMA") {
    forms.length = 0;
    forms.push(`√${v * v}`);
    const a = randInt(2, 4, rng);
    if (a * a > v) forms.push(`${a}² − ${a * a - v}`);
    else forms.push(`${a}² + ${v - a * a}`);
    if (v === 1) forms.push("2⁰");
    if (v === 8) forms.push("2³");
    const b = randInt(2, 5, rng);
    forms.push(`${v * b} ÷ ${b}`);
  }
  return pick(forms, rng);
}

export function buildDeck({ jenjang = "SD", mode = "hitung", rng = Math.random } = {}) {
  const deck = [];
  let id = 0;
  for (const color of COLORS) {
    for (let v = 1; v <= 9; v++) {
      for (let k = 0; k < 2; k++) {
        deck.push({ id: id++, color, kind: "angka", value: v, label: mode === "hitung" ? makeExpression(v, jenjang, rng) : String(v) });
      }
    }
    for (const kind of ["lewati", "balik", "ambil2"]) {
      for (let k = 0; k < 2; k++) deck.push({ id: id++, color, kind, value: 0, label: KIND_LABEL[kind] });
    }
  }
  for (let k = 0; k < 4; k++) deck.push({ id: id++, color: null, kind: "warna", value: 0, label: KIND_LABEL.warna });
  return shuffle(deck, rng);
}

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(rng() * (i + 1));
    [a[i], a[k]] = [a[k], a[i]];
  }
  return a;
}

export class KartuEngine {
  constructor({ jenjang = "SD", mode = "hitung", handSize = 6, turnSecs = 30, rng = Math.random } = {}) {
    this.jenjang = JENJANG.includes(jenjang) ? jenjang : "SD";
    this.mode = mode === "biasa" ? "biasa" : "hitung";
    this.handSize = handSize;
    this.turnMs = turnSecs ? turnSecs * 1000 : Infinity;
    this.rng = rng;
    this.players = []; // { id, name, hand: [] }
    this.status = "menunggu"; // menunggu | main | selesai
    this.deck = [];
    this.discard = [];
    this.color = null;
    this.turn = 0;
    this.dir = 1;
    this.drew = false; // sudah mengambil kartu di giliran ini?
    this.turnEnds = Infinity;
    this.message = "";
    this.result = "";
    this.winner = null;
  }

  // ---------- pemain ----------
  addPlayer(id, name) {
    if (this.status !== "menunggu") return false;
    this.players.push({ id, name, hand: [] });
    return true;
  }

  removePlayer(id, now = 0) {
    const i = this.players.findIndex((p) => p.id === id);
    if (i < 0) return;
    const [p] = this.players.splice(i, 1);
    if (this.status !== "main") return;
    this.deck.unshift(...p.hand); // kartunya kembali ke tumpukan
    if (this.players.length < 2) {
      this.finish(this.players[0] || null, `${p.name} keluar.`);
      return;
    }
    if (i < this.turn) this.turn -= 1;
    else if (i === this.turn) {
      if (this.dir === -1) this.turn -= 1;
      this.turn = ((this.turn % this.players.length) + this.players.length) % this.players.length;
      this.drew = false;
      this.turnEnds = now + this.turnMs;
    }
    this.turn %= this.players.length;
    this.message = `${p.name} keluar dari meja.`;
  }

  find(id) {
    return this.players.find((p) => p.id === id);
  }

  current() {
    return this.players[this.turn];
  }

  // ---------- jalannya permainan ----------
  start(now) {
    this.deck = buildDeck({ jenjang: this.jenjang, mode: this.mode, rng: this.rng });
    this.discard = [];
    for (const p of this.players) p.hand = this.deck.splice(0, this.handSize);
    // Kartu pertama di meja harus kartu angka.
    const first = this.deck.findIndex((c) => c.kind === "angka");
    const [top] = this.deck.splice(first, 1);
    this.discard.push(top);
    this.color = top.color;
    this.turn = Math.floor(this.rng() * this.players.length);
    this.dir = 1;
    this.drew = false;
    this.status = "main";
    this.result = "";
    this.winner = null;
    this.turnEnds = now + this.turnMs;
    this.message = `Permainan dimulai! Giliran ${this.current().name}.`;
  }

  top() {
    return this.discard[this.discard.length - 1];
  }

  canPlay(card) {
    if (!card || this.status !== "main") return false;
    if (card.kind === "warna") return true;
    if (card.color === this.color) return true;
    const t = this.top();
    if (card.kind === "angka" && t.kind === "angka") return card.value === t.value;
    return card.kind !== "angka" && card.kind === t.kind;
  }

  index(offset) {
    const n = this.players.length;
    return (((this.turn + this.dir * offset) % n) + n) % n;
  }

  advance(steps, now) {
    this.turn = this.index(steps);
    this.drew = false;
    this.turnEnds = now + this.turnMs;
  }

  drawOne() {
    if (!this.deck.length) {
      // Kocok ulang tumpukan buang (kecuali kartu teratas).
      const top = this.discard.pop();
      this.deck = shuffle(this.discard, this.rng);
      this.discard = [top];
    }
    return this.deck.pop() || null;
  }

  checkTurn(id) {
    if (this.status !== "main") return "bukan-waktunya";
    if (this.current()?.id !== id) return "bukan-giliran";
    return null;
  }

  play(id, cardId, chosenColor, now) {
    const err = this.checkTurn(id);
    if (err) return { ok: false, reason: err };
    const p = this.current();
    const i = p.hand.findIndex((c) => c.id === cardId);
    if (i < 0) return { ok: false, reason: "tidak-ada" };
    const card = p.hand[i];
    if (!this.canPlay(card)) return { ok: false, reason: "tidak-cocok" };
    if (card.kind === "warna" && !COLORS.includes(chosenColor)) return { ok: false, reason: "pilih-warna" };

    p.hand.splice(i, 1);
    this.discard.push(card);
    this.color = card.kind === "warna" ? chosenColor : card.color;

    if (!p.hand.length) {
      this.finish(p, `${p.name} menghabiskan semua kartu!`);
      return { ok: true };
    }

    const two = this.players.length === 2;
    if (card.kind === "lewati") {
      this.message = `${p.name} memainkan Lewati. ${this.players[this.index(1)].name} dilewati.`;
      this.advance(2, now);
    } else if (card.kind === "balik") {
      this.dir *= -1;
      this.message = `${p.name} membalik arah.`;
      this.advance(two ? 2 : 1, now);
    } else if (card.kind === "ambil2") {
      const victim = this.players[this.index(1)];
      for (let k = 0; k < 2; k++) { const c = this.drawOne(); if (c) victim.hand.push(c); }
      this.message = `${victim.name} mengambil 2 kartu dan dilewati.`;
      this.advance(2, now);
    } else if (card.kind === "warna") {
      this.message = `${p.name} mengganti warna menjadi ${COLOR_NAME[chosenColor]}.`;
      this.advance(1, now);
    } else {
      this.message = `${p.name} memainkan ${card.label}${this.mode === "hitung" ? ` (= ${card.value})` : ""}.`;
      this.advance(1, now);
    }
    if (p.hand.length === 1) this.message += ` ${p.name} tinggal 1 kartu!`;
    return { ok: true };
  }

  // Ambil 1 kartu. Bila tidak bisa dimainkan, giliran otomatis berpindah.
  draw(id, now) {
    const err = this.checkTurn(id);
    if (err) return { ok: false, reason: err };
    if (this.drew) return { ok: false, reason: "sudah-ambil" };
    const p = this.current();
    const card = this.drawOne();
    this.drew = true;
    if (!card) {
      this.message = `Kartu habis. ${p.name} lewat.`;
      this.advance(1, now);
      return { ok: true, card: null, playable: false };
    }
    p.hand.push(card);
    const playable = this.canPlay(card);
    if (playable) {
      this.message = `${p.name} mengambil 1 kartu.`;
    } else {
      this.message = `${p.name} mengambil 1 kartu lalu lewat.`;
      this.advance(1, now);
    }
    return { ok: true, card, playable };
  }

  pass(id, now) {
    const err = this.checkTurn(id);
    if (err) return { ok: false, reason: err };
    if (!this.drew) return { ok: false, reason: "ambil-dulu" };
    this.message = `${this.current().name} lewat.`;
    this.advance(1, now);
    return { ok: true };
  }

  // Waktu giliran habis: ambil kartu lalu lewat.
  tick(now) {
    if (this.status !== "main" || now < this.turnEnds) return false;
    const id = this.current().id;
    if (!this.drew) this.draw(id, now);
    if (this.status === "main" && this.current().id === id) this.pass(id, now);
    this.message = "Waktu habis. " + this.message;
    return true;
  }

  finish(winner, text) {
    this.status = "selesai";
    this.winner = winner?.id || null;
    this.result = winner ? `${text} ${winner.name} menang!` : text;
    this.message = this.result;
    this.turnEnds = Infinity;
  }

  handOf(id) {
    return this.find(id)?.hand.map((c) => ({ ...c })) || [];
  }

  publicState(now) {
    return {
      status: this.status,
      mode: this.mode,
      top: this.top() || null,
      color: this.color,
      turnId: this.status === "main" ? this.current()?.id || "" : "",
      dir: this.dir,
      drew: this.drew,
      deckCount: this.deck.length,
      turnLeft: Number.isFinite(this.turnEnds) ? Math.max(0, Math.ceil((this.turnEnds - now) / 1000)) : 0,
      message: this.message,
      result: this.result,
      winner: this.winner,
      players: this.players.map((p) => ({ id: p.id, name: p.name, count: p.hand.length })),
    };
  }
}

// ---------- bot ----------
// Mengembalikan langkah bot: { type: "play", cardId, color } | { type: "draw" } | { type: "pass" }.
export function botMove(engine, id, level = 2, rng = Math.random) {
  const p = engine.find(id);
  if (!p || engine.current()?.id !== id) return null;
  const playable = p.hand.filter((c) => engine.canPlay(c));
  if (!playable.length) return engine.drew ? { type: "pass" } : { type: "draw" };
  // Pemula kadang "tidak melihat" kartu yang cocok.
  if (level === 1 && !engine.drew && rng() < 0.25) return { type: "draw" };

  const count = {};
  for (const c of p.hand) if (c.color) count[c.color] = (count[c.color] || 0) + 1;
  const bestColor = COLORS.slice().sort((a, b) => (count[b] || 0) - (count[a] || 0))[0];

  let card;
  if (level === 1) {
    card = pick(playable, rng);
  } else {
    const nextCount = engine.players[engine.index(1)].hand.length;
    const score = (c) => {
      let s = 0;
      if (c.kind === "warna") s -= 20; // simpan Ganti Warna untuk akhir
      if ((c.kind === "ambil2" || c.kind === "lewati") && nextCount <= 2) s += 15;
      if (c.kind !== "angka" && c.kind !== "warna") s += 3;
      if (level === 3 && c.color) s += (count[c.color] || 0) * 2; // buang warna yang paling banyak dipegang
      return s + rng();
    };
    card = playable.slice().sort((a, b) => score(b) - score(a))[0];
  }
  const color = card.kind === "warna" ? (level === 1 ? pick(COLORS, rng) : bestColor) : undefined;
  return { type: "play", cardId: card.id, color };
}

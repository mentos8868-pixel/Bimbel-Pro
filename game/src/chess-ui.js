// Papan catur 2D yang muncul saat anak duduk di meja catur.
// Mode "bot": main lokal melawan bot. Mode "online": langkah divalidasi server.
import { Chess } from "chess.js";
import { bestMove } from "./bot.js";
import { reportResult } from "./api.js";

const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const FILES = "abcdefgh";
const LEVEL_NAME = { 1: "Bot Pemula", 2: "Bot Menengah", 3: "Bot Mahir" };

const $ = (id) => document.getElementById(id);

export class ChessUI {
  // onBot: dipanggil saat pemain memilih "Lawan bot saja" dari ruang tunggu (membuka pilihan bot).
  constructor({ onClose, onBot }) {
    this.onClose = onClose;
    this.onBot = onBot;
    this.el = $("chess");
    this.boardEl = $("board");
    this.chess = new Chess();
    this.selected = null;
    this.hintSquares = [];
    this.thinking = false;

    $("chess-close").onclick = () => this.close();
    $("chess-resign").onclick = () => this.resign();
    $("chess-hint").onclick = () => this.hint();

    // Ruang tunggu (permainan online): Siap / Batal siap, lawan bot, atau berdiri.
    $("tunggu-siap").onclick = () => {
      const s = this.room?.state;
      if (!s || s.status !== "siap") return;
      const siapSaya = s.white === this.room.sessionId ? s.whiteReady : s.blackReady;
      this.room.send("siap", !siapSaya);
    };
    $("tunggu-keluar").onclick = () => this.close();
    $("tunggu-bot").onclick = () => {
      this.tinggalkanRoom();
      $("chess-tunggu").hidden = true;
      this.mode = null;
      this.onBot?.();
    };
  }

  tinggalkanRoom() {
    if (!this.room) return;
    this.room.removeAllListeners();
    this.room.leave();
    this.room = null;
  }

  // Ruang tunggu tampil selama permainan online belum dimulai (menunggu lawan, atau menunggu keduanya Siap).
  gambarTunggu(s) {
    const tunggu = this.mode === "online" && (s.status === "menunggu" || s.status === "siap");
    $("chess-tunggu").hidden = !tunggu;
    this.el.hidden = tunggu || this.mode == null;
    if (!tunggu) return;
    const saya = this.room.sessionId;
    const pemain = [[s.white, s.whiteName, s.whiteReady], [s.black, s.blackName, s.blackReady]].filter(([id]) => id);
    const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const baris = pemain.map(([id, nama, siap]) =>
      `<li class="${siap ? "siap" : ""}"><span>${esc(nama)}${id === saya ? " <span class=\"muted\">(kamu)</span>" : ""}</span><b>${siap ? "✅ Siap" : "⏳ Belum siap"}</b></li>`);
    if (pemain.length < 2) {
      baris.push(`<li class="kosong"><span>${this.privat ? `Bagikan kode meja <b>${esc(this.room.roomId)}</b> ke lawanmu` : "Menunggu lawan duduk di kursi seberang…"}</span></li>`);
    }
    $("tunggu-pemain").innerHTML = baris.join("");
    const siapSaya = s.white === saya ? s.whiteReady : s.blackReady;
    const lawanSiap = s.white === saya ? s.blackReady : s.whiteReady;
    $("tunggu-info").textContent = s.status === "menunggu"
      ? "Tunggu lawan datang, lalu tekan Siap bersama-sama."
      : siapSaya ? (lawanSiap ? "Mulai!" : "Menunggu lawan menekan Siap…") : "Lawan sudah datang. Tekan Siap kalau kamu sudah siap.";
    $("tunggu-siap").disabled = s.status !== "siap";
    $("tunggu-siap").textContent = siapSaya ? "Batal siap" : "✅ Siap";
    $("tunggu-siap").classList.toggle("primary", !siapSaya);
  }

  // ---------- mulai permainan ----------
  startBot(profile, level) {
    this.mode = "bot";
    this.level = level;
    this.profile = profile;
    this.myColor = "w";
    this.chess = new Chess();
    this.lastMove = "";
    this.result = "";
    this.reported = false;
    this.names = { w: profile.name, b: LEVEL_NAME[level] };
    this.show();
  }

  startOnline(profile, room, privat = true) {
    this.privat = privat;
    this.mode = "online";
    this.profile = profile;
    this.room = room;
    this.result = "";
    this.reported = false;
    room.onStateChange((s) => this.syncFromServer(s));
    room.onMessage("ditolak", (msg) => this.flash(msg));
    room.onLeave(() => {
      if (this.mode === "online" && !this.result) this.flash("Koneksi meja terputus.");
    });
    this.sebelumnya = "";
    this.syncFromServer(room.state);
    this.show();
  }

  syncFromServer(s) {
    if (!s || !s.fen) return;
    this.chess.load(s.fen);
    this.myColor = s.black === this.room.sessionId ? "b" : "w";
    this.names = { w: s.whiteName || "…", b: s.blackName || "…" };
    this.lastMove = s.lastMove;
    this.serverStatus = s.status;   // dipakai juga untuk tahu kapan permainan baru dimulai
    this.result = s.status === "selesai" ? s.result : "";
    const mulai = this.serverStatus === "main" && this.sebelumnya && this.sebelumnya !== "main";
    this.sebelumnya = s.status;
    this.gambarTunggu(s);
    if (mulai) this.flash("Kalian berdua siap. Mulai!");
    if (s.status === "selesai") this.report(s.winner === this.room.sessionId ? "menang" : s.winner ? "kalah" : "seri");
    this.render();
  }

  show() {
    this.selected = null;
    this.hintSquares = [];
    this.thinking = false;
    $("chess-hint").hidden = !(this.profile.gameJenjang === "SD" && this.mode === "bot");
    // Online: papan baru tampil setelah ruang tunggu selesai (kedua pemain Siap).
    this.el.hidden = this.mode === "online" && this.serverStatus !== "main" && this.serverStatus !== "selesai";
    this.render();
  }

  close() {
    clearTimeout(this.botTimer);
    if (this.mode === "online") this.tinggalkanRoom();
    this.mode = null;
    $("chess-tunggu").hidden = true;
    this.el.hidden = true;
    this.onClose?.();
  }

  // ---------- aturan giliran ----------
  isMyTurn() {
    if (this.result || this.thinking) return false;
    if (this.mode === "online" && this.serverStatus !== "main") return false;
    return this.chess.turn() === this.myColor;
  }

  onSquareClick(sq) {
    if (!this.isMyTurn()) return;
    const piece = this.chess.get(sq);
    if (this.selected) {
      const legal = this.chess.moves({ square: this.selected, verbose: true }).find((m) => m.to === sq);
      if (legal) return this.play(this.selected, sq);
    }
    this.selected = piece && piece.color === this.myColor ? sq : null;
    this.hintSquares = [];
    this.render();
  }

  play(from, to) {
    this.selected = null;
    this.hintSquares = [];
    if (this.mode === "online") {
      this.room.send("move", { from, to, promotion: "q" });
      return;
    }
    const m = this.chess.move({ from, to, promotion: "q" });
    this.lastMove = m.from + m.to;
    this.checkEnd();
    this.render();
    if (!this.result) this.botTurn();
  }

  botTurn() {
    this.thinking = true;
    this.render();
    // Beri waktu layar menggambar dulu sebelum bot berpikir.
    this.botTimer = setTimeout(() => {
      if (this.mode !== "bot") return;
      const m = bestMove(this.chess.fen(), this.level);
      if (m) {
        this.chess.move(m);
        this.lastMove = m.from + m.to;
      }
      this.thinking = false;
      this.checkEnd();
      this.render();
    }, 350);
  }

  checkEnd() {
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === "w" ? this.names.b : this.names.w;
      this.result = `Skakmat! ${winner} menang.`;
      this.report(this.chess.turn() === this.myColor ? "kalah" : "menang");
    } else if (this.chess.isDraw()) {
      this.result = "Seri.";
      this.report("seri");
    }
  }

  resign() {
    if (this.result) return;
    if (this.mode === "online") {
      if (this.serverStatus === "main") this.room.send("resign");
      else this.close();
      return;
    }
    clearTimeout(this.botTimer);
    this.thinking = false;
    this.result = `${this.profile.name} menyerah. Coba lagi ya!`;
    this.report("kalah");
    this.render();
  }

  report(outcome) {
    if (this.reported) return;
    this.reported = true;
    reportResult("catur", this.mode, outcome);
  }

  hint() {
    if (!this.isMyTurn()) return;
    const m = bestMove(this.chess.fen(), 2);
    if (!m) return;
    this.selected = null;
    this.hintSquares = [m.from, m.to];
    this.render();
  }

  flash(text) {
    $("chess-status").textContent = text;
  }

  // ---------- gambar papan ----------
  render() {
    if (this.el.hidden) return;
    const flip = this.myColor === "b";
    const opp = this.myColor === "w" ? "b" : "w";
    const topName = document.createElement("span");
    topName.textContent = `${opp === "w" ? "Putih" : "Hitam"}: ${this.names[opp]}`;
    $("chess-top").replaceChildren(topName);
    const bottomName = document.createElement("span");
    bottomName.textContent = `${this.myColor === "w" ? "Putih" : "Hitam"}: ${this.names[this.myColor]} (kamu)`;
    $("chess-bottom").replaceChildren(bottomName);

    const targets = new Map();
    if (this.selected) {
      for (const m of this.chess.moves({ square: this.selected, verbose: true })) targets.set(m.to, !!m.captured);
    }
    const last = this.lastMove ? [this.lastMove.slice(0, 2), this.lastMove.slice(2, 4)] : [];

    const frag = document.createDocumentFragment();
    for (let i = 0; i < 64; i++) {
      const r = flip ? 7 - Math.floor(i / 8) : Math.floor(i / 8);
      const c = flip ? 7 - (i % 8) : i % 8;
      const sq = FILES[c] + (8 - r);
      const d = document.createElement("div");
      d.className = "sq " + ((r + c) % 2 ? "d" : "l");
      if (sq === this.selected) d.classList.add("sel");
      if (last.includes(sq)) d.classList.add("last");
      if (this.hintSquares.includes(sq)) d.classList.add("hint");
      if (targets.has(sq)) d.classList.add(targets.get(sq) ? "capture" : "move");
      const p = this.chess.get(sq);
      if (p) {
        const s = document.createElement("span");
        s.className = p.color === "w" ? "pw" : "pb";
        s.textContent = GLYPH[p.type];
        d.appendChild(s);
      }
      d.onclick = () => this.onSquareClick(sq);
      frag.appendChild(d);
    }
    this.boardEl.replaceChildren(frag);

    let status;
    if (this.result) status = this.result;
    else if (this.mode === "online" && this.serverStatus === "menunggu")
      status = this.privat ? `Menunggu lawan… Kode meja privat: ${this.room.roomId}` : "Menunggu lawan di meja ini…";
    else if (this.thinking) status = "Bot sedang berpikir…";
    else if (this.chess.turn() === this.myColor) status = this.chess.inCheck() ? "Skak! Giliranmu." : "Giliranmu.";
    else status = this.chess.inCheck() ? "Skak! Giliran lawan." : "Giliran lawan.";
    $("chess-status").textContent = status;
    $("chess-resign").textContent = this.result ? "Selesai" : "Menyerah";
    $("chess-resign").disabled = !!this.result;
  }
}

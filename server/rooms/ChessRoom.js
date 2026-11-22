import colyseus from "colyseus";
import { authTable } from "../room-auth.js";

import { Chess } from "chess.js";

const { Room } = colyseus;
import { Schema, defineTypes } from "@colyseus/schema";

export class ChessState extends Schema {}
defineTypes(ChessState, {
  fen: "string",
  white: "string", // sessionId pemain putih
  black: "string", // sessionId pemain hitam
  whiteName: "string",
  blackName: "string",
  status: "string", // menunggu | siap (ruang tunggu, dua pemain) | main | selesai
  whiteReady: "boolean", // ruang tunggu: pemain putih sudah menekan Siap
  blackReady: "boolean",
  result: "string", // teks hasil untuk ditampilkan
  lastMove: "string", // contoh "e2e4"
  winner: "string", // sessionId pemenang; kosong bila seri
});

// Kode meja mudah diketik anak: 4 huruf tanpa huruf yang mirip angka.
const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const buatKode = () =>
  Array.from({ length: 4 }, () => HURUF[Math.floor(Math.random() * HURUF.length)]).join("");

export class ChessRoom extends Room {
  maxClients = 2;

  onCreate(options = {}) {
    this.roomId = buatKode();
    if (options.private) this.setPrivate(true);

    this.chess = new Chess();
    const s = new ChessState();
    s.fen = this.chess.fen();
    s.white = "";
    s.black = "";
    s.whiteName = "";
    s.blackName = "";
    s.status = "menunggu";
    s.whiteReady = false;
    s.blackReady = false;
    s.result = "";
    s.lastMove = "";
    s.winner = "";
    this.setState(s);

    this.onMessage("move", (client, data = {}) => this.handleMove(client, data));
    // Ruang tunggu: permainan baru mulai setelah kedua pemain menekan Siap.
    this.onMessage("siap", (client, siap) => {
      const st = this.state;
      if (st.status !== "siap") return;
      const nilai = siap !== false;
      if (client.sessionId === st.white) st.whiteReady = nilai;
      else if (client.sessionId === st.black) st.blackReady = nilai;
      if (st.whiteReady && st.blackReady) st.status = "main";
    });
    this.onMessage("resign", (client) => {
      if (this.state.status !== "main") return;
      const nama = client.sessionId === this.state.white ? this.state.whiteName : this.state.blackName;
      this.finish(`${nama} menyerah.`, client.sessionId === this.state.white ? this.state.black : this.state.white);
    });
  }

  handleMove(client, { from, to, promotion } = {}) {
    const s = this.state;
    if (s.status !== "main") return;
    const giliran = this.chess.turn() === "w" ? s.white : s.black;
    if (client.sessionId !== giliran) return;
    try {
      const m = this.chess.move({ from, to, promotion: promotion || "q" });
      s.fen = this.chess.fen();
      s.lastMove = m.from + m.to;
    } catch {
      client.send("ditolak", "Langkah tidak sah.");
      return;
    }
    if (this.chess.isCheckmate()) {
      const pemenang = this.chess.turn() === "w" ? s.blackName : s.whiteName;
      this.finish(`Skakmat! ${pemenang} menang.`, this.chess.turn() === "w" ? s.black : s.white);
    } else if (this.chess.isDraw()) {
      this.finish("Seri.");
    }
  }

  finish(text, winner = "") {
    this.state.status = "selesai";
    this.state.result = text;
    this.state.winner = winner;
  }

  onAuth(client, options) {
    return authTable(this, options);
  }

  onJoin(client) {
    const nama = client.auth.name;
    const s = this.state;
    if (!s.white) {
      s.white = client.sessionId;
      s.whiteName = nama;
    } else {
      s.black = client.sessionId;
      s.blackName = nama;
    }
    if (s.white && s.black) {
      s.status = "siap";   // ruang tunggu sampai keduanya menekan Siap
      s.whiteReady = false;
      s.blackReady = false;
      this.lock();
    }
  }

  onLeave(client) {
    const s = this.state;
    if (s.status === "main") {
      const yangTinggal = client.sessionId === s.white ? s.blackName : s.whiteName;
      this.finish(`Lawan keluar. ${yangTinggal} menang.`, client.sessionId === s.white ? s.black : s.white);
    } else if (s.status === "siap") {
      // Keluar dari ruang tunggu sebelum mulai: kursinya kosong lagi, pemain yang tinggal menunggu lawan baru.
      if (client.sessionId === s.white) { s.white = ""; s.whiteName = ""; } else { s.black = ""; s.blackName = ""; }
      s.whiteReady = false;
      s.blackReady = false;
      s.status = "menunggu";
      this.unlock();
    } else if (s.status === "menunggu") {
      // Pembuat meja pergi sebelum lawan datang: tutup meja.
      this.disconnect();
    }
  }
}

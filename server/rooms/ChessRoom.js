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
  status: "string", // menunggu | main | selesai
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
    s.result = "";
    s.lastMove = "";
    s.winner = "";
    this.setState(s);

    this.onMessage("move", (client, data = {}) => this.handleMove(client, data));
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
      s.status = "main";
      this.lock();
    }
  }

  onLeave(client) {
    const s = this.state;
    if (s.status === "main") {
      const yangTinggal = client.sessionId === s.white ? s.blackName : s.whiteName;
      this.finish(`Lawan keluar. ${yangTinggal} menang.`, client.sessionId === s.white ? s.black : s.white);
    } else if (s.status === "menunggu") {
      // Pembuat meja pergi sebelum lawan datang: tutup meja.
      this.disconnect();
    }
  }
}

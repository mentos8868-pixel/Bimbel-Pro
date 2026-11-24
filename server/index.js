// Server Bimbel Pro: API akun (HTTP /api/...) dan server multiplayer (Colyseus) pada port yang sama.
import http from "node:http";
import colyseus from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { handleApi } from "./accounts.js";
import { serveStatic, staticAktif } from "./static.js";
import { ArenaRoom } from "./rooms/ArenaRoom.js";
import { ChessRoom } from "./rooms/ChessRoom.js";
import { ScrambleRoom } from "./rooms/ScrambleRoom.js";
import { KartuRoom } from "./rooms/KartuRoom.js";
import { MatematikaRoom } from "./rooms/MatematikaRoom.js";

const { Server } = colyseus;
// Sengaja tidak memakai PORT, karena alat pengembangan sering mengisinya untuk server web.
const PORT = Number(process.env.GAME_SERVER_PORT || 2567);

const httpServer = http.createServer((req, res) => {
  handleApi(req, res).then((handled) => {
    if (!handled && !res.headersSent && !req.url.includes("/matchmake/") && !serveStatic(req, res)) {
      res.writeHead(404);
      res.end();
    }
  });
});

const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define("arena", ArenaRoom);
// Cari lawan hanya dengan pemain sejenjang (dan sebahasa / sejenis kartu).
// Catur: satu ruang per meja arena (siapa boleh semeja diperiksa di room-auth.js).
gameServer.define("chess", ChessRoom).filterBy(["meja"]);
// Scramble dan Kartu juga satu ruang per meja; bahasa/jenis kartu mengikuti pemain pertama.
gameServer.define("scramble", ScrambleRoom).filterBy(["meja"]);
gameServer.define("kartu", KartuRoom).filterBy(["meja"]);
gameServer.define("matematika", MatematikaRoom).filterBy(["meja"]);

gameServer.listen(PORT).then(() => {
  console.log(`Server Bimbel Pro berjalan di http://localhost:${PORT} (API) dan ws://localhost:${PORT} (game)`);
  if (staticAktif) console.log(`Halaman web (game/dist) juga dilayani di http://localhost:${PORT}`);
});

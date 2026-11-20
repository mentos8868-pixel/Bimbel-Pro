// Server Bimbel Pro: API akun (HTTP /api/...) dan server multiplayer (Colyseus) pada port yang sama.
import http from "node:http";
import colyseus from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { handleApi } from "./accounts.js";
import { ArenaRoom } from "./rooms/ArenaRoom.js";
import { ChessRoom } from "./rooms/ChessRoom.js";
import { ScrambleRoom } from "./rooms/ScrambleRoom.js";
import { KartuRoom } from "./rooms/KartuRoom.js";

const { Server } = colyseus;
// Sengaja tidak memakai PORT, karena alat pengembangan sering mengisinya untuk server web.
const PORT = Number(process.env.GAME_SERVER_PORT || 2567);

const httpServer = http.createServer((req, res) => {
  handleApi(req, res).then((handled) => {
    if (!handled && !res.headersSent && !req.url.includes("/matchmake/")) {
      res.writeHead(404);
      res.end();
    }
  });
});

const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define("arena", ArenaRoom);
// Cari lawan hanya dengan pemain sejenjang (dan sebahasa / sejenis kartu).
gameServer.define("chess", ChessRoom).filterBy(["jenjang"]);
gameServer.define("scramble", ScrambleRoom).filterBy(["jenjang", "lang"]);
gameServer.define("kartu", KartuRoom).filterBy(["jenjang", "mode"]);

gameServer.listen(PORT).then(() => {
  console.log(`Server Bimbel Pro berjalan di http://localhost:${PORT} (API) dan ws://localhost:${PORT} (game)`);
});

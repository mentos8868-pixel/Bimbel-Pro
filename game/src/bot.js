// Bot catur sederhana: minimax dengan alpha-beta.
// Level 1 = Pemula (sering acak), 2 = Menengah, 3 = Mahir.
import { Chess } from "chess.js";

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Bonus kecil untuk bidak di tengah papan.
const CENTER = [0, 1, 2, 3, 3, 2, 1, 0];

function evaluate(chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -100000 : 100000;
  if (chess.isDraw()) return 0;
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      let v = VALUE[sq.type];
      if (sq.type !== "k") v += (CENTER[r] + CENTER[c]) * (sq.type === "p" ? 3 : 4);
      if (sq.type === "p") v += sq.color === "w" ? (6 - r) * 6 : (r - 1) * 6;
      score += sq.color === "w" ? v : -v;
    }
  }
  return score;
}

function orderMoves(moves) {
  // Coba langkah makan dan promosi lebih dulu supaya pencarian lebih cepat.
  return moves.sort((a, b) => (b.captured ? VALUE[b.captured] : 0) + (b.promotion ? 800 : 0)
    - ((a.captured ? VALUE[a.captured] : 0) + (a.promotion ? 800 : 0)));
}

function search(chess, depth, alpha, beta) {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);
  const max = chess.turn() === "w";
  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = max ? -Infinity : Infinity;
  for (const m of moves) {
    chess.move(m);
    const v = search(chess, depth - 1, alpha, beta);
    chess.undo();
    if (max) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

export function bestMove(fen, level = 2) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  if (level === 1 && Math.random() < 0.45) return moves[Math.floor(Math.random() * moves.length)];
  const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
  const max = chess.turn() === "w";
  let best = [];
  let bestScore = max ? -Infinity : Infinity;
  for (const m of orderMoves(moves)) {
    chess.move(m);
    // Batas alpha-beta dari langkah terbaik sejauh ini (selisih 1 agar langkah setara tetap terkumpul).
    const v = max
      ? search(chess, depth - 1, bestScore - 1, Infinity)
      : search(chess, depth - 1, -Infinity, bestScore + 1);
    chess.undo();
    if ((max && v > bestScore) || (!max && v < bestScore)) { bestScore = v; best = [m]; }
    else if (v === bestScore) best.push(m);
  }
  // Pilih acak di antara langkah yang sama bagusnya supaya permainan tidak monoton.
  return best[Math.floor(Math.random() * best.length)];
}

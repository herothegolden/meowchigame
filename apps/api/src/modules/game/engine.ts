// Server-authoritative match-3 core.
// Deterministic PRNG + board simulation to verify client-submitted moves.

export type LevelSpec = {
  levelId: string;
  seed: string;
  rows: number;
  cols: number;
  colors: number; // tile types
};

export type Move = {
  type: "swap";
  a: [number, number]; // [r,c]
  b: [number, number]; // [r,c]
};

export type SimResult = {
  score: number;
  totalCombos: number;
  movesApplied: number;
};

function mulberry32(seedInt: number) {
  let t = seedInt >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(s: string): number {
  // Simple djb2
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}

function makeRng(seed: string) {
  return mulberry32(hashStringToInt(seed));
}

function inBounds(r: number, c: number, rows: number, cols: number) {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function isAdjacent(a: [number, number], b: [number, number]) {
  const dr = Math.abs(a[0] - b[0]);
  const dc = Math.abs(a[1] - b[1]);
  return (dr + dc) === 1;
}

export function generateBoard(spec: LevelSpec): number[][] {
  const rng = makeRng(spec.seed);
  const board: number[][] = Array.from({ length: spec.rows }, () => Array(spec.cols).fill(0));
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      let val: number;
      do {
        val = Math.floor(rng() * spec.colors);
      } while (
        (c >= 2 && board[r][c-1] === val && board[r][c-2] === val) ||
        (r >= 2 && board[r-1][c] === val && board[r-2][c] === val)
      );
      board[r][c] = val;
    }
  }
  return board;
}

function findMatches(board: number[][]): boolean[][] {
  const rows = board.length, cols = board[0].length;
  const mark: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  // Rows
  for (let r = 0; r < rows; r++) {
    let count = 1;
    for (let c = 1; c <= cols; c++) {
      if (c < cols && board[r][c] === board[r][c-1] && board[r][c] !== -1) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = c - count; k < c; k++) mark[r][k] = true;
        }
        count = 1;
      }
    }
  }
  // Cols
  for (let c = 0; c < cols; c++) {
    let count = 1;
    for (let r = 1; r <= rows; r++) {
      if (r < rows && board[r][c] === board[r-1][c] && board[r][c] !== -1) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = r - count; k < r; k++) mark[k][c] = true;
        }
        count = 1;
      }
    }
  }
  return mark;
}

function clearMarked(board: number[][], mark: boolean[][]): number {
  const rows = board.length, cols = board[0].length;
  let cleared = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mark[r][c]) {
        board[r][c] = -1; // empty
        cleared++;
      }
    }
  }
  return cleared;
}

function applyGravity(board: number[][]) {
  const rows = board.length, cols = board[0].length;
  for (let c = 0; c < cols; c++) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r][c] !== -1) {
        board[write][c] = board[r][c];
        write--;
      }
    }
    for (let r = write; r >= 0; r--) board[r][c] = -1;
  }
}

function refill(board: number[][], rng: () => number, colors: number) {
  const rows = board.length, cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === -1) board[r][c] = Math.floor(rng() * colors);
    }
  }
}

export function simulate(spec: LevelSpec, moves: Move[], maxMoves = 30): SimResult {
  const rng = makeRng(spec.seed);
  const board = generateBoard(spec);
  let score = 0;
  let combos = 0;
  let applied = 0;

  const clampMoves = Array.isArray(moves) ? moves.slice(0, maxMoves) : [];

  for (const mv of clampMoves) {
    if (mv.type !== "swap") continue;
    const [a, b] = [mv.a, mv.b];
    if (!isAdjacent(a, b)) continue;
    if (!inBounds(a[0], a[1], spec.rows, spec.cols) || !inBounds(b[0], b[1], spec.rows, spec.cols)) continue;

    // perform swap
    const tmp = board[a[0]][a[1]];
    board[a[0]][a[1]] = board[b[0]][b[1]];
    board[b[0]][b[1]] = tmp;

    // if no match results, swap back and skip
    let mark = findMatches(board);
    const anyMatch = mark.some(row => row.some(v => v));
    if (!anyMatch) {
      // swap back
      const tmp2 = board[a[0]][a[1]];
      board[a[0]][a[1]] = board[b[0]][b[1]];
      board[b[0]][b[1]] = tmp2;
      continue;
    }

    applied++;

    // resolve cascades
    while (true) {
      mark = findMatches(board);
      const cleared = clearMarked(board, mark);
      if (cleared === 0) break;
      combos++;
      // simple score formula: 10 per tile, combo multiplier
      score += cleared * 10 * Math.min(1 + Math.floor(combos / 2), 5);
      applyGravity(board);
      refill(board, rng, spec.colors);
    }
  }

  return { score, totalCombos: combos, movesApplied: applied };
}

// Simple progression curve
export function scoreToXp(score: number): number {
  return Math.max(0, Math.floor(score)); // 1:1 for now
}
export function scoreToPoints(score: number): number {
  // Economy soft cap: 1 pt per 50 score (rounded down)
  return Math.max(0, Math.floor(score / 50));
}

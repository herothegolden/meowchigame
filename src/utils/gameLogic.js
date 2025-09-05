// The size of our game board (8x8)
export const BOARD_SIZE = 8;

// The different types of game pieces, represented by colors for now
export const PIECE_TYPES = [
  '#FF5733', // Chocolate Chip (Orange)
  '#C70039', // Marshmallow (Red)
  '#900C3F', // Sugar Crystal (Purple)
  '#581845', // Cookie Cutter (Dark Purple)
  '#2A7B88', // Milk Drop (Teal)
];

// Each match is worth 10 points
export const SCORE_PER_MATCH = 10;

/**
 * Checks the entire board for any horizontal or vertical matches of 3 or more.
 * @param {string[][]} board - The 2D array representing the board.
 * @returns {Set<number>} A set of flat indices for the pieces that are part of a match.
 */
export const checkForMatches = (board) => {
  const matches = new Set();
  const flatBoard = board.flat();

  // Horizontal check
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 2; c++) {
      const index1 = r * BOARD_SIZE + c;
      const index2 = r * BOARD_SIZE + c + 1;
      const index3 = r * BOARD_SIZE + c + 2;
      if (flatBoard[index1] && flatBoard[index1] === flatBoard[index2] && flatBoard[index2] === flatBoard[index3]) {
        matches.add(index1);
        matches.add(index2);
        matches.add(index3);
      }
    }
  }

  // Vertical check
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE - 2; r++) {
      const index1 = r * BOARD_SIZE + c;
      const index2 = (r + 1) * BOARD_SIZE + c;
      const index3 = (r + 2) * BOARD_SIZE + c;
      if (flatBoard[index1] && flatBoard[index1] === flatBoard[index2] && flatBoard[index2] === flatBoard[index3]) {
        matches.add(index1);
        matches.add(index2);
        matches.add(index3);
      }
    }
  }

  return matches;
};

/**
 * Generates the initial random layout of the game board, ensuring no initial matches.
 * @returns {string[][]} A 2D array representing the board with piece types.
 */
export const generateInitialBoard = () => {
  let board;
  let hasMatches = true;

  // Keep generating a new board until it has no matches
  while (hasMatches) {
    const newBoard = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        const randomPiece = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
        row.push(randomPiece);
      }
      newBoard.push(row);
    }
    
    const matches = checkForMatches(newBoard);
    if (matches.size === 0) {
      hasMatches = false;
      board = newBoard;
    }
  }
  
  return board;
};


// --- Helper Functions ---

/**
 * Applies gravity to the board, making pieces fall into empty spaces.
 * @param {string[][]} board - The board with nulls representing empty spaces.
 * @returns {string[][]} The board after gravity has been applied.
 */
export const applyGravity = (board) => {
  const newBoard = JSON.parse(JSON.stringify(board)); // Deep copy
  for (let c = 0; c < BOARD_SIZE; c++) {
    let emptyRow = BOARD_SIZE - 1;
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (newBoard[r][c] !== null) {
        if (r !== emptyRow) {
          newBoard[emptyRow][c] = newBoard[r][c];
          newBoard[r][c] = null;
        }
        emptyRow--;
      }
    }
  }
  return newBoard;
};

/**
 * Fills the empty (null) spaces at the top of the board with new random pieces.
 * @param {string[][]} board - The board after gravity.
 * @returns {string[][]} The refilled board.
 */
export const refillBoard = (board) => {
  const newBoard = JSON.parse(JSON.stringify(board));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (newBoard[r][c] === null) {
        newBoard[r][c] = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
      }
    }
  }
  return newBoard;
};

/**
 * Converts a flat array index to a {row, col} object.
 * @param {number} index - The flat index.
 * @returns {{row: number, col: number}}
 */
export const getPosition = (index) => ({
  row: Math.floor(index / BOARD_SIZE),
  col: index % BOARD_SIZE,
});

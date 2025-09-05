// The size of our game board (8x8)
export const BOARD_SIZE = 8;
export const SCORE_PER_MATCH = 10; // New: Points for a standard match

// The different types of game pieces, represented by colors for now
export const PIECE_TYPES = [
  '#FF5733', // Chocolate Chip (Orange)
  '#C70039', // Marshmallow (Red)
  '#900C3F', // Sugar Crystal (Purple)
  '#581845', // Cookie Cutter (Dark Purple)
  '#2A7B88', // Milk Drop (Teal)
];

/**
 * Generates the initial random layout of the game board.
 * Ensures the generated board has no initial matches.
 * @returns {string[][]} A 2D array representing the board.
 */
export const generateInitialBoard = () => {
  let board;
  do {
    board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        const randomPiece = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
        row.push(randomPiece);
      }
      board.push(row);
    }
  } while (checkForMatches(board).size > 0); // Regenerate if matches exist
  return board;
};

/**
 * Checks the entire board for matches.
 * @param {string[][]} board - The 2D array of the board.
 * @returns {Set<number>} A set of flat indices of the matched pieces.
 */
export const checkForMatches = (board) => {
    const matchedIndices = new Set();
    const flatBoard = board.flat();

    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        const { row, col } = getPosition(i);
        const color = flatBoard[i];
        if (!color) continue;

        // Horizontal Check
        if (col < BOARD_SIZE - 2) {
            if (flatBoard[i + 1] === color && flatBoard[i + 2] === color) {
                matchedIndices.add(i);
                matchedIndices.add(i + 1);
                matchedIndices.add(i + 2);
            }
        }
        // Vertical Check
        if (row < BOARD_SIZE - 2) {
            if (flatBoard[i + BOARD_SIZE] === color && flatBoard[i + (BOARD_SIZE * 2)] === color) {
                matchedIndices.add(i);
                matchedIndices.add(i + BOARD_SIZE);
                matchedIndices.add(i + (BOARD_SIZE * 2));
            }
        }
    }
    return matchedIndices;
};

/**
 * Makes pieces above empty slots fall down.
 * @param {string[][]} board - The board with nulls (empty slots).
 * @returns {string[][]} The board after gravity is applied.
 */
export const applyGravity = (board) => {
    const newBoard = JSON.parse(JSON.stringify(board));
    for (let j = 0; j < BOARD_SIZE; j++) { // Iterate through each column
        let emptyRow = BOARD_SIZE - 1;
        for (let i = BOARD_SIZE - 1; i >= 0; i--) { // Iterate from bottom to top
            if (newBoard[i][j] !== null) {
                [newBoard[emptyRow][j], newBoard[i][j]] = [newBoard[i][j], newBoard[emptyRow][j]];
                emptyRow--;
            }
        }
    }
    return newBoard;
};

/**
 * Fills the empty (null) slots at the top of the board with new pieces.
 * @param {string[][]} board - The board after gravity.
 * @returns {string[][]} The completely refilled board.
 */
export const refillBoard = (board) => {
    const newBoard = JSON.parse(JSON.stringify(board));
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (newBoard[i][j] === null) {
                newBoard[i][j] = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
            }
        }
    }
    return newBoard;
};

/**
 * Gets the row and column from a flat array index.
 * @param {number} index - The flat index.
 * @returns {{row: number, col: number}}
 */
export const getPosition = (index) => {
    return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE };
};


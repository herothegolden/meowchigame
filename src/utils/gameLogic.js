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
 * Generates the initial random layout of the game board.
 * Ensures the generated board has no initial matches.
 * @returns {string[][]} A 2D array representing the board with piece types.
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
  } while (checkForMatches(board).size > 0);
  return board;
};


/**
 * Checks the entire board for matches of 3 or more.
 * @param {string[][]} board - The 2D array representing the game board.
 * @returns {Set<number>} A Set containing the flat indices of all matched pieces.
 */
export const checkForMatches = (board) => {
    const flatBoard = board.flat();
    const matches = new Set();

    // Check for Horizontal Matches
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE - 2; j++) {
            const indices = [i * BOARD_SIZE + j, i * BOARD_SIZE + j + 1, i * BOARD_SIZE + j + 2];
            const firstPiece = flatBoard[indices[0]];
            if (firstPiece && indices.every(index => flatBoard[index] === firstPiece)) {
                indices.forEach(index => matches.add(index));
            }
        }
    }

    // Check for Vertical Matches
    for (let i = 0; i < BOARD_SIZE - 2; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const indices = [i * BOARD_SIZE + j, (i + 1) * BOARD_SIZE + j, (i + 2) * BOARD_SIZE + j];
             const firstPiece = flatBoard[indices[0]];
            if (firstPiece && indices.every(index => flatBoard[index] === firstPiece)) {
                indices.forEach(index => matches.add(index));
            }
        }
    }

    return matches;
};

/**
 * Applies gravity to the board.
 * @param {string[][]} board - The game board with nulls for empty spaces.
 * @returns {string[][]} The board after pieces have fallen.
 */
export const applyGravity = (board) => {
    const newBoard = JSON.parse(JSON.stringify(board));
    for (let j = 0; j < BOARD_SIZE; j++) {
        let emptyRow = BOARD_SIZE - 1;
        for (let i = BOARD_SIZE - 1; i >= 0; i--) {
            if (newBoard[i][j] !== null) {
                if (emptyRow !== i) {
                    newBoard[emptyRow][j] = newBoard[i][j];
                    newBoard[i][j] = null;
                }
                emptyRow--;
            }
        }
    }
    return newBoard;
};

/**
 * Fills the empty spaces at the top of the board with new random pieces.
 * @param {string[][]} board - The game board after gravity has been applied.
 * @returns {string[][]} The refilled board.
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
 * Gets the row and column from a flat index.
 * @param {number} index - The flat index of the piece.
 * @returns {{row: number, col: number}} The row and column.
 */
export const getPosition = (index) => {
    return {
        row: Math.floor(index / BOARD_SIZE),
        col: index % BOARD_SIZE,
    };
};

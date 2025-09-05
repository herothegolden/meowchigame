// The size of our game board (8x8)
export const BOARD_SIZE = 8;
export const POINTS_PER_PIECE = 10;

// The different types of game pieces, represented by colors for now
export const PIECE_TYPES = [
  '#FF5733', // Chocolate Chip (Orange)
  '#C70039', // Marshmallow (Red)
  '#900C3F', // Sugar Crystal (Purple)
  '#581845', // Cookie Cutter (Dark Purple)
  '#2A7B88', // Milk Drop (Teal)
];

let pieceIdCounter = 0;
const createPiece = (color) => ({
  id: pieceIdCounter++,
  color: color || PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)],
});

/**
 * Generates the initial random layout of the game board.
 * Ensures the generated board has no initial matches.
 * @returns {{id: number, color: string}[][]} A 2D array representing the board.
 */
export const generateInitialBoard = () => {
  let board;
  do {
    board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => createPiece())
    );
  } while (checkForMatches(board).size > 0);
  return board;
};


/**
 * Checks the entire board for matches of 3 or more.
 * @param {{id: number, color: string}[][]} board - The game board.
 * @returns {Set<number>} A Set containing the IDs of all matched pieces.
 */
export const checkForMatches = (board) => {
    const matches = new Set();
    const flatBoard = board.flat();

    // Check for Horizontal Matches
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE - 2; j++) {
            const firstPiece = board[i][j];
            if (firstPiece && board[i][j+1]?.color === firstPiece.color && board[i][j+2]?.color === firstPiece.color) {
                matches.add(board[i][j].id);
                matches.add(board[i][j+1].id);
                matches.add(board[i][j+2].id);
            }
        }
    }

    // Check for Vertical Matches
    for (let i = 0; i < BOARD_SIZE - 2; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const firstPiece = board[i][j];
            if (firstPiece && board[i+1][j]?.color === firstPiece.color && board[i+2][j]?.color === firstPiece.color) {
                matches.add(board[i][j].id);
                matches.add(board[i+1][j].id);
                matches.add(board[i+2][j].id);
            }
        }
    }

    return matches;
};

/**
 * Applies gravity to the board.
 * @param {{id: number, color: string}[][]} board - The game board with nulls for empty spaces.
 * @returns {{id: number, color: string}[][]} The board after pieces have fallen.
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
 * @param {{id: number, color: string}[][]} board - The game board after gravity.
 * @returns {{id: number, color: string}[][]} The refilled board.
 */
export const refillBoard = (board) => {
    const newBoard = JSON.parse(JSON.stringify(board));
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (newBoard[i][j] === null) {
                newBoard[i][j] = createPiece();
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

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
  } while (checkForMatches(board).size > 0); // Keep generating until a match-free board is made
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

    // --- Check for Horizontal Matches ---
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE - 2; j++) {
            const row = i;
            const col = j;
            const index1 = row * BOARD_SIZE + col;
            const index2 = row * BOARD_SIZE + (col + 1);
            const index3 = row * BOARD_SIZE + (col + 2);

            if (flatBoard[index1] && flatBoard[index1] === flatBoard[index2] && flatBoard[index1] === flatBoard[index3]) {
                matches.add(index1);
                matches.add(index2);
                matches.add(index3);
            }
        }
    }

    // --- Check for Vertical Matches ---
    for (let i = 0; i < BOARD_SIZE - 2; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const row = i;
            const col = j;
            const index1 = row * BOARD_SIZE + col;
            const index2 = (row + 1) * BOARD_SIZE + col;
            const index3 = (row + 2) * BOARD_SIZE + col;
            
            if (flatBoard[index1] && flatBoard[index1] === flatBoard[index2] && flatBoard[index1] === flatBoard[index3]) {
                matches.add(index1);
                matches.add(index2);
                matches.add(index3);
            }
        }
    }

    return matches;
};

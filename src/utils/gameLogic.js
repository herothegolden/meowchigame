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
 * @returns {string[][]} A 2D array representing the board with piece types.
 */
export const generateInitialBoard = () => {
  const board = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      const randomPiece = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
      row.push(randomPiece);
    }
    board.push(row);
  }
  // Note: For a real game, we would add logic here to ensure
  // the initial board doesn't have any pre-existing matches.
  // For now, a simple random generation is sufficient.
  return board;
};


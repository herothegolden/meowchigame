// Game configuration - Changed to 6x6 for better mobile fit
export const BOARD_SIZE = 6;
export const POINTS_PER_PIECE = 10;

// UPDATED: Custom Meowchi images instead of emojis
export const PIECE_EMOJIS = [
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Cookie.webp?updatedAt=1757261428707',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Oreo.webp?updatedAt=1757261428641', 
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Meowchi.webp?updatedAt=1757261428534',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Marshmellow.webp?updatedAt=1757261428445',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Strawberry.webp?updatedAt=1757261428281',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Jar.webp?updatedAt=1757261428553'
];

/**
 * Generates initial board ensuring no matches exist
 */
export const generateInitialBoard = () => {
  let board;
  let attempts = 0;
  const maxAttempts = 50;

  do {
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const boardRow = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        boardRow.push(getRandomEmoji());
      }
      board.push(boardRow);
    }
    attempts++;
  } while (findMatches(board).length > 0 && attempts < maxAttempts);

  return board;
};

/**
 * Gets a random emoji from available pieces
 */
const getRandomEmoji = () => {
  return PIECE_EMOJIS[Math.floor(Math.random() * PIECE_EMOJIS.length)];
};

/**
 * Converts 2D position to flat index
 */
export const getIndex = (row, col) => row * BOARD_SIZE + col;

/**
 * Converts flat index to 2D position
 */
export const getPosition = (index) => ({
  row: Math.floor(index / BOARD_SIZE),
  col: index % BOARD_SIZE
});

/**
 * Checks if two positions are adjacent
 */
export const areAdjacent = (pos1, pos2) => {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

/**
 * Swaps two pieces on the board
 */
export const swapPieces = (board, pos1, pos2) => {
  const newBoard = board.map(row => [...row]);
  const temp = newBoard[pos1.row][pos1.col];
  newBoard[pos1.row][pos1.col] = newBoard[pos2.row][pos2.col];
  newBoard[pos2.row][pos2.col] = temp;
  return newBoard;
};

/**
 * FIXED: Finds all matches on the board (3+ in a row/column)
 */
export const findMatches = (board) => {
  const matches = [];
  
  // Check horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    let count = 1;
    let currentPiece = board[row][0];
    let startCol = 0;
    
    for (let col = 1; col <= BOARD_SIZE; col++) {
      if (col < BOARD_SIZE && board[row][col] === currentPiece && currentPiece !== null) {
        count++;
      } else {
        // Check if we have a match of 3 or more
        if (count >= 3 && currentPiece !== null) {
          for (let i = startCol; i < startCol + count; i++) {
            matches.push(getIndex(row, i));
          }
        }
        // Reset for next sequence
        if (col < BOARD_SIZE) {
          currentPiece = board[row][col];
          startCol = col;
          count = 1;
        }
      }
    }
  }

  // Check vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    let count = 1;
    let currentPiece = board[0][col];
    let startRow = 0;
    
    for (let row = 1; row <= BOARD_SIZE; row++) {
      if (row < BOARD_SIZE && board[row][col] === currentPiece && currentPiece !== null) {
        count++;
      } else {
        // Check if we have a match of 3 or more
        if (count >= 3 && currentPiece !== null) {
          for (let i = startRow; i < startRow + count; i++) {
            matches.push(getIndex(i, col));
          }
        }
        // Reset for next sequence
        if (row < BOARD_SIZE) {
          currentPiece = board[row][col];
          startRow = row;
          count = 1;
        }
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(matches)];
};

/**
 * Removes matched pieces from the board
 */
export const removeMatches = (board, matches) => {
  const newBoard = board.map(row => [...row]);
  
  matches.forEach(index => {
    const { row, col } = getPosition(index);
    newBoard[row][col] = null;
  });
  
  return newBoard;
};

/**
 * Applies gravity to make pieces fall down
 */
export const applyGravity = (board) => {
  const newBoard = board.map(row => [...row]);
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    // Collect all non-null pieces in this column from bottom to top
    const pieces = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null) {
        pieces.push(newBoard[row][col]);
      }
      newBoard[row][col] = null;
    }
    
    // Place pieces back from bottom
    for (let i = 0; i < pieces.length; i++) {
      newBoard[BOARD_SIZE - 1 - i][col] = pieces[i];
    }
  }
  
  return newBoard;
};

/**
 * Fills empty spaces with new random pieces
 */
export const fillEmptySpaces = (board) => {
  const newBoard = board.map(row => [...row]);
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (newBoard[row][col] === null) {
        newBoard[row][col] = getRandomEmoji();
      }
    }
  }
  
  return newBoard;
};

/**
 * FIXED: Validates if a move is legal (creates a match)
 */
export const isValidMove = (board, pos1, pos2) => {
  // Check if positions are adjacent
  if (!areAdjacent(pos1, pos2)) {
    return false;
  }
  
  // Create test board with swapped pieces
  const testBoard = swapPieces(board, pos1, pos2);
  
  // Check if swap creates any matches
  const matches = findMatches(testBoard);
  
  return matches.length > 0;
};

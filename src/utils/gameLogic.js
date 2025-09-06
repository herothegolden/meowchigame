// Game configuration - Changed to 6x6 for better mobile fit
export const BOARD_SIZE = 6;
export const POINTS_PER_PIECE = 10;

// Emoji pieces for the game
export const PIECE_EMOJIS = ['🍪', '🍭', '🧁', '🍰', '🎂', '🍩'];

/**
 * Generates initial board ensuring no matches exist
 */
export const generateInitialBoard = () => {
  let board;
  let attempts = 0;
  const maxAttempts = 100;

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
 * Finds all matches on the board (3+ in a row/column)
 */
export const findMatches = (board) => {
  const matches = new Set();

  // Check horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    let count = 1;
    let currentEmoji = board[row][0];
    
    for (let col = 1; col < BOARD_SIZE; col++) {
      if (board[row][col] === currentEmoji && currentEmoji !== null) {
        count++;
      } else {
        if (count >= 3) {
          // Add all pieces in the match
          for (let i = col - count; i < col; i++) {
            matches.add(getIndex(row, i));
          }
        }
        count = 1;
        currentEmoji = board[row][col];
      }
    }
    
    // Check the last sequence
    if (count >= 3) {
      for (let i = BOARD_SIZE - count; i < BOARD_SIZE; i++) {
        matches.add(getIndex(row, i));
      }
    }
  }

  // Check vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    let count = 1;
    let currentEmoji = board[0][col];
    
    for (let row = 1; row < BOARD_SIZE; row++) {
      if (board[row][col] === currentEmoji && currentEmoji !== null) {
        count++;
      } else {
        if (count >= 3) {
          // Add all pieces in the match
          for (let i = row - count; i < row; i++) {
            matches.add(getIndex(i, col));
          }
        }
        count = 1;
        currentEmoji = board[row][col];
      }
    }
    
    // Check the last sequence
    if (count >= 3) {
      for (let i = BOARD_SIZE - count; i < BOARD_SIZE; i++) {
        matches.add(getIndex(i, col));
      }
    }
  }

  return Array.from(matches);
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
    // Collect all non-null pieces in this column
    const pieces = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null) {
        pieces.push(newBoard[row][col]);
        newBoard[row][col] = null;
      }
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
 * Validates if a move is legal (creates a match)
 */
export const isValidMove = (board, pos1, pos2) => {
  if (!areAdjacent(pos1, pos2)) return false;
  
  const testBoard = swapPieces(board, pos1, pos2);
  return findMatches(testBoard).length > 0;
};

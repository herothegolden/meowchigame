// src/utils/gameLogic.js - FIXED with safety checks to prevent infinite loops
// Game configuration - 6x6 for better mobile fit
export const BOARD_SIZE = 6;
export const POINTS_PER_PIECE = 10;

// YOUR CUSTOM IMAGES with optimization parameters for smooth TMA performance
export const PIECE_IMAGES = [
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Oreo.webp?updatedAt=1757261428641&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Cookie.webp?updatedAt=1757261428707&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Jar.webp?updatedAt=1757261428553&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Marshmellow.webp?updatedAt=1757261428445&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Meowchi.webp?updatedAt=1757261428534&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Strawberry.webp?updatedAt=1757261428281&tr=w-64,h-64,f-auto,q-85'
];

// Emoji fallbacks for loading states and errors
export const PIECE_EMOJIS = ['🍪', '🍭', '🧁', '🍰', '🎂', '🍩'];

/**
 * Gets a random piece index (0-5)
 */
const getRandomPiece = () => {
  return Math.floor(Math.random() * PIECE_IMAGES.length);
};

/**
 * SAFE: Generates initial board ensuring no matches exist with safety limit
 */
export const generateInitialBoard = () => {
  let board;
  let attempts = 0;
  const MAX_ATTEMPTS = 100; // CRITICAL: Prevent infinite loops

  do {
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const boardRow = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        boardRow.push(getRandomPiece()); // Returns index (0-5)
      }
      board.push(boardRow);
    }
    attempts++;
    
    if (attempts >= MAX_ATTEMPTS) {
      console.warn('⚠️ Max attempts reached generating board, using current board');
      break;
    }
  } while (findMatches(board).length > 0);

  console.log(`✅ Generated board in ${attempts} attempts`);
  return board;
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
 * OPTIMIZED: Finds all matches on the board (3+ in a row/column) with safety checks
 */
export const findMatches = (board) => {
  if (!board || board.length === 0) {
    console.warn('⚠️ Invalid board passed to findMatches');
    return [];
  }

  const matches = new Set(); // Use Set to prevent duplicates
  
  // Check horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (!board[row]) continue; // Safety check
    
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
            matches.add(getIndex(row, i));
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
    let currentPiece = board[0] ? board[0][col] : null;
    let startRow = 0;
    
    for (let row = 1; row <= BOARD_SIZE; row++) {
      if (row < BOARD_SIZE && board[row] && board[row][col] === currentPiece && currentPiece !== null) {
        count++;
      } else {
        // Check if we have a match of 3 or more
        if (count >= 3 && currentPiece !== null) {
          for (let i = startRow; i < startRow + count; i++) {
            matches.add(getIndex(i, col));
          }
        }
        // Reset for next sequence
        if (row < BOARD_SIZE && board[row]) {
          currentPiece = board[row][col];
          startRow = row;
          count = 1;
        }
      }
    }
  }

  const matchArray = Array.from(matches);
  console.log(`🎯 Found ${matchArray.length} matches:`, matchArray);
  return matchArray;
};

/**
 * Removes matched pieces from the board
 */
export const removeMatches = (board, matches) => {
  if (!board || !matches || matches.length === 0) {
    return board;
  }

  const newBoard = board.map(row => [...row]);
  
  matches.forEach(index => {
    const { row, col } = getPosition(index);
    if (newBoard[row] && newBoard[row][col] !== undefined) {
      newBoard[row][col] = null;
    }
  });
  
  return newBoard;
};

/**
 * Applies gravity to make pieces fall down
 */
export const applyGravity = (board) => {
  if (!board || board.length === 0) {
    return board;
  }

  const newBoard = board.map(row => [...row]);
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    // Collect all non-null pieces in this column from bottom to top
    const pieces = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row] && newBoard[row][col] !== null) {
        pieces.push(newBoard[row][col]);
      }
      if (newBoard[row]) {
        newBoard[row][col] = null;
      }
    }
    
    // Place pieces back from bottom
    for (let i = 0; i < pieces.length; i++) {
      const targetRow = BOARD_SIZE - 1 - i;
      if (newBoard[targetRow]) {
        newBoard[targetRow][col] = pieces[i];
      }
    }
  }
  
  return newBoard;
};

/**
 * SAFE: Fills empty spaces with new random pieces
 */
export const fillEmptySpaces = (board) => {
  if (!board || board.length === 0) {
    return board;
  }

  const newBoard = board.map(row => [...row]);
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (!newBoard[row]) {
      newBoard[row] = new Array(BOARD_SIZE).fill(null);
    }
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (newBoard[row][col] === null || newBoard[row][col] === undefined) {
        newBoard[row][col] = getRandomPiece(); // Returns index (0-5)
      }
    }
  }
  
  return newBoard;
};

/**
 * SAFE: Validates if a move is legal (creates a match) with safety checks
 */
export const isValidMove = (board, pos1, pos2) => {
  if (!board || !pos1 || !pos2) {
    console.warn('⚠️ Invalid parameters passed to isValidMove');
    return false;
  }

  // Check if positions are adjacent
  if (!areAdjacent(pos1, pos2)) {
    return false;
  }
  
  // Check bounds
  if (pos1.row < 0 || pos1.row >= BOARD_SIZE || pos1.col < 0 || pos1.col >= BOARD_SIZE ||
      pos2.row < 0 || pos2.row >= BOARD_SIZE || pos2.col < 0 || pos2.col >= BOARD_SIZE) {
    return false;
  }
  
  // Create test board with swapped pieces
  try {
    const testBoard = swapPieces(board, pos1, pos2);
    
    // Check if swap creates any matches
    const matches = findMatches(testBoard);
    
    return matches.length > 0;
  } catch (error) {
    console.warn('⚠️ Error in isValidMove:', error);
    return false;
  }
};

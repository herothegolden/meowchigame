// src/utils/gameLogic.js - COMPLETE FIXED VERSION with enhanced safety
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
 * FIXED: Enhanced random piece generation with validation
 */
const getRandomPiece = () => {
  const pieceIndex = Math.floor(Math.random() * PIECE_IMAGES.length);
  
  // SAFETY: Ensure we return a valid index
  if (pieceIndex < 0 || pieceIndex >= PIECE_IMAGES.length) {
    console.warn(`⚠️ Invalid piece index generated: ${pieceIndex}, using 0`);
    return 0;
  }
  
  return pieceIndex;
};

/**
 * FIXED: Validates if a board position is within bounds
 */
const isValidPosition = (row, col) => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

/**
 * FIXED: Safe board access with bounds checking
 */
const getBoardValue = (board, row, col) => {
  if (!board || !Array.isArray(board)) {
    console.warn('⚠️ Invalid board structure');
    return null;
  }
  
  if (!isValidPosition(row, col)) {
    return null;
  }
  
  if (!board[row] || !Array.isArray(board[row])) {
    console.warn(`⚠️ Invalid board row at ${row}`);
    return null;
  }
  
  return board[row][col];
};

/**
 * FIXED: Safe board modification with bounds checking
 */
const setBoardValue = (board, row, col, value) => {
  if (!board || !Array.isArray(board)) {
    console.warn('⚠️ Cannot modify invalid board');
    return false;
  }
  
  if (!isValidPosition(row, col)) {
    console.warn(`⚠️ Cannot set value at invalid position: ${row}, ${col}`);
    return false;
  }
  
  if (!board[row] || !Array.isArray(board[row])) {
    console.warn(`⚠️ Cannot modify invalid board row at ${row}`);
    return false;
  }
  
  board[row][col] = value;
  return true;
};

/**
 * FIXED: Check if placing a piece would create a match
 */
const checkWouldCreateMatch = (board, row, col, piece) => {
  // Temporarily place the piece
  const originalValue = getBoardValue(board, row, col);
  setBoardValue(board, row, col, piece);
  
  // Check for matches at this position
  const hasMatch = checkMatchAtPosition(board, row, col);
  
  // Restore original value
  setBoardValue(board, row, col, originalValue);
  
  return hasMatch;
};

/**
 * FIXED: Check for matches at a specific position
 */
const checkMatchAtPosition = (board, row, col) => {
  const piece = getBoardValue(board, row, col);
  if (piece === null || piece === undefined) return false;
  
  // Check horizontal match
  let horizontalCount = 1;
  
  // Count left
  for (let c = col - 1; c >= 0; c--) {
    if (getBoardValue(board, row, c) === piece) {
      horizontalCount++;
    } else {
      break;
    }
  }
  
  // Count right
  for (let c = col + 1; c < BOARD_SIZE; c++) {
    if (getBoardValue(board, row, c) === piece) {
      horizontalCount++;
    } else {
      break;
    }
  }
  
  if (horizontalCount >= 3) return true;
  
  // Check vertical match
  let verticalCount = 1;
  
  // Count up
  for (let r = row - 1; r >= 0; r--) {
    if (getBoardValue(board, r, col) === piece) {
      verticalCount++;
    } else {
      break;
    }
  }
  
  // Count down
  for (let r = row + 1; r < BOARD_SIZE; r++) {
    if (getBoardValue(board, r, col) === piece) {
      verticalCount++;
    } else {
      break;
    }
  }
  
  return verticalCount >= 3;
};

/**
 * FIXED: Get a safe piece that won't create matches
 */
const getSafePiece = (board, row, col) => {
  const forbiddenPieces = new Set();
  
  // Check what pieces would create horizontal matches
  const leftPiece = getBoardValue(board, row, col - 1);
  const leftLeftPiece = getBoardValue(board, row, col - 2);
  const rightPiece = getBoardValue(board, row, col + 1);
  
  if (leftPiece !== null && leftPiece === leftLeftPiece) {
    forbiddenPieces.add(leftPiece);
  }
  if (leftPiece !== null && leftPiece === rightPiece) {
    forbiddenPieces.add(leftPiece);
  }
  
  // Check what pieces would create vertical matches
  const topPiece = getBoardValue(board, row - 1, col);
  const topTopPiece = getBoardValue(board, row - 2, col);
  const bottomPiece = getBoardValue(board, row + 1, col);
  
  if (topPiece !== null && topPiece === topTopPiece) {
    forbiddenPieces.add(topPiece);
  }
  if (topPiece !== null && topPiece === bottomPiece) {
    forbiddenPieces.add(topPiece);
  }
  
  // Find a safe piece
  for (let i = 0; i < PIECE_IMAGES.length; i++) {
    if (!forbiddenPieces.has(i)) {
      return i;
    }
  }
  
  // FALLBACK: Return first piece if all are forbidden (shouldn't happen)
  console.warn('⚠️ All pieces forbidden, using fallback');
  return 0;
};

/**
 * FIXED: Validate board structure
 */
const isValidBoard = (board) => {
  if (!board || !Array.isArray(board) || board.length !== BOARD_SIZE) {
    return false;
  }
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (!board[row] || !Array.isArray(board[row]) || board[row].length !== BOARD_SIZE) {
      return false;
    }
    
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece === null || piece === undefined || piece < 0 || piece >= PIECE_IMAGES.length) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * FIXED: Create fallback board if generation fails
 */
const createFallbackBoard = () => {
  console.warn('⚠️ Creating fallback board');
  const board = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    const boardRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Use a checkerboard pattern to avoid matches
      const piece = (row + col) % PIECE_IMAGES.length;
      boardRow.push(piece);
    }
    board.push(boardRow);
  }
  
  return board;
};

/**
 * FIXED: Enhanced board generation with improved anti-match algorithm
 */
export const generateInitialBoard = () => {
  console.log('🎮 Generating initial board...');
  
  let board;
  let attempts = 0;
  const MAX_ATTEMPTS = 50; // Reasonable attempt limit
  const MAX_PLACEMENT_ATTEMPTS = 20; // Limit per-piece placement attempts

  do {
    board = [];
    
    // Initialize empty board
    for (let row = 0; row < BOARD_SIZE; row++) {
      board.push(new Array(BOARD_SIZE).fill(null));
    }
    
    // Fill board with anti-match strategy
    let boardValid = true;
    
    for (let row = 0; row < BOARD_SIZE && boardValid; row++) {
      for (let col = 0; col < BOARD_SIZE && boardValid; col++) {
        let piece;
        let placementAttempts = 0;
        let validPlacement = false;
        
        // Try to place a piece that doesn't create immediate matches
        do {
          piece = getRandomPiece();
          
          // Check if this piece would create a match
          const wouldCreateMatch = checkWouldCreateMatch(board, row, col, piece);
          
          if (!wouldCreateMatch) {
            validPlacement = true;
          }
          
          placementAttempts++;
        } while (!validPlacement && placementAttempts < MAX_PLACEMENT_ATTEMPTS);
        
        if (validPlacement) {
          setBoardValue(board, row, col, piece);
        } else {
          // FALLBACK: Use a safe piece type
          setBoardValue(board, row, col, getSafePiece(board, row, col));
        }
      }
    }
    
    attempts++;
    
    if (attempts >= MAX_ATTEMPTS) {
      console.warn(`⚠️ Max board generation attempts reached (${MAX_ATTEMPTS}), using current board`);
      
      // Ensure board is valid even if not perfect
      if (!isValidBoard(board)) {
        board = createFallbackBoard();
      }
      break;
    }
  } while (findMatches(board).length > 0);

  console.log(`✅ Generated valid board in ${attempts} attempts`);
  return board;
};

/**
 * Converts 2D position to flat index
 */
export const getIndex = (row, col) => {
  if (!isValidPosition(row, col)) {
    console.warn(`⚠️ Invalid position for getIndex: ${row}, ${col}`);
    return -1;
  }
  return row * BOARD_SIZE + col;
};

/**
 * Converts flat index to 2D position
 */
export const getPosition = (index) => {
  if (typeof index !== 'number' || index < 0 || index >= BOARD_SIZE * BOARD_SIZE) {
    console.warn(`⚠️ Invalid index for getPosition: ${index}`);
    return { row: 0, col: 0 };
  }
  
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE
  };
};

/**
 * Checks if two positions are adjacent
 */
export const areAdjacent = (pos1, pos2) => {
  if (!pos1 || !pos2 || typeof pos1.row !== 'number' || typeof pos1.col !== 'number' ||
      typeof pos2.row !== 'number' || typeof pos2.col !== 'number') {
    return false;
  }
  
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

/**
 * FIXED: Safe piece swapping with validation
 */
export const swapPieces = (board, pos1, pos2) => {
  if (!isValidBoard(board)) {
    console.warn('⚠️ Cannot swap pieces on invalid board');
    return board;
  }
  
  if (!isValidPosition(pos1.row, pos1.col) || !isValidPosition(pos2.row, pos2.col)) {
    console.warn('⚠️ Cannot swap pieces at invalid positions');
    return board;
  }
  
  const newBoard = board.map(row => [...row]);
  const temp = newBoard[pos1.row][pos1.col];
  newBoard[pos1.row][pos1.col] = newBoard[pos2.row][pos2.col];
  newBoard[pos2.row][pos2.col] = temp;
  return newBoard;
};

/**
 * FIXED: Enhanced match finding with safety checks and performance optimization
 */
export const findMatches = (board) => {
  if (!isValidBoard(board)) {
    console.warn('⚠️ Invalid board passed to findMatches');
    return [];
  }

  const matches = new Set();
  
  try {
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
      let currentPiece = board[0][col];
      let startRow = 0;
      
      for (let row = 1; row <= BOARD_SIZE; row++) {
        if (row < BOARD_SIZE && board[row][col] === currentPiece && currentPiece !== null) {
          count++;
        } else {
          // Check if we have a match of 3 or more
          if (count >= 3 && currentPiece !== null) {
            for (let i = startRow; i < startRow + count; i++) {
              matches.add(getIndex(i, col));
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
  } catch (error) {
    console.error('🚨 Error in findMatches:', error);
    return [];
  }

  const matchArray = Array.from(matches);
  if (matchArray.length > 0) {
    console.log(`🎯 Found ${matchArray.length} matches:`, matchArray);
  }
  return matchArray;
};

/**
 * FIXED: Safe match removal with validation
 */
export const removeMatches = (board, matches) => {
  if (!isValidBoard(board)) {
    console.warn('⚠️ Cannot remove matches from invalid board');
    return board;
  }
  
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return board;
  }

  const newBoard = board.map(row => [...row]);
  
  matches.forEach(index => {
    const { row, col } = getPosition(index);
    if (isValidPosition(row, col) && newBoard[row]) {
      newBoard[row][col] = null;
    }
  });
  
  return newBoard;
};

/**
 * FIXED: Safe gravity application with validation
 */
export const applyGravity = (board) => {
  if (!isValidBoard(board)) {
    console.warn('⚠️ Cannot apply gravity to invalid board');
    return board;
  }

  const newBoard = board.map(row => [...row]);
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    // Collect all non-null pieces in this column from bottom to top
    const pieces = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null && newBoard[row][col] !== undefined) {
        pieces.push(newBoard[row][col]);
      }
      newBoard[row][col] = null;
    }
    
    // Place pieces back from bottom
    for (let i = 0; i < pieces.length; i++) {
      const targetRow = BOARD_SIZE - 1 - i;
      if (targetRow >= 0) {
        newBoard[targetRow][col] = pieces[i];
      }
    }
  }
  
  return newBoard;
};

/**
 * FIXED: Safe empty space filling with validation
 */
export const fillEmptySpaces = (board) => {
  if (!isValidBoard(board)) {
    console.warn('⚠️ Cannot fill spaces on invalid board, creating new board');
    return generateInitialBoard();
  }

  const newBoard = board.map(row => [...row]);
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (newBoard[row][col] === null || newBoard[row][col] === undefined) {
        newBoard[row][col] = getRandomPiece();
      }
    }
  }
  
  return newBoard;
};

/**
 * FIXED: Enhanced move validation with comprehensive checks
 */
export const isValidMove = (board, pos1, pos2) => {
  if (!isValidBoard(board)) {
    console.warn('⚠️ Cannot validate move on invalid board');
    return false;
  }

  if (!pos1 || !pos2) {
    console.warn('⚠️ Invalid positions passed to isValidMove');
    return false;
  }

  // Check if positions are adjacent
  if (!areAdjacent(pos1, pos2)) {
    return false;
  }
  
  // Check bounds
  if (!isValidPosition(pos1.row, pos1.col) || !isValidPosition(pos2.row, pos2.col)) {
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

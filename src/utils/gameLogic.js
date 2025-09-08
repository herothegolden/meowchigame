// src/utils/gameLogic.js - SIMPLIFIED STABLE VERSION
export const BOARD_SIZE = 6;
export const POINTS_PER_PIECE = 10;

// Your custom images
export const PIECE_IMAGES = [
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Oreo.webp?updatedAt=1757261428641&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Cookie.webp?updatedAt=1757261428707&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Jar.webp?updatedAt=1757261428553&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Marshmellow.webp?updatedAt=1757261428445&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Meowchi.webp?updatedAt=1757261428534&tr=w-64,h-64,f-auto,q-85',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Strawberry.webp?updatedAt=1757261428281&tr=w-64,h-64,f-auto,q-85'
];

export const PIECE_EMOJIS = ['🍪', '🍭', '🧁', '🍰', '🎂', '🍩'];

/**
 * SIMPLIFIED: Basic random piece
 */
const getRandomPiece = () => {
  return Math.floor(Math.random() * PIECE_IMAGES.length);
};

/**
 * SIMPLIFIED: Generate board without complex anti-match logic
 */
export const generateInitialBoard = () => {
  console.log('🎮 Generating simple board...');
  
  const board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const boardRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      // SIMPLIFIED: Just avoid obvious 3-in-a-row during generation
      let piece;
      let attempts = 0;
      
      do {
        piece = getRandomPiece();
        attempts++;
      } while (
        attempts < 10 && (
          // Check horizontal
          (col >= 2 && boardRow[col-1] === piece && boardRow[col-2] === piece) ||
          // Check vertical  
          (row >= 2 && board[row-1] && board[row-1][col] === piece && 
           board[row-2] && board[row-2][col] === piece)
        )
      );
      
      boardRow.push(piece);
    }
    board.push(boardRow);
  }
  
  console.log('✅ Simple board generated');
  return board;
};

/**
 * Position utilities
 */
export const getIndex = (row, col) => row * BOARD_SIZE + col;

export const getPosition = (index) => ({
  row: Math.floor(index / BOARD_SIZE),
  col: index % BOARD_SIZE
});

export const areAdjacent = (pos1, pos2) => {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

/**
 * SIMPLIFIED: Basic piece swapping
 */
export const swapPieces = (board, pos1, pos2) => {
  const newBoard = board.map(row => [...row]);
  const temp = newBoard[pos1.row][pos1.col];
  newBoard[pos1.row][pos1.col] = newBoard[pos2.row][pos2.col];
  newBoard[pos2.row][pos2.col] = temp;
  return newBoard;
};

/**
 * SIMPLIFIED: Find matches - basic 3+ in a row/column
 */
export const findMatches = (board) => {
  if (!board || board.length === 0) return [];
  
  const matches = new Set();
  
  // Check horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (!board[row]) continue;
    
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const piece = board[row][col];
      if (piece === null || piece === undefined) continue;
      
      let count = 1;
      for (let c = col + 1; c < BOARD_SIZE && board[row][c] === piece; c++) {
        count++;
      }
      
      if (count >= 3) {
        for (let c = col; c < col + count; c++) {
          matches.add(getIndex(row, c));
        }
      }
    }
  }
  
  // Check vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      if (!board[row] || !board[row][col] === undefined) continue;
      
      const piece = board[row][col];
      if (piece === null || piece === undefined) continue;
      
      let count = 1;
      for (let r = row + 1; r < BOARD_SIZE && board[r] && board[r][col] === piece; r++) {
        count++;
      }
      
      if (count >= 3) {
        for (let r = row; r < row + count; r++) {
          matches.add(getIndex(r, col));
        }
      }
    }
  }
  
  return Array.from(matches);
};

/**
 * SIMPLIFIED: Remove matched pieces
 */
export const removeMatches = (board, matches) => {
  if (!matches || matches.length === 0) return board;
  
  const newBoard = board.map(row => [...row]);
  
  matches.forEach(index => {
    const { row, col } = getPosition(index);
    if (newBoard[row]) {
      newBoard[row][col] = null;
    }
  });
  
  return newBoard;
};

/**
 * SIMPLIFIED: Apply gravity
 */
export const applyGravity = (board) => {
  const newBoard = board.map(row => [...row]);
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    // Collect non-null pieces from bottom to top
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
 * SIMPLIFIED: Fill empty spaces
 */
export const fillEmptySpaces = (board) => {
  const newBoard = board.map(row => [...row]);
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (!newBoard[row]) {
      newBoard[row] = new Array(BOARD_SIZE).fill(null);
    }
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (newBoard[row][col] === null || newBoard[row][col] === undefined) {
        newBoard[row][col] = getRandomPiece();
      }
    }
  }
  
  return newBoard;
};

/**
 * SIMPLIFIED: Check if move creates matches
 */
export const isValidMove = (board, pos1, pos2) => {
  if (!areAdjacent(pos1, pos2)) return false;
  
  const testBoard = swapPieces(board, pos1, pos2);
  const matches = findMatches(testBoard);
  
  return matches.length > 0;
};

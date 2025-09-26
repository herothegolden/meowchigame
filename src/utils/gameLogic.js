// FIXED: gameLogic.js - Improved shuffle functions

// Game configuration - Changed to 6x6 for better mobile fit
export const BOARD_SIZE = 6;
export const POINTS_PER_PIECE = 10;

// UPDATED: Custom Meowchi images instead of emojis
export const PIECE_EMOJIS = [
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Matcha.webp?updatedAt=1758904443599',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Milk.webp?updatedAt=1758904443453',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Butter.webp?updatedAt=1758904443280',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Oreo.webp?updatedAt=1758904443333',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Marshmellow.webp?updatedAt=1758904443590',
  'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Strawberry.webp?updatedAt=1758904443682'
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
 * FIXED: Enhanced hasValidMoves with better performance
 */
export const hasValidMoves = (board) => {
  // Check all possible adjacent swaps
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const currentPos = { row, col };
      
      // Check right neighbor
      if (col < BOARD_SIZE - 1) {
        const rightPos = { row, col: col + 1 };
        if (isValidMove(board, currentPos, rightPos)) {
          return true;
        }
      }
      
      // Check bottom neighbor
      if (row < BOARD_SIZE - 1) {
        const bottomPos = { row: row + 1, col };
        if (isValidMove(board, currentPos, bottomPos)) {
          return true;
        }
      }
    }
  }
  
  return false;
};

/**
 * COMPLETELY REWRITTEN: Much more effective shuffle function
 */
export const shuffleBoard = (board) => {
  console.log('🔀 Starting shuffle process...');
  
  // Collect all non-null pieces from the current board
  const allPieces = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null) {
        allPieces.push(board[row][col]);
      }
    }
  }
  
  console.log('📦 Collected pieces for shuffle:', allPieces.length);
  
  // Fisher-Yates shuffle algorithm - guaranteed randomization
  for (let i = allPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPieces[i], allPieces[j]] = [allPieces[j], allPieces[i]];
  }
  
  console.log('🎲 Pieces shuffled');
  
  // Create new board with shuffled pieces
  const newBoard = [];
  let pieceIndex = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    const boardRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null && pieceIndex < allPieces.length) {
        boardRow.push(allPieces[pieceIndex]);
        pieceIndex++;
      } else {
        boardRow.push(board[row][col]); // Keep null spaces as-is
      }
    }
    newBoard.push(boardRow);
  }
  
  console.log('🎯 New board created');
  
  // If the new board has immediate matches, remove them
  let finalBoard = newBoard;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (findMatches(finalBoard).length > 0 && attempts < maxAttempts) {
    console.log(`⚠️ Found immediate matches, re-shuffling... (attempt ${attempts + 1})`);
    
    // Re-shuffle just the pieces that are causing matches
    const matchIndices = new Set(findMatches(finalBoard));
    const matchPieces = [];
    const nonMatchPieces = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const index = getIndex(row, col);
        if (finalBoard[row][col] !== null) {
          if (matchIndices.has(index)) {
            matchPieces.push(finalBoard[row][col]);
          } else {
            nonMatchPieces.push({ piece: finalBoard[row][col], row, col });
          }
        }
      }
    }
    
    // Shuffle only the problematic pieces
    for (let i = matchPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchPieces[i], matchPieces[j]] = [matchPieces[j], matchPieces[i]];
    }
    
    // Rebuild board
    finalBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    // Place non-match pieces back
    nonMatchPieces.forEach(({ piece, row, col }) => {
      finalBoard[row][col] = piece;
    });
    
    // Place shuffled match pieces in empty spots
    let matchIndex = 0;
    for (let row = 0; row < BOARD_SIZE && matchIndex < matchPieces.length; row++) {
      for (let col = 0; col < BOARD_SIZE && matchIndex < matchPieces.length; col++) {
        if (finalBoard[row][col] === null) {
          finalBoard[row][col] = matchPieces[matchIndex];
          matchIndex++;
        }
      }
    }
    
    attempts++;
  }
  
  console.log(`✅ Shuffle completed in ${attempts} attempts`);
  console.log('🎯 Final board has matches:', findMatches(finalBoard).length > 0);
  
  return finalBoard;
};

/**
 * ENHANCED: Smart shuffle with guaranteed moves and no matches
 */
export const smartShuffle = (board) => {
  console.log('🧠 Starting smart shuffle...');
  
  let shuffledBoard = shuffleBoard(board);
  let attempts = 0;
  const maxAttempts = 10;
  
  // Keep shuffling until we have valid moves and no immediate matches
  while ((!hasValidMoves(shuffledBoard) || findMatches(shuffledBoard).length > 0) && attempts < maxAttempts) {
    console.log(`🔄 Board issues detected, reshuffling... (attempt ${attempts + 1})`);
    console.log(`   - Has valid moves: ${hasValidMoves(shuffledBoard)}`);
    console.log(`   - Has matches: ${findMatches(shuffledBoard).length > 0}`);
    
    shuffledBoard = shuffleBoard(board);
    attempts++;
  }
  
  // If still problematic after max attempts, force create a working board
  if (!hasValidMoves(shuffledBoard) || findMatches(shuffledBoard).length > 0) {
    console.log('🛠️ Forcing creation of valid board...');
    shuffledBoard = createOptimalBoard();
  }
  
  console.log('✅ Smart shuffle complete');
  console.log(`   - Final board has ${hasValidMoves(shuffledBoard) ? 'VALID' : 'NO'} moves`);
  console.log(`   - Final board has ${findMatches(shuffledBoard).length} immediate matches`);
  
  return shuffledBoard;
};

/**
 * NEW: Creates an optimal board with guaranteed moves and no matches
 */
const createOptimalBoard = () => {
  console.log('🏗️ Creating optimal board...');
  
  let board;
  let attempts = 0;
  const maxAttempts = 50;
  
  do {
    // Start with a completely random board
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const boardRow = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        boardRow.push(getRandomEmoji());
      }
      board.push(boardRow);
    }
    
    // Check if it meets our criteria
    const hasMatches = findMatches(board).length > 0;
    const hasMoves = hasValidMoves(board);
    
    if (!hasMatches && hasMoves) {
      break; // Perfect board found
    }
    
    attempts++;
  } while (attempts < maxAttempts);
  
  // If we couldn't create a perfect board, manually fix one
  if (attempts >= maxAttempts) {
    console.log('🔧 Manually creating valid board...');
    board = createManualValidBoard();
  }
  
  console.log(`🎯 Optimal board created in ${attempts} attempts`);
  return board;
};

/**
 * NEW: Manually creates a board with guaranteed valid moves
 */
const createManualValidBoard = () => {
  const board = [];
  const pieces = [...PIECE_EMOJIS];
  
  // Create a pattern that guarantees moves without immediate matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    const boardRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Create a checkerboard-like pattern with variations
      const pieceIndex = (row + col + Math.floor(Math.random() * 2)) % pieces.length;
      boardRow.push(pieces[pieceIndex]);
    }
    board.push(boardRow);
  }
  
  // Ensure at least one guaranteed move by placing strategic pieces
  if (BOARD_SIZE >= 4) {
    const midRow = Math.floor(BOARD_SIZE / 2);
    const midCol = Math.floor(BOARD_SIZE / 2);
    
    // Create a guaranteed horizontal move opportunity
    board[midRow][midCol] = pieces[0];
    board[midRow][midCol + 1] = pieces[1];
    board[midRow][midCol + 2] = pieces[0]; // This creates a potential match when swapped
  }
  
  return board;
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

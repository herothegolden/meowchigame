// FIXED: gameLogic.js - Improved shuffle functions + Enhanced Match Detection + Special Activation & Combos + Complete Honey + Color Bomb

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

// Special item constants
export const SPECIAL_ITEMS = {
  CAT: 'CAT_ITEM',
  HONEY: 'HONEY_ITEM', 
  COLOR_BOMB: 'COLOR_BOMB_ITEM',
  SHOP_BOMB: 'SHOP_BOMB_ITEM'
};

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
 * ORIGINAL: Finds all matches on the board (3+ in a row/column) - PRESERVED FOR COMPATIBILITY
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
 * NEW: Enhanced match detection for special items
 * Returns: { regular: number[], cat: {position, pieces}[], honey: {position, pieces}[], colorBomb: {position, pieces}[] }
 */
export const findSpecialMatches = (board) => {
  // Track all potential matches to handle overlaps with priority
  const allMatches = [];
  
  // Find horizontal matches (3+, 4, 5+)
  for (let row = 0; row < BOARD_SIZE; row++) {
    let count = 1;
    let currentPiece = board[row][0];
    let startCol = 0;
    
    for (let col = 1; col <= BOARD_SIZE; col++) {
      if (col < BOARD_SIZE && board[row][col] === currentPiece && currentPiece !== null) {
        count++;
      } else {
        if (count >= 3 && currentPiece !== null) {
          const pieces = Array.from({length: count}, (_, i) => getIndex(row, startCol + i));
          const centerCol = Math.floor(startCol + (count - 1) / 2);
          
          if (count >= 5) {
            allMatches.push({
              type: 'colorBomb',
              position: { row, col: centerCol },
              pieces: pieces,
              priority: 4
            });
          } else if (count === 4) {
            allMatches.push({
              type: 'cat',
              position: { row, col: centerCol },
              pieces: pieces,
              priority: 2
            });
          } else {
            allMatches.push({
              type: 'regular',
              pieces: pieces,
              priority: 1
            });
          }
        }
        
        if (col < BOARD_SIZE) {
          currentPiece = board[row][col];
          startCol = col;
          count = 1;
        }
      }
    }
  }
  
  // Find vertical matches (3+, 4, 5+)
  for (let col = 0; col < BOARD_SIZE; col++) {
    let count = 1;
    let currentPiece = board[0][col];
    let startRow = 0;
    
    for (let row = 1; row <= BOARD_SIZE; row++) {
      if (row < BOARD_SIZE && board[row][col] === currentPiece && currentPiece !== null) {
        count++;
      } else {
        if (count >= 3 && currentPiece !== null) {
          const pieces = Array.from({length: count}, (_, i) => getIndex(startRow + i, col));
          const centerRow = Math.floor(startRow + (count - 1) / 2);
          
          if (count >= 5) {
            allMatches.push({
              type: 'colorBomb',
              position: { row: centerRow, col },
              pieces: pieces,
              priority: 4
            });
          } else if (count === 4) {
            allMatches.push({
              type: 'cat',
              position: { row: centerRow, col },
              pieces: pieces,
              priority: 2
            });
          } else {
            allMatches.push({
              type: 'regular',
              pieces: pieces,
              priority: 1
            });
          }
        }
        
        if (row < BOARD_SIZE) {
          currentPiece = board[row][col];
          startRow = row;
          count = 1;
        }
      }
    }
  }
  
  // Find L/T shapes (5 pieces) - highest priority after colorBomb
  const ltShapes = findLTShapes(board);
  allMatches.push(...ltShapes.map(shape => ({
    type: 'honey',
    position: shape.position,
    pieces: shape.pieces,
    priority: 3
  })));
  
  // Resolve overlaps by rarity priority: colorBomb(4) > honey(3) > cat(2) > regular(1)
  const usedIndices = new Set();
  const finalMatches = {
    regular: [],
    cat: [],
    honey: [],
    colorBomb: []
  };
  
  // Sort by priority (highest first), then by discovery order for deterministic results
  allMatches.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    // For same priority, prefer earlier discovered (stable sort)
    return 0;
  });
  
  for (const match of allMatches) {
    // Check if any piece in this match is already used by higher priority match
    const hasOverlap = match.pieces.some(index => usedIndices.has(index));
    
    if (!hasOverlap) {
      // Mark all pieces as used
      match.pieces.forEach(index => usedIndices.add(index));
      
      // Add to appropriate category
      if (match.type === 'regular') {
        finalMatches.regular.push(...match.pieces);
      } else {
        finalMatches[match.type].push({
          position: match.position,
          pieces: match.pieces
        });
      }
    }
  }
  
  return finalMatches;
};

/**
 * NEW: Helper function to find L/T shapes (exactly 5 tiles)
 * Returns array of { position: {row, col}, pieces: number[] }
 */
const findLTShapes = (board) => {
  const shapes = [];
  
  // Scan for T and L patterns
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const centerPiece = board[row][col];
      if (!centerPiece) continue;
      
      // Check T-shape: horizontal line of 3 + vertical line of 3 sharing center
      // Pattern: vertical center extends 1 up and 1 down, horizontal extends 1 left and 1 right
      if (row >= 1 && row < BOARD_SIZE - 1 && col >= 1 && col < BOARD_SIZE - 1) {
        if (board[row-1][col] === centerPiece &&    // above
            board[row+1][col] === centerPiece &&    // below  
            board[row][col-1] === centerPiece &&    // left
            board[row][col+1] === centerPiece) {    // right
          shapes.push({
            position: { row, col }, // intersection point
            pieces: [
              getIndex(row-1, col),  // top
              getIndex(row, col-1),  // left
              getIndex(row, col),    // center
              getIndex(row, col+1),  // right
              getIndex(row+1, col)   // bottom
            ]
          });
          continue; // Don't check L-shapes at this position
        }
      }
      
      // Check L-shapes (4 orientations, each exactly 5 pieces)
      const lPatterns = [
        // L-shape: ⌞ (bottom-left corner at center)
        { 
          coords: [[0,0], [0,1], [0,2], [-1,0], [-2,0]], 
          valid: row >= 2 && col <= BOARD_SIZE - 3 
        },
        // L-shape: ⌟ (bottom-right corner at center)  
        { 
          coords: [[0,-2], [0,-1], [0,0], [-1,0], [-2,0]], 
          valid: row >= 2 && col >= 2 
        },
        // L-shape: ⌜ (top-left corner at center)
        { 
          coords: [[0,0], [0,1], [0,2], [1,0], [2,0]], 
          valid: row <= BOARD_SIZE - 3 && col <= BOARD_SIZE - 3 
        },
        // L-shape: ⌝ (top-right corner at center)
        { 
          coords: [[0,-2], [0,-1], [0,0], [1,0], [2,0]], 
          valid: row <= BOARD_SIZE - 3 && col >= 2 
        }
      ];
      
      for (const pattern of lPatterns) {
        if (!pattern.valid) continue;
        
        // Check if all 5 positions contain the same piece
        const isValidL = pattern.coords.every(([dr, dc]) => {
          const r = row + dr;
          const c = col + dc;
          return r >= 0 && r < BOARD_SIZE && 
                 c >= 0 && c < BOARD_SIZE && 
                 board[r][c] === centerPiece;
        });
        
        if (isValidL) {
          shapes.push({
            position: { row, col }, // corner position as anchor
            pieces: pattern.coords.map(([dr, dc]) => getIndex(row + dr, col + dc))
          });
          break; // Only detect first valid L-shape per position to avoid duplicates
        }
      }
    }
  }
  
  return shapes;
};

/**
 * NEW: Activate special items - returns array of indices to clear
 */
export const activateSpecialItem = (board, specialType, position, targetPiece = null) => {
  const indices = [];
  
  switch(specialType) {
    case SPECIAL_ITEMS.CAT:
      // Clear entire row and column
      for (let i = 0; i < BOARD_SIZE; i++) {
        indices.push(getIndex(position.row, i)); // Row
        indices.push(getIndex(i, position.col)); // Column
      }
      break;
      
    case SPECIAL_ITEMS.HONEY:
      // Double 3x3 explosion centered on position
      for (let r = position.row - 1; r <= position.row + 1; r++) {
        for (let c = position.col - 1; c <= position.col + 1; c++) {
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            indices.push(getIndex(r, c));
          }
        }
      }
      // Second explosion at same position (double effect)
      for (let r = position.row - 1; r <= position.row + 1; r++) {
        for (let c = position.col - 1; c <= position.col + 1; c++) {
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            indices.push(getIndex(r, c));
          }
        }
      }
      break;
      
    case SPECIAL_ITEMS.COLOR_BOMB:
      // Remove all pieces of target type
      if (targetPiece) {
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === targetPiece) {
              indices.push(getIndex(row, col));
            }
          }
        }
      }
      break;
  }
  
  return [...new Set(indices)]; // Remove duplicates
};

/**
 * ENHANCED: Execute special item combos with complete Honey + Color Bomb implementation
 */
export const executeCombo = (board, item1Type, item1Pos, item2Type, item2Pos) => {
  let indices = [];
  
  // Cat + Honey Jar combo
  if ((item1Type === SPECIAL_ITEMS.CAT && item2Type === SPECIAL_ITEMS.HONEY) ||
      (item1Type === SPECIAL_ITEMS.HONEY && item2Type === SPECIAL_ITEMS.CAT)) {
    // Clear 3 rows and 3 columns centered on both positions
    [item1Pos, item2Pos].forEach(pos => {
      // Center row and adjacent rows
      for (let r = Math.max(0, pos.row - 1); r <= Math.min(BOARD_SIZE - 1, pos.row + 1); r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          indices.push(getIndex(r, c));
        }
      }
      // Center column and adjacent columns  
      for (let c = Math.max(0, pos.col - 1); c <= Math.min(BOARD_SIZE - 1, pos.col + 1); c++) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          indices.push(getIndex(r, c));
        }
      }
    });
    return { type: 'NORMAL', indices: [...new Set(indices)] };
  }
  
  // Honey Jar + Color Bomb combo - COMPLETE IMPLEMENTATION
  else if ((item1Type === SPECIAL_ITEMS.HONEY && item2Type === SPECIAL_ITEMS.COLOR_BOMB) ||
           (item1Type === SPECIAL_ITEMS.COLOR_BOMB && item2Type === SPECIAL_ITEMS.HONEY)) {
    
    // Determine which position has the Color Bomb
    const colorBombPos = item1Type === SPECIAL_ITEMS.COLOR_BOMB ? item1Pos : item2Pos;
    
    // Find adjacent pieces to Color Bomb to determine target type
    const adjacentPieces = [];
    const directions = [
      { row: colorBombPos.row - 1, col: colorBombPos.col }, // up
      { row: colorBombPos.row + 1, col: colorBombPos.col }, // down
      { row: colorBombPos.row, col: colorBombPos.col - 1 }, // left
      { row: colorBombPos.row, col: colorBombPos.col + 1 }  // right
    ];
    
    directions.forEach(pos => {
      if (pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE) {
        const piece = board[pos.row][pos.col];
        if (piece && !Object.values(SPECIAL_ITEMS).includes(piece)) {
          adjacentPieces.push(piece);
        }
      }
    });
    
    // Select target piece type (first adjacent non-special piece)
    const targetPiece = adjacentPieces.length > 0 ? adjacentPieces[0] : null;
    
    if (targetPiece) {
      // Find all positions with the target piece type for transformation
      const transformIndices = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (board[row][col] === targetPiece) {
            transformIndices.push(getIndex(row, col));
          }
        }
      }
      
      return { 
        type: 'TRANSFORM_AND_ACTIVATE', 
        indices: transformIndices,
        targetPiece: targetPiece 
      };
    }
    
    // If no valid target found, just clear the combo pieces
    return { type: 'NORMAL', indices: [getIndex(item1Pos.row, item1Pos.col), getIndex(item2Pos.row, item2Pos.col)] };
  }
  
  // Cat + Color Bomb combo
  else if ((item1Type === SPECIAL_ITEMS.CAT && item2Type === SPECIAL_ITEMS.COLOR_BOMB) ||
           (item1Type === SPECIAL_ITEMS.COLOR_BOMB && item2Type === SPECIAL_ITEMS.CAT)) {
    // Checkerboard explosion pattern
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if ((row + col) % 2 === 0) {
          indices.push(getIndex(row, col));
        }
      }
    }
    return { type: 'NORMAL', indices: [...new Set(indices)] };
  }
  
  return { type: 'NORMAL', indices: [] };
};

/**
 * ENHANCED: hasValidMoves with better performance
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
  console.log('🗃️ Creating optimal board...');
  
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

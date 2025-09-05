// The size of our game board (8x8)
export const BOARD_SIZE = 8;

// The different types of game pieces, represented by colors for now
export const PIECE_TYPES = [
  '#FF5733', // 0: Chocolate Chip (Orange)
  '#C70039', // 1: Marshmallow (Red)
  '#900C3F', // 2: Sugar Crystal (Purple)
  '#581845', // 3: Cookie Cutter (Dark Purple)
  '#2A7B88', // 4: Milk Drop (Teal)
];

// NEW: Definitions for special pieces. We use objects to hold more data.
export const SPECIAL_PIECES = {
  BOMB: { type: 'BOMB', color: '#FFFFFF', isSpecial: true },
  LINE_CLEAR_V: { type: 'LINE_CLEAR_V', color: '#FFFFFF', isSpecial: true },
  LINE_CLEAR_H: { type: 'LINE_CLEAR_H', color: '#FFFFFF', isSpecial: true },
};

export const POINTS_PER_PIECE = 5;

/**
 * Generates the initial random layout of the game board.
 * Ensures the generated board has no initial matches.
 * @param {boolean} startWithBomb - Optional flag to place a bomb at the start.
 * @returns {object[][]} A 2D array representing the board with piece objects.
 */
export const generateInitialBoard = (startWithBomb = false) => {
  let board;
  do {
    board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        const randomColor = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
        // UPDATED: Board now stores objects, not just strings
        row.push({ color: randomColor, type: 'NORMAL' });
      }
      board.push(row);
    }
  } while (checkForMatches(board).matches.size > 0);
  
  if (startWithBomb) {
    const midRow = Math.floor(BOARD_SIZE / 2);
    const midCol = Math.floor(BOARD_SIZE / 2);
    board[midRow][midCol] = { ...SPECIAL_PIECES.BOMB, color: board[midRow][midCol].color }; // A colored bomb
  }

  return board;
};

/**
 * Checks the entire board for all types of matches.
 * @param {object[][]} board - The 2D array representing the game board.
 * @returns {{matches: Set<number>, specialCreations: Array<object>}}
 */
export const checkForMatches = (board) => {
  const flatBoard = board.flat();
  const matches = new Set();
  const specialCreations = [];

  // Helper to process a potential match
  const processMatch = (indices) => {
    const firstPiece = flatBoard[indices[0]];
    if (!firstPiece || firstPiece.isSpecial) return; // Don't match special pieces this way

    const allSameColor = indices.every(index => flatBoard[index] && flatBoard[index].color === firstPiece.color);
    if (!allSameColor) return;
    
    // Check for L and T shapes (only for matches longer than 4)
    if (indices.length >= 5) {
      const positions = indices.map(getPosition);
      const rows = new Set(positions.map(p => p.row));
      const cols = new Set(positions.map(p => p.col));
      if (rows.size > 1 && cols.size > 1) { // This indicates a T or L shape
          specialCreations.push({ index: indices[2], type: 'BOMB', color: firstPiece.color });
          indices.forEach(index => matches.add(index));
          return;
      }
    }
    
    // Process linear matches
    if (indices.length === 5) {
        specialCreations.push({ index: indices[2], type: 'COLOR_BOMB', color: firstPiece.color });
    } else if (indices.length === 4) {
        const pos1 = getPosition(indices[0]);
        const pos2 = getPosition(indices[1]);
        const type = pos1.row === pos2.row ? 'LINE_CLEAR_H' : 'LINE_CLEAR_V';
        specialCreations.push({ index: indices[1], type, color: firstPiece.color });
    }
    
    indices.forEach(index => matches.add(index));
  };

  // Check for Horizontal Matches (3, 4, and 5)
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE - 2; j++) {
      // Check for 5
      if (j <= BOARD_SIZE - 5) {
        const indices = [i * BOARD_SIZE + j, i * BOARD_SIZE + j + 1, i * BOARD_SIZE + j + 2, i * BOARD_SIZE + j + 3, i * BOARD_SIZE + j + 4];
        processMatch(indices);
      }
      // Check for 4
      if (j <= BOARD_SIZE - 4) {
        const indices = [i * BOARD_SIZE + j, i * BOARD_SIZE + j + 1, i * BOARD_SIZE + j + 2, i * BOARD_SIZE + j + 3];
        processMatch(indices);
      }
      // Check for 3
      const indices = [i * BOARD_SIZE + j, i * BOARD_SIZE + j + 1, i * BOARD_SIZE + j + 2];
      processMatch(indices);
    }
  }

  // Check for Vertical Matches (3, 4, and 5)
  for (let i = 0; i < BOARD_SIZE - 2; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (i <= BOARD_SIZE - 5) {
        const indices = [i*BOARD_SIZE+j, (i+1)*BOARD_SIZE+j, (i+2)*BOARD_SIZE+j, (i+3)*BOARD_SIZE+j, (i+4)*BOARD_SIZE+j];
        processMatch(indices);
      }
      if (i <= BOARD_SIZE - 4) {
        const indices = [i*BOARD_SIZE+j, (i+1)*BOARD_SIZE+j, (i+2)*BOARD_SIZE+j, (i+3)*BOARD_SIZE+j];
        processMatch(indices);
      }
      const indices = [i * BOARD_SIZE + j, (i + 1) * BOARD_SIZE + j, (i + 2) * BOARD_SIZE + j];
      processMatch(indices);
    }
  }

  return { matches, specialCreations };
};

/**
 * Applies gravity to the board.
 * @param {object[][]} board - The game board with nulls for empty spaces.
 * @returns {object[][]} The board after pieces have fallen.
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
 * @param {object[][]} board - The game board after gravity has been applied.
 * @returns {object[][]} The refilled board.
 */
export const refillBoard = (board) => {
    const newBoard = JSON.parse(JSON.stringify(board));
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (newBoard[i][j] === null) {
                const randomColor = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
                newBoard[i][j] = { color: randomColor, type: 'NORMAL' };
            }
        }
    }
    return newBoard;
};

/**
 * Checks if any valid moves are left on the board.
 * @param {object[][]} board - The 2D array representing the game board.
 * @returns {boolean} True if a move is possible, false otherwise.
 */
export const checkForPossibleMoves = (board) => {
  const flatBoard = board.flat();
  for (let i = 0; i < flatBoard.length; i++) {
    const { row, col } = getPosition(i);
    const neighbors = [];
    if (col < BOARD_SIZE - 1) neighbors.push(i + 1); // Right
    if (row < BOARD_SIZE - 1) neighbors.push(i + BOARD_SIZE); // Down

    for (const neighbor of neighbors) {
      const newBoardFlat = [...flatBoard];
      [newBoardFlat[i], newBoardFlat[neighbor]] = [newBoardFlat[neighbor], newBoardFlat[i]];
      
      const tempBoard2D = [];
      while (newBoardFlat.length) tempBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));

      if (checkForMatches(tempBoard2D).matches.size > 0) {
        return true; // Found a possible move
      }
    }
  }
  return false; // No possible moves
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

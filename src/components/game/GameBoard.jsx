// Add this to GameBoard.jsx - Stability improvements to prevent rapid piece changes

// 🔧 FIXED: Add piece stability check to prevent rapid changes
const isPieceStable = useCallback((row, col) => {
  return board[row] && board[row][col] !== null && board[row][col] !== undefined;
}, [board]);

// 🔧 FIXED: Improved board update logic
const updateBoardSafely = useCallback((newBoard) => {
  // Ensure board integrity before setting
  const safeBoard = newBoard.map(row => 
    row ? row.map(piece => 
      piece !== null && piece !== undefined ? piece : null
    ) : new Array(BOARD_SIZE).fill(null)
  );
  
  setBoard(safeBoard);
  boardRef.current = safeBoard;
}, []);

// 🔧 FIXED: Use the safe update function in your board operations
// Replace any direct setBoard() calls with updateBoardSafely()

// For example, in your swap operation:
const handleDragEnd = useCallback((event, info) => {
  if (isProcessing || !gameStarted || !draggedPiece || processingRef.current) {
    setDraggedPiece(null);
    return;
  }

  const { offset } = info;
  const { index } = draggedPiece;
  const { row, col } = getPosition(index);

  // 🔧 FIXED: Add stability check
  if (!isPieceStable(row, col)) {
    setDraggedPiece(null);
    return;
  }

  let targetIndex;
  const threshold = 35; // 🔧 FIXED: Slightly increased threshold for better UX

  // ... rest of drag logic ...

  if (targetIndex !== undefined) {
    const draggedPosition = getPosition(index);
    const targetPosition = getPosition(targetIndex);

    if (isValidMove(boardRef.current, draggedPosition, targetPosition)) {
      console.log(`✅ Valid move: ${index} -> ${targetIndex}`);
      
      playSwap();
      
      const newBoard = swapPieces(boardRef.current, draggedPosition, targetPosition);
      updateBoardSafely(newBoard); // 🔧 FIXED: Use safe update
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      // 🔧 FIXED: Add slight delay to prevent rapid processing
      setTimeout(() => {
        if (gameStartedRef.current && !processingRef.current) {
          processMatches();
        }
      }, 150);
    } else {
      console.log(`❌ Invalid move: ${index} -> ${targetIndex}`);
      playInvalidMove();
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  }

  setDraggedPiece(null);
}, [isProcessing, gameStarted, draggedPiece, processMatches, playSwap, playInvalidMove, isPieceStable, updateBoardSafely]);

// CLEANED: GamePage.jsx - Correct imports, no duplicate GameBoard
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateInitialBoard,
  BOARD_SIZE,
  findMatches,
  findSpecialMatches,
  removeMatches,
  applyGravity,
  fillEmptySpaces,
  getPosition,
  swapPieces,
  isValidMove,
  POINTS_PER_PIECE,
  hasValidMoves,
  smartShuffle,
  activateSpecialItem,
  executeCombo,
  SPECIAL_ITEMS,
} from '../utils/gameLogic.js';   // ✅ fixed path

import GameBoard from '../components/game/GameBoard.jsx';   // ✅ external component, no inline version
import BottomNav from '../components/game/BottomNav.jsx';   // ✅ external component

// Asset mapping function - maps piece indices and special items to URLs
const getPieceUrl = (piece) => {
  const urlMap = {
    // Regular pieces (0-5)
    0: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Matcha.webp?updatedAt=1758904443599',
    1: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Milk.webp?updatedAt=1758904443453', 
    2: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Butter.webp?updatedAt=1758904443280',
    3: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Oreo.webp?updatedAt=1758904443333',
    4: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Marshmellow.webp?updatedAt=1758904443590',
    5: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/Strawberry.webp?updatedAt=1758904443682',
    
    // Special items
    [SPECIAL_ITEMS.CAT]: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/WhiteCat.webp?updatedAt=1758905830440',
    [SPECIAL_ITEMS.HONEY]: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/HoneyJar.webp?updatedAt=1758905928332',
    [SPECIAL_ITEMS.COLOR_BOMB]: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/ColourBomb.webp?updatedAt=1758905830618',
    [SPECIAL_ITEMS.SHOP_BOMB]: 'https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/ShopBomb.webp?updatedAt=1758905830542'
  };
  
  // If piece is already a URL, return as-is (backward compatibility)
  if (typeof piece === 'string' && piece.startsWith('http')) {
    return piece;
  }
  
  // Map by index or special item constant
  return urlMap[piece] || piece;
};

// Helper function to check if piece is a special item
const isSpecialItem = (piece) => {
  return Object.values(SPECIAL_ITEMS).includes(piece);
};

// Glow style generator for special items
const getGlowStyle = (specialType) => {
  switch (specialType) {
    case SPECIAL_ITEMS.CAT:
      return "radial-gradient(circle, rgba(200,220,255,0.7), transparent 70%)";
    case SPECIAL_ITEMS.HONEY:
      return "radial-gradient(circle, rgba(255,220,150,0.7), transparent 70%)";
    case SPECIAL_ITEMS.COLOR_BOMB:
      return "conic-gradient(from 0deg, red, orange, yellow, green, blue, violet, red)";
    case SPECIAL_ITEMS.SHOP_BOMB:
      return "radial-gradient(circle, rgba(255,180,255,0.7), transparent 70%)";
    default:
      return null;
  }
};

// Special Item Animation Wrapper - only wraps special items
const SpecialItemWrapper = ({ children, piece, disabled }) => {
  // Only animate if this is a special item and not disabled
  if (!isSpecialItem(piece) || disabled) {
    return children;
  }

  const glowStyle = getGlowStyle(piece);
  
  return (
    <div className="relative w-full h-full">
      {/* Glow Aura Background */}
      {glowStyle && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: glowStyle,
            filter: 'blur(8px)',
            zIndex: 1,
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Animated Item Container */}
      <motion.div
        className="relative w-full h-full"
        style={{ zIndex: 10 }}
        animate={{
          rotate: [0, 360],
          y: [0, -10, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Helper function to get adjacent pieces for Color Bomb target selection
const getAdjacentPieces = (board, position) => {
  const { row, col } = position;
  const adjacentPieces = [];
  
  // Check all 4 directions
  const directions = [
    { row: row - 1, col }, // up
    { row: row + 1, col }, // down
    { row, col: col - 1 }, // left
    { row, col: col + 1 }  // right
  ];
  
  directions.forEach(pos => {
    if (pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE) {
      const piece = board[pos.row][pos.col];
      if (piece && !isSpecialItem(piece)) {
        adjacentPieces.push(piece);
      }
    }
  });
  
  return adjacentPieces;
};

const GameBoard = forwardRef(({ setScore, gameStarted, startWithBomb, onGameEnd, onShuffleNeeded, onBoardReady, onGameBoardRef, onProcessingChange }, ref) => {
  const [board, setBoard] = useState(() => generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedPieces, setMatchedPieces] = useState(new Set());
  const [bombPositions, setBombPositions] = useState(new Set());
  const [isShuffling, setIsShuffling] = useState(false);
  const processingRef = useRef(false);
  const boardRef = useRef(board);
  const deadlockCheckRef = useRef(null);
  const boardElementRef = useRef(null);

  // Keep board ref updated
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // TMA bomb drop handler
  const handleBombDrop = useCallback(({ row, col }) => {
    if (isProcessing || isShuffling || !gameStarted) {
      console.log('🚫 Bomb drop blocked - game not ready');
      return;
    }

    console.log('💥 Bomb dropped at:', { row, col });

    // Create explosion indices for 3x3 area
    const explosionIndices = new Set();
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          explosionIndices.add(r * BOARD_SIZE + c);
        }
      }
    }

    // Award points for exploded pieces (double points for bomb)
    const pointsAwarded = explosionIndices.size * POINTS_PER_PIECE * 2;
    setScore(prev => prev + pointsAwarded);

    // Show explosion animation
    setMatchedPieces(explosionIndices);

    // Heavy haptic feedback for bomb explosion
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }

    setTimeout(async () => {
      // Remove exploded pieces
      const currentBoard = removeMatches(boardRef.current, Array.from(explosionIndices));
      
      // Apply gravity and refill
      const gravityBoard = applyGravity(currentBoard);
      const newBoard = fillEmptySpaces(gravityBoard);
      
      setBoard(newBoard);
      boardRef.current = newBoard;
      setMatchedPieces(new Set());
      
      // Process any new matches
      setTimeout(() => {
        processMatches();
      }, 100);
    }, 200);
  }, [isProcessing, isShuffling, gameStarted, setScore]);

  // Expose methods to parent via useImperativeHandle
  useImperativeHandle(ref, () => ({
    getBoardElement: () => boardElementRef.current,
    handleBombDrop: handleBombDrop
  }), [handleBombDrop]);

  // Provide board reference to GamePage
  useEffect(() => {
    if (onGameBoardRef) {
      onGameBoardRef({
        getBoardElement: () => boardElementRef.current,
        handleBombDrop: handleBombDrop
      });
    }
  }, [onGameBoardRef, handleBombDrop]);

  // Improved shuffle function with better state management
  const performShuffle = useCallback(() => {
    if (isProcessing || isShuffling || !gameStarted) {
      console.log('🚫 Shuffle blocked:', { isProcessing, isShuffling, gameStarted });
      return false; // Return false to indicate shuffle didn't happen
    }
    
    console.log('🔀 MANUAL shuffle triggered by user');
    console.log('Current board before shuffle:', boardRef.current);
    
    setIsShuffling(true);
    
    // Clear deadlock check to prevent interference
    if (deadlockCheckRef.current) {
      clearTimeout(deadlockCheckRef.current);
    }
    
    // Immediate shuffle without timeout for better UX
    try {
      const currentBoard = boardRef.current;
      const shuffledBoard = smartShuffle(currentBoard);
      
      console.log('🎯 Shuffled board result:', shuffledBoard);
      console.log('🔍 Board changed?', JSON.stringify(currentBoard) !== JSON.stringify(shuffledBoard));
      
      // Force state update with new reference
      setBoard([...shuffledBoard.map(row => [...row])]);
      boardRef.current = shuffledBoard;
      
      // Clear any drag state
      setDraggedPiece(null);
      setMatchedPieces(new Set());
      
      // Reset deadlock status
      onShuffleNeeded?.(false);
      
      // Haptic feedback for shuffle
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
      }
      
      console.log('✅ Manual shuffle complete - board updated');
      
      // End shuffling state after a brief visual indication
      setTimeout(() => {
        setIsShuffling(false);
      }, 200);
      
      return true; // Return true to indicate successful shuffle
      
    } catch (error) {
      console.error('🚨 Shuffle error:', error);
      setIsShuffling(false);
      return false;
    }
  }, [gameStarted, isProcessing, isShuffling, onShuffleNeeded]);

  // Provide shuffle function to parent with better error handling
  useEffect(() => {
    if (onBoardReady && typeof onBoardReady === 'function') {
      console.log('🎮 Providing shuffle function to parent');
      onBoardReady(performShuffle);
    }
  }, [performShuffle, onBoardReady]);

  // Deadlock detection with proper debouncing and conditions
  useEffect(() => {
    // Clear any existing timeout
    if (deadlockCheckRef.current) {
      clearTimeout(deadlockCheckRef.current);
    }

    // Only check for deadlocks when game is stable
    if (gameStarted && !isProcessing && !isShuffling && board.length > 0) {
      deadlockCheckRef.current = setTimeout(() => {
        // Double-check the conditions before checking moves
        if (!isProcessing && !isShuffling && gameStarted) {
          const noMoves = !hasValidMoves(boardRef.current);
          console.log(`🔍 Deadlock check: ${noMoves ? 'NO MOVES' : 'MOVES AVAILABLE'}`);
          onShuffleNeeded?.(noMoves);
        }
      }, 1000);
    }

    return () => {
      if (deadlockCheckRef.current) {
        clearTimeout(deadlockCheckRef.current);
      }
    };
  }, [board, gameStarted, isProcessing, isShuffling]);

  // Reset board when game starts - with optional bomb
  useEffect(() => {
    if (gameStarted) {
      console.log('🎮 Starting new game');
      const newBoard = generateInitialBoard();
      
      // Add cookie bomb if purchased
      if (startWithBomb) {
        const centerRow = Math.floor(BOARD_SIZE / 2);
        const centerCol = Math.floor(BOARD_SIZE / 2);
        const bombIndex = centerRow * BOARD_SIZE + centerCol;
        
        // Keep the original emoji but mark position as having a bomb
        setBombPositions(new Set([bombIndex]));
        
        // Haptic feedback for bomb placement
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
      } else {
        setBombPositions(new Set());
      }
      
      setBoard(newBoard);
      boardRef.current = newBoard;
      setDraggedPiece(null);
      setMatchedPieces(new Set());
      setIsProcessing(false);
      setIsShuffling(false);
      processingRef.current = false;
      
      // Reset deadlock status
      onShuffleNeeded?.(false);
    }
  }, [gameStarted, startWithBomb]);

  // Handle bomb explosion - clears 3x3 area
  const triggerBombExplosion = useCallback((bombIndex) => {
    const { row, col } = getPosition(bombIndex);
    const explosionIndices = new Set();
    
    // Add 3x3 area around bomb
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          explosionIndices.add(r * BOARD_SIZE + c);
        }
      }
    }
    
    // Award points for exploded pieces
    const pointsAwarded = explosionIndices.size * POINTS_PER_PIECE * 2; // Double points for bomb
    setScore(prev => prev + pointsAwarded);
    
    // Remove bomb from positions
    setBombPositions(prev => {
      const newBombs = new Set(prev);
      newBombs.delete(bombIndex);
      return newBombs;
    });
    
    return explosionIndices;
  }, [setScore]);

  // Handle special item activation with processing flag safety
  const handleSpecialActivation = useCallback(async (index) => {
    const { row, col } = getPosition(index);
    const piece = boardRef.current[row][col];
    
    if (!isSpecialItem(piece) || isProcessing || isShuffling) return;
    
    console.log('🌟 Activating special item:', piece, 'at position:', { row, col });
    
    setIsProcessing(true);
    processingRef.current = true;
    onProcessingChange?.(true);
    
    try {
      let clearIndices = [];
      
      // Handle Color Bomb target selection
      if (piece === SPECIAL_ITEMS.COLOR_BOMB) {
        const adjacentPieces = getAdjacentPieces(boardRef.current, { row, col });
        const targetPiece = adjacentPieces.length > 0 ? adjacentPieces[0] : null;
        
        if (targetPiece) {
          clearIndices = activateSpecialItem(boardRef.current, piece, { row, col }, targetPiece);
        } else {
          clearIndices = [index]; // Just clear the bomb itself if no target
        }
        
        // Always include the bomb's own index to consume it
        clearIndices = Array.from(new Set([...clearIndices, index]));
      } else {
        clearIndices = activateSpecialItem(boardRef.current, piece, { row, col });
      }
      
      // Show matched pieces animation
      setMatchedPieces(new Set(clearIndices));
      
      // Award points for cleared pieces
      const pointsAwarded = clearIndices.length * POINTS_PER_PIECE * 2; // Double points for special activation
      setScore(prev => prev + pointsAwarded);
      
      // Haptic feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
      }
      
      // Animation delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Clear pieces and process cascades
      const newBoard = removeMatches(boardRef.current, clearIndices);
      const gravityBoard = applyGravity(newBoard);
      const finalBoard = fillEmptySpaces(gravityBoard);
      
      setBoard(finalBoard);
      boardRef.current = finalBoard;
      setMatchedPieces(new Set());
      
      // Process any new matches
      setTimeout(() => {
        processMatches();
      }, 100);
      
    } finally {
      // Always reset processing flags
      setIsProcessing(false);
      processingRef.current = false;
      onProcessingChange?.(false);
    }
    
  }, [isProcessing, isShuffling, setScore]);

  // Match processing with special item creation
  const processMatches = useCallback(async () => {
    if (processingRef.current || !gameStarted || isShuffling) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    onProcessingChange?.(true);
    
    let currentBoard = boardRef.current.map(row => [...row]);
    let totalMatches = 0;
    let cascadeCount = 0;
    const maxCascades = 5;
    
    while (cascadeCount < maxCascades) {
      // Use enhanced match detection instead of basic findMatches
      const specialMatches = findSpecialMatches(currentBoard);
      
      // Collect all matched indices for animation
      const allMatchedIndices = new Set([
        ...specialMatches.regular,
        ...specialMatches.cat.flatMap(match => match.pieces),
        ...specialMatches.honey.flatMap(match => match.pieces), 
        ...specialMatches.colorBomb.flatMap(match => match.pieces)
      ]);
      
      if (allMatchedIndices.size === 0) break;
      
      // Check if any matches trigger bombs
      allMatchedIndices.forEach(matchIndex => {
        if (bombPositions.has(matchIndex)) {
          const explosionIndices = triggerBombExplosion(matchIndex);
          explosionIndices.forEach(index => allMatchedIndices.add(index));
        }
      });
      
      // Show matched pieces with faster animation
      setMatchedPieces(allMatchedIndices);
      totalMatches += allMatchedIndices.size;
      
      // Reduced from 400ms to 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // SPECIAL ITEM CREATION: Remove matches but preserve anchors for special items
      const newBoard = currentBoard.map(row => [...row]);
      
      // Process special matches - convert anchors to special items, clear other pieces
      specialMatches.cat.forEach(match => {
        const { row, col } = match.position;
        // Replace anchor with Cat item
        newBoard[row][col] = SPECIAL_ITEMS.CAT;
        // Clear other pieces in the match (but not the anchor)
        match.pieces.forEach(index => {
          const piecePos = getPosition(index);
          if (piecePos.row !== row || piecePos.col !== col) {
            newBoard[piecePos.row][piecePos.col] = null;
          }
        });
      });
      
      specialMatches.honey.forEach(match => {
        const { row, col } = match.position;
        // Replace anchor with Honey Jar
        newBoard[row][col] = SPECIAL_ITEMS.HONEY;
        // Clear other pieces in the match (but not the anchor)
        match.pieces.forEach(index => {
          const piecePos = getPosition(index);
          if (piecePos.row !== row || piecePos.col !== col) {
            newBoard[piecePos.row][piecePos.col] = null;
          }
        });
      });
      
      specialMatches.colorBomb.forEach(match => {
        const { row, col } = match.position;
        // Replace anchor with Color Bomb
        newBoard[row][col] = SPECIAL_ITEMS.COLOR_BOMB;
        // Clear other pieces in the match (but not the anchor)
        match.pieces.forEach(index => {
          const piecePos = getPosition(index);
          if (piecePos.row !== row || piecePos.col !== col) {
            newBoard[piecePos.row][piecePos.col] = null;
          }
        });
      });
      
      // Clear regular matches normally
      specialMatches.regular.forEach(index => {
        const { row, col } = getPosition(index);
        newBoard[row][col] = null;
      });
      
      // Apply gravity
      currentBoard = applyGravity(newBoard);
      
      // Fill empty spaces
      currentBoard = fillEmptySpaces(currentBoard);
      
      // Update board visually
      setBoard([...currentBoard.map(row => [...row])]);
      boardRef.current = currentBoard;
      
      // Reduced from 300ms to 60ms
      await new Promise(resolve => setTimeout(resolve, 60));
      
      cascadeCount++;
      setMatchedPieces(new Set());
    }
    
    // Award points with cascade bonus
    if (totalMatches > 0) {
      const basePoints = totalMatches * POINTS_PER_PIECE;
      const cascadeBonus = Math.max(0, (cascadeCount - 1) * 50);
      const totalPoints = basePoints + cascadeBonus;
      
      setScore(prev => prev + totalPoints);
      
      // Haptic feedback for matches
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    }
    
    setIsProcessing(false);
    processingRef.current = false;
  }, [setScore, gameStarted, bombPositions, triggerBombExplosion, isShuffling]);

  // Handle direct bomb tap
  const handleBombTap = useCallback((index) => {
    if (!bombPositions.has(index) || isProcessing || isShuffling) return;
    
    // Trigger bomb explosion
    const explosionIndices = triggerBombExplosion(index);
    
    // Show explosion animation
    setMatchedPieces(explosionIndices);
    
    // Heavy haptic feedback for bomb
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    
    setTimeout(async () => {
      // Remove exploded pieces
      const currentBoard = removeMatches(boardRef.current, Array.from(explosionIndices));
      
      // Apply gravity and refill
      const gravityBoard = applyGravity(currentBoard);
      const newBoard = fillEmptySpaces(gravityBoard);
      
      setBoard(newBoard);
      boardRef.current = newBoard;
      setMatchedPieces(new Set());
      
      // Process any new matches
      setTimeout(() => {
        processMatches();
      }, 100);
    }, 200);
  }, [bombPositions, isProcessing, isShuffling, triggerBombExplosion, processMatches]);

  // Handle drag start with special item detection
  const handleDragStart = useCallback((event, { index }) => {
    if (isProcessing || !gameStarted || processingRef.current || isShuffling) return;
    
    const { row, col } = getPosition(index);
    const piece = boardRef.current[row][col];
    
    // Check if it's a shop bomb - handle differently
    if (bombPositions.has(index)) {
      handleBombTap(index);
      return;
    }
    
    // Check if it's a special item - activate on tap
    if (isSpecialItem(piece)) {
      handleSpecialActivation(index);
      return;
    }
    
    setDraggedPiece({ index });
  }, [isProcessing, gameStarted, bombPositions, handleBombTap, handleSpecialActivation, isShuffling]);

  // Handle drag end with special combo detection and TRANSFORM_AND_ACTIVATE
  const handleDragEnd = useCallback(async (event, info) => {
    if (isProcessing || !gameStarted || !draggedPiece || processingRef.current || isShuffling) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    let targetIndex;
    const threshold = 30; // Minimum drag distance to trigger swap

    // Determine drag direction and target piece
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      // Horizontal drag
      if (offset.x > threshold && col < BOARD_SIZE - 1) {
        targetIndex = index + 1; // Drag right
      } else if (offset.x < -threshold && col > 0) {
        targetIndex = index - 1; // Drag left
      }
    } else {
      // Vertical drag
      if (offset.y > threshold && row < BOARD_SIZE - 1) {
        targetIndex = index + BOARD_SIZE; // Drag down
      } else if (offset.y < -threshold && row > 0) {
        targetIndex = index - BOARD_SIZE; // Drag up
      }
    }

    // Execute swap if valid target found
    if (targetIndex !== undefined) {
      const draggedPosition = getPosition(index);
      const targetPosition = getPosition(targetIndex);
      
      const draggedPieceType = boardRef.current[draggedPosition.row][draggedPosition.col];
      const targetPieceType = boardRef.current[targetPosition.row][targetPosition.col];
      
      // Check for special item combo
      if (isSpecialItem(draggedPieceType) && isSpecialItem(targetPieceType)) {
        console.log('🌟 Special combo detected:', draggedPieceType, '+', targetPieceType);
        
        setIsProcessing(true);
        processingRef.current = true;
        onProcessingChange?.(true);
        
        try {
          const comboResult = executeCombo(boardRef.current, draggedPieceType, draggedPosition, targetPieceType, targetPosition);
          
          // Handle TRANSFORM_AND_ACTIVATE for Honey + Color Bomb combo
          if (comboResult.type === 'TRANSFORM_AND_ACTIVATE') {
            console.log('🔥 Transform and activate combo - Honey + Color Bomb');
            
            // Transform all target pieces into Cat items
            const newBoard = boardRef.current.map(row => [...row]);
            comboResult.indices.forEach(index => {
              const { row, col } = getPosition(index);
              newBoard[row][col] = SPECIAL_ITEMS.CAT;
            });
            
            // Update board state
            setBoard(newBoard);
            boardRef.current = newBoard;
            
            // Award initial transformation points
            const transformPoints = comboResult.indices.length * POINTS_PER_PIECE;
            setScore(prev => prev + transformPoints);
            
            // Heavy haptic feedback for transformation
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            }
            
            // Brief pause to show transformation
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Activate each Cat item sequentially with wave effect
            for (const index of comboResult.indices) {
              const { row, col } = getPosition(index);
              const catIndices = activateSpecialItem(boardRef.current, SPECIAL_ITEMS.CAT, { row, col });
              
              // Show animation for this Cat activation
              setMatchedPieces(new Set(catIndices));
              
              // Award points for Cat activation (triple points for combo effect)
              const catPoints = catIndices.length * POINTS_PER_PIECE * 3;
              setScore(prev => prev + catPoints);
              
              // Medium haptic feedback for each Cat activation
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
              }
              
              // Animation delay for wave effect
              await new Promise(resolve => setTimeout(resolve, 150));
              
              // Clear pieces and update board
              const clearedBoard = removeMatches(boardRef.current, catIndices);
              const gravityBoard = applyGravity(clearedBoard);
              const finalBoard = fillEmptySpaces(gravityBoard);
              
              setBoard(finalBoard);
              boardRef.current = finalBoard;
              setMatchedPieces(new Set());
              
              // Brief pause between Cat activations for visual clarity
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Process any final cascade matches
            setTimeout(() => {
              processMatches();
            }, 200);
            
          } else if (comboResult.indices.length > 0) {
            // Handle other combos normally
            setMatchedPieces(new Set(comboResult.indices));
            
            // Award combo points
            const pointsAwarded = comboResult.indices.length * POINTS_PER_PIECE * 3; // Triple points for combos
            setScore(prev => prev + pointsAwarded);
            
            // Heavy haptic feedback for combo
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            }
            
            // Animation delay
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Clear pieces and process cascades
            const newBoard = removeMatches(boardRef.current, comboResult.indices);
            const gravityBoard = applyGravity(newBoard);
            const finalBoard = fillEmptySpaces(gravityBoard);
            
            setBoard(finalBoard);
            boardRef.current = finalBoard;
            setMatchedPieces(new Set());
            
            // Process any new matches
            setTimeout(() => {
              processMatches();
            }, 100);
          }
          
        } finally {
          // Always reset processing flags
          setIsProcessing(false);
          processingRef.current = false;
          onProcessingChange?.(false);
        }
        
      } else if (isValidMove(boardRef.current, draggedPosition, targetPosition)) {
        // Execute normal swap
        const newBoard = swapPieces(boardRef.current, draggedPosition, targetPosition);
        setBoard(newBoard);
        boardRef.current = newBoard;
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        // Reduced delay from 200ms to 30ms
        setTimeout(() => {
          processMatches();
        }, 30);
      } else {
        // Invalid swap - light haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      }
    }

    // Clear dragged piece
    setDraggedPiece(null);
  }, [isProcessing, gameStarted, draggedPiece, processMatches, isShuffling, setScore]);

  // Check for initial matches only once when game starts
  useEffect(() => {
    if (gameStarted && !processingRef.current && !isShuffling) {
      const timeoutId = setTimeout(() => {
        // Use legacy findMatches for initial check to avoid creating specials at start
        const matches = findMatches(boardRef.current);
        if (matches.length > 0) {
          processMatches();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [gameStarted, processMatches, isShuffling]);

  return (
    <div className="w-full flex justify-center">
      {/* Fixed size container that NEVER moves */}
      <div
        ref={boardElementRef}
        className={`bg-nav rounded-2xl p-3 shadow-2xl relative transition-all duration-300 ${
          isShuffling ? 'animate-pulse bg-accent/20' : ''
        }`}
        style={{
          width: 'min(85vw, 350px)',
          height: 'min(85vw, 350px)',
          flexShrink: 0, // Never shrink
          flexGrow: 0,   // Never grow
        }}
      >
        {/* Shuffle overlay - NO CLICK HANDLERS */}
        {isShuffling && (
          <div className="absolute inset-0 bg-accent/30 rounded-2xl flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center">
              <div className="text-4xl mb-2">🔀</div>
              <p className="text-sm font-bold text-white">Shuffling...</p>
            </div>
          </div>
        )}

        {/* Static grid structure - always present */}
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const cellSize = `calc((100% - ${(BOARD_SIZE - 1) * 4}px) / ${BOARD_SIZE})`;
          const left = `calc(${col} * (${cellSize} + 4px))`;
          const top = `calc(${row} * (${cellSize} + 4px))`;
          
          const piece = board[row] ? board[row][col] : null;
          const isSelected = draggedPiece?.index === index;
          const isMatched = matchedPieces.has(index);
          const hasBomb = bombPositions.has(index);
          
          return (
            <div
              key={`cell-${index}`}
              className="absolute"
              style={{
                left,
                top,
                width: cellSize,
                height: cellSize,
              }}
            >
              {piece && (
                <SpecialItemWrapper
                  piece={piece}
                  disabled={isShuffling || isMatched}
                >
                  <GamePiece
                    emoji={getPieceUrl(piece)}
                    index={index}
                    isSelected={isSelected}
                    isMatched={isMatched}
                    hasBomb={hasBomb}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    disabled={isShuffling}
                  />
                </SpecialItemWrapper>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;

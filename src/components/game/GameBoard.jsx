// FIXED: GameBoard.jsx - Shuffle functionality + Special Item Animations
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateInitialBoard,
  BOARD_SIZE,
  findMatches,
  removeMatches,
  applyGravity,
  fillEmptySpaces,
  getPosition,
  swapPieces,
  isValidMove,
  POINTS_PER_PIECE,
  hasValidMoves,
  smartShuffle,
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';
import { motion } from 'framer-motion';

// Special item type constants
const SPECIAL_ITEMS = {
  CAT: 'CAT_ITEM',
  HONEY: 'HONEY_ITEM', 
  COLOR_BOMB: 'COLOR_BOMB_ITEM',
  SHOP_BOMB: 'SHOP_BOMB_ITEM'
};

// Function to detect special item type from URL
const getSpecialItemType = (emoji) => {
  if (!emoji || typeof emoji !== 'string') return null;
  
  if (emoji.includes('Meowchi.webp')) return SPECIAL_ITEMS.CAT;
  if (emoji.includes('Jar.webp')) return SPECIAL_ITEMS.HONEY;
  if (emoji.includes('Cookie.webp')) return SPECIAL_ITEMS.COLOR_BOMB;
  if (emoji.includes('Oreo.webp')) return SPECIAL_ITEMS.SHOP_BOMB;
  
  return null;
};

// Function to get glow style based on special item type
const getGlowStyle = (type) => {
  switch (type) {
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

// Special animated piece component
const SpecialGamePiece = ({ 
  emoji, 
  specialType,
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false,
  hasBomb = false,
  disabled = false 
}) => {
  const handlePointerDown = (e) => {
    if (disabled) return;
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      const feedbackType = hasBomb ? 'heavy' : 'medium';
      window.Telegram.WebApp.HapticFeedback.impactOccurred(feedbackType);
    }
    
    onDragStart(e, { index });
  };

  const glowStyle = getGlowStyle(specialType);

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-0.5"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isMatched ? 0 : 1, 
        opacity: isMatched ? 0 : (disabled ? 0.6 : 1)
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.08,
        ease: "easeOut"
      }}
    >
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center relative
          text-base font-bold select-none
          transition-all duration-50 shadow-lg
          ${disabled 
            ? 'cursor-not-allowed opacity-60' 
            : 'cursor-pointer'
          }
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : hasBomb
              ? 'bg-red-600 shadow-red-600/50' 
              : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        onPointerDown={handlePointerDown}
        style={{ 
          touchAction: disabled ? 'auto' : 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {/* Special Item Animation Container */}
        <motion.div
          className="relative flex items-center justify-center w-full h-full"
          animate={disabled ? {} : {
            rotate: [0, 360],
            y: [0, -10, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 2.5,
            ease: "easeInOut",
            repeat: disabled ? 0 : Infinity,
            repeatDelay: 1,
          }}
        >
          {/* Glow Aura */}
          {glowStyle && !disabled && (
            <motion.div
              className="absolute rounded-full"
              style={{
                width: "90%",
                height: "90%",
                background: glowStyle,
                filter: "blur(8px)",
                zIndex: 0,
              }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
          )}
          
          {/* Special Item Sprite */}
          <motion.img
            src={emoji}
            alt="Special Game Piece"
            className={`relative z-10 w-full h-full object-contain rounded-lg p-1 ${disabled ? 'grayscale' : ''}`}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              imageRendering: 'auto',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '🪙';
            }}
          />
        </motion.div>
        
        {/* Bomb overlay indicator */}
        {hasBomb && !disabled && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            💥
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

const GameBoard = ({ setScore, gameStarted, startWithBomb, onGameEnd, onShuffleNeeded, onBoardReady }) => {
  const [board, setBoard] = useState(() => generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedPieces, setMatchedPieces] = useState(new Set());
  const [bombPositions, setBombPositions] = useState(new Set());
  const [isShuffling, setIsShuffling] = useState(false);
  const processingRef = useRef(false);
  const boardRef = useRef(board);
  const deadlockCheckRef = useRef(null);

  // Keep board ref updated
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // FIXED: Improved shuffle function with better state management
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
    
    // FIXED: Immediate shuffle without timeout for better UX
    try {
      const currentBoard = boardRef.current;
      const shuffledBoard = smartShuffle(currentBoard);
      
      console.log('🎯 Shuffled board result:', shuffledBoard);
      console.log('🔍 Board changed?', JSON.stringify(currentBoard) !== JSON.stringify(shuffledBoard));
      
      // FIXED: Force state update with new reference
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

  // FIXED: Provide shuffle function to parent with better error handling
  useEffect(() => {
    if (onBoardReady && typeof onBoardReady === 'function') {
      console.log('🎮 Providing shuffle function to parent');
      onBoardReady(performShuffle);
    }
  }, [performShuffle, onBoardReady]);

  // FIXED: Deadlock detection with proper debouncing and conditions
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

  // OPTIMIZED: Much faster match processing with bomb support
  const processMatches = useCallback(async () => {
    if (processingRef.current || !gameStarted || isShuffling) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    
    let currentBoard = boardRef.current.map(row => [...row]);
    let totalMatches = 0;
    let cascadeCount = 0;
    const maxCascades = 5;
    
    while (cascadeCount < maxCascades) {
      const matches = findMatches(currentBoard);
      
      if (matches.length === 0) break;
      
      // Check if any matches trigger bombs
      let allMatchedIndices = new Set(matches);
      
      // Check for bomb triggers
      matches.forEach(matchIndex => {
        if (bombPositions.has(matchIndex)) {
          const explosionIndices = triggerBombExplosion(matchIndex);
          explosionIndices.forEach(index => allMatchedIndices.add(index));
        }
      });
      
      // Show matched pieces with faster animation
      setMatchedPieces(allMatchedIndices);
      totalMatches += allMatchedIndices.size;
      
      // FASTER: Reduced from 400ms to 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Remove matches
      currentBoard = removeMatches(currentBoard, Array.from(allMatchedIndices));
      
      // Apply gravity
      currentBoard = applyGravity(currentBoard);
      
      // Fill empty spaces
      currentBoard = fillEmptySpaces(currentBoard);
      
      // Update board visually
      setBoard([...currentBoard.map(row => [...row])]);
      boardRef.current = currentBoard;
      
      // FASTER: Reduced from 300ms to 60ms
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

  // Handle drag start
  const handleDragStart = useCallback((event, { index }) => {
    if (isProcessing || !gameStarted || processingRef.current || isShuffling) return;
    
    // Check if it's a bomb - handle differently
    if (bombPositions.has(index)) {
      handleBombTap(index);
      return;
    }
    
    setDraggedPiece({ index });
  }, [isProcessing, gameStarted, bombPositions, handleBombTap, isShuffling]);

  // Handle drag end - determine swap direction and execute
  const handleDragEnd = useCallback((event, info) => {
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

      if (isValidMove(boardRef.current, draggedPosition, targetPosition)) {
        // Execute the swap
        const newBoard = swapPieces(boardRef.current, draggedPosition, targetPosition);
        setBoard(newBoard);
        boardRef.current = newBoard;
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        // FASTER: Reduced delay from 200ms to 30ms
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
  }, [isProcessing, gameStarted, draggedPiece, processMatches, isShuffling]);

  // Check for initial matches only once when game starts
  useEffect(() => {
    if (gameStarted && !processingRef.current && !isShuffling) {
      const timeoutId = setTimeout(() => {
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
      {/* COMPLETELY STATIC: Fixed size container that NEVER moves */}
      <div
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
        {/* FIXED: Shuffle overlay - NO CLICK HANDLERS */}
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
          
          const emoji = board[row] ? board[row][col] : null;
          const isSelected = draggedPiece?.index === index;
          const isMatched = matchedPieces.has(index);
          const hasBomb = bombPositions.has(index);
          
          // Check if this is a special item
          const specialType = getSpecialItemType(emoji);
          
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
              {emoji && (
                specialType ? (
                  // Render special animated piece
                  <SpecialGamePiece
                    emoji={emoji}
                    specialType={specialType}
                    index={index}
                    isSelected={isSelected}
                    isMatched={isMatched}
                    hasBomb={hasBomb}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    disabled={isShuffling}
                  />
                ) : (
                  // Render normal piece
                  <GamePiece
                    emoji={emoji}
                    index={index}
                    isSelected={isSelected}
                    isMatched={isMatched}
                    hasBomb={hasBomb}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    disabled={isShuffling}
                  />
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameBoard;

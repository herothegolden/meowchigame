// src/components/game/GameBoard.jsx - FIXED VERSION
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
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';
import { useAudio } from '../../hooks/useAudio';

const GameBoard = ({ setScore, gameStarted, startWithBomb, onGameEnd }) => {
  const [board, setBoard] = useState(() => generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedPieces, setMatchedPieces] = useState(new Set());
  const [bombPositions, setBombPositions] = useState(new Set());
  
  // FIXED: Single source of truth for processing state
  const gameStateRef = useRef({
    isProcessing: false,
    gameStarted: false,
    board: board,
    matchesProcessed: false // FIXED: Track if initial matches processed
  });

  // AUDIO INTEGRATION
  const { playMatch, playSwap, playInvalidMove, playBomb, playScoreUpdate } = useAudio();

  // FIXED: Synchronize refs with state immediately
  useEffect(() => {
    gameStateRef.current.board = board;
  }, [board]);

  useEffect(() => {
    gameStateRef.current.gameStarted = gameStarted;
    if (!gameStarted) {
      gameStateRef.current.matchesProcessed = false; // FIXED: Reset on new game
    }
  }, [gameStarted]);

  useEffect(() => {
    gameStateRef.current.isProcessing = isProcessing;
  }, [isProcessing]);

  // FIXED: Initialize game state properly without loops
  useEffect(() => {
    if (gameStarted && !gameStateRef.current.matchesProcessed) {
      console.log('🎮 Starting new game...');
      const newBoard = generateInitialBoard();
      
      // Add cookie bomb if purchased
      if (startWithBomb) {
        const centerRow = Math.floor(BOARD_SIZE / 2);
        const centerCol = Math.floor(BOARD_SIZE / 2);
        const bombIndex = centerRow * BOARD_SIZE + centerCol;
        
        setBombPositions(new Set([bombIndex]));
        
        // AUDIO: Bomb placement sound
        setTimeout(() => playBomb(), 500);
        
        // Haptic feedback for bomb placement
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
      } else {
        setBombPositions(new Set());
      }
      
      setBoard(newBoard);
      setDraggedPiece(null);
      setMatchedPieces(new Set());
      setIsProcessing(false);
      
      // FIXED: Mark as processed to prevent re-initialization
      gameStateRef.current.matchesProcessed = true;
      
      // FIXED: Process initial matches ONCE with delay
      setTimeout(() => {
        if (gameStateRef.current.gameStarted && !gameStateRef.current.isProcessing) {
          const matches = findMatches(gameStateRef.current.board);
          if (matches.length > 0) {
            console.log('🎯 Processing initial matches:', matches.length);
            processMatches();
          }
        }
      }, 500); // Longer delay to ensure state is stable
    }
  }, [gameStarted, startWithBomb]); // FIXED: Only depend on game start triggers

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
    
    // AUDIO: Explosive bomb sound
    playBomb();
    
    // Award points for exploded pieces
    const pointsAwarded = explosionIndices.size * POINTS_PER_PIECE * 2; // Double points for bomb
    setScore(prev => {
      const newScore = prev + pointsAwarded;
      setTimeout(() => playScoreUpdate(), 200);
      return newScore;
    });
    
    // Remove bomb from positions
    setBombPositions(prev => {
      const newBombs = new Set(prev);
      newBombs.delete(bombIndex);
      return newBombs;
    });
    
    return explosionIndices;
  }, [setScore, playBomb, playScoreUpdate]);

  // FIXED: Completely rewritten processMatches to prevent infinite loops
  const processMatches = useCallback(async () => {
    // CRITICAL: Single entry point - prevent concurrent processing
    if (gameStateRef.current.isProcessing || !gameStateRef.current.gameStarted) {
      console.log('🚫 Skipping processMatches - already processing or game not started');
      return;
    }
    
    console.log('🔄 Starting match processing...');
    
    // FIXED: Set processing state immediately and synchronously
    gameStateRef.current.isProcessing = true;
    setIsProcessing(true);
    
    try {
      let currentBoard = [...gameStateRef.current.board.map(row => [...row])];
      let totalMatches = 0;
      let cascadeCount = 0;
      const MAX_CASCADES = 3; // Safety limit
      
      // FIXED: Single cascade loop with proper exit conditions
      while (cascadeCount < MAX_CASCADES) {
        const matches = findMatches(currentBoard);
        
        // CRITICAL: Exit immediately if no matches
        if (matches.length === 0) {
          console.log(`✅ No more matches found after ${cascadeCount} cascades`);
          break;
        }
        
        console.log(`🎯 Found ${matches.length} matches in cascade ${cascadeCount + 1}`);
        
        // Check if any matches trigger bombs
        let allMatchedIndices = new Set(matches);
        let bombTriggered = false;
        
        // Check for bomb triggers
        for (const matchIndex of matches) {
          if (bombPositions.has(matchIndex)) {
            const explosionIndices = triggerBombExplosion(matchIndex);
            explosionIndices.forEach(index => allMatchedIndices.add(index));
            bombTriggered = true;
            break; // Only one bomb per cascade
          }
        }
        
        // AUDIO: Match sound with cascade progression
        if (!bombTriggered) {
          playMatch(cascadeCount);
        }
        
        // Show matched pieces briefly
        setMatchedPieces(allMatchedIndices);
        totalMatches += allMatchedIndices.size;
        
        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Remove matches
        currentBoard = removeMatches(currentBoard, Array.from(allMatchedIndices));
        
        // Apply gravity
        currentBoard = applyGravity(currentBoard);
        
        // Fill empty spaces
        currentBoard = fillEmptySpaces(currentBoard);
        
        // FIXED: Single board update per cascade
        setBoard([...currentBoard.map(row => [...row])]);
        gameStateRef.current.board = currentBoard;
        
        // Clear matched pieces animation
        setMatchedPieces(new Set());
        
        // Wait before next cascade check
        await new Promise(resolve => setTimeout(resolve, 200));
        
        cascadeCount++;
      }
      
      // Award points with cascade bonus
      if (totalMatches > 0) {
        const basePoints = totalMatches * POINTS_PER_PIECE;
        const cascadeBonus = Math.max(0, (cascadeCount - 1) * 50);
        const totalPoints = basePoints + cascadeBonus;
        
        console.log(`💰 Awarding ${totalPoints} points (${totalMatches} matches, ${cascadeCount} cascades)`);
        
        setScore(prev => {
          const newScore = prev + totalPoints;
          if (cascadeCount > 1) {
            setTimeout(() => playScoreUpdate(), 300);
          }
          return newScore;
        });
        
        // Haptic feedback for matches
        if (window.Telegram?.WebApp?.HapticFeedback) {
          const intensity = cascadeCount > 2 ? 'heavy' : 'medium';
          window.Telegram.WebApp.HapticFeedback.impactOccurred(intensity);
        }
      }
      
    } catch (error) {
      console.error('🚨 Error in processMatches:', error);
    } finally {
      // FIXED: Always clear processing state
      gameStateRef.current.isProcessing = false;
      setIsProcessing(false);
      console.log('✅ Match processing complete');
    }
  }, [setScore, bombPositions, triggerBombExplosion, playMatch, playScoreUpdate]);

  // Handle direct bomb tap
  const handleBombTap = useCallback((index) => {
    if (!bombPositions.has(index) || gameStateRef.current.isProcessing) return;
    
    console.log('💥 Bomb tapped at index:', index);
    
    // Trigger bomb explosion
    const explosionIndices = triggerBombExplosion(index);
    
    // Show explosion animation
    setMatchedPieces(explosionIndices);
    
    // Heavy haptic feedback for bomb
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    
    // FIXED: Single async operation with proper state management
    setTimeout(async () => {
      if (!gameStateRef.current.gameStarted) return;
      
      // Remove exploded pieces
      let currentBoard = removeMatches(gameStateRef.current.board, Array.from(explosionIndices));
      
      // Apply gravity and refill
      currentBoard = applyGravity(currentBoard);
      currentBoard = fillEmptySpaces(currentBoard);
      
      setBoard([...currentBoard.map(row => [...row])]);
      gameStateRef.current.board = currentBoard;
      setMatchedPieces(new Set());
      
      // Process any new matches after a delay
      setTimeout(() => {
        if (gameStateRef.current.gameStarted && !gameStateRef.current.isProcessing) {
          processMatches();
        }
      }, 300);
    }, 400);
  }, [bombPositions, triggerBombExplosion, processMatches]);

  // Handle drag start
  const handleDragStart = useCallback((event, { index }) => {
    if (gameStateRef.current.isProcessing || !gameStateRef.current.gameStarted) {
      console.log('🚫 Drag prevented - processing or game not started');
      return;
    }
    
    // Check if it's a bomb - handle differently
    if (bombPositions.has(index)) {
      handleBombTap(index);
      return;
    }
    
    setDraggedPiece({ index });
  }, [bombPositions, handleBombTap]);

  // FIXED: Handle drag end with proper state management
  const handleDragEnd = useCallback((event, info) => {
    if (gameStateRef.current.isProcessing || !gameStateRef.current.gameStarted || !draggedPiece) {
      setDraggedPiece(null);
      return;
    }

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

      if (isValidMove(gameStateRef.current.board, draggedPosition, targetPosition)) {
        console.log(`✅ Valid move: ${index} -> ${targetIndex}`);
        
        // AUDIO: Successful swap sound
        playSwap();
        
        // Execute the swap
        const newBoard = swapPieces(gameStateRef.current.board, draggedPosition, targetPosition);
        setBoard([...newBoard.map(row => [...row])]);
        gameStateRef.current.board = newBoard;
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        // FIXED: Process matches after swap with single timeout
        setTimeout(() => {
          if (gameStateRef.current.gameStarted && !gameStateRef.current.isProcessing) {
            processMatches();
          }
        }, 150);
      } else {
        console.log(`❌ Invalid move: ${index} -> ${targetIndex}`);
        
        // AUDIO: Invalid move sound
        playInvalidMove();
        
        // Invalid swap - light haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      }
    }

    // Clear dragged piece
    setDraggedPiece(null);
  }, [draggedPiece, processMatches, playSwap, playInvalidMove]);

  return (
    <div className="w-full flex justify-center">
      {/* FIXED: Stable container that never changes size */}
      <div
        className="bg-nav rounded-2xl p-3 shadow-2xl relative"
        style={{
          width: 'min(85vw, 350px)',
          height: 'min(85vw, 350px)',
          flexShrink: 0,
          flexGrow: 0,
        }}
      >
        {/* FIXED: Static grid with stable key generation */}
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const cellSize = `calc((100% - ${(BOARD_SIZE - 1) * 4}px) / ${BOARD_SIZE})`;
          const left = `calc(${col} * (${cellSize} + 4px))`;
          const top = `calc(${row} * (${cellSize} + 4px))`;
          
          // FIXED: Safe board access with fallbacks
          const piece = (board[row] && board[row][col] !== undefined) ? board[row][col] : null;
          const isSelected = draggedPiece?.index === index;
          const isMatched = matchedPieces.has(index);
          const hasBomb = bombPositions.has(index);
          
          return (
            <div
              key={`cell-${index}`} // FIXED: Stable key that doesn't change
              className="absolute"
              style={{
                left,
                top,
                width: cellSize,
                height: cellSize,
              }}
            >
              {piece !== null && (
                <GamePiece
                  piece={piece}
                  index={index}
                  isSelected={isSelected}
                  isMatched={isMatched}
                  hasBomb={hasBomb}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameBoard;

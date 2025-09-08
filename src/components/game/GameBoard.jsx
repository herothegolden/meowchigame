// src/components/game/GameBoard.jsx - EXACT FIX for infinite loop
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
  
  // CRITICAL: Use refs to prevent infinite loops
  const processingRef = useRef(false);
  const boardRef = useRef(board);
  const gameStartedRef = useRef(gameStarted);

  // AUDIO INTEGRATION
  const { playMatch, playSwap, playInvalidMove, playBomb, playScoreUpdate } = useAudio();

  // Keep refs updated
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  // ✅ EXACT FIX: Remove playBomb from dependencies to prevent infinite loop
  useEffect(() => {
    if (gameStarted) {
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
      processingRef.current = false;
    }
  }, [gameStarted, startWithBomb]); // ✅ REMOVED playBomb - this was causing infinite loop!

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

  // FIXED: Match processing with proper loop prevention
  const processMatches = useCallback(async () => {
    // CRITICAL: Prevent multiple simultaneous processing
    if (processingRef.current || !gameStartedRef.current) {
      console.log('🚫 Skipping processMatches - already processing or game not started');
      return;
    }
    
    console.log('🔄 Starting match processing...');
    processingRef.current = true;
    setIsProcessing(true);
    
    try {
      let currentBoard = boardRef.current.map(row => [...row]);
      let totalMatches = 0;
      let cascadeCount = 0;
      const MAX_CASCADES = 3; // CRITICAL: Limit cascades to prevent infinite loops
      
      while (cascadeCount < MAX_CASCADES) {
        const matches = findMatches(currentBoard);
        
        // CRITICAL: Break if no matches found
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
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Remove matches
        currentBoard = removeMatches(currentBoard, Array.from(allMatchedIndices));
        
        // Apply gravity
        currentBoard = applyGravity(currentBoard);
        
        // Fill empty spaces
        currentBoard = fillEmptySpaces(currentBoard);
        
        // Update board
        setBoard(currentBoard.map(row => [...row]));
        boardRef.current = currentBoard;
        
        // Clear matched pieces animation
        setMatchedPieces(new Set());
        
        // Wait before next cascade check
        await new Promise(resolve => setTimeout(resolve, 150));
        
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
      setIsProcessing(false);
      processingRef.current = false;
      console.log('✅ Match processing complete');
    }
  }, [setScore, bombPositions, triggerBombExplosion, playMatch, playScoreUpdate]);

  // Handle direct bomb tap
  const handleBombTap = useCallback((index) => {
    if (!bombPositions.has(index) || isProcessing || processingRef.current) return;
    
    console.log('💥 Bomb tapped at index:', index);
    
    // Trigger bomb explosion
    const explosionIndices = triggerBombExplosion(index);
    
    // Show explosion animation
    setMatchedPieces(explosionIndices);
    
    // Heavy haptic feedback for bomb
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    
    setTimeout(async () => {
      if (!gameStartedRef.current) return;
      
      // Remove exploded pieces
      const currentBoard = removeMatches(boardRef.current, Array.from(explosionIndices));
      
      // Apply gravity and refill
      const gravityBoard = applyGravity(currentBoard);
      const newBoard = fillEmptySpaces(gravityBoard);
      
      setBoard(newBoard);
      boardRef.current = newBoard;
      setMatchedPieces(new Set());
      
      // Process any new matches after a delay
      setTimeout(() => {
        if (gameStartedRef.current && !processingRef.current) {
          processMatches();
        }
      }, 200);
    }, 300);
  }, [bombPositions, isProcessing, triggerBombExplosion, processMatches]);

  // Handle drag start
  const handleDragStart = useCallback((event, { index }) => {
    if (isProcessing || !gameStarted || processingRef.current) {
      console.log('🚫 Drag prevented - processing or game not started');
      return;
    }
    
    // Check if it's a bomb - handle differently
    if (bombPositions.has(index)) {
      handleBombTap(index);
      return;
    }
    
    setDraggedPiece({ index });
  }, [isProcessing, gameStarted, bombPositions, handleBombTap]);

  // Handle drag end - determine swap direction and execute
  const handleDragEnd = useCallback((event, info) => {
    if (isProcessing || !gameStarted || !draggedPiece || processingRef.current) {
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

      if (isValidMove(boardRef.current, draggedPosition, targetPosition)) {
        console.log(`✅ Valid move: ${index} -> ${targetIndex}`);
        
        // AUDIO: Successful swap sound
        playSwap();
        
        // Execute the swap
        const newBoard = swapPieces(boardRef.current, draggedPosition, targetPosition);
        setBoard(newBoard);
        boardRef.current = newBoard;
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        // Process matches after swap with delay
        setTimeout(() => {
          if (gameStartedRef.current && !processingRef.current) {
            processMatches();
          }
        }, 100);
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
  }, [isProcessing, gameStarted, draggedPiece, processMatches, playSwap, playInvalidMove]);

  // FIXED: Only check for initial matches once when game starts
  useEffect(() => {
    if (gameStarted && !processingRef.current) {
      // Small delay to ensure board is set
      const timeoutId = setTimeout(() => {
        if (gameStartedRef.current && !processingRef.current) {
          const matches = findMatches(boardRef.current);
          if (matches.length > 0) {
            console.log('🎯 Processing initial matches:', matches.length);
            processMatches();
          }
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [gameStarted]); // Remove processMatches from dependencies to prevent loops

  return (
    <div className="w-full flex justify-center">
      {/* STATIC: Fixed size container that NEVER moves */}
      <div
        className="bg-nav rounded-2xl p-3 shadow-2xl relative"
        style={{
          width: 'min(85vw, 350px)',
          height: 'min(85vw, 350px)',
          flexShrink: 0, // Never shrink
          flexGrow: 0,   // Never grow
        }}
      >
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

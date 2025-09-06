import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
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

const GameBoard = ({ setScore, gameStarted, onGameEnd }) => {
  const [board, setBoard] = useState(() => generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedPieces, setMatchedPieces] = useState(new Set());
  const processingRef = useRef(false);

  // Reset board when game starts - only once
  useEffect(() => {
    if (gameStarted) {
      setBoard(generateInitialBoard());
      setDraggedPiece(null);
      setMatchedPieces(new Set());
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [gameStarted]);

  // Process matches function - fixed to prevent infinite loops
  const processMatches = useCallback(async () => {
    if (processingRef.current || !gameStarted) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    
    let currentBoard = [...board.map(row => [...row])];
    let totalMatches = 0;
    let cascadeCount = 0;
    let maxCascades = 10; // Prevent infinite cascades
    
    while (cascadeCount < maxCascades) {
      const matches = findMatches(currentBoard);
      
      if (matches.length === 0) break;
      
      // Show matched pieces with animation
      setMatchedPieces(new Set(matches));
      totalMatches += matches.length;
      
      // Wait for match animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Remove matches
      currentBoard = removeMatches(currentBoard, matches);
      
      // Apply gravity
      currentBoard = applyGravity(currentBoard);
      
      // Fill empty spaces
      currentBoard = fillEmptySpaces(currentBoard);
      
      // Wait for animations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      cascadeCount++;
      setMatchedPieces(new Set());
    }
    
    // Update the board only once at the end
    setBoard([...currentBoard.map(row => [...row])]);
    
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
  }, [board, setScore, gameStarted]);

  // Handle drag start
  const handleDragStart = useCallback((event, { index }) => {
    if (isProcessing || !gameStarted || processingRef.current) return;
    setDraggedPiece({ index });
  }, [isProcessing, gameStarted]);

  // Handle drag end - determine swap direction and execute
  const handleDragEnd = useCallback((event, info) => {
    if (isProcessing || !gameStarted || !draggedPiece || processingRef.current) return;

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

      if (isValidMove(board, draggedPosition, targetPosition)) {
        // Valid swap - execute it
        const newBoard = swapPieces(board, draggedPosition, targetPosition);
        setBoard(newBoard);
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        // Process matches after swap
        setTimeout(() => {
          processMatches();
        }, 100);
      } else {
        // Invalid swap - light haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      }
    }

    // Clear dragged piece
    setDraggedPiece(null);
  }, [isProcessing, gameStarted, draggedPiece, board, processMatches]);

  // Check for initial matches only once when game starts
  useEffect(() => {
    if (gameStarted && !processingRef.current) {
      const timeoutId = setTimeout(() => {
        const matches = findMatches(board);
        if (matches.length > 0) {
          processMatches();
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [gameStarted]); // Only depend on gameStarted, not board

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid gap-1 bg-nav rounded-2xl p-3 shadow-2xl"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          width: 'min(85vw, 350px)',
          height: 'min(85vw, 350px)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {board.flat().map((emoji, index) => (
            <GamePiece
              key={`piece-${index}`}
              emoji={emoji}
              index={index}
              isSelected={draggedPiece?.index === index}
              isMatched={matchedPieces.has(index)}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Instructions for drag */}
      {gameStarted && !isProcessing && (
        <div className="mt-4 text-center text-secondary text-sm max-w-md">
          <p>🍪 Drag emojis to adjacent spots to create matches! ✨</p>
        </div>
      )}
    </div>
  );
};

export default GameBoard;

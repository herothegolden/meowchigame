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
  const boardRef = useRef(board);

  // Keep board ref updated
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Reset board when game starts - only once
  useEffect(() => {
    if (gameStarted) {
      const newBoard = generateInitialBoard();
      setBoard(newBoard);
      boardRef.current = newBoard;
      setDraggedPiece(null);
      setMatchedPieces(new Set());
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [gameStarted]);

  // FIXED: Process matches function
  const processMatches = useCallback(async () => {
    if (processingRef.current || !gameStarted) return;
    
    console.log('🎮 Starting match processing...');
    processingRef.current = true;
    setIsProcessing(true);
    
    let currentBoard = boardRef.current.map(row => [...row]);
    let totalMatches = 0;
    let cascadeCount = 0;
    const maxCascades = 5;
    
    while (cascadeCount < maxCascades) {
      const matches = findMatches(currentBoard);
      console.log(`🔍 Cascade ${cascadeCount + 1}: Found ${matches.length} matches`);
      
      if (matches.length === 0) break;
      
      // Show matched pieces with animation
      setMatchedPieces(new Set(matches));
      totalMatches += matches.length;
      
      // Wait for match animation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Remove matches
      currentBoard = removeMatches(currentBoard, matches);
      
      // Apply gravity
      currentBoard = applyGravity(currentBoard);
      
      // Fill empty spaces
      currentBoard = fillEmptySpaces(currentBoard);
      
      // Update board visually
      setBoard([...currentBoard.map(row => [...row])]);
      boardRef.current = currentBoard;
      
      // Wait for fall animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      cascadeCount++;
      setMatchedPieces(new Set());
    }
    
    // Award points with cascade bonus
    if (totalMatches > 0) {
      const basePoints = totalMatches * POINTS_PER_PIECE;
      const cascadeBonus = Math.max(0, (cascadeCount - 1) * 50);
      const totalPoints = basePoints + cascadeBonus;
      
      console.log(`🏆 Scored ${totalPoints} points (${totalMatches} pieces + ${cascadeBonus} cascade bonus)`);
      setScore(prev => prev + totalPoints);
      
      // Haptic feedback for matches
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    }
    
    setIsProcessing(false);
    processingRef.current = false;
    console.log('✅ Match processing complete');
  }, [setScore, gameStarted]);

  // Handle drag start
  const handleDragStart = useCallback((event, { index }) => {
    if (isProcessing || !gameStarted || processingRef.current) return;
    setDraggedPiece({ index });
    console.log(`🖱️ Started dragging piece at index ${index}`);
  }, [isProcessing, gameStarted]);

  // FIXED: Handle drag end - determine swap direction and execute
  const handleDragEnd = useCallback((event, info) => {
    if (isProcessing || !gameStarted || !draggedPiece || processingRef.current) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    console.log(`🖱️ Drag ended - Index: ${index}, Row: ${row}, Col: ${col}, Offset:`, offset);

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

    console.log(`🎯 Target index: ${targetIndex}`);

    // Execute swap if valid target found
    if (targetIndex !== undefined) {
      const draggedPosition = getPosition(index);
      const targetPosition = getPosition(targetIndex);
      
      console.log(`🔄 Attempting swap: (${draggedPosition.row},${draggedPosition.col}) <-> (${targetPosition.row},${targetPosition.col})`);
      console.log(`🔄 Pieces: "${boardRef.current[draggedPosition.row][draggedPosition.col]}" <-> "${boardRef.current[targetPosition.row][targetPosition.col]}"`);

      if (isValidMove(boardRef.current, draggedPosition, targetPosition)) {
        console.log('✅ Valid move! Executing swap...');
        
        // Execute the swap
        const newBoard = swapPieces(boardRef.current, draggedPosition, targetPosition);
        setBoard(newBoard);
        boardRef.current = newBoard;
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        
        // Process matches after swap
        setTimeout(() => {
          processMatches();
        }, 200);
      } else {
        console.log('❌ Invalid move!');
        // Invalid swap - light haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      }
    } else {
      console.log('❌ No valid target found');
    }

    // Clear dragged piece
    setDraggedPiece(null);
  }, [isProcessing, gameStarted, draggedPiece, processMatches]);

  // Check for initial matches only once when game starts
  useEffect(() => {
    if (gameStarted && !processingRef.current) {
      const timeoutId = setTimeout(() => {
        const matches = findMatches(boardRef.current);
        if (matches.length > 0) {
          console.log('🔄 Initial matches found, processing...');
          processMatches();
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [gameStarted, processMatches]);

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
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          <p>Processing: {isProcessing ? 'Yes' : 'No'}</p>
          <p>Matched: {matchedPieces.size}</p>
          <p>Dragged: {draggedPiece?.index ?? 'None'}</p>
        </div>
      )}
      
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

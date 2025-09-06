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

  // OPTIMIZED: Much faster match processing
  const processMatches = useCallback(async () => {
    if (processingRef.current || !gameStarted) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    
    let currentBoard = boardRef.current.map(row => [...row]);
    let totalMatches = 0;
    let cascadeCount = 0;
    const maxCascades = 5;
    
    while (cascadeCount < maxCascades) {
      const matches = findMatches(currentBoard);
      
      if (matches.length === 0) break;
      
      // Show matched pieces with faster animation
      setMatchedPieces(new Set(matches));
      totalMatches += matches.length;
      
      // FASTER: Reduced from 400ms to 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Remove matches
      currentBoard = removeMatches(currentBoard, matches);
      
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
  }, [setScore, gameStarted]);

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
  }, [isProcessing, gameStarted, draggedPiece, processMatches]);

  // Check for initial matches only once when game starts
  useEffect(() => {
    if (gameStarted && !processingRef.current) {
      const timeoutId = setTimeout(() => {
        const matches = findMatches(boardRef.current);
        if (matches.length > 0) {
          processMatches();
        }
      }, 100); // Much faster initial check
      
      return () => clearTimeout(timeoutId);
    }
  }, [gameStarted, processMatches]);

  return (
    <div className="w-full flex justify-center">
      {/* COMPLETELY STATIC: Fixed size container that NEVER moves */}
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
          
          const emoji = board[row] ? board[row][col] : null;
          const isSelected = draggedPiece?.index === index;
          const isMatched = matchedPieces.has(index);
          
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
              {/* REMOVED AnimatePresence - pieces just show/hide instantly for matched state */}
              {emoji && (
                <GamePiece
                  emoji={emoji}
                  index={index}
                  isSelected={isSelected}
                  isMatched={isMatched}
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

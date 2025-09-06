import React, { useState, useEffect, useCallback } from 'react';
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
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedPieces, setMatchedPieces] = useState(new Set());

  // Reset board when game starts
  useEffect(() => {
    if (gameStarted) {
      setBoard(generateInitialBoard());
      setSelectedPiece(null);
      setMatchedPieces(new Set());
      setIsProcessing(false);
    }
  }, [gameStarted]);

  // Auto-resolve matches when board changes
  const processMatches = useCallback(async () => {
    if (isProcessing || !gameStarted) return;
    
    let currentBoard = [...board.map(row => [...row])];
    let totalMatches = 0;
    let cascadeCount = 0;
    
    setIsProcessing(true);
    
    while (true) {
      const matches = findMatches(currentBoard);
      
      if (matches.length === 0) break;
      
      // Show matched pieces with animation
      setMatchedPieces(new Set(matches));
      totalMatches += matches.length;
      
      // Wait for match animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Remove matches
      currentBoard = removeMatches(currentBoard, matches);
      setBoard([...currentBoard.map(row => [...row])]);
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Apply gravity
      currentBoard = applyGravity(currentBoard);
      setBoard([...currentBoard.map(row => [...row])]);
      
      // Wait for fall animation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fill empty spaces
      currentBoard = fillEmptySpaces(currentBoard);
      setBoard([...currentBoard.map(row => [...row])]);
      
      // Wait for new pieces animation
      await new Promise(resolve => setTimeout(resolve, 150));
      
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
  }, [board, setScore, isProcessing, gameStarted]);

  // Process matches whenever board changes
  useEffect(() => {
    if (gameStarted && board) {
      const timeoutId = setTimeout(() => {
        processMatches();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [board, processMatches, gameStarted]);

  const handlePieceClick = useCallback((index) => {
    if (isProcessing || !gameStarted) return;
    
    const clickedPosition = getPosition(index);
    
    if (selectedPiece === null) {
      // First piece selection
      setSelectedPiece(index);
      
      // Light haptic feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    } else if (selectedPiece === index) {
      // Deselect same piece
      setSelectedPiece(null);
    } else {
      // Second piece selection - attempt swap
      const selectedPosition = getPosition(selectedPiece);
      
      if (isValidMove(board, selectedPosition, clickedPosition)) {
        // Valid move - perform swap
        const newBoard = swapPieces(board, selectedPosition, clickedPosition);
        setBoard(newBoard);
        
        // Success haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
      } else {
        // Invalid move - just change selection
        setSelectedPiece(index);
        
        // Light haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      }
      
      // Clear selection after a brief delay
      setTimeout(() => setSelectedPiece(null), 200);
    }
  }, [isProcessing, gameStarted, selectedPiece, board]);

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
              key={`${index}-${emoji}-${Date.now()}`}
              emoji={emoji}
              index={index}
              isSelected={selectedPiece === index}
              isMatched={matchedPieces.has(index)}
              onPieceClick={handlePieceClick}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameBoard;

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

const GameBoard = ({ setScore, setMoves, gameStarted }) => {
  const [board, setBoard] = useState(() => generateInitialBoard());
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedPieces, setMatchedPieces] = useState(new Set());

  // Auto-resolve matches when board changes
  const processMatches = useCallback(async () => {
    if (isProcessing) return;
    
    let currentBoard = board;
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
      setBoard(currentBoard);
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Apply gravity
      currentBoard = applyGravity(currentBoard);
      setBoard(currentBoard);
      
      // Wait for fall animation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fill empty spaces
      currentBoard = fillEmptySpaces(currentBoard);
      setBoard(currentBoard);
      
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
  }, [board, setScore, isProcessing]);

  // Process matches whenever board changes
  useEffect(() => {
    if (gameStarted) {
      processMatches();
    }
  }, [board, processMatches, gameStarted]);

  const handlePieceClick = (index) => {
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
        setMoves(prev => prev - 1);
        
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
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        className="grid gap-1 bg-gray-800/50 rounded-2xl p-3 shadow-2xl"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          width: 'min(90vw, 400px)',
          height: 'min(90vw, 400px)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {board.flat().map((emoji, index) => (
            <GamePiece
              key={`${index}-${emoji}`}
              emoji={emoji}
              index={index}
              isSelected={selectedPiece === index}
              isMatched={matchedPieces.has(index)}
              onPieceClick={handlePieceClick}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 text-center">
          <p>Selected: {selectedPiece !== null ? selectedPiece : 'None'}</p>
          <p>Processing: {isProcessing ? 'Yes' : 'No'}</p>
          <p>Matched: {matchedPieces.size}</p>
        </div>
      )}
    </div>
  );
};

export default GameBoard;

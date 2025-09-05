import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  generateInitialBoard,
  BOARD_SIZE,
  checkForMatches,
  applyGravity,
  refillBoard,
  getPosition,
  POINTS_PER_PIECE, // Import the new scoring constant
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = ({ setScore, setMoves }) => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);

  const processBoardChanges = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);

    const checkAndResolve = (currentBoard) => {
      const matches = checkForMatches(currentBoard);
      
      if (matches.size > 0) {
        // FIX: Scoring is now based on the number of pieces matched.
        // This ensures whole numbers and scales with larger matches.
        const pointsGained = matches.size * POINTS_PER_PIECE;
        setScore(prev => prev + pointsGained);

        // FIX: The timeout is much shorter for a faster, more fluid feel.
        setTimeout(() => {
          const newBoardFlat = [...currentBoard.flat()];
          matches.forEach(index => { newBoardFlat[index] = null; });
          
          let clearedBoard = [];
          while (newBoardFlat.length) clearedBoard.push(newBoardFlat.splice(0, BOARD_SIZE));

          const gravityBoard = applyGravity(clearedBoard);
          const refilledBoard = refillBoard(gravityBoard);

          setBoard(refilledBoard);
          checkAndResolve(refilledBoard); // Recursively check for new matches
        }, 150); // A brief delay to let animations play out
      } else {
        setIsProcessing(false); // Unlock the board for the next move
      }
    };
    
    checkAndResolve(board);
  }, [board, setScore, isProcessing]);

  useEffect(() => {
    // This effect now only triggers when the board state changes, not on every render.
    processBoardChanges();
  }, [board]);


  const handleDragStart = (event, { index }) => {
    if (isProcessing) return;
    setDraggedPiece({ index });
  };

  const handleDragEnd = (event, info) => {
    if (isProcessing || !draggedPiece) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    let replacedIndex;
    const threshold = 20; // How far the user must drag to trigger a swap

    // Determine swap direction
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold && col < BOARD_SIZE - 1) replacedIndex = index + 1;
        else if (offset.x < -threshold && col > 0) replacedIndex = index - 1;
    } else {
        if (offset.y > threshold && row < BOARD_SIZE - 1) replacedIndex = index + BOARD_SIZE;
        else if (offset.y < -threshold && row > 0) replacedIndex = index - BOARD_SIZE;
    }

    if (replacedIndex !== undefined) {
        const newBoardFlat = [...board.flat()];
        // Swap the pieces
        [newBoardFlat[index], newBoardFlat[replacedIndex]] = [newBoardFlat[replacedIndex], newBoardFlat[index]];

        const tempBoard2D = [];
        while (newBoardFlat.length) tempBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));

        // Check if the swap results in a match
        const matches = checkForMatches(tempBoard2D);
        if (matches.size > 0) {
            if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
            setMoves(prev => prev - 1); // A move is only used up if it's successful
            setBoard(tempBoard2D); // This triggers the processBoardChanges effect
        }
    }

    setDraggedPiece(null);
  };

  return (
    <div
      className="grid bg-nav rounded-lg p-2 shadow-inner"
      style={{
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
        width: '90vw',
        height: '90vw',
        maxWidth: '400px',
        maxHeight: '400px',
      }}
    >
      {/* NEW: AnimatePresence wrapper enables the exit animations on the GamePieces */}
      <AnimatePresence>
        {board.flat().map((color, index) => (
          <GamePiece 
            key={index} 
            color={color} 
            index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GameBoard;

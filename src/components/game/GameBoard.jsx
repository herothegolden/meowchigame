import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  generateInitialBoard,
  BOARD_SIZE,
  checkForMatches,
  applyGravity,
  refillBoard,
  getPosition,
  POINTS_PER_PIECE,
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = ({ setScore, isGameActive }) => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [shake, setShake] = useState(false); // State for the shake animation

  const tg = window.Telegram?.WebApp;

  const processBoardChanges = useCallback((currentBoard) => {
    setIsProcessing(true);

    const checkAndResolve = (boardToCheck) => {
      const matches = checkForMatches(boardToCheck);
      
      if (matches.size > 0) {
        // Haptic feedback for a successful match
        tg?.HapticFeedback.impactOccurred('light');
        
        // Update score based on the number of matched pieces
        setScore(prevScore => prevScore + (matches.size * POINTS_PER_PIECE));

        // Use a short timeout to allow the "exit" animation to play
        setTimeout(() => {
          const newBoardFlat = [...boardToCheck.flat()];
          matches.forEach(index => { newBoardFlat[index] = null; });
          
          let clearedBoard = [];
          while (newBoardFlat.length) clearedBoard.push(newBoardFlat.splice(0, BOARD_SIZE));

          const gravityBoard = applyGravity(clearedBoard);
          const refilledBoard = refillBoard(gravityBoard);

          setBoard(refilledBoard);
          // Recursively check the new board for more matches
          checkAndResolve(refilledBoard);
        }, 300); // This duration should be similar to the exit animation
      } else {
        // No more matches, end the processing loop
        setIsProcessing(false);
      }
    };
    
    checkAndResolve(currentBoard);
  }, [setScore, tg]);

  const handleDragStart = (event, { index }) => {
    if (isProcessing || !isGameActive) return;
    setDraggedPiece({ index });
  };

  const handleDragEnd = (event, info) => {
    if (isProcessing || !draggedPiece || !isGameActive) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    let replacedIndex;
    const threshold = 20;

    // Determine the swap direction
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold && col < BOARD_SIZE - 1) replacedIndex = index + 1;
        else if (offset.x < -threshold && col > 0) replacedIndex = index - 1;
    } else {
        if (offset.y > threshold && row < BOARD_SIZE - 1) replacedIndex = index + BOARD_SIZE;
        else if (offset.y < -threshold && row > 0) replacedIndex = index - BOARD_SIZE;
    }

    if (replacedIndex !== undefined) {
        const newBoardFlat = [...board.flat()];
        [newBoardFlat[index], newBoardFlat[replacedIndex]] = [newBoardFlat[replacedIndex], newBoardFlat[index]];

        const tempBoard2D = [];
        while (newBoardFlat.length) tempBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));

        const matches = checkForMatches(tempBoard2D);
        if (matches.size > 0) {
            // If the move is valid, start the processing chain
            processBoardChanges(tempBoard2D);
        } else {
            // If the move is invalid, trigger feedback
            tg?.HapticFeedback.notificationOccurred('error');
            setShake(true);
            setTimeout(() => setShake(false), 500); // Reset shake after animation
        }
    }

    setDraggedPiece(null);
  };

  return (
    <motion.div
      animate={{ x: shake ? [-10, 10, -10, 10, 0] : 0 }}
      transition={{ duration: 0.5 }}
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
      <AnimatePresence>
        {board.flat().map((color, index) => (
          <GamePiece 
            key={`${index}-${color}`} // A more stable key for animations
            color={color} 
            index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default GameBoard;

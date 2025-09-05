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
  const [shake, setShake] = useState(false);

  const tg = window.Telegram?.WebApp;

  const processBoardChanges = useCallback((currentBoard) => {
    setIsProcessing(true);

    const checkAndResolve = (boardToCheck) => {
      const matches = checkForMatches(boardToCheck);
      
      if (matches.size > 0) {
        tg?.HapticFeedback.impactOccurred('light');
        setScore(prevScore => prevScore + (matches.size * POINTS_PER_PIECE));

        setTimeout(() => {
          const newBoard = boardToCheck.map(row => 
            row.map(piece => (matches.has(piece.id) ? null : piece))
          );
          
          const gravityBoard = applyGravity(newBoard);
          const refilledBoard = refillBoard(gravityBoard);

          setBoard(refilledBoard);
          checkAndResolve(refilledBoard);
        }, 300);
      } else {
        setIsProcessing(false);
      }
    };
    
    checkAndResolve(currentBoard);
  }, [setScore, tg]);

  useEffect(() => {
    // Initial check for any accidental matches on load
    processBoardChanges(board);
  }, []); // Only run once on initial load


  const handleDragStart = (event, { index }) => {
    if (isProcessing || !isGameActive) return;
    const flatBoard = board.flat();
    setDraggedPiece({ index, piece: flatBoard[index] });
  };

  const handleDragEnd = (event, info) => {
    if (isProcessing || !draggedPiece || !isGameActive) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    let replacedIndex;
    const threshold = 20;

    if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold && col < BOARD_SIZE - 1) replacedIndex = index + 1;
        else if (offset.x < -threshold && col > 0) replacedIndex = index - 1;
    } else {
        if (offset.y > threshold && row < BOARD_SIZE - 1) replacedIndex = index + BOARD_SIZE;
        else if (offset.y < -threshold && row > 0) replacedIndex = index - BOARD_SIZE;
    }

    if (replacedIndex !== undefined) {
      const newBoard = JSON.parse(JSON.stringify(board));
      const {row: r1, col: c1} = getPosition(index);
      const {row: r2, col: c2} = getPosition(replacedIndex);
      [newBoard[r1][c1], newBoard[r2][c2]] = [newBoard[r2][c2], newBoard[r1][c1]];

      const matches = checkForMatches(newBoard);
      if (matches.size > 0) {
          setBoard(newBoard); // Set the swapped board first
          processBoardChanges(newBoard); // Then process it
      } else {
          tg?.HapticFeedback.notificationOccurred('error');
          setShake(true);
          setTimeout(() => setShake(false), 500);
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
        {board.flat().map((piece, index) => (
          <GamePiece 
            key={piece.id}
            color={piece.color} 
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

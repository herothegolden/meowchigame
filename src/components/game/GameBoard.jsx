import React, { useState, useEffect, useCallback } from 'react';
import { useDragControls } from 'framer-motion';
import {
  generateInitialBoard,
  BOARD_SIZE,
  checkForMatches,
  applyGravity,
  refillBoard,
  getPosition,
  SCORE_PER_MATCH,
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = ({ setScore, setMoves }) => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [isProcessing, setIsProcessing] = useState(false);
  
  const dragControls = useDragControls();

  const handleBoardCheck = useCallback((currentBoard) => {
    const matches = checkForMatches(currentBoard);
    
    if (matches.size > 0) {
      setIsProcessing(true);

      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
      
      setScore(prev => prev + matches.size * SCORE_PER_MATCH);

      // Create a delay for the visual effect of clearing
      setTimeout(() => {
        const newBoardFlat = [...currentBoard.flat()];
        matches.forEach(index => { newBoardFlat[index] = null; });
        
        let clearedBoard = [];
        while (newBoardFlat.length) clearedBoard.push(newBoardFlat.splice(0, BOARD_SIZE));

        const gravityBoard = applyGravity(clearedBoard);
        const refilledBoard = refillBoard(gravityBoard);

        setBoard(refilledBoard); // This will trigger the useEffect to run again
      }, 200);

    } else {
      setIsProcessing(false); // No more matches, stop processing
    }
  }, [setScore]);

  // Main game loop effect
  useEffect(() => {
    handleBoardCheck(board);
  }, [board, handleBoardCheck]);

  const handleDragEnd = (event, info, index) => {
    if (isProcessing) return;

    const { offset } = info;
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
      const newBoardFlat = [...board.flat()];
      const draggedColor = newBoardFlat[index];
      newBoardFlat[index] = newBoardFlat[replacedIndex];
      newBoardFlat[replacedIndex] = draggedColor;

      const tempBoard2D = [];
      while (newBoardFlat.length) tempBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));
      
      // Check if the move is valid (creates a match)
      const matches = checkForMatches(tempBoard2D);
      if (matches.size > 0) {
          setMoves(prev => prev - 1);
          setBoard(tempBoard2D); // A valid move starts the game loop
      }
      // If the move is invalid, the piece will snap back because we don't update the board state.
    }
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
      {board.flat().map((color, index) => (
        <div
          key={index}
          onPointerDown={(e) => !isProcessing && dragControls.start(e, { snapToCursor: true })}
          className="w-full h-full flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          <GamePiece 
            color={color} 
            dragControls={dragControls}
            onDragEnd={(event, info) => handleDragEnd(event, info, index)}
          />
        </div>
      ))}
    </div>
  );
};

export default GameBoard;

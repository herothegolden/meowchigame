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
  
  // This single controls instance will manage all drags
  const dragControls = useDragControls();

  const processBoardChanges = useCallback(() => {
    setIsProcessing(true);

    const checkAndResolve = (currentBoard) => {
      const matches = checkForMatches(currentBoard);
      
      if (matches.size > 0) {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        
        setScore(prev => prev + matches.size * SCORE_PER_MATCH);

        setTimeout(() => {
          const newBoardFlat = [...currentBoard.flat()];
          matches.forEach(index => { newBoardFlat[index] = null; });
          
          let clearedBoard = [];
          while (newBoardFlat.length) clearedBoard.push(newBoardFlat.splice(0, BOARD_SIZE));

          const gravityBoard = applyGravity(clearedBoard);
          const refilledBoard = refillBoard(gravityBoard);

          setBoard(refilledBoard);
          checkAndResolve(refilledBoard);
        }, 200);
      } else {
        setIsProcessing(false);
      }
    };
    
    checkAndResolve(board);
  }, [board, setScore]);

  useEffect(() => {
    processBoardChanges();
  }, [board, processBoardChanges]);

  // The index of the piece being dragged is now passed directly
  const handleDragEnd = (event, info, index) => {
    if (isProcessing) return;

    const { offset } = info;
    const { row, col } = getPosition(index);

    let replacedIndex;
    const threshold = 20; // How far the user must drag to trigger a swap

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
        
        const matches = checkForMatches(tempBoard2D);
        if (matches.size > 0) {
            setMoves(prev => prev - 1);
            setBoard(tempBoard2D);
        }
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
          // This wrapper tells the dragControls which piece to move on touch
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

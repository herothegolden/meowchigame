import React, { useState, useEffect, useCallback } from 'react';
import {
  generateInitialBoard,
  BOARD_SIZE,
  checkForMatches,
  applyGravity,
  refillBoard,
  getPosition,
  POINTS_PER_MATCH // Import our new constant
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = ({ setScore, setMoves }) => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);

  const processBoardChanges = useCallback(() => {
    setIsProcessing(true);

    const checkAndResolve = (currentBoard) => {
      const matches = checkForMatches(currentBoard);
      
      if (matches.size > 0) {
        // NEW: Update the score based on the number of matched pieces
        setScore(prevScore => prevScore + (matches.size * POINTS_PER_MATCH / 3));

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

        const matches = checkForMatches(tempBoard2D);
        if (matches.size > 0) {
            // NEW: A successful move was made, so decrement moves count
            setMoves(prevMoves => prevMoves - 1);
            
            if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
            setBoard(tempBoard2D);
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
      {board.flat().map((color, index) => (
        <GamePiece 
          key={index} 
          color={color} 
          index={index}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
};

export default GameBoard;

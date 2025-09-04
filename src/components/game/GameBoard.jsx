import React, { useState, useEffect } from 'react';
import { generateInitialBoard, BOARD_SIZE, checkForMatches } from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = () => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [replacedPiece, setReplacedPiece] = useState(null);

  // This useEffect hook will run every time the board state changes.
  useEffect(() => {
    const checkMatchesAndClear = () => {
      const matches = checkForMatches(board);
      if (matches.size > 0) {
        // A short delay to allow the user to see the match
        setTimeout(() => {
          const newBoardFlat = [...board.flat()];
          matches.forEach(index => {
            newBoardFlat[index] = null; // Clear the matched pieces
          });

          const newBoard2D = [];
          while (newBoardFlat.length) newBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));
          setBoard(newBoard2D);
        }, 100); // 100ms delay
      }
    };
    
    checkMatchesAndClear();
  }, [board]); // The dependency array ensures this runs only when 'board' changes


  const dragStart = (e) => {
    setDraggedPiece(e.target);
  };

  const dragOver = (e) => {
    e.preventDefault();
  };

  const dragDrop = (e) => {
    setReplacedPiece(e.target);
  };
  
  const dragEnd = () => {
    if (!draggedPiece || !replacedPiece) return;

    const draggedIndex = parseInt(draggedPiece.getAttribute('data-index'));
    const replacedIndex = parseInt(replacedPiece.getAttribute('data-index'));

    // --- Move Validation Logic ---
    const draggedColumn = draggedIndex % BOARD_SIZE;
    const isLeftEdge = draggedColumn === 0;
    const isRightEdge = draggedColumn === BOARD_SIZE - 1;
    
    const validMoves = [
      draggedIndex - BOARD_SIZE, // up
      draggedIndex + BOARD_SIZE, // down
    ];
    if (!isLeftEdge) validMoves.push(draggedIndex - 1);
    if (!isRightEdge) validMoves.push(draggedIndex + 1);
    
    const isValidMove = validMoves.includes(replacedIndex);
    
    if (isValidMove) {
        const newBoardFlat = [...board.flat()];
        const draggedColor = newBoardFlat[draggedIndex];
        newBoardFlat[draggedIndex] = newBoardFlat[replacedIndex];
        newBoardFlat[replacedIndex] = draggedColor;

        // --- Check if this swap CREATES a match ---
        const tempBoard2D = [];
        const tempBoardFlat = [...newBoardFlat]; // Create a copy for checking
        while (tempBoardFlat.length) tempBoard2D.push(tempBoardFlat.splice(0, BOARD_SIZE));

        const matches = checkForMatches(tempBoard2D);
        
        // Only update the board if the move results in a match
        if (matches.size > 0) {
            setBoard(tempBoard2D);
        }
    }

    setDraggedPiece(null);
    setReplacedPiece(null);
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
          onDragStart={dragStart}
          onDragOver={dragOver}
          onDragDrop={dragDrop}
          onDragEnd={dragEnd}
        />
      ))}
    </div>
  );
};

export default GameBoard;

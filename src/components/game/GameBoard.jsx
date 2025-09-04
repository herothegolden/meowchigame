import React, { useState } from 'react';
import { generateInitialBoard, BOARD_SIZE } from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = () => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [replacedPiece, setReplacedPiece] = useState(null);

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
    
    // Check for valid adjacent moves
    const validMoves = [
      draggedIndex - BOARD_SIZE, // up
      draggedIndex + BOARD_SIZE, // down
    ];
    // Add left move if not on the left edge
    if (!isLeftEdge) validMoves.push(draggedIndex - 1);
    // Add right move if not on the right edge
    if (!isRightEdge) validMoves.push(draggedIndex + 1);
    
    const isValidMove = validMoves.includes(replacedIndex);
    
    if (isValidMove) {
        // If the move is valid, swap the pieces on the board
        const newBoardFlat = [...board.flat()];
        const draggedColor = newBoardFlat[draggedIndex];
        newBoardFlat[draggedIndex] = newBoardFlat[replacedIndex];
        newBoardFlat[replacedIndex] = draggedColor;

        // Convert the flat array back into a 2D array for the state
        const newBoard2D = [];
        while (newBoardFlat.length) newBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));
        setBoard(newBoard2D);
    }

    // Reset drag states
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateInitialBoard,
  BOARD_SIZE,
  checkForMatches,
  applyGravity,
  refillBoard,
  getPosition
} from '../../utils/gameLogic';
import GamePiece from './GamePiece';

const GameBoard = () => {
  const [board, setBoard] = useState(generateInitialBoard());
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);

  // This function handles the game's core loop: checking for matches,
  // clearing them, applying gravity, and refilling the board until
  // no more matches are found (a stable state).
  const processBoardChanges = useCallback(() => {
    setIsProcessing(true);

    const checkAndResolve = (currentBoard) => {
      const matches = checkForMatches(currentBoard);
      
      if (matches.size > 0) {
        // Use a short timeout to allow the player to see the match before it disappears.
        setTimeout(() => {
          // Flatten the board for easier manipulation
          const newBoardFlat = [...currentBoard.flat()];
          matches.forEach(index => { newBoardFlat[index] = null; }); // Set matched pieces to null
          
          // Re-create the 2D board from the flat array
          let clearedBoard = [];
          while (newBoardFlat.length) clearedBoard.push(newBoardFlat.splice(0, BOARD_SIZE));

          const gravityBoard = applyGravity(clearedBoard);
          const refilledBoard = refillBoard(gravityBoard);

          // Update the board and recursively check for new "cascade" matches
          setBoard(refilledBoard);
          checkAndResolve(refilledBoard);
        }, 200);
      } else {
        // No more matches, the board is stable. End processing.
        setIsProcessing(false);
      }
    };
    
    checkAndResolve(board);
  }, [board]);

  // This useEffect hook triggers the processing loop whenever the board changes.
  useEffect(() => {
    processBoardChanges();
  }, [board, processBoardChanges]);


  // Called when a player first touches or clicks on a piece.
  const handleDragStart = (event, { index }) => {
    if (isProcessing) return; // Prevent moves while the board is resolving
    setDraggedPiece({ index });
  };

  // Called when a player releases a piece after dragging.
  const handleDragEnd = (event, info) => {
    if (isProcessing || !draggedPiece) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    let replacedIndex;
    const threshold = 20; // How far the player must drag to register a move

    // Determine drag direction (horizontal vs. vertical)
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold && col < BOARD_SIZE - 1) replacedIndex = index + 1; // Right
        else if (offset.x < -threshold && col > 0) replacedIndex = index - 1;       // Left
    } else {
        if (offset.y > threshold && row < BOARD_SIZE - 1) replacedIndex = index + BOARD_SIZE; // Down
        else if (offset.y < -threshold && row > 0) replacedIndex = index - BOARD_SIZE;       // Up
    }

    if (replacedIndex !== undefined) {
        // Create a temporary new board with the swapped pieces
        const newBoardFlat = [...board.flat()];
        const draggedColor = newBoardFlat[index];
        newBoardFlat[index] = newBoardFlat[replacedIndex];
        newBoardFlat[replacedIndex] = draggedColor;

        const tempBoard2D = [];
        while (newBoardFlat.length) tempBoard2D.push(newBoardFlat.splice(0, BOARD_SIZE));

        // Only commit the move if it results in a match
        const matches = checkForMatches(tempBoard2D);
        if (matches.size > 0) {
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

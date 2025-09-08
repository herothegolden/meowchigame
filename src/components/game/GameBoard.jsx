// src/components/game/GameBoard.jsx - COMPLETELY REWRITTEN FOR STABILITY
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useAudio } from '../../hooks/useAudio';

const GameBoard = ({ setScore, gameStarted, startWithBomb, onGameEnd }) => {
  // SIMPLIFIED: Single board state - no refs, no complex state management
  const [board, setBoard] = useState(() => generateInitialBoard());
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [matchedPieces, setMatchedPieces] = useState(new Set());
  const [bombPositions, setBombPositions] = useState(new Set());
  
  // SIMPLIFIED: Single processing flag - no complex ref management
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  
  // AUDIO INTEGRATION
  const { playMatch, playSwap, playInvalidMove, playBomb, playScoreUpdate } = useAudio();

  // FIXED: Simple game initialization - ONE TIME ONLY
  useEffect(() => {
    if (gameStarted && !gameInitialized) {
      console.log('🎮 Initializing game...');
      
      const newBoard = generateInitialBoard();
      
      // Add bomb if needed
      if (startWithBomb) {
        const centerRow = Math.floor(BOARD_SIZE / 2);
        const centerCol = Math.floor(BOARD_SIZE / 2);
        const bombIndex = centerRow * BOARD_SIZE + centerCol;
        setBombPositions(new Set([bombIndex]));
        setTimeout(() => playBomb(), 500);
      } else {
        setBombPositions(new Set());
      }
      
      setBoard(newBoard);
      setDraggedPiece(null);
      setMatchedPieces(new Set());
      setIsProcessing(false);
      setGameInitialized(true);
      
      console.log('✅ Game initialized');
    } else if (!gameStarted) {
      // Reset when game stops
      setGameInitialized(false);
    }
  }, [gameStarted, startWithBomb, gameInitialized, playBomb]);

  // SIMPLIFIED: Process matches - NO RECURSION, NO LOOPS
  const processMatches = useCallback(async (currentBoard) => {
    console.log('🔄 Processing matches...');
    
    let boardToProcess = currentBoard;
    let totalPoints = 0;
    
    // FIXED: Simple single-pass match processing
    const matches = findMatches(boardToProcess);
    
    if (matches.length === 0) {
      console.log('✅ No matches found');
      return boardToProcess;
    }
    
    console.log(`🎯 Found ${matches.length} matches`);
    
    // Handle bomb explosions
    let allMatchedIndices = new Set(matches);
    for (const matchIndex of matches) {
      if (bombPositions.has(matchIndex)) {
        const { row, col } = getPosition(matchIndex);
        // Add 3x3 explosion area
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              allMatchedIndices.add(r * BOARD_SIZE + c);
            }
          }
        }
        // Remove bomb
        setBombPositions(prev => {
          const newBombs = new Set(prev);
          newBombs.delete(matchIndex);
          return newBombs;
        });
        playBomb();
        break; // Only one bomb per match
      }
    }
    
    // Show matched pieces
    setMatchedPieces(allMatchedIndices);
    
    // Calculate points
    const points = allMatchedIndices.size * POINTS_PER_PIECE;
    totalPoints += points;
    
    // Audio feedback
    playMatch(0);
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Remove matches
    let newBoard = removeMatches(boardToProcess, Array.from(allMatchedIndices));
    
    // Apply gravity
    newBoard = applyGravity(newBoard);
    
    // Fill empty spaces
    newBoard = fillEmptySpaces(newBoard);
    
    // Clear animation
    setMatchedPieces(new Set());
    
    // Award points
    if (totalPoints > 0) {
      setScore(prev => prev + totalPoints);
      playScoreUpdate();
    }
    
    console.log(`💰 Awarded ${totalPoints} points`);
    console.log('✅ Match processing complete');
    
    return newBoard;
  }, [setScore, bombPositions, playMatch, playBomb, playScoreUpdate]);

  // SIMPLIFIED: Handle swaps - clean and simple
  const handleSwap = useCallback(async (fromIndex, toIndex) => {
    if (isProcessing) {
      console.log('🚫 Swap blocked - processing');
      return;
    }
    
    const fromPos = getPosition(fromIndex);
    const toPos = getPosition(toIndex);
    
    if (!isValidMove(board, fromPos, toPos)) {
      console.log('❌ Invalid move');
      playInvalidMove();
      return;
    }
    
    console.log(`✅ Valid swap: ${fromIndex} -> ${toIndex}`);
    setIsProcessing(true);
    
    // Execute swap
    const swappedBoard = swapPieces(board, fromPos, toPos);
    setBoard(swappedBoard);
    
    // Audio feedback
    playSwap();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Process matches
    const finalBoard = await processMatches(swappedBoard);
    setBoard(finalBoard);
    
    setIsProcessing(false);
  }, [board, isProcessing, processMatches, playSwap, playInvalidMove]);

  // SIMPLIFIED: Drag handlers
  const handleDragStart = useCallback((event, { index }) => {
    if (isProcessing || !gameStarted) return;
    
    // Handle bomb tap
    if (bombPositions.has(index)) {
      console.log('💥 Bomb tapped');
      // Trigger bomb explosion immediately
      const { row, col } = getPosition(index);
      const explosionIndices = new Set();
      
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            explosionIndices.add(r * BOARD_SIZE + c);
          }
        }
      }
      
      setBombPositions(prev => {
        const newBombs = new Set(prev);
        newBombs.delete(index);
        return newBombs;
      });
      
      setMatchedPieces(explosionIndices);
      playBomb();
      
      setTimeout(async () => {
        let newBoard = removeMatches(board, Array.from(explosionIndices));
        newBoard = applyGravity(newBoard);
        newBoard = fillEmptySpaces(newBoard);
        
        setBoard(newBoard);
        setMatchedPieces(new Set());
        
        // Award points
        const points = explosionIndices.size * POINTS_PER_PIECE * 2;
        setScore(prev => prev + points);
        playScoreUpdate();
      }, 300);
      
      return;
    }
    
    setDraggedPiece({ index });
  }, [isProcessing, gameStarted, bombPositions, board, setScore, playBomb, playScoreUpdate]);

  const handleDragEnd = useCallback((event, info) => {
    if (!draggedPiece || isProcessing || !gameStarted) {
      setDraggedPiece(null);
      return;
    }

    const { offset } = info;
    const { index } = draggedPiece;
    const { row, col } = getPosition(index);

    let targetIndex;
    const threshold = 30;

    // Determine drag direction
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      if (offset.x > threshold && col < BOARD_SIZE - 1) {
        targetIndex = index + 1;
      } else if (offset.x < -threshold && col > 0) {
        targetIndex = index - 1;
      }
    } else {
      if (offset.y > threshold && row < BOARD_SIZE - 1) {
        targetIndex = index + BOARD_SIZE;
      } else if (offset.y < -threshold && row > 0) {
        targetIndex = index - BOARD_SIZE;
      }
    }

    if (targetIndex !== undefined) {
      handleSwap(index, targetIndex);
    }

    setDraggedPiece(null);
  }, [draggedPiece, isProcessing, gameStarted, handleSwap]);

  return (
    <div className="w-full flex justify-center">
      <div
        className="bg-nav rounded-2xl p-3 shadow-2xl relative"
        style={{
          width: 'min(85vw, 350px)',
          height: 'min(85vw, 350px)',
        }}
      >
        {/* SIMPLIFIED: Clean grid rendering */}
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const cellSize = `calc((100% - ${(BOARD_SIZE - 1) * 4}px) / ${BOARD_SIZE})`;
          const left = `calc(${col} * (${cellSize} + 4px))`;
          const top = `calc(${row} * (${cellSize} + 4px))`;
          
          const piece = (board[row] && board[row][col] !== undefined) ? board[row][col] : null;
          const isSelected = draggedPiece?.index === index;
          const isMatched = matchedPieces.has(index);
          const hasBomb = bombPositions.has(index);
          
          return (
            <div
              key={index} // SIMPLIFIED: Just use index, no complex keys
              className="absolute"
              style={{ left, top, width: cellSize, height: cellSize }}
            >
              {piece !== null && (
                <GamePiece
                  piece={piece}
                  index={index}
                  isSelected={isSelected}
                  isMatched={isMatched}
                  hasBomb={hasBomb}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameBoard;

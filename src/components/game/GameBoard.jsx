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
  const [poppedEmojis, setPoppedEmojis] = useState([]);

  const tg = window.Telegram?.WebApp;

  const processBoardChanges = useCallback((currentBoard) => {
    setIsProcessing(true);

    const checkAndResolve = (boardToCheck) => {
      const matches = checkForMatches(boardToCheck);
      
      if (matches.size > 0) {
        tg?.HapticFeedback.impactOccurred('light');
        setScore(prevScore => prevScore + (matches.size * POINTS_PER_PIECE));

        // --- New Emoji Logic ---
        const newPops = [];
        const flatBoard = boardToCheck.flat();
        flatBoard.forEach((piece) => {
          if (piece && matches.has(piece.id)) {
             const { row, col } = getPosition(piece.id);
             newPops.push({ id: `pop-${piece.id}-${Date.now()}`, row, col });
          }
        });
        setPoppedEmojis(current => [...current, ...newPops]);
        
        // This timer now reliably clears emojis after their animation is done
        setTimeout(() => {
          setPoppedEmojis(currentPops => currentPops.filter(p => !newPops.some(np => np.id === p.id)));
        }, 600); 

        setTimeout(() => {
          const newBoard = boardToCheck.map(row => 
            row.map(piece => (piece && matches.has(piece.id) ? null : piece))
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
    // This effect now only runs once to initialize the board without side effects.
    processBoardChanges(board);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handleDragStart = (event, { index }) => {
    if (isProcessing || !isGameActive) return;
    setDraggedPiece({ index });
  };

  const handleDragEnd = (event, info) => {
    if (isProcessing || !draggedPiece || !isGameActive) return;

    const { offset } = info;
    const { index } = draggedPiece;
    const { col } = getPosition(index);

    let replacedIndex;
    const threshold = 20;

    if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x > threshold && col < BOARD_SIZE - 1) replacedIndex = index + 1;
        else if (offset.x < -threshold && col > 0) replacedIndex = index - 1;
    } else {
        if (offset.y > threshold) replacedIndex = index + BOARD_SIZE;
        else if (offset.y < -threshold) replacedIndex = index - BOARD_SIZE;
    }

    if (replacedIndex !== undefined && replacedIndex >= 0 && replacedIndex < BOARD_SIZE * BOARD_SIZE) {
      const newBoard = JSON.parse(JSON.stringify(board));
      const {row: r1, col: c1} = getPosition(index);
      const {row: r2, col: c2} = getPosition(replacedIndex);
      [newBoard[r1][c1], newBoard[r2][c2]] = [newBoard[r2][c2], newBoard[r1][c1]];

      const matches = checkForMatches(newBoard);
      if (matches.size > 0) {
          setBoard(newBoard);
          processBoardChanges(newBoard);
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
      className="grid bg-nav rounded-lg p-2 shadow-inner relative"
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
          piece && <GamePiece 
            key={piece.id}
            color={piece.color} 
            index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {poppedEmojis.map(pop => {
            return (
                <motion.div
                    key={pop.id}
                    initial={{ opacity: 1, scale: 0.5, y: 0 }}
                    animate={{ opacity: 1, scale: 1.2, y: -20 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute text-3xl pointer-events-none"
                    style={{
                        top: `calc(${pop.row * (100 / BOARD_SIZE)}% + ${100 / BOARD_SIZE / 4}%)`,
                        left: `calc(${pop.col * (100 / BOARD_SIZE)}% + ${100 / BOARD_SIZE / 4}%)`,
                    }}
                >
                    🔥
                </motion.div>
            );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default GameBoard;

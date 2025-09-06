import React from 'react';
import { motion } from 'framer-motion';

const GamePiece = ({ 
  emoji, 
  index, 
  isSelected, 
  onPieceClick,
  isMatched = false
}) => {
  
  if (!emoji) {
    // Empty space - render invisible placeholder
    return (
      <div className="w-full h-full flex items-center justify-center" />
    );
  }

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-1"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isMatched ? 0 : 1, 
        opacity: isMatched ? 0 : 1 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <motion.button
        className={`
          w-full h-full rounded-xl flex items-center justify-center
          text-3xl font-bold cursor-pointer select-none
          transition-all duration-200 shadow-lg
          ${isSelected 
            ? 'bg-yellow-400 shadow-yellow-400/50 scale-110' 
            : 'bg-white/90 hover:bg-white shadow-black/20'
          }
        `}
        onClick={() => onPieceClick(index)}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        style={{ 
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {emoji}
      </motion.button>
    </motion.div>
  );
};

export default GamePiece;

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

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPieceClick(index);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    onPieceClick(index);
  };

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-0.5"
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
          w-full h-full rounded-lg flex items-center justify-center
          text-2xl font-bold cursor-pointer select-none
          transition-all duration-200 shadow-lg
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        style={{ 
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {emoji}
      </motion.button>
    </motion.div>
  );
};

export default GamePiece;

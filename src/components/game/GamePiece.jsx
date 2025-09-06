import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ 
  emoji, 
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false
}) => {
  const controls = useDragControls();
  
  if (!emoji) {
    // Empty space - render invisible placeholder
    return (
      <div className="w-full h-full flex items-center justify-center" />
    );
  }

  const handlePointerDown = (e) => {
    // Trigger haptic feedback on touch
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    
    // Start drag
    onDragStart(e, { index });
    controls.start(e, { snapToCursor: false });
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
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center
          text-4xl font-bold cursor-pointer select-none
          transition-all duration-200 shadow-lg
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        // Drag functionality
        drag={true}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.6}
        dragMomentum={false}
        whileDrag={{ 
          scale: 1.2, 
          zIndex: 1000,
          rotate: 5,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}
        onDragEnd={onDragEnd}
        onPointerDown={handlePointerDown}
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {emoji}
      </motion.div>
    </motion.div>
  );
};

export default GamePiece;

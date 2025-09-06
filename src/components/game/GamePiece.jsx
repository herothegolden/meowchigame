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
    // Empty space - render invisible placeholder that maintains layout
    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: '100%', minWidth: '100%' }}
      />
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
      // FASTER: Reduced animation duration from 0.2s to 0.08s
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isMatched ? 0 : 1, 
        opacity: isMatched ? 0 : 1 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.08, // Even faster
        ease: "easeOut"
      }}
      // REMOVED: layout prop that was causing board movement
    >
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center
          text-4xl font-bold cursor-pointer select-none
          transition-all duration-50 shadow-lg
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        // OPTIMIZED: Faster drag animations
        drag={true}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.6}
        dragMomentum={false}
        whileDrag={{ 
          scale: 1.15, // Slightly smaller scale change
          zIndex: 1000,
          rotate: 3, // Less rotation
          boxShadow: "0 8px 25px rgba(0,0,0,0.4)"
        }}
        // FASTER: Quicker drag transition
        transition={{ 
          duration: 0.02, // Super fast transitions
          ease: "easeOut"
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

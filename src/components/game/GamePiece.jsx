import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ 
  emoji, 
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false,
  hasBomb = false
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
      const feedbackType = hasBomb ? 'heavy' : 'light';
      window.Telegram.WebApp.HapticFeedback.impactOccurred(feedbackType);
    }
    
    // Start drag
    onDragStart(e, { index });
    if (!hasBomb) { // Don't drag bombs, they explode on touch
      controls.start(e, { snapToCursor: false });
    }
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
          transition-all duration-50 shadow-lg relative
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : hasBomb
              ? 'bg-red-600 shadow-red-600/50' 
              : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        // OPTIMIZED: Faster drag animations
        drag={!hasBomb} // Bombs don't drag, they explode
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
        // Bomb pulsing animation
        animate={{
          scale: hasBomb ? [1, 1.1, 1] : 1,
          boxShadow: hasBomb 
            ? [
                "0 0 10px rgba(239, 68, 68, 0.5)",
                "0 0 20px rgba(239, 68, 68, 0.8)",
                "0 0 10px rgba(239, 68, 68, 0.5)"
              ]
            : "0 4px 8px rgba(0,0,0,0.2)"
        }}
        transition={{
          duration: hasBomb ? 1.5 : 0.02,
          repeat: hasBomb ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {emoji}
        
        {/* Bomb overlay indicator */}
        {hasBomb && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            💥
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default GamePiece;

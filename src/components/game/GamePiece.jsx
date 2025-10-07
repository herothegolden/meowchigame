import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ 
  emoji, 
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false,
  hasBomb = false,
  disabled = false // NEW: Support for disabled state during shuffle
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
    // Don't handle interactions if disabled
    if (disabled) return;
    
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

  // UPDATED: Check if emoji is a URL (image) or actual emoji
  const isImageUrl = emoji && emoji.startsWith('http');

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-0.5"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isMatched ? 0 : 1, 
        opacity: isMatched ? 0 : (disabled ? 0.6 : 1) // Reduced opacity when disabled
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.08,
        ease: "easeOut"
      }}
    >
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center
          ${isImageUrl ? 'text-base' : 'text-4xl'} font-bold select-none
          transition-all duration-50 shadow-lg relative
          ${disabled 
            ? 'cursor-not-allowed opacity-60' 
            : 'cursor-pointer'
          }
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : hasBomb
              ? 'bg-red-600 shadow-red-600/50' 
              : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        // Drag functionality - disabled during shuffle
        drag={!hasBomb && !disabled} // Don't drag bombs or when disabled
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.6}
        dragMomentum={false}
        whileDrag={disabled ? {} : { 
          scale: 1.15,
          zIndex: 1000,
          rotate: 3,
          boxShadow: "0 8px 25px rgba(0,0,0,0.4)"
        }}
        onDragEnd={disabled ? undefined : onDragEnd}
        onPointerDown={handlePointerDown}
        style={{ 
          touchAction: disabled ? 'auto' : 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        // FIXED: Single transition with bomb animation and shuffle support
        animate={disabled ? {
          scale: 1,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        } : hasBomb ? {
          scale: [1, 1.1, 1],
          boxShadow: [
            "0 0 10px rgba(239, 68, 68, 0.5)",
            "0 0 20px rgba(239, 68, 68, 0.8)",
            "0 0 10px rgba(239, 68, 68, 0.5)"
          ]
        } : {
          scale: 1,
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
        }}
        transition={{
          duration: hasBomb && !disabled ? 1.5 : 0.02,
          repeat: hasBomb && !disabled ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* UPDATED: Render image or emoji based on content */}
        {isImageUrl ? (
          <img 
            src={emoji} 
            alt="Game piece" 
            className={`w-full h-full object-contain rounded-lg p-1 ${disabled ? 'grayscale' : ''}`}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              imageRendering: 'auto',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
            onError={(e) => {
              // Fallback to a cookie emoji if image fails to load
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '🍪';
            }}
          />
        ) : (
          emoji
        )}
        
        {/* Bomb overlay indicator */}
        {hasBomb && !disabled && (
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

// src/components/game/GamePiece.jsx - SIMPLIFIED STABLE VERSION
import React, { useState, useMemo } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { PIECE_IMAGES, PIECE_EMOJIS } from '../../utils/gameLogic';

const GamePiece = ({ 
  piece,
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false,
  hasBomb = false
}) => {
  const controls = useDragControls();
  const [useEmoji, setUseEmoji] = useState(false);
  
  // Handle empty pieces
  if (piece === null || piece === undefined) {
    return <div className="w-full h-full" />;
  }

  // SIMPLIFIED: Memoize image data to prevent recalculation
  const { imageUrl, emoji } = useMemo(() => ({
    imageUrl: PIECE_IMAGES[piece],
    emoji: PIECE_EMOJIS[piece] || '🍪'
  }), [piece]);

  const handlePointerDown = (e) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(hasBomb ? 'heavy' : 'light');
    }
    
    onDragStart(e, { index });
    if (!hasBomb) {
      controls.start(e, { snapToCursor: false });
    }
  };

  // SIMPLIFIED: Basic image error handling
  const handleImageError = () => {
    setUseEmoji(true);
  };

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-0.5"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isMatched ? 0 : 1, 
        opacity: isMatched ? 0 : 1 
      }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center
          cursor-pointer select-none relative overflow-hidden
          shadow-lg transition-all duration-150
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : hasBomb
              ? 'bg-red-600 shadow-red-600/50' 
              : 'bg-nav hover:bg-gray-600'
          }
        `}
        drag={!hasBomb}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.6}
        dragMomentum={false}
        whileDrag={{ scale: 1.15, zIndex: 1000, rotate: 3 }}
        onDragEnd={onDragEnd}
        onPointerDown={handlePointerDown}
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        animate={hasBomb ? {
          boxShadow: [
            "0 0 10px rgba(239, 68, 68, 0.5)",
            "0 0 20px rgba(239, 68, 68, 0.8)",
            "0 0 10px rgba(239, 68, 68, 0.5)"
          ]
        } : {}}
        transition={{
          duration: hasBomb ? 1.5 : 0.15,
          repeat: hasBomb ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* SIMPLIFIED: Content with minimal state */}
        <div className="w-full h-full flex items-center justify-center relative">
          {!useEmoji && imageUrl ? (
            <img
              src={imageUrl}
              alt={`Piece ${piece}`}
              className="w-full h-full object-contain"
              style={{
                maxWidth: '85%',
                maxHeight: '85%',
                filter: isMatched ? 'blur(2px) brightness(0.7)' : 'none'
              }}
              onError={handleImageError}
              draggable={false}
            />
          ) : (
            <div className="text-4xl font-bold">
              {emoji}
            </div>
          )}
        </div>
        
        {/* Bomb indicator */}
        {hasBomb && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            💥
          </div>
        )}

        {/* Selection effect */}
        {isSelected && (
          <div className="absolute inset-0 bg-accent/20 rounded-lg pointer-events-none" />
        )}

        {/* Match effect */}
        {isMatched && (
          <motion.div
            className="absolute inset-0 bg-white/30 rounded-lg pointer-events-none"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

// SIMPLIFIED: Basic memoization
export default React.memo(GamePiece);

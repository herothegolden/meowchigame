// src/components/game/GamePiece.jsx - FIXED VERSION - No more crazy rotations!
import React, { useState, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { PIECE_IMAGES, PIECE_EMOJIS } from '../../utils/gameLogic';

const GamePiece = ({ 
  piece, // Receives index (0-5) instead of emoji
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false,
  hasBomb = false
}) => {
  const controls = useDragControls();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // 🚨 FIXED: Reset image states when piece changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [piece]);
  
  // Handle empty pieces
  if (piece === null || piece === undefined) {
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

  // Get the image URL and fallback emoji based on piece index
  const imageUrl = PIECE_IMAGES[piece];
  const fallbackEmoji = PIECE_EMOJIS[piece];

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-0.5"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isMatched ? 0 : 1, 
        opacity: isMatched ? 0 : 1 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.15, // 🔧 FIXED: Reasonable duration for all pieces
        ease: "easeOut"
      }}
    >
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center
          cursor-pointer select-none relative overflow-hidden
          transition-all duration-150 shadow-lg
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : hasBomb
              ? 'bg-red-600 shadow-red-600/50' 
              : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        // 🔧 FIXED: Simplified drag functionality
        drag={!hasBomb && !isMatched} // Don't drag bombs or matched pieces
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.3} // 🔧 FIXED: Reduced elasticity
        dragMomentum={false}
        whileDrag={{ 
          scale: 1.1, // 🔧 FIXED: Reduced scale
          zIndex: 1000,
          rotate: 2, // 🔧 FIXED: Reduced rotation
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)"
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
        // 🔧 FIXED: Proper bomb animation without affecting other pieces
        animate={hasBomb ? {
          scale: [1, 1.05, 1], // 🔧 FIXED: Reduced scale animation
          boxShadow: [
            "0 0 8px rgba(239, 68, 68, 0.4)",
            "0 0 15px rgba(239, 68, 68, 0.7)",
            "0 0 8px rgba(239, 68, 68, 0.4)"
          ]
        } : undefined} // 🔧 FIXED: No animation for regular pieces
        transition={hasBomb ? {
          duration: 1.2, // 🔧 FIXED: Slightly faster bomb animation
          repeat: Infinity,
          ease: "easeInOut"
        } : {
          duration: 0.2, // 🔧 FIXED: Normal duration for state changes
          ease: "easeOut"
        }}
      >
        {/* MAIN CONTENT: Custom Image with Emoji Fallback */}
        <div className="w-full h-full flex items-center justify-center relative">
          {!imageError && imageUrl ? (
            <>
              {/* Your Custom Image */}
              <motion.img
                src={imageUrl}
                alt={`Meowchi piece ${piece}`}
                className="w-full h-full object-contain"
                style={{
                  maxWidth: '85%', // 🔧 FIXED: Slightly smaller for better fit
                  maxHeight: '85%',
                  imageRendering: 'auto',
                  filter: isMatched ? 'blur(2px) brightness(0.7)' : 'none'
                }}
                onLoad={() => {
                  setImageLoaded(true);
                  console.log(`✅ Loaded: ${imageUrl.split('/').pop()?.split('?')[0]}`);
                }}
                onError={(e) => {
                  setImageError(true);
                  console.warn(`❌ Failed to load: ${imageUrl}`);
                }}
                draggable={false}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: imageLoaded ? 1 : 0,
                  scale: imageLoaded ? 1 : 0.9
                }}
                transition={{ duration: 0.25 }} // 🔧 FIXED: Smoother image transition
              />
              
              {/* Loading state - show emoji while image loads */}
              {!imageLoaded && !imageError && (
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center text-2xl"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: imageLoaded ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {fallbackEmoji}
                </motion.div>
              )}
            </>
          ) : (
            /* Fallback Emoji - shown on error or as immediate fallback */
            <motion.div 
              className="text-3xl font-bold"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {fallbackEmoji}
            </motion.div>
          )}
        </div>
        
        {/* Bomb overlay indicator */}
        {hasBomb && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold z-10"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            💥
          </motion.div>
        )}

        {/* Selection glow effect */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 bg-accent/20 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />
        )}

        {/* Match animation overlay */}
        {isMatched && (
          <motion.div
            className="absolute inset-0 bg-white/30 rounded-lg pointer-events-none"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

export default GamePiece;

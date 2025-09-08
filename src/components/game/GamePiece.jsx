// src/components/game/GamePiece.jsx - FIXED VERSION
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { PIECE_IMAGES, PIECE_EMOJIS } from '../../utils/gameLogic';

const GamePiece = ({ 
  piece, // Receives index (0-5) 
  index, 
  isSelected, 
  onDragStart,
  onDragEnd,
  isMatched = false,
  hasBomb = false
}) => {
  const controls = useDragControls();
  
  // FIXED: Stable image loading state with proper keys
  const [imageLoadStates, setImageLoadStates] = useState(new Map());
  const loadAttemptRef = useRef(new Map()); // Track load attempts to prevent infinite retries
  
  // Handle empty pieces
  if (piece === null || piece === undefined) {
    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: '100%', minWidth: '100%' }}
      />
    );
  }

  // FIXED: Memoize image URL and emoji to prevent unnecessary recalculations
  const imageData = useMemo(() => {
    if (piece < 0 || piece >= PIECE_IMAGES.length) {
      return {
        imageUrl: null,
        fallbackEmoji: '🍪' // Default fallback
      };
    }
    
    return {
      imageUrl: PIECE_IMAGES[piece],
      fallbackEmoji: PIECE_EMOJIS[piece] || '🍪'
    };
  }, [piece]);

  // FIXED: Stable load state getter
  const getImageLoadState = useCallback((url) => {
    return imageLoadStates.get(url) || { loaded: false, error: false, loading: false };
  }, [imageLoadStates]);

  // FIXED: Prevent infinite image loading loops
  const handleImageLoad = useCallback((url) => {
    const currentAttempts = loadAttemptRef.current.get(url) || 0;
    
    // CRITICAL: Prevent infinite reload attempts
    if (currentAttempts > 3) {
      console.warn(`❌ Max load attempts reached for: ${url}`);
      setImageLoadStates(prev => new Map(prev).set(url, { loaded: false, error: true, loading: false }));
      return;
    }
    
    setImageLoadStates(prev => {
      const newMap = new Map(prev);
      newMap.set(url, { loaded: true, error: false, loading: false });
      return newMap;
    });
    
    console.log(`✅ Image loaded: ${url.split('/').pop()?.split('?')[0]}`);
  }, []);

  // FIXED: Controlled error handling without infinite retries
  const handleImageError = useCallback((url) => {
    const currentAttempts = loadAttemptRef.current.get(url) || 0;
    loadAttemptRef.current.set(url, currentAttempts + 1);
    
    console.warn(`❌ Image load failed (attempt ${currentAttempts + 1}): ${url}`);
    
    setImageLoadStates(prev => {
      const newMap = new Map(prev);
      newMap.set(url, { loaded: false, error: true, loading: false });
      return newMap;
    });
  }, []);

  // FIXED: Initiate loading only when needed
  const initiateImageLoad = useCallback((url) => {
    const state = getImageLoadState(url);
    const attempts = loadAttemptRef.current.get(url) || 0;
    
    // CRITICAL: Don't reload if already loaded, errored after max attempts, or currently loading
    if (state.loaded || state.loading || attempts > 3) {
      return;
    }
    
    setImageLoadStates(prev => {
      const newMap = new Map(prev);
      newMap.set(url, { loaded: false, error: false, loading: true });
      return newMap;
    });
  }, [getImageLoadState]);

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

  // Get current image state
  const { imageUrl, fallbackEmoji } = imageData;
  const imageState = getImageLoadState(imageUrl);

  // FIXED: Determine what to show based on stable states
  const shouldShowImage = imageUrl && !imageState.error && (imageState.loaded || imageState.loading);
  const shouldShowEmoji = !imageUrl || imageState.error || (!imageState.loaded && !imageState.loading);

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
        duration: 0.08,
        ease: "easeOut"
      }}
    >
      <motion.div
        className={`
          w-full h-full rounded-lg flex items-center justify-center
          cursor-pointer select-none relative overflow-hidden
          transition-all duration-50 shadow-lg
          ${isSelected 
            ? 'bg-accent shadow-accent/50 scale-110' 
            : hasBomb
              ? 'bg-red-600 shadow-red-600/50' 
              : 'bg-nav hover:bg-gray-600 shadow-black/20'
          }
        `}
        // Drag functionality
        drag={!hasBomb} // Bombs don't drag, they explode
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.6}
        dragMomentum={false}
        whileDrag={{ 
          scale: 1.15,
          zIndex: 1000,
          rotate: 3,
          boxShadow: "0 8px 25px rgba(0,0,0,0.4)"
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
        // Bomb animation
        animate={hasBomb ? {
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
          duration: hasBomb ? 1.5 : 0.02,
          repeat: hasBomb ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* FIXED: Content rendering with stable conditions */}
        <div className="w-full h-full flex items-center justify-center relative">
          {shouldShowImage ? (
            // Custom Image Rendering
            <motion.img
              key={`${imageUrl}-${piece}`} // FIXED: Stable key prevents unnecessary re-mounts
              src={imageUrl}
              alt={`Meowchi piece ${piece}`}
              className="w-full h-full object-contain"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                imageRendering: 'auto',
                filter: isMatched ? 'blur(2px) brightness(0.7)' : 'none'
              }}
              onLoad={() => handleImageLoad(imageUrl)}
              onError={() => handleImageError(imageUrl)}
              onLoadStart={() => initiateImageLoad(imageUrl)} // FIXED: Only initiate when actually loading
              draggable={false}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: imageState.loaded ? 1 : 0.7,
                scale: imageState.loaded ? 1 : 0.9
              }}
              transition={{ duration: 0.2 }}
            />
          ) : (
            // Emoji Fallback - Always stable, no loading states
            <motion.div 
              key={`emoji-${piece}`} // FIXED: Stable key
              className="text-4xl font-bold"
              initial={{ scale: 0.8, opacity: 0 }}
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
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold z-10"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
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
            transition={{ duration: 0.1 }}
          />
        )}

        {/* Match animation overlay */}
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

// FIXED: Memoize component to prevent unnecessary re-renders
export default React.memo(GamePiece, (prevProps, nextProps) => {
  // CRITICAL: Only re-render if essential props change
  return (
    prevProps.piece === nextProps.piece &&
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMatched === nextProps.isMatched &&
    prevProps.hasBomb === nextProps.hasBomb
  );
});

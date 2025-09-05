import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ color, index, onDragStart, onDragEnd }) => {
  const controls = useDragControls();

  // Variants for the pop animation
  const variants = {
    initial: {
      scale: 0,
      opacity: 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }
    },
    exit: {
      scale: 0,
      opacity: 0,
      rotate: 360,
      transition: {
        duration: 0.3
      }
    }
  };

  if (!color) {
    return <div className="w-full h-full rounded-full" />;
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center p-1"
      onPointerDown={(e) => {
        onDragStart(e, { index });
        controls.start(e);
      }}
    >
      <motion.div
        layout // This helps animate position changes smoothly
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        drag={true}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.5}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.15, zIndex: 10 }}
        className="w-full h-full rounded-full shadow-lg cursor-grab"
        style={{ backgroundColor: color, touchAction: 'none' }}
      />
    </div>
  );
};

export default GamePiece;

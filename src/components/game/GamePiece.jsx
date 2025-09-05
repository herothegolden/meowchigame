import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const pieceVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', duration: 0.3 } },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } }
};

const GamePiece = ({ color, index, onDragStart, onDragEnd }) => {
  const controls = useDragControls();

  return (
    <motion.div
      variants={pieceVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full h-full flex items-center justify-center p-1"
      onPointerDown={(e) => {
        if (onDragStart) {
          onDragStart(e, { index });
          controls.start(e);
        }
      }}
    >
      <motion.div
        drag={true}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.3}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.15, zIndex: 10 }}
        className="w-full h-full rounded-full shadow-lg cursor-grab"
        style={{ backgroundColor: color, touchAction: 'none' }}
      />
    </motion.div>
  );
};

export default GamePiece;

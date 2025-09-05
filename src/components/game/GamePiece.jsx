import React from 'react';
import { motion } from 'framer-motion';

const GamePiece = ({ color, dragControls, onDragEnd }) => {
  if (!color) {
    return <div className="w-full h-full" />;
  }

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false} // We trigger drag manually via onPointerDown
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.2, zIndex: 10 }}
      dragSnapToOrigin // Snaps back to its original position after drag
      className="w-10/12 h-10/12 rounded-full cursor-grab"
      style={{ 
        backgroundColor: color,
        boxShadow: `inset 0 0 5px rgba(0,0,0,0.4)`,
      }}
    />
  );
};

export default GamePiece;

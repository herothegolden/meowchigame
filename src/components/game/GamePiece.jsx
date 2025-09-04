import React from 'react';
import { motion } from 'framer-motion';

const GamePiece = ({ color, index, onDragStart, onDragOver, onDragDrop, onDragEnd }) => {
  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center p-1 cursor-grab"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
      draggable={true}
      data-index={index}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragDrop={onDragDrop}
      onDragEnd={onDragEnd}
    >
      <div 
        className="w-full h-full rounded-full shadow-lg pointer-events-none" // pointer-events-none is crucial
        style={{ backgroundColor: color }}
      >
      </div>
    </motion.div>
  );
};

export default GamePiece;

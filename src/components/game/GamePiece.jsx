import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ color, index, onDragStart, onDragEnd }) => {
  const controls = useDragControls();

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
        // This is the fix: Changed from drag="x" to drag={true}
        // This allows the piece to be dragged freely in any direction.
        drag={true}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.5}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.15 }}
        className="w-full h-full rounded-full shadow-lg cursor-grab"
        style={{ backgroundColor: color, touchAction: 'none' }}
      />
    </div>
  );
};

export default GamePiece;

import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ color, index, onDragStart, onDragEnd }) => {
  const controls = useDragControls();

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
        // This is the fix: Changed from drag="x" to drag={true}
        // This allows the piece to be dragged freely in any direction.
        drag={true}
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.5}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.15 }}
        className="w-full h-full rounded-full shadow-lg cursor-grab"
        style={{ backgroundColor: color, touchAction: 'none' }}
      />
    </div>
  );
};

export default GamePiece;

import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ color, index, onDragStart, onDragEnd }) => {
  const controls = useDragControls();

  // If there's no color, it's an empty space.
  // We render a placeholder so the grid doesn't collapse.
  if (!color) {
    return <div className="w-full h-full rounded-full" />;
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center p-1"
      // This allows dragging to start immediately on touch/click
      onPointerDown={(e) => {
        onDragStart(e, { index });
        controls.start(e, { snapToCursor: true });
      }}
    >
      <motion.div
        // NEW: Animation properties for appearing and disappearing
        layout // Ensures smooth movement when pieces fall
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ duration: 0.2 }}

        // Drag functionality
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

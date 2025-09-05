import React from 'react';
import { motion, useDragControls } from 'framer-motion';

const GamePiece = ({ color, index, onDragStart, onDragEnd }) => {
  const controls = useDragControls();

  // If there's no color, it's an empty space, so render nothing.
  if (!color) {
    return <div className="w-full h-full rounded-full" />;
  }

  return (
    // This outer div captures the initial touch/click event.
    <div 
      className="w-full h-full flex items-center justify-center p-1"
      onPointerDown={(e) => {
        // We tell the parent board which piece is being dragged
        // and then programmatically start the drag action.
        onDragStart(e, { index });
        controls.start(e);
      }}
    >
      {/* This is the visible, draggable piece */}
      <motion.div
        drag="x" // We can lock dragging to an axis, but will control movement via logic
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElasticity={0.5} // Adds a nice "bouncy" feel
        onDragEnd={onDragEnd}
        className="w-full h-full rounded-full shadow-lg cursor-grab"
        style={{ backgroundColor: color, touchAction: 'none' }} // touchAction: 'none' is important for mobile
      />
    </div>
  );
};

export default GamePiece;

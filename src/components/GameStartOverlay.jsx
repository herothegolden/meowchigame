// src/components/GameStartOverlay.jsx
import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

/**
 * GameStartOverlay
 * Intro overlay shown before a round begins.
 */
export default function GameStartOverlay({ visible, onStart }) {
  if (!visible) return null;

  return (
    <motion.div
      className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
        <h2 className="text-3xl font-bold text-primary mb-4">Ready to Play?</h2>

        <div className="flex justify-center mb-6">
          <img
            src="https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/MeowchiCat.webp?updatedAt=1758909417672"
            alt="Meowchi Cat"
            className="w-20 h-20 object-contain"
          />
        </div>

        <div className="bg-background/50 p-4 rounded-xl mb-6 border border-gray-700">
          <p className="text-lg font-bold text-accent mb-2">Meowchi Match Game</p>
          <p className="text-sm text-secondary">Match 3 or more pieces to score points!</p>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center space-x-2 bg-accent text-background hover:bg-accent/90 transition-colors"
        >
          <Play size={24} />
          <span>Start Game</span>
        </button>
      </div>
    </motion.div>
  );
}

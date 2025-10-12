// src/components/GameOverModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import soundManager from "../utils/SoundManager";

/**
 * GameOverModal
 * Shown when the game ends — displays score, boosts, shuffle stats.
 */
export default function GameOverModal({
  visible,
  score,
  activeBoosts,
  shuffleCount,
  onRestart,
  navigateHome,
}) {
  if (!visible) return null;

  return (
    <motion.div
      className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
        <h2 className="text-4xl font-bold text-primary mb-4">Game Over!</h2>
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-2xl font-bold text-accent mb-2">
          {score.toLocaleString()} Points
        </p>
        {activeBoosts?.pointMultiplier && (
          <p className="text-sm text-green-400 mb-2">🔥 Double Points Applied!</p>
        )}
        {shuffleCount > 0 && (
          <p className="text-sm text-blue-400 mb-2">
            🔀 Shuffles used: {shuffleCount}
          </p>
        )}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => {
              soundManager.playUI("button_click", { volume: 0.8 });
              onRestart();
            }}
            className="flex-1 bg-accent text-background py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-accent/90 transition-colors"
          >
            <RotateCcw size={20} />
            <span>Play Again</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUI("button_click", { volume: 0.8 });
              navigateHome();
            }}
            className="flex-1 bg-nav border border-gray-700 text-primary py-3 px-4 rounded-xl font-bold hover:bg-gray-700 transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    </motion.div>
  );
}

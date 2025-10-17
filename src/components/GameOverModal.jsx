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
      // CHANGED: Remove black overlay (bg-black/75 → bg-transparent)
      className="absolute inset-0 bg-transparent flex flex-col items-center justify-center z-50 p-4" // CHANGED
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
        <h2 className="text-4xl font-bold text-primary mb-4">Game Over!</h2>

        <img
          src="https://ik.imagekit.io/59r2kpz8r/GameOVER2.png?updatedAt=1760689816409"
          alt="Game Over"
          className="w-48 h-48 mx-auto mb-6 object-contain"
        />

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

        {/* CHANGED: Move promo text ABOVE buttons and style HAYAAAA */}
        <div className="mt-6 text-center"> {/* CHANGED */}
          <p className="text-sm text-gray-400"> {/* CHANGED */}
            <span className="font-bold text-yellow-400">HAYAAAA</span>, купи{" "}
            <span className="font-bold">쫀득</span> Cookies получи Тайм-Бусти, 쿠키-Бомбы, Множители очков х3
          </p>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => {
              soundManager.playUI("button_click", { volume: 0.8 });
              onRestart();
            }}
            // CHANGED: Play Again to neutral gray (remove yellow)
            className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-600 transition-colors" // CHANGED
          >
            <RotateCcw size={20} />
            <span>Play Again</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUI("button_click", { volume: 0.8 });
              navigateHome();
            }}
            // Keep sales CTA yellow
            className="flex-1 bg-yellow-400 text-black py-3 px-4 rounded-xl font-bold hover:bg-yellow-500 transition-colors"
          >
            <span>Заказать</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

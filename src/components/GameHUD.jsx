// src/components/GameHUD.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Clock, ChevronsUp } from "lucide-react";
import BoosterTimer from "./BoosterTimer";

/**
 * GameHUD
 * Displays score, timer, and booster countdown.
 * Mirrors layout from original GamePage header section.
 */
export default function GameHUD({ score, timeLeft, boosterActive, boosterTimeLeft, activeBoosts, formatTime }) {
  return (
    <motion.div
      className="flex justify-between items-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700">
        <Star className="w-6 h-6 text-accent" />
        <span className="text-xl font-bold text-primary">{score.toLocaleString()}</span>
        {activeBoosts?.pointMultiplier && <ChevronsUp className="w-5 h-5 text-green-400" />}
      </div>

      <div className="flex flex-col items-end space-y-2">
        <div
          className={`flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700 ${
            timeLeft <= 10 ? "animate-pulse" : ""
          }`}
        >
          <Clock className={`w-6 h-6 ${timeLeft <= 10 ? "text-red-500" : "text-accent"}`} />
          <span
            className={`text-xl font-bold ${
              timeLeft <= 10 ? "text-red-500" : "text-primary"
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        <AnimatePresence>
          {boosterActive && boosterTimeLeft > 0 && (
            <BoosterTimer boosterTimeLeft={boosterTimeLeft} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

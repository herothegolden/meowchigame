// src/hooks/useGameTimer.js
import { useState, useEffect, useCallback } from "react";
import soundManager from "../utils/SoundManager";

export default function useGameTimer(tg) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Countdown timer identical to GamePage ---
  useEffect(() => {
    if (!gameStarted || isGameOver || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, isGameOver, timeLeft]);

  // --- Disable Telegram swipe gestures ---
  useEffect(() => {
    if (tg) {
      tg.disableVerticalSwipes();
      return () => tg.enableVerticalSwipes();
    }
  }, [tg]);

  // --- Sound trigger when game ends ---
  useEffect(() => {
    if (isGameOver && !isSubmitting) {
      soundManager.playCore("game_over", { volume: 1.0 });
    }
  }, [isGameOver, isSubmitting]);

  // --- Start & restart functions identical to original ---
  const startGame = useCallback(() => {
    soundManager.playCore("power_up", { volume: 0.8 });
    setGameStarted(true);
    setScore(0);
    setTimeLeft(30);
    setIsGameOver(false);
    setIsSubmitting(false);
  }, []);

  const restartGame = useCallback(() => {
    soundManager.playUI("button_click", { volume: 0.8 });
    setGameStarted(false);
    setTimeLeft(30);
    setIsGameOver(false);
    setIsSubmitting(false);
  }, []);

  // --- Format helper (keep identical logic) ---
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // --- Hook return interface ---
  return {
    timeLeft,
    setTimeLeft,
    gameStarted,
    setGameStarted,
    isGameOver,
    setIsGameOver,
    isSubmitting,
    setIsSubmitting,
    startGame,
    restartGame,
    formatTime,
  };
}

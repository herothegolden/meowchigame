import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import GameBoard from "../../components/game/GameBoard";

import GameHUD from "../../components/GameHUD";
import GameStartOverlay from "../../components/GameStartOverlay";
import GameOverModal from "../../components/GameOverModal";
import ShuffleAlert from "../../components/ShuffleAlert";

import useInventory from "../../hooks/useInventory";
import useGameTimer from "../../hooks/useGameTimer";
import useShuffle from "../../hooks/useShuffle";
import useBombDrag from "../../hooks/useBombDrag";
import useScoreSubmit from "../../hooks/useScoreSubmit";
import useZenTimer from "../../hooks/useZenTimer";

import formatTime from "../../utils/formatTime";
import soundManager from "../../utils/SoundManager";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const GamePage = () => {
  const tg = window.Telegram?.WebApp;
  const navigateHome = () => window.location.assign("/");

  // 🎯 Core gameplay states
  const [score, setScore] = useState(0);

  // 🧠 Hooks
  const {
    timeLeft,
    setTimeLeft,
    gameStarted,
    setGameStarted,
    isGameOver,
    setIsGameOver,
    startGame,
    restartGame,
  } = useGameTimer(tg);

  const {
    availableItems,
    inventoryError,
    boosterActive,
    boosterTimeLeft,
    activeBoosts,
    handleUseItem,
    loadInventory,
  } = useInventory(tg);

  const {
    shuffleNeeded,
    shuffleCount,
    shuffleCooldown,
    handleShuffleNeeded,
    handleBoardReady,
    handleShuffle,
  } = useShuffle();

  const {
    isDraggingBomb,
    ghostBombPosition,
    startDraggingBomb,
    gameBoardRef,
    setGameBoardRef,
  } = useBombDrag(tg, BACKEND_URL);

  useScoreSubmit(tg, BACKEND_URL, score, isGameOver);
  useZenTimer(tg, BACKEND_URL, gameStarted, isGameOver);

  // ✅ FIX: ensure inventory loads before first game start
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // 🧩 Handlers
  const handleRestart = async () => {
    restartGame();
    await loadInventory();
  };

  return (
    <div className="relative flex flex-col h-full p-4 space-y-4 bg-background text-primary overflow-hidden">
      {/* 🧨 Bomb ghost while dragging */}
      {isDraggingBomb && (
        <motion.div
          className="fixed pointer-events-none z-50 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-red-400"
          style={{
            left: ghostBombPosition.x - 24,
            top: ghostBombPosition.y - 24,
          }}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Shuffle className="w-6 h-6 text-white" />
        </motion.div>
      )}

      {/* 🧭 Game HUD */}
      <GameHUD
        score={score}
        timeLeft={timeLeft}
        boosterActive={boosterActive}
        boosterTimeLeft={boosterTimeLeft}
        activeBoosts={activeBoosts}
        formatTime={formatTime}
      />

      {/* ⚠️ Shuffle alert */}
      <ShuffleAlert
        visible={shuffleNeeded && gameStarted && !isGameOver && shuffleCooldown === 0}
      />

      {/* 🎮 Game board */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <GameBoard
          setScore={setScore}
          gameStarted={gameStarted}
          startWithBomb={false}
          onGameEnd={() => setIsGameOver(true)}
          onShuffleNeeded={handleShuffleNeeded}
          onBoardReady={handleBoardReady}
          onGameBoardRef={setGameBoardRef}
        />
      </motion.div>

      {/* 🔄 Shuffle button */}
      {gameStarted && !isGameOver && (
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.button
            onClick={() => {
              soundManager.playUI("button_click", { volume: 0.8 });
              handleShuffle(gameStarted, isGameOver);
            }}
            disabled={shuffleCooldown > 0}
            className={`flex items-center space-x-3 px-6 py-3 rounded-xl shadow-lg border transition-all duration-200 ${
              shuffleNeeded && shuffleCooldown === 0
                ? "bg-red-600 hover:bg-red-700 border-red-500 animate-pulse text-white"
                : shuffleCooldown > 0
                ? "bg-gray-600 border-gray-500 cursor-not-allowed opacity-50 text-gray-300"
                : "bg-nav border-gray-700 hover:bg-gray-600 text-primary"
            }`}
            whileTap={shuffleCooldown === 0 ? { scale: 0.95 } : {}}
          >
            <Shuffle
              className={`w-6 h-6 ${
                shuffleNeeded && shuffleCooldown === 0
                  ? "text-white"
                  : shuffleCooldown > 0
                  ? "text-gray-400"
                  : "text-accent"
              }`}
            />
            <span className="font-bold">
              {shuffleCooldown > 0
                ? `Shuffle (${shuffleCooldown}s)`
                : shuffleNeeded
                ? "Shuffle Now!"
                : "Shuffle"}
            </span>
            {shuffleCount > 0 && shuffleCooldown === 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 ml-2">
                {shuffleCount}
              </span>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* 💥 Inventory error */}
      {gameStarted && !isGameOver && inventoryError && (
        <motion.div
          className="flex items-center justify-center p-3 bg-red-600/20 rounded-xl border border-red-500"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-red-300">{inventoryError}</p>
        </motion.div>
      )}

      {/* 🎒 Items */}
      {gameStarted && !isGameOver && !inventoryError && availableItems.length > 0 && (
        <motion.div
          className="flex items-center justify-center space-x-4 p-3 bg-nav rounded-xl border border-gray-700 mx-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {availableItems.map((item) => {
            const isTimeBooster = item.item_id === 1;
            const isBomb = item.item_id === 3;
            const isDoublePoints = item.item_id === 4;

            return (
              <motion.button
                key={item.item_id}
                onClick={() => {
                  if (isTimeBooster || isDoublePoints)
                    handleUseItem(item.item_id, setTimeLeft);
                }}
                onPointerDown={(e) => {
                  if (isBomb) startDraggingBomb(e, availableItems);
                }}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 relative ${
                  isTimeBooster
                    ? "bg-blue-600/20 border-blue-500 hover:bg-blue-600/30"
                    : isBomb
                    ? "bg-red-600/20 border-red-500 hover:bg-red-600/30 cursor-grab"
                    : isDoublePoints
                    ? "bg-green-600/20 border-green-500 hover:bg-green-600/30"
                    : "bg-gray-600/20 border-gray-600 opacity-50"
                }`}
                whileTap={isTimeBooster || isDoublePoints ? { scale: 0.95 } : {}}
                style={{ touchAction: "none" }}
              >
                <span className="text-lg">
                  {item.item_id === 1
                    ? "⏰"
                    : item.item_id === 3
                    ? "💣"
                    : "✨"}
                </span>
                <span className="text-xs text-primary font-medium">
                  {item.quantity}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* 🕹️ Overlays */}
      <GameOverModal
        visible={isGameOver}
        score={score}
        activeBoosts={activeBoosts}
        shuffleCount={shuffleCount}
        onRestart={handleRestart}
        navigateHome={navigateHome}
      />

      <GameStartOverlay visible={!gameStarted && !isGameOver} onStart={startGame} />
    </div>
  );
};

export default GamePage;

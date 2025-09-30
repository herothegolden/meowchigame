import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, Clock, LoaderCircle, Play, RotateCcw, Bomb, ChevronsUp, Package, Zap, Timer, CheckCircle, Settings, BarChart3, History, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import soundManager from '../utils/SoundManager';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const GamePage = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameConfig, setGameConfig] = useState({ startTime: 30, startWithBomb: false });
  const [activeBoosts, setActiveBoosts] = useState({ timeBoost: 0, bomb: false, pointMultiplier: false });
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  
  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [isActivatingItem, setIsActivatingItem] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [inventoryError, setInventoryError] = useState(null);
  
  // Shuffle state
  const [shuffleNeeded, setShuffleNeeded] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [shuffleCooldown, setShuffleCooldown] = useState(0);
  const [shuffleFunction, setShuffleFunction] = useState(null);
  
  // Bomb dragging state
  const [isDraggingBomb, setIsDraggingBomb] = useState(false);
  const [ghostBombPosition, setGhostBombPosition] = useState({ x: 0, y: 0 });
  const [gameBoardRef, setGameBoardRef] = useState(null);
  
  const navigate = useNavigate();
  const tg = window.Telegram?.WebApp;

  // Timer effect
  useEffect(() => {
    if (!gameStarted || isGameOver || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, isGameOver, timeLeft]);

  // Game over sound
  useEffect(() => {
    if (isGameOver && !isSubmitting) {
      soundManager.playCore('game_over', { volume: 1.0 });
    }
  }, [isGameOver, isSubmitting]);

  // Shuffle cooldown timer
  useEffect(() => {
    if (shuffleCooldown > 0 && gameStarted && !isGameOver) {
      const timer = setInterval(() => {
        setShuffleCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [shuffleCooldown, gameStarted, isGameOver]);

  // Handle game over submission
  useEffect(() => {
    if (!isGameOver || isSubmitting) return;
    const submitScore = async () => {
      setIsSubmitting(true);
      if (score > 0 && tg && tg.initData && BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/update-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData, score: score }),
          });
          const data = await response.json();
          if (response.ok) {
            console.log('Score submitted successfully:', data);
          } else {
            console.error('Score submission failed:', data.error);
          }
        } catch (error) {
          console.error('Error submitting score:', error);
        }
      }
      setIsSubmitting(false);
    };
    const timeoutId = setTimeout(submitScore, 1000);
    return () => clearTimeout(timeoutId);
  }, [isGameOver, score, isSubmitting, tg]);

  // Disable Telegram swipes
  useEffect(() => {
    if (tg) {
      tg.disableVerticalSwipes();
      return () => tg.enableVerticalSwipes();
    }
  }, [tg]);

  // Shuffle handlers
  const handleShuffleNeeded = useCallback((needed) => {
    setShuffleNeeded(needed);
  }, []);

  const handleBoardReady = useCallback((shuffleFn) => {
    setShuffleFunction(() => shuffleFn);
  }, []);

  const handleGameBoardRef = useCallback((ref) => {
    setGameBoardRef(ref);
  }, []);

  const handleShuffle = useCallback(() => {
    if (!shuffleFunction || shuffleCooldown > 0 || !gameStarted || isGameOver) return;
    try {
      const shuffleResult = shuffleFunction();
      if (shuffleResult !== false) {
        setShuffleCount(prev => prev + 1);
        setShuffleCooldown(10);
        setShuffleNeeded(false);
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
      }
    } catch (error) {
      console.error('Error executing shuffle:', error);
    }
  }, [shuffleFunction, shuffleCooldown, gameStarted, isGameOver]);

  // Load inventory with proper error handling
  const loadInventory = async () => {
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        console.error('Cannot load inventory: Missing Telegram data or backend URL');
        setInventoryError('Connection required. Please open from Telegram.');
        setAvailableItems([]);
        setInventory([]);
        return;
      }

      console.log('Loading inventory from backend...');
      const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (res.ok) {
        const shopData = await res.json();
        let userInventory = shopData.inventory || [];
        userInventory = userInventory.filter(item => item.item_id !== 2);
        
        setAvailableItems(userInventory);
        const consumableItems = userInventory.filter(item => 
          item.item_id === 4 && item.quantity > 0
        );
        setInventory(consumableItems);
        
        const pointMultiplier = shopData.boosterActive || false;
        if (pointMultiplier) {
          setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        }
        
        setInventoryError(null);
      } else {
        console.error('Failed to fetch inventory:', res.status);
        setInventoryError('Failed to load inventory from server.');
        setAvailableItems([]);
        setInventory([]);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventoryError('Network error. Please check your connection.');
      setAvailableItems([]);
      setInventory([]);
    }
  };

  const startGame = async () => {
    soundManager.playCore('power_up', { volume: 0.8 });
    setGameStarted(true);
    setScore(0);
    setTimeLeft(30);
    setIsGameOver(false);
    setIsSubmitting(false);
    setShuffleNeeded(false);
    setShuffleCount(0);
    setShuffleCooldown(0);
  };

  const restartGame = async () => {
    soundManager.playUI('button_click', { volume: 0.8 });
    setGameStarted(false);
    setScore(0);
    setIsGameOver(false);
    setIsSubmitting(false);
    setShuffleNeeded(false);
    setShuffleCount(0);
    setShuffleCooldown(0);
    setShuffleFunction(null);
    setIsDraggingBomb(false);
    setGhostBombPosition({ x: 0, y: 0 });
    await loadInventory();
  };

  const handleUseItem = async (itemId) => {
    const item = availableItems.find(item => item.item_id === itemId);
    if (!item || item.quantity <= 0) return;

    setIsActivatingItem(itemId);

    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        throw new Error('Connection required. Please open from Telegram.');
      }

      if (itemId === 1) { // Extra Time +10s
        const res = await fetch(`${BACKEND_URL}/api/use-time-booster`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData, itemId: 1, timeBonus: 10 }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to use time booster');

        soundManager.playCore('power_up', { volume: 0.9 });
        setTimeLeft(prev => prev + 10);
        setAvailableItems(prev => 
          prev.map(invItem => 
            invItem.item_id === itemId 
              ? { ...invItem, quantity: invItem.quantity - 1 }
              : invItem
          ).filter(invItem => invItem.quantity > 0)
        );
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

      } else if (itemId === 4) { // Double Points
        const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData, itemId: 4 }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to activate Double Points');

        setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        setAvailableItems(prev => 
          prev.map(invItem => 
            invItem.item_id === itemId 
              ? { ...invItem, quantity: invItem.quantity - 1 }
              : invItem
          ).filter(invItem => invItem.quantity > 0)
        );
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      console.error('Item usage error:', error);
      if (tg && tg.showPopup) {
        tg.showPopup({
          title: 'Error',
          message: error.message,
          buttons: [{ type: 'ok' }]
        });
      } else {
        alert(error.message);
      }
    } finally {
      setIsActivatingItem(null);
    }
  };

  // Bomb dragging implementation
  const startDraggingBomb = useCallback((e) => {
    const bombItem = availableItems.find(item => item.item_id === 3);
    if (!bombItem || bombItem.quantity <= 0 || isDraggingBomb) return;

    setIsDraggingBomb(true);
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setGhostBombPosition({ x: clientX, y: clientY });
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    e.preventDefault();
  }, [availableItems, isDraggingBomb]);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingBomb) return;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setGhostBombPosition({ x: clientX, y: clientY });
    e.preventDefault();
  }, [isDraggingBomb]);

  const handlePointerUp = useCallback(async (e) => {
    if (!isDraggingBomb) return;
    setIsDraggingBomb(false);
    
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY) || 0;
    const elementUnder = document.elementFromPoint(clientX, clientY);
    
    if (elementUnder && gameBoardRef) {
      const boardElement = gameBoardRef.getBoardElement ? gameBoardRef.getBoardElement() : null;
      if (boardElement && boardElement.contains(elementUnder)) {
        const boardRect = boardElement.getBoundingClientRect();
        const cellSize = boardRect.width / 6;
        const relativeX = clientX - boardRect.left;
        const relativeY = clientY - boardRect.top;
        const col = Math.floor(relativeX / cellSize);
        const row = Math.floor(relativeY / cellSize);
        
        if (row >= 0 && row < 6 && col >= 0 && col < 6) {
          try {
            if (!tg || !tg.initData || !BACKEND_URL) {
              throw new Error('Connection required');
            }

            const res = await fetch(`${BACKEND_URL}/api/use-bomb`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tg.initData, itemId: 3 }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to use bomb');

            setAvailableItems(prev => 
              prev.map(invItem => 
                invItem.item_id === 3 
                  ? { ...invItem, quantity: invItem.quantity - 1 }
                  : invItem
              ).filter(invItem => invItem.quantity > 0)
            );

            if (gameBoardRef && gameBoardRef.handleBombDrop) {
              gameBoardRef.handleBombDrop({ row, col });
            }
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            }
          } catch (error) {
            console.error('Bomb usage error:', error);
            if (tg && tg.showPopup) {
              tg.showPopup({
                title: 'Error',
                message: error.message,
                buttons: [{ type: 'ok' }]
              });
            }
          }
        }
      }
    }
    e.preventDefault();
  }, [isDraggingBomb, gameBoardRef, availableItems, tg]);

  useEffect(() => {
    if (isDraggingBomb) {
      document.addEventListener('pointermove', handlePointerMove, { passive: false });
      document.addEventListener('pointerup', handlePointerUp, { passive: false });
      document.addEventListener('touchmove', handlePointerMove, { passive: false });
      document.addEventListener('touchend', handlePointerUp, { passive: false });
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('touchmove', handlePointerMove);
        document.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [isDraggingBomb, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    loadInventory();
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getItemDetails = (itemId) => {
    const itemMap = {
      1: { name: 'Extra Time +10s', icon: Clock, color: 'text-blue-400', description: '+10 seconds', value: 750 },
      3: { name: 'Cookie Bomb', icon: Bomb, color: 'text-red-400', description: 'Start with bomb', value: 1000 },
      4: { name: 'Double Points', icon: ChevronsUp, color: 'text-green-400', description: '2x score multiplier', value: 1500 }
    };
    return itemMap[itemId] || { name: 'Unknown Item', icon: Package, color: 'text-gray-400', description: 'Unknown effect', value: 0 };
  };

  return (
    <div className="relative flex flex-col h-full p-4 space-y-4 bg-background text-primary">
      {isDraggingBomb && (
        <motion.div
          className="fixed pointer-events-none z-50 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-red-400"
          style={{ left: ghostBombPosition.x - 24, top: ghostBombPosition.y - 24 }}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Bomb className="w-6 h-6 text-white" />
        </motion.div>
      )}
      
      {isGameOver && (
        <motion.div 
  className="flex-1 flex flex-col items-center justify-center relative"
  initial={{ opacity: 0, scale: 0.9 }} 
  animate={{ opacity: 1, scale: 1 }} 
  transition={{ duration: 0.5, delay: 0.2 }}
>
  <div className="relative flex items-center justify-center min-h-[420px] min-w-[420px]">
    {/* Frying Pan Background */}
    <img 
      src="https://ik.imagekit.io/59r2kpz8r/FryPan.webp?updatedAt=1759245049994" 
      alt="Frying Pan" 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] object-contain pointer-events-none z-0 drop-shadow-2xl"
    />
    {/* GameBoard on top */}
    <div className="relative z-10">
      <GameBoard 
        setScore={setScore} 
        gameStarted={gameStarted}
        startWithBomb={gameConfig.startWithBomb}
        onGameEnd={() => setIsGameOver(true)}
        onShuffleNeeded={handleShuffleNeeded}
        onBoardReady={handleBoardReady}
        onGameBoardRef={handleGameBoardRef}
      />
    </div>
  </div>
</motion.div>
      )}

      {!gameStarted && !isGameOver && (
        <motion.div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
            <h2 className="text-3xl font-bold text-primary mb-4">Ready to Play?</h2>
            <div className="flex justify-center mb-6">
              <img src="https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/MeowchiCat.webp?updatedAt=1758909417672" alt="Meowchi Cat" className="w-20 h-20 object-contain" />
            </div>
            <div className="bg-background/50 p-4 rounded-xl mb-6 border border-gray-700">
              <p className="text-lg font-bold text-accent mb-2">Meowchi Match Game</p>
              <p className="text-sm text-secondary">Match 3 or more pieces to score points!</p>
            </div>
            <button onClick={startGame} className="w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center space-x-2 bg-accent text-background hover:bg-accent/90 transition-colors">
              <Play size={24} />
              <span>Start Game</span>
            </button>
          </div>
        </motion.div>
      )}

      <motion.div className="flex justify-between items-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700">
          <Star className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold text-primary">{score.toLocaleString()}</span>
          {activeBoosts.pointMultiplier && <ChevronsUp className="w-5 h-5 text-green-400" />}
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700 ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
            <Clock className={`w-6 h-6 ${timeLeft <= 10 ? 'text-red-500' : 'text-accent'}`} />
            <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-primary'}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {shuffleNeeded && gameStarted && !isGameOver && shuffleCooldown === 0 && (
          <motion.div className="bg-red-600/90 backdrop-blur-sm rounded-xl p-3 border border-red-500 pointer-events-none" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-center space-x-3 text-sm text-white">
              <Shuffle className="w-5 h-5" />
              <span className="font-bold">No moves available! Use shuffle button below</span>
              <Shuffle className="w-5 h-5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frying Pan with GameBoard */}
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center relative"
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="relative flex items-center justify-center">
          {/* Frying Pan Background */}
          <img 
            src="https://ik.imagekit.io/59r2kpz8r/FryPan.webp?updatedAt=1759245049994" 
            alt="Frying Pan" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] object-contain pointer-events-none z-1 opacity-75 drop-shadow-2xl"
          />
          {/* GameBoard on top */}
          <div className="relative z-10">
            <GameBoard 
              setScore={setScore} 
              gameStarted={gameStarted}
              startWithBomb={gameConfig.startWithBomb}
              onGameEnd={() => setIsGameOver(true)}
              onShuffleNeeded={handleShuffleNeeded}
              onBoardReady={handleBoardReady}
              onGameBoardRef={handleGameBoardRef}
            />
          </div>
        </div>
      </motion.div>
      
      {gameStarted && !isGameOver && (
        <motion.div className="flex items-center justify-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <motion.button
            onClick={() => { soundManager.playUI('button_click', { volume: 0.8 }); handleShuffle(); }}
            disabled={shuffleCooldown > 0 || !shuffleFunction}
            className={`flex items-center space-x-3 px-6 py-3 rounded-xl shadow-lg border transition-all duration-200 relative ${
              shuffleNeeded && shuffleCooldown === 0 && shuffleFunction ? 'bg-red-600 hover:bg-red-700 border-red-500 animate-pulse text-white' : 
              shuffleCooldown > 0 || !shuffleFunction ? 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-50 text-gray-300' : 
              'bg-nav border-gray-700 hover:bg-gray-600 text-primary'
            }`}
            whileTap={shuffleCooldown === 0 && shuffleFunction ? { scale: 0.95 } : {}}
          >
            <Shuffle className={`w-6 h-6 ${shuffleNeeded && shuffleCooldown === 0 && shuffleFunction ? 'text-white' : shuffleCooldown > 0 || !shuffleFunction ? 'text-gray-400' : 'text-accent'}`} />
            <span className="font-bold">
              {!shuffleFunction ? 'Loading...' : shuffleCooldown > 0 ? `Shuffle (${shuffleCooldown}s)` : shuffleNeeded ? 'Shuffle Now!' : 'Shuffle'}
            </span>
            {shuffleCount > 0 && shuffleCooldown === 0 && shuffleFunction && (
              <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 ml-2">{shuffleCount}</span>
            )}
          </motion.button>
        </motion.div>
      )}

      {gameStarted && !isGameOver && inventoryError && (
        <motion.div className="flex items-center justify-center p-3 bg-red-600/20 rounded-xl border border-red-500" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-red-300">{inventoryError}</p>
        </motion.div>
      )}

      {gameStarted && !isGameOver && !inventoryError && availableItems.length > 0 && (
        <motion.div className="flex items-center justify-center space-x-4 p-3 bg-nav rounded-xl border border-gray-700 mx-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
          {availableItems.filter(item => [1, 3, 4].includes(item.item_id)).map((item) => {
            const details = getItemDetails(item.item_id);
            const ItemIcon = details.icon;
            return (
              <motion.button
                key={item.item_id}
                onClick={() => { if (item.item_id === 1 || item.item_id === 4) handleUseItem(item.item_id); }}
                onPointerDown={(e) => { if (item.item_id === 3) startDraggingBomb(e); }}
                disabled={isActivatingItem === item.item_id}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 relative ${
                  item.item_id === 1 || item.item_id === 4 ? 'bg-blue-600/20 border-blue-500 hover:bg-blue-600/30 cursor-pointer' :
                  item.item_id === 3 ? 'bg-red-600/20 border-red-500 hover:bg-red-600/30 cursor-grab' :
                  'bg-gray-600/20 border-gray-600 opacity-50'
                } ${isActivatingItem === item.item_id ? 'opacity-50 cursor-wait' : ''}`}
                whileTap={item.item_id === 1 || item.item_id === 4 ? { scale: 0.95 } : {}}
                style={{ touchAction: 'none' }}
              >
                {isActivatingItem === item.item_id ? (
                  <LoaderCircle className="w-6 h-6 mb-1 animate-spin text-accent" />
                ) : (
                  <ItemIcon className={`w-6 h-6 mb-1 ${details.color}`} />
                )}
                <span className="text-xs text-primary font-medium">{item.quantity}</span>
                <div className="absolute -top-2 -right-2 text-xs">
                  {item.item_id === 1 && '⏰'}
                  {item.item_id === 3 && '💥'}
                  {item.item_id === 4 && '2️⃣'}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {gameStarted && !isGameOver && !inventoryError && availableItems.length === 0 && (
        <motion.div className="flex items-center justify-center p-3 bg-nav rounded-xl border border-gray-700" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-secondary">No items available. Visit the Shop!</p>
        </motion.div>
      )}
    </div>
  );
};

export default GamePage;

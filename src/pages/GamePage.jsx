import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, Clock, LoaderCircle, Play, RotateCcw, Bomb, ChevronsUp } from 'lucide-react';
import { motion } from 'framer-motion';

// Get the backend URL from the environment variables
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
  const navigate = useNavigate();

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

  // Handle game over submission
  useEffect(() => {
    if (!isGameOver || isSubmitting) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      
      if (score > 0) {
        const tg = window.Telegram?.WebApp;
        
        if (tg && tg.initData && BACKEND_URL) {
          try {
            console.log('Submitting score:', score);
            
            const response = await fetch(`${BACKEND_URL}/api/update-score`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tg.initData, score: score }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              console.log('Score submitted successfully:', data);
              
              const multiplierText = activeBoosts.pointMultiplier ? '\n🔥 Double Points Applied!' : '';
              const finalScore = data.score_awarded || score;
              
              // Show success popup
              tg.showPopup({
                title: 'Game Over!',
                message: `🎉 You scored ${finalScore.toLocaleString()} points!${multiplierText}\n\nTotal points: ${data.new_points?.toLocaleString() || 'Unknown'}`,
                buttons: [
                  { text: 'Play Again', type: 'default', id: 'play_again' },
                  { text: 'Home', type: 'default', id: 'home' }
                ]
              }, (buttonId) => {
                if (buttonId === 'play_again') {
                  restartGame();
                } else {
                  navigate('/');
                }
              });
            } else {
              throw new Error(data.error || 'Failed to submit score');
            }
          } catch (error) {
            console.error('Error submitting score:', error);
            
            tg.showPopup({
              title: 'Error',
              message: 'Could not save your score. Please try again later.',
              buttons: [{ text: 'OK', type: 'ok' }]
            }, () => navigate('/'));
          }
        } else {
          // Browser mode - just show score
          console.log(`Game Over! Final Score: ${score}`);
          setTimeout(() => {
            const message = `Game Over!\n\nFinal Score: ${score.toLocaleString()}${activeBoosts.pointMultiplier ? '\n🔥 Double Points Applied!' : ''}\n\nPlay again?`;
            if (confirm(message)) {
              restartGame();
            } else {
              navigate('/');
            }
          }, 1000);
        }
      } else {
        // No score to submit
        setTimeout(() => navigate('/'), 1500);
      }
      
      setIsSubmitting(false);
    };

    // Delay submission by 1 second to show final score
    const timeoutId = setTimeout(submitScore, 1000);
    return () => clearTimeout(timeoutId);
  }, [isGameOver, score, navigate, isSubmitting, activeBoosts.pointMultiplier]);

  // Disable Telegram swipes during game
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.disableVerticalSwipes();
      return () => tg.enableVerticalSwipes();
    }
  }, []);

  // Fetch game configuration and check for active boosters
  const fetchGameConfig = async () => {
    setIsLoadingConfig(true);
    const tg = window.Telegram?.WebApp;
    
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        // Browser mode - use defaults
        console.log('Browser mode: Using default game config');
        setGameConfig({ startTime: 30, startWithBomb: false });
        setActiveBoosts({ timeBoost: 0, bomb: false, pointMultiplier: false });
        return;
      }

      console.log('Fetching game configuration from backend...');

      // Get game session configuration (consumes time boosters and bombs)
      const sessionRes = await fetch(`${BACKEND_URL}/api/start-game-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      let sessionData = { startTime: 30, startWithBomb: false };
      
      if (sessionRes.ok) {
        sessionData = await sessionRes.json();
        console.log('Game session data:', sessionData);
      } else {
        console.error('Failed to fetch game session:', sessionRes.status);
      }
      
      setGameConfig(sessionData);
      
      // Calculate boosts applied
      const timeBoost = sessionData.startTime - 30;
      
      // Check for active point multiplier
      const shopRes = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      let pointMultiplier = false;
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        pointMultiplier = shopData.boosterActive || false;
        console.log('Point multiplier active:', pointMultiplier);
      }

      setActiveBoosts({
        timeBoost,
        bomb: sessionData.startWithBomb,
        pointMultiplier
      });

    } catch (error) {
      console.error('Error fetching game config:', error);
      setGameConfig({ startTime: 30, startWithBomb: false });
      setActiveBoosts({ timeBoost: 0, bomb: false, pointMultiplier: false });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const startGame = async () => {
    console.log('Starting game...');
    await fetchGameConfig();
    setGameStarted(true);
    setScore(0);
    setTimeLeft(gameConfig.startTime);
    setIsGameOver(false);
    setIsSubmitting(false);
  };

  const restartGame = async () => {
    console.log('Restarting game...');
    setGameStarted(false);
    setScore(0);
    setIsGameOver(false);
    setIsSubmitting(false);
    
    // Fetch new game config for restart
    await fetchGameConfig();
    setTimeLeft(gameConfig.startTime);
    
    // Start game after brief delay to allow component reset
    setTimeout(() => setGameStarted(true), 100);
  };

  const formatTime = (seconds) => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex flex-col h-full p-4 space-y-4 bg-background text-primary">
      
      {/* Game Over Overlay */}
      {isGameOver && (
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
            {activeBoosts.pointMultiplier && (
              <p className="text-sm text-green-400 mb-2">🔥 Double Points Applied!</p>
            )}
            
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2 text-secondary mt-4">
                <LoaderCircle className="w-6 h-6 animate-spin" />
                <span>Saving score...</span>
              </div>
            ) : (
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={restartGame}
                  className="flex-1 bg-accent text-background py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-accent/90 transition-colors"
                >
                  <RotateCcw size={20} />
                  <span>Play Again</span>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-nav border border-gray-700 text-primary py-3 px-4 rounded-xl font-bold hover:bg-gray-700 transition-colors"
                >
                  Home
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Pre-game Setup */}
      {!gameStarted && !isGameOver && (
        <motion.div 
          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
            <h2 className="text-3xl font-bold text-primary mb-4">Ready to Play?</h2>
            <div className="text-6xl mb-6">🍪</div>
            
            {isLoadingConfig ? (
              <div className="flex items-center justify-center space-x-2 text-secondary mb-6">
                <LoaderCircle className="w-6 h-6 animate-spin" />
                <span>Loading game configuration...</span>
              </div>
            ) : (
              <div className="bg-background/50 p-4 rounded-xl mb-6 border border-gray-700">
                <div className="flex items-center justify-center space-x-2 text-accent mb-2">
                  <Clock size={24} />
                  <span className="text-xl font-bold">{gameConfig.startTime} Seconds</span>
                </div>
                
                {/* Show active boosts */}
                <div className="space-y-2">
                  {activeBoosts.timeBoost > 0 && (
                    <div className="flex items-center justify-center space-x-2 text-blue-400">
                      <Clock size={16} />
                      <span className="text-sm">+{activeBoosts.timeBoost}s Time Boost!</span>
                    </div>
                  )}
                  {activeBoosts.bomb && (
                    <div className="flex items-center justify-center space-x-2 text-red-400">
                      <Bomb size={16} />
                      <span className="text-sm">Cookie Bomb Ready!</span>
                    </div>
                  )}
                  {activeBoosts.pointMultiplier && (
                    <div className="flex items-center justify-center space-x-2 text-green-400">
                      <ChevronsUp size={16} />
                      <span className="text-sm">Double Points Active!</span>
                    </div>
                  )}
                  
                  {!activeBoosts.timeBoost && !activeBoosts.bomb && !activeBoosts.pointMultiplier && (
                    <p className="text-sm text-secondary">No boosts active</p>
                  )}
                </div>
                
                <p className="text-sm text-secondary mt-2">Match 3 or more pieces to score points!</p>
              </div>
            )}
            
            <button
              onClick={startGame}
              disabled={isLoadingConfig}
              className={`w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center space-x-2 transition-colors ${
                isLoadingConfig 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-accent text-background hover:bg-accent/90'
              }`}
            >
              <Play size={24} />
              <span>{isLoadingConfig ? 'Loading...' : 'Start Game'}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Game Header */}
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700">
          <Star className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold text-primary">{score.toLocaleString()}</span>
          {activeBoosts.pointMultiplier && (
            <ChevronsUp className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        <div className={`flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700 ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
          <Clock className={`w-6 h-6 ${timeLeft <= 10 ? 'text-red-500' : 'text-accent'}`} />
          <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-primary'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </motion.div>

      {/* Game Board Container */}
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <GameBoard 
          setScore={setScore} 
          gameStarted={gameStarted}
          startWithBomb={gameConfig.startWithBomb}
          onGameEnd={() => setIsGameOver(true)}
        />
      </motion.div>
      
      {/* Instructions */}
      {gameStarted && !isGameOver && (
        <motion.div 
          className="text-center text-secondary max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-sm">
            Drag emojis to adjacent spots to create matches of 3 or more! 🍪✨
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default GamePage;

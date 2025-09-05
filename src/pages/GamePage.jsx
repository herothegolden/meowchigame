import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import GameBoard from '../components/game/GameBoard';
import { Star, Timer, LoaderCircle, ChevronsUp, Clock, Play } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const GamePage = () => {
  const [gameState, setGameState] = useState('ready'); // ready, playing, over
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [gameSettings, setGameSettings] = useState({ initialTime: 30, pointMultiplier: 1 });
  const [finalScore, setFinalScore] = useState(0);
  const gamePageRef = useRef(null);
  
  const tg = window.Telegram?.WebApp;

  // --- SAFER SWIPE PREVENTION ---
  // This now only activates when the game is being played and is scoped to this component.
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    const node = gamePageRef.current;

    if (gameState === 'playing' && node) {
      node.addEventListener('touchmove', handler, { passive: false });
      tg?.disableVerticalSwipes();
    }
    
    return () => {
      if (node) {
        node.removeEventListener('touchmove', handler);
      }
      // Always re-enable swipes when the component unmounts or the game ends.
      tg?.enableVerticalSwipes();
    }
  }, [gameState, tg]);

  // --- Timer Countdown Logic ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeRemaining <= 0) {
      setGameState('over');
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeRemaining]);
  
  // --- Game Over Logic: Submit Score ---
  useEffect(() => {
    if (gameState === 'over') {
      tg?.HapticFeedback.notificationOccurred('warning');
      const finalScoreValue = score * gameSettings.pointMultiplier;
      setFinalScore(finalScoreValue);

      const submitScore = async () => {
        try {
           await fetch(`${BACKEND_URL}/api/update-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData, score: finalScoreValue }),
          });
        } catch (err) {
          console.error("Failed to submit score:", err);
        }
      };
      
      if (tg?.initData) {
        submitScore();
      }
    }
  }, [gameState, score, gameSettings.pointMultiplier, tg]);


  // --- Start Game Logic ---
  const handleStartGame = useCallback(async () => {
    setGameState('loading');
    setScore(0);
    setFinalScore(0);
    
    try {
      if (!tg?.initData) {
        // Fallback for browser testing
        const mockSettings = { initialTime: 30, pointMultiplier: 1 };
        setGameSettings(mockSettings);
        setTimeRemaining(mockSettings.initialTime);
        setGameState('playing');
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });
      const settings = await res.json();
      if (!res.ok) throw new Error(settings.error || 'Failed to start game');
      
      setGameSettings(settings);
      setTimeRemaining(settings.initialTime);
      setGameState('playing');
      tg?.HapticFeedback.impactOccurred('heavy');

    } catch (err) {
      tg?.showPopup({ title: 'Error', message: err.message, buttons: [{ type: 'ok' }] });
      setGameState('ready');
    }
  }, [tg]);
  
  // --- UI Components ---

  const renderHeader = () => (
    <div className="flex justify-between w-full max-w-md">
      <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg text-lg">
        <Star className="w-6 h-6 text-accent" />
        <span className="font-bold w-20 text-right">{score.toLocaleString()}</span>
        {gameSettings.pointMultiplier > 1 && <ChevronsUp className="w-5 h-5 text-green-400" />}
      </div>
      <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg text-lg">
        <Timer className="w-6 h-6 text-secondary" />
        <span className="font-bold w-12 text-right">{timeRemaining}s</span>
        {gameSettings.initialTime > 30 && <Clock className="w-5 h-5 text-blue-400" />}
      </div>
    </div>
  );
  
  const renderContent = () => {
    switch(gameState) {
      case 'loading':
        return <LoaderCircle className="w-16 h-16 text-accent animate-spin" />;
      case 'playing':
        return <GameBoard setScore={setScore} isGameActive={true} />;
      case 'over':
        return (
          <div className="text-center bg-nav p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-accent mb-2">Time's Up!</h2>
            <p className="text-secondary mb-4">You scored</p>
            <p className="text-5xl font-bold mb-6">{finalScore.toLocaleString()}</p>
            <button onClick={handleStartGame} className="w-full bg-accent text-background font-bold py-3 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-105">
              Play Again
            </button>
          </div>
        );
      case 'ready':
      default:
        return (
           <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
            <button onClick={handleStartGame} className="bg-accent text-background font-bold py-4 px-8 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-105 shadow-lg">
              <Play className="w-7 h-7 mr-3" />
              Start Game
            </button>
          </div>
        );
    }
  };

  return (
    <div ref={gamePageRef} className="flex flex-col items-center justify-center h-full p-4 space-y-4 w-full">
      {gameState === 'playing' && renderHeader()}
      <div className="flex-grow flex items-center justify-center w-full">
        {renderContent()}
      </div>
       {gameState !== 'playing' && <div style={{height: '54px'}} /> /* Placeholder to keep layout consistent */}
    </div>
  );
};

export default GamePage;


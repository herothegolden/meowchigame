import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, Move, Clock, LoaderCircle, Play, RotateCcw } from 'lucide-react';

// Get the backend URL from the environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const GamePage = () => {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameMode, setGameMode] = useState('moves'); // 'moves' or 'time'
  const navigate = useNavigate();

  // Timer effect for time-based mode
  useEffect(() => {
    if (!gameStarted || gameMode !== 'time' || isGameOver) return;

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
  }, [gameStarted, gameMode, isGameOver]);

  // Game over effect for moves-based mode
  useEffect(() => {
    if (gameMode === 'moves' && moves <= 0 && gameStarted && !isGameOver) {
      setIsGameOver(true);
    }
  }, [moves, gameStarted, isGameOver, gameMode]);

  // Handle game over submission
  useEffect(() => {
    if (!isGameOver || isSubmitting) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      
      if (score > 0) {
        const tg = window.Telegram?.WebApp;
        
        if (tg && tg.initData) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/update-score`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tg.initData, score: score }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              console.log('Score submitted successfully:', data);
              
              // Show success popup
              tg.showPopup({
                title: 'Game Over!',
                message: `🎉 You scored ${score.toLocaleString()} points!\n\nTotal points: ${data.new_points?.toLocaleString() || 'Unknown'}`,
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
            if (confirm(`Game Over!\n\nFinal Score: ${score.toLocaleString()}\n\nPlay again?`)) {
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

    submitScore();
  }, [isGameOver, score, navigate, isSubmitting]);

  // Disable Telegram swipes during game
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.disableVerticalSwipes();
      return () => tg.enableVerticalSwipes();
    }
  }, []);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setMoves(gameMode === 'moves' ? 30 : 999);
    setTimeLeft(gameMode === 'time' ? 120 : 999);
    setIsGameOver(false);
    setIsSubmitting(false);
  };

  const restartGame = () => {
    setGameStarted(false);
    setScore(0);
    setMoves(gameMode === 'moves' ? 30 : 999);
    setTimeLeft(gameMode === 'time' ? 120 : 999);
    setIsGameOver(false);
    setIsSubmitting(false);
    
    // Start game after brief delay to allow component reset
    setTimeout(() => setGameStarted(true), 100);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full p-4 space-y-4 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      
      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Game Over!</h2>
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-purple-600 mb-2">
              {score.toLocaleString()} Points
            </p>
            
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2 text-gray-600 mt-4">
                <LoaderCircle className="w-6 h-6 animate-spin" />
                <span>Saving score...</span>
              </div>
            ) : (
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={restartGame}
                  className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-purple-700 transition-colors"
                >
                  <RotateCcw size={20} />
                  <span>Play Again</span>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-gray-700 transition-colors"
                >
                  Home
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-game Setup */}
      {!gameStarted && !isGameOver && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose Game Mode</h2>
            <div className="text-6xl mb-6">🍪</div>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setGameMode('moves')}
                className={`w-full p-4 rounded-xl font-bold transition-all ${
                  gameMode === 'moves' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Move size={20} />
                  <span>30 Moves</span>
                </div>
              </button>
              
              <button
                onClick={() => setGameMode('time')}
                className={`w-full p-4 rounded-xl font-bold transition-all ${
                  gameMode === 'time' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Clock size={20} />
                  <span>2 Minutes</span>
                </div>
              </button>
            </div>
            
            <button
              onClick={startGame}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors"
            >
              <Play size={24} />
              <span>Start Game</span>
            </button>
          </div>
        </div>
      )}

      {/* Game UI */}
      <div className="flex justify-between w-full max-w-md">
        <div className="flex items-center space-x-2 bg-white/90 p-3 rounded-xl shadow-lg">
          <Star className="w-6 h-6 text-yellow-500" />
          <span className="text-xl font-bold text-gray-800">{score.toLocaleString()}</span>
        </div>
        
        {gameMode === 'moves' ? (
          <div className="flex items-center space-x-2 bg-white/90 p-3 rounded-xl shadow-lg">
            <Move className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-gray-800">{moves}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 bg-white/90 p-3 rounded-xl shadow-lg">
            <Clock className="w-6 h-6 text-red-500" />
            <span className="text-xl font-bold text-gray-800">{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Game Board */}
      <GameBoard 
        setScore={setScore} 
        setMoves={setMoves}
        gameStarted={gameStarted}
      />
      
      {/* Instructions */}
      {gameStarted && (
        <div className="text-center text-white/80 max-w-md">
          <p className="text-sm">
            Tap two adjacent pieces to swap them and create matches of 3 or more! 🍪✨
          </p>
        </div>
      )}
    </div>
  );
};

export default GamePage;

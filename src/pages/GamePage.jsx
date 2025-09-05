import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, MoveRight, LoaderCircle } from 'lucide-react';

// Get the backend URL from the environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const GamePage = () => {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // This useEffect hook handles the game over logic
  useEffect(() => {
    if (moves <= 0 && !isGameOver) {
      setIsGameOver(true);
      setIsSubmitting(true);
      
      // Ensure we have a score to submit
      if (score > 0) {
        const tg = window.Telegram?.WebApp;
        if (tg && tg.initData) {
          fetch(`${BACKEND_URL}/api/update-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData, score: score }),
          })
          .then(res => res.json())
          .then(data => {
            console.log('Score submitted successfully:', data);
            // Show a confirmation pop-up from Telegram
            tg.showPopup({
              title: 'Game Over!',
              message: `You scored ${score} points! Your new total is ${data.newScore}.`,
              buttons: [{ text: 'OK', type: 'ok' }]
            }, () => navigate('/')); // Navigate home after popup is closed
          })
          .catch(err => {
            console.error('Error submitting score:', err);
            tg.showAlert('Could not save your score. Please try again later.');
          })
          .finally(() => setIsSubmitting(false));
        } else {
            console.log("Running in browser, score not submitted.");
            setIsSubmitting(false);
        }
      } else {
          // If score is 0, just navigate home
          navigate('/');
      }
    }
  }, [moves, score, isGameOver, navigate]);

  // This useEffect hook disables the pull-to-refresh gesture in Telegram
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.disableVerticalSwipes();
      return () => {
        window.Telegram.WebApp.enableVerticalSwipes();
      };
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-full p-4 space-y-4">
      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-10">
          <h2 className="text-4xl font-bold text-accent mb-4">Game Over</h2>
          {isSubmitting ? (
            <div className="flex items-center space-x-2 text-primary">
              <LoaderCircle className="w-8 h-8 animate-spin" />
              <span>Saving your score...</span>
            </div>
          ) : (
            <p className="text-secondary">Your score has been submitted!</p>
          )}
        </div>
      )}

      {/* Header for Score and Moves */}
      <div className="flex justify-between w-full max-w-md">
        <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg">
          <Star className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold">{score}</span>
        </div>
        <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg">
          <MoveRight className="w-6 h-6 text-secondary" />
          <span className="text-xl font-bold">{moves}</span>
        </div>
      </div>

      {/* The Game Board itself */}
      <GameBoard setScore={setScore} setMoves={setMoves} />
    </div>
  );
};

export default GamePage;

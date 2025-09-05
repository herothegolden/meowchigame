import React, { useState, useEffect } from 'react';
import { Star, Move } from 'lucide-react';
import GameBoard from '../components/game/GameBoard';

const GamePage = () => {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);

  // Disable vertical pull-to-refresh on this page
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.disableVerticalSwipes();
    }
    // Re-enable on component unmount (when user navigates away)
    return () => {
      if (tg) {
        tg.enableVerticalSwipes();
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
      {/* Top UI: Score and Moves */}
      <div className="flex justify-between w-full max-w-sm">
        <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg">
          <Star className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold">{score}</span>
        </div>
        <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg">
          <Move className="w-6 h-6 text-secondary" />
          <span className="text-xl font-bold">{moves}</span>
        </div>
      </div>
      
      {/* The Game Board */}
      <GameBoard setScore={setScore} setMoves={setMoves} />
    </div>
  );
};

export default GamePage;

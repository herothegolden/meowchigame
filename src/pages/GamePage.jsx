import React from 'react';
import GameBoard from '../components/game/GameBoard';
import { Star, Move } from 'lucide-react';

const GamePage = () => {
  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Game Header */}
      <div className="w-full max-w-md flex justify-around mb-4">
        <div className="flex items-center bg-nav p-2 rounded-lg">
          <Star className="text-accent mr-2" />
          <span className="text-xl font-bold">0</span>
        </div>
        <div className="flex items-center bg-nav p-2 rounded-lg">
          <Move className="text-accent mr-2" />
          <span className="text-xl font-bold">30</span>
        </div>
      </div>

      {/* Game Board */}
      <GameBoard />
      
    </div>
  );
};

export default GamePage;

import React, { useEffect } from 'react';
import GameBoard from '../components/game/GameBoard';
import { Star, MoveRight } from 'lucide-react';

const GamePage = () => {

  // This useEffect hook is the key to disabling the pull-down gesture.
  useEffect(() => {
    // We check to make sure we are running inside Telegram.
    if (window.Telegram && window.Telegram.WebApp) {
      // This function disables the vertical swipe gesture.
      window.Telegram.WebApp.disableVerticalSwipes();

      // The return function in useEffect is a "cleanup" function.
      // It runs when the user navigates away from this page.
      return () => {
        // We re-enable the gesture so other pages behave normally.
        window.Telegram.WebApp.enableVerticalSwipes();
      };
    }
  }, []); // The empty array ensures this runs only once when the page loads.

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
      {/* Header for Score and Moves */}
      <div className="flex justify-between w-full max-w-md">
        <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg">
          <Star className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold">0</span>
        </div>
        <div className="flex items-center space-x-2 bg-nav p-2 rounded-lg">
          <MoveRight className="w-6 h-6 text-secondary" />
          <span className="text-xl font-bold">30</span>
        </div>
      </div>

      {/* The Game Board itself */}
      <GameBoard />
    </div>
  );
};

export default GamePage;


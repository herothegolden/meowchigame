// src/GameView.jsx

import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';

// --- Game Configuration ---
const ROWS = 8;
const COLS = 8;
const GEM_SIZE = 75; // The size of each gem image in pixels
const NUM_GEM_TYPES = 6; // The number of different gem images (gem1.png, gem2.png, etc.)

const GameView = () => {
  const pixiContainer = useRef(null);
  const appRef = useRef(null); // Use a ref to hold the Pixi app instance

  useEffect(() => {
    // This function runs only once when the component mounts
    const initPixi = async () => {
      // Create a new Pixi Application
      const app = new PIXI.Application({
        width: COLS * GEM_SIZE,
        height: ROWS * GEM_SIZE,
        backgroundColor: 0x1a1a1a, // A dark gray background
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app; // Store the app instance
      pixiContainer.current.appendChild(app.view);

      // --- Asset Loading ---
      const textures = [];
      for (let i = 1; i <= NUM_GEM_TYPES; i++) {
        // This creates the path to your images in the public/assets folder
        const texture = await PIXI.Assets.load(`/assets/gem${i}.png`);
        textures.push(texture);
      }

      // --- Game Board Creation ---
      const gameBoard = [];
      for (let row = 0; row < ROWS; row++) {
        const newRow = [];
        for (let col = 0; col < COLS; col++) {
          // Pick a random gem type for this cell
          const randomType = Math.floor(Math.random() * textures.length);
          const gemSprite = new PIXI.Sprite(textures[randomType]);

          // Position the gem in the grid
          gemSprite.x = col * GEM_SIZE;
          gemSprite.y = row * GEM_SIZE;
          gemSprite.width = GEM_SIZE;
          gemSprite.height = GEM_SIZE;

          // Add the gem to the stage to make it visible
          app.stage.addChild(gemSprite);
          newRow.push(gemSprite);
        }
        gameBoard.push(newRow);
      }
    };

    initPixi();

    // Clean up function that runs when the component unmounts
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true); // Destroy the app and remove its canvas
      }
    };
  }, []); // The empty array ensures this effect runs only once

  return <div ref={pixiContainer} />;
};

export default GameView;
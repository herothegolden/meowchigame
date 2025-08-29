// src/GameView.jsx

import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';

const GameView = () => {
  // This ref will hold a reference to the container div for our PixiJS app
  const pixiContainer = useRef(null);

  useEffect(() => {
    // Create a new Pixi Application
    const app = new PIXI.Application({
      width: window.innerWidth, // Use the full window width
      height: window.innerHeight, // Use the full window height
      backgroundColor: 0x1a1a1a, // A dark gray background
      resolution: window.devicePixelRatio || 1, // Adjust for high-resolution screens
      autoDensity: true,
    });

    // Append the PixiJS canvas to our container div
    pixiContainer.current.appendChild(app.view);

    // --- Start of PixiJS specific code ---

    // Create a bunny sprite from a URL
    const bunny = PIXI.Sprite.from('https://pixijs.com/assets/bunny.png');

    // Center the sprite's anchor point
    bunny.anchor.set(0.5);

    // Move the sprite to the center of the screen
    bunny.x = app.screen.width / 2;
    bunny.y = app.screen.height / 2;

    // Add the bunny to the stage to make it visible
    app.stage.addChild(bunny);

    // Add a "ticker" function to animate the sprite on every frame
    app.ticker.add((delta) => {
      // Rotate the bunny
      bunny.rotation += 0.01 * delta;
    });

    // --- End of PixiJS specific code ---

    // Clean up function that runs when the component unmounts
    return () => {
      app.destroy(true); // Destroy the app and remove its canvas
    };
  }, []); // The empty array ensures this effect runs only once

  // Render the container div that our PixiJS app will live in
  return <div ref={pixiContainer} />;
};

export default GameView;
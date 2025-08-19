// src/App.jsx
import React, { useState } from "react";
import GameView from "./components/GameView";

function App() {
  const [inGame, setInGame] = useState(false);
  const [coins, setCoins] = useState(0);
  const [settings, setSettings] = useState({ sound: true, difficulty: "normal" });

  return (
    <div className="app">
      {!inGame ? (
        <div className="menu">
          <h1 className="title">Meowchi Match-3</h1>
          <button className="btn" onClick={() => setInGame(true)}>Play</button>
          <div className="stats">
            <p>Coins: {coins}</p>
          </div>
        </div>
      ) : (
        <GameView
          onExit={() => setInGame(false)}
          onCoins={(c) => setCoins((prev) => prev + c)}
          settings={settings}
        />
      )}
    </div>
  );
}

export default App;

import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  useEffect(() => {
    const setVH = () => {
      const tg = getTG();
      const height = tg?.viewportStableHeight || window.innerHeight;
      const vh = height / 100;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready();
      tg?.expand();
      tg?.disableVerticalSwipes?.();
    } catch {}
  }, []);

  const [screen, setScreen] = useState("home");
  const [screenHistory, setScreenHistory] = useState(["home"]);
  const [coins, setCoins] = useState(150);
  const [lastRun, setLastRun] = useState(null);
  const [settings, setSettings] = useState({
    haptics: true,
    sound: false,
    theme: "system",
  });
  const [daily, setDaily] = useState({ streak: 0, lastClaim: null });
  const [lbScope, setLbScope] = useState("daily");
  const leaders = {
    daily: [["mira", 220], ["zeno", 180], ["kira", 150]],
    weekly: [["mira", 820], ["kira", 760], ["alex", 700]],
    all: [["neo", 4120], ["mira", 3880], ["alex", 3550]],
  };

  const navigateTo = (s) => {
    setScreenHistory((p) => [...p, s]);
    setScreen(s);
  };
  const goBack = () => {
    if (screenHistory.length > 1) {
      const h = [...screenHistory];
      h.pop();
      setScreenHistory(h);
      setScreen(h[h.length - 1]);
    } else {
      setScreen("home");
      setScreenHistory(["home"]);
    }
  };
  const goHome = () => {
    setScreen("home");
    setScreenHistory(["home"]);
  };

  function Header() {
    const backable = screenHistory.length > 1;
    return (
      <header className="header">
        <div className="header-line1">
          <div className="brand-compact">
            <div className="logo">😺</div>
            <div className="name">Meowchi</div>
          </div>
          <div className="pill-compact ellipsis">Sweet Match • Telegram</div>
        </div>
        <div className="header-line2">
          <div className="row" style={{ gap: 8 }}>
            {backable ? (
              <button className="btn" onClick={goBack}>Back</button>
            ) : (
              <button className="btn" onClick={goHome}>Home</button>
            )}
          </div>
          <div className="pill">${coins} $Meow</div>
        </div>
      </header>
    );
  }

  return (
    <>
      <Splash show={true} />

      <div className="shell">
        {/* ✅ Hide Header on Home (so no old dark strip) */}
        {screen !== "home" && <Header />}

        <main className="content">
          {screen === "home" && (
            <Home coins={coins} onNavigate={navigateTo} />
          )}

          {screen === "shop" && <Shop />}
          {screen === "leaderboard" && <Leaderboard />}
          {screen === "daily" && <Daily />}
          {screen === "invite" && <Invite />}
          {screen === "settings" && <Settings />}

          {screen === "game" && (
            <GameView
              onExit={(run) => {
                setLastRun(run);
                setCoins((c) => c + (run?.coins || 0));
                setScreen("gameover");
                setScreenHistory((h) => [...h, "gameover"]);
              }}
              onCoins={(d) => setCoins((c) => c + d)}
              settings={settings}
            />
          )}

          {screen === "gameover" && lastRun && (
            <section className="section">
              <div className="title">🍬 Sweet Level Complete!</div>
              <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
              <div className="row"><div className="muted">$Meow earned</div><b>{lastRun.coins}</b></div>
              <button className="btn primary" onClick={() => setScreen("game")}>
                🍭 Play More Meowchi
              </button>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";

// Small helpers for Telegram WebApp viewport quirks
const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  // stable viewport units for mobile webview
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

  // Telegram init (safe no-op outside Telegram)
  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready();
      tg?.expand();
      tg?.disableVerticalSwipes?.();
    } catch {}
  }, []);

  // splash (optional—but keeps layout from flashing)
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 600);
    return () => clearTimeout(t);
  }, []);

  // ------------ App state (routing kept as before) ------------
  const [screen, setScreen] = useState("home");
  const [screenHistory, setScreenHistory] = useState(["home"]);
  const [coins, setCoins] = useState(500);
  const [lastRun, setLastRun] = useState(null);
  const [settings, setSettings] = useState({ haptics: true, sounds: false });
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

  // ------------ Small inline screens (UI only) ------------
  function Header() {
    const isHome = screen === "home";
    return (
      <header className="header">
        {!isHome && (
          <div className="header-line1">
            <button className="btn" onClick={goBack}>← Back</button>
            <button className="btn" onClick={goHome}>🏠 Home</button>
          </div>
        )}
        <div className="header-line2">
          <div className="brand-compact">
            <span className="logo">🐱</span>
            <div className="name">Meowchi</div>
            <span className="pill-compact">{screen.toUpperCase()}</span>
          </div>
          <div className="score-info">
            {screen === "game" && (
              <div className="score-item">
                Score: {typeof window !== "undefined" ? (window.currentGameScore || 0) : 0}
              </div>
            )}
            <div className="score-item">$Meow {coins}</div>
          </div>
        </div>
      </header>
    );
  }

  function Shop() {
    const items = [
      { key: "hint", name: "Candy Hint", desc: "Highlight a sweet swap", price: 20, icon: "💡" },
      { key: "shuffle", name: "Sugar Shuffle", desc: "Mix up the candy board", price: 40, icon: "🔄" },
      { key: "hammer", name: "Candy Crusher", desc: "Smash any candy", price: 60, icon: "🔨" },
      { key: "bomb", name: "Candy Bomb", desc: "Explode 3×3 area", price: 80, icon: "💥" },
    ];
    return (
      <section className="section">
        <div className="title" style={{ marginBottom: 10 }}>🛍 Meowchi Shop</div>
        <div className="list grid-gap">
          {items.map((it) => (
            <div key={it.key} className="row">
              <div>
                <div style={{ fontWeight: 600 }}>{it.icon} {it.name}</div>
                <div className="muted small">{it.desc}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="muted small">{it.price} $Meow</div>
                <button
                  className="btn"
                  onClick={() => setCoins((c) => Math.max(0, c - it.price))}
                  disabled={coins < it.price}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Leaderboard() {
    const scopes = [["daily", "Daily"], ["weekly", "Weekly"], ["all", "All-time"]];
    const rows = leaders[lbScope] || [];
    return (
      <section className="section">
        <div className="row">
          <div className="title">🏆 Sweet Leaderboard</div>
          <div className="tabs">
            {scopes.map(([k, label]) => (
              <button
                key={k}
                className={`tab ${lbScope === k ? "active" : ""}`}
                onClick={() => setLbScope(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="list grid-gap-6">
          {rows.map(([u, s], i) => (
            <div key={u} className="row">
              <div className="row" style={{ gap: 8 }}>
                <span className="muted small" style={{ width: 20, textAlign: "right" }}>{i + 1}.</span>
                <b>{u}</b>
              </div>
              <b>{s}</b>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Daily() {
    const today = new Date().toISOString().slice(0, 10);
    const canClaim = daily.lastClaim !== today;
    function claim() {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setDaily((d) => ({ streak: d.lastClaim === yesterday ? d.streak + 1 : 1, lastClaim: today }));
      setCoins((c) => c + 50);
    }
    return (
      <section className="section">
        <div className="title">🍯 Daily Sweet Treats</div>
        <div className="muted">Streak: <b>{daily.streak}</b> {daily.lastClaim ? `• last: ${daily.lastClaim}` : ""}</div>
        <button className="btn primary" onClick={claim} disabled={!canClaim}>
          {canClaim ? "Claim 50 $Meow" : "Come back tomorrow"}
        </button>
        <div className="muted small">Keep your sweet streak alive! Resets if you miss a day.</div>
      </section>
    );
  }

  function Invite() {
    const link = "https://t.me/meowchi_game_bot?start=sweet";
    const [copied, setCopied] = useState(false);
    async function copy() {
      try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1000); } catch {}
    }
    return (
      <section className="section">
        <div className="title">🍭 Share the Sweetness</div>
        <div className="muted small">
          Invite friends! When your friend finishes their first level, you both get 200 $Meow.
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="pill ellipsis">{link}</div>
          <button className="btn" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      </section>
    );
  }

  function Settings() {
    return (
      <section className="section">
        <div className="title">Settings</div>
        <label className="row">
          <div>Haptics</div>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => setSettings((s) => ({ ...s, haptics: e.target.checked }))}
          />
        </label>
        <label className="row">
          <div>Sounds (preview only)</div>
          <input
            type="checkbox"
            checked={settings.sounds}
            onChange={(e) => setSettings((s) => ({ ...s, sounds: e.target.checked }))}
          />
        </label>
      </section>
    );
  }

  return (
    <>
      {showSplash && (
        <div className="splash" role="status" aria-live="polite">
          <div className="splash-min">
            <div className="loader-ring" />
            <div className="splash-text">Loading sweet meowchi…</div>
          </div>
        </div>
      )}

      <div className="shell" style={{ visibility: showSplash ? "hidden" : "visible" }}>
        <Header />
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

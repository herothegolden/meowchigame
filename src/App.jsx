import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  // Stable viewport for Telegram webview
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

  // Splash: show for at least 2.4s AND until window 'load'
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const minDelay = new Promise((r) => setTimeout(r, 2400));
    const pageReady =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener("load", r, { once: true }));
    Promise.all([minDelay, pageReady]).then(() => setShowSplash(false));
  }, []);

  // ------------ App state / routing ------------
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

  // ------------ Minimal header (Issue 3: remove top nav row) ------------
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

        {/* No more Home/Shop/Leaderboard/Daily/Invite/Settings buttons */}
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

  // Optional inline pages (unchanged)
  function Leaderboard() {
    const scopes = ["daily", "weekly", "all"];
    return (
      <section className="section">
        <div className="title">🏆 Leaderboard</div>
        <div className="tabs">
          {scopes.map((s) => (
            <div
              key={s}
              className={`tab ${lbScope === s ? "active" : ""}`}
              onClick={() => setLbScope(s)}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="list grid-gap" style={{ marginTop: 10 }}>
          {leaders[lbScope].map(([name, sc]) => (
            <div key={name} className="row">
              <div className="ellipsis">{name}</div>
              <b>{sc}</b>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Shop() {
    const items = [
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

  function Settings() {
    return (
      <section className="section">
        <div className="title">⚙️ Settings</div>
        <label className="row">
          <div>Haptics</div>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => setSettings((s) => ({ ...s, haptics: e.target.checked }))}
          />
        </label>
        <label className="row">
          <div>Sound</div>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => setSettings((s) => ({ ...s, sound: e.target.checked }))}
          />
        </label>
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
        <div className="muted small">Invite friends and earn $Meow.</div>
        <div className="row" style={{ gap: 8 }}>
          <div className="pill ellipsis" style={{ maxWidth: 260 }}>{link}</div>
          <button className="btn" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      </section>
    );
  }

  // ------------ Render ------------
  return (
    <>
      <Splash show={showSplash} text="Loading sweet meowchi…" />

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

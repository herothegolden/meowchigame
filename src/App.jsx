// src/App.jsx
import React, { useEffect, useState, useMemo } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import EnhancedProfileModal from "./EnhancedProfileModal.jsx";
import * as audio from "./audio";
import { addPlatformClass } from "./platform";

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  // Add html.ios/html.android classes for tiny CSS tweaks if needed
  useEffect(() => { addPlatformClass(); }, []);

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
      tg?.ready?.();
      tg?.expand?.();
      tg?.disableVerticalSwipes?.();
    } catch {}
  }, []);

  // Splash: small delay or until window 'load'
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const minDelay = new Promise((r) => setTimeout(r, 900));
    const pageReady =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener("load", r, { once: true }));
    Promise.all([minDelay, pageReady]).then(() => setShowSplash(false));
  }, []);

  // ------------ App state / routing ------------
  const [screen, setScreen] = useState("home"); // 'home' | 'game' | 'leaderboard'
  const [coins, setCoins] = useState(0);
  const [lastRun, setLastRun] = useState(null);
  const [settings, setSettings] = useState({ haptics: true, sound: true });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Telegram user
  const tg = getTG();
  const userTelegramId = tg?.initDataUnsafe?.user?.id || null;
  const telegramUsername = tg?.initDataUnsafe?.user?.username || null;

  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);

  // Register user & fetch stats
  useEffect(() => {
    async function register() {
      if (!userTelegramId) return;
      try {
        await fetch("/api/user/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegram_id: userTelegramId,
            telegram_username: telegramUsername || null,
          }),
        });
        await refreshStats();
      } catch (e) {
        console.warn("register failed", e);
      }
    }
    register();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTelegramId]);

  async function refreshStats() {
    if (!userTelegramId) return;
    try {
      const r = await fetch(`/api/user/${userTelegramId}/stats`);
      const j = await r.json();
      if (j?.stats) {
        setUserStats(j.stats);
        setCoins(Number(j.stats.total_coins_earned || 0));
        setUserProfile({
          display_name: j.stats.display_name,
          country_flag: j.stats.country_flag,
          profile_completed: j.stats.profile_completed,
        });
      }
    } catch (e) {
      console.warn("stats fetch failed", e);
    }
  }

  // ------------ Audio (preload on Play) ------------
  const [audioReady, setAudioReady] = useState(false);
  async function ensureAudio() {
    if (audioReady || !settings?.sound) return;
    try {
      await audio.unlock();
      await audio.preload({
        swap: "/sfx/swap.wav",
        swap_invalid: "/sfx/swap_invalid.wav",
        match_pop: "/sfx/match_pop.wav",
        cascade_tick: "/sfx/cascade_tick.wav",
        coin: "/sfx/coin.wav",
        combo_x1: "/sfx/combo_x1.wav",
        combo_x2: "/sfx/combo_x2.wav",
        combo_x3: "/sfx/combo_x3.wav",
        combo_x4: "/sfx/combo_x4.wav",
        powerup_spawn: "/sfx/powerup_spawn.wav",
        finish_win: "/sfx/finish_win.wav",
        finish_lose: "/sfx/finish_lose.wav",
        timer_tick: "/sfx/timer_tick.wav",
        timer_hurry: "/sfx/timer_hurry.wav",
      });
      setAudioReady(true);
    } catch (e) {
      console.warn("audio preload failed (non-fatal)", e);
    }
  }

  async function navigate(to) {
    if (to === "game") await ensureAudio(); // unlock+preload in a user gesture
    setScreen(to);
  }

  function handleProfileSaved(updated) {
    setUserProfile((p) => ({ ...(p || {}), ...updated }));
    setShowProfileModal(false);
    refreshStats();
  }

  async function handleExitGame(result) {
    setLastRun(result);
    await refreshStats(); // sync server-minted coins
    setScreen("home");
  }

  const displayName = useMemo(
    () => userProfile?.display_name || (telegramUsername ? `@${telegramUsername}` : "Player"),
    [userProfile, telegramUsername]
  );

  return (
    <>
      <Splash show={showSplash} />

      <div className="container" style={{ visibility: showSplash ? "hidden" : "visible" }}>
        {/* Header uses your existing CSS classes */}
        <div className="header">
          <div className="logo">MEOWCHI</div>
          <div className="wallet"><span className="muted">$Meow</span> <b>{coins}</b></div>
        </div>

        {screen === "home" && (
          <Home
            coins={coins}
            userStats={userStats}
            userProfile={userProfile}
            onProfileUpdate={handleProfileSaved}
            onOpenProfileModal={() => setShowProfileModal(true)}
            onNavigate={navigate}
          />
        )}

        {screen === "leaderboard" && (
          <Leaderboard onBack={() => setScreen("home")} userTelegramId={userTelegramId} />
        )}

        {screen === "game" && (
          <GameView
            onExit={handleExitGame}
            onCoins={(d) => setCoins((c) => c + d)}
            settings={settings}
            userTelegramId={userTelegramId}
          />
        )}

        {/* Bottom nav – reuses your styles */}
        <div className="bottom-nav">
          <button className={`tab ${screen === "home" ? "active" : ""}`} onClick={() => navigate("home")}>Home</button>
          <button className={`tab ${screen === "game" ? "active" : ""}`} onClick={() => navigate("game")}>Play</button>
          <button className={`tab ${screen === "leaderboard" ? "active" : ""}`} onClick={() => navigate("leaderboard")}>Leaderboard</button>
        </div>
      </div>

      <EnhancedProfileModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleProfileSaved}
        userTelegramId={userTelegramId}
        currentProfile={userProfile}
      />
    </>
  );
}

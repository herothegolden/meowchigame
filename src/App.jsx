:root {
  --line: #243069;
  --vh: 1vh;
  --ui-scale: clamp(1.05, 100vw / 390, 1.35); /* scale up on phones */
}

html, body, #root {
  height: 100%;
}

html, body {
  overscroll-behavior: none; /* stop pull-to-refresh/scroll chaining */
}

body {
  margin: 0;
  background: #0a0f23;
  color: #fff;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  font-size: calc(16px * var(--ui-scale));
}

/* Shell */
.shell {
  height: calc(var(--vh, 1vh) * 100);
  display: grid;
  grid-template-rows: auto 1fr;
  width: 100%;
  max-width: 100vw;
  overflow: hidden;
}

.header {
  background: #0f1430;
  border-bottom: 1px solid rgba(122,162,255,.15);
  position: sticky;
  top: 0;
  z-index: 5;
  flex-shrink: 0;
  padding: 6px 12px;
}

.header-line1 { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 4px; }
.header-line2 { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 32px; }
.brand-compact { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.brand-compact .logo { font-size: 18px; flex-shrink: 0; }
.brand-compact .name { font-weight: 700; font-size: calc(14px * var(--ui-scale)); letter-spacing: .1px; white-space: nowrap; }
.pill-compact { padding: 1px 6px; border-radius: 999px; border: 1px solid rgba(122,162,255,.25); background: #0f1533; font-size: calc(10px * var(--ui-scale)); flex-shrink: 0; }

.score-info { display: flex; align-items: center; gap: 12px; font-size: calc(14px * var(--ui-scale)); }
.score-item { white-space: nowrap; font-weight: 600; }

.content {
  height: 100%;
  width: 100%;
  max-width: 100vw;
  padding: 8px 12px 12px 12px;
  display: grid;
  align-content: start;
  gap: 8px;
  overflow: auto;
  box-sizing: border-box;
}

.section {
  background: #0f1430;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 10px 28px rgba(0,0,0,.15);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.title { font-weight: 800; font-size: calc(18px * var(--ui-scale)); }
.muted { opacity: .72; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.grid { display: grid; gap: 10px; }

.btn {
  background: #12183a;
  border: 1px solid #1c244e;
  border-radius: calc(14px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(12px * var(--ui-scale));
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  touch-action: manipulation;
  font-size: calc(14px * var(--ui-scale));
  font-weight: 600;
}
.btn:hover { background: #1a2260; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: #132049; border-color: #1f2a5c; font-weight: 700; }
.btn.primary:hover { background: #1a2768; }
.btn.block { width: 100%; }

.list > * {
  background: #12183a; border: 1px solid #1c244e; border-radius: 14px;
  padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab { padding: 8px 10px; border-radius: 999px; border: 1px solid var(--line); background: #12183a; cursor: pointer; font-size: 12px; }
.tab:hover { background: #1a2260; }
.tab.active { background: #132049; border-color: #1f2a5c; font-weight: 700; }

/* Board */
.board-wrap { display: grid; gap: 8px; }
.board {
  position: relative; background: #0f1533; border-radius: 16px;
  outline: 1px solid var(--line);
  box-shadow: 0 8px 28px rgba(0,0,0,.35);
  margin: 0 auto;
  touch-action: none;            /* JS owns gestures */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.gridlines { position: absolute; inset: 0; opacity: .15; pointer-events: none; }

.tile {
  position: absolute; display: flex; align-items: center; justify-content: center;
  border-radius: 16px; background: linear-gradient(135deg, #1a2260 0%, #151b46 100%);
  outline: 1px solid #26307a;
  transition: transform .3s ease, opacity .4s ease, background .2s ease, box-shadow .3s ease;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2);
  touch-action: none;
  user-select: none;
}
.tile:hover {
  background: linear-gradient(135deg, #2a3270 0%, #1f2556 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
}
.tile.sel {
  background: linear-gradient(135deg, #3a4280 0%, #2f3566 100%);
  outline-color: #4a58b4;
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(74, 88, 180, 0.4);
}
.tile.hint {
  box-shadow: 0 0 0 3px #7aa2ff inset, 0 0 20px rgba(122,162,255,.6);
  animation: pulse-hint 2s ease-in-out infinite;
}
@keyframes pulse-hint {
  0%, 100% { box-shadow: 0 0 0 3px #7aa2ff inset, 0 0 20px rgba(122,162,255,.6); }
  50% { box-shadow: 0 0 0 3px #ffd166 inset, 0 0 25px rgba(255,209,102,.8); }
}
.tile.falling { animation: fall-in 0.6s ease-out; }
.tile.swapping { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 20; }
.tile.drop-in { animation: drop-from-above 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94); }

@keyframes fall-in { 0% { transform: translateY(-100px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes drop-from-above { 0% { transform: translateY(-400px); opacity: 0.7; } 100% { transform: translateY(0); opacity: 1; } }

.controls {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
}
.controls-size {
  grid-column: span 1;
  opacity: 0.7;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
}

.combo {
  position: absolute; left: 50%; transform: translateX(-50%); top: 4px;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px; padding: 3px 6px; font-size: 11px;
}

@keyframes poof {
  from { opacity: 1; transform: translate(var(--cx), var(--cy)) scale(1.2) rotate(0deg); }
  50%  { opacity: 1; transform: translate(calc(var(--cx) + (var(--tx) - var(--cx)) * 0.7), calc(var(--cy) + (var(--ty) - var(--cy)) * 0.7)) scale(1) rotate(180deg); }
  to   { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2) rotate(360deg); }
}
.spark { position: absolute; animation: poof ease-out forwards; pointer-events: none; z-index: 100; }

.pause-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
}

/* Splash */
.splash {
  position: fixed; inset: 0; z-index: 9999;
  display: grid; place-items: center; overflow: hidden;
  background: linear-gradient(135deg, #0a0f23 0%, #1a2260 50%, #243069 100%);
}
.splash-min { position: relative; display: grid; gap: 10px; place-items: center; text-align: center; }
.loader-ring {
  width: 56px; height: 56px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,.25);
  border-top-color: #ffffff;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.splash-text { font-size: 13px; font-weight: 600; letter-spacing: .2px; }

/* Responsive tweak */
@media (max-width: 480px) {
  .content { padding: 6px 10px 10px 10px; }
  .brand-compact .name { font-size: calc(13px * var(--ui-scale)); }
}

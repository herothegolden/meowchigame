# Meowchi Mini‑App — Golden Baseline

This is a production‑ready baseline for a Telegram Mini‑App (WebApp) using React + Vite.

## Highlights
- Telegram WebApp wrapper (`src/lib/telegram.js`) with `ready()`, `expand()`, viewport + theme handling, and helpers.
- Performance‑friendly hooks: `usePointer` (pointer capture, touch fixes), `useResizeCell` (grid sizing from viewport).
- Service layer: `services/api.js` (fetch with Telegram auth), `services/storage.js` (namespaced local storage).
- Simple screens: Splash → Home → Game → Leaderboard, all replaceable with your existing files.
- Railway deployment via `server.js` + `railway.toml`.

## Dev
```bash
npm i
npm run dev
```
Open the dev URL inside Telegram to get `window.Telegram.WebApp` or use the included script tag in `index.html`.

## Build & Run (Railway/Prod)
```bash
npm run build
npm start
```

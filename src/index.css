:root{
  --bg: #0b1020;
  --card: #111a32;
  --muted: #a8b0c2;
  --line: rgba(255,255,255,0.08);
  --text: #e8eeff;
  --accent: #667eea;
  --accent2:#764ba2;
}

*{box-sizing:border-box}
html,body,#root{height:100%}
body{
  margin:0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

/* app shell */
.shell{
  max-width: 520px;
  margin: 0 auto;
  min-height: calc(var(--vh,1vh)*100);
  display:flex;
  flex-direction:column;
  padding: 12px;
}

/* header */
.header{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.header-line1{display:flex;gap:8px}
.header-line2{display:flex;align-items:center;justify-content:space-between}
.brand-compact{display:flex;align-items:center;gap:8px}
.logo{font-size:20px}
.name{font-weight:800}
.pill-compact{font-size:11px;padding:4px 8px;border-radius:999px;background:#1b2647;color:#cfe0ff}

/* content area */
.content{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}

/* sections & lists */
.section{
  background:#0e1430;
  border:1px solid var(--line);
  border-radius:16px;
  padding:16px;
  box-shadow:0 10px 24px rgba(0,0,0,.25);
}
.title{font-weight:800;margin-bottom:8px}
.row{display:flex;align-items:center;justify-content:space-between}
.list{display:grid}
.grid-gap{gap:8px}
.grid-gap-6{gap:6px}
.muted{color:var(--muted)}
.small{font-size:12px}
.pill{
  background:#101a3a;border:1px solid var(--line);
  padding:8px 10px;border-radius:999px
}
.ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* buttons & tabs */
.btn{
  appearance:none;border:0;border-radius:12px;
  padding:10px 14px;font-weight:700;color:#fff;
  background:#293a7a;cursor:pointer
}
.btn.primary{background: linear-gradient(135deg, var(--accent), var(--accent2));}
.btn:disabled{opacity:.5;cursor:not-allowed}
.tabs{display:flex;gap:6px}
.tab{
  border:1px solid var(--line);background:#101735;color:#cfe0ff;
  padding:6px 10px;border-radius:999px;font-size:12px
}
.tab.active{background:#21306a}

/* splash */
.splash{
  position:fixed;inset:0;display:grid;place-items:center;background:var(--bg);z-index:999;
}
.splash-min{display:grid;gap:12px;place-items:center}
.loader-ring{
  width:34px;height:34px;border-radius:50%;
  border:3px solid rgba(255,255,255,.18);
  border-top-color:#fff;animation:spin 1s linear infinite
}
@keyframes spin{to{transform:rotate(360deg)}}
.splash-text{color:#cfe0ff;font-size:14px}

/* --- Board / GameView styles (match current GameView.jsx) --- */
.section.board-wrap{position:relative}
.board{
  position:relative;
  margin:10px auto 8px;
  background:#0a1130;
  border-radius:12px;
  border:1px solid var(--line);
  overflow:hidden;
}
.gridlines{
  position:absolute; inset:0;
  opacity:.16; pointer-events:none;
}
.tile{
  position:absolute; display:grid; place-items:center;
  user-select:none; touch-action:none;
  border-radius:10px;
  transition: transform .18s ease;
  background:#111a32;
  border:1px solid rgba(255,255,255,.06);
}
.tile.sel{outline:3px solid rgba(102,126,234,.6)}
.tile.hint{box-shadow:0 0 0 3px rgba(118,75,162,.6) inset}
.tile.drop-in{animation:drop .35s ease}
@keyframes drop{from{transform:translateY(-18px);opacity:.0}to{transform:translateY(0);opacity:1}}

.combo{
  position:absolute; left:50%; top:-10px; transform:translate(-50%,-50%);
  background:rgba(255,255,255,.1);
  border:1px solid var(--line);
  padding:6px 10px;border-radius:999px;font-weight:800;font-size:12px
}

.pause-overlay{
  position:absolute; inset:0; display:grid; place-items:center;
  background:rgba(0,0,0,.5); backdrop-filter:saturate(120%) blur(2px);
}

/* controls under board */
.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.controls .btn{padding:8px 12px}
.controls-size{opacity:.7;font-size:12px}

/* fancy spark particles used by Poof */
.spark{
  position:absolute; transform-origin:var(--cx) var(--cy);
  animation:fly var(--dur,1.1s) ease-out forwards;
}
@keyframes fly{
  from { transform: translate(0,0) scale(1); opacity:1 }
  to   { transform: translate(var(--tx), var(--ty)) scale(.75); opacity:0 }
}

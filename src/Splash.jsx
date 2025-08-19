import React from "react";

/**
 * Fullscreen splash that shows while the app boots.
 * Uses /splash.jpg from the public/ folder.
 */
export default function Splash({ show = true, text = "Loading…" }) {
  return (
    <div className={`splash ${show ? "show" : "hide"}`} role="status" aria-live="polite" aria-hidden={!show}>
      <div className="splash-min">
        <div className="loader-ring" />
        <div className="splash-text">{text}</div>
      </div>
    </div>
  );
}

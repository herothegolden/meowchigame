import React from "react";

/**
 * Fullscreen splash using /splash.jpg (public/).
 * Shows a "Meowchi" title with a progress bar.
 */
export default function Splash({ show = true, text = "Loading sweet meowchi…" }) {
  return (
    <div className={`splash ${show ? "show" : "hide"}`} role="status" aria-hidden={!show}>
      <div className="splash-box">
        <div className="splash-brand">Meowchi</div>
        <div className="splash-progress" aria-label="Loading">
          <div className="splash-progress__bar" />
        </div>
        <div className="splash-caption">{text}</div>
      </div>
    </div>
  );
}

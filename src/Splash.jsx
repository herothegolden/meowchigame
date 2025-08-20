import React, { useMemo } from "react";

/**
 * Fullscreen splash using /splash.jpg (public/).
 * - No dim overlay
 * - Progress bar only (no title)
 * - Fun rotating caption
 * - Bar is anchored under the word "MEOWCHI" (tweak with --bar-top)
 */
export default function Splash({ show = true }) {
  const phrase = useMemo(() => {
    const opts = ["Waking up cats…", "Chaos is loading…", "Sharpening claws…"];
    return opts[Math.floor(Math.random() * opts.length)];
  }, []);

  return (
    <div className={`splash ${show ? "show" : "hide"}`} role="status" aria-hidden={!show}>
      <div className="splash-bar-anchored">
        <div className="splash-progress" aria-label="Loading">
          <div className="splash-progress__bar" />
        </div>
        <div className="splash-caption">{phrase}</div>
      </div>
    </div>
  );
}

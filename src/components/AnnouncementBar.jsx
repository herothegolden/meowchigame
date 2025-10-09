// Path: src/components/AnnouncementBar.jsx
import React from "react";
import BetaNote from "./BetaNote";

/**
 * AnnouncementBar
 * A thin red stripe placed near the top of a page to show announcements.
 * By default, it centers <BetaNote /> inside. You can override content via children.
 *
 * - Static height to avoid CLS
 * - Not fixed/sticky; sits in normal flow below the Telegram header / page header
 * - Pointer-safe: normal pointer events; does not overlay game grid/HUD
 *
 * Props:
 *  - className?: string         // extra classes for outer wrapper
 *  - children?: React.ReactNode // optional custom content (defaults to <BetaNote />)
 *  - height?: number | string   // optional height (default 28px)
 *  - zIndex?: number            // z-index layer (default 50)
 */
export default function AnnouncementBar({
  className = "",
  children,
  height = 28, // px
  zIndex = 50,
}) {
  const style = {
    minHeight: typeof height === "number" ? `${height}px` : height,
    height: typeof height === "number" ? `${height}px` : height,
    zIndex,
  };

  return (
    <div
      role="region"
      aria-label="Announcements"
      className={`w-full bg-red-600 text-black flex items-center justify-center px-3 border-b border-red-700/60 shadow-[0_1px_0_0_rgba(0,0,0,0.15)] ${className}`}
      style={style}
    >
      {/* Centered content; default to BetaNote if no children provided */}
      <div className="flex items-center justify-center">
        {children ?? <BetaNote />}
      </div>
    </div>
  );
}

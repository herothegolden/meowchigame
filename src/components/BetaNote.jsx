// Path: src/components/BetaNote.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * BetaNote
 * Renders a compact "BETA" button with an adjacent ℹ️ trigger.
 * Tapping ℹ️ opens a centered, non-blocking popup with RU copy.
 *
 * Changes vs. initial version:
 * - Popover now renders via a PORTAL (fixed, centered overlay) to avoid clipping.
 * - BETA button uses standard TMA button radius (rounded-xl), not rounded-full.
 * - Safe-area padding applied; outside-tap/Esc/Back dismiss preserved.
 *
 * Props:
 *  - className?: string                    // optional outer className
 *  - zIndex?: number                       // overlay layer (default 120; below full-screen modals if any)
 *  - enableBackDismiss?: boolean           // push dummy history state so Back closes the popup (default true)
 */
export default function BetaNote({
  className = "",
  zIndex = 120,
  enableBackDismiss = true,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const pushedHistoryRef = useRef(false);

  const RU_MESSAGE =
    "Игра и её функции находятся в бета-режиме и сейчас тестируются. Однако все ваши очки и покупки корректно сохраняются — вы можете играть и получать скидки. Для подробностей: @meowchi_lab.";

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Back/Esc handling
  const onKey = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        if (enableBackDismiss && pushedHistoryRef.current) {
          try {
            window.history.back();
          } catch {}
          pushedHistoryRef.current = false;
        }
      }
    },
    [open, close, enableBackDismiss]
  );

  const onPopState = useCallback(() => {
    if (open) {
      close();
      pushedHistoryRef.current = false;
    }
  }, [open, close]);

  useEffect(() => {
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [onKey, onPopState]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && enableBackDismiss) {
        try {
          window.history.pushState({ betaNote: true }, "");
          pushedHistoryRef.current = true;
        } catch {
          pushedHistoryRef.current = false;
        }
      }
      if (!next && enableBackDismiss && pushedHistoryRef.current) {
        try {
          window.history.back();
        } catch {}
        pushedHistoryRef.current = false;
      }
      return next;
    });
  };

  // Overlay (portal target)
  const Overlay = open
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Информация о бета-режиме"
          className="fixed inset-0 z-[120] flex items-center justify-center"
          style={{
            zIndex,
            paddingTop:
              "env(safe-area-inset-top, 0px)",
            paddingRight:
              "env(safe-area-inset-right, 0px)",
            paddingBottom:
              "env(safe-area-inset-bottom, 0px)",
            paddingLeft:
              "env(safe-area-inset-left, 0px)",
          }}
          onClick={(e) => {
            // Clicks on the dim/empty space close the dialog
            // (allow clicks inside the card to NOT close it)
            if (e.target === e.currentTarget) {
              close();
              if (enableBackDismiss && pushedHistoryRef.current) {
                try {
                  window.history.back();
                } catch {}
                pushedHistoryRef.current = false;
              }
            }
          }}
        >
          {/* Centered popup card */}
          <div
            className="
              w-[min(92vw,360px)]
              rounded-xl border
              p-4 text-sm
              shadow-2xl
              backdrop-blur
              bg-white/95 text-gray-900 border-black/10
              dark:bg-neutral-900/95 dark:text-neutral-100 dark:border-white/10
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="whitespace-pre-wrap">{RU_MESSAGE}</div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={containerRef}
      className={`relative pointer-events-none ${className || ""}`}
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-1 pointer-events-auto select-none">
        {/* BETA button — unified to TMA standard radius */}
        <span
          className="
            inline-flex items-center justify-center
            px-3 py-1 text-[11px] font-semibold tracking-wide
            rounded-xl border border-black/10
            bg-amber-500 text-black
            shadow-sm
            dark:text-black
          "
          aria-label="BETA"
        >
          BETA
        </span>

        {/* Info trigger (emoji) */}
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open ? "true" : "false"}
          aria-label="Информация о бета-режиме"
          className="
            inline-flex items-center justify-center
            h-5 w-5 text-base leading-none
            rounded-md
            align-middle
            focus:outline-none focus:ring-2 focus:ring-amber-400/60
            active:scale-95 transition
            cursor-pointer
            bg-transparent
          "
          style={{ pointerEvents: "auto" }}
        >
          <span role="img" aria-hidden="true">
            ℹ️
          </span>
        </button>
      </div>

      {/* Centered overlay via portal */}
      {Overlay}
    </div>
  );
}

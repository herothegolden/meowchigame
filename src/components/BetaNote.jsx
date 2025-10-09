// Path: src/components/BetaNote.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * BetaNote
 * Renders a compact "BETA" pill with an adjacent ℹ️ trigger.
 * Tapping ℹ️ opens a lightweight, non-blocking popover with RU copy.
 *
 * - No external deps
 * - Absolute-positioned popover anchored to the trigger
 * - Dismiss: outside tap, Esc, (optional) Back button via history state
 * - Safe in Telegram WebApp (iOS/Android) and desktop browsers
 *
 * Props:
 *  - className?: string                    // optional outer className
 *  - placement?: "top-right" | "top-left"  // controls popover alignment
 *  - zIndex?: number                       // overlay layer (default 60)
 *  - enableBackDismiss?: boolean           // push a dummy history state on open to allow Back to dismiss (default true)
 *
 * Notes:
 * - Wrapper uses `pointer-events-none`; the pill/emoji and popover enable `pointer-events-auto`.
 *   This ensures it cannot accidentally capture gestures outside its own box.
 */
export default function BetaNote({
  className = "",
  placement = "top-right",
  zIndex = 60,
  enableBackDismiss = true,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const pushedHistoryRef = useRef(false);

  const RU_MESSAGE =
    "Игра и её функции находятся в бета-режиме и сейчас тестируются. Однако все ваши очки и покупки корректно сохраняются — вы можете играть и получать скидки. Для подробностей: @meowchi_lab.";

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOutside = useCallback(
    (e) => {
      if (!open) return;
      const c = containerRef.current;
      const p = popoverRef.current;
      if (!c) return;
      // If click/touch is outside both the container and the popover, close.
      const target = e.target;
      if (p && p.contains(target)) return;
      if (c.contains(target)) return;
      close();
      // If we injected a dummy history state, pop it so Back doesn't navigate away
      if (enableBackDismiss && pushedHistoryRef.current) {
        // We called pushState on open; a manual close should cleanly pop.
        try {
          window.history.back();
        } catch (_) {
          // ignore
        } finally {
          pushedHistoryRef.current = false;
        }
      }
    },
    [open, close, enableBackDismiss]
  );

  const onKey = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        if (enableBackDismiss && pushedHistoryRef.current) {
          try {
            window.history.back();
          } catch (_) {
            // ignore
          } finally {
            pushedHistoryRef.current = false;
          }
        }
      }
    },
    [open, close, enableBackDismiss]
  );

  const onPopState = useCallback(() => {
    // If a Back navigation occurs and we had the popover open via pushState, close it.
    if (open) {
      close();
      pushedHistoryRef.current = false;
    }
  }, [open, close]);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [handleOutside, onKey, onPopState]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && enableBackDismiss) {
        try {
          window.history.pushState({ betaNote: true }, "");
          pushedHistoryRef.current = true;
        } catch (_) {
          pushedHistoryRef.current = false;
        }
      }
      if (!next && enableBackDismiss && pushedHistoryRef.current) {
        try {
          window.history.back();
        } catch (_) {
          // ignore
        } finally {
          pushedHistoryRef.current = false;
        }
      }
      return next;
    });
  };

  // Popover alignment classes
  const align =
    placement === "top-left"
      ? "left-0"
      : "right-0"; // default top-right → right aligned

  return (
    <div
      ref={containerRef}
      className={`relative pointer-events-none ${className || ""}`}
      style={{ zIndex }}
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-1 pointer-events-auto select-none">
        {/* BETA pill */}
        <span
          className="
            inline-flex items-center justify-center
            px-2 py-[2px] text-[10px] font-semibold tracking-wide
            rounded-full border border-black/10
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
          {/* ℹ️ chosen for clarity across platforms */}
          <span role="img" aria-hidden="true">
            ℹ️
          </span>
        </button>
      </div>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="false"
          className={`
            absolute ${align} top-full mt-2
            w-[min(92vw,320px)]
            rounded-xl border
            p-3 text-sm
            shadow-2xl
            backdrop-blur
            bg-white/95 text-gray-900 border-black/10
            dark:bg-neutral-900/95 dark:text-neutral-100 dark:border-white/10
          `}
          style={{ pointerEvents: "auto" }}
        >
          <div className="whitespace-pre-wrap">
            {RU_MESSAGE}
          </div>
        </div>
      )}
    </div>
  );
}

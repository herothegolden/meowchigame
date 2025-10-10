// Path: frontend/src/components/OrderCTAButton.jsx
// Purpose: Reusable “Order now” CTA used across the app (Profile bottom CTA, etc.)
// Notes:
// - Matches the existing order button visuals (bg-accent → hover:bg-accent/90, text-background)
// - Handles loading/disabled state and Telegram haptics
// - Minimal API: onClick, isLoading, disabled, className, children/label

import React, { useCallback, useRef } from "react";

const OrderCTAButton = ({
  onClick,
  isLoading = false,
  disabled = false,
  className = "",
  children,
  label, // optional alias for children
  ariaLabel, // for a11y overrides
}) => {
  const lockRef = useRef(false);

  const handleClick = useCallback(
    async (e) => {
      if (disabled || isLoading) return;
      if (lockRef.current) return; // simple reentrancy guard
      lockRef.current = true;

      // Haptics (Telegram)
      try {
        const HW = window?.Telegram?.WebApp?.HapticFeedback;
        if (HW && typeof HW.impactOccurred === "function") {
          HW.impactOccurred("medium");
        }
      } catch (_) {}

      try {
        await Promise.resolve(onClick?.(e));
      } finally {
        lockRef.current = false;
      }
    },
    [disabled, isLoading, onClick]
  );

  const base =
    "px-4 py-2 rounded-lg font-semibold transition text-background focus:outline-none focus:ring-2 focus:ring-accent/60 focus:ring-offset-0";
  const tone = isLoading
    ? "bg-accent/60 cursor-wait"
    : "bg-accent hover:bg-accent/90";
  const state = disabled ? "opacity-60 cursor-not-allowed" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel || (typeof label === "string" ? label : "Заказать сейчас")}
      className={`${base} ${tone} ${state} ${className}`}
      role="button"
    >
      {isLoading ? "Подождите..." : children || label || "Заказать сейчас"}
    </button>
  );
};

export default OrderCTAButton;

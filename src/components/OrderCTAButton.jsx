// Path: frontend/src/components/OrderCTAButton.jsx
// v12 — Canonical status‑driven CTA with built‑in claim flow
// - Visibility is driven by server canonical shape: { eligible, usedToday, remainingGlobal }.
// - If these props are provided, the component hides itself when not eligible.
// - On click → calls /api/meow-claim, fires optional onClaimSuccess, and hides for today.
// - Backward compatible: if no canonical props are passed, behaves like a plain button.

import React, { useCallback, useMemo, useRef, useState } from "react";
import { claimMeow, showError, showSuccess } from "../utils/api";

const OrderCTAButton = ({
  // Canonical server status (optional but recommended)
  eligible,
  usedToday,
  remainingGlobal,

  // Callbacks
  onClaimSuccess, // (response) => void
  onClaimError,   // (error) => void
  onClick,        // fallback click handler when canonical status is not provided

  // UI
  isLoading: isLoadingProp = false,
  disabled: disabledProp = false,
  className = "",
  children,
  label,     // optional alias for children
  ariaLabel, // for a11y overrides
}) => {
  const [isLoading, setIsLoading] = useState(isLoadingProp);
  const [claimedToday, setClaimedToday] = useState(false);
  const lockRef = useRef(false);

  const showSelf = useMemo(() => {
    // Backward compatible mode: if canonical props are not provided, always render
    if (typeof eligible === "undefined" && typeof usedToday === "undefined" && typeof remainingGlobal === "undefined") {
      return true;
    }

    // Canonical mode: show only when eligible true
    if (claimedToday) return false; // local hide after success
    if (usedToday === true) return false;
    if (Number(remainingGlobal || 0) <= 0) return false;
    return !!eligible;
  }, [eligible, usedToday, remainingGlobal, claimedToday]);

  const handleClick = useCallback(
    async (e) => {
      if (disabledProp || isLoading) return;
      if (lockRef.current) return; // reentrancy guard
      lockRef.current = true;

      // Haptics
      try {
        const HW = window?.Telegram?.WebApp?.HapticFeedback;
        if (HW && typeof HW.impactOccurred === "function") HW.impactOccurred("medium");
      } catch (_) {}

      try {
        // If canonical props provided → built-in claim flow; else defer to onClick
        const canonicalMode =
          typeof eligible !== "undefined" || typeof usedToday !== "undefined" || typeof remainingGlobal !== "undefined";

        if (!canonicalMode) {
          await Promise.resolve(onClick?.(e));
          return;
        }

        setIsLoading(true);
        const res = await claimMeow();
        if (res?.success) {
          // Local hide and notify
          setClaimedToday(true);
          showSuccess("Скидка 42% активирована на заказ 🎉");
          try {
            window.dispatchEvent(new CustomEvent("meow:claim-success", { detail: { claimId: res.claimId } }));
          } catch (_) {}
          onClaimSuccess?.(res);
        } else {
          const msg = res?.error || "Не удалось активировать предложение";
          showError(msg);
          onClaimError?.(new Error(msg));
        }
      } catch (err) {
        showError(err?.message || "Сеть недоступна");
        onClaimError?.(err);
      } finally {
        setIsLoading(false);
        lockRef.current = false;
      }
    },
    [disabledProp, isLoading, eligible, usedToday, remainingGlobal, onClick, onClaimSuccess, onClaimError]
  );

  if (!showSelf) return null;

  const base =
    "px-4 py-2 rounded-lg font-semibold transition text-background focus:outline-none focus:ring-2 focus:ring-accent/60 focus:ring-offset-0";
  const tone = isLoading ? "bg-accent/60 cursor-wait" : "bg-accent hover:bg-accent/90";
  const state = disabledProp ? "opacity-60 cursor-not-allowed" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabledProp || isLoading}
      aria-label={ariaLabel || (typeof label === "string" ? label : "Заказать сейчас")}
      className={`${base} ${tone} ${state} ${className}`}
      role="button"
    >
      {isLoading ? "Подождите..." : children || label || "Заказать сейчас"}
    </button>
  );
};

export default OrderCTAButton;

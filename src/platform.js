// src/platform.js
// Lightweight platform detection for Telegram WebApp
const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export const IS_IOS =
  (!!tg && tg.platform === "ios") ||
  (typeof navigator !== "undefined" && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) // iPadOS
  ));

export const IS_ANDROID =
  (!!tg && tg.platform === "android") ||
  (typeof navigator !== "undefined" && /Android/.test(navigator.userAgent));

export function addPlatformClass() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("ios", !!IS_IOS);
  root.classList.toggle("android", !!IS_ANDROID);
}

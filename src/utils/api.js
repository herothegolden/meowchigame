// Path: frontend/src/utils/api.js
// v23 — Keep flat responses & no-cache POSTs; add safe BACKEND_URL fallback
// - Ensures all Meow endpoints use POST with initData and cache: 'no-store'.
// - Exposes explicit helpers: getProfileComplete, meowTap, getMeowCtaStatus, claimMeow.
// - Resolves BACKEND_URL from env or window globals to match page components.
// - Leaves initializeUser, apiCall, showSuccess, showError, claimStreak intact.

let BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Resolve backend URL with fallbacks to align with page components.
 */
const resolveBackendUrl = () => {
  if (typeof BACKEND_URL === "string" && BACKEND_URL) return BACKEND_URL;
  if (typeof window !== "undefined") {
    if (window.BACKEND_URL) return String(window.BACKEND_URL);
    if (window.__MEOWCHI_BACKEND_URL__) return String(window.__MEOWCHI_BACKEND_URL__);
  }
  return "";
};

/**
 * Internal: ensure Telegram WebApp context & backend URL exist.
 */
const requireTG = () => {
  const tg = window?.Telegram?.WebApp;
  const base = resolveBackendUrl();
  if (!tg?.initData || !base) {
    throw new Error("Connection required. Please open from Telegram.");
  }
  return tg;
};

/**
 * Initialize user in database via /api/validate
 * Called once on app startup to ensure user exists
 */
export const initializeUser = async () => {
  const tg = requireTG();
  const base = resolveBackendUrl();

  // Extract user from Telegram initData
  const params = new URLSearchParams(tg.initData);
  const userParam = params.get("user");
  if (!userParam) {
    throw new Error("Invalid Telegram user data");
  }
  const user = JSON.parse(userParam);

  const response = await fetch(`${base}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      initData: tg.initData,
      user,
    }),
  });

  if (!response.ok) {
    let error = {};
    try {
      error = await response.json();
    } catch {}
    throw new Error(error.error || `Initialization failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Generic POST helper that always includes Telegram initData.
 * endpoint: e.g. "/api/get-profile-complete"
 * data: extra fields to merge into the JSON body
 */
export const apiCall = async (endpoint, data = {}) => {
  const tg = requireTG();
  const base = resolveBackendUrl();

  const response = await fetch(`${base}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ initData: tg.initData, ...data }),
    keepalive: true,
  });

  if (!response.ok) {
    let error = {};
    try {
      error = await response.json();
    } catch {}
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
};

/** Convenience wrappers (explicit names make call sites clearer) **/

export const getProfileComplete = () => apiCall("/api/get-profile-complete");

export const meowTap = () => apiCall("/api/meow-tap");

export const getMeowCtaStatus = () => apiCall("/api/meow-cta-status");

export const claimMeow = () => apiCall("/api/meow-claim");

/** Existing helpers (kept) **/

export const showSuccess = (message) => {
  const tg = window?.Telegram?.WebApp;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  if (tg?.showPopup) {
    tg.showPopup({ title: "Success", message, buttons: [{ type: "ok" }] });
  }
};

export const showError = (message) => {
  const tg = window?.Telegram?.WebApp;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
  if (tg?.showPopup) {
    tg.showPopup({ title: "Error", message, buttons: [{ type: "ok" }] });
  } else {
    alert(message);
  }
};

/**
 * Claims daily streak via backend. (Kept for backward compatibility.)
 * Prefer using explicit getProfileComplete() + server-provided streakInfo.canClaim
 * and calling this once per Asia/Tashkent day.
 */
export const claimStreak = async () => {
  return await apiCall("/api/streak/claim-streak");
};

export { BACKEND_URL };

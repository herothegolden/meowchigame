// Path: frontend/src/utils/api.js
// v22 — Explicit Meow helpers + no-cache POSTs
// - Adds: getProfileComplete, meowTap, getMeowCtaStatus, claimMeow
// - Ensures initData is sent on every call; uses cache: 'no-store'
// - Keeps existing initializeUser, apiCall, showSuccess, showError, claimStreak

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Internal: ensure Telegram WebApp context & backend URL exist.
 */
const requireTG = () => {
  const tg = window?.Telegram?.WebApp;
  if (!tg?.initData || !BACKEND_URL) {
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

  // Extract user from Telegram initData
  const params = new URLSearchParams(tg.initData);
  const userParam = params.get("user");
  if (!userParam) {
    throw new Error("Invalid Telegram user data");
  }
  const user = JSON.parse(userParam);

  const response = await fetch(`${BACKEND_URL}/api/validate`, {
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

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ initData: tg.initData, ...data }),
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

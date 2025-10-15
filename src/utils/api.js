// v4 — make initializeUser() non-fatal outside Telegram to avoid blank screens in a regular browser.
//       (It now returns { ok: false, reason: 'not-in-telegram' } instead of throwing.)
//       All other behavior preserved to avoid breaking existing callers.

// v3 — adds Meow CTA helpers (status + claim). No other changes.
// v2 — verified for Daily Streak claim flow (no behavior changes)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Initialize user in database via /api/validate
 * Called once on app startup to ensure user exists
 *
 * CHANGE: Do not throw if not inside Telegram or BACKEND_URL is missing.
 * Instead, return a soft result so routes can render a "Open in Telegram" state
 * without crashing the whole page in a normal browser.
 */
export const initializeUser = async () => {
  const tg = window.Telegram?.WebApp;

  // Previously: threw synchronously when tg.initData or BACKEND_URL was absent.
  // Now: return a soft signal for non-TMA environments.
  if (!tg?.initData || !BACKEND_URL) {
    return { ok: false, reason: 'not-in-telegram' };
  }

  // Extract user from Telegram initData
  const params = new URLSearchParams(tg.initData);
  const userParam = params.get('user');

  if (!userParam) {
    // This is a genuine corruption case; still throw so callers see a real error.
    throw new Error('Invalid Telegram user data');
  }

  const user = JSON.parse(userParam);

  const response = await fetch(`${BACKEND_URL}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      initData: tg.initData,
      user: user
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Initialization failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Generic POST wrapper sending Telegram initData along with payload
 * NOTE: Behavior unchanged (still throws) to avoid surprising existing callers that rely on try/catch.
 * If you want fully "soft" behavior outside Telegram, gate calls at the page level
 * using !!window.Telegram?.WebApp?.initData before invoking apiCall().
 */
export const apiCall = async (endpoint, data = {}) => {
  const tg = window.Telegram?.WebApp;

  if (!tg?.initData || !BACKEND_URL) {
    throw new Error('Connection required. Please open from Telegram.');
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tg.initData, ...data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
};

export const showSuccess = (message) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  if (tg?.showPopup) {
    tg.showPopup({ title: 'Success', message, buttons: [{ type: 'ok' }] });
  }
};

export const showError = (message) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  if (tg?.showPopup) {
    tg.showPopup({ title: 'Error', message, buttons: [{ type: 'ok' }] });
  } else {
    alert(message);
  }
};

export const claimStreak = async () => {
  return await apiCall('/api/streak/claim-streak');
};

// ===== Meow CTA helpers =====

/**
 * Returns: { eligible: boolean, usedToday: boolean, meow_taps: number, today: "YYYY-MM-DD" }
 */
export const getMeowCtaStatus = async () => {
  return await apiCall('/api/meow-cta-status');
};

/**
 * Marks today's Meow CTA as used (idempotent). Returns: { success: true, usedToday: true } on success.
 */
export const claimMeowCta = async () => {
  return await apiCall('/api/meow-claim');
};

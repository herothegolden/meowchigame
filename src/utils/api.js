// v6 — Fix build error: use typeof import.meta !== 'undefined' instead of typeof import !== 'undefined'
//      Robust BACKEND_URL resolution (runtime + build-time) preserved.

function resolveBackendBase() {
  try {
    // Runtime fallbacks (settable from index.html or any inline script)
    if (typeof window !== "undefined") {
      const inline =
        window.__MEOWCHI_BACKEND_URL__ ||
        window.BACKEND_URL ||
        null;

      if (inline && typeof inline === "string") {
        return inline.replace(/\/+$/, "");
      }
    }

    // Build-time (Vite) fallback
    // NOTE: in some prod builds this can be undefined; that's why we prefer runtime above.
    const viteVal =
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_BACKEND_URL) ||
      "";
    if (viteVal) return String(viteVal).replace(/\/+$/, "");

    return "";
  } catch {
    return "";
  }
}

const BACKEND_URL = resolveBackendBase();

/**
 * Initialize user in database via /api/validate
 * Called once on app startup to ensure user exists
 *
 * CHANGE: Do not throw if not inside Telegram or BACKEND_URL is missing.
 * Instead, return a soft result so routes can render an "Open in Telegram" state
 * without crashing the whole page in a normal browser.
 */
export const initializeUser = async () => {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

  if (!tg?.initData || !BACKEND_URL) {
    // Soft signal: not in Telegram or no backend configured at runtime
    return { ok: false, reason: !BACKEND_URL ? "no-backend-url" : "not-in-telegram" };
  }

  const params = new URLSearchParams(tg.initData);
  const userParam = params.get("user");
  if (!userParam) {
    throw new Error("Invalid Telegram user data");
  }

  const user = JSON.parse(userParam);

  const response = await fetch(`${BACKEND_URL}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initData: tg.initData,
      user,
    }),
  });

  if (!response.ok) {
    let error = {};
    try { error = await response.json(); } catch {}
    throw new Error(error.error || `Initialization failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Generic POST helper that sends Telegram initData along with payload
 * Throws if Telegram env or BACKEND_URL are missing (callers should gate/try-catch).
 */
export const apiCall = async (endpoint, data = {}) => {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured");
  }
  if (!tg?.initData) {
    throw new Error("Connection required. Please open from Telegram.");
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: tg.initData, ...data }),
  });

  if (!response.ok) {
    let error = {};
    try { error = await response.json(); } catch {}
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
};

export const showSuccess = (message) => {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  try { tg?.HapticFeedback?.notificationOccurred?.("success"); } catch {}
  if (tg?.showPopup) {
    tg.showPopup({ title: "Success", message, buttons: [{ type: "ok" }] });
  }
};

export const showError = (message) => {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  try { tg?.HapticFeedback?.notificationOccurred?.("error"); } catch {}
  if (tg?.showPopup) {
    tg.showPopup({ title: "Error", message, buttons: [{ type: "ok" }] });
  } else {
    // Fallback for browser
    // eslint-disable-next-line no-alert
    alert(message);
  }
};

export const claimStreak = async () => {
  return await apiCall("/api/streak/claim-streak");
};

// ===== Meow CTA helpers =====

/**
 * Returns: { eligible: boolean, usedToday: boolean, meow_taps: number, today: "YYYY-MM-DD", ... }
 */
export const getMeowCtaStatus = async () => {
  return await apiCall("/api/meow-cta-status");
};

/**
 * Claim today's Meow CTA and normalize the response.
 * Always returns an object with shape: { success: boolean, claimId: string|null }
 * (Any HTTP errors will throw from apiCall.)
 */
export const claimMeowCta = async () => {
  const res = await apiCall("/api/meow-claim");
  const success = !!res?.success;
  const claimId = typeof res?.claimId === "string" && res.claimId.length > 0 ? res.claimId : null;
  return { success, claimId };
};

// Expose base for debugging if needed
export const __BACKEND_BASE__ = BACKEND_URL;

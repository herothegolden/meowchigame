// src/utils/api.js
// v2 — Hardened API utilities for TMA
// - Safe backend base resolution with runtime > build-time priority
// - Centralized Telegram initData getter
// - apiCall ensures leading slash, attaches initData, keepalive, and better errors
// - Exposes helpers used by CTA flow

// -------------------------------
// Backend base resolution
// -------------------------------
function resolveBackendBase() {
  try {
    if (typeof window !== "undefined") {
      const inline = window.__MEOWCHI_BACKEND_URL__ || window.BACKEND_URL || null;
      if (inline && typeof inline === "string") return inline.replace(/\/+$/, "");
    }
    // Build-time (Vite) fallback
    const viteVal =
      (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "";
    if (viteVal) return String(viteVal).replace(/\/+$/, "");
    return ""; // relative
  } catch (_) {
    return "";
  }
}

const BACKEND_URL = resolveBackendBase();

// -------------------------------
// Telegram initData
// -------------------------------
function getInitData() {
  try {
    const s = typeof window !== "undefined" ? window.Telegram?.WebApp?.initData : "";
    return typeof s === "string" ? s : "";
  } catch (_) {
    return "";
  }
}

// -------------------------------
// Initialize User (soft in non‑TMA)
// -------------------------------
export const initializeUser = async () => {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

  if (!tg?.initData || !BACKEND_URL) {
    // Soft signal for non‑Telegram/browser preview or missing runtime base
    return { ok: false, reason: !BACKEND_URL ? "no-backend-url" : "not-in-telegram" };
  }

  let user;
  try {
    const params = new URLSearchParams(tg.initData);
    const userParam = params.get("user");
    if (!userParam) throw new Error("Invalid Telegram user data");
    user = JSON.parse(userParam);
  } catch (e) {
    throw new Error("Invalid Telegram user data");
  }

  const res = await fetch(`${BACKEND_URL}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: tg.initData, user }),
    keepalive: true,
    credentials: "same-origin",
  });

  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch {}
    throw new Error(text || `Initialization failed: ${res.status}`);
  }
  try { return await res.json(); } catch { return { ok: true }; }
};

// -------------------------------
// Generic POST helper (strict)
// -------------------------------
export const apiCall = async (endpoint, data = {}, options = {}) => {
  const base = BACKEND_URL; // prefer explicit base; if empty, allow relative
  const path = String(endpoint || "/");
  const url = base
    ? `${base}${path.startsWith("/") ? path : `/${path}`}`
    : (path.startsWith("/") ? path : `/${path}`);

  const initData = getInitData();
  if (!initData) {
    throw new Error("Connection required. Please open from Telegram.");
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

  const res = await fetch(url, {
    method: options.method || "POST",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: JSON.stringify({ initData, ...data }),
    keepalive: true,
    credentials: options.credentials || "same-origin",
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(t);
    throw e;
  });

  clearTimeout(t);

  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    const msg = body || `Error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
};

// -------------------------------
// CTA helpers
// -------------------------------
export const getMeowCtaStatus = async () => apiCall("/api/meow-cta-status");
export const claimMeowCta = async () => {
  const res = await apiCall("/api/meow-claim");
  const success = !!res?.success;
  const claimId = typeof res?.claimId === "string" && res.claimId.length > 0 ? res.claimId : null;
  return { success, claimId };
};

// Optional dedicated helper for tap route (used by tap worker)
export const meowTap = async () => apiCall("/api/meow-tap");

// Expose base for diagnostics
export const __BACKEND_BASE__ = BACKEND_URL;

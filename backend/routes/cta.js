// v3 — /meow-cta-status tolerant to stale/absent meow_taps_date when taps ≥ 42
// v2 — robust Tashkent date compare for meow_taps_date (fixes perpetual ineligible)
// Tiny CTA routes for the Meow Counter reward (42 taps)

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate } from '../utils/timezone.js';

const router = express.Router();

/**
 * Normalize a DB date/timestamp to Asia/Tashkent "YYYY-MM-DD".
 * Accepts: null | string | Date
 */
function toTashkentYmd(value) {
  if (!value) return null;

  // If PG returned a DATE (text)
  if (typeof value === 'string') {
    // Expecting "YYYY-MM-DD" already; keep first 10 chars defensively
    return value.slice(0, 10);
  }

  // If PG returned a TIMESTAMP → JS Date
  if (value instanceof Date) {
    // Convert to UTC+5 (Asia/Tashkent) by shifting the UTC time
    const tzShiftMs = 5 * 60 * 60 * 1000; // +05:00
    const shifted = new Date(value.getTime() + tzShiftMs);
    return shifted.toISOString().slice(0, 10); // YYYY-MM-DD (of shifted time)
  }

  // Fallback (stringify & try to extract ISO-looking date)
  try {
    const s = String(value);
    // Try to find a YYYY-MM-DD occurrence
    const m = s.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

/**
 * NOTE:
 * Duplicate CTA endpoints were intentionally removed from this file to avoid
 * overriding the canonical implementations defined in `backend/routes/orders.js`.
 * This router is kept exported to preserve import/mount stability elsewhere.
 */

export default router;

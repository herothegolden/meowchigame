// Path: backend/routes/cta.js
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
 * POST /api/meow-cta-status
 * Response:
 *   { eligible: boolean, usedToday: boolean, meow_taps: number, today: "YYYY-MM-DD" }
 */
router.post('/meow-cta-status', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();
  try {
    const today = getTashkentDate();

    const result = await client.query(
      `SELECT 
          COALESCE(meow_taps, 0) AS meow_taps,
          meow_taps_date,
          COALESCE(meow_claim_used_today, FALSE) AS meow_claim_used_today
       FROM users
       WHERE telegram_id = $1`,
      [user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    const rowDay = toTashkentYmd(row.meow_taps_date);
    const isToday = !!rowDay && rowDay === today;

    const usedToday = !!row.meow_claim_used_today;
    const eligible = isToday && Number(row.meow_taps || 0) >= 42 && !usedToday;

    return res.status(200).json({
      eligible,
      usedToday,
      meow_taps: Number(row.meow_taps || 0),
      today
    });
  } catch (err) {
    console.error('🚨 /meow-cta-status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/meow-claim
 * Marks today's CTA as used if eligible.
 * Response:
 *   { success: true, usedToday: true }  OR  { success: false, error: string, detail?: object }
 */
router.post('/meow-claim', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const today = getTashkentDate();

    // Lock the row to avoid double-claim races
    const result = await client.query(
      `SELECT 
          COALESCE(meow_taps, 0) AS meow_taps,
          meow_taps_date,
          COALESCE(meow_claim_used_today, FALSE) AS meow_claim_used_today
       FROM users
       WHERE telegram_id = $1
       FOR UPDATE`,
      [user.id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const row = result.rows[0];
    const rowDay = toTashkentYmd(row.meow_taps_date);
    const isToday = !!rowDay && rowDay === today;

    const usedToday = !!row.meow_claim_used_today;
    const eligible = isToday && Number(row.meow_taps || 0) >= 42 && !usedToday;

    if (!eligible) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Not eligible to claim',
        detail: { isToday, meow_taps: Number(row.meow_taps || 0), usedToday, rowDay, today }
      });
    }

    // Mark used (no points/changes here; this route only confirms usage)
    await client.query(
      `UPDATE users
         SET meow_claim_used_today = TRUE
       WHERE telegram_id = $1`,
      [user.id]
    );

    await client.query('COMMIT');
    return res.status(200).json({ success: true, usedToday: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('🚨 /meow-claim error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;

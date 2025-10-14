// Path: backend/routes/cta.js
// Tiny CTA routes for the Meow Counter reward (42 taps)
// - /api/meow-cta-status : tells the client whether CTA should be shown
// - /api/meow-claim      : marks today's CTA as used for the user (idempotent)

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate } from '../utils/timezone.js';

const router = express.Router();

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
    const isToday = row.meow_taps_date && String(row.meow_taps_date).slice(0, 10) === today;
    const usedToday = !!row.meow_claim_used_today;
    const eligible = isToday && row.meow_taps >= 42 && !usedToday;

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
 *   { success: true, usedToday: true }  OR  { success: false, error: string }
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
    const isToday = row.meow_taps_date && String(row.meow_taps_date).slice(0, 10) === today;
    const usedToday = !!row.meow_claim_used_today;

    const eligible = isToday && row.meow_taps >= 42 && !usedToday;

    if (!eligible) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Not eligible to claim',
        detail: { isToday, meow_taps: Number(row.meow_taps || 0), usedToday }
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

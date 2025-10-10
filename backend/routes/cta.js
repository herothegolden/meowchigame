// Path: backend/routes/cta.js
// v1 — Meow CTA routes
// Implements:
//   POST /api/meow-cta-status   -> { eligible, usedToday, remainingGlobal, meow_taps }
//   POST /api/meow-claim        -> { success, claimId? } | { success:false, error:"claimed" }
// Notes:
// - Uses Asia/Tashkent day boundary.
// - Requires a table `meow_claims` with UNIQUE (claim_date) and UNIQUE (user_id, claim_date).
// - Read-only status endpoint, atomic claim endpoint with transaction + unique index for single winner.

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate } from '../utils/timezone.js';

const router = express.Router();

// Helpers
const tapsTodayFromRow = (row, todayStr) => {
  if (!row) return 0;
  const t = Number(row.meow_taps || 0);
  const d = row.meow_taps_date ? String(row.meow_taps_date).slice(0, 10) : null;
  return d === todayStr ? t : 0;
};

// -----------------------------------------------------------------------------
// POST /api/meow-cta-status
// -----------------------------------------------------------------------------
router.post('/meow-cta-status', validateUser, async (req, res) => {
  try {
    const { user } = req; // provided by validateUser
    const todayStr = getTashkentDate();

    const client = await pool.connect();
    try {
      const [userRow, todaysClaim, userClaimToday] = await Promise.all([
        client.query(
          `SELECT COALESCE(meow_taps,0) AS meow_taps, meow_taps_date
             FROM users WHERE telegram_id = $1`,
          [user.id]
        ),
        client.query(
          `SELECT id, user_id FROM meow_claims WHERE claim_date = $1 LIMIT 1`,
          [todayStr]
        ),
        client.query(
          `SELECT id FROM meow_claims WHERE claim_date = $1 AND user_id = $2 LIMIT 1`,
          [todayStr, user.id]
        )
      ]);

      const meow_taps = tapsTodayFromRow(userRow.rows[0], todayStr);
      const remainingGlobal = todaysClaim.rowCount === 0 ? 1 : 0; // only 1 winner/day
      const usedToday = userClaimToday.rowCount > 0;

      const eligible = meow_taps >= 42 && remainingGlobal === 1 && !usedToday;

      return res.status(200).json({ eligible, usedToday, remainingGlobal, meow_taps });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('🚨 /api/meow-cta-status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/meow-claim
// Atomic: single global winner per Tashkent day
// -----------------------------------------------------------------------------
router.post('/meow-claim', validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user } = req;
    const todayStr = getTashkentDate();

    await client.query('BEGIN');

    // Re-check user taps today under lock
    const userLocked = await client.query(
      `SELECT COALESCE(meow_taps,0) AS meow_taps, meow_taps_date
         FROM users WHERE telegram_id = $1 FOR UPDATE`,
      [user.id]
    );
    if (userLocked.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'user_not_found' });
    }

    const tapsToday = tapsTodayFromRow(userLocked.rows[0], todayStr);
    if (tapsToday < 42) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'insufficient_taps' });
    }

    // Optional: lock the day by probing today row (helps with hot races)
    // We rely on UNIQUE (claim_date) anyway for the real guarantee.

    try {
      const ins = await client.query(
        `INSERT INTO meow_claims (claim_date, user_id)
         VALUES ($1, $2)
         RETURNING id`,
        [todayStr, user.id]
      );

      await client.query('COMMIT');
      return res.status(200).json({ success: true, claimId: ins.rows[0].id });
    } catch (e) {
      // 23505 = unique_violation -> someone else already claimed or user already claimed today
      if (e && e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, error: 'claimed' });
      }
      throw e;
    }
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('🚨 /api/meow-claim error:', err);
    return res.status(500).json({ success: false, error: 'internal' });
  } finally {
    client.release();
  }
});

export default router;

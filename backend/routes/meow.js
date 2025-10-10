// Path: backend/routes/meow.js
// v2 — Atomic CTA eligibility on tap + add `dayToken` in responses (alias of tz_day)
// Notes:
// - Computes Tashkent-day token, increments, locks at 42.
// - On the exact 42nd tap (and when already locked), returns CTA eligibility atomically
//   in the same response to avoid read-after-write races.
// - Returns unified payload fields expected by frontend:
//   { meow_taps, locked, ctaEligible, ctaUsedToday, ctaRemainingGlobal, dayToken }
//   (Plus: meow_taps_date/today/tz_day for compatibility.)

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate } from '../utils/timezone.js';
import crypto from 'crypto';

const router = express.Router();
const LOG_CTA = process.env.LOG_CTA === '1';

/** Simple per-process rate limiter for /meow-tap */
const meowTapThrottle = new Map(); // userId -> lastTapMs
const TAP_COOLDOWN_MS = 220; // Align with client-side (CLIENT_COOLDOWN_MS = 220)

/* -------------------------------------------
   /api/meow-tap - Increment daily counter
------------------------------------------- */
router.post('/meow-tap', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const now = Date.now();
    const last = meowTapThrottle.get(user.id) || 0;
    const todayStr = getTashkentDate();

    const client = await pool.connect();
    try {
      // If throttled, return current value without advancing throttle window
      if (now - last < TAP_COOLDOWN_MS) {
        const row = await client.query(
          `SELECT COALESCE(meow_taps, 0) AS meow_taps,
                  meow_taps_date,
                  COALESCE(meow_claim_used_today, FALSE) AS meow_claim_used_today
             FROM users
            WHERE telegram_id = $1`,
          [user.id]
        );

        let meow = row.rows[0]?.meow_taps ?? 0;
        const meowDate = row.rows[0]?.meow_taps_date;
        const usedToday = !!row.rows[0]?.meow_claim_used_today;

        // If stored date is not today, show 0
        if (!meowDate || String(meowDate).slice(0, 10) !== todayStr) {
          meow = 0;
        }

        let ctaEligible = false;
        let ctaRemainingGlobal = 0;

        if (meow >= 42) {
          const claimsRow = await client.query(
            `SELECT COALESCE(claims_taken, 0) AS claims_taken
               FROM meow_daily_claims
              WHERE day = $1`,
            [todayStr]
          );
          const claimsTaken = Number(claimsRow.rows[0]?.claims_taken || 0);
          ctaRemainingGlobal = Math.max(42 - claimsTaken, 0);
          ctaEligible = meow >= 42 && usedToday === false && ctaRemainingGlobal > 0;

          if (LOG_CTA) {
            console.log(
              "[CTA][tap:throttled] user=%s day=%s taps=%s usedToday=%s claims=%s remaining=%s eligible=%s",
              String(user.id), todayStr, meow, usedToday, claimsTaken, ctaRemainingGlobal, ctaEligible
            );
          }
        }

        return res.status(200).json({
          meow_taps: meow,
          locked: meow >= 42,
          remaining: Math.max(42 - meow, 0),
          meow_taps_date: meowDate ? String(meowDate).slice(0, 10) : null,
          today: todayStr,
          tz_day: todayStr,
          dayToken: todayStr,
          ctaEligible,
          ctaUsedToday: usedToday,
          ctaRemainingGlobal,
          throttled: true
        });
      }

      await client.query('BEGIN');

      // Lock row, read current state
      const rowRes = await client.query(
        `SELECT COALESCE(meow_taps, 0) AS meow_taps,
                meow_taps_date,
                COALESCE(meow_claim_used_today, FALSE) AS meow_claim_used_today
           FROM users
          WHERE telegram_id = $1
          FOR UPDATE`,
        [user.id]
      );
      if (rowRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      let { meow_taps, meow_taps_date, meow_claim_used_today } = rowRes.rows[0];
      let usedToday = !!meow_claim_used_today;

      // Reset if first tap of new day
      if (!meow_taps_date || String(meow_taps_date).slice(0, 10) !== todayStr) {
        meow_taps = 0;
        meow_taps_date = todayStr;
        usedToday = false;
        await client.query(
          `UPDATE users
             SET meow_taps = 0,
                 meow_taps_date = $1,
                 meow_claim_used_today = FALSE
           WHERE telegram_id = $2`,
          [todayStr, user.id]
        );
      }

      // If already locked before increment
      if (meow_taps >= 42) {
        const claimsRow = await client.query(
          `SELECT COALESCE(claims_taken, 0) AS claims_taken
             FROM meow_daily_claims
            WHERE day = $1
            FOR UPDATE`,
          [todayStr]
        );
        const claimsTaken = Number(claimsRow.rows[0]?.claims_taken || 0);
        const ctaRemainingGlobal = Math.max(42 - claimsTaken, 0);
        const ctaEligible = meow_taps >= 42 && usedToday === false && ctaRemainingGlobal > 0;

        await client.query('COMMIT');
        meowTapThrottle.set(user.id, now);

        if (LOG_CTA) {
          console.log(
            "[CTA][tap] user=%s day=%s taps:%s->%s usedToday=%s claims=%s remaining=%s eligible=%s",
            String(user.id), todayStr, meow_taps, meow_taps, usedToday, claimsTaken, ctaRemainingGlobal, ctaEligible
          );
        }

        return res.status(200).json({
          meow_taps: 42,
          locked: true,
          remaining: 0,
          meow_taps_date: String(meow_taps_date).slice(0, 10),
          today: todayStr,
          tz_day: todayStr,
          dayToken: todayStr,
          ctaEligible,
          ctaUsedToday: usedToday,
          ctaRemainingGlobal
        });
      }

      // Increment tap
      const newTaps = Math.min(meow_taps + 1, 42);
      await client.query(
        `UPDATE users
           SET meow_taps = $1, meow_taps_date = $2
         WHERE telegram_id = $3`,
        [newTaps, todayStr, user.id]
      );

      // If this increment reaches 42, compute CTA eligibility atomically
      if (newTaps >= 42) {
        const claimsRow = await client.query(
          `SELECT COALESCE(claims_taken, 0) AS claims_taken
             FROM meow_daily_claims
            WHERE day = $1
            FOR UPDATE`,
          [todayStr]
        );
        const claimsTaken = Number(claimsRow.rows[0]?.claims_taken || 0);
        const ctaRemainingGlobal = Math.max(42 - claimsTaken, 0);
        const ctaEligible = newTaps >= 42 && usedToday === false && ctaRemainingGlobal > 0;

        await client.query('COMMIT');
        meowTapThrottle.set(user.id, now);

        if (LOG_CTA) {
          console.log(
            "[CTA][tap] user=%s day=%s taps:%s->%s usedToday=%s claims=%s remaining=%s eligible=%s",
            String(user.id), todayStr, meow_taps, newTaps, usedToday, claimsTaken, ctaRemainingGlobal, ctaEligible
          );
        }

        return res.status(200).json({
          meow_taps: newTaps,
          locked: true,
          remaining: 0,
          meow_taps_date: todayStr,
          today: todayStr,
          tz_day: todayStr,
          dayToken: todayStr,
          ctaEligible,
          ctaUsedToday: usedToday,
          ctaRemainingGlobal
        });
      }

      // Still below 42
      await client.query('COMMIT');
      meowTapThrottle.set(user.id, now);

      return res.status(200).json({
        meow_taps: newTaps,
        locked: false,
        remaining: Math.max(42 - newTaps, 0),
        meow_taps_date: todayStr,
        today: todayStr,
        tz_day: todayStr,
        dayToken: todayStr
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/meow-tap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* -------------------------------------------
   /api/meow-cta-status - Check eligibility (read-only)
------------------------------------------- */
router.post('/meow-cta-status', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const todayStr = getTashkentDate();

    const client = await pool.connect();
    try {
      // Read user's meow state
      const userRow = await client.query(
        `SELECT COALESCE(meow_taps, 0) AS meow_taps,
                meow_taps_date,
                COALESCE(meow_claim_used_today, FALSE) AS meow_claim_used_today
           FROM users
          WHERE telegram_id = $1`,
        [user.id]
      );

      if (userRow.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      let meow_taps = userRow.rows[0].meow_taps;
      const meow_taps_date = userRow.rows[0].meow_taps_date;
      const usedToday = !!userRow.rows[0].meow_claim_used_today;

      // If stored date is not today, treat as 0
      if (!meow_taps_date || String(meow_taps_date).slice(0, 10) !== todayStr) {
        meow_taps = 0;
      }

      let eligible = false;
      let remainingGlobal = 0;

      if (meow_taps >= 42) {
        // Check global quota
        const claimsRow = await client.query(
          `SELECT COALESCE(claims_taken, 0) AS claims_taken
             FROM meow_daily_claims
            WHERE day = $1`,
          [todayStr]
        );
        const claimsTaken = Number(claimsRow.rows[0]?.claims_taken || 0);
        remainingGlobal = Math.max(42 - claimsTaken, 0);
        
        // Eligible = reached 42 AND not used today AND quota available
        eligible = meow_taps >= 42 && !usedToday && remainingGlobal > 0;

        if (LOG_CTA) {
          console.log(
            "[CTA][status] user=%s day=%s taps=%s usedToday=%s claims=%s remaining=%s eligible=%s",
            String(user.id), todayStr, meow_taps, usedToday, claimsTaken, remainingGlobal, eligible
          );
        }
      }

      res.status(200).json({
        eligible,
        usedToday,
        remainingGlobal,
        meow_taps,
        tz_day: todayStr,
        dayToken: todayStr
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/meow-cta-status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* -------------------------------------------
   /api/meow-claim - Claim 42% discount
------------------------------------------- */
router.post('/meow-claim', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const todayStr = getTashkentDate();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock user row
      const userRow = await client.query(
        `SELECT COALESCE(meow_taps, 0) AS meow_taps,
                meow_taps_date,
                COALESCE(meow_claim_used_today, FALSE) AS meow_claim_used_today
           FROM users
          WHERE telegram_id = $1
          FOR UPDATE`,
        [user.id]
      );

      if (userRow.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      let meow_taps = userRow.rows[0].meow_taps;
      const meow_taps_date = userRow.rows[0].meow_taps_date;
      const usedToday = !!userRow.rows[0].meow_claim_used_today;

      // Validate date
      if (!meow_taps_date || String(meow_taps_date).slice(0, 10) !== todayStr) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'Counter not at 42 today' 
        });
      }

      // Validate counter >= 42
      if (meow_taps < 42) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: `Need 42 meows (current: ${meow_taps})` 
        });
      }

      // Validate not used today
      if (usedToday) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'Discount already claimed today' 
        });
      }

      // Lock global claims table
      const claimsRow = await client.query(
        `SELECT COALESCE(claims_taken, 0) AS claims_taken
           FROM meow_daily_claims
          WHERE day = $1
          FOR UPDATE`,
        [todayStr]
      );

      let claimsTaken = 0;
      if (claimsRow.rowCount > 0) {
        claimsTaken = Number(claimsRow.rows[0].claims_taken);
      }

      const remainingGlobal = Math.max(42 - claimsTaken, 0);

      // Validate quota available
      if (remainingGlobal <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'All 42 slots taken today. Try tomorrow!' 
        });
      }

      // Generate unique claim token
      const claimId = crypto.randomUUID();

      // Create claim record (idempotent via unique index on user_id, day)
      await client.query(
        `INSERT INTO meow_claims (id, user_id, day, consumed)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (user_id, day) DO NOTHING`,
        [claimId, user.id, todayStr]
      );

      // Increment global counter
      if (claimsRow.rowCount === 0) {
        await client.query(
          `INSERT INTO meow_daily_claims (day, claims_taken)
           VALUES ($1, 1)`,
          [todayStr]
        );
      } else {
        await client.query(
          `UPDATE meow_daily_claims
           SET claims_taken = claims_taken + 1
           WHERE day = $1`,
          [todayStr]
        );
      }

      // Mark user as used today
      await client.query(
        `UPDATE users
         SET meow_claim_used_today = TRUE
         WHERE telegram_id = $1`,
        [user.id]
      );

      await client.query('COMMIT');

      console.log(`🎉 Meow claim successful: user=${user.id} claimId=${claimId} day=${todayStr}`);

      res.status(200).json({
        success: true,
        claimId,
        message: 'Скидка 42% активирована!',
        dayToken: todayStr
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/meow-claim:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

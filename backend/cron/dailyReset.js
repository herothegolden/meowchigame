// Path: backend/cron/dailyReset.js
// v3 — Align day token with routes (getTashkentDate), atomic daily reset
// - Uses the same Tashkent-day util as routes to avoid drift.
// - Resets per-user flags + meow taps to 0 and stamps meow_taps_date to dayToken.
// - Ensures a meow_daily_claims row exists for the new day and sets claims_taken = 0.
// - Runs at 00:00 Asia/Tashkent via node-cron.

import cron from 'node-cron';
import { pool } from '../config/database.js';
import { getTashkentDate } from '../utils/timezone.js';

/**
 * Schedule daily resets at 00:00 Asia/Tashkent.
 */
export const scheduleDailyReset = () => {
  // '0 0 * * *' → 00:00 every day in the specified timezone
  cron.schedule(
    '0 0 * * *',
    async () => {
      const client = await pool.connect();
      const dayToken = getTashkentDate(); // unified day string (YYYY-MM-DD)

      try {
        console.log(`🌙 [Cron] Starting daily reset for ${dayToken} (Asia/Tashkent)`);
        await client.query('BEGIN');

        // 1) Reset per-user daily fields and counter
        const resetUsers = await client.query(
          `UPDATE users
             SET streak_claimed_today   = FALSE,
                 meow_claim_used_today  = FALSE,
                 meow_taps              = 0,
                 meow_taps_date         = $1`,
          [dayToken]
        );

        // 2) Reset/Upsert global daily claims counter to 0 for this day
        await client.query(
          `INSERT INTO meow_daily_claims (day, claims_taken)
             VALUES ($1, 0)
           ON CONFLICT (day)
           DO UPDATE SET claims_taken = 0`,
          [dayToken]
        );

        await client.query('COMMIT');
        console.log(
          `✅ [Cron] Daily reset complete for ${dayToken}. Users updated: ${resetUsers.rowCount}. Global claims reset.`
        );
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 [Cron] Error during daily reset:', error);
      } finally {
        client.release();
      }
    },
    { timezone: 'Asia/Tashkent' }
  );

  console.log('⏰ [Cron] Daily reset scheduled for 00:00 Asia/Tashkent.');
};

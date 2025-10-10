// Path: backend/cron/dailyReset.js
// ROLLBACK VERSION - Original (has counter-starts-at-1 bug but deploys)
// Purpose: Run daily resets at midnight Asia/Tashkent (UTC+5)
// - Resets streak_claimed_today for all users
// - Resets meow counter for the day (meow_taps -> 0, meow_taps_date -> today in Tashkent)
// - Resets per-user meow claim usage (meow_claim_used_today -> false)
// - Resets the global first-42 counter (meow_daily_claims for today's date -> claims_taken = 0)

import cron from 'node-cron';
import { pool } from '../config/database.js';

/**
 * Schedule daily resets at 00:00 Asia/Tashkent.
 * We compute the Tashkent-local date inside Postgres using:
 *   (now() at time zone 'Asia/Tashkent')::date
 */
export const scheduleDailyReset = () => {
  // Cron pattern: '0 0 * * *' = Every day at 00:00 (midnight) in the given timezone
  cron.schedule(
    '0 0 * * *',
    async () => {
      const client = await pool.connect();

      try {
        console.log('🌙 [Cron] Starting daily reset for Tashkent midnight...');
        await client.query('BEGIN');

        // Determine today's date in Asia/Tashkent from Postgres (source of truth).
        const {
          rows: [{ tz_date }],
        } = await client.query(
          `SELECT (now() AT TIME ZONE 'Asia/Tashkent')::date AS tz_date`
        );

        // 1) Reset per-user flags & meow daily counters
        const resetUsers = await client.query(
          `
          UPDATE users
          SET
            streak_claimed_today   = FALSE,
            meow_claim_used_today  = FALSE,
            meow_taps              = 0,
            meow_taps_date         = $1
        `,
          [tz_date]
        );

        // 2) Reset global "first 42" counter for the new day (UPSERT to ensure a row exists)
        await client.query(
          `
          INSERT INTO meow_daily_claims (day, claims_taken)
          VALUES ($1, 0)
          ON CONFLICT (day)
          DO UPDATE SET claims_taken = 0
          `,
          [tz_date]
        );

        await client.query('COMMIT');

        console.log(
          `✅ [Cron] Daily reset complete for ${tz_date}. Users updated: ${resetUsers.rowCount}. Global meow_daily_claims reset to 0.`
        );
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 [Cron] Error during daily reset:', error);
      } finally {
        client.release();
      }
    },
    {
      timezone: 'Asia/Tashkent',
    }
  );

  console.log(
    '⏰ [Cron] Daily reset scheduled: 00:00 Asia/Tashkent (runs once per day).'
  );
};

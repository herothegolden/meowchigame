// Path: backend/routes/streak.js

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate, calculateDateDiff } from '../utils/timezone.js';

const router = express.Router();

/**
 * FIXED BUG 2:
 * Robust normalizer that accepts:
 * - null/undefined               -> null
 * - 'YYYY-MM-DD'                 -> same string
 * - 'YYYY-MM-DDTHH:mm:ss...'     -> first 10 chars
 * - numeric epoch ms             -> formatted 'YYYY-MM-DD' (UTC-based fallback)
 * - Date instance                -> formatted 'YYYY-MM-DD' (UTC-based fallback)
 *
 * NOTE: We store `last_login_date` as 'YYYY-MM-DD' (Tashkent local via getTashkentDate()) below,
 * so any legacy non-YYYY-MM-DD values will be one-time-normalized here.
 */
function normalizeToYMD(value) { // FIXED BUG 2
  if (!value) return null;
  if (typeof value === 'string') {
    // If already a date or an ISO-like string, take the first 10 chars safely
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    // Attempt generic parse as last resort
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yyyy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(value.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

// ---- CLAIM DAILY STREAK ----
router.post('/claim-streak', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Lock user row to prevent race conditions
    const userResult = await client.query(
      `SELECT telegram_id, daily_streak, longest_streak, points, 
              last_login_date, streak_claimed_today
       FROM users 
       WHERE telegram_id = $1 
       FOR UPDATE`,
      [user.id]
    );

    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];
    const currentDate = getTashkentDate(); // 'YYYY-MM-DD' in Tashkent

    // Calculate date difference first (so we can decide how to treat "claimed today")
    // FIXED BUG 2: normalize last_login_date to 'YYYY-MM-DD' if needed
    const lastLoginDateRaw = userData.last_login_date; // might be DATE, timestamp string, or null
    const lastLoginDate = normalizeToYMD(lastLoginDateRaw); // FIXED BUG 2

    // FIXED BUG 2: Call calculateDateDiff only with normalized YMD strings
    // If we cannot normalize, treat as "no previous claim"
    const diffDays = lastLoginDate ? calculateDateDiff(lastLoginDate, currentDate) : null; // FIXED BUG 2

    // FIXED BUG 2: REMOVE the "diffDays = 999" hard reset path.
    // Old code:
    // if (diffDays === null || Number.isNaN(diffDays)) {
    //   diffDays = 999; // force reset logic below
    // }

    // Resilience: if the day rolled over but cron didn't run,
    // allow claim by ignoring yesterday's "streak_claimed_today".
    // Only block when it's truly the same Tashkent day.
    if (userData.streak_claimed_today && diffDays === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Streak already claimed today' });
    }

    // Determine new streak value
    let newStreak;
    if (!lastLoginDate || diffDays === null || Number.isNaN(diffDays)) { // FIXED BUG 2: treat invalid/unknown as first claim
      // First time claiming (or previous date invalid/unknown)
      newStreak = 1;
    } else if (diffDays > 1) {
      // Missed days - reset to 1
      newStreak = 1;
    } else {
      // Same day (0) or next day (1) - continue streak
      newStreak = userData.daily_streak + 1;
    }

    // Calculate bonus points
    // FIXED BUG 3: change multiplier to 500 per day
    const bonusPoints = 500 * newStreak; // FIXED BUG 3

    // Atomic update: streak, longest streak, points, flags, date
    // FIXED BUG 2: Ensure we always store 'YYYY-MM-DD' (Tashkent local) in last_login_date
    const updateResult = await client.query(
      `UPDATE users 
       SET daily_streak = $1,
           longest_streak = GREATEST(longest_streak, $1),
           last_login_date = $2,
           streak_claimed_today = true,
           points = points + $3
       WHERE telegram_id = $4
       RETURNING daily_streak, longest_streak, points`,
      [newStreak, currentDate, bonusPoints, user.id]
    );

    // Commit transaction
    await client.query('COMMIT');

    const updatedUser = updateResult.rows[0];

    console.log(`🔥 Streak claimed by user ${user.id}: Day ${newStreak}, +${bonusPoints} points`);

    res.status(200).json({
      success: true,
      streak: {
        daily: updatedUser.daily_streak,
        longest: updatedUser.longest_streak,
        pointsEarned: bonusPoints,
        totalPoints: updatedUser.points
      },
      message: `Streak claimed! +${bonusPoints} points`
    });

  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    console.error('🚨 Error in /claim-streak:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Always release client
    client.release();
  }
});

export default router;

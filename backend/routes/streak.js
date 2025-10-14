// Path: backend/routes/streak.js

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate, calculateDateDiff } from '../utils/timezone.js';

const router = express.Router();

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
    const currentDate = getTashkentDate();

    // Calculate date difference first (so we can decide how to treat "claimed today")
    const lastLoginDate = userData.last_login_date;
    let diffDays = calculateDateDiff(lastLoginDate, currentDate);

    // Hardening: if diffDays is null for any reason, treat as reset boundary
    if (diffDays === null || Number.isNaN(diffDays)) {
      diffDays = 999; // force reset logic below
    }

    // Resilience: if the day rolled over but cron didn't run,
    // allow claim by ignoring yesterday's "streak_claimed_today".
    // Only block when it's truly the same Tashkent day.
    if (userData.streak_claimed_today && diffDays === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Streak already claimed today' });
    }

    // Determine new streak value
    let newStreak;
    if (lastLoginDate === null) {
      // First time claiming
      newStreak = 1;
    } else if (diffDays > 1) {
      // Missed days - reset to 1
      newStreak = 1;
    } else {
      // Same day (0) or next day (1) - continue streak
      newStreak = userData.daily_streak + 1;
    }

    // Calculate bonus points
    const bonusPoints = 100 * newStreak;

    // Atomic update: streak, longest streak, points, flags, date
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

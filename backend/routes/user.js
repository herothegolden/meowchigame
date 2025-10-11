// Path: backend/routes/user.js
// v12 — Display-only Tashkent day guard for meow_taps in /get-user-stats and /get-profile-complete
// - Ensures Profile never shows stale meow_taps from a previous day if daily cron hasn't run yet
// - NO DB mutation here; cron + /meow-tap remain the only writers

import express from 'express';
import { pool } from '../config/database.js';
import { validate } from '../utils.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate, calculateDateDiff } from '../utils/timezone.js';

const router = express.Router();
const { BOT_TOKEN } = process.env;

/** Simple per-process rate limiter for /meow-tap */
const meowTapThrottle = new Map(); // userId -> lastTapMs
// Align with client-side guard (CLIENT_COOLDOWN_MS = 220) to avoid last-tap throttle races.
const TAP_COOLDOWN_MS = 220;

const MEOW_DAILY_CAP = 42;

const sliceDate = (value) => (value ? String(value).slice(0, 10) : null);

const normalizeMeowCounter = async (client, userId, row, todayStr) => {
  const storedDate = sliceDate(row?.meow_taps_date);
  if (storedDate === todayStr) {
    return Number(row?.meow_taps || 0);
  }

  await client.query(
    `UPDATE users
        SET meow_taps = 0,
            meow_taps_date = $1,
            updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = $2`,
    [todayStr, userId]
  );

  return 0;
};

const buildMeowResponse = (count) => {
  const coerced = Number(count);
  const numeric = Number.isFinite(coerced) ? coerced : 0;
  const safeCount = Math.max(0, Math.min(numeric, MEOW_DAILY_CAP));
  return {
    count: safeCount,
    meow_taps: safeCount,
    locked: safeCount >= MEOW_DAILY_CAP,
    remaining: Math.max(MEOW_DAILY_CAP - safeCount, 0),
    showCTA: safeCount >= MEOW_DAILY_CAP,
  };
};

/* -------------------------------------------
   AUTH / VALIDATION
------------------------------------------- */

router.post('/validate', async (req, res) => {
  try {
    const isValid = validate(req.body.initData, BOT_TOKEN);
    if (!isValid) return res.status(403).json({ error: 'Invalid Telegram initData' });

    const params = new URLSearchParams(req.body.initData);
    const userString = params.get('user');
    if (!userString) return res.status(400).json({ error: 'Missing user data in initData' });

    const tgUser = JSON.parse(userString);
    if (!tgUser || !tgUser.id) return res.status(400).json({ error: 'Invalid user data in initData' });

    const client = await pool.connect();
    try {
      let dbUserResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [tgUser.id]);
      let appUser;

      if (dbUserResult.rows.length === 0) {
        console.log(`👤 Creating new user: ${tgUser.first_name} (@${tgUser.username || 'no-username'}) (${tgUser.id})`);

        await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username)
           VALUES ($1, $2, $3, $4)`,
          [tgUser.id, tgUser.first_name, tgUser.last_name, tgUser.username]
        );

        await client.query(
          `UPDATE users SET
             points = COALESCE(points, 0),
             level = COALESCE(level, 1),
             daily_streak = COALESCE(daily_streak, 0),
             games_played = COALESCE(games_played, 0),
             high_score = COALESCE(high_score, 0),
             total_play_time = COALESCE(total_play_time, 0),
             last_login_at = CURRENT_TIMESTAMP
           WHERE telegram_id = $1`,
          [tgUser.id]
        );

        dbUserResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [tgUser.id]);
        appUser = dbUserResult.rows[0];

        await client.query(`
          UPDATE global_stats
          SET new_players_today = new_players_today + 1,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
        `);
      } else {
        appUser = dbUserResult.rows[0];

        const needsUpdate =
          appUser.first_name !== tgUser.first_name ||
          appUser.last_name !== tgUser.last_name ||
          appUser.username !== tgUser.username;

        if (needsUpdate) {
          console.log(`🔄 Updating user info for ${tgUser.id}`);
          await client.query(
            `UPDATE users
             SET first_name = $1, last_name = $2, username = $3
             WHERE telegram_id = $4`,
            [tgUser.first_name, tgUser.last_name, tgUser.username, tgUser.id]
          );
        }

        await client.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE telegram_id = $1', [tgUser.id]);
      }

      const currentDate = getTashkentDate();
      const lastLoginDate = appUser.last_login_date;
      const currentStreak = appUser.daily_streak || 0;
      const streakClaimedToday = appUser.streak_claimed_today || false;
      const diffDays = calculateDateDiff(lastLoginDate, currentDate);

      let canClaim = false;
      let state = 'CLAIMED';
      let potentialBonus = 0;
      let message = '';

      if (lastLoginDate === null) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 100;
        message = 'Claim your first streak!';
      } else if (diffDays === 0 && streakClaimedToday) {
        canClaim = false;
        state = 'CLAIMED';
        message = 'Streak already claimed today';
      } else if (diffDays === 0 && !streakClaimedToday) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 100 * (currentStreak + 1);
        message = `Claim your day ${currentStreak + 1} streak!`;
      } else if (diffDays === 1) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 100 * (currentStreak + 1);
        message = `Continue your ${currentStreak}-day streak!`;
      } else if (diffDays > 1) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 100;
        message = 'Streak reset - start fresh!';
      }

      const streakInfo = { canClaim, state, currentStreak, potentialBonus, message };

      const userCount = await client.query(
        `SELECT COUNT(*) as count FROM users WHERE last_login_at > NOW() - INTERVAL '1 hour'`
      );
      const activeCount = Math.max(37, parseInt(userCount.rows[0].count, 10) || 0);
      await client.query(
        `UPDATE global_stats
         SET active_players = $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [activeCount]
      );

      console.log(`✅ User ${tgUser.id} (@${tgUser.username || 'no-username'}) validated successfully`);
      res.status(200).json({ ...appUser, streakInfo });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* -------------------------------------------
   PROFILE / STATS
------------------------------------------- */

router.post('/get-user-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const userResult = await client.query(
        `SELECT
           first_name,
           username,
           COALESCE(points, 0)          AS points,
           COALESCE(level, 1)           AS level,
           COALESCE(daily_streak, 0)    AS daily_streak,
           created_at,
           COALESCE(games_played, 0)    AS games_played,
           COALESCE(high_score, 0)      AS high_score,
           COALESCE(total_play_time, 0) AS total_play_time,
           COALESCE(meow_taps, 0)       AS meow_taps,
           meow_taps_date,
           avatar_url,
           COALESCE(vip_level, 0)       AS vip_level,
           last_login_date,
           COALESCE(streak_claimed_today, FALSE) AS streak_claimed_today
         FROM users
         WHERE telegram_id = $1`,
        [user.id]
      );

      if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      const userData = userResult.rows[0];

      // No mutation here: daily meow reset occurs in cron at Tashkent midnight.
      const todayStr = getTashkentDate();

      // 🔒 DISPLAY-ONLY DAY GUARD: if stored date is not today, present 0 to client
      if (!userData.meow_taps_date || String(userData.meow_taps_date).slice(0,10) !== todayStr) {
        userData.meow_taps = 0;
        userData.meow_taps_date = todayStr;
      }

      // --- Derived daily metrics (display correctness) ---
      // 1) Today's high score (Asia/Tashkent)
      const highTodayResult = await client.query(
        `SELECT COALESCE(MAX(score), 0) AS high_score_today
           FROM game_sessions
          WHERE user_id = $1
            AND played_at AT TIME ZONE 'Asia/Tashkent' >= (DATE $2)::timestamp
            AND played_at AT TIME ZONE 'Asia/Tashkent' < ((DATE $2) + INTERVAL '1 day')::timestamp`,
        [user.id, todayStr]
      );
      userData.high_score_today = highTodayResult.rows[0].high_score_today || 0;

      // 2) Today's games played (Asia/Tashkent)
      const gamesTodayResult = await client.query(
        `SELECT COUNT(*) AS games_today
           FROM game_sessions
          WHERE user_id = $1
            AND played_at AT TIME ZONE 'Asia/Tashkent' >= (DATE $2)::timestamp
            AND played_at AT TIME ZONE 'Asia/Tashkent' < ((DATE $2) + INTERVAL '1 day')::timestamp`,
        [user.id, todayStr]
      );
      userData.games_played_today = parseInt(gamesTodayResult.rows[0].games_today, 10) || 0;

      res.json(userData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-user-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/get-profile-complete', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const userResult = await client.query(
        `SELECT
           first_name,
           username,
           COALESCE(points, 0)          AS points,
           COALESCE(level, 1)           AS level,
           COALESCE(daily_streak, 0)    AS daily_streak,
           created_at,
           COALESCE(games_played, 0)    AS games_played,
           COALESCE(high_score, 0)      AS high_score,
           COALESCE(total_play_time, 0) AS total_play_time,
           COALESCE(meow_taps, 0)       AS meow_taps,
           meow_taps_date,
           avatar_url,
           COALESCE(vip_level, 0)       AS vip_level,
           last_login_date,
           COALESCE(streak_claimed_today, FALSE) AS streak_claimed_today
         FROM users
         WHERE telegram_id = $1`,
        [user.id]
      );

      if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      const userData = userResult.rows[0];

      const todayStr = getTashkentDate();

      if (!userData.meow_taps_date || String(userData.meow_taps_date).slice(0,10) !== todayStr) {
        userData.meow_taps = 0;
        userData.meow_taps_date = todayStr;
      }

      const [highTodayResult, gamesTodayResult, streakHistoryResult] = await Promise.all([
        client.query(
          `SELECT COALESCE(MAX(score), 0) AS high_score_today
             FROM game_sessions
            WHERE user_id = $1
              AND played_at AT TIME ZONE 'Asia/Tashkent' >= (DATE $2)::timestamp
              AND played_at AT TIME ZONE 'Asia/Tashkent' < ((DATE $2) + INTERVAL '1 day')::timestamp`,
          [user.id, todayStr]
        ),
        client.query(
          `SELECT COUNT(*) AS games_today
             FROM game_sessions
            WHERE user_id = $1
              AND played_at AT TIME ZONE 'Asia/Tashkent' >= (DATE $2)::timestamp
              AND played_at AT TIME ZONE 'Asia/Tashkent' < ((DATE $2) + INTERVAL '1 day')::timestamp`,
          [user.id, todayStr]
        ),
        client.query(
          `SELECT streak_day, points_awarded
             FROM streak_history
            WHERE user_id = $1
            ORDER BY streak_day DESC
            LIMIT 7`,
          [user.id]
        )
      ]);

      userData.high_score_today = highTodayResult.rows[0].high_score_today || 0;
      userData.games_played_today = parseInt(gamesTodayResult.rows[0].games_today, 10) || 0;
      userData.streak_history = streakHistoryResult.rows;

      res.json({ stats: userData });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-profile-complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/update-profile', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { firstName, lastName, username } = req.body;

    if (!firstName || !lastName || !username)
      return res.status(400).json({ error: 'First name, last name, and username are required.' });

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE users
           SET first_name = $1,
               last_name = $2,
               username = $3,
               updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $4
         RETURNING first_name, last_name, username`,
        [firstName, lastName, username, user.id]
      );

      if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      console.log(`🛠️ Profile updated for user ${user.id}`);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/update-profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/update-avatar', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { avatarBase64 } = req.body;

    if (!avatarBase64)
      return res.status(400).json({ error: 'Avatar data is required' });
    if (!avatarBase64.startsWith('data:image/'))
      return res.status(400).json({ error: 'Invalid avatar format. Must be Base64 data URI.' });

    const base64Length = avatarBase64.length;
    const sizeInMB = (base64Length * 0.75) / (1024 * 1024);
    if (sizeInMB > 2)
      return res.status(400).json({ error: `Avatar too large (${sizeInMB.toFixed(2)}MB). Maximum is 2MB.` });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING avatar_url',
        [avatarBase64, user.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      console.log(`📸 Avatar updated for user ${user.id} (${sizeInMB.toFixed(2)}MB Base64)`);
      res.status(200).json({
        success: true,
        avatarUrl: result.rows[0].avatar_url,
        message: 'Avatar updated successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/update-avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* -------------------------------------------
   NEW: Счётчик мяу (daily up to 42)
------------------------------------------- */

router.post('/meow-counter', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const todayStr = getTashkentDate();

    const client = await pool.connect();
    try {
      const rowRes = await client.query(
        `SELECT COALESCE(meow_taps, 0) AS meow_taps, meow_taps_date
           FROM users
          WHERE telegram_id = $1`,
        [user.id]
      );

      if (rowRes.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const count = await normalizeMeowCounter(client, user.id, rowRes.rows[0], todayStr);

      return res.status(200).json(buildMeowResponse(count));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/meow-counter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/meow-tap', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const now = Date.now();
    const last = meowTapThrottle.get(user.id) || 0;

    const todayStr = getTashkentDate();

    const client = await pool.connect();
    try {
      // If throttled, DO NOT advance the throttle window; just return current value.
      if (now - last < TAP_COOLDOWN_MS) {
        const row = await client.query(
          `SELECT COALESCE(meow_taps, 0) AS meow_taps, meow_taps_date
             FROM users
            WHERE telegram_id = $1`,
          [user.id]
        );

        if (row.rowCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const count = await normalizeMeowCounter(client, user.id, row.rows[0], todayStr);

        // Do NOT set throttle timestamp here
        return res.status(200).json({
          ...buildMeowResponse(count),
          throttled: true,
        });
      }

      await client.query('BEGIN');

      // Lock row, read current taps
      const rowRes = await client.query(
        `SELECT COALESCE(meow_taps, 0) AS meow_taps, meow_taps_date
           FROM users
          WHERE telegram_id = $1
          FOR UPDATE`,
        [user.id]
      );
      if (rowRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      let meow_taps = await normalizeMeowCounter(client, user.id, rowRes.rows[0], todayStr);

      if (meow_taps >= MEOW_DAILY_CAP) {
        await client.query('COMMIT');
        // Advance throttle window on terminal (locked) response
        meowTapThrottle.set(user.id, now);
        return res.status(200).json(buildMeowResponse(meow_taps));
      }

      const newTaps = meow_taps + 1;
      await client.query(
        `UPDATE users
           SET meow_taps = $1, meow_taps_date = $2
         WHERE telegram_id = $3`,
        [newTaps, todayStr, user.id]
      );

      await client.query('COMMIT');
      // Advance throttle window only on successful increment
      meowTapThrottle.set(user.id, now);

      return res.status(200).json(buildMeowResponse(newTaps));
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

export default router;

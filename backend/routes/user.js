// Path: backend/routes/user.js
// v11 — Move meow daily reset out of read endpoints (cron handles reset at Tashkent midnight)

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

      // --- Derived daily metrics (display correctness) ---
      // 1) Today's high score (Asia/Tashkent)
      const highTodayResult = await client.query(
        `SELECT COALESCE(MAX(score), 0) AS high_today
           FROM game_sessions
          WHERE user_id = $1
            AND (ended_at AT TIME ZONE 'Asia/Tashkent')::date = $2::date`,
        [user.id, todayStr]
      );
      userData.high_score_today = Number(highTodayResult.rows[0]?.high_today || 0);

      // 2) Display streak from consecutive play-days ending today
      const recentDatesResult = await client.query(
        `SELECT DISTINCT (ended_at AT TIME ZONE 'Asia/Tashkent')::date AS d
           FROM game_sessions
          WHERE user_id = $1
            AND (ended_at AT TIME ZONE 'Asia/Tashkent')::date >= ($2::date - INTERVAL '60 days')
          ORDER BY d DESC`,
        [user.id, todayStr]
      );
      const dateSet = new Set(recentDatesResult.rows.map(r => String(r.d)));
      let streakFromSessions = 0;
      let cursor = new Date(`${todayStr}T00:00:00Z`);
      for (let i = 0; i < 60; i++) {
        const y = cursor.toISOString().slice(0, 10);
        if (dateSet.has(y)) {
          streakFromSessions += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
          break;
        }
      }
      userData.daily_streak = streakFromSessions;

      res.status(200).json(userData);
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
      const [
        userResult,
        avgResult,
        inventoryResult,
        shopItemsResult,
        userShopResult,
        rankResult
      ] = await Promise.all([
        client.query(
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
        ),
        client.query('SELECT AVG(score) as avg_score FROM game_sessions WHERE user_id = $1', [user.id]),
        client.query('SELECT item_id, quantity FROM user_inventory WHERE user_id = $1', [user.id]),
        client.query('SELECT * FROM shop_items ORDER BY id ASC'),
        client.query('SELECT points, point_booster_expires_at FROM users WHERE telegram_id = $1', [user.id]),
        client.query(
          `SELECT COUNT(*) + 1 as rank
           FROM users
           WHERE points > (SELECT points FROM users WHERE telegram_id = $1)`,
          [user.id]
        )
      ]);

      if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      const userData = userResult.rows[0];

      // No mutation here: daily meow reset occurs in cron at Tashkent midnight.
      const todayStr = getTashkentDate();

      userData.averageScore = Math.floor(avgResult.rows[0]?.avg_score || 0);
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      userData.rank = rankResult.rows[0]?.rank || null;

      // --- Derived daily metrics (display correctness) ---

      // 1) Today's high score (Asia/Tashkent)
      const highTodayResult = await client.query(
        `SELECT COALESCE(MAX(score), 0) AS high_today
           FROM game_sessions
          WHERE user_id = $1
            AND (ended_at AT TIME ZONE 'Asia/Tashkent')::date = $2::date`,
        [user.id, todayStr]
      );
      userData.high_score_today = Number(highTodayResult.rows[0]?.high_today || 0);

      // 2) Display streak from consecutive play-days ending today
      const recentDatesResult = await client.query(
        `SELECT DISTINCT (ended_at AT TIME ZONE 'Asia/Tashkent')::date AS d
           FROM game_sessions
          WHERE user_id = $1
            AND (ended_at AT TIME ZONE 'Asia/Tashkent')::date >= ($2::date - INTERVAL '60 days')
          ORDER BY d DESC`,
        [user.id, todayStr]
      );
      const dateSet = new Set(recentDatesResult.rows.map(r => String(r.d)));
      let streakFromSessions = 0;
      let cursor = new Date(`${todayStr}T00:00:00Z`);
      for (let i = 0; i < 60; i++) {
        const y = cursor.toISOString().slice(0, 10);
        if (dateSet.has(y)) {
          streakFromSessions += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
          break;
        }
      }
      const currentStreak = streakFromSessions;

      // Keep the claim-state logic (unchanged), but use display streak value
      const lastLoginDate = userData.last_login_date;
      const streakClaimedToday = userData.streak_claimed_today || false;
      const diffDays = calculateDateDiff(lastLoginDate, todayStr);

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

      userData.daily_streak = currentStreak;
      userData.streakInfo = { canClaim, state, currentStreak, potentialBonus, message };

      // Power uses today's high score (not lifetime)
      const points_total = Number(userData.points || 0);
      const vip_level = Number(userData.vip_level || 0);
      const highest_score_today = Number(userData.high_score_today || 0);
      const invited_friends = 0;
      const power = Math.round(
        100 +
        points_total * 0.00005 +
        currentStreak * 15 +
        vip_level * 50 +
        highest_score_today * 0.001 +
        invited_friends * 20
      );
      userData.power = power;

      const shopData = {
        items: shopItemsResult.rows,
        userPoints: userShopResult.rows[0]?.points || 0,
        inventory: inventoryResult.rows,
        boosterActive:
          userShopResult.rows[0]?.point_booster_expires_at &&
          new Date(userShopResult.rows[0].point_booster_expires_at) > new Date(),
        boosterExpiresAt: userShopResult.rows[0]?.point_booster_expires_at || null
      };

      res.status(200).json({ stats: userData, shopData });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-profile-complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* -------------------------------------------
   PROFILE UPDATE / AVATAR
------------------------------------------- */

router.post('/update-profile', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { firstName } = req.body;

    if (!firstName || firstName.trim().length === 0)
      return res.status(400).json({ error: 'First name is required' });
    if (firstName.trim().length > 50)
      return res.status(400).json({ error: 'First name too long (max 50 characters)' });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET first_name = $1 WHERE telegram_id = $2 RETURNING first_name',
        [firstName.trim(), user.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      res.status(200).json({
        success: true,
        firstName: result.rows[0].first_name,
        message: 'Profile updated successfully'
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

        let meow = row.rows[0]?.meow_taps ?? 0;
        const meowDate = row.rows[0]?.meow_taps_date;
        // Ensure date correctness: if stored date is older, show 0
        if (!meowDate || String(meowDate).slice(0,10) !== todayStr) {
          meow = 0;
        }

        // Do NOT set throttle timestamp here
        return res.status(200).json({
          meow_taps: meow,
          locked: meow >= 42,
          remaining: Math.max(42 - meow, 0),
          throttled: true
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

      let { meow_taps, meow_taps_date } = rowRes.rows[0];

      // Reset if first tap of the day (SQL date semantics via stored value check)
      if (!meow_taps_date || String(meow_taps_date).slice(0,10) !== todayStr) {
        meow_taps = 0;
        meow_taps_date = todayStr;
        await client.query(
          `UPDATE users SET meow_taps = 0, meow_taps_date = $1 WHERE telegram_id = $2`,
          [todayStr, user.id]
        );
      }

      if (meow_taps >= 42) {
        await client.query('COMMIT');
        // Advance throttle window on terminal (locked) response
        meowTapThrottle.set(user.id, now);
        return res.status(200).json({ meow_taps: 42, locked: true, remaining: 0 });
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

      return res.status(200).json({
        meow_taps: newTaps,
        locked: newTaps >= 42,
        remaining: Math.max(42 - newTaps, 0)
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

export default router;

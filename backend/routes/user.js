// backend/routes/user.js
// v21 — Atomic /meow-tap with batching: optional `inc` to apply multiple taps in one request
// Reduces latency when user taps quickly by flushing queued taps at once (capped at 42).

import express from 'express';
import { pool } from '../config/database.js';
import { validate } from '../utils.js';
import { validateUser } from '../middleware/auth.js';
import { getTashkentDate, calculateDateDiff } from '../utils/timezone.js';

const router = express.Router();
const { BOT_TOKEN } = process.env;

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
      const diffDays = calculateDateDiff(lastLoginDate ? String(lastLoginDate).slice(0, 10) : null, todayStr);

      let canClaim = false;
      let state = 'CLAIMED';
      let potentialBonus = 0;
      let message = '';

      if (lastLoginDate === null) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500; // FIXED BUG 3: was 100
        message = 'Claim your first streak!';
      } else if (diffDays === 0 && streakClaimedToday) {
        canClaim = false;
        state = 'CLAIMED';
        message = 'Streak already claimed today';
      } else if (diffDays === 0 && !streakClaimedToday) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500 * (currentStreak + 1); // FIXED BUG 3: was 100 * (currentStreak + 1)
        message = `Claim your day ${currentStreak + 1} streak!`;
      } else if (diffDays === 1) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500 * (currentStreak + 1); // FIXED BUG 3: was 100 * (currentStreak + 1)
        message = `Continue your ${currentStreak}-day streak!`;
      } else if (diffDays > 1) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500; // FIXED BUG 3: was 100
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

      const todayStr = getTashkentDate();

      // DISPLAY-ONLY DAY GUARD
      if (!userData.meow_taps_date || String(userData.meow_taps_date).slice(0,10) !== todayStr) {
        userData.meow_taps = 0;
        userData.meow_taps_date = todayStr;
      }

      const highTodayResult = await client.query(
        `SELECT COALESCE(MAX(score), 0) AS high_today
           FROM game_sessions
          WHERE user_id = $1
            AND (ended_at AT TIME ZONE 'Asia/Tashkent')::date = $2::date`,
        [user.id, todayStr]
      );
      userData.high_score_today = Number(highTodayResult.rows[0]?.high_today || 0);

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
      const todayStr = getTashkentDate();

      // DISPLAY-ONLY DAY GUARD
      if (!userData.meow_taps_date || String(userData.meow_taps_date).slice(0,10) !== todayStr) {
        userData.meow_taps = 0;
        userData.meow_taps_date = todayStr;
      }

      userData.averageScore = Math.floor(avgResult.rows[0]?.avg_score || 0);
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      userData.rank = rankResult.rows[0]?.rank || null;

      const highTodayResult = await client.query(
        `SELECT COALESCE(MAX(score), 0) AS high_today
           FROM game_sessions
          WHERE user_id = $1
            AND (ended_at AT TIME ZONE 'Asia/Tashkent')::date = $2::date`,
        [user.id, todayStr]
      );
      userData.high_score_today = Number(highTodayResult.rows[0]?.high_today || 0);

      const currentStreak = Number(userData.daily_streak || 0);
      const lastLoginDate = userData.last_login_date;
      const streakClaimedToday = userData.streak_claimed_today || false;
      const diffDays = calculateDateDiff(lastLoginDate ? String(lastLoginDate).slice(0, 10) : null, todayStr);

      let canClaim = false;
      let state = 'CLAIMED';
      let potentialBonus = 0;
      let message = '';

      if (lastLoginDate === null) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500; // FIXED BUG 3: was 100
        message = 'Claim your first streak!';
      } else if (diffDays === 0 && streakClaimedToday) {
        canClaim = false;
        state = 'CLAIMED';
        message = 'Streak already claimed today';
      } else if (diffDays === 0 && !streakClaimedToday) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500 * (currentStreak + 1); // FIXED BUG 3: was 100 * (currentStreak + 1)
        message = `Claim your day ${currentStreak + 1} streak!`;
      } else if (diffDays === 1) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500 * (currentStreak + 1); // FIXED BUG 3: was 100 * (currentStreak + 1)
        message = `Continue your ${currentStreak}-day streak!`;
      } else if (diffDays > 1) {
        canClaim = true;
        state = 'ELIGIBLE';
        potentialBonus = 500; // FIXED BUG 3: was 100
        message = 'Streak reset - start fresh!';
      }

      userData.streakInfo = { canClaim, state, currentStreak, potentialBonus, message };

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
   Счётчик мяу (daily up to 42)
   v21: ATOMIC single UPDATE with batching via `inc`
------------------------------------------- */

router.post('/meow-tap', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const todayStr = getTashkentDate(); // YYYY-MM-DD in Asia/Tashkent

    // Accept optional batch size; sanitize to 1..42
    let inc = 1;
    if (req.body && typeof req.body.inc !== 'undefined') {
      const n = parseInt(req.body.inc, 10);
      if (Number.isFinite(n)) inc = Math.max(1, Math.min(42, n));
    }

    const client = await pool.connect();
    try {
      const upd = await client.query(
        `UPDATE users
           SET meow_taps = LEAST(42,
                 CASE WHEN meow_taps_date IS NOT NULL AND (meow_taps_date AT TIME ZONE 'Asia/Tashkent')::date = $2::date
                      THEN COALESCE(meow_taps, 0) + $3
                      ELSE LEAST(42, $3) END
               ),
               meow_taps_date = (now() AT TIME ZONE 'Asia/Tashkent')
         WHERE telegram_id = $1
         RETURNING COALESCE(meow_taps,0) AS meow_taps, meow_taps_date`,
        [user.id, todayStr, inc]
      );

      if (upd.rowCount === 0) return res.status(404).json({ error: 'User not found' });

      const row = upd.rows[0];
      const taps = Number(row.meow_taps || 0);
      return res.status(200).json({
        meow_taps: taps,
        locked: taps >= 42,
        remaining: Math.max(42 - taps, 0)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/meow-tap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

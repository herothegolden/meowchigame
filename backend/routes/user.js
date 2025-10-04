// Path: backend/routes/user.js

import express from 'express';
import multer from 'multer';
import { pool } from '../config/database.js';
import { validate } from '../utils.js';
import { validateUser } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = express.Router();
const { BOT_TOKEN, PORT } = process.env;

// ---- VALIDATE & LOGIN ----
router.post('/validate', async (req, res) => {
  try {
    const isValid = validate(req.body.initData, BOT_TOKEN);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid Telegram initData' });
    }

    const params = new URLSearchParams(req.body.initData);
    const userString = params.get('user');
    
    if (!userString) {
      return res.status(400).json({ error: 'Missing user data in initData' });
    }
    
    const user = JSON.parse(userString);
    
    if (!user || !user.id) {
      return res.status(400).json({ error: 'Invalid user data in initData' });
    }

    const client = await pool.connect();
    try {
      let dbUserResult = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [user.id]
      );
      let appUser;
      let dailyBonus = null;

      if (dbUserResult.rows.length === 0) {
        console.log(`👤 Creating new user: ${user.first_name} (@${user.username || 'no-username'}) (${user.id})`);
        
        const insertResult = await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.id, user.first_name, user.last_name, user.username]
        );
        appUser = insertResult.rows[0];
        
        await client.query(`
          UPDATE global_stats 
          SET new_players_today = new_players_today + 1,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
        `);
        
      } else {
        appUser = dbUserResult.rows[0];

        const needsUpdate = 
          appUser.first_name !== user.first_name || 
          appUser.last_name !== user.last_name || 
          appUser.username !== user.username;
        
        if (needsUpdate) {
          console.log(`🔄 Updating user info for ${user.id}`);
          
          const updateResult = await client.query(
            `UPDATE users SET
             first_name = $1, last_name = $2, username = $3
             WHERE telegram_id = $4 RETURNING *`,
            [user.first_name, user.last_name, user.username, user.id]
          );
          appUser = updateResult.rows[0];
        }

        const lastLogin = appUser.last_login_at;
        const now = new Date();
        
        if (!lastLogin || (now - new Date(lastLogin)) >= 24 * 60 * 60 * 1000) {
          console.log(`🎁 Daily bonus for user ${user.id}`);
          
          const hoursSinceLastLogin = lastLogin ? (now - new Date(lastLogin)) / (1000 * 60 * 60) : null;
          const streakValid = hoursSinceLastLogin && hoursSinceLastLogin < 48;
          const newStreak = streakValid ? appUser.daily_streak + 1 : 1;
          const bonusPoints = 100 * newStreak;
          const newPoints = appUser.points + bonusPoints;
          dailyBonus = { points: bonusPoints, streak: newStreak };

          const updateResult = await client.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, daily_streak = $2, points = $3 WHERE telegram_id = $1 RETURNING *',
            [user.id, newStreak, newPoints]
          );
          appUser = updateResult.rows[0];
        }
      }

      const userCount = await client.query('SELECT COUNT(*) as count FROM users WHERE last_login_at > NOW() - INTERVAL \'1 hour\'');
      const activeCount = Math.max(37, parseInt(userCount.rows[0].count));
      
      await client.query(`
        UPDATE global_stats 
        SET active_players = $1,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [activeCount]);

      console.log(`✅ User ${user.id} (@${user.username || 'no-username'}) validated successfully`);
      res.status(200).json({ ...appUser, dailyBonus });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- GET USER STATS ----
router.post('/get-user-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [userResult, badgesResult] = await Promise.all([
        client.query(
          `SELECT first_name, username, points, level, daily_streak, created_at,
           games_played, high_score, total_play_time, avatar_url, vip_level FROM users WHERE telegram_id = $1`, 
          [user.id]
        ),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userResult.rows[0];
      userData.ownedBadges = badgesResult.rows.map(row => row.badge_name);
      
      const avgResult = await client.query(
        'SELECT AVG(score) as avg_score FROM game_sessions WHERE user_id = $1',
        [user.id]
      );
      userData.averageScore = Math.floor(avgResult.rows[0]?.avg_score || 0);
      
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      
      res.status(200).json(userData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-user-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- GET COMPLETE PROFILE ----
router.post('/get-profile-complete', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [userResult, badgesResult, avgResult, progressResult, inventoryResult, shopItemsResult, userShopResult, rankResult] = await Promise.all([
        client.query(
          `SELECT first_name, username, points, level, daily_streak, created_at,
           games_played, high_score, total_play_time, avatar_url, vip_level FROM users WHERE telegram_id = $1`, 
          [user.id]
        ),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id]),
        client.query('SELECT AVG(score) as avg_score FROM game_sessions WHERE user_id = $1', [user.id]),
        client.query('SELECT badge_name, current_progress, target_progress FROM badge_progress WHERE user_id = $1', [user.id]),
        client.query('SELECT item_id, quantity FROM user_inventory WHERE user_id = $1', [user.id]),
        client.query('SELECT * FROM shop_items ORDER BY id ASC'),
        client.query('SELECT points, point_booster_expires_at FROM users WHERE telegram_id = $1', [user.id]),
        client.query(`
          SELECT COUNT(*) + 1 as rank
          FROM users
          WHERE points > (SELECT points FROM users WHERE telegram_id = $1)
        `, [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userResult.rows[0];
      userData.ownedBadges = badgesResult.rows.map(row => row.badge_name);
      userData.averageScore = Math.floor(avgResult.rows[0]?.avg_score || 0);
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      userData.rank = rankResult.rows[0]?.rank || null;
      
      const progress = {};
      progressResult.rows.forEach(row => {
        progress[row.badge_name] = Math.round((row.current_progress / row.target_progress) * 100);
      });
      
      const shopData = {
        items: shopItemsResult.rows,
        userPoints: userShopResult.rows[0]?.points || 0,
        inventory: inventoryResult.rows,
        boosterActive: userShopResult.rows[0]?.point_booster_expires_at && 
                      new Date(userShopResult.rows[0].point_booster_expires_at) > new Date(),
        boosterExpiresAt: userShopResult.rows[0]?.point_booster_expires_at || null,
        ownedBadges: badgesResult.rows.map(row => row.badge_name)
      };
      
      res.status(200).json({
        stats: userData,
        badgeProgress: { progress },
        shopData: shopData
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-profile-complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- UPDATE PROFILE ----
router.post('/update-profile', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { firstName } = req.body;
    
    if (!firstName || firstName.trim().length === 0) {
      return res.status(400).json({ error: 'First name is required' });
    }
    
    if (firstName.trim().length > 50) {
      return res.status(400).json({ error: 'First name too long (max 50 characters)' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET first_name = $1 WHERE telegram_id = $2 RETURNING first_name',
        [firstName.trim(), user.id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
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

// ---- UPDATE AVATAR (FIXED: Store relative path only) ----
router.post('/update-avatar', (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    try {
      const initData = req.body.initData;
      
      if (!initData) {
        return res.status(400).json({ error: 'initData is required' });
      }

      if (!validate(initData, BOT_TOKEN)) {
        return res.status(401).json({ error: 'Invalid authentication' });
      }

      const params = new URLSearchParams(initData);
      const userString = params.get('user');
      if (!userString) {
        return res.status(400).json({ error: 'Invalid user data' });
      }
      const user = JSON.parse(userString);

      let avatarPath;

      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
          }
        }
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }

      if (req.file) {
        // FIXED: Store relative path only (not full URL)
        avatarPath = `/uploads/avatars/${req.file.filename}`;
        console.log(`📸 Avatar uploaded for user ${user.id}: ${avatarPath}`);
      } else {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING avatar_url',
          [avatarPath, user.id]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

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
});

export default router;

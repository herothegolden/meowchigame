import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// Helper function for badge progress updates
const updateBadgeProgress = async (client, userId, score, gamesPlayed, highScore) => {
  const badgeUpdates = [
    {
      name: 'Cookie Master Badge',
      current: Math.floor(score),
      target: 5000,
      condition: score >= 5000
    },
    {
      name: 'Speed Demon Badge',
      current: Math.floor(gamesPlayed >= 10 ? 75 : gamesPlayed * 7.5),
      target: 100,
      condition: false
    },
    {
      name: 'Champion Badge',
      current: Math.floor(highScore >= 3000 ? 25 : Math.floor(highScore / 120)),
      target: 100,
      condition: false
    }
  ];

  for (const badge of badgeUpdates) {
    await client.query(
      `INSERT INTO badge_progress (user_id, badge_name, current_progress, target_progress)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, badge_name)
       DO UPDATE SET current_progress = GREATEST(badge_progress.current_progress, $3), updated_at = CURRENT_TIMESTAMP`,
      [userId, badge.name, badge.current, badge.target]
    );

    if (badge.condition) {
      await client.query(
        `INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, badge.name]
      );
    }
  }
};

// ---- UPDATE SCORE ----
router.post('/update-score', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { score, duration = 30, itemsUsed = [] } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const baseScore = Math.floor(Number(score) || 0);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT points, point_booster_expires_at, high_score, games_played FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      if (userResult.rowCount === 0) throw new Error('User not found');

      const { points, point_booster_expires_at, high_score, games_played } = userResult.rows[0];
      const boosterActive = point_booster_expires_at && new Date(point_booster_expires_at) > new Date();
      const finalScore = boosterActive ? baseScore * 2 : baseScore;
      const newPoints = points + finalScore;
      const newHighScore = Math.max(high_score || 0, finalScore);
      const newGamesPlayed = (games_played || 0) + 1;

      console.log("Saving score:", finalScore);

      // 🔒 DEDUPE GUARD (tighter, fewer false positives)
      // Treat as duplicate ONLY if the same user has an identical session recorded
      // within the last 2 seconds with the same score, duration, boost multiplier, and items_used.
      const boostMult = boosterActive ? 2.0 : 1.0;
      const itemsJson = JSON.stringify(itemsUsed || []);

      const dupCheck = await client.query(
        `SELECT id
           FROM game_sessions
          WHERE user_id = $1
            AND score = $2
            AND duration = $3
            AND boost_multiplier = $4
            AND items_used::text = $5::text
            AND created_at >= NOW() - INTERVAL '2 seconds'
          ORDER BY id DESC
          LIMIT 1`,
        [user.id, finalScore, duration, boostMult, itemsJson]
      );

      if (dupCheck.rowCount > 0) {
        const current = await client.query(
          'SELECT points FROM users WHERE telegram_id = $1',
          [user.id]
        );
        await client.query('COMMIT');
        return res.status(200).json({
          new_points: current.rows[0].points,
          score_awarded: 0,
          session_id: dupCheck.rows[0].id,
          duplicate: true
        });
      }

      const sessionResult = await client.query(
        `INSERT INTO game_sessions (user_id, score, duration, items_used, boost_multiplier)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, finalScore, duration, itemsJson, boostMult]
      );

      const sessionId = sessionResult.rows[0].id;

      const updateResult = await client.query(
        `UPDATE users SET
         points = $1,
         point_booster_active = FALSE,
         point_booster_expires_at = NULL,
         high_score = $3,
         games_played = $4,
         total_play_time = total_play_time + $5
         WHERE telegram_id = $2 RETURNING points`,
        [newPoints, user.id, newHighScore, newGamesPlayed, duration]
      );

      await updateBadgeProgress(client, user.id, finalScore, newGamesPlayed, newHighScore);
      await client.query('COMMIT');

      return res.status(200).json({
        new_points: updateResult.rows[0].points,
        score_awarded: finalScore,
        session_id: sessionId
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/update-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- USE TIME BOOSTER ----
router.post('/use-time-booster', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId, timeBonus } = req.body;

    if (!itemId || itemId !== 1) {
      return res.status(400).json({ error: 'Only Extra Time +10s can be used this way.' });
    }
    if (!timeBonus || timeBonus !== 10) {
      return res.status(400).json({ error: 'Invalid time bonus value.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inventoryResult = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND item_id = $2',
        [user.id, itemId]
      );
      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'You do not own this item.' });
      }

      const quantity = inventoryResult.rows[0].quantity;
      if (quantity > 1) {
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name)
         VALUES ($1, $2, 'Extra Time +10s')`,
        [user.id, itemId]
      );

      await client.query('COMMIT');
      console.log(`⏰ Extra Time +10s used by user ${user.id}`);

      res.status(200).json({
        success: true,
        message: 'Extra Time +10s used successfully!',
        timeBonus: timeBonus
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/use-time-booster:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- ACTIVATE ITEM (Double Points) ----
router.post('/activate-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    if (!itemId || itemId !== 4) {
      return res.status(400).json({ error: 'Only Double Points can be activated this way.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inventoryResult = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND item_id = $2',
        [user.id, itemId]
      );

      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'You do not own this item.' });
      }

      const quantity = inventoryResult.rows[0].quantity;
      if (quantity > 1) {
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      const expirationTime = new Date(Date.now() + 20000);
      await client.query(
        'UPDATE users SET point_booster_active = TRUE, point_booster_expires_at = $1 WHERE telegram_id = $2',
        [expirationTime, user.id]
      );

      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name)
         VALUES ($1, $2, 'Double Points')`,
        [user.id, itemId]
      );

      await client.query('COMMIT');
      console.log(`⚡ Point booster activated for user ${user.id} (expires in 20s)`);

      res.status(200).json({
        success: true,
        message: 'Point Booster activated for 20 seconds!',
        expiresAt: expirationTime.toISOString()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/activate-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- USE BOMB ----
router.post('/use-bomb', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    if (!itemId || itemId !== 3) {
      return res.status(400).json({ error: 'Only Cookie Bomb can be used this way.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inventoryResult = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND item_id = $2',
        [user.id, itemId]
      );

      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'You do not own this item.' });
      }

      const quantity = inventoryResult.rows[0].quantity;
      if (quantity > 1) {
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name)
         VALUES ($1, $2, 'Cookie Bomb')`,
        [user.id, itemId]
      );

      await client.query('COMMIT');
      console.log(`💥 Cookie Bomb used by user ${user.id}`);

      res.status(200).json({
        success: true,
        message: 'Cookie Bomb used successfully!'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/use-bomb:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- GET ITEM USAGE HISTORY ----
router.post('/get-item-usage-history', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const historyResult = await client.query(
        `SELECT item_name, used_at, game_score
         FROM item_usage_history
         WHERE user_id = $1
         ORDER BY used_at DESC
         LIMIT 20`,
        [user.id]
      );
      res.status(200).json(historyResult.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-item-usage-history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------
   ✅ NEW ENDPOINT — RECORD GAME TIME (Zen Level)
   ------------------------------------------------------------ */
router.post('/game/record-time', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { duration = 0 } = req.body;

    if (typeof duration !== 'number' || duration <= 0) {
      return res.status(400).json({ error: 'Invalid duration value' });
    }

    const result = await pool.query(
      `UPDATE users
       SET total_play_time = COALESCE(total_play_time, 0) + $1
       WHERE telegram_id = $2
       RETURNING total_play_time`,
      [duration, user.id]
    );

    console.log(`🧘 Zen time recorded for ${user.id}: +${duration}s`);
    res.status(200).json({ success: true, total_play_time: result.rows[0].total_play_time });
  } catch (error) {
    console.error('🚨 Error in /api/game/record-time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// ---- ADD FRIEND ----
router.post('/friends/add', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const client = await pool.connect();
    try {
      const friendResult = await client.query(
        'SELECT telegram_id, first_name FROM users WHERE LOWER(username) = LOWER($1)',
        [friendUsername]
      );

      if (friendResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const friend = friendResult.rows[0];

      if (friend.telegram_id.toString() === user.id.toString()) {
        return res.status(400).json({ error: 'Cannot add yourself as a friend' });
      }

      await client.query(
        'INSERT INTO user_friends (user_id, friend_username, friend_telegram_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [user.id, friendUsername, friend.telegram_id]
      );

      res.status(200).json({
        success: true,
        friendName: friend.first_name,
        message: `Added ${friend.first_name} as a friend`
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/friends/add:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- LEGACY ALIAS: ADD FRIEND ----
router.post('/add-friend', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const client = await pool.connect();
    try {
      const friendResult = await client.query(
        'SELECT telegram_id, first_name FROM users WHERE LOWER(username) = LOWER($1)',
        [friendUsername]
      );

      if (friendResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const friend = friendResult.rows[0];

      if (friend.telegram_id.toString() === user.id.toString()) {
        return res.status(400).json({ error: 'Cannot add yourself as a friend' });
      }

      await client.query(
        'INSERT INTO user_friends (user_id, friend_username, friend_telegram_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [user.id, friendUsername, friend.telegram_id]
      );

      res.status(200).json({
        success: true,
        friendName: friend.first_name,
        message: `Added ${friend.first_name} as a friend`
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/add-friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- REMOVE FRIEND ----
router.post('/friends/remove', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_friends WHERE user_id = $1 AND LOWER(friend_username) = LOWER($2) RETURNING friend_username',
        [user.id, friendUsername]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Friend not found in your list' });
      }

      res.status(200).json({
        success: true,
        message: `Removed ${friendUsername} from friends`
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/friends/remove:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- LEGACY ALIAS: REMOVE FRIEND ----
router.post('/remove-friend', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_friends WHERE user_id = $1 AND LOWER(friend_username) = LOWER($2) RETURNING friend_username',
        [user.id, friendUsername]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Friend not found in your list' });
      }

      res.status(200).json({
        success: true,
        message: `Removed ${friendUsername} from friends`
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/remove-friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- LIST FRIENDS ----
router.post('/friends/list', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT u.telegram_id, u.first_name, u.username, u.points, u.avatar_url, uf.added_at
        FROM user_friends uf
        JOIN users u ON uf.friend_telegram_id = u.telegram_id
        WHERE uf.user_id = $1
        ORDER BY uf.added_at DESC
      `, [user.id]);

      const friends = result.rows.map(row => ({
        userId: row.telegram_id,
        name: row.first_name,
        username: row.username,
        points: row.points,
        avatarUrl: row.avatar_url,
        addedAt: row.added_at
      }));

      res.status(200).json({ friends });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/friends/list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

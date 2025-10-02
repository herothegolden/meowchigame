import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// ---- GET LEADERBOARD ----
router.post('/get-leaderboard', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { type = 'global' } = req.body;
    const client = await pool.connect();
    try {
      let query;
      let params = [];

      if (type === 'friends') {
        query = `
          SELECT u.telegram_id, u.first_name, u.username, u.points, u.avatar_url,
                 ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
          FROM users u
          INNER JOIN user_friends uf ON (uf.friend_telegram_id = u.telegram_id AND uf.user_id = $1)
             OR u.telegram_id = $1
          ORDER BY u.points DESC
          LIMIT 50
        `;
        params = [user.id];
      } else {
        query = `
          SELECT telegram_id, first_name, username, points, avatar_url,
                 ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM users
          ORDER BY points DESC
          LIMIT 50
        `;
      }

      const result = await client.query(query, params);
      
      const leaderboard = result.rows.map(row => ({
        rank: parseInt(row.rank),
        userId: row.telegram_id,
        name: row.first_name,
        username: row.username,
        points: row.points,
        avatarUrl: row.avatar_url,
        isCurrentUser: row.telegram_id.toString() === user.id.toString()
      }));

      const userRank = leaderboard.find(entry => entry.isCurrentUser);

      res.status(200).json({
        leaderboard,
        userRank: userRank ? userRank.rank : null
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

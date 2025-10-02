import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// Helper function to determine badge based on points
const getBadge = (points) => {
  if (points >= 10000) return 'Legend';
  if (points >= 5000) return 'Epic';
  if (points >= 2000) return 'Rare';
  if (points >= 500) return 'Common';
  return null;
};

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
          SELECT u.telegram_id, u.first_name, u.username, u.points, u.level, u.avatar_url,
                 ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
          FROM users u
          WHERE u.telegram_id = $1 
             OR u.telegram_id IN (
               SELECT friend_telegram_id 
               FROM user_friends 
               WHERE user_id = $1
             )
          ORDER BY u.points DESC
          LIMIT 50
        `;
        params = [user.id];
      } else if (type === 'weekly') {
        // Weekly leaderboard - points earned in last 7 days
        query = `
          SELECT u.telegram_id, u.first_name, u.username, u.points, u.level, u.avatar_url,
                 ROW_NUMBER() OVER (ORDER BY 
                   COALESCE((SELECT SUM(score) FROM game_sessions 
                            WHERE user_id = u.telegram_id 
                            AND started_at > NOW() - INTERVAL '7 days'), 0) DESC
                 ) as rank,
                 COALESCE((SELECT SUM(score) FROM game_sessions 
                          WHERE user_id = u.telegram_id 
                          AND started_at > NOW() - INTERVAL '7 days'), 0) as weekly_points
          FROM users u
          ORDER BY weekly_points DESC
          LIMIT 50
        `;
      } else {
        // Global leaderboard
        query = `
          SELECT telegram_id, first_name, username, points, level, avatar_url,
                 ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM users
          ORDER BY points DESC
          LIMIT 50
        `;
      }

      const result = await client.query(query, params);
      
      const leaderboard = result.rows.map(row => {
        const points = type === 'weekly' ? (row.weekly_points || 0) : row.points;
        
        return {
          rank: parseInt(row.rank),
          player: {
            name: row.first_name,
            level: row.level || 1,
            username: row.username,
            avatarUrl: row.avatar_url
          },
          score: points,
          badge: getBadge(points),
          isCurrentUser: row.telegram_id.toString() === user.id.toString()
        };
      });

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

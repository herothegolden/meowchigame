import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// ---- GET BADGE PROGRESS ----
router.post('/get-badge-progress', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [progressResult, badgesResult] = await Promise.all([
        client.query(`
          SELECT badge_name, current_progress, target_progress
          FROM badge_progress 
          WHERE user_id = $1
        `, [user.id]),
        client.query(`
          SELECT badge_name, acquired_at
          FROM user_badges 
          WHERE user_id = $1
        `, [user.id])
      ]);
      
      const progress = {};
      progressResult.rows.forEach(row => {
        progress[row.badge_name] = Math.round((row.current_progress / row.target_progress) * 100);
      });
      
      const ownedBadges = badgesResult.rows;
      
      res.status(200).json({
        progress,
        stats: {
          totalBadges: 5,
          unlockedBadges: ownedBadges.length,
          rarityBreakdown: {
            common: 0,
            uncommon: ownedBadges.filter(b => b.badge_name.includes('Bomb')).length,
            rare: ownedBadges.filter(b => b.badge_name.includes('Cookie Master') || b.badge_name.includes('Streak')).length,
            epic: ownedBadges.filter(b => b.badge_name.includes('Speed')).length,
            legendary: ownedBadges.filter(b => b.badge_name.includes('Champion')).length
          }
        }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-badge-progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

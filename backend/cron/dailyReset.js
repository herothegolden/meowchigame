// Path: backend/cron/dailyReset.js

import cron from 'node-cron';
import { pool } from '../config/database.js';

/**
 * Schedule daily reset of streak_claimed_today flag at midnight Tashkent time
 * Runs at 19:00 UTC = 00:00 Asia/Tashkent (UTC+5)
 */
export const scheduleDailyReset = () => {
  // Cron pattern: '0 19 * * *' = Every day at 19:00 UTC (midnight Tashkent)
  // Fields: minute hour day month day-of-week
  cron.schedule('0 19 * * *', async () => {
    const client = await pool.connect();
    
    try {
      console.log('🌙 Running daily streak reset at midnight Tashkent time...');
      
      // Reset streak_claimed_today flag for all users
      const result = await client.query(
        'UPDATE users SET streak_claimed_today = false'
      );
      
      const usersReset = result.rowCount;
      console.log(`✅ Daily reset complete: ${usersReset} users can now claim their streak`);
      
    } catch (error) {
      console.error('🚨 Error during daily streak reset:', error);
    } finally {
      client.release();
    }
  }, {
    timezone: 'Asia/Tashkent'
  });

  console.log('⏰ Daily streak reset cron job scheduled for 00:00 Asia/Tashkent (19:00 UTC)');
};

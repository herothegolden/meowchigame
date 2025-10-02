import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Simulation state tracking
let simulationActive = {
  eaten: false,
  newPlayers: false,
  activePlayers: false
};

// Helper function to check if current time is within active hours (10AM-10PM Tashkent time)
const isActiveHoursTashkent = () => {
  const now = new Date();
  const tashkentHour = (now.getUTCHours() + 5) % 24;
  return tashkentHour >= 10 && tashkentHour < 22;
};

// ---- GET GLOBAL STATS ----
router.get('/global-stats', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const statsResult = await client.query('SELECT * FROM global_stats WHERE id = 1');
      
      if (statsResult.rowCount === 0) {
        return res.status(500).json({ error: 'Stats not initialized' });
      }

      const stats = statsResult.rows[0];
      
      const resetCheck = await client.query(`
        SELECT (last_daily_reset < CURRENT_DATE) as needs_reset 
        FROM global_stats 
        WHERE id = 1
      `);
      
      const needsReset = resetCheck.rows[0]?.needs_reset || false;

      if (needsReset) {
        console.log('📅 Resetting daily stats for new day');
        await client.query(`
          UPDATE global_stats 
          SET total_eaten_today = 0,
              new_players_today = 0,
              last_daily_reset = CURRENT_DATE,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
          RETURNING *
        `);
        
        const updatedStats = await client.query('SELECT * FROM global_stats WHERE id = 1');
        return res.status(200).json(updatedStats.rows[0]);
      }

      res.status(200).json(stats);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

// ---- DEBUG ENDPOINT ----
router.get('/global-stats/debug', async (req, res) => {
  try {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const tashkentHour = (utcHour + 5) % 24;
    const isActive = tashkentHour >= 10 && tashkentHour < 22;
    
    const client = await pool.connect();
    try {
      const stats = await client.query('SELECT * FROM global_stats WHERE id = 1');
      
      res.status(200).json({
        serverTime: {
          utc: now.toISOString(),
          utcHour: utcHour,
          tashkentHour: tashkentHour,
          isActiveHours: isActive
        },
        stats: stats.rows[0],
        simulationStatus: {
          eatenSimulation: isActive ? 'ACTIVE (10AM-10PM Tashkent)' : 'PAUSED (Outside active hours)',
          newPlayersSimulation: isActive ? 'ACTIVE (10AM-10PM Tashkent)' : 'PAUSED (Outside active hours)',
          activePlayersSimulation: 'ACTIVE (24/7)'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// ---- INCREMENT STATS ----
router.post('/global-stats/increment', async (req, res) => {
  try {
    const { field } = req.body;
    
    if (!['total_eaten_today', 'new_players_today'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }

    const client = await pool.connect();
    try {
      const products = ['Viral Matcha', 'Viral Classic'];
      const newProduct = products[Math.floor(Math.random() * products.length)];

      await client.query(`
        UPDATE global_stats 
        SET ${field} = ${field} + 1,
            just_sold = $1,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `, [newProduct]);

      const result = await client.query('SELECT * FROM global_stats WHERE id = 1');
      console.log(`✅ Incremented ${field} to ${result.rows[0][field]}`);

      res.status(200).json({ success: true, stats: result.rows[0] });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error incrementing stats:', error);
    res.status(500).json({ error: 'Failed to increment stats' });
  }
});

// ---- GLOBAL STATS SIMULATION ----
export const startGlobalStatsSimulation = async (PORT) => {
  console.log('🎮 Starting global stats simulation v4 with Tashkent timezone (UTC+5)...');
  console.log(`⏰ Server UTC time: ${new Date().toISOString()}`);
  console.log(`⏰ Tashkent hour: ${(new Date().getUTCHours() + 5) % 24}:${new Date().getUTCMinutes()}`);
  console.log(`🌍 Active hours (Tashkent): ${isActiveHoursTashkent() ? 'YES ✅' : 'NO ❌'}`);
  
  if (isActiveHoursTashkent()) {
    console.log('⚡ IN ACTIVE HOURS - Triggering immediate first increments...');
    
    try {
      await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'total_eaten_today' })
      });
      console.log('✅ IMMEDIATE: First Meowchi eaten increment done');
    } catch (error) {
      console.error('❌ IMMEDIATE: Failed first eaten increment:', error.message);
    }
    
    try {
      await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'new_players_today' })
      });
      console.log('✅ IMMEDIATE: First new player increment done');
    } catch (error) {
      console.error('❌ IMMEDIATE: Failed first player increment:', error.message);
    }
  } else {
    console.log('⏸️ OUTSIDE ACTIVE HOURS - Waiting for 10 AM Tashkent...');
  }
  
  // Schedule "Eaten" updates
  const scheduleEatenUpdate = () => {
    const checkAndSchedule = () => {
      if (!isActiveHoursTashkent()) {
        console.log('⏸️ [EATEN] Outside active hours, checking again in 10 min...');
        simulationActive.eaten = false;
        setTimeout(checkAndSchedule, 600000);
        return;
      }

      if (!simulationActive.eaten) {
        console.log('▶️ [EATEN] Entering active hours - resuming simulation');
        simulationActive.eaten = true;
      }

      const interval = Math.floor(Math.random() * (1200000 - 60000 + 1)) + 60000;
      console.log(`⏱️ [EATEN] Next increment in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'total_eaten_today' })
          });
          const data = await response.json();
          console.log('🪙 Simulated Meowchi eaten - Total:', data.stats?.total_eaten_today);
        } catch (error) {
          console.error('❌ [EATEN] Increment failed:', error.message);
        }
        checkAndSchedule();
      }, interval);
    };
    
    checkAndSchedule();
  };

  // Schedule "New Players" updates
  const scheduleNewPlayerUpdate = () => {
    const checkAndSchedule = () => {
      if (!isActiveHoursTashkent()) {
        console.log('⏸️ [PLAYERS] Outside active hours, checking again in 10 min...');
        simulationActive.newPlayers = false;
        setTimeout(checkAndSchedule, 600000);
        return;
      }

      if (!simulationActive.newPlayers) {
        console.log('▶️ [PLAYERS] Entering active hours - resuming simulation');
        simulationActive.newPlayers = true;
      }

      const interval = Math.floor(Math.random() * (1800000 - 120000 + 1)) + 120000;
      console.log(`⏱️ [PLAYERS] Next increment in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const statsRes = await fetch(`http://localhost:${PORT}/api/global-stats`);
          const stats = await statsRes.json();
          
          if (stats.new_players_today < 90) {
            const response = await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'new_players_today' })
            });
            const data = await response.json();
            console.log('🎉 Simulated new player joined - Total:', data.stats?.new_players_today);
          } else {
            console.log('🚫 [PLAYERS] Daily limit reached (90)');
          }
        } catch (error) {
          console.error('❌ [PLAYERS] Increment failed:', error.message);
        }
        checkAndSchedule();
      }, interval);
    };
    
    checkAndSchedule();
  };

  // Schedule "Active Players" updates (24/7)
  const scheduleActivePlayersUpdate = () => {
    simulationActive.activePlayers = true;
    console.log('▶️ [ACTIVE] 24/7 simulation started');
    
    const updateAndSchedule = () => {
      const interval = Math.floor(Math.random() * (900000 - 300000 + 1)) + 300000;
      console.log(`⏱️ [ACTIVE] Next update in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const newCount = Math.floor(Math.random() * (150 - 37 + 1)) + 37;
          const client = await pool.connect();
          try {
            await client.query(`
              UPDATE global_stats 
              SET active_players = $1,
                  last_updated = CURRENT_TIMESTAMP
              WHERE id = 1
            `, [newCount]);
            console.log(`💥 Updated active players: ${newCount}`);
          } finally {
            client.release();
          }
        } catch (error) {
          console.error('❌ [ACTIVE] Update failed:', error.message);
        }
        updateAndSchedule();
      }, interval);
    };
    
    updateAndSchedule();
  };

  scheduleEatenUpdate();
  scheduleNewPlayerUpdate();
  scheduleActivePlayersUpdate();
  
  console.log('✅ All simulations scheduled');
};

export default router;

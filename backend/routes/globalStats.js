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

// Helper function to get current Tashkent hour (for time-based interval calculations)
const getTashkentHour = () => {
  const now = new Date();
  return (now.getUTCHours() + 5) % 24;
};

// ---- GET GLOBAL STATS (UPDATED: Split just_sold into product + quantity) ----
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
        const resetStats = updatedStats.rows[0];
        
        // Parse just_sold for reset stats too
        const resetMatch = resetStats.just_sold.match(/^(.+?)\s+(\d+)$/);
        const resetProduct = resetMatch ? resetMatch[1] : resetStats.just_sold;
        const resetQuantity = resetMatch ? parseInt(resetMatch[2]) : null;
        
        return res.status(200).json({
          ...resetStats,
          just_sold_product: resetProduct,
          just_sold_quantity: resetQuantity
        });
      }

      // Parse just_sold into product name and quantity
      // Expected format: "Viral Matcha 4" or "Viral Classic 2"
      const productMatch = stats.just_sold.match(/^(.+?)\s+(\d+)$/);
      const product = productMatch ? productMatch[1] : stats.just_sold;
      const quantity = productMatch ? parseInt(productMatch[2]) : null;

      res.status(200).json({
        ...stats,
        just_sold_product: product,
        just_sold_quantity: quantity
      });

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

// ---- INCREMENT STATS (UPDATED: LINKED LOGIC) ----
router.post('/global-stats/increment', async (req, res) => {
  try {
    const { field } = req.body;
    
    if (!['total_eaten_today', 'new_players_today'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }

    const client = await pool.connect();
    try {
      if (field === 'total_eaten_today') {
        // NEW LOGIC: Generate random number (1-4) and link to eaten count
        const products = ['Viral Matcha', 'Viral Classic'];
        const baseProduct = products[Math.floor(Math.random() * products.length)];
        const randomQuantity = Math.floor(Math.random() * 4) + 1; // 1-4
        const displayProduct = `${baseProduct} ${randomQuantity}`;
        
        // Atomic update: set product name AND increment by the quantity
        await client.query(`
          UPDATE global_stats 
          SET total_eaten_today = total_eaten_today + $1,
              just_sold = $2,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
        `, [randomQuantity, displayProduct]);

        const result = await client.query('SELECT * FROM global_stats WHERE id = 1');
        console.log(`✅ Order: "${displayProduct}" → Eaten Today: ${result.rows[0].total_eaten_today} (+${randomQuantity})`);

        // Return with split fields
        const productMatch = result.rows[0].just_sold.match(/^(.+?)\s+(\d+)$/);
        const product = productMatch ? productMatch[1] : result.rows[0].just_sold;
        const quantity = productMatch ? parseInt(productMatch[2]) : null;

        return res.status(200).json({ 
          success: true, 
          stats: {
            ...result.rows[0],
            just_sold_product: product,
            just_sold_quantity: quantity
          }
        });
        
      } else {
        // new_players_today: keep original +1 logic
        await client.query(`
          UPDATE global_stats 
          SET ${field} = ${field} + 1,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
        `);

        const result = await client.query('SELECT * FROM global_stats WHERE id = 1');
        console.log(`✅ Incremented ${field} to ${result.rows[0][field]}`);

        return res.status(200).json({ success: true, stats: result.rows[0] });
      }

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
  console.log('🎮 Starting global stats simulation v6 with Tashkent timezone (UTC+5)...');
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
  
  // Schedule "Eaten" updates (UPDATED: Time-based intervals)
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

      // NEW: Time-based interval calculation for ~300-350 target by 21:30
      const tashkentHour = getTashkentHour();
      let interval;
      
      if (tashkentHour >= 10 && tashkentHour < 13) {
        // Morning (10:00-13:00): Slower pace, 5-10 minutes
        interval = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
      } else if (tashkentHour >= 13 && tashkentHour < 21.5) {
        // Afternoon/Evening (13:00-21:30): Faster pace, 3-7 minutes
        interval = Math.floor(Math.random() * (420000 - 180000 + 1)) + 180000;
      } else {
        // Late evening (21:30-22:00): Very slow, 10-15 minutes
        interval = Math.floor(Math.random() * (900000 - 600000 + 1)) + 600000;
      }
      
      console.log(`⏱️ [EATEN] Next order in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'total_eaten_today' })
          });
          const data = await response.json();
          console.log(`🍪 Order placed → Total eaten: ${data.stats?.total_eaten_today}`);
        } catch (error) {
          console.error('❌ [EATEN] Increment failed:', error.message);
        }
        checkAndSchedule();
      }, interval);
    };
    
    checkAndSchedule();
  };

  // Schedule "New Players" updates (UNCHANGED)
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

  // Schedule "Active Players" updates (UPDATED: 11-80 range, 1s-15min interval, 24/7)
  const scheduleActivePlayersUpdate = () => {
    simulationActive.activePlayers = true;
    console.log('▶️ [ACTIVE] 24/7 simulation started (11-80 range, 1s-15min updates)');
    
    const updateAndSchedule = () => {
      // NEW: 1 second to 15 minutes
      const interval = Math.floor(Math.random() * (900000 - 1000 + 1)) + 1000;
      console.log(`⏱️ [ACTIVE] Next update in ${interval < 60000 ? Math.round(interval/1000) + 's' : Math.round(interval/60000) + 'min'}`);
      
      setTimeout(async () => {
        try {
          // NEW: Range 11-80 (adjusted for realism)
          const newCount = Math.floor(Math.random() * (80 - 11 + 1)) + 11;
          const client = await pool.connect();
          try {
            await client.query(`
              UPDATE global_stats 
              SET active_players = $1,
                  last_updated = CURRENT_TIMESTAMP
              WHERE id = 1
            `, [newCount]);
            console.log(`👥 Updated active players: ${newCount}`);
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

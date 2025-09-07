import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { validate } from './utils.js';

const { Pool } = pg;

// ---- ENV VARS ----
const {
  PORT = 3000,
  DATABASE_URL,
  BOT_TOKEN
} = process.env;

if (!DATABASE_URL || !BOT_TOKEN) {
  console.error("⛔ Missing DATABASE_URL or BOT_TOKEN environment variables");
  process.exit(1);
}

// ---- DATABASE ----
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// PERFORMANCE MONITORING: Database query wrapper
const monitoredQuery = async (client, query, params = []) => {
  const start = process.hrtime.bigint();
  
  try {
    const result = await client.query(query, params);
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    
    console.log(`🗄️ DB Query: ${Math.round(duration)}ms - ${query.substring(0, 50)}...`);
    
    if (duration > 1000) {
      console.warn(`⚠️ SLOW QUERY (${Math.round(duration)}ms): ${query}`);
    }
    
    return result;
  } catch (error) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    console.error(`❌ DB Query failed (${Math.round(duration)}ms): ${error.message}`);
    throw error;
  }
};

// COMPREHENSIVE DATABASE SETUP WITH FRIENDS SYSTEM
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Setting up enhanced database tables...');

    // 1. Create Users Table with enhanced fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          telegram_id BIGINT UNIQUE NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          username VARCHAR(255),
          points INT DEFAULT 100 NOT NULL,
          level INT DEFAULT 1 NOT NULL,
          daily_streak INT DEFAULT 0 NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          games_played INT DEFAULT 0 NOT NULL,
          high_score INT DEFAULT 0 NOT NULL,
          total_play_time INT DEFAULT 0 NOT NULL,
          point_booster_active BOOLEAN DEFAULT FALSE NOT NULL
      );
    `);

    // 2. Shop Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        icon_name VARCHAR(50),
        type VARCHAR(50) DEFAULT 'consumable' NOT NULL
      );
    `);
    
    // 3. User Inventory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. User Badges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);

    // 5. Game Sessions Table for detailed tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        score INT NOT NULL,
        duration INT NOT NULL,
        items_used JSONB,
        boost_multiplier DECIMAL(3,2) DEFAULT 1.0,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Item Usage History Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS item_usage_history (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        item_name VARCHAR(255) NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        game_session_id INT REFERENCES game_sessions(id),
        game_score INT DEFAULT 0
      );
    `);

    // 7. Badge Progress Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS badge_progress (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        current_progress INT DEFAULT 0,
        target_progress INT NOT NULL,
        progress_data JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);

    // 8. User Friends Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_friends (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        friend_username VARCHAR(255) NOT NULL,
        friend_telegram_id BIGINT,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_username)
      );
    `);
    
    // 9. Populate shop items
    console.log('🛍️ Setting up shop items...');
    await client.query('DELETE FROM shop_items');
    await client.query(`
      INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
      (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
      (2, 'Extra Time +20s', '+20 seconds to your next game', 1500, 'Timer', 'consumable'),
      (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
      (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
      (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
      (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
      (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent')
    `);

    await client.query('SELECT setval(\'shop_items_id_seq\', 7, true)');

    console.log('✅ Enhanced database setup complete!');
  } catch (err) {
    console.error('🚨 Database setup error:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

// DATABASE INDEXES FOR PERFORMANCE
const addOptimizationIndexes = async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Adding performance indexes...');
    
    const indexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_points ON users(points DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_inventory_user_item ON user_inventory(user_id, item_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_user ON user_badges(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_friends_user ON user_friends(user_id)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log(`✅ Index added: ${indexQuery.split(' ')[5]}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️ Index already exists: ${indexQuery.split(' ')[5]}`);
        } else {
          console.error(`❌ Index failed: ${err.message}`);
        }
      }
    }
    
  } finally {
    client.release();
  }
};

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

// PERFORMANCE MONITORING MIDDLEWARE
const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  const originalJson = res.json;
  
  res.json = function(data) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000;
    
    console.log(`⏱️ ${req.method} ${req.path}: ${Math.round(duration)}ms`);
    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
};

app.use(performanceMiddleware);

// ---- MIDDLEWARE ----
const validateUser = (req, res, next) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  if (!validate(initData, BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid data' });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));

  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user data in initData' });
  }
  
  req.user = user;
  next();
};

// ---- BASIC ROUTES ----
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// OPTIMIZATION CHECK ENDPOINT
app.get('/api/optimization-check', (req, res) => {
  res.json({
    optimized: true,
    version: '2.0',
    endpoints: ['profile-complete', 'cached-leaderboard'],
    timestamp: new Date().toISOString(),
    status: 'Backend optimizations deployed successfully'
  });
});

// LEADERBOARD CACHE
const leaderboardCache = new Map();
const LEADERBOARD_TTL = 30000; // 30 seconds

// OPTIMIZED PROFILE ENDPOINT - SINGLE CALL INSTEAD OF PARALLEL
app.post('/api/profile-complete', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    
    try {
      console.log(`🏃‍♂️ Fast profile fetch for user: ${user.id}`);
      const start = process.hrtime.bigint();
      
      // SINGLE optimized query combining all profile data
      const profileQuery = `
        SELECT 
          u.first_name, u.username, u.points, u.level, u.daily_streak, 
          u.created_at, u.games_played, u.high_score, u.total_play_time,
          
          -- Inventory data as JSON
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'item_id', inv.item_id, 
                'quantity', inv_counts.quantity
              )
            ) FILTER (WHERE inv.item_id IS NOT NULL), 
            '[]'::json
          ) as inventory,
          
          -- Badges as array
          COALESCE(
            array_agg(DISTINCT ub.badge_name) FILTER (WHERE ub.badge_name IS NOT NULL), 
            ARRAY[]::text[]
          ) as owned_badges,
          
          -- Shop items
          (SELECT json_agg(si.*) FROM shop_items si) as shop_items
          
        FROM users u
        LEFT JOIN user_inventory inv ON u.telegram_id = inv.user_id
        LEFT JOIN (
          SELECT item_id, user_id, COUNT(*) as quantity 
          FROM user_inventory 
          WHERE user_id = $1 
          GROUP BY item_id, user_id
        ) inv_counts ON inv.item_id = inv_counts.item_id AND inv.user_id = inv_counts.user_id
        LEFT JOIN user_badges ub ON u.telegram_id = ub.user_id
        WHERE u.telegram_id = $1
        GROUP BY u.telegram_id, u.first_name, u.username, u.points, u.level, 
                 u.daily_streak, u.created_at, u.games_played, u.high_score, u.total_play_time
      `;
      
      const result = await monitoredQuery(client, profileQuery, [user.id]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const profileData = result.rows[0];
      
      // Calculate derived stats
      profileData.averageScore = profileData.games_played > 0 
        ? Math.floor(profileData.points / profileData.games_played) 
        : 0;
      
      profileData.totalPlayTime = profileData.total_play_time 
        ? `${Math.floor(profileData.total_play_time / 60)}h ${profileData.total_play_time % 60}m`
        : '0h 0m';
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      
      console.log(`⚡ Profile complete: ${Math.round(duration)}ms`);
      
      res.set('Cache-Control', 'public, max-age=45');
      
      res.status(200).json({
        stats: {
          first_name: profileData.first_name,
          username: profileData.username,
          points: profileData.points,
          level: profileData.level,
          daily_streak: profileData.daily_streak,
          created_at: profileData.created_at,
          games_played: profileData.games_played || 0,
          high_score: profileData.high_score || 0,
          total_play_time: profileData.total_play_time || 0,
          averageScore: profileData.averageScore,
          totalPlayTime: profileData.totalPlayTime
        },
        inventory: profileData.inventory || [],
        shop_items: profileData.shop_items || [],
        owned_badges: profileData.owned_badges || [],
        boosterActive: false
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Profile complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OPTIMIZED LEADERBOARD WITH CACHING
app.post('/api/get-leaderboard', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { type = 'global' } = req.body;
    const cacheKey = `leaderboard_${type}`;
    
    // Check cache first
    const cached = leaderboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < LEADERBOARD_TTL) {
      console.log(`🎯 Leaderboard cache HIT: ${type}`);
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }
    
    console.log(`🏃‍♂️ Fetching fresh leaderboard: ${type}`);
    const start = process.hrtime.bigint();
    
    const client = await pool.connect();
    try {
      let query;
      let params = [];
      
      switch (type) {
        case 'weekly':
          query = `
            SELECT u.first_name as name, u.points as score, u.level,
                   ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank,
                   CASE WHEN u.telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM users u 
            WHERE u.last_login_at >= NOW() - INTERVAL '7 days'
            ORDER BY u.points DESC 
            LIMIT 50
          `;
          params = [user.id];
          break;
          
        case 'friends':
          query = `
            WITH friend_scores AS (
              SELECT u.first_name as name, u.points as score, u.level, u.telegram_id
              FROM users u 
              JOIN user_friends uf ON u.telegram_id = uf.friend_telegram_id
              WHERE uf.user_id = $1
              UNION
              SELECT u.first_name as name, u.points as score, u.level, u.telegram_id
              FROM users u 
              WHERE u.telegram_id = $1
            )
            SELECT name, score, level,
                   ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
                   CASE WHEN telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM friend_scores
            ORDER BY score DESC 
            LIMIT 50
          `;
          params = [user.id];
          break;
          
        default: // global
          query = `
            SELECT u.first_name as name, u.points as score, u.level,
                   ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank,
                   CASE WHEN u.telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM users u 
            ORDER BY u.points DESC 
            LIMIT 50
          `;
          params = [user.id];
      }
      
      const leaderboardResult = await monitoredQuery(client, query, params);
      
      const leaderboard = leaderboardResult.rows.map(row => ({
        rank: parseInt(row.rank),
        player: { name: row.name, level: row.level },
        score: row.score,
        isCurrentUser: row.is_current_user,
        badge: row.score > 5000 ? 'Legend' : row.score > 3000 ? 'Epic' : row.score > 1000 ? 'Rare' : null
      }));
      
      const responseData = { leaderboard };
      
      // Cache the result
      leaderboardCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      console.log(`⚡ Leaderboard fresh: ${Math.round(duration)}ms`);
      
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', 'public, max-age=30');
      res.status(200).json(responseData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// EXISTING ENDPOINTS - KEEPING ALL ORIGINAL FUNCTIONALITY

app.post('/api/validate', validateUser, async (req, res) => {
    try {
        const { user } = req;
        const client = await pool.connect();
        try {
            let dbUserResult = await monitoredQuery(client, 'SELECT * FROM users WHERE telegram_id = $1', [user.id]);
            let appUser;
            let dailyBonus = null;

            if (dbUserResult.rows.length === 0) {
                const insertResult = await monitoredQuery(client,
                    `INSERT INTO users (telegram_id, first_name, last_name, username) VALUES ($1, $2, $3, $4) RETURNING *`,
                    [user.id, user.first_name, user.last_name, user.username]
                );
                appUser = insertResult.rows[0];
            } else {
                appUser = dbUserResult.rows[0];
                const now = new Date();
                const lastLogin = new Date(appUser.last_login_at);

                const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
                const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                if (nowDate > lastLoginDate) {
                    const diffTime = Math.abs(nowDate - lastLoginDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let newStreak = (diffDays === 1) ? appUser.daily_streak + 1 : 1;
                    const bonusPoints = 100 * newStreak;
                    const newPoints = appUser.points + bonusPoints;
                    dailyBonus = { points: bonusPoints, streak: newStreak };
                    
                    const updateResult = await monitoredQuery(client,
                        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, daily_streak = $2, points = $3 WHERE telegram_id = $1 RETURNING *',
                        [user.id, newStreak, newPoints]
                    );
                    appUser = updateResult.rows[0];
                }
            }
            
            res.status(200).json({ ...appUser, dailyBonus });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('🚨 Error in /api/validate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/update-score', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { score, duration = 30, itemsUsed = [] } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await monitoredQuery(client,
        'SELECT points, point_booster_active, high_score, games_played FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) throw new Error('User not found');

      const { points, point_booster_active, high_score, games_played } = userResult.rows[0];
      const finalScore = point_booster_active ? score * 2 : score;
      const newPoints = points + finalScore;
      const newHighScore = Math.max(high_score || 0, finalScore);
      const newGamesPlayed = (games_played || 0) + 1;

      const sessionResult = await monitoredQuery(client,
        `INSERT INTO game_sessions (user_id, score, duration, items_used, boost_multiplier) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, finalScore, duration, JSON.stringify(itemsUsed), point_booster_active ? 2.0 : 1.0]
      );
      
      const sessionId = sessionResult.rows[0].id;

      const updateResult = await monitoredQuery(client,
        `UPDATE users SET 
         points = $1, 
         point_booster_active = FALSE, 
         high_score = $3, 
         games_played = $4,
         total_play_time = total_play_time + $5
         WHERE telegram_id = $2 RETURNING points`,
        [newPoints, user.id, newHighScore, newGamesPlayed, duration]
      );

      await client.query('COMMIT');

      return res.status(200).json({ 
        new_points: updateResult.rows[0].points, 
        score_awarded: finalScore,
        session_id: sessionId
      });

    } catch(e){
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

app.post('/api/user-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [userResult, badgesResult] = await Promise.all([
        monitoredQuery(client,
          `SELECT first_name, username, points, level, daily_streak, created_at,
           games_played, high_score, total_play_time FROM users WHERE telegram_id = $1`, 
          [user.id]
        ),
        monitoredQuery(client, 'SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userResult.rows[0];
      userData.ownedBadges = badgesResult.rows.map(row => row.badge_name);
      
      userData.averageScore = userData.games_played > 0 ? Math.floor(userData.points / userData.games_played) : 0;
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      
      res.status(200).json(userData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/user-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-shop-data', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [itemsResult, userResult, inventoryResult, badgesResult] = await Promise.all([
        monitoredQuery(client, 'SELECT * FROM shop_items ORDER BY id ASC'),
        monitoredQuery(client, 'SELECT points, point_booster_active FROM users WHERE telegram_id = $1', [user.id]),
        monitoredQuery(client, `
          SELECT item_id, COUNT(item_id) as quantity 
          FROM user_inventory 
          WHERE user_id = $1 
          GROUP BY item_id
        `, [user.id]),
        monitoredQuery(client, 'SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const shopData = {
        items: itemsResult.rows,
        userPoints: userResult.rows[0].points,
        inventory: inventoryResult.rows,
        boosterActive: userResult.rows[0].point_booster_active,
        ownedBadges: badgesResult.rows.map(row => row.badge_name)
      };
      
      res.status(200).json(shopData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-shop-data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/buy-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await monitoredQuery(client, 'SELECT name, price, type FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        throw new Error('Item not found.');
      }
      
      const { name, price, type } = itemResult.rows[0];

      const userResult = await monitoredQuery(client, 'SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      
      const userPoints = userResult.rows[0].points;
      
      if (userPoints < price) throw new Error('Insufficient points.');
      
      if (name.includes('Badge')) {
        const badgeResult = await monitoredQuery(client, 'SELECT * FROM user_badges WHERE user_id = $1 AND badge_name = $2', [user.id, name]);
        if (badgeResult.rowCount > 0) throw new Error('Badge already owned.');
        
        await monitoredQuery(client, 'INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2)', [user.id, name]);
      } else {
        if(type === 'permanent') {
          const inventoryResult = await monitoredQuery(client, 'SELECT * FROM user_inventory WHERE user_id = $1 AND item_id = $2', [user.id, itemId]);
          if (inventoryResult.rowCount > 0) throw new Error('Item already owned.');
        }
        
        await monitoredQuery(client, 'INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [user.id, itemId]);
      }

      const newPoints = userPoints - price;
      await monitoredQuery(client, 'UPDATE users SET points = $1 WHERE telegram_id = $2', [newPoints, user.id]);

      await client.query('COMMIT');

      res.status(200).json({ 
        success: true, 
        newPoints: newPoints, 
        message: `Successfully purchased ${name}!` 
      });

    } catch (error) {
      await client.query('ROLLBACK');
      
      const knownErrors = ['Insufficient points.', 'Item already owned.', 'Badge already owned.', 'Item not found.', 'User not found.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
      
      console.error('🚨 Unexpected error in buy-item:', error);
      res.status(500).json({ success: false, error: 'Internal server error during purchase.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/buy-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/start-game-session-with-items', validateUser, async (req, res) => {
  const { user } = req;
  const { selectedItems = [] } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalTimeBonus = 0;
    let hasBomb = false;
    const usedItems = [];

    for (const itemId of selectedItems) {
      const consumeResult = await monitoredQuery(client,
        `DELETE FROM user_inventory 
         WHERE id = (
           SELECT id FROM user_inventory 
           WHERE user_id = $1 AND item_id = $2 
           LIMIT 1
         ) RETURNING item_id`,
        [user.id, itemId]
      );

      if (consumeResult.rowCount > 0) {
        usedItems.push(itemId);
        
        switch (itemId) {
          case 1: totalTimeBonus += 10; break;
          case 2: totalTimeBonus += 20; break;
          case 3: hasBomb = true; break;
        }
      }
    }

    for (const itemId of usedItems) {
      const itemName = await monitoredQuery(client, 'SELECT name FROM shop_items WHERE id = $1', [itemId]);
      if (itemName.rowCount > 0) {
        await monitoredQuery(client,
          `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, $3)`,
          [user.id, itemId, itemName.rows[0].name]
        );
      }
    }

    await client.query('COMMIT');
    
    const finalStartTime = 30 + totalTimeBonus;
    
    res.status(200).json({
      startTime: finalStartTime,
      startWithBomb: hasBomb,
      appliedEffects: {
        timeBonus: totalTimeBonus,
        bomb: hasBomb,
        itemsConsumed: usedItems
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🚨 Error in /api/start-game-session-with-items:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/activate-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    if (!itemId || itemId !== 4) {
      return res.status(400).json({ error: 'Only Double Points can be activated this way.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await monitoredQuery(client, 'SELECT point_booster_active FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      if (userResult.rows[0].point_booster_active) throw new Error('A booster is already active.');

      const inventoryResult = await monitoredQuery(client,
        `DELETE FROM user_inventory 
         WHERE id = (
           SELECT id FROM user_inventory 
           WHERE user_id = $1 AND item_id = $2 
           LIMIT 1
         ) RETURNING id`,
        [user.id, itemId]
      );
      if (inventoryResult.rowCount === 0) throw new Error('You do not own this item.');

      await monitoredQuery(client, 'UPDATE users SET point_booster_active = TRUE WHERE telegram_id = $1', [user.id]);
      
      await monitoredQuery(client,
        `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, 'Double Points')`,
        [user.id, itemId]
      );
      
      await client.query('COMMIT');
      
      res.status(200).json({ success: true, message: 'Point Booster activated for your next game!' });

    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = ['User not found.', 'A booster is already active.', 'You do not own this item.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
      console.error('🚨 Error in /api/activate-item:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/activate-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/add-friend', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const cleanUsername = friendUsername.replace('@', '').toLowerCase().trim();
    
    if (cleanUsername === (user.username || '').toLowerCase()) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const friendResult = await monitoredQuery(client,
        'SELECT telegram_id, first_name, username FROM users WHERE LOWER(username) = $1',
        [cleanUsername]
      );
      
      if (friendResult.rowCount === 0) {
        throw new Error('User not found. Make sure they have played the game at least once.');
      }

      const friend = friendResult.rows[0];
      
      const existingFriend = await monitoredQuery(client,
        'SELECT id FROM user_friends WHERE user_id = $1 AND friend_username = $2',
        [user.id, cleanUsername]
      );
      
      if (existingFriend.rowCount > 0) {
        throw new Error('Already friends with this user');
      }

      await monitoredQuery(client,
        'INSERT INTO user_friends (user_id, friend_username, friend_telegram_id) VALUES ($1, $2, $3)',
        [user.id, cleanUsername, friend.telegram_id]
      );

      await client.query('COMMIT');
      
      res.status(200).json({ 
        success: true, 
        message: `Added ${friend.first_name} (@${friend.username}) as friend!`,
        friend: {
          username: friend.username,
          name: friend.first_name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = [
        'User not found. Make sure they have played the game at least once.',
        'Already friends with this user',
        'Cannot add yourself as a friend'
      ];
      
      if (knownErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      
      console.error('🚨 Error in /api/add-friend:', error);
      res.status(500).json({ success: false, error: 'Failed to add friend' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/add-friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🚀 Optimization check: http://localhost:${PORT}/api/optimization-check`);
  });
};

// Start the application with optimizations
setupDatabase()
  .then(() => addOptimizationIndexes())
  .then(() => startServer())
  .catch(err => {
    console.error('💥 Failed to start application:', err);
    process.exit(1);
  });

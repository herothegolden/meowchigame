// Path: backend/config/database.js
// v3 — Confirm schema defaults & meow-claims tables
// - Ensures users.meow_taps INTEGER NOT NULL DEFAULT 0
// - Ensures users.meow_claim_used_today BOOLEAN NOT NULL DEFAULT FALSE
// - Ensures users.meow_taps_date DATE (tracked per Tashkent day)
// - Creates meow_daily_claims (day PRIMARY KEY, claims_taken INT NOT NULL DEFAULT 0)
// - Creates meow_claims (UUID id, UNIQUE (user_id, day))
// - Keeps existing tables and seed logic intact. No unrelated behavior changed.

import pg from 'pg';

const { Pool } = pg;
const { DATABASE_URL } = process.env;

// ---- DATABASE CONNECTION ----
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

// ---- DATABASE SETUP & MIGRATIONS ----
export const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🗄️ Setting up database tables...');

    // USERS
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
        total_play_time INT DEFAULT 0 NOT NULL
      );
    `);

    const userColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users'
    `);

    const existingColumns = userColumns.rows.map((r) => r.column_name);

    const columnsToAdd = [
      { name: 'point_booster_active', type: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { name: 'point_booster_expires_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'games_played', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'high_score', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'total_play_time', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'avatar_url', type: 'TEXT' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
      { name: 'vip_level', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'longest_streak', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'last_login_date', type: 'DATE' },
      { name: 'streak_claimed_today', type: 'BOOLEAN DEFAULT FALSE NOT NULL' },

      // Meow counter (daily, capped at 42)
      { name: 'meow_taps', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'meow_taps_date', type: 'DATE' },

      // Meow CTA one-time per day usage flag
      { name: 'meow_claim_used_today', type: 'BOOLEAN DEFAULT FALSE NOT NULL' },
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`📊 Adding ${column.name} column to users...`);
        await client.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    // If avatar_url is VARCHAR, widen to TEXT (for Base64 support)
    if (existingColumns.includes('avatar_url')) {
      const columnTypeCheck = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='avatar_url'
      `);
      if (columnTypeCheck.rows[0]?.data_type === 'character varying') {
        console.log('🔧 Migrating avatar_url from VARCHAR to TEXT...');
        await client.query(`ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT`);
      }
    }

    // ORDERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        telegram_id BIGINT,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        delivery_address TEXT,
        product_name VARCHAR(255),
        quantity INT DEFAULT 1,
        total_amount INT NOT NULL,
        ambassador_id VARCHAR(50),
        commission_amount INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const orderColumns = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name='orders'
    `);
    const existingOrderColumns = orderColumns.rows.map((r) => r.column_name);
    const orderColumnsToAdd = [
      { name: 'telegram_id', type: 'BIGINT' },
      { name: 'product_name', type: 'VARCHAR(255)' },
      { name: 'quantity', type: 'INT DEFAULT 1' },
    ];
    for (const column of orderColumnsToAdd) {
      if (!existingOrderColumns.includes(column.name)) {
        console.log(`📊 Adding ${column.name} column to orders...`);
        await client.query(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`);
      }
    }
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_telegram_id ON orders(telegram_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);

    // SHOP
    const shopCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name='shop_items'
    `);
    if (shopCols.rowCount === 0) {
      console.log('🛍️ Creating shop_items table...');
      await client.query(`
        CREATE TABLE shop_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price INT NOT NULL,
          icon_name VARCHAR(50),
          type VARCHAR(50) DEFAULT 'consumable' NOT NULL
        );
      `);
    } else {
      const hasType = shopCols.rows.some((r) => r.column_name === 'type');
      if (!hasType) {
        console.log('🧩 Adding type column to shop_items...');
        await client.query(`ALTER TABLE shop_items ADD COLUMN type VARCHAR(50) DEFAULT 'consumable' NOT NULL`);
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const inventoryCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name='user_inventory' AND table_schema='public'
    `);
    const hasQty = inventoryCols.rows.some((r) => r.column_name === 'quantity');
    if (!hasQty) {
      console.log('📦 Adding quantity to user_inventory...');
      await client.query(`ALTER TABLE user_inventory ADD COLUMN quantity INT DEFAULT 1 NOT NULL`);
    }

    const invConstraint = await client.query(`
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name='user_inventory' 
      AND constraint_type='UNIQUE'
      AND constraint_name='user_inventory_user_item_unique'
    `);
    if (invConstraint.rowCount === 0) {
      console.log('🔒 Adding unique constraint user_inventory(user_id,item_id)...');
      await client.query(`
        ALTER TABLE user_inventory 
        ADD CONSTRAINT user_inventory_user_item_unique 
        UNIQUE (user_id, item_id)
      `);
    }

    // GAME SESSIONS
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

    const gsCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name='game_sessions'
    `);
    const gsHasGameId = gsCols.rows.some((r) => r.column_name === 'game_id');
    if (!gsHasGameId) {
      console.log('🧾 Adding game_id to game_sessions...');
      await client.query(`ALTER TABLE game_sessions ADD COLUMN game_id UUID`);
    }
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_user_game 
      ON game_sessions (user_id, game_id)
    `);

    // Item usage history
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

    // Leaderboard cache
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_cache (
        id SERIAL PRIMARY KEY,
        leaderboard_type VARCHAR(50) NOT NULL,
        user_id BIGINT REFERENCES users(telegram_id),
        rank INT NOT NULL,
        score INT NOT NULL,
        additional_data JSONB,
        cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Friends
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

    // Seed a few shop items if empty
    const itemCount = await client.query('SELECT COUNT(*) AS count FROM shop_items');
    if (parseInt(itemCount.rows[0].count) === 0) {
      console.log('🛒 Seeding shop items...');
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable')
      `);
      await client.query(`SELECT setval('shop_items_id_seq', 4, true)`);
    }

    // Global stats
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_stats (
        id INT PRIMARY KEY DEFAULT 1,
        just_sold VARCHAR(100) DEFAULT 'Viral Classic',
        total_eaten_today INT DEFAULT 0,
        active_players INT DEFAULT 0,
        new_players_today INT DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_daily_reset DATE DEFAULT CURRENT_DATE,
        CHECK (id = 1)
      );
    `);

    const statsCheck = await client.query('SELECT COUNT(*) AS count FROM global_stats');
    if (parseInt(statsCheck.rows[0].count) === 0) {
      console.log('📊 Initializing global stats...');
      const initialEaten = Math.floor(Math.random() * 15) + 5;
      const initialPlayers = Math.floor(Math.random() * 20) + 10;
      const initialActive = Math.floor(Math.random() * (150 - 37 + 1)) + 37;
      await client.query(
        `INSERT INTO global_stats (id, just_sold, total_eaten_today, active_players, new_players_today)
         VALUES (1, 'Viral Classic', $1, $2, $3)`,
        [initialEaten, initialActive, initialPlayers]
      );
    }

    // Meow Daily Claims (global cap per day)
    await client.query(`
      CREATE TABLE IF NOT EXISTS meow_daily_claims (
        day DATE PRIMARY KEY,
        claims_taken INT NOT NULL DEFAULT 0
      );
    `);

    // Meow Claims (per-user, per-day, idempotent; token-based)
    await client.query(`
      CREATE TABLE IF NOT EXISTS meow_claims (
        id UUID PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id),
        day DATE NOT NULL,
        consumed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Idempotency: one claim per (user_id, day)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_meow_claims_user_day
      ON meow_claims (user_id, day);
    `);

    // Useful lookup index
    await client.query(`CREATE INDEX IF NOT EXISTS idx_meow_claims_day ON meow_claims (day);`);

    console.log('✅ Meow claims tables ready');
    console.log('✅ Database setup complete');
  } catch (err) {
    console.error('🚨 Database setup error:', err);
    throw err;
  } finally {
    client.release();
  }
};

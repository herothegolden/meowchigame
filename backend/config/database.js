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
    console.log('🗄️ Setting up enhanced database tables...');

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
    
    const existingColumns = userColumns.rows.map(row => row.column_name);
    
    const columnsToAdd = [
      { name: 'point_booster_active', type: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { name: 'point_booster_expires_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'games_played', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'high_score', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'total_play_time', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'avatar_url', type: 'TEXT' }, // CHANGED: VARCHAR(500) -> TEXT for Base64
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
      { name: 'vip_level', type: 'INT DEFAULT 0 NOT NULL' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`📊 Adding ${column.name} column to users...`);
        await client.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    // ---- MIGRATION: Extend avatar_url to TEXT if it exists as VARCHAR ----
    if (existingColumns.includes('avatar_url')) {
      const columnTypeCheck = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='avatar_url'
      `);
      
      if (columnTypeCheck.rows[0]?.data_type === 'character varying') {
        console.log('🔧 Migrating avatar_url from VARCHAR to TEXT for Base64 storage...');
        await client.query(`ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT`);
        console.log('✅ avatar_url column migrated to TEXT');
      }
    }

    // ---- ORDERS TABLE SETUP ----
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

    // Check and add missing columns to orders table
    const orderColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='orders'
    `);
    
    const existingOrderColumns = orderColumns.rows.map(row => row.column_name);
    
    const orderColumnsToAdd = [
      { name: 'telegram_id', type: 'BIGINT' },
      { name: 'product_name', type: 'VARCHAR(255)' },
      { name: 'quantity', type: 'INT DEFAULT 1' }
    ];

    for (const column of orderColumnsToAdd) {
      if (!existingOrderColumns.includes(column.name)) {
        console.log(`📊 Adding ${column.name} column to orders...`);
        await client.query(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    // Create indexes for orders table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_telegram_id ON orders(telegram_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);

    console.log('✅ Orders table setup complete');

    const tableCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='shop_items'
    `);

    if (tableCheck.rowCount === 0) {
      console.log('Creating new shop_items table...');
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
      const hasTypeColumn = tableCheck.rows.some(row => row.column_name === 'type');
      if (!hasTypeColumn) {
        console.log('Adding type column to existing shop_items table...');
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

    // ---- CRITICAL FIX: Database Migration for user_inventory ----
    console.log('🔧 Checking and updating user_inventory table schema...');

    const inventoryColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user_inventory' AND table_schema='public'
    `);

    const hasQuantityColumn = inventoryColumns.rows.some(row => row.column_name === 'quantity');

    if (!hasQuantityColumn) {
      console.log('📊 Adding quantity column to user_inventory...');
      
      await client.query(`
        ALTER TABLE user_inventory 
        ADD COLUMN quantity INT DEFAULT 1 NOT NULL
      `);
      
      console.log('🔄 Consolidating duplicate inventory entries...');
      
      await client.query(`
        CREATE TEMP TABLE inventory_consolidated AS
        SELECT 
          user_id, 
          item_id, 
          COUNT(*) as total_quantity,
          MIN(acquired_at) as first_acquired_at
        FROM user_inventory 
        GROUP BY user_id, item_id
      `);
      
      await client.query(`DELETE FROM user_inventory`);
      
      await client.query(`
        INSERT INTO user_inventory (user_id, item_id, quantity, acquired_at)
        SELECT user_id, item_id, total_quantity, first_acquired_at
        FROM inventory_consolidated
      `);
      
      console.log('✅ Inventory consolidation complete');
    }

    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='user_inventory' 
      AND constraint_type='UNIQUE'
      AND constraint_name='user_inventory_user_item_unique'
    `);

    if (constraintCheck.rowCount === 0) {
      console.log('🔒 Adding unique constraint to prevent duplicate inventory entries...');
      
      await client.query(`
        ALTER TABLE user_inventory 
        ADD CONSTRAINT user_inventory_user_item_unique 
        UNIQUE (user_id, item_id)
      `);
      
      console.log('✅ Unique constraint added');
    }

    console.log('✅ user_inventory table schema updated successfully');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);

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
    
    const itemCount = await client.query('SELECT COUNT(*) as count FROM shop_items');
    
    if (parseInt(itemCount.rows[0].count) === 0) {
      console.log('🛒 Seeding shop items...');
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
        (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
        (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
        (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent')
      `);
      await client.query('SELECT setval(\'shop_items_id_seq\', 7, true)');
    } else {
      console.log(`🛒 Shop items table updated, ensuring correct items exist...`);
      
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
        (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
        (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
        (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent')
        ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        icon_name = EXCLUDED.icon_name,
        type = EXCLUDED.type
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        task_name VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        reward_points INT DEFAULT 0,
        verification_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_name)
      );
    `);

    console.log('📊 Setting up global_stats table...');
    
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

    const statsCheck = await client.query('SELECT COUNT(*) as count FROM global_stats');
    if (parseInt(statsCheck.rows[0].count) === 0) {
      console.log('📊 Initializing global stats with seed values...');
      const initialEaten = Math.floor(Math.random() * 15) + 5;
      const initialPlayers = Math.floor(Math.random() * 20) + 10;
      const initialActive = Math.floor(Math.random() * (150 - 37 + 1)) + 37;
      
      await client.query(`
        INSERT INTO global_stats (id, just_sold, total_eaten_today, active_players, new_players_today)
        VALUES (1, 'Viral Classic', $1, $2, $3)
      `, [initialEaten, initialActive, initialPlayers]);
      
      console.log(`📊 Seed values: Eaten=${initialEaten}, Active=${initialActive}, NewPlayers=${initialPlayers}`);
    }

    console.log('✅ Global stats table ready');
    console.log('✅ Enhanced database setup complete!');
  } catch (err) {
    console.error('🚨 Database setup error:', err);
    throw err;
  } finally {
    client.release();
  }
};

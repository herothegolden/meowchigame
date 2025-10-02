import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDatabase } from './config/database.js';
import { startGlobalStatsSimulation } from './routes/globalStats.js';
import devToolsRoutes from './devToolsRoutes.js';

// Route imports
import userRoutes from './routes/user.js';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import leaderboardRoutes from './routes/leaderboard.js';
import friendsRoutes from './routes/friends.js';
import tasksRoutes from './routes/tasks.js';
import badgesRoutes from './routes/badges.js';
import globalStatsRoutes from './routes/globalStats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PORT = 3000 } = process.env;

// ---- ENV VALIDATION ----
if (!process.env.DATABASE_URL || !process.env.BOT_TOKEN) {
  console.error("⛔ Missing DATABASE_URL or BOT_TOKEN environment variables");
  process.exit(1);
}

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- STATIC FILES ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- HEALTH CHECK ----
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ---- MOUNT ROUTES ----
app.use('/api/dev', devToolsRoutes);
app.use('/api', userRoutes);
app.use('/api', gameRoutes);
app.use('/api', shopRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', friendsRoutes);
app.use('/api', tasksRoutes);
app.use('/api', badgesRoutes);
app.use('/api', globalStatsRoutes);

// ---- START SERVER ----
const startServer = async () => {
  try {
    await setupDatabase();
    
    app.listen(PORT, async () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
      console.log(`🛠 Debug endpoint: http://localhost:${PORT}/api/global-stats/debug`);
      console.log(`🌍 Using Tashkent timezone (UTC+5) for active hours: 10AM-10PM`);
      
      await startGlobalStatsSimulation(PORT);
    });
  } catch (err) {
    console.error('💥 Failed to start application:', err);
    process.exit(1);
  }
};

startServer();

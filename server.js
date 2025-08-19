import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(compression());

// Allow inline style (we inject a <style> tag) and Telegram WebApp script.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://telegram.org"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'self'", "https://*.t.me", "https://web.telegram.org"]
      }
    }
  })
);

const dist = path.join(__dirname, "dist");

// Check if dist folder exists
if (!fs.existsSync(dist)) {
  console.error("❌ dist folder not found! Make sure the build completed successfully.");
  process.exit(1);
}

// Check if index.html exists
const indexPath = path.join(dist, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ index.html not found in dist folder!");
  process.exit(1);
}

console.log("✅ Static files found, setting up server...");

app.use(express.static(dist, { maxAge: "1y", index: false }));

// Health check endpoint - more detailed
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || "development"
  };
  console.log("🏥 Health check requested:", health);
  res.json(health);
});

// API test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "🍬 Candy Crush Cats API is working!" });
});

// SPA fallback with error handling
app.get("*", (req, res) => {
  try {
    console.log(`📄 Serving index.html for: ${req.url}`);
    res.sendFile(indexPath);
  } catch (error) {
    console.error("❌ Error serving index.html:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Global error handler:", err);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

const port = process.env.PORT || 3000;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`🍬 Candy Crush Cats server running on port ${port}`);
  console.log(`🌐 Local: http://localhost:${port}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📁 Serving from: ${dist}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

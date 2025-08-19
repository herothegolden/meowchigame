import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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
app.use(express.static(dist, { maxAge: "1y", index: false }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA fallback
app.get("*", (_, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🍬 Candy Crush Cats server running on port ${port}`);
  console.log(`🌐 Local: http://localhost:${port}`);
});

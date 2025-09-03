import express from "express";
import { telegramAuth } from "./modules/auth/middleware";

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health (no auth)
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Example protected route — proves end-to-end auth wiring
app.get("/me", telegramAuth(), (req, res) => {
  res.json({ user: req.auth?.user });
});

// Error handler (kept minimal)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({
    error: err?.code || "INTERNAL_ERROR",
    message: err?.message || "Unexpected error",
  });
});

// Export for tests; start server if run directly
const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on :${PORT}`);
  });
}

export default app;

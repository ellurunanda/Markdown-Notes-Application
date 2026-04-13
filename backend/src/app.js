require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");

const app = express();

// Fix: Trust proxy for express-rate-limit (prevents X-Forwarded-For error)
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Rate limiting — 200 requests per 15 minutes per IP
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please slow down.",
    },
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is running.",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Run DB migrations before accepting connections
    const migrate = require("./models/migrate");
    await migrate();
  } catch (err) {
    console.error("❌  Failed to run migrations:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
  });
}

start();

module.exports = app;

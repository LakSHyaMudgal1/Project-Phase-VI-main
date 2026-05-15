// src/server.js
const path = require("path");
const fs   = require("fs");

const envPath = path.resolve(__dirname, "../.env");

// ── Raw file read — shows EXACTLY what dotenv will parse ─────────────────
console.log("\n══════════════════════════════════════════");
console.log("[debug] .env file path:", envPath);
console.log("[debug] .env file exists:", fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  console.log("[debug] .env raw content (repr):");
  // Print each line with its index so we can spot hidden chars
  raw.split("\n").forEach((line, i) => {
    console.log(`  line ${i}: ${JSON.stringify(line)}`);
  });
}
console.log("══════════════════════════════════════════\n");
// ─────────────────────────────────────────────────────────────────────────

// Load .env FIRST — before any other require that might read process.env
const dotenvResult = require("dotenv").config({ path: envPath });

// ── Dotenv parse result ───────────────────────────────────────────────────
if (dotenvResult.error) {
  console.error("❌ [dotenv] Failed to load .env:", dotenvResult.error.message);
} else {
  console.log("✅ [dotenv] Parsed keys:", Object.keys(dotenvResult.parsed || {}).join(", "));
}

// ── Direct process.env check ──────────────────────────────────────────────
console.log("[env] TAVILY_API_KEY =", process.env.TAVILY_API_KEY ?? "undefined");
console.log("[env] PORT           =", process.env.PORT           ?? "undefined");
// ─────────────────────────────────────────────────────────────────────────

const http = require("http");

const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./utils/socket");
const { scheduleDailyReset } = require("./utils/dailyReset");

const PORT = process.env.PORT || 3000;


const server = http.createServer(app);

initSocket(server);

const startServer = async () => {
  try {
    await connectDB();
    scheduleDailyReset();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server failed:", err.message);
  }
};

startServer();
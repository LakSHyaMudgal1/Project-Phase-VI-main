// src/server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

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
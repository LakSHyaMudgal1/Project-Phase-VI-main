// src/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connectionString = process.env.DB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("DB_CONNECTION_STRING is missing in environment");
    }
    await mongoose.connect(connectionString);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
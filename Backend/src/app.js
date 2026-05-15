// app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");


const authRouter = require("./routes/auth");
const roomRouter = require("./routes/room");
const profileRouter = require("./routes/profile");
const analyticsRouter = require("./routes/analytics");
const searchRouter = require("./routes/search");
const timetableRouter = require("./routes/timetable");

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://devconnect-frontend.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow no-origin (mobile, curl, server-to-server)
      if (!origin) return callback(null, true);
      // allow any localhost port in dev
      if (origin.startsWith("http://localhost:")) return callback(null, true);
      // allow chrome extensions
      if (origin.startsWith("chrome-extension://")) return callback(null, true);
      // allow moz extensions
      if (origin.startsWith("moz-extension://")) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    credentials: true,
  })
);

// Routes
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", analyticsRouter);
app.use("/room", roomRouter);
app.use("/api/search", searchRouter);
app.use("/api/timetable", timetableRouter);


app.get("/", (req, res) => {
  res.send("All is Well!");
});

module.exports = app;
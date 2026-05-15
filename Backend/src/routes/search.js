// routes/search.js
const express = require("express");
const searchRouter = express.Router();
const userAuth = require("../middleware/auth");
const searchController = require("../controllers/searchController");

// GET /api/search?q=<query>&filter=<filter>
// Auth-protected — user must be logged in
searchRouter.get("/", userAuth, searchController.search);

module.exports = searchRouter;

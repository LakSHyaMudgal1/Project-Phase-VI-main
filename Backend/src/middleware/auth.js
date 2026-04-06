// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    console.log("Cookies:", req.cookies);
    console.log("Token:", req.cookies?.token);

    if (!token) throw new Error("Login required");

    const decoded = jwt.verify(token, "TabTrack@123");
    const user = await User.findById(decoded._id);

    if (!user) throw new Error("User not found");

    req.user = user;
    next();
  } catch (err) {
    res.status(401).send(err.message);
  }
};

module.exports = userAuth;
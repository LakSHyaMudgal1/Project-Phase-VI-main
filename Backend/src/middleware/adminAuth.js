// middleware/adminAuth.js
// Must be used AFTER userAuth — req.user is already populated.
// Rejects any request from a non-admin user with 403.

const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

module.exports = adminAuth;

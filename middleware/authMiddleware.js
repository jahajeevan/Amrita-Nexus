const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token missing." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "amrita-nexus-secret");
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have access to this resource." });
  }
  next();
};

module.exports = { protect, authorizeRoles };

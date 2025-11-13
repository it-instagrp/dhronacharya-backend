import jwt from "jsonwebtoken";
import db from "../models/index.js";
const { User } = db;

/**
 * Optional authentication middleware
 * Allows both guests and logged-in users.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // guest → skip verification
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "role", "email", "mobile_number", "is_active"],
    });

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        mobile_number: user.mobile_number,
      };
    }
  } catch (error) {
    console.warn("Optional auth warning:", error.message);
  }
  next();
};

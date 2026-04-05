import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import AuthToken from "../models/authTokenModel.js";

/**
 * Middleware to verify JWT from Bearer token
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided, authorization denied." });
    }

    const token = authHeader.split(" ")[1];

    // Check if token exists in DB (could have been logged out/revoked)
    // Optional step depending on strictness
    const storedToken = await AuthToken.findOne({ token });
    if (!storedToken) {
      return res.status(401).json({ message: "Token is invalid or expired." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dummysecret");
    
    // Find user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (user.status === "banned") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa." });
    }

    // Attach user to request
    req.user = user;
    
    // Check authType if needed elsewhere
    req.authType = decoded.authType;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }
    return res.status(401).json({ message: "Token is not valid." });
  }
};
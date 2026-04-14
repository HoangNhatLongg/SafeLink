import express from "express";
import { verifyToken, optionalAuth } from "../middleware/authMiddleware.js";
import { requireModerator } from "../middleware/roleMiddleware.js";
import {
  getDirectory,
  getNearbyDirectory,
  contributeDirectory,
  getPendingDirectory,
  reviewDirectory,
} from "../controllers/directoryController.js";

const router = express.Router();

// Public routes
router.get("/", getDirectory);
router.get("/nearby", getNearbyDirectory);

// Auth required (đóng góp)
router.post("/contribute", optionalAuth, contributeDirectory);

// Admin / Moderator only
router.get("/pending", verifyToken, requireModerator, getPendingDirectory);
router.patch("/:id/review", verifyToken, requireModerator, reviewDirectory);

export default router;

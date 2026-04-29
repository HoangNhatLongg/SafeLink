import express from "express";
import { verifyToken, optionalAuth } from "../middleware/authMiddleware.js";
import { requireModerator } from "../middleware/roleMiddleware.js";
import {
  getDirectory,
  getNearbyDirectory,
  contributeDirectory,
  getPendingDirectory,
  reviewDirectory,
  getAllDirectory,
  createDirectory,
  updateDirectory,
  deleteDirectory,
} from "../controllers/directoryController.js";

const router = express.Router();

// Public routes
router.get("/", getDirectory);
router.get("/nearby", getNearbyDirectory);

// Auth required (đóng góp)
router.post("/contribute", optionalAuth, contributeDirectory);

// Admin / Moderator only
router.get("/all", verifyToken, requireModerator, getAllDirectory);
router.get("/pending", verifyToken, requireModerator, getPendingDirectory);
router.post("/", verifyToken, requireModerator, createDirectory);
router.put("/:id", verifyToken, requireModerator, updateDirectory);
router.patch("/:id/review", verifyToken, requireModerator, reviewDirectory);
router.delete("/:id", verifyToken, requireModerator, deleteDirectory);

export default router;

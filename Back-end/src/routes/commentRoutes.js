import express from "express";
import { verifyToken, optionalAuth } from "../middleware/authMiddleware.js";
import {
  addReply,
  getReplies,
  updateComment,
  deleteComment,
  reactToComment,
} from "../controllers/commentController.js";

const router = express.Router();

// Public routes
router.get("/:id/replies", optionalAuth, getReplies);

// Protected routes
router.use(verifyToken);

router.post("/:id/replies", addReply);
router.put("/:id", updateComment);
router.delete("/:id", deleteComment);
router.post("/:id/like", reactToComment);

export default router;

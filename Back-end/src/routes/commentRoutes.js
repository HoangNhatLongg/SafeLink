import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  addReply,
  getReplies,
  updateComment,
  deleteComment,
  reactToComment,
} from "../controllers/commentController.js";

const router = express.Router();

router.use(verifyToken);

// Bình luận con (replies)
router.post("/:id/replies", addReply);
router.get("/:id/replies", getReplies);

// Sửa / Xóa bình luận
router.put("/:id", updateComment);
router.delete("/:id", deleteComment);

// Phản ứng bình luận
router.post("/:id/like", reactToComment);

export default router;

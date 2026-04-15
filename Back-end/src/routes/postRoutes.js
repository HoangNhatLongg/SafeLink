import express from "express";
import { verifyToken, optionalAuth } from "../middleware/authMiddleware.js";
import { uploadPostMedia } from "../middleware/upload.js";
import {
  createPost,
  getFeed,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  dislikePost,
  toggleSavePost,
  toggleHidePost,
  sharePost,
  reportPost,
  getSavedPosts,
  getNearbyPosts,
  getRecommendedFeed,
} from "../controllers/postController.js";
import {
  addComment,
  getComments,
} from "../controllers/commentController.js";

const router = express.Router();

/** Multer trả lỗi rõ (400) thay vì 500 khi sai MIME / file quá lớn */
const uploadPostMiddleware = (req, res, next) => {
  uploadPostMedia(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message || "Lỗi tải file đính kèm.",
      });
    }
    next();
  });
};

// ─────────── Route tĩnh (PHẢI đặt TRƯỚC /:id) ───────────────────────────
// Nếu /saved, /nearby, /recommended đặt SAU /:id thì Express sẽ khớp
// "saved" vào :id → CastError khi Mongoose ép thành ObjectId.
router.get("/saved", verifyToken, getSavedPosts);
router.get("/nearby", optionalAuth, getNearbyPosts);
router.get("/recommended", optionalAuth, getRecommendedFeed);

// ─────────── Route động (sau cùng) ──────────────────────────────────────
router.get("/", optionalAuth, getFeed);
router.get("/:id", optionalAuth, getPostById);
router.get("/:id/comments", optionalAuth, getComments);

// ─────────── Các route yêu cầu đăng nhập ────────────────────────────────
router.use(verifyToken);

router.post("/", uploadPostMiddleware, createPost);
router.put("/:id", uploadPostMiddleware, updatePost);
router.delete("/:id", deletePost);
router.post("/:id/like", likePost);
router.post("/:id/dislike", dislikePost);
router.post("/:id/save", toggleSavePost);
router.post("/:id/hide", toggleHidePost);
router.post("/:id/share", sharePost);
router.post("/:id/report", reportPost);
router.post("/:id/comments", addComment);

export default router;


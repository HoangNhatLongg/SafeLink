import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
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
} from "../controllers/postController.js";
import {
  addComment,
  getComments,
} from "../controllers/commentController.js";

const router = express.Router();

// Tất cả routes đều yêu cầu xác thực
router.use(verifyToken);

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

// ─────────── Bài viết ───────────
// Feed & tạo bài
router.get("/", getFeed);
router.post("/", uploadPostMiddleware, createPost);

// Bài viết đã lưu
router.get("/saved", getSavedPosts);

// Bài viết theo vị trí (PostGIS)
router.get("/nearby", getNearbyPosts);

// Chi tiết, sửa, xóa
router.get("/:id", getPostById);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

// Phản ứng
router.post("/:id/like", likePost);
router.post("/:id/dislike", dislikePost);

// Lưu / Ẩn / Chia sẻ
router.post("/:id/save", toggleSavePost);
router.post("/:id/hide", toggleHidePost);
router.post("/:id/share", sharePost);

// Báo cáo
router.post("/:id/report", reportPost);

// Bình luận của bài viết
router.get("/:id/comments", getComments);
router.post("/:id/comments", addComment);

export default router;

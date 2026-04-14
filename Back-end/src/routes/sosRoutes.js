import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadPostMedia } from "../middleware/upload.js";
import {
  createSOS,
  getActiveSOS,
  resolveSOS,
  updateUserLocation,
  updatePushToken,
} from "../controllers/sosController.js";

const router = express.Router();

// Wrapper multer error → 400
const uploadMiddleware = (req, res, next) => {
  uploadPostMedia(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Lỗi upload ảnh." });
    next();
  });
};

// Lấy danh sách SOS đang active (không cần login)
router.get("/active", getActiveSOS);

// Đăng SOS mới (cần login)
router.post("/", verifyToken, uploadMiddleware, createSOS);

// Resolve SOS (author / admin / mod)
router.patch("/:id/resolve", verifyToken, resolveSOS);

// Cập nhật vị trí user
router.patch("/me/location", verifyToken, updateUserLocation);

// Lưu Expo Push Token
router.patch("/me/push-token", verifyToken, updatePushToken);

export default router;

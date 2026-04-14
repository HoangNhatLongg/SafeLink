import express from "express";
import { verifyToken, optionalAuth } from "../middleware/authMiddleware.js";
import { uploadAvatarMedia, uploadCoverMedia } from "../middleware/upload.js";
import {
  getCurrentUser,
  updateCurrentUser,
  getUserProfile,
  updateAvatar,
  updateCover,
  getSuggestedUsers,
} from "../controllers/userController.js";

const router = express.Router();

// Trang cá nhân (yêu cầu đăng nhập)
router.get("/me", verifyToken, getCurrentUser);
router.patch("/me", verifyToken, updateCurrentUser);
router.post("/me/avatar", verifyToken, uploadAvatarMedia, updateAvatar);
router.post("/me/cover", verifyToken, uploadCoverMedia, updateCover);

// Suggest users to follow
router.get("/suggestions", verifyToken, getSuggestedUsers);

// Xem profile người khác (yêu cầu đăng nhập)
router.get("/:id/profile", verifyToken, getUserProfile);

export default router;

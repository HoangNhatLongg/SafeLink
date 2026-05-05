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
  getAllUsersAdmin,
  updateUserRole,
  updateUserStatus,
  getAppeals,
  reviewAppeal,
} from "../controllers/userController.js";
import { requireAdmin, requireModerator } from "../middleware/roleMiddleware.js";

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

// ========================
// Chức năng cho Admin / Moderator
// ========================
// Lấy danh sách users (Admin & Moderator)
router.get("/admin/all", verifyToken, requireModerator, getAllUsersAdmin);

// Thay đổi chức vụ (Chỉ Admin)
router.patch("/admin/:id/role", verifyToken, requireAdmin, updateUserRole);

// Thay đổi trạng thái khóa/mở khóa (Admin & Moderator)
router.patch("/admin/:id/status", verifyToken, requireModerator, updateUserStatus);

// Quản lý khiếu nại
router.get("/admin/appeals", verifyToken, requireModerator, getAppeals);
router.patch("/admin/appeals/:id", verifyToken, requireModerator, reviewAppeal);

export default router;

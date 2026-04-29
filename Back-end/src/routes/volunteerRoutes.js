import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/roleMiddleware.js";
import { uploadVerificationMedia, handleVerificationUploadError } from "../middleware/upload.js";
import {
  registerVolunteer,
  getVolunteers,
  getNearbyVolunteers,
  getPendingVolunteers,
  getAllVolunteersAdmin,
  reviewVolunteer,
  getMyVolunteerRegistrations,
  updateMyVolunteer,
} from "../controllers/volunteerController.js";

const router = express.Router();

// ─── Public routes ──────────────────────────────────
// Xem danh sách đội tình nguyện đã duyệt
router.get("/", getVolunteers);
router.get("/nearby", getNearbyVolunteers);

// ─── JWT required ───────────────────────────────────
// Đăng ký làm đội tình nguyện (có upload ảnh xác minh)
router.post(
  "/register",
  verifyToken,
  (req, res, next) => uploadVerificationMedia(req, res, (err) => handleVerificationUploadError(err, req, res, next))
  ,
  registerVolunteer
);

// Xem đơn đăng ký của chính mình
router.get("/my", verifyToken, getMyVolunteerRegistrations);

// Cập nhật thông tin đội cứu hộ (chỉ chủ sở hữu, đã duyệt)
router.put(
  "/my",
  verifyToken,
  (req, res, next) => uploadVerificationMedia(req, res, (err) => handleVerificationUploadError(err, req, res, next)),
  updateMyVolunteer
);

// ─── Admin only ─────────────────────────────────────
// Admin: Duyệt đội cứu hộ
router.get("/all", verifyToken, requireAdmin, getAllVolunteersAdmin);
router.get("/pending", verifyToken, requireAdmin, getPendingVolunteers);
router.patch("/:id/review", verifyToken, requireAdmin, reviewVolunteer);

export default router;

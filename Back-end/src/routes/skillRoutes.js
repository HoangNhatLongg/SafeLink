import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireModerator } from "../middleware/roleMiddleware.js";
import {
  getSkills,
  getSkillDetail,
  contributeSkill,
  getPendingSkills,
  reviewSkill,
  incrementView,
} from "../controllers/skillController.js";
import { uploadSkillMedia, handleSkillUploadError } from "../middleware/upload.js";

const router = express.Router();

// ─── Public — tĩnh (PHẢI đặt TRƯỚC /:id để tránh conflict) ───────────────────
router.get("/", getSkills);
router.get("/pending", verifyToken, requireModerator, getPendingSkills);

// Contribute POST — đặt TRƯỚC /:id/view để tránh "contribute" bị match vào :id
router.post(
  "/contribute",
  verifyToken,
  uploadSkillMedia,
  handleSkillUploadError,
  contributeSkill
);

// ─── Route động (sau cùng) ───────────────────────────────────────────────────
router.get("/:id", getSkillDetail);
router.post("/:id/view", incrementView);

// ─── Moderator / Admin ────────────────────────────────────────────────────────
router.patch(
  "/:id/review",
  verifyToken,
  requireModerator,
  reviewSkill
);

export default router;

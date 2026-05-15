import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireModerator } from "../middleware/roleMiddleware.js";
import {
  getAllProvinces,
  createProvince,
  updateProvince,
  deleteProvince,
} from "../controllers/provinceController.js";

const router = express.Router();

// Public: Lấy danh sách (dùng cho filter, select)
router.get("/", getAllProvinces);

// Admin / Mod: Thêm, sửa, xóa
router.post("/", verifyToken, requireModerator, createProvince);
router.put("/:id", verifyToken, requireModerator, updateProvince);
router.delete("/:id", verifyToken, requireModerator, deleteProvince);

export default router;

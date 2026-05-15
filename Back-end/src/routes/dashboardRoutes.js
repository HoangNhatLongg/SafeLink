import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireModerator } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/stats", verifyToken, requireModerator, getDashboardStats);

export default router;

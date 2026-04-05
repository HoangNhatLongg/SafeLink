import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireModerator } from "../middleware/roleMiddleware.js";
import { listReports, updateReport } from "../controllers/moderationController.js";

const router = express.Router();

router.use(verifyToken, requireModerator);
router.get("/reports", listReports);
router.patch("/reports/:id", updateReport);

export default router;

import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getCurrentUser, updateCurrentUser } from "../controllers/userController.js";

const router = express.Router();

router.use(verifyToken);
router.get("/me", getCurrentUser);
router.patch("/me", updateCurrentUser);

export default router;

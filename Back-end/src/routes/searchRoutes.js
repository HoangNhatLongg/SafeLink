import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { globalSearch, suggestTags } from "../controllers/searchController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", globalSearch);
router.get("/tags/suggest", suggestTags);

export default router;

import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
} from "../controllers/followController.js";

const router = express.Router();

router.use(verifyToken);

// Follow / Unfollow
router.post("/:id/follow", followUser);
router.delete("/:id/follow", unfollowUser);

// Danh sách
router.get("/:id/followers", getFollowers);
router.get("/:id/following", getFollowing);

// Trạng thái follow
router.get("/:id/follow-status", getFollowStatus);

export default router;

import Follow from "../models/followModel.js";
import User from "../models/userModel.js";

/**
 * POST /api/users/:id/follow
 * Theo dõi người dùng
 */
export const followUser = async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user._id;

    if (followerId.toString() === followingId) {
      return res.status(400).json({ message: "Bạn không thể tự theo dõi chính mình." });
    }

    const target = await User.findById(followingId);
    if (!target) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const existing = await Follow.findOne({ follower: followerId, following: followingId });
    if (existing) {
      return res.status(409).json({ message: "Bạn đã theo dõi người dùng này rồi." });
    }

    await Follow.create({ follower: followerId, following: followingId });

    return res.status(201).json({ message: "Đã theo dõi người dùng." });
  } catch (err) {
    console.error("followUser error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * DELETE /api/users/:id/follow
 * Hủy theo dõi người dùng
 */
export const unfollowUser = async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user._id;

    const result = await Follow.findOneAndDelete({ follower: followerId, following: followingId });
    if (!result) {
      return res.status(404).json({ message: "Bạn chưa theo dõi người dùng này." });
    }

    return res.json({ message: "Đã hủy theo dõi." });
  } catch (err) {
    console.error("unfollowUser error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/users/:id/followers
 * Danh sách người đang follow user này
 */
export const getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ following: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("follower", "name email")
        .lean(),
      Follow.countDocuments({ following: userId }),
    ]);

    // Kiểm tra xem user hiện tại có follow ngược lại không
    const currentUserId = req.user._id;
    const followerIds = follows.map((f) => f.follower._id.toString());
    const mutualFollows = await Follow.find({
      follower: currentUserId,
      following: { $in: followerIds },
    }).lean();
    const mutualSet = new Set(mutualFollows.map((f) => f.following.toString()));

    const result = follows.map((f) => ({
      ...f.follower,
      isFollowedByMe: mutualSet.has(f.follower._id.toString()),
      followedAt: f.createdAt,
    }));

    return res.json({
      followers: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getFollowers error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/users/:id/following
 * Danh sách user mà người này đang follow
 */
export const getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      Follow.find({ follower: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("following", "name email")
        .lean(),
      Follow.countDocuments({ follower: userId }),
    ]);

    // Kiểm tra xem user hiện tại có follow những người đó không
    const currentUserId = req.user._id;
    const followingIds = follows.map((f) => f.following._id.toString());
    const myFollows = await Follow.find({
      follower: currentUserId,
      following: { $in: followingIds },
    }).lean();
    const myFollowSet = new Set(myFollows.map((f) => f.following.toString()));

    const result = follows.map((f) => ({
      ...f.following,
      isFollowedByMe: myFollowSet.has(f.following._id.toString()),
      followedAt: f.createdAt,
    }));

    return res.json({
      following: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getFollowing error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/users/:id/follow-status
 * Kiểm tra trạng thái follow giữa user hiện tại và user :id
 */
export const getFollowStatus = async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentUserId = req.user._id;

    const [isFollowing, isFollowedBy] = await Promise.all([
      Follow.exists({ follower: currentUserId, following: targetId }),
      Follow.exists({ follower: targetId, following: currentUserId }),
    ]);

    return res.json({
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
      isMutual: !!isFollowing && !!isFollowedBy,
    });
  } catch (err) {
    console.error("getFollowStatus error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

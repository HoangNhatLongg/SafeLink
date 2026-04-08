import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import { getFriendAuthorIds, feedVisibilityMatch } from "../utils/postVisibility.js";

/**
 * GET /api/search/tags/suggest?q=...
 */
export const suggestTags = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const query = q.toLowerCase().replace(/^#/, ""); // Bỏ dấu # nếu có nhập
    const matchRegex = query ? `^#${query}` : "^#";
    
    // Aggregation pipeline group tags and count frequency
    const results = await Post.aggregate([
      { $match: { status: "active" } },
      { $unwind: "$tags" },
      { $match: { tags: { $regex: matchRegex, $options: "i" } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const tags = results.map(r => r._id);
    return res.json({ tags });
  } catch (err) {
    console.error("suggestTags error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/search?q=&type=(all|posts|users|locations)&page=1
 */
export const globalSearch = async (req, res) => {
  try {
    const { q = "", type = "all", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;
    
    const userId = req.user._id;
    const regexQuery = { $regex: q, $options: "i" };

    let users = [];
    let posts = [];
    let totalUsers = 0;
    let totalPosts = 0;

    // Search Users
    if (type === "all" || type === "users") {
      const userFilter = { 
        $or: [{ name: regexQuery }, { email: regexQuery }],
        status: "active" 
      };
      
      [users, totalUsers] = await Promise.all([
        User.find(userFilter)
            .select("name email avatar cover role followersCount followingCount postsCount")
            .skip(type === "all" ? 0 : skip)
            .limit(type === "all" ? 5 : limitNum)
            .lean(),
        User.countDocuments(userFilter)
      ]);
    }

    // Search Posts
    if (type === "all" || type === "posts" || type === "locations") {
      const friendAuthorIds = await getFriendAuthorIds(userId);
      const visibilityMatch = feedVisibilityMatch(userId, friendAuthorIds);

      const postFilter = {
        status: "active",
        hiddenBy: { $nin: [userId] },
        $and: [visibilityMatch]
      };

      if (type === "locations") {
        postFilter["location.address"] = regexQuery;
      } else {
        postFilter.$or = [
          { content: regexQuery },
          { tags: regexQuery }
        ];
      }

      [posts, totalPosts] = await Promise.all([
        Post.find(postFilter)
            .populate("author", "name email avatar")
            .sort({ createdAt: -1 })
            .skip(type === "all" ? 0 : skip)
            .limit(type === "all" ? 5 : limitNum)
            .lean(),
        Post.countDocuments(postFilter)
      ]);
    }

    return res.json({
      users,
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMoreUsers: totalUsers > skip + users.length,
        hasMorePosts: totalPosts > skip + posts.length,
      }
    });

  } catch (err) {
    console.error("globalSearch error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

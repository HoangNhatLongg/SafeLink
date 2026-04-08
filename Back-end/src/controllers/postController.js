import path from "path";
import Post from "../models/postModel.js";
import Like from "../models/likeModel.js";
import Comment from "../models/commentModel.js";
import Report from "../models/reportModel.js";
import {
  savePostLocation,
  getPostLocation,
  getPostLocations,
  deletePostLocation,
  findNearbyPostIds,
} from "../config/postgresConfig.js";
import {
  getFriendAuthorIds,
  feedVisibilityMatch,
  authorProfileVisibilityMatch,
  canViewerSeePost,
  findActivePostVisibleToUser,
} from "../utils/postVisibility.js";
import { reverseGeocodeLabel } from "../services/geocodeService.js";

// ─────────────────────────────────────────────

const extractTags = (content) => {
  if (!content) return [];
  const matches = content.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  return [...new Set(matches.map((t) => t.toLowerCase()))];
};

/**
 * Xây dựng URL từ đường dẫn file được lưu
 */
const buildMediaUrl = (req, filePath) => {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.indexOf("uploads/");
  const host = req.get("host") || "localhost";
  if (idx === -1) {
    console.warn("buildMediaUrl: path không chứa uploads/", filePath);
    const base = `${req.protocol}://${host}`;
    return `${base}/uploads/${path.basename(normalized)}`;
  }
  return `${req.protocol}://${host}/${normalized.substring(idx)}`;
};

/**
 * Lấy reaction hiện tại của user với bài viết
 */
const getUserReaction = async (userId, postId) => {
  if (!userId) return null;
  const like = await Like.findOne({ user: userId, target: postId, targetType: "Post" });
  return like ? like.type : null;
};

// ─────────────────────────────────────────────
// CRUD Bài viết
// ─────────────────────────────────────────────

/**
 * POST /api/posts
 * Tạo bài viết mới (có thể kèm ảnh/video + tọa độ GPS)
 */
export const createPost = async (req, res) => {
  try {
    const { content, visibility, latitude, longitude, address } = req.body;
    const userId = req.user._id;

    const latNum =
      latitude !== undefined && latitude !== null && latitude !== ""
        ? parseFloat(latitude)
        : NaN;
    const lngNum =
      longitude !== undefined && longitude !== null && longitude !== ""
        ? parseFloat(longitude)
        : NaN;
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    // Build arrays from the single files array returned by multer.any()
    const allFiles = req.files || [];
    const images = allFiles
      .filter((f) => f.mimetype.startsWith("image/"))
      .map((f) => ({ url: buildMediaUrl(req, f.path), filename: f.filename }));
    const videos = allFiles
      .filter((f) => f.mimetype.startsWith("video/"))
      .map((f) => ({ url: buildMediaUrl(req, f.path), filename: f.filename }));

    const hasImages = images.length > 0;
    const hasVideos = videos.length > 0;

    // Phải có ít nhất nội dung hoặc media
    const hasContent = content && content.trim().length > 0;

    if (!hasContent && !hasImages && !hasVideos) {
      return res
        .status(400)
        .json({ message: "Bài viết cần có nội dung hoặc ít nhất một ảnh/video." });
    }

    // Địa danh: ưu tiên address từ client; nếu không có thì reverse geocode (Nominatim)
    let resolvedAddress =
      typeof address === "string" && address.trim() ? address.trim() : null;
    if (hasCoords && !resolvedAddress) {
      resolvedAddress = await reverseGeocodeLabel(latNum, lngNum);
    }

    const location = hasCoords
      ? {
          latitude: latNum,
          longitude: lngNum,
          address: resolvedAddress || null,
        }
      : undefined;

    const extractedTags = extractTags(content);

    const post = await Post.create({
      author: userId,
      content: content?.trim(),
      tags: extractedTags,
      images,
      videos,
      location,
      visibility: visibility || "public",
    });

    // Lưu vị trí vào PostgreSQL nếu có GPS (không làm hỏng bài nếu PG chưa cấu hình / lỗi)
    if (hasCoords) {
      try {
        await savePostLocation(
          post._id.toString(),
          userId.toString(),
          latNum,
          lngNum,
          resolvedAddress || null
        );
      } catch (geoErr) {
        console.warn("savePostLocation skipped:", geoErr.message);
      }
    }

    await post.populate("author", "name email avatar");

    return res.status(201).json({
      message: "Đăng bài thành công.",
      post,
    });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};


export const getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const friendAuthorIds = await getFriendAuthorIds(userId);

    const filter = {
      status: "active",
      hiddenBy: { $nin: [userId] },
    };

    if (req.query.authorId) {
      const aid = req.query.authorId;
      filter.author = aid;
      const profileVis = authorProfileVisibilityMatch(aid, userId.toString(), friendAuthorIds);
      if (profileVis) filter.$and = [profileVis];
    } else {
      filter.$and = [feedVisibilityMatch(userId, friendAuthorIds)];
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email avatar")
        .lean(),
      Post.countDocuments(filter),
    ]);

    // Gắn vị trí từ PostgreSQL
    const postIds = posts.map((p) => p._id.toString());
    const locationMap = await getPostLocations(postIds);

    // Gắn reaction của user hiện tại
    const userReactions = await Like.find({
      user: userId,
      target: { $in: postIds },
      targetType: "Post",
    }).lean();
    const reactionMap = userReactions.reduce((acc, r) => {
      acc[r.target.toString()] = r.type;
      return acc;
    }, {});

    // Gắn isSaved của user
    const savedPostIds = new Set(
      posts.filter((p) => p.savedBy?.some((id) => id.toString() === userId.toString())).map((p) => p._id.toString())
    );

    const enrichedPosts = posts.map((post) => ({
      ...post,
      location: locationMap[post._id.toString()] || post.location,
      userReaction: reactionMap[post._id.toString()] || null,
      isSaved: savedPostIds.has(post._id.toString()),
    }));

    return res.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      },
    });
  } catch (err) {
    console.error("getFeed error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/posts/:id
 * Lấy chi tiết 1 bài viết
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findOne({
      _id: id,
      status: "active",
      hiddenBy: { $nin: [userId] },
    })
      .populate("author", "name email avatar")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    const friendAuthorIds = await getFriendAuthorIds(userId);
    if (!canViewerSeePost(post, userId, friendAuthorIds)) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    const [locationData, userLike] = await Promise.all([
      getPostLocation(id),
      Like.findOne({ user: userId, target: id, targetType: "Post" }).lean(),
    ]);

    return res.json({
      post: {
        ...post,
        location: locationData || post.location,
        userReaction: userLike?.type || null,
        isSaved: post.savedBy?.some((uid) => uid.toString() === userId.toString()) || false,
      },
    });
  } catch (err) {
    console.error("getPostById error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PUT /api/posts/:id
 * Chỉnh sửa bài viết (chỉ tác giả)
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa bài viết này." });
    }

    const { content, visibility, latitude, longitude, address, retainedMedia } = req.body;

    if (content !== undefined) {
      post.content = content.trim();
      post.tags = extractTags(post.content);
    }
    if (visibility) post.visibility = visibility;

    // Lọc media giữ lại
    let parsedRetained = [];
    try {
      if (retainedMedia) parsedRetained = JSON.parse(retainedMedia);
    } catch (e) {
      console.warn("Invalid retainedMedia format", e.message);
    }

    const oldImages = post.images.filter((img) => parsedRetained.includes(img.url));
    const oldVideos = post.videos.filter((vid) => parsedRetained.includes(vid.url));

    const allFiles = req.files || [];
    const newImages = allFiles
      .filter((f) => f.mimetype.startsWith("image/"))
      .map((f) => ({ url: buildMediaUrl(req, f.path), filename: f.filename }));
    const newVideos = allFiles
      .filter((f) => f.mimetype.startsWith("video/"))
      .map((f) => ({ url: buildMediaUrl(req, f.path), filename: f.filename }));

    post.images = [...oldImages, ...newImages];
    post.videos = [...oldVideos, ...newVideos];

    const hasContent = post.content && post.content.length > 0;
    const hasMedia = post.images.length > 0 || post.videos.length > 0;

    if (!hasContent && !hasMedia) {
      return res.status(400).json({ message: "Bài viết cần có nội dung hoặc ít nhất một ảnh/video." });
    }

    // Xử lý Location
    const latNum =
      latitude !== undefined && latitude !== null && latitude !== ""
        ? parseFloat(latitude)
        : NaN;
    const lngNum =
      longitude !== undefined && longitude !== null && longitude !== ""
        ? parseFloat(longitude)
        : NaN;
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    if (hasCoords) {
      let resolvedAddress =
        typeof address === "string" && address.trim() ? address.trim() : null;
      if (!resolvedAddress) resolvedAddress = await reverseGeocodeLabel(latNum, lngNum);
      
      post.location = { latitude: latNum, longitude: lngNum, address: resolvedAddress || null };
      
      try {
        await savePostLocation(
          post._id.toString(),
          userId.toString(),
          latNum,
          lngNum,
          resolvedAddress || null
        );
      } catch (geoErr) {
        console.warn("savePostLocation update skipped:", geoErr.message);
      }
    } else {
      post.location = undefined;
      try {
        await deletePostLocation(post._id.toString());
      } catch (err) {}
    }

    await post.save();
    await post.populate("author", "name email avatar");

    return res.json({ message: "Cập nhật bài viết thành công.", post });
  } catch (err) {
    console.error("updatePost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * DELETE /api/posts/:id
 * Xóa bài viết (tác giả hoặc moderator/admin)
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const isAuthor = post.author.toString() === userId.toString();
    const isModerator = ["moderator", "admin"].includes(userRole);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bài viết này." });
    }

    // Soft delete
    post.status = "deleted";
    await post.save();

    // Xóa GIS data
    await deletePostLocation(id);

    return res.json({ message: "Đã xóa bài viết." });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// ─────────────────────────────────────────────
// Like / Dislike
// ─────────────────────────────────────────────

/**
 * POST /api/posts/:id/like   — Like bài viết
 * POST /api/posts/:id/dislike — Dislike bài viết
 * Nếu đã reaction cùng loại → hủy reaction
 * Nếu đã reaction khác loại → đổi reaction
 */
const handleReaction = async (req, res, newType) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await findActivePostVisibleToUser(id, userId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const existing = await Like.findOne({ user: userId, target: id, targetType: "Post" });

    let likesDelta = 0;
    let dislikesDelta = 0;
    let userReaction = null;
    let action = "";

    if (!existing) {
      // Chưa có reaction → tạo mới
      await Like.create({ user: userId, target: id, targetType: "Post", type: newType });
      newType === "like" ? likesDelta++ : dislikesDelta++;
      userReaction = newType;
      action = "added";
    } else if (existing.type === newType) {
      // Cùng loại → toggle off (hủy)
      await existing.deleteOne();
      newType === "like" ? likesDelta-- : dislikesDelta--;
      userReaction = null;
      action = "removed";
    } else {
      // Khác loại → đổi reaction
      if (existing.type === "like") {
        likesDelta--;
        dislikesDelta++;
      } else {
        dislikesDelta--;
        likesDelta++;
      }
      existing.type = newType;
      await existing.save();
      userReaction = newType;
      action = "changed";
    }

    // Cập nhật atomic
    const updated = await Post.findByIdAndUpdate(
      id,
      {
        $inc: {
          likesCount: likesDelta,
          dislikesCount: dislikesDelta,
          score: likesDelta - dislikesDelta,
        },
      },
      { new: true }
    );

    return res.json({
      action,
      userReaction,
      likesCount: updated.likesCount,
      dislikesCount: updated.dislikesCount,
      score: updated.score,
    });
  } catch (err) {
    console.error("handleReaction error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

export const likePost = (req, res) => handleReaction(req, res, "like");
export const dislikePost = (req, res) => handleReaction(req, res, "dislike");

// ─────────────────────────────────────────────
// Lưu / Ẩn bài viết
// ─────────────────────────────────────────────

/**
 * POST /api/posts/:id/save
 * Toggle lưu bài viết
 */
export const toggleSavePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await findActivePostVisibleToUser(id, userId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const isSaved = post.savedBy.some((uid) => uid.toString() === userId.toString());

    if (isSaved) {
      await Post.findByIdAndUpdate(id, { $pull: { savedBy: userId } });
      return res.json({ saved: false, message: "Đã bỏ lưu bài viết." });
    } else {
      await Post.findByIdAndUpdate(id, { $addToSet: { savedBy: userId } });
      return res.json({ saved: true, message: "Đã lưu bài viết." });
    }
  } catch (err) {
    console.error("toggleSavePost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * POST /api/posts/:id/hide
 * Toggle ẩn bài viết
 */
export const toggleHidePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await findActivePostVisibleToUser(id, userId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const isHidden = post.hiddenBy.some((uid) => uid.toString() === userId.toString());

    if (isHidden) {
      await Post.findByIdAndUpdate(id, { $pull: { hiddenBy: userId } });
      return res.json({ hidden: false, message: "Đã bỏ ẩn bài viết." });
    } else {
      await Post.findByIdAndUpdate(id, { $addToSet: { hiddenBy: userId } });
      return res.json({ hidden: true, message: "Đã ẩn bài viết." });
    }
  } catch (err) {
    console.error("toggleHidePost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// ─────────────────────────────────────────────
// Chia sẻ
// ─────────────────────────────────────────────

/**
 * POST /api/posts/:id/share
 * Ghi nhận lượt chia sẻ (tăng bộ đếm)
 */
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id; // ← fix: khai báo userId
    const visible = await findActivePostVisibleToUser(id, userId);
    if (!visible) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const post = await Post.findOneAndUpdate(
      { _id: id, status: "active" },
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    return res.json({ sharesCount: post.sharesCount });
  } catch (err) {
    console.error("sharePost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// ─────────────────────────────────────────────
// Báo cáo
// ─────────────────────────────────────────────

/**
 * POST /api/posts/:id/report
 * Báo cáo bài viết
 */
export const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { reason, description } = req.body;

    if (!reason) return res.status(400).json({ message: "Vui lòng chọn lý do báo cáo." });

    const post = await findActivePostVisibleToUser(id, userId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const existingReport = await Report.findOne({ post: id, reporter: userId });
    if (existingReport) {
      return res.status(409).json({ message: "Bạn đã báo cáo bài viết này rồi." });
    }

    await Report.create({ post: id, reporter: userId, reason, description });

    return res.status(201).json({ message: "Đã gửi báo cáo. Chúng tôi sẽ xem xét sớm nhất." });
  } catch (err) {
    console.error("reportPost error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/posts/saved
 * Lấy danh sách bài viết đã lưu của user hiện tại
 */
/**
 * GET /api/posts/nearby?lat=&lng=&radius=&limit=
 * Bài viết có GPS trong bán kính (PostGIS). Áp cùng quy tắc visibility với feed.
 */
export const getNearbyPosts = async (req, res) => {
  try {
    if (!process.env.POSTGRES_URI) {
      return res
        .status(503)
        .json({ message: "Chưa cấu hình POSTGRES_URI — tính năng bản đồ tắt." });
    }

    const userId = req.user._id;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusMeters = Math.min(parseInt(req.query.radius, 10) || 5000, 50000);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "Tham số lat và lng không hợp lệ." });
    }

    let rows;
    try {
      rows = await findNearbyPostIds(lat, lng, radiusMeters, limit);
    } catch (err) {
      console.error("findNearbyPostIds:", err);
      return res.status(503).json({
        message: "Lỗi truy vấn PostgreSQL/PostGIS.",
        error: err.message,
      });
    }

    const ids = rows.map((r) => r.post_id);
    if (!ids.length) {
      return res.json({ posts: [], locations: [] });
    }

    const friendAuthorIds = await getFriendAuthorIds(userId);
    const vis = feedVisibilityMatch(userId, friendAuthorIds);

    const postsRaw = await Post.find({
      _id: { $in: ids },
      status: "active",
      hiddenBy: { $nin: [userId] },
      $and: [vis],
    })
      .populate("author", "name email avatar")
      .lean();

    const postById = Object.fromEntries(postsRaw.map((p) => [p._id.toString(), p]));
    const orderMap = Object.fromEntries(ids.map((id, i) => [id, i]));
    const sorted = ids
      .map((pid) => postById[pid])
      .filter(Boolean)
      .sort((a, b) => orderMap[a._id.toString()] - orderMap[b._id.toString()]);

    const locationMap = rows.reduce((acc, row) => {
      acc[row.post_id] = row;
      return acc;
    }, {});

    const postIds = sorted.map((p) => p._id.toString());
    const userReactions = await Like.find({
      user: userId,
      target: { $in: postIds },
      targetType: "Post",
    }).lean();
    const reactionMap = userReactions.reduce((acc, r) => {
      acc[r.target.toString()] = r.type;
      return acc;
    }, {});

    const savedPostIds = new Set(
      sorted
        .filter((p) => p.savedBy?.some((id) => id.toString() === userId.toString()))
        .map((p) => p._id.toString())
    );

    const enrichedPosts = sorted.map((post) => {
      const loc = locationMap[post._id.toString()];
      return {
        ...post,
        location: loc || post.location,
        userReaction: reactionMap[post._id.toString()] || null,
        isSaved: savedPostIds.has(post._id.toString()),
        distanceM: loc?.distance_m,
      };
    });

    return res.json({ posts: enrichedPosts, locations: rows });
  } catch (err) {
    console.error("getNearbyPosts error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

export const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ savedBy: userId, status: "active" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email avatar")
        .lean(),
      Post.countDocuments({ savedBy: userId, status: "active" }),
    ]);

    return res.json({
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getSavedPosts error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

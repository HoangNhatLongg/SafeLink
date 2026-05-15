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
import {
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
  deleteFromCloudinary,
  buildLocalMediaUrl,
  isCloudinaryConfigured,
} from "../middleware/upload.js";
import { withCache, cacheDelPattern } from "../utils/cache.js";

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
    const { content, visibility, latitude, longitude, address, postType } = req.body;
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
    const imageFiles = allFiles.filter((f) => f.mimetype.startsWith("image/"));
    const videoFiles = allFiles.filter((f) => f.mimetype.startsWith("video/"));

    // Upload lên Cloudinary (nếu đã cấu hình) hoặc dùng local URL
    let images, videos;
    if (isCloudinaryConfigured && (imageFiles.length || videoFiles.length)) {
      const [imgUploads, vidUploads] = await Promise.all([
        Promise.all(imageFiles.map((f) =>
          uploadImageToCloudinary(f.buffer, `posts/${userId}`)
        )),
        Promise.all(videoFiles.map((f) =>
          uploadVideoToCloudinary(f.buffer, `posts/${userId}/videos`)
        )),
      ]);
      images = imgUploads;
      videos = vidUploads;
    } else {
      // Local fallback — giữ nguyên hành vi cũ
      images = imageFiles.map((f) => ({
        url: buildLocalMediaUrl(req, f.path),
        filename: f.filename,
      }));
      videos = videoFiles.map((f) => ({
        url: buildLocalMediaUrl(req, f.path),
        filename: f.filename,
      }));
    }

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

    // Xác định loại bài và thời hạn SOS
    const resolvedPostType = postType === "sos" ? "sos" : "normal";
    const sosExpiresAt =
      resolvedPostType === "sos"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // +24h
        : null;

    const post = await Post.create({
      author: userId,
      content: content?.trim(),
      tags: extractedTags,
      images,
      videos,
      location,
      visibility: visibility || "public",
      postType: resolvedPostType,
      sosExpiresAt,
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

    // Xóa cache feed sau khi đăng bài mới
    cacheDelPattern("feed:");
    cacheDelPattern("recommended:");

    // Emit Socket.IO event cho real-time feed
    try {
      import("../socket/index.js").then(({ getIo }) => {
        getIo().emit("newPost", post);
      });
    } catch (e) {
      console.warn("Socket newPost error:", e);
    }

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
    const userId = req.user ? req.user._id : null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // Cache key theo user + page (feed riêng mỗi user, TTL 30 giây)
    // Không cache khi filter theo authorId (profile view)
    const canCache = !req.query.authorId;
    const cacheKey = `feed:${userId || 'public'}:p${page}:l${limit}`;

    const result = await withCache(cacheKey, canCache ? 30 : 0, async () => {
      const friendAuthorIds = userId ? await getFriendAuthorIds(userId) : [];

      const filter = {
        status: "active",
      };
      if (userId) {
        filter.hiddenBy = { $nin: [userId] };
      }

      if (req.query.authorId) {
        const aid = req.query.authorId;
        filter.author = aid;
        const profileVis = authorProfileVisibilityMatch(aid, userId?.toString() || null, friendAuthorIds);
        if (profileVis) filter.$and = [profileVis];
      } else {
        filter.$and = [feedVisibilityMatch(userId?.toString() || null, friendAuthorIds)];
      }

      const [posts, total] = await Promise.all([
        Post.find(filter)
          .sort({ postType: -1, createdAt: -1 }) // SOS trước, sau đó đến Normal
          .skip(skip)
          .limit(limit)
          // Chỉ lấy fields cần thiết
          .select("author content tags images videos location likesCount dislikesCount score commentsCount sharesCount savedBy postType sosCategory visibility status createdAt")
          .populate("author", "name email avatar")
          .lean(),
        Post.countDocuments(filter),
      ]);

      const postIds = posts.map((p) => p._id.toString());
      const locationMap = await getPostLocations(postIds);

      const userReactions = userId ? await Like.find({
        user: userId,
        target: { $in: postIds },
        targetType: "Post",
      }).lean() : [];
      const reactionMap = userReactions.reduce((acc, r) => {
        acc[r.target.toString()] = r.type;
        return acc;
      }, {});

      const savedPostIds = new Set(
        userId ? posts.filter((p) => p.savedBy?.some((id) => id.toString() === userId.toString())).map((p) => p._id.toString()) : []
      );

      const enrichedPosts = posts.map((post) => ({
        ...post,
        location: locationMap[post._id.toString()] || post.location,
        userReaction: reactionMap[post._id.toString()] || null,
        isSaved: savedPostIds.has(post._id.toString()),
      }));

      return {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + posts.length < total,
        },
      };
    });

    // Cache-Control cho client và CDN (feed thay đổi nhanh → ngắn)
    res.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return res.json(result);
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
    const userId = req.user ? req.user._id : null;

    const query = { _id: id, status: "active" };
    if (userId) {
      query.hiddenBy = { $nin: [userId] };
    }

    const post = await Post.findOne(query)
      .populate("author", "name email avatar")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    const friendAuthorIds = userId ? await getFriendAuthorIds(userId) : [];
    if (!canViewerSeePost(post, userId?.toString() || null, friendAuthorIds)) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    const [locationData, userLike] = await Promise.all([
      getPostLocation(id),
      userId ? Like.findOne({ user: userId, target: id, targetType: "Post" }).lean() : Promise.resolve(null),
    ]);

    return res.json({
      post: {
        ...post,
        location: locationData || post.location,
        userReaction: userLike?.type || null,
        isSaved: userId ? (post.savedBy?.some((uid) => uid.toString() === userId.toString()) || false) : false,
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

    // Soft delete: đánh dấu xóa, MongoDB TTL index sẽ tự hard delete sau 30 ngày
    post.status = "deleted";
    post.deletedAt = new Date();
    await post.save();

    // Xóa GIS data ngay (không cần giữ lại)
    await deletePostLocation(id);

    // Xóa ảnh/video trên Cloudinary (background, không block response)
    if (isCloudinaryConfigured) {
      const allMedia = [
        ...post.images.filter((img) => img.publicId).map((img) => ({ id: img.publicId, type: "image" })),
        ...post.videos.filter((vid) => vid.publicId).map((vid) => ({ id: vid.publicId, type: "video" })),
      ];
      Promise.all(allMedia.map((m) => deleteFromCloudinary(m.id, m.type))).catch(
        (e) => console.warn("Cloudinary cleanup warning:", e.message)
      );
    }

    // Xóa cache liên quan
    cacheDelPattern("feed:");
    cacheDelPattern("recommended:");

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

    // ĐỒNG BỘ: Ẩn bài viết khỏi bảng tin của người báo cáo
    await Post.findByIdAndUpdate(id, { $addToSet: { hiddenBy: userId } });

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

    const friendAuthorIds = userId ? await getFriendAuthorIds(userId) : [];
    const vis = feedVisibilityMatch(userId?.toString() || null, friendAuthorIds);

    const query = {
      _id: { $in: ids },
      status: "active",
      $and: [vis],
    };
    if (userId) query.hiddenBy = { $nin: [userId] };

    const postsRaw = await Post.find(query)
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
    const userReactions = userId ? await Like.find({
      user: userId,
      target: { $in: postIds },
      targetType: "Post",
    }).lean() : [];
    const reactionMap = userReactions.reduce((acc, r) => {
      acc[r.target.toString()] = r.type;
      return acc;
    }, {});

    const savedPostIds = new Set(
      userId ? sorted
        .filter((p) => p.savedBy?.some((id) => id.toString() === userId.toString()))
        .map((p) => p._id.toString()) : []
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

// ─────────────────────────────────────────────
// Thuật Toán Đề Xuất Bài Viết
// ─────────────────────────────────────────────

/**
 * Hàm tiện ích: enrich danh sách posts với location, userReaction, isSaved
 */
const enrichPosts = async (posts, userId, locationMap = {}, reactionMap = {}, savedSet = new Set()) => {
  return posts.map((post) => ({
    ...post,
    location: locationMap[post._id.toString()] || post.location,
    userReaction: reactionMap[post._id.toString()] || null,
    isSaved: savedSet.has(post._id.toString()),
  }));
};

/**
 * GET /api/posts/recommended
 * Thuật toán đề xuất bài viết theo 5 tầng ưu tiên:
 *   Tầng 1: SOS    — bài cảnh báo khẩn (postType=sos, còn hạn 24h)
 *   Tầng 2: Bạn bè  — tác giả mutual-follow, mới nhất (~40% slot)
 *   Tầng 3: Gần    — trong bán kính 10km (~20% slot, cần gửi lat+lng)
 *   Tầng 4: Nổi bật — score cao nhất chưa xuất hiện (~20% slot)
 *   Tầng 5: Còn lại — fill nốt slot trống, mới nhất
 *
 * Query params:
 *   page   (default: 1)  — chỉ áp dụng cho tầng 5
 *   limit  (default: 20) — tổng số bài trả về
 *   lat    (optional)    — vĩ độ user (bật tầng 3)
 *   lng    (optional)    — kinh độ user (bật tầng 3)
 *   radius (optional, default: 10000m)
 */
export const getRecommendedFeed = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const userIdStr = userId ? userId.toString() : null;

    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const lat   = parseFloat(req.query.lat);
    const lng   = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radius) || 10000, 50000); // default 10km
    const hasGPS = Number.isFinite(lat) && Number.isFinite(lng);

    const now = new Date();

    // Tính số slot cho mỗi tầng
    const friendSlots  = Math.round(limit * 0.40); // 40%
    const nearbySlots  = Math.round(limit * 0.20); // 20%
    const topSlots     = Math.round(limit * 0.20); // 20%
    // SOS không giới hạn slot — luôn ưu tiên tuyệt đối

    // ─ Context ───────────────────────────────────────────
    const [friendAuthorIds, nearbyRows] = await Promise.all([
      userId ? getFriendAuthorIds(userId) : Promise.resolve([]),
      hasGPS && process.env.POSTGRES_URI
        ? findNearbyPostIds(lat, lng, radius, nearbySlots * 3).catch((e) => {
            console.warn("findNearbyPostIds skipped:", e.message);
            return [];
          })
        : Promise.resolve([]),
    ]);

    const visFilter = feedVisibilityMatch(userIdStr, friendAuthorIds);
    const baseFilter = {
      status: "active",
      $and: [visFilter],
    };
    if (userId) baseFilter.hiddenBy = { $nin: [userId] };

    // ID bài viết đã đưa vào kết quả (để loại trậng lấp)
    const seenIds = new Set();
    const addToSeen = (posts) => posts.forEach((p) => seenIds.add(p._id.toString()));

    // ─ Tầng 1: SOS ────────────────────────────────────
    const sosPosts = await Post.find({
      ...baseFilter,
      postType: "sos",
      $and: [
        visFilter,
        {
          $or: [
            { sosExpiresAt: null },
            { sosExpiresAt: { $gt: now } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("author", "name email avatar")
      .lean();
    addToSeen(sosPosts);

    // ─ Tầng 2: Bạn bè ───────────────────────────────
    const friendPosts = friendAuthorIds.length > 0
      ? await Post.find({
          ...baseFilter,
          author: { $in: friendAuthorIds },
          _id: { $nin: [...seenIds] },
          $and: [visFilter],
        })
          .sort({ createdAt: -1 })
          .limit(friendSlots)
          .populate("author", "name email avatar")
          .lean()
      : [];
    addToSeen(friendPosts);

    // ─ Tầng 3: Gần vị trí (PostGIS) ─────────────────
    let nearbyPosts = [];
    const nearbyLocationMap = {};
    if (nearbyRows.length > 0) {
      const nearbyIds = nearbyRows
        .map((r) => r.post_id)
        .filter((id) => !seenIds.has(id));

      if (nearbyIds.length > 0) {
        const nearbyRaw = await Post.find({
          ...baseFilter,
          _id: { $in: nearbyIds },
          $and: [visFilter],
        })
          .populate("author", "name email avatar")
          .lean();

        // Sắp xếp theo thứ tự khoảng cách từ PostGIS
        const orderMap = Object.fromEntries(nearbyIds.map((id, i) => [id, i]));
        nearbyPosts = nearbyRaw
          .sort((a, b) => (orderMap[a._id.toString()] ?? 999) - (orderMap[b._id.toString()] ?? 999))
          .slice(0, nearbySlots);

        // Lưu location data để enrich sau
        nearbyRows.forEach((r) => { nearbyLocationMap[r.post_id] = r; });
      }
    }
    addToSeen(nearbyPosts);

    // ─ Tầng 4: Điểm cao (score) ───────────────────
    const topPosts = await Post.find({
      ...baseFilter,
      _id: { $nin: [...seenIds] },
      score: { $gt: 0 },
      $and: [visFilter],
    })
      .sort({ score: -1, createdAt: -1 })
      .limit(topSlots)
      .populate("author", "name email avatar")
      .lean();
    addToSeen(topPosts);

    // ─ Tầng 5: Còn lại (pagination) ──────────────
    const usedSlots = sosPosts.length + friendPosts.length + nearbyPosts.length + topPosts.length;
    const remainingSlots = Math.max(0, limit - usedSlots);
    const remainingSkip  = (page - 1) * remainingSlots;

    let remainingPosts = [];
    let remainingTotal = 0;

    if (remainingSlots > 0) {
      const remainingFilter = {
        ...baseFilter,
        _id: { $nin: [...seenIds] },
        $and: [visFilter],
      };
      [remainingPosts, remainingTotal] = await Promise.all([
        Post.find(remainingFilter)
          .sort({ createdAt: -1 })
          .skip(remainingSkip)
          .limit(remainingSlots)
          .populate("author", "name email avatar")
          .lean(),
        Post.countDocuments(remainingFilter),
      ]);
    }

    // ─ Merge kết quả ───────────────────────────────
    const allPosts = [
      ...sosPosts,
      ...friendPosts,
      ...nearbyPosts,
      ...topPosts,
      ...remainingPosts,
    ];

    // Thu thập IDs để batch-query
    const allIds = allPosts.map((p) => p._id.toString());

    // Location map (MongoDB fallback + PostGIS nearby)
    const pgLocationMap = await getPostLocations(allIds);
    const locationMap = { ...pgLocationMap, ...nearbyLocationMap };

    // Reaction map
    const userReactions = await Like.find({
      user: userId,
      target: { $in: allIds },
      targetType: "Post",
    }).lean();
    const reactionMap = userReactions.reduce((acc, r) => {
      acc[r.target.toString()] = r.type;
      return acc;
    }, {});

    // Saved set
    const savedSet = new Set(
      allPosts
        .filter((p) => p.savedBy?.some((id) => id.toString() === userIdStr))
        .map((p) => p._id.toString())
    );

    // Enrich và thêm metadata tầng
    const tagPost = (post, tier, extra = {}) => ({
      ...post,
      location: locationMap[post._id.toString()] || post.location,
      userReaction: reactionMap[post._id.toString()] || null,
      isSaved: savedSet.has(post._id.toString()),
      _tier: tier,
      ...extra,
    });

    const enrichedPosts = [
      ...sosPosts.map((p) => tagPost(p, "sos")),
      ...friendPosts.map((p) => tagPost(p, "friends")),
      ...nearbyPosts.map((p) =>
        tagPost(p, "nearby", {
          distanceM: nearbyLocationMap[p._id.toString()]?.distance_m,
        })
      ),
      ...topPosts.map((p) => tagPost(p, "top")),
      ...remainingPosts.map((p) => tagPost(p, "remaining")),
    ];

    return res.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        total: usedSlots + remainingTotal,
        hasMore: remainingSkip + remainingPosts.length < remainingTotal,
      },
      meta: {
        tiers: {
          sos: sosPosts.length,
          friends: friendPosts.length,
          nearby: nearbyPosts.length,
          top: topPosts.length,
          remaining: remainingPosts.length,
        },
      },
    });
  } catch (err) {
    console.error("getRecommendedFeed error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};


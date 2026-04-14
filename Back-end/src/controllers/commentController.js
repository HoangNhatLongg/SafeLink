import Comment from "../models/commentModel.js";
import Post from "../models/postModel.js";
import Like from "../models/likeModel.js";
import { findActivePostVisibleToUser } from "../utils/postVisibility.js";

// ─────────────────────────────────────────────
// Bình luận
// ─────────────────────────────────────────────

/**
 * POST /api/posts/:id/comments
 * Thêm bình luận gốc vào bài viết
 */
export const addComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống." });
    }

    const post = await findActivePostVisibleToUser(postId, userId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const comment = await Comment.create({
      post: postId,
      author: userId,
      content: content.trim(),
      parentComment: null,
    });

    // Tăng commentsCount của bài viết
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    await comment.populate("author", "name email");

    return res.status(201).json({ message: "Đã đăng bình luận.", comment });
  } catch (err) {
    console.error("addComment error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * POST /api/comments/:id/replies
 * Thêm bình luận con (reply) — flat replies cùng parentComment = root.
 * Body: { content, replyToUserId? }
 *   replyToUserId: ID của user đang được reply (để tag tên)
 */
export const addReply = async (req, res) => {
  try {
    const { id: parentId } = req.params;
    const userId = req.user._id;
    const { content, replyToUserId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống." });
    }

    const parent = await Comment.findOne({ _id: parentId, status: "active" });
    if (!parent) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const postVisible = await findActivePostVisibleToUser(parent.post, userId);
    if (!postVisible) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    // Flat replies: nếu đang reply một reply con, gắn lên root comment
    const rootParentId = parent.parentComment ? parent.parentComment : parentId;

    // replyTo: tag người được reply (có thể là tác giả của parent hoặc một reply khác)
    const replyToId = replyToUserId || parent.author;

    const reply = await Comment.create({
      post: parent.post,
      author: userId,
      content: content.trim(),
      parentComment: rootParentId,
      replyTo: replyToId,
    });

    // Tăng repliesCount của root comment và commentsCount của post
    await Promise.all([
      Comment.findByIdAndUpdate(rootParentId, { $inc: { repliesCount: 1 } }),
      Post.findByIdAndUpdate(parent.post, { $inc: { commentsCount: 1 } }),
    ]);

    await reply.populate([
      { path: "author", select: "name email avatar _id" },
      { path: "replyTo", select: "name email avatar _id" },
    ]);

    return res.status(201).json({ message: "Đã đăng bình luận con.", comment: reply });
  } catch (err) {
    console.error("addReply error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/posts/:id/comments
 * Lấy danh sách bình luận gốc của bài viết (phân trang)
 */
export const getComments = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user ? req.user._id : null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const post = await findActivePostVisibleToUser(postId, userId);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết." });

    const [comments, total] = await Promise.all([
      Comment.find({ post: postId, parentComment: null, status: "active" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "author", select: "name email avatar _id" })
        .lean(),
      Comment.countDocuments({ post: postId, parentComment: null, status: "active" }),
    ]);

    // Gắn reaction của user
    const commentIds = comments.map((c) => c._id.toString());
    const userReactions = userId ? await Like.find({
      user: userId,
      target: { $in: commentIds },
      targetType: "Comment",
    }).lean() : [];
    const reactionMap = userReactions.reduce((acc, r) => {
      acc[r.target.toString()] = r.type;
      return acc;
    }, {});

    const enriched = comments.map((c) => ({
      ...c,
      userReaction: reactionMap[c._id.toString()] || null,
    }));

    return res.json({
      comments: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + comments.length < total,
      },
    });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * GET /api/comments/:id/replies
 * Lấy danh sách bình luận con của 1 bình luận
 */
export const getReplies = async (req, res) => {
  try {
    const { id: parentId } = req.params;
    const userId = req.user ? req.user._id : null;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const parent = await Comment.findOne({ _id: parentId, status: "active" }).lean();
    if (!parent) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const postVisible = await findActivePostVisibleToUser(parent.post, userId);
    if (!postVisible) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const [replies, total] = await Promise.all([
      Comment.find({ parentComment: parentId, status: "active" })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "author", select: "name email avatar _id" })
        .populate({ path: "replyTo", select: "name email avatar _id" })
        .lean(),
      Comment.countDocuments({ parentComment: parentId, status: "active" }),
    ]);

    const replyIds = replies.map((r) => r._id.toString());
    const userReactions = userId ? await Like.find({
      user: userId,
      target: { $in: replyIds },
      targetType: "Comment",
    }).lean() : [];
    const reactionMap = userReactions.reduce((acc, r) => {
      acc[r.target.toString()] = r.type;
      return acc;
    }, {});

    const enriched = replies.map((r) => ({
      ...r,
      userReaction: reactionMap[r._id.toString()] || null,
    }));

    return res.json({
      replies: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getReplies error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * PUT /api/comments/:id
 * Chỉnh sửa bình luận (chỉ tác giả)
 */
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung không được để trống." });
    }

    const comment = await Comment.findOne({ _id: id, status: "active" });
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa bình luận này." });
    }

    comment.content = content.trim();
    await comment.save();
    await comment.populate({ path: "author", select: "name email avatar _id" });

    return res.json({ message: "Đã cập nhật bình luận.", comment });
  } catch (err) {
    console.error("updateComment error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * DELETE /api/comments/:id
 * Xóa bình luận (tác giả hoặc moderator/admin)
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const comment = await Comment.findOne({ _id: id, status: "active" });
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const isAuthor = comment.author.toString() === userId.toString();
    const isModerator = ["moderator", "admin"].includes(userRole);
    if (!isAuthor && !isModerator) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này." });
    }

    comment.status = "deleted";
    await comment.save();

    // Giảm commentsCount
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    // Nếu là con, giảm repliesCount của cha
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { repliesCount: -1 } });
    }

    return res.json({ message: "Đã xóa bình luận." });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

/**
 * POST /api/comments/:id/like
 * Toggle like/dislike bình luận
 */
export const reactToComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { type } = req.body; // "like" hoặc "dislike"

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ message: "type phải là 'like' hoặc 'dislike'." });
    }

    const comment = await Comment.findOne({ _id: id, status: "active" });
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const postVisible = await findActivePostVisibleToUser(comment.post, userId);
    if (!postVisible) return res.status(404).json({ message: "Không tìm thấy bình luận." });

    const existing = await Like.findOne({ user: userId, target: id, targetType: "Comment" });

    let likesDelta = 0;
    let dislikesDelta = 0;
    let userReaction = null;
    let action = "";

    if (!existing) {
      await Like.create({ user: userId, target: id, targetType: "Comment", type });
      type === "like" ? likesDelta++ : dislikesDelta++;
      userReaction = type;
      action = "added";
    } else if (existing.type === type) {
      await existing.deleteOne();
      type === "like" ? likesDelta-- : dislikesDelta--;
      userReaction = null;
      action = "removed";
    } else {
      if (existing.type === "like") { likesDelta--; dislikesDelta++; }
      else { dislikesDelta--; likesDelta++; }
      existing.type = type;
      await existing.save();
      userReaction = type;
      action = "changed";
    }

    const updated = await Comment.findByIdAndUpdate(
      id,
      { $inc: { likesCount: likesDelta, dislikesCount: dislikesDelta } },
      { new: true }
    );

    return res.json({
      action,
      userReaction,
      likesCount: updated.likesCount,
      dislikesCount: updated.dislikesCount,
    });
  } catch (err) {
    console.error("reactToComment error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

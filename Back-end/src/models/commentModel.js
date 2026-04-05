import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    // null = bình luận gốc; ref = bình luận con
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    // Thống kê phản ứng bình luận
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },

    // Số lượng bình luận con (denormalized)
    repliesCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Lấy bình luận gốc của 1 bài viết mới nhất
commentSchema.index({ post: 1, parentComment: 1, status: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;

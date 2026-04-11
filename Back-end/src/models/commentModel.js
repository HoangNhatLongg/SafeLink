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

    // null = bình luận gốc; có giá trị = bình luận con (luôn trỏ về root comment)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    /**
     * Người được tag khi reply (bình luận cùng cấp).
     * Tất cả replies đều cùng parentComment = root, nhưng replyTo
     * chỉ ra user nào đang được trả lời cụ thể trong luồng.
     */
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

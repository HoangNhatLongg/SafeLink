import mongoose from "mongoose";

/**
 * LikeModel — dùng cho cả bài viết và bình luận
 * targetType: "Post" hoặc "Comment"
 */
const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
    targetType: {
      type: String,
      enum: ["Post", "Comment"],
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: mỗi user chỉ có 1 reaction cho 1 target
likeSchema.index({ user: 1, target: 1, targetType: 1 }, { unique: true });

// Truy vấn: lấy tất cả likes của 1 post/comment
likeSchema.index({ target: 1, targetType: 1, type: 1 });

const Like = mongoose.model("Like", likeSchema);
export default Like;

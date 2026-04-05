import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      maxlength: 5000,
    },

    // Media đính kèm
    images: [
      {
        url: { type: String, required: true },
        filename: String,
      },
    ],
    videos: [
      {
        url: { type: String, required: true },
        filename: String,
      },
    ],

    // Thông tin vị trí (GPS từ thiết bị - raw data)
    location: {
      latitude: Number,
      longitude: Number,
      address: String, // reverse-geocoded hoặc do user cung cấp
    },

    // Quyền xem
    visibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },

    // ===== Thống kê (denormalized để query nhanh) =====
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },

    // Điểm bài viết = likesCount - dislikesCount
    score: { type: Number, default: 0, index: true },

    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },

    // Danh sách user đã lưu bài viết này
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Danh sách user đã ẩn bài viết này
    hiddenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Trạng thái bài viết
    status: {
      type: String,
      enum: ["active", "deleted", "flagged"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ======= Indexes =======
// Feed query: lấy bài active mới nhất
postSchema.index({ status: 1, createdAt: -1 });
// Score-based ranking (cho sau này)
postSchema.index({ status: 1, score: -1 });
// Lấy bài của 1 user
postSchema.index({ author: 1, status: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);
export default Post;

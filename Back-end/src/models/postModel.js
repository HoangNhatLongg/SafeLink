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
    
    // Hashtags
    tags: [
      { type: String, index: true }
    ],

    // Media đính kèm
    images: [
      {
        url:       { type: String, required: true }, // URL gốc / large (hoặc local fallback)
        // Cloudinary multi-size (undefined nếu dùng local storage)
        thumbnail: { type: String }, // ~150x150 — dùng cho grid/avatar
        medium:    { type: String }, // ~600px   — dùng trong feed
        large:     { type: String }, // ~1200px  — dùng khi xem chi tiết
        publicId:  { type: String }, // Cloudinary public_id để xóa sau này
        filename:  { type: String }, // filename gốc (local fallback)
        width:     { type: Number },
        height:    { type: Number },
        format:    { type: String, default: "webp" },
      },
    ],
    videos: [
      {
        url:       { type: String, required: true },
        thumbnail: { type: String }, // Ảnh đại diện video
        publicId:  { type: String }, // Cloudinary public_id
        filename:  { type: String },
        duration:  { type: Number }, // giây
        width:     { type: Number },
        height:    { type: Number },
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

    // Loại bài viết (SOS, bình thường)
    postType: {
      type: String,
      enum: ["normal", "sos"],
      default: "normal",
      index: true,
    },

    // ===== SOS-specific fields =====
    // Danh mục khẩn cấp
    sosCategory: {
      type: String,
      enum: ["fire", "landslide", "traffic", "robbery", "medical", "flood", "sos_support", "vehicle_repair", "other"],
      default: null,
    },

    // Bán kính cảnh báo (mét)
    sosRadius: {
      type: Number,
      default: 1000, // 1km mặc định
    },

    // Trạng thái SOS
    sosStatus: {
      type: String,
      enum: ["active", "resolved", "expired"],
      default: "active",
      index: true,
    },

    // Ai resolve SOS này
    sosResolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Thời gian hết hạn của SOS (24h sau khi tạo)
    sosExpiresAt: {
      type: Date,
      default: null,
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

    // Thời điểm bị xóa (soft delete)
    // TTL index sẽ tự động hard delete sau 30 ngày
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ======= Indexes =======
// Feed query: lấy bài active mới nhất
postSchema.index({ status: 1, createdAt: -1 });
// Score-based ranking
postSchema.index({ status: 1, score: -1 });
// Lấy bài của 1 user
postSchema.index({ author: 1, status: 1, createdAt: -1 });
// Hỗ trợ truy vấn feed theo loại bài viết
postSchema.index({ postType: 1, status: 1, createdAt: -1 });
// TTL: tự động hard delete bài sau 30 ngày kể từ khi xóa mềm
// (chỉ active khi deletedAt != null, document có deletedAt = null sẽ bị bỏ qua)
postSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Post = mongoose.model("Post", postSchema);
export default Post;

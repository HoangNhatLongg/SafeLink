import mongoose from "mongoose";

// Schema cho từng bước thực hiện kỹ năng
const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
    // Ảnh minh họa cho bước này (tối đa 3 ảnh)
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String }, // Cloudinary public_id để xóa sau này
      },
    ],
  },
  { _id: false }
);

const skillSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    summary: { type: String, trim: true, maxlength: 500 }, // Mô tả ngắn hiện trên card
    category: {
      type: String,
      enum: ["so_cap_cuu", "pccc", "thien_tai", "an_toan_dien", "tai_nan", "tam_ly", "khac"],
      required: true,
      index: true,
    },
    // Ảnh bìa hiển thị trên card
    coverImage: {
      url: { type: String },
      publicId: { type: String },
    },
    // Link video YouTube (embed) hoặc URL trực tiếp
    videoUrl: { type: String, trim: true, maxlength: 500 },
    // Danh sách các bước thực hiện
    steps: { type: [stepSchema], default: [] },
    // Tags liên quan
    tags: [{ type: String, trim: true, maxlength: 50 }],
    difficulty: {
      type: String,
      enum: ["co_ban", "trung_binh", "nang_cao"],
      default: "co_ban",
    },
    // Ước tính thời gian thực hiện, ví dụ: "5-10 phút"
    duration: { type: String, trim: true, maxlength: 50 },
    status: {
      type: String,
      enum: ["active", "pending", "rejected", "hidden"],
      default: "pending",
      index: true,
    },
    // Người đóng góp
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Moderator duyệt
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectReason: { type: String, maxlength: 500 },
    // Thống kê
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes để query hiệu quả
skillSchema.index({ status: 1, category: 1 });
skillSchema.index({ status: 1, createdAt: -1 });
skillSchema.index({ title: "text", summary: "text", tags: "text" });

const Skill = mongoose.model("Skill", skillSchema);
export default Skill;

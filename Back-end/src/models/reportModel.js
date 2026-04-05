import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "inappropriate",       // Nội dung không phù hợp
        "misinformation",      // Thông tin sai lệch
        "harassment",          // Quấy rối
        "violence",            // Bạo lực
        "copyright",           // Vi phạm bản quyền
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Mỗi user chỉ báo cáo 1 bài viết 1 lần
reportSchema.index({ post: 1, reporter: 1 }, { unique: true });

const Report = mongoose.model("Report", reportSchema);
export default Report;

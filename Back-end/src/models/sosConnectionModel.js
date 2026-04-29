import mongoose from "mongoose";

const sosConnectionSchema = new mongoose.Schema(
  {
    sosId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Người tạo SOS
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Người muốn hỗ trợ
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "resolved"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Ngăn một người tạo nhiều yêu cầu cho cùng 1 SOS
sosConnectionSchema.index({ sosId: 1, helperId: 1 }, { unique: true });

const SOSConnection = mongoose.model("SOSConnection", sosConnectionSchema);
export default SOSConnection;

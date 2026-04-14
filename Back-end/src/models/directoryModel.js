import mongoose from "mongoose";

const directorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    province: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 100 },
    ward: { type: String, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: ["csgt", "pccc", "canh_sat", "benh_vien", "cuu_thuong", "khac"],
      default: "khac",
      index: true,
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "pending",
      index: true,
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

directorySchema.index({ province: 1, district: 1 });
directorySchema.index({ lat: 1, lng: 1 });
directorySchema.index({ name: "text", address: "text" });

const Directory = mongoose.model("Directory", directorySchema);
export default Directory;

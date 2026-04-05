import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: không theo dõi trùng
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Tra cứu người theo dõi của ai đó
followSchema.index({ following: 1 });

// Tra cứu ai đang được follower theo dõi
followSchema.index({ follower: 1 });

const Follow = mongoose.model("Follow", followSchema);
export default Follow;

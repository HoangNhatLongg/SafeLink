import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  token: String,
  expiresAt: Date
},{
  timestamps:true
});

export default mongoose.model("AuthToken", tokenSchema);
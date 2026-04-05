import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: String,
  otpCode: String,
  action: {
    type: String,
    enum: ["REGISTER", "RESET_PASSWORD", "NEW_DEVICE"]
  },
  expiresAt: Date
},{
  timestamps:true
});

export default mongoose.model("Otp", otpSchema);
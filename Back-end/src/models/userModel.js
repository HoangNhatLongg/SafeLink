import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
  },
  avatar: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    // Not required anymore since OAuth users won't have it
  },
  authType: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local"
  },
  googleId: String,
  facebookId: String,
  role: {
    type: String,
    enum: ["user", "moderator", "admin"],
    default: "user"
  },
  status: {
    type: String,
    enum: ["active","banned"],
    default: "active"
  },
  devices: [{
    deviceId: String,
    pushToken: String,
    isTrusted: { type: Boolean, default: false },
    lastLogin: Date
  }],
  failedLoginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: {
    type: Date
  }
},
{
  timestamps: true
}
);

export default mongoose.model("User", userSchema);
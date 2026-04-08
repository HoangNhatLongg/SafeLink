import mongoose from 'mongoose';

/** Privacy settings — user tự chọn field nào hiển thị công khai */
const privacySchema = new mongoose.Schema(
  {
    showBirthday: { type: Boolean, default: false },
    showHometown:  { type: Boolean, default: true  },
    showPhone:     { type: Boolean, default: false },
    showEmail:     { type: Boolean, default: false },
    showFollowers: { type: Boolean, default: true },
    showFollowing: { type: Boolean, default: true },
  },
  { _id: false }
);

/** Thông tin hồ sơ mở rộng */
const profileSchema = new mongoose.Schema(
  {
    bio:      { type: String, default: '', maxlength: 500 },
    birthday: { type: Date },
    hometown: { type: String, default: '', maxlength: 100 },
    phone:    { type: String, default: '', maxlength: 20 },
    privacy:  { type: privacySchema, default: () => ({}) },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    avatar: {
      type: String,
      default: '/assets/images/AnhDaiDien.jpg',
    },
    cover: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String },
    authType: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    googleId:   String,
    facebookId: String,
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active',
    },
    profile: { type: profileSchema, default: () => ({}) },
    devices: [
      {
        deviceId:  String,
        pushToken: String,
        isTrusted: { type: Boolean, default: false },
        lastLogin: Date,
      },
    ],
    failedLoginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);

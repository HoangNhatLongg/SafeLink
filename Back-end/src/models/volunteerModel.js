import mongoose from "mongoose";

/**
 * Model đơn vị cứu hộ / tình nguyện đăng ký
 * Tách biệt khỏi Directory (danh bạ chính thức)
 * Sau khi duyệt sẽ hiển thị trên tab Danh Bạ với badge "Tình Nguyện"
 */
const volunteerSchema = new mongoose.Schema(
  {
    // ─── Thông tin đơn vị ─────────────────────────────
    unitName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    unitType: {
      type: String,
      enum: [
        "sua_xe",      // 🔧 Vá/Sửa xe di động
        "doi_sos",     // 🆘 Đội SOS tình nguyện
        "ho_tro_lu",   // 🌊 Hỗ trợ lũ lụt / thiên tai
        "cuu_nan",     // 🛟 Cứu nạn cứu hộ
        "y_te_tn",     // ❤️ Y tế tình nguyện
        "van_chuyen",  // 🚗 Hỗ trợ vận chuyển
        "on_dinh",     // 🏠 Hỗ trợ ổn định cuộc sống
        "khac",        // 🤝 Khác
      ],
      required: true,
      index: true,
    },
    entityKind: {
      type: String,
      enum: ["individual", "group"], // Cá nhân / Nhóm/Tổ chức
      default: "individual",
    },

    // ─── Thông tin liên hệ ────────────────────────────
    contactName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    province: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 100 },
    ward: { type: String, trim: true, maxlength: 100 },

    // ─── Vị trí GPS ────────────────────────────────────
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

    // ─── Mô tả chi tiết ────────────────────────────────
    description: { type: String, trim: true, maxlength: 2000 },
    serviceArea: { type: String, trim: true, maxlength: 500 }, // Phạm vi hoạt động
    availableTime: { type: String, trim: true, maxlength: 200 }, // Thời gian hoạt động
    note: { type: String, trim: true, maxlength: 1000 },

    // ─── Loại dịch vụ: miễn phí / có thu phí / thỏa thuận ────────
    serviceType: {
      type: String,
      enum: ["free", "paid", "negotiable"],
      default: "free",
      required: true,
      index: true,
    },
    // Ghi chú giá (chỉ hiển thị khi serviceType !== 'free')
    priceNote: { type: String, trim: true, maxlength: 300 },

    // ─── Ảnh xác minh ──────────────────────────────────
    verificationImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String }, // Cloudinary publicId (nếu dùng Cloudinary)
        filename: { type: String }, // Local filename (fallback)
      },
    ],

    // ─── Trạng thái duyệt ──────────────────────────────
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
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

volunteerSchema.index({ province: 1, district: 1 });
volunteerSchema.index({ lat: 1, lng: 1 });
volunteerSchema.index({ unitName: "text", description: "text", serviceArea: "text" });

const Volunteer = mongoose.model("Volunteer", volunteerSchema);
export default Volunteer;

/**
 * Upload Middleware — Cloudinary (primary) + Local disk (fallback)
 * ─────────────────────────────────────────────
 * Nếu Cloudinary đã cấu hình:
 *   → Memory storage → Upload to Cloudinary → Trả về CDN URLs (thumbnail/medium/large)
 * Nếu chưa cấu hình:
 *   → Fallback về disk storage (phát triển local)
 *
 * Pipeline ảnh khi dùng Cloudinary:
 *   Upload → WebP convert → Resize 3 kích thước → CDN cache
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinaryConfig.js";

// Re-export for convenience (postController imports from upload.js)
export { isCloudinaryConfigured };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Giới hạn file ───────────────────────────────────────

const IMAGE_MAX_MB = 15;
const VIDEO_MAX_MB = 200;
const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

const ALLOWED_IMAGE_MIME = [
  "image/jpeg", "image/jpg", "image/png",
  "image/gif", "image/webp", "image/heic", "image/heif",
];
const ALLOWED_VIDEO_MIME = [
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "video/webm", "video/3gpp",
];
const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Loại file không được hỗ trợ (${file.mimetype}). Chỉ chấp nhận ảnh và video phổ biến.`), false);
  }
};

// ─── Cloudinary Upload ───────────────────────────────────

/**
 * Upload một buffer ảnh lên Cloudinary
 * Tự động tạo 3 kích thước: thumbnail (150px), medium (600px), large (1200px)
 * Chuyển đổi sang WebP, nén tự động
 * Trả về URLs CDN bất biến (immutable) → cache 1 năm
 */
export const uploadImageToCloudinary = (buffer, folder = "posts") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "webp",                   // Convert sang WebP
        quality: "auto:good",             // Nén tự động tốt
        // Tạo sẵn 3 kích thước khi upload
        eager: [
          // Thumbnail: 150x150 crop (avatar, grid nhỏ)
          { width: 150, height: 150, crop: "fill", quality: "auto:low", format: "webp" },
          // Medium: max 600px wide (hiển thị trong feed)
          { width: 600, crop: "limit", quality: "auto:good", format: "webp" },
          // Large: max 1200px wide (xem chi tiết)
          { width: 1200, crop: "limit", quality: "auto:best", format: "webp" },
        ],
        eager_async: false,               // Đồng bộ để có URLs ngay
        // Thêm version vào URL → cache buster tự động khi ảnh thay đổi
        use_filename: false,
        unique_filename: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId:  result.public_id,
          url:       result.secure_url,         // Original (có thể rất lớn)
          thumbnail: result.eager[0]?.secure_url ?? result.secure_url,
          medium:    result.eager[1]?.secure_url ?? result.secure_url,
          large:     result.eager[2]?.secure_url ?? result.secure_url,
          width:  result.width,
          height: result.height,
          bytes:  result.bytes,
          format: result.format,   // "webp"
        });
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};

/**
 * Upload video lên Cloudinary
 */
export const uploadVideoToCloudinary = (buffer, folder = "posts/videos") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
        quality: "auto",
        eager: [
          // Thumbnail từ giây đầu tiên của video
          { resource_type: "image", format: "webp", width: 600, crop: "limit" },
        ],
        eager_async: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId:  result.public_id,
          url:       result.secure_url,
          thumbnail: result.eager?.[0]?.secure_url ?? null,
          width:  result.width,
          height: result.height,
          duration: result.duration,
          bytes:  result.bytes,
          format: result.format,
        });
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};

/**
 * Xóa tài nguyên khỏi Cloudinary
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!isCloudinaryConfigured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn("deleteFromCloudinary warning:", err.message);
  }
};

// ─── Local disk (fallback) ───────────────────────────────

const UPLOAD_DIR = path.join(__dirname, "../../../uploads");
["images", "videos", "avatars", "covers"].forEach((sub) => {
  const dir = path.join(UPLOAD_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith("video/");
    cb(null, path.join(UPLOAD_DIR, isVideo ? "videos" : "images"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const buildLocalMediaUrl = (req, filePath) => {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.indexOf("uploads/");
  const host = req.get("host") || "localhost";
  if (idx === -1) return `${req.protocol}://${host}/uploads/${path.basename(normalized)}`;
  return `${req.protocol}://${host}/${normalized.substring(idx)}`;
};

// ─── Multer instances ────────────────────────────────────

// Dùng memory storage nếu Cloudinary, disk nếu local
const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : diskStorage;

/**
 * Middleware upload bài viết (ảnh + video)
 * Validate MIME type và kích thước trước khi xử lý
 */
export const uploadPostMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: VIDEO_MAX_BYTES },
}).any();

/**
 * Middleware upload avatar (1 ảnh, tối đa 10MB)
 */
export const uploadAvatarMedia = multer({
  storage: isCloudinaryConfigured ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, "avatars")),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_IMAGE_MIME.includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("avatar");

/**
 * Middleware upload cover (1 ảnh, tối đa 15MB)
 */
export const uploadCoverMedia = multer({
  storage: isCloudinaryConfigured ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, "covers")),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `cover-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_IMAGE_MIME.includes(file.mimetype));
  },
  limits: { fileSize: 15 * 1024 * 1024 },
}).single("cover");

/**
 * Middleware upload hình ảnh trong chat (1 ảnh, tối đa 15MB)
 */
export const uploadChatMedia = multer({
  storage: isCloudinaryConfigured ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, "images")),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `chat-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_IMAGE_MIME.includes(file.mimetype));
  },
  limits: { fileSize: 15 * 1024 * 1024 },
}).single("image");

// Legacy: giữ nguyên export getMediaUrl để không break code cũ
export const getMediaUrl = buildLocalMediaUrl;

/**
 * Middleware upload kỹ năng: ảnh bìa + ảnh minh họa cho từng bước
 * - coverImage: 1 ảnh bìa
 * - step_N_image: ảnh minh họa cho bước N (tối đa 3 ảnh/bước, 10 bước → 30 ảnh tổng)
 * - Chỉ chấp nhận ảnh (không nhận video)
 */
const skillImageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Chỉ chấp nhận file ảnh (${file.mimetype} không hợp lệ)`), false);
  }
};

export const uploadSkillMedia = multer({
  storage: isCloudinaryConfigured
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, "images")),
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `skill-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
      }),
  fileFilter: skillImageFilter,
  limits: { fileSize: IMAGE_MAX_BYTES, files: 31 }, // 1 bìa + tối đa 30 ảnh bước
}).any();

/**
 * Error handler cho skill upload — bắt lỗi Multer trả 400 thay vì 500
 */
export function handleSkillUploadError(err, req, res, next) {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: `Ảnh quá lớn. Tối đa ${IMAGE_MAX_MB}MB mỗi ảnh.` });
  }
  if (err?.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Quá nhiều ảnh. Tối đa 31 ảnh (1 bìa + 30 ảnh bước)." });
  }
  if (err) {
    return res.status(400).json({ error: err.message || "Lỗi upload ảnh" });
  }
  next();
}

/**
 * Middleware upload ảnh xác minh đăng ký đội tình nguyện
 * - Tối đa 5 ảnh, chỉ chấp nhận ảnh (không chấp nhận video)
 * - Lưu vào uploads/images/ (fallback) hoặc Cloudinary (nếu đã cấu hình)
 */
export const uploadVerificationMedia = multer({
  storage: isCloudinaryConfigured
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, "images")),
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `volunteer-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
      }),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Chỉ chấp nhận file ảnh (${file.mimetype} không hợp lệ)`), false);
    }
  },
  limits: { fileSize: IMAGE_MAX_BYTES, files: 5 }, // Tối đa 5 ảnh
}).array("verificationImages", 5);

/**
 * Error handler cho volunteer upload
 */
export function handleVerificationUploadError(err, req, res, next) {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: `Ảnh quá lớn. Tối đa ${IMAGE_MAX_MB}MB mỗi ảnh.` });
  }
  if (err?.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Quá nhiều ảnh. Tối đa 5 ảnh xác minh." });
  }
  if (err) {
    return res.status(400).json({ error: err.message || "Lỗi upload ảnh xác minh" });
  }
  next();
}


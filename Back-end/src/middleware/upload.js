import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thư mục lưu uploads
const UPLOAD_DIR = path.join(__dirname, "../../../uploads");

// Tạo thư mục nếu chưa có
["images", "videos"].forEach((sub) => {
  const dir = path.join(UPLOAD_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith("video/");
    cb(null, path.join(UPLOAD_DIR, isVideo ? "videos" : "images"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Bộ lọc file (mở rộng MIME từ điện thoại: HEIC, JPG kiểu image/jpg, v.v.)
const fileFilter = (req, file, cb) => {
  const allowedImage = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const allowedVideo = [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/3gpp",
  ];

  if ([...allowedImage, ...allowedVideo].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Loại file không được hỗ trợ (${file.mimetype || "unknown"}). Chỉ chấp nhận ảnh và video phổ biến.`
      ),
      false
    );
  }
};

// Giới hạn kích thước: ảnh 15MB, video 200MB
const limits = { fileSize: 200 * 1024 * 1024 }; // 200MB max

export const uploadPostMedia = multer({
  storage,
  fileFilter,
  limits,
}).fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 2 },
]);

/**
 * Helper: chuyển đường dẫn file thành URL trả về client
 */
export const getMediaUrl = (req, filePath) => {
  const relativePath = filePath.replace(/\\/g, "/");
  const uploadsIndex = relativePath.indexOf("uploads/");
  const pathAfterUploads = relativePath.substring(uploadsIndex);
  return `${req.protocol}://${req.get("host")}/${pathAfterUploads}`;
};

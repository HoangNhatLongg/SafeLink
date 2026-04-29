import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";
import compression from "compression";
import rateLimit from "express-rate-limit";

import "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import moderationRoutes from "./routes/moderationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import directoryRoutes from "./routes/directoryRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Compression (Gzip/Brotli) ───────────────────────────────────
// Giảm ~60-80% kích thước response JSON
app.use(compression({ level: 6 }));

// ─── Rate Limiting ───────────────────────────────────────────────
// Bảo vệ server khỏi spam/DDoS
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 phút
  max: 120,             // 120 request/phút/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,              // Tối đa 15 lần upload/phút
  message: { message: "Giới hạn upload. Vui lòng thử lại sau." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,                  // 20 lần thử login/15 phút
  message: { message: "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút." },
});

app.use(cors());
app.use(express.json({ limit: "10mb" })); // limit request body
app.use(passport.initialize());

// ─── Static files (local fallback khi chưa dùng Cloudinary) ──────
// Cache-Control 30 ngày cho ảnh tĩnh
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../../uploads"), {
    maxAge: "30d",      // Cache 30 ngày ở browser
    etag: true,         // ETag để validate cache
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Ảnh: immutable (không bao giờ thay đổi vì dùng hash trong filename)
      if (filePath.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      }
      // Video: có thể cache nhưng không immutable
      if (filePath.match(/\.(mp4|webm|mov)$/i)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
      }
    },
  })
);

app.get("/", (req, res) => {
  res.send("SafeLink API running");
});

// ─── Routes ───────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/posts", apiLimiter, postRoutes);
app.use("/api/comments", apiLimiter, commentRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/users", apiLimiter, followRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/search", apiLimiter, searchRoutes);
app.use("/api/sos", apiLimiter, sosRoutes);
app.use("/api/directory", apiLimiter, directoryRoutes);
app.use("/api/skills", apiLimiter, skillRoutes);
app.use("/api/volunteers", apiLimiter, volunteerRoutes);

// Rate limit riêng cho upload (áp lên POST /api/posts)
app.use("/api/posts", (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    return uploadLimiter(req, res, next);
  }
  next();
});

export default app;

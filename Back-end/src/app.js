import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";

import "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import moderationRoutes from "./routes/moderationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Serve thư mục uploads (ảnh, video bài viết)
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

app.get("/", (req, res) => {
  res.send("SafeLink API running");
});

// Auth
app.use("/api/auth", authRoutes);

// Posts (CRUD, like, dislike, save, hide, share, report, comments)
app.use("/api/posts", postRoutes);

// Comments (replies, edit, delete, reactions)
app.use("/api/comments", commentRoutes);

// Users (profile /me trước, sau đó follow — thứ tự route quan trọng)
app.use("/api/users", userRoutes);
app.use("/api/users", followRoutes);

// Moderation (moderator/admin)
app.use("/api/moderation", moderationRoutes);

// Search API (Global Search & Tags)
import searchRoutes from "./routes/searchRoutes.js";
app.use("/api/search", searchRoutes);

export default app;

import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadPostMedia, uploadChatMedia } from "../middleware/upload.js";
import {
  createSOS,
  getActiveSOS,
  resolveSOS,
  updateUserLocation,
  updatePushToken,
} from "../controllers/sosController.js";
import {
  requestToHelp,
  getConnections,
  updateConnectionStatus,
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage
} from "../controllers/sosConnectionController.js";

const router = express.Router();

// Wrapper multer error → 400
const uploadMiddleware = (req, res, next) => {
  uploadPostMedia(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Lỗi upload ảnh." });
    next();
  });
};

// Lấy danh sách SOS đang active (không cần login)
router.get("/active", getActiveSOS);

// Đăng SOS mới (cần login)
router.post("/", verifyToken, uploadMiddleware, createSOS);

// Resolve SOS (author / admin / mod)
router.patch("/:id/resolve", verifyToken, resolveSOS);

// Cập nhật vị trí user
router.patch("/me/location", verifyToken, updateUserLocation);

// Lưu Expo Push Token
router.patch("/me/push-token", verifyToken, updatePushToken);

// ========================
// Chức năng kết nối & Chat
// ========================

// 1. Gửi yêu cầu hỗ trợ một SOS (người qua đường gửi)
router.post("/:id/connect", verifyToken, requestToHelp);

// 2. Lấy danh sách kết nối (Của cả người nhận hỗ trợ & người đi hỗ trợ)
router.get("/connections", verifyToken, getConnections);

// 3. Chấp nhận / Từ chối một kết nối
router.patch("/connections/:id", verifyToken, updateConnectionStatus);

// 4. Lấy lịch sử tin nhắn trong 1 kết nối
router.get("/connections/:id/messages", verifyToken, getChatMessages);

// Wrapper để xử lý lỗi multer trong lúc gửi ảnh chat
const chatUploadMiddleware = (req, res, next) => {
  uploadChatMedia(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Lỗi upload ảnh chat." });
    next();
  });
};

// 5. Gửi tin nhắn qua REST API (hỗ trợ văn bản & ảnh)
router.post("/connections/:id/messages", verifyToken, chatUploadMiddleware, sendChatMessage);

// 6. Sửa tin nhắn
router.patch("/messages/:id/edit", verifyToken, editChatMessage);

// 7. Thu hồi tin nhắn
router.patch("/messages/:id/delete", verifyToken, deleteChatMessage);

export default router;

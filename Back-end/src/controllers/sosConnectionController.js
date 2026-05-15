import SOSConnection from "../models/sosConnectionModel.js";
import ChatMessage from "../models/chatMessageModel.js";
import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import { isCloudinaryConfigured, uploadImageToCloudinary, getMediaUrl } from "../middleware/upload.js";

// Gửi yêu cầu hỗ trợ một SOS
export const requestToHelp = async (req, res) => {
  try {
    const { id: sosId } = req.params;
    const helperId = req.user._id;

    const sos = await Post.findById(sosId);
    if (!sos || sos.postType !== "sos") {
      return res.status(404).json({ message: "Không tìm thấy SOS." });
    }
    
    if (sos.sosStatus !== "active") {
      return res.status(400).json({ message: "SOS này đã đóng hoặc đã giải quyết." });
    }

    if (sos.author.toString() === helperId.toString()) {
      return res.status(400).json({ message: "Bạn không thể tự hỗ trợ chính mình." });
    }

    // Kiểm tra xem đã gửi yêu cầu chưa
    const existing = await SOSConnection.findOne({ sosId, helperId });
    if (existing) {
      return res.status(400).json({ message: "Bạn đã gửi yêu cầu hỗ trợ SOS này rồi.", connection: existing });
    }

    const connection = await SOSConnection.create({
      sosId,
      senderId: sos.author,
      helperId,
      status: "pending"
    });

    return res.status(201).json({ message: "Đã gửi yêu cầu hỗ trợ thành công.", connection });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Lấy danh sách yêu cầu hỗ trợ
export const getConnections = async (req, res) => {
  try {
    const userId = req.user._id;
    // Tìm các kết nối mà user là người tạo SOS (người cần giúp) HOẶC là người đi giúp
    const connections = await SOSConnection.find({
      $or: [{ senderId: userId }, { helperId: userId }]
    })
      .populate("sosId", "location sosCategory createdAt sosStatus")
      .populate("helperId", "name email avatar phoneNumber isVolunteer")
      .populate("senderId", "name email avatar phoneNumber isVolunteer")
      .sort({ updatedAt: -1 });

    return res.json({ connections });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Cập nhật trạng thái yêu cầu (Chấp nhận / Từ chối)
export const updateConnectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!["accepted", "rejected", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    }

    const connection = await SOSConnection.findById(id);
    if (!connection) {
      return res.status(404).json({ message: "Không tìm thấy kết nối." });
    }

    // Chỉ người tạo SOS mới có quyền chấp nhận/từ chối
    if (connection.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền thực hiện." });
    }

    connection.status = status;
    await connection.save();

    return res.json({ message: `Đã ${status} yêu cầu.`, connection });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Lấy tin nhắn của một kết nối
export const getChatMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const connection = await SOSConnection.findById(id).populate("sosId", "sosStatus postType author");
    if (!connection) {
      return res.status(404).json({ message: "Không tìm thấy kết nối." });
    }

    if (connection.senderId.toString() !== userId.toString() && connection.helperId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền truy cập chat này." });
    }

    const messages = await ChatMessage.find({ connectionId: id }).sort({ createdAt: 1 });
    return res.json({ messages, connection });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Gửi tin nhắn qua REST API (fallback cho Socket.IO)
export const sendChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text = "" } = req.body;
    const userId = req.user._id;

    if (!text.trim() && !req.file) {
      return res.status(400).json({ message: "Tin nhắn hoặc hình ảnh không được để trống." });
    }

    const connection = await SOSConnection.findById(id);
    if (!connection || connection.status !== "accepted") {
      return res.status(400).json({ message: "Không thể gửi tin nhắn vào phòng chat này." });
    }

    let imageObj = null;
    if (req.file) {
      if (isCloudinaryConfigured && req.file.buffer) {
        const uploadRes = await uploadImageToCloudinary(req.file.buffer, "chat");
        imageObj = {
          url: uploadRes.url,
          width: uploadRes.width,
          height: uploadRes.height,
        };
      } else if (req.file.path) {
        imageObj = {
          url: getMediaUrl(req, req.file.path),
        };
      }
    }

    const message = await ChatMessage.create({
      connectionId: id,
      senderId: userId,
      text: text.trim(),
      ...(imageObj ? { image: imageObj } : {})
    });

    return res.status(201).json({ message });
  } catch (err) {
    console.error("sendChatMessage error:", err);
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Sửa tin nhắn
export const editChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Văn bản không được để trống." });
    }

    const message = await ChatMessage.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn." });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền sửa tin nhắn này." });
    }

    // Không cho phép sửa tin nhắn đã bị xóa
    if (message.isDeleted) {
      return res.status(400).json({ message: "Không thể sửa tin nhắn đã bị thu hồi." });
    }

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    return res.json({ message });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Thu hồi tin nhắn
export const deleteChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await ChatMessage.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn." });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền thu hồi tin nhắn này." });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Tin nhắn đã bị thu hồi trước đó." });
    }

    message.isDeleted = true;
    message.text = "Tin nhắn đã bị thu hồi";
    // Xóa URL ảnh nếu có để bảo vệ quyền riêng tư
    if (message.image && message.image.url) {
      message.image.url = "";
    }
    
    await message.save();

    return res.json({ message });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

// Xóa kết nối (xóa lịch sử chat)
export const deleteConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const connection = await SOSConnection.findById(id);
    if (!connection) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện." });
    }

    if (connection.senderId.toString() !== userId.toString() && connection.helperId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Không có quyền xóa cuộc trò chuyện này." });
    }

    // Xóa tất cả tin nhắn trong kết nối này
    await ChatMessage.deleteMany({ connectionId: id });
    
    // Xóa kết nối
    await SOSConnection.findByIdAndDelete(id);

    return res.json({ message: "Đã xóa lịch sử chat thành công." });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server.", error: err.message });
  }
};

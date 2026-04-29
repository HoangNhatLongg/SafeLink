import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Cho phép client kết nối từ bất kỳ đâu (hoặc cấu hình specific domains)
      methods: ["GET", "POST"]
    }
  });

  // Middleware xác thực kết nối Socket (nếu cần)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: No token provided"));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dummysecret");
      socket.user = decoded; // Lưu thông tin user vào socket instance
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.user?.id} (Socket ID: ${socket.id})`);

    // Tự động cho user vào một room mang tên ID của chính họ để gửi thông báo cá nhân
    if (socket.user?.id) {
      socket.join(socket.user.id);
    }

    // Tham gia vào phòng chat (room = connectionId)
    socket.on("joinChat", (connectionId) => {
      socket.join(connectionId);
      console.log(`User ${socket.user?.id} joined chat room: ${connectionId}`);
    });

    // Rời khỏi phòng chat
    socket.on("leaveChat", (connectionId) => {
      socket.leave(connectionId);
      console.log(`User ${socket.user?.id} left chat room: ${connectionId}`);
    });

    // Lắng nghe tin nhắn mới và broadcast cho những người trong phòng
    socket.on("sendMessage", (data) => {
      // data: { connectionId, senderId, text, createdAt, ... }
      const { connectionId } = data;
      // Gửi cho TẤT CẢ mọi người trong phòng (trừ người gửi)
      socket.to(connectionId).emit("receiveMessage", data);
    });

    socket.on("editMessage", (data) => {
      const { connectionId } = data;
      socket.to(connectionId).emit("messageEdited", data);
    });

    socket.on("deleteMessage", (data) => {
      const { connectionId } = data;
      socket.to(connectionId).emit("messageDeleted", data);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.user?.id} (Socket ID: ${socket.id})`);
    });
  });

  return io;
};

// Hàm tiện ích để emit sự kiện từ các controller REST API nếu cần
export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

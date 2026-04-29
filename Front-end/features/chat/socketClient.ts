import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket: Socket | null = null;

export const connectSocket = async () => {
  if (socket) return socket;

  const token = await AsyncStorage.getItem("token");
  
  socket = io(API_BASE, {
    auth: {
      token
    },
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("🔴 Socket connect error:", err.message);
  });

  socket.on("disconnect", () => {
    console.log("⭕ Socket disconnected");
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

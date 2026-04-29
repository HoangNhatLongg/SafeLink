import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Image,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ImageViewer from "react-native-image-zoom-viewer";
import { getUserJson, type StoredUser } from "@/features/auth/utils/storage";
import { getChatHistory, sendRestMessage, sendImageMessage, editMessage, deleteMessage, type ChatMessage } from "@/features/chat/chatApi";
import { connectSocket, disconnectSocket, getSocket } from "@/features/chat/socketClient";

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let active = true;
    
    const init = async () => {
      const user = await getUserJson();
      if (active) setMe(user);

      try {
        const res = await getChatHistory(id as string);
        if (active) {
          setMessages(res.messages || []);
        }
      } catch (e) {
        console.warn("Lỗi tải tin nhắn:", e);
      } finally {
        if (active) setLoading(false);
      }

      // Khởi tạo Socket
      const socket = await connectSocket();
      socket.emit("joinChat", id);

      socket.on("receiveMessage", (newMsg: ChatMessage) => {
        if (active) {
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });

      socket.on("messageEdited", (editedMsg: ChatMessage) => {
        if (active) {
          setMessages((prev) => prev.map((m) => (m._id === editedMsg._id ? editedMsg : m)));
        }
      });

      socket.on("messageDeleted", (deletedMsg: ChatMessage) => {
        if (active) {
          setMessages((prev) => prev.map((m) => (m._id === deletedMsg._id ? deletedMsg : m)));
        }
      });
    };

    init();

    return () => {
      active = false;
      const socket = getSocket();
      if (socket) {
        socket.emit("leaveChat", id);
        socket.off("receiveMessage");
        socket.off("messageEdited");
        socket.off("messageDeleted");
        // Không ngắt hẳn kết nối socket ở đây vì có thể dùng ở nơi khác, chỉ leave room.
      }
    };
  }, [id]);

  const handleSend = async () => {
    if (!text.trim() || !me) return;
    
    const currentText = text.trim();
    const editingId = editingMessageId;
    setText("");
    Keyboard.dismiss();

    if (editingId) {
      setEditingMessageId(null);
      // Lạc quan update UI cho sửa tin nhắn
      setMessages((prev) =>
        prev.map((m) =>
          m._id === editingId ? { ...m, text: currentText, isEdited: true } : m
        )
      );

      try {
        const res = await editMessage(editingId, currentText);
        const socket = getSocket();
        if (socket) socket.emit("editMessage", res.message);
        
        // Update lại ID thực tế nếu cần
        setMessages((prev) =>
          prev.map((m) => (m._id === editingId ? res.message : m))
        );
      } catch (e) {
        console.warn("Lỗi sửa tin nhắn", e);
        alert("Lỗi sửa tin nhắn.");
      }
      return;
    }

    // Lạc quan thêm tin nhắn vào UI
    const tempMsg: ChatMessage = {
      _id: "temp_" + Date.now(),
      connectionId: id as string,
      senderId: me.id,
      text: currentText,
      createdAt: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await sendRestMessage(id as string, currentText);
      // Emit qua socket để phía bên kia nhận được
      const socket = getSocket();
      if (socket) {
        socket.emit("sendMessage", res.message);
      }
      
      // Update ID thật từ server
      setMessages((prev) => 
        prev.map((m) => (m._id === tempMsg._id ? res.message : m))
      );
    } catch (e) {
      console.warn("Lỗi gửi tin nhắn", e);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          alert("Bạn cần cấp quyền truy cập máy ảnh!");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Bạn cần cấp quyền truy cập thư viện ảnh!");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const asset = result.assets[0];
        const formData = new FormData();
        
        // Ensure uri works cross-platform for React Native FormData
        const localUri = Platform.OS === "ios" ? asset.uri.replace("file://", "") : asset.uri;
        const filename = localUri.split("/").pop() || "image.jpg";
        
        // The type needs to be specified for multipart/form-data to recognize it as a file
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append("image", {
          uri: localUri,
          name: filename,
          type,
        } as any);

        if (text.trim()) {
          formData.append("text", text.trim());
          setText("");
        }

        const res = await sendImageMessage(id as string, formData);
        
        const socket = getSocket();
        if (socket) {
          socket.emit("sendMessage", res.message);
        }

        // Backend will return the full message including the new Cloudinary URL
        setMessages((prev) => [...prev, res.message]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.warn("Lỗi gửi ảnh:", error);
      alert("Không thể gửi ảnh, vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleLongPress = (item: ChatMessage) => {
    if (item.senderId !== me?.id) return; // Chỉ sửa/xóa tin nhắn của mình
    if (item.isDeleted) return; // Đã xóa thì không thao tác được nữa

    Alert.alert(
      "Tùy chọn tin nhắn",
      "Bạn muốn làm gì với tin nhắn này?",
      [
        {
          text: "Chỉnh sửa",
          onPress: () => {
            setEditingMessageId(item._id);
            setText(item.text);
          },
        },
        {
          text: "Thu hồi",
          style: "destructive",
          onPress: async () => {
            try {
              // Lạc quan update UI cho xóa
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === item._id
                    ? { ...m, isDeleted: true, text: "Tin nhắn đã bị thu hồi", image: undefined }
                    : m
                )
              );

              const res = await deleteMessage(item._id);
              const socket = getSocket();
              if (socket) socket.emit("deleteMessage", res.message);
              
              setMessages((prev) =>
                prev.map((m) => (m._id === item._id ? res.message : m))
              );
            } catch (e) {
              console.warn("Lỗi thu hồi tin nhắn", e);
              alert("Lỗi thu hồi tin nhắn.");
            }
          },
        },
        { text: "Hủy", style: "cancel" },
      ]
    );
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === me?.id;
    return (
      <View style={[styles.msgWrap, isMe ? styles.msgRight : styles.msgLeft]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleLongPress(item)}
          style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther, item.isDeleted && styles.msgBubbleDeleted]}
        >
          {!!item.image?.url && !item.isDeleted && (
            <TouchableOpacity onPress={() => setViewingImage(item.image!.url)}>
              <Image
                source={{ uri: item.image.url }}
                style={styles.msgImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          {!!item.text && (
            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther, item.isDeleted && styles.msgTextDeleted]}>
              {item.text}
            </Text>
          )}
          {item.isEdited && !item.isDeleted && (
            <Text style={[styles.editedText, isMe ? styles.editedTextMe : styles.editedTextOther]}>
              (đã chỉnh sửa)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hỗ trợ khẩn cấp</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF3B30" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {editingMessageId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText}>Đang chỉnh sửa tin nhắn</Text>
            <TouchableOpacity onPress={() => { setEditingMessageId(null); setText(""); }}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputArea}>
          {!editingMessageId && (
            <>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handlePickImage(true)} disabled={uploading}>
                <Ionicons name="camera-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handlePickImage(false)} disabled={uploading}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
            </>
          )}

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Nhắn tin..."
            placeholderTextColor="#999"
            multiline
            editable={!uploading}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!text.trim() && !uploading) && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={(!text.trim() && !uploading) || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : editingMessageId ? (
              <Ionicons name="checkmark" size={20} color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!viewingImage} transparent={true} animationType="fade">
        <ImageViewer
          imageUrls={viewingImage ? [{ url: viewingImage }] : []}
          onSwipeDown={() => setViewingImage(null)}
          enableSwipeDown={true}
          renderHeader={() => (
            <TouchableOpacity
              style={{ position: "absolute", top: 50, right: 20, zIndex: 9999 }}
              onPress={() => setViewingImage(null)}
            >
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
          )}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 20 },
  msgWrap: { marginBottom: 12, flexDirection: "row" },
  msgRight: { justifyContent: "flex-end" },
  msgLeft: { justifyContent: "flex-start" },
  msgBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  msgBubbleMe: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: "#F2F2F7",
    borderBottomLeftRadius: 4,
  },
  msgBubbleDeleted: {
    backgroundColor: "#e0e0e0",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMe: { color: "#fff" },
  msgTextOther: { color: "#000" },
  msgTextDeleted: { color: "#888", fontStyle: "italic" },
  editedText: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  editedTextMe: { color: "rgba(255,255,255,0.7)" },
  editedTextOther: { color: "rgba(0,0,0,0.4)" },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  editingBanner: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editingBannerText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#007AFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginBottom: 0,
  },
});

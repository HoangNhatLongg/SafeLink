import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { createPostFormData } from "@/features/social/services/postsApi";
import { getToken } from "@/features/auth/utils/storage";

type Vis = "public" | "friends" | "private";

type MediaItem = {
  uri: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
};

export default function CreatePostScreen() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Vis>("public");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attachLocation, setAttachLocation] = useState(false);

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Quyền truy cập", "Cần quyền thư viện ảnh để đính kèm.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setMedia((m) => [
      ...m,
      {
        uri: a.uri,
        type: a.type === "video" ? "video" : "image",
        mimeType: a.mimeType ?? null,
        fileName: a.fileName ?? null,
      },
    ]);
  };

  const removeMedia = (idx: number) => {
    setMedia((m) => m.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để đăng bài.", [
        { text: "Hủy", style: "cancel" },
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
      return;
    }

    const trimmed = content.trim();
    if (!trimmed && media.length === 0) {
      Alert.alert("Thiếu nội dung", "Nhập chữ hoặc thêm ảnh/video.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      if (trimmed) form.append("content", trimmed);
      form.append("visibility", visibility);

      if (attachLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Vị trí", "Không có quyền vị trí — bài đăng sẽ không gắn GPS.");
        } else {
          const pos = await Location.getCurrentPositionAsync({});
          form.append("latitude", String(pos.coords.latitude));
          form.append("longitude", String(pos.coords.longitude));
          /* Địa danh (tỉnh, quận, …) do server reverse geocode (Nominatim) */
        }
      }

      for (const item of media) {
        const ext =
          item.type === "video"
            ? ".mp4"
            : item.mimeType?.includes("png")
              ? ".png"
              : item.mimeType?.includes("webp")
                ? ".webp"
                : item.mimeType?.includes("gif")
                  ? ".gif"
                  : item.mimeType?.includes("heic") || item.mimeType?.includes("heif")
                    ? ".heic"
                    : ".jpg";
        const safeName = item.fileName?.replace(/[^\w.\-]/g, "_");
        const nameGuess =
          safeName && safeName.includes(".")
            ? safeName
            : item.type === "video"
              ? `video_${Date.now()}${ext}`
              : `photo_${Date.now()}${ext}`;
        const mime =
          item.mimeType ||
          (item.type === "video" ? "video/mp4" : "image/jpeg");
        const field = item.type === "video" ? "videos" : "images";
        form.append(field, {
          uri: item.uri,
          name: nameGuess,
          type: mime,
        } as any);
      }

      await createPostFormData(form);
      Alert.alert("", "Đăng bài thành công.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không gửi được bài viết");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Đăng bài</Text>

      <Text style={styles.label}>Nội dung</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Chia sẻ thông tin an toàn, cảnh báo, tình hình…"
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Text style={styles.label}>Ai có thể xem</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={visibility} onValueChange={(v) => setVisibility(v as Vis)}>
          <Picker.Item label="Công khai" value="public" />
          <Picker.Item label="Bạn bè (theo dõi lẫn nhau)" value="friends" />
          <Picker.Item label="Chỉ mình tôi" value="private" />
        </Picker>
      </View>

      <TouchableOpacity
        style={styles.rowBetween}
        onPress={() => setAttachLocation(!attachLocation)}
      >
        <Text style={styles.label}>Gắn vị trí hiện tại (GPS)</Text>
        <Ionicons
          name={attachLocation ? "checkbox" : "square-outline"}
          size={24}
          color="#1877f2"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia}>
        <Ionicons name="images" size={22} color="#1877f2" />
        <Text style={styles.mediaBtnText}>Thêm ảnh hoặc video</Text>
      </TouchableOpacity>

      {media.map((item, idx) => (
        <View key={`${item.uri}-${idx}`} style={styles.mediaRow}>
          <Text numberOfLines={1} style={{ flex: 1 }}>
            {item.type === "video" ? "Video" : "Ảnh"} {idx + 1}
          </Text>
          <TouchableOpacity onPress={() => removeMedia(idx)}>
            <Ionicons name="trash-outline" size={22} color="#c00" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Đăng</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 8,
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  mediaBtnText: {
    color: "#1877f2",
    fontSize: 16,
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  submitBtn: {
    backgroundColor: "#1877f2",
    padding: 16,
    borderRadius: 12,
    marginTop: 28,
    marginBottom: 40,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

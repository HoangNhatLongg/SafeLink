import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { createPostFormData } from "@/features/social/services/postsApi";

type MediaItem = {
  type: "image" | "video";
  uri: string;
  mimeType?: string;
  fileName?: string;
};

type Props = {
  onSubmit: (post: any) => void;
};

export default function CreatePostBox({ onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [hashtag, setHashtag] = useState("");
  const [loading, setLoading] = useState(false);

  const pickMedia = async (type: "image" | "video") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia((prev) => [
        ...prev,
        {
          type,
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName ?? undefined,
        },
      ]);
    }
  };

  /** Gửi bài viết lên server qua FormData (hỗ trợ ảnh + video) */
  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) return;
    setLoading(true);
    try {
      const form = new FormData();
      if (content.trim()) form.append("content", content.trim());
      if (hashtag.trim()) form.append("hashtag", hashtag.trim());

      for (const item of media) {
        const isVideo = item.type === "video";
        const fieldName = isVideo ? "videos" : "images";
        const fallbackExt = isVideo ? "mp4" : "jpg";
        const fallbackMime = isVideo ? "video/mp4" : "image/jpeg";
        // React Native FormData chấp nhận object { uri, name, type }
        (form as any).append(fieldName, {
          uri: item.uri,
          name: item.fileName ?? `media_${Date.now()}.${fallbackExt}`,
          type: item.mimeType ?? fallbackMime,
        });
      }

      const result = await createPostFormData(form);
      onSubmit(result.post);

      // Reset
      setContent("");
      setMedia([]);
      setHashtag("");
    } catch (e: any) {
      Alert.alert("Đăng bài thất bại", e?.message ?? "Lỗi không xác định. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: "https://i.pravatar.cc/150?img=12" }}
          style={styles.avatar}
        />

        <TextInput
          placeholder="Bạn đang nghĩ gì?"
          style={styles.input}
          value={content}
          onChangeText={setContent}
          multiline
        />
      </View>

      {/* Preview media */}
      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {media.map((item, index) => (
            <View key={index} style={styles.previewWrapper}>
              <Image source={{ uri: item.uri }} style={styles.preview} />
              {item.type === "video" && (
                <View style={styles.videoBadge}>
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TextInput
        placeholder="#hashtag"
        value={hashtag}
        onChangeText={setHashtag}
        style={styles.hashtagInput}
      />

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => pickMedia("image")} disabled={loading}>
          <Ionicons name="image" size={22} color={loading ? "#ccc" : "#4CAF50"} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => pickMedia("video")} disabled={loading}>
          <Ionicons name="videocam" size={22} color={loading ? "#ccc" : "#2196F3"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postBtn, loading && styles.postBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postText}>Đăng</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: "row",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  input: {
    flex: 1,
    minHeight: 40,
  },
  previewWrapper: {
    marginTop: 10,
    marginRight: 8,
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  hashtagInput: {
    marginTop: 10,
    paddingVertical: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  postBtn: {
    backgroundColor: "#1877F2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 56,
    alignItems: "center",
  },
  postBtnDisabled: {
    backgroundColor: "#90b8f8",
  },
  postText: {
    color: "white",
    fontWeight: "600",
  },
  videoBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});
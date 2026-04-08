import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated } from "react-native";
import { createPostFormData, fetchPost, fetchTagSuggestions } from "@/features/social/services/postsApi";
import { updatePostFormData } from "@/features/social/services/postsApi";
import { getToken } from "@/features/auth/utils/storage";
import { fetchMe } from "@/features/user/services/userApi";
import { ImageGridPreview } from "@/features/social/ImageGridPreview";
import { useLocalSearchParams } from "expo-router";

/* ─── Types ─── */
type MediaItem = {
  uri: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
};

type Visibility = "public" | "friends" | "private";

interface PrivacyOption {
  value: Visibility;
  label: string;
  icon: string;
  color: string;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: "public", label: "Công khai", icon: "globe", color: "#1877F2" },
  { value: "friends", label: "Bạn bè", icon: "people", color: "#31A24C" },
  { value: "private", label: "Chỉ mình tôi", icon: "lock-closed", color: "#90949C" },
];

/* ─── User Info Row (nằm cùng hàng với nút Đăng) ─── */
interface UserInfoRowProps {
  name: string;
  avatar?: string;
  visibility: Visibility;
  onPrivacyPress: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitting: boolean;
}

function UserInfoRow({
  name,
  avatar,
  visibility,
  onPrivacyPress,
  onSubmit,
  canSubmit,
  submitting,
}: UserInfoRowProps) {
  const option = PRIVACY_OPTIONS.find((o) => o.value === visibility)!;

  return (
    <View style={styles.userRow}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
        )}
      </View>

      {/* Name + Privacy */}
      <View style={styles.userMeta}>
        <Text style={styles.userName}>{name}</Text>
        <TouchableOpacity style={styles.privacyPill} onPress={onPrivacyPress}>
          <Ionicons name={option.icon as any} size={12} color={option.color} />
          <Text style={styles.privacyPillText}>{option.label}</Text>
          <Ionicons name="chevron-down" size={11} color="#65676B" />
        </TouchableOpacity>
      </View>

      {/* Nút Đăng */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!canSubmit || submitting}
        style={[
          styles.postBtn,
          canSubmit && !submitting ? styles.postBtnActive : styles.postBtnDisabled,
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.postBtnText, canSubmit && styles.postBtnTextActive]}>
            Đăng
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* ─── Bottom Actions Bar ─── */
interface BottomActionsProps {
  onPickMedia: () => void;
  onTakeMedia: () => void;
  onToggleLocation: () => void;
  locationEnabled: boolean;
}

function BottomActions({ onPickMedia, onTakeMedia, onToggleLocation, locationEnabled }: BottomActionsProps) {
  const actions = [
    { icon: "images", label: "Thư viện", onPress: onPickMedia, color: "#31A24C" },
    { icon: "camera", label: "Máy ảnh", onPress: onTakeMedia, color: "#E42645" },
    {
      icon: "location",
      label: locationEnabled ? "Vị trí ON" : "Vị trí",
      onPress: onToggleLocation,
      color: locationEnabled ? "#1877F2" : "#F4B834",
    },
    { icon: "happy", label: "Cảm xúc", onPress: () => {}, color: "#F4B834" },
  ];

  return (
    <View style={styles.bottomActions}>
      {actions.map((a, i) => (
        <TouchableOpacity key={i} style={styles.actionBtn} onPress={a.onPress}>
          <View style={[styles.actionIconWrap, { borderColor: a.color }]}>
            <Ionicons name={a.icon as any} size={18} color={a.color} />
          </View>
          <Text style={styles.actionLabel} numberOfLines={1}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Main Screen ─── */
export default function CreatePostScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  // User data
  const [userName, setUserName] = useState("Người dùng SafeLink");
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);

  // Post data
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // TAG SUGGESTION STATE
  const [cursorPos, setCursorPos] = useState({ start: 0, end: 0 });
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [activeTagMatch, setActiveTagMatch] = useState<{word: string, start: number, end: number} | null>(null);

  const canSubmit = content.trim().length > 0 || media.length > 0;

  const fadeAnims = useRef<Animated.Value[]>([]);

  // Animate media items on add
  useEffect(() => {
    media.forEach((_, i) => {
      if (!fadeAnims.current[i]) {
        fadeAnims.current[i] = new Animated.Value(0);
      }
    });
    Animated.parallel(
      fadeAnims.current.slice(0, media.length).map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 250,
          delay: i * 60,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [media.length]);


  // Load user info on mount
  useEffect(() => {
    (async () => {
      try {
        const { user } = await fetchMe();
        if (user) {
          setUserName(user.name || user.email || "Người dùng SafeLink");
          setUserAvatar(user.avatar);
        }
      } catch {
        // use defaults
      }
    })();
  }, []);

  // Load existing post if editing
  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      fetchPost(editId)
        .then(({ post }) => {
          setContent(post.content || "");
          setVisibility((post.visibility as Visibility) || "public");
          if (post.location) setLocationEnabled(true);
          
          const existingMedia: MediaItem[] = [];
          if (post.images) {
            post.images.forEach((img: any) => existingMedia.push({ uri: img.url, type: "image", mimeType: "image/jpeg" }));
          }
          if (post.videos) {
            post.videos.forEach((vid: any) => existingMedia.push({ uri: vid.url, type: "video", mimeType: "video/mp4" }));
          }
          setMedia(existingMedia);
        })
        .catch((err) => Alert.alert("Lỗi", "Không tải được bài viết cần sửa: " + err.message))
        .finally(() => setLoadingEdit(false));
    }
  }, [editId]);

  const handleClose = () => {
    router.back();
  };

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets[0]) return;
    const newItems: MediaItem[] = result.assets.map((a) => ({
      uri: a.uri,
      type: a.type === "video" ? "video" : "image",
      mimeType: a.mimeType ?? null,
      fileName: a.fileName ?? null,
    }));
    setMedia((prev) => [...prev, ...newItems]);
  };

  const takeMedia = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Lỗi", "Cần quyền truy cập máy ảnh để chụp.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    const newItems: MediaItem[] = [{
      uri: a.uri,
      type: a.type === "video" ? "video" : "image",
      mimeType: a.mimeType ?? null,
      fileName: a.fileName ?? null,
    }];
    setMedia((prev) => [...prev, ...newItems]);
  };

  const removeMedia = (idx: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ─── HASHTAG SUGGESTIONS ─── */
  useEffect(() => {
    // Tìm hashtag đang được gõ quanh con trỏ
    if (cursorPos.start !== cursorPos.end) {
      setTagSuggestions([]);
      setActiveTagMatch(null);
      return;
    }
    const idx = cursorPos.start;
    const textBefore = content.substring(0, idx);
    const textAfter = content.substring(idx);
    
    // Regex tìm từ chứa dấu # ở cuối đoạn textBefore
    const matchBefore = textBefore.match(/#([a-zA-Z0-9_]*)$/);
    if (!matchBefore) {
      setTagSuggestions([]);
      setActiveTagMatch(null);
      return;
    }
    
    const wordBefore = matchBefore[0];
    const extractedWord = matchBefore[1] || "";
    // Đảm bảo sau con trỏ là khoảng trắng hoặc cuối chuỗi để tránh cắt ngang
    const matchAfter = textAfter.match(/^([a-zA-Z0-9_]*)/);
    const wordAfter = matchAfter ? matchAfter[0] : "";
    
    const fullWord = wordBefore + wordAfter;
    const startIdx = idx - wordBefore.length;
    const endIdx = idx + wordAfter.length;

    setActiveTagMatch({ word: fullWord, start: startIdx, end: endIdx });

    if (extractedWord.length > 0) {
      fetchTagSuggestions(extractedWord).then(res => {
        if (res.tags) setTagSuggestions(res.tags);
      }).catch(() => {});
    } else {
      setTagSuggestions([]);
    }
  }, [content, cursorPos]);

  const insertTag = (tag: string) => {
    if (!activeTagMatch) return;
    const replacement = tag + " ";
    const newContent = 
      content.substring(0, activeTagMatch.start) + 
      replacement + 
      content.substring(activeTagMatch.end);
    setContent(newContent);
  };

  /* ─── XỬ LÝ NÚT ĐĂNG LÊN ─── */
  const handleSubmit = async () => {
    const token = await getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      if (content.trim()) form.append("content", content.trim());
      form.append("visibility", visibility);

      if (locationEnabled) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({});
          form.append("latitude", String(pos.coords.latitude));
          form.append("longitude", String(pos.coords.longitude));
        }
      }

      // Lọc các media đã có sẵn từ web server lưu vào metadata retainedMedia
      const retainedMedia = media.filter(m => m.uri.startsWith("http")).map(m => m.uri);
      if (editId) {
        form.append("retainedMedia", JSON.stringify(retainedMedia));
      }

      for (const item of media) {
        if (item.uri.startsWith("http")) continue; // Bỏ qua ảnh/video đã có trên máy chủ

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
        const nameGuess = safeName?.includes(".")
          ? safeName
          : item.type === "video"
            ? `video_${Date.now()}${ext}`
            : `photo_${Date.now()}${ext}`;
        const mime = item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg");
        const field = item.type === "video" ? "videos" : "images";
        form.append(field, { uri: item.uri, name: nameGuess, type: mime } as any);
      }

      if (editId) {
        await updatePostFormData(editId, form);
      } else {
        await createPostFormData(form);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || (editId ? "Cập nhật bài viết thất bại." : "Đăng bài thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        {/* ── Thanh tiêu đề đơn giản (chỉ có nút X) ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editId ? "Chỉnh sửa bài viết" : "Bài viết mới"}</Text>
          <View style={{ width: 40 }}>
             {loadingEdit && <ActivityIndicator size="small" color="#1877f2" />}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── UserInfo + Submit cùng hàng ── */}
          <UserInfoRow
            name={userName}
            avatar={userAvatar}
            visibility={visibility}
            onPrivacyPress={() => router.push("/privacy")}
            onSubmit={handleSubmit}
            canSubmit={canSubmit}
            submitting={submitting}
          />

          {/* ── Input nội dung ── */}
          <TextInput
            style={styles.input}
            placeholder="Bạn đang nghĩ gì?"
            placeholderTextColor="#65676B"
            multiline
            autoFocus
            value={content}
            onChangeText={setContent}
            onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection)}
          />

          {/* ── Hashtag Suggestions ── */}
          {tagSuggestions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagSuggestions}>
              {tagSuggestions.map((tag, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.tagItem}
                  onPress={() => insertTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagItemText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Preview ảnh/video ── */}
          {media.length > 0 && (
            <View style={styles.previewWrap}>
              <ImageGridPreview
                media={media}
                onRemove={removeMedia}
                fadeAnims={fadeAnims.current}
              />
            </View>
          )}
        </ScrollView>

        {/* ── Thanh chức năng dưới ── */}
        <BottomActions
          onPickMedia={pickMedia}
          onTakeMedia={takeMedia}
          onToggleLocation={() => setLocationEnabled((v) => !v)}
          locationEnabled={locationEnabled}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  keyboard: { flex: 1 },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DADDE1",
  },
  closeBtn: { padding: 6, width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#050505" },

  /* User info row */
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1877F2",
    justifyContent: "center",
    alignItems: "center",
  },
  userMeta: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600", color: "#050505", marginBottom: 4 },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: "flex-start",
    gap: 4,
  },
  privacyPillText: { fontSize: 13, color: "#65676B", fontWeight: "500" },

  /* Submit button */
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 68,
    alignItems: "center",
  },
  postBtnActive: { backgroundColor: "#1877F2" },
  postBtnDisabled: { backgroundColor: "#E4E6EB" },
  postBtnText: { fontSize: 15, fontWeight: "600", color: "#65676B" },
  postBtnTextActive: { color: "#fff" },

  /* Input */
  input: {
    fontSize: 22,
    color: "#050505",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    lineHeight: 28,
    minHeight: 52,
  },

  /* Preview */
  previewWrap: { marginHorizontal: 12, marginTop: 8 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  /* Bottom Actions */
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DADDE1",
    backgroundColor: "#fff",
  },
  actionBtn: { alignItems: "center", flex: 1 },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  actionLabel: { fontSize: 11, color: "#65676B", fontWeight: "500" },
  tagSuggestions: {
    maxHeight: 45,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tagItem: {
    backgroundColor: "#e7f3ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    alignSelf: "center",
  },
  tagItemText: {
    color: "#1877f2",
    fontWeight: "bold",
    fontSize: 14,
  },
});

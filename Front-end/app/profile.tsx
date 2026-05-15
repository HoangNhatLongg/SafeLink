import { Ionicons } from "@expo/vector-icons";
import { clearSession, saveUserJson, getToken } from "@/features/auth/utils/storage";
import {
  fetchMe,
  fetchUserPosts,
  updateMe,
  uploadAvatarForm,
  uploadCoverForm,
  type MeUser,
  type ProfilePrivacy,
} from "@/features/user/services/userApi";
import { mapApiPostToUi, type FeedPostUi } from "@/features/social/mapPost";
import { fetchSavedPosts } from "@/features/social/services/postsApi";
import PostCard from "@/features/social/PostCard";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";

const { width: SCREEN_W } = Dimensions.get("window");
const AVATAR_SIZE = 90;
const TAB_MY   = "posts";
const TAB_SAVE = "saved";

const FALLBACK = require("../assets/images/avatar-default.jpg");

function getAvatarSrc(uri?: string) {
  if (uri && uri.startsWith("http")) return { uri };
  if (uri && uri.startsWith("file://")) return { uri };
  return FALLBACK;
}

/* ═══════════════════════════════════ MAIN ══════════════════════════════════*/
export default function ProfileScreen() {
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">(TAB_MY);
  const [myPosts, setMyPosts] = useState<FeedPostUi[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPostUi[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  /* ── Load profile ─────────────────────────── */
  const loadMe = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setMe(null);
        setLoading(false);
        return;
      }
      const { user } = await fetchMe();
      setMe(user);
    } catch (e: any) {
      // Không dùng router.back() trực tiếp — profile là tab screen, có thể không có stack
      // Chỉ show alert, không navigate back
      Alert.alert("Lỗi tải hồ sơ", e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadMe(); }, [loadMe]);

  /* ── Load posts ──────────────────────────── */
  const loadMyPosts = useCallback(async () => {
    if (!me?.id || postsLoading) return;
    setPostsLoading(true);
    try {
      const { posts } = await fetchUserPosts(me.id);
      setMyPosts(posts.map(mapApiPostToUi));
    } catch {/* silent */} finally {
      setPostsLoading(false);
    }
  }, [me?.id]);

  const loadSaved = useCallback(async () => {
    if (savedLoading) return;
    setSavedLoading(true);
    try {
      const { posts } = await fetchSavedPosts(1, 50);
      setSavedPosts(posts.map(mapApiPostToUi));
    } catch {/* silent */} finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me?.id) {
      loadMyPosts();
      loadSaved();
    }
  }, [me?.id]);

  /* ── Post update helpers ─────────────────── */
  const patchMyPost = (id: string, patch: Partial<FeedPostUi>) =>
    setMyPosts((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const patchSaved = (id: string, patch: Partial<FeedPostUi>) =>
    setSavedPosts((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const stat = (label: string, value?: number, onPress?: () => void) => (
    <TouchableOpacity 
      style={s.statItem} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <Text style={s.statNum}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const infoRow = (icon: keyof typeof Ionicons.glyphMap, text?: string | null) =>
    text ? (
      <View style={s.infoRow}>
        <Ionicons name={icon} size={16} color="#666" style={{ marginRight: 8 }} />
        <Text style={s.infoText}>{text}</Text>
      </View>
    ) : null;

  const formatBirthday = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const currentData = activeTab === TAB_MY ? myPosts : savedPosts;
  const currentLoading = activeTab === TAB_MY ? postsLoading : savedLoading;

  const pickCover = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Lỗi", "Cần quyền truy cập thư viện để chọn ảnh bìa.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        
        let mimeType = asset.mimeType || "image/jpeg";
        let ext = "jpg";
        if (asset.fileName && asset.fileName.includes(".")) {
          ext = asset.fileName.split(".").pop() || "jpg";
        } else if (mimeType && mimeType.includes("/")) {
          ext = mimeType.split("/")[1];
        }

        const formData = new FormData();
        formData.append("cover", {
          uri,
          name: asset.fileName || `cover.${ext}`,
          type: mimeType,
        } as any);

        const { cover } = await uploadCoverForm(formData);
        setMe((m) => m ? { ...m, cover } : m);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  /* ───────────── Header Component ──────────── */
  const Header = () => (
    <View style={{ marginBottom: 10 }}>
      {/* Cover Image */}
      <View style={s.coverWrap}>
        {me?.cover ? (
          <ExpoImage source={{ uri: me.cover }} style={s.coverImg} contentFit="cover" transition={200} />
        ) : (
          <View style={s.coverPlaceholder} />
        )}
        
        {/* Nút cài đặt góc trên */}
        <TouchableOpacity style={s.settingsBtn} onPress={() => setEditVisible(true)}>
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Nút đổi ảnh bìa */}
        <TouchableOpacity style={s.changeCoverBtn} onPress={pickCover}>
          <Ionicons name="camera" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.avatarWrapper}>
        <ExpoImage source={getAvatarSrc(me?.avatar)} style={s.avatar} contentFit="cover" transition={200} />
      </View>

      {/* Name + role */}
      <View style={s.nameRow}>
        <Text style={s.name}>{me?.name || "Người dùng"}</Text>
        {me?.role && me.role !== "user" && (
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{me.role === "moderator" ? "Mod" : "Admin"}</Text>
          </View>
        )}
      </View>


      {/* Bio */}
      {me?.profile?.bio ? <Text style={s.bio}>{me.profile.bio}</Text> : null}
        {/* Info rows (Thông tin cá nhân) */}
      <View style={s.infoBlock}>
        {me?.profile?.privacy?.showBirthday && infoRow("calendar-outline", formatBirthday(me?.profile?.birthday))}
        {me?.profile?.privacy?.showHometown && infoRow("location-outline", me?.profile?.hometown)}
        {me?.profile?.privacy?.showPhone && infoRow("call-outline", me?.profile?.phone)}
        {me?.profile?.privacy?.showEmail && infoRow("mail-outline", me?.email)}
      </View>
      
      {/* Stats */}
      <View style={s.statsBar}>
        {stat("Bài viết", me?.postsCount)}
        <View style={s.statDivider} />
        {stat("Người theo dõi", me?.followersCount, () => {
          if (me?.id) router.push({ pathname: "/followers-list", params: { userId: me.id, type: "followers", name: me.name } });
        })}
        <View style={s.statDivider} />
        {stat("Đang theo dõi", me?.followingCount, () => {
          if (me?.id) router.push({ pathname: "/followers-list", params: { userId: me.id, type: "following", name: me.name } });
        })}
      </View>

      

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === TAB_MY && s.tabActive]}
          onPress={() => setActiveTab(TAB_MY)}
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={activeTab === TAB_MY ? "#e53935" : "#888"}
          />
          <Text style={[s.tabText, activeTab === TAB_MY && s.tabTextActive]}>Bài đã đăng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === TAB_SAVE && s.tabActive]}
          onPress={() => setActiveTab(TAB_SAVE)}
        >
          <Ionicons
            name="bookmark-outline"
            size={18}
            color={activeTab === TAB_SAVE ? "#e53935" : "#888"}
          />
          <Text style={[s.tabText, activeTab === TAB_SAVE && s.tabTextActive]}>Đã lưu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ───────────── RENDER MAIN ──────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#e53935" />
      </SafeAreaView>
    );
  }

  if (!me) {
    return (
      <SafeAreaView style={s.center} edges={["top"]}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, color: "#333", fontWeight: "600", marginBottom: 8 }}>Chưa đăng nhập</Text>
        <Text style={{ fontSize: 14, color: "#666", textAlign: "center", marginHorizontal: 32, marginBottom: 24 }}>
          Bạn cần đăng nhập để xem thông tin, chỉnh sửa hồ sơ và xem các bài viết của mình.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: "#e53935", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          onPress={() => router.push("/login")}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Đăng nhập ngay</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <FlatList
        ListHeaderComponent={Header}
        data={currentData}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onUpdated={activeTab === TAB_MY ? patchMyPost : patchSaved}
            onOpenComments={(id) => router.push({ pathname: "/post/[id]", params: { id } })}
            onHidden={(id) => {
               if (activeTab === TAB_MY) setMyPosts((p) => p.filter((x) => x.id !== id));
               else setSavedPosts((p) => p.filter((x) => x.id !== id));
            }}
          />
        )}
        contentContainerStyle={{ padding: 10, paddingBottom: 60 }}
        ListEmptyComponent={
          currentLoading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color="#e53935" />
          ) : (
            <Text style={s.empty}>
              {activeTab === TAB_MY ? "Chưa có bài viết nào." : "Chưa có bài viết đã lưu."}
            </Text>
          )
        }
      />

      {/* Edit modal */}
      {me && (
        <EditProfileModal
          user={me}
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          onSaved={(updated) => {
            setMe(updated);
            saveUserJson({
              id: updated.id!,
              email: updated.email!,
              name: updated.name!,
              avatar: updated.avatar!,
              role: updated.role!,
            });
            setEditVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

/* ═══════════════════════════════ EDIT MODAL ════════════════════════════════*/
function EditProfileModal({
  user,
  visible,
  onClose,
  onSaved,
}: {
  user: MeUser;
  visible: boolean;
  onClose: () => void;
  onSaved: (u: MeUser) => void;
}) {
  const [name,     setName]     = useState(user.name     || "");
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [bio,      setBio]      = useState(user.profile?.bio      || "");
  const [birthday, setBirthday] = useState(
    user.profile?.birthday ? user.profile.birthday.slice(0, 10) : ""
  );
  const [hometown, setHometown] = useState(user.profile?.hometown || "");
  const [phone,    setPhone]    = useState(user.profile?.phone    || "");

  const [privacy, setPrivacy] = useState<ProfilePrivacy>({
    showBirthday: user.profile?.privacy?.showBirthday ?? false,
    showHometown:  user.profile?.privacy?.showHometown  ?? true,
    showPhone:     user.profile?.privacy?.showPhone     ?? false,
    showEmail:     user.profile?.privacy?.showEmail     ?? false,
  });

  const [saving, setSaving] = useState(false);

  const togglePrivacy = (key: keyof ProfilePrivacy) =>
    setPrivacy((p) => ({ ...p, [key]: !p[key] }));

  const pickImage = async (useCamera = false) => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };

    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Lỗi', 'Cần quyền truy cập máy ảnh để chụp ảnh.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Lỗi', 'Cần quyền truy cập thư viện để chọn ảnh.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let mimeType = asset.mimeType || "image/jpeg";
        let ext = "jpg";
        if (asset.fileName && asset.fileName.includes(".")) {
          ext = asset.fileName.split(".").pop() || "jpg";
        } else if (mimeType && mimeType.includes("/")) {
          ext = mimeType.split("/")[1];
        }

        setAvatarLocal(asset.uri);
        // Lưu metadata kèm URI để khi 'save()' gọi, ta có đủ mimeType
        (user as any)._tempAvatarMeta = { mimeType, fileName: asset.fileName || `avatar.${ext}` };
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const triggerImagePicker = () => {
    Alert.alert("Ảnh đại diện", "Chọn ảnh từ:", [
      { text: "Thư viện", onPress: () => pickImage(false) },
      { text: "Chụp ảnh", onPress: () => pickImage(true) },
      { text: "Hủy", style: "cancel" }
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (avatarLocal) {
        const meta = (user as any)._tempAvatarMeta || {};
        const mimeType = meta.mimeType || "image/jpeg";
        const fileName = meta.fileName || "avatar.jpg";
        
        const formData = new FormData();
        formData.append("avatar", {
          uri: avatarLocal,
          name: fileName,
          type: mimeType,
        } as any);
        await uploadAvatarForm(formData); 
      }

      const { user: updated } = await updateMe({
        name: name.trim() || undefined,
        bio, birthday: birthday || null, hometown, phone, privacy,
      });
      onSaved(updated);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    opts?: { multiline?: boolean; keyboardType?: any; placeholder?: string }
  ) => (
    <View style={m.fieldWrap}>
      <Text style={m.fieldLabel}>{label}</Text>
      <TextInput
        style={[m.input, opts?.multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder || label}
        placeholderTextColor="#bbb"
        multiline={opts?.multiline}
        keyboardType={opts?.keyboardType}
        autoCapitalize="none"
      />
    </View>
  );

  const privacyRow = (
    label: string,
    key: keyof ProfilePrivacy,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={m.privacyRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={16} color="#555" />
        <Text style={m.privacyLabel}>{label}</Text>
      </View>
      <Switch
        value={privacy[key]}
        onValueChange={() => togglePrivacy(key)}
        trackColor={{ false: "#e0e0e0", true: "#e74040ff" }}
        thumbColor={"#fff"}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={m.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header bar */}
          <View style={m.headerBar}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={m.headerTitle}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#e53935" />
              ) : (
                <Text style={m.saveText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={m.scroll}>
            {/* Avatar preview & change */}
            <View style={m.avatarSection}>
              <View style={m.avatarPreviewRing}>
                <ExpoImage 
                  source={getAvatarSrc(avatarLocal || user.avatar)} 
                  style={m.avatarPreview} 
                  contentFit="cover"
                  transition={200}
                />
                <TouchableOpacity style={m.changeAvatarBtn} onPress={triggerImagePicker}>
                  <Ionicons name="camera" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={m.changeAvatarText}>Đổi ảnh đại diện</Text>
            </View>

            <Text style={m.section}>Thông tin cơ bản</Text>
            {field("Tên hiển thị",  name,     setName,     { placeholder: "Nhập tên của bạn" })}
            {field("Giới thiệu",    bio,      setBio,       { multiline: true, placeholder: "Viết gì đó về bạn..." })}

            <Text style={m.section}>Thông tin cá nhân</Text>
            {field("Ngày sinh (YYYY-MM-DD)", birthday, setBirthday, { placeholder: "1999-12-31" })}
            {field("Quê quán",   hometown, setHometown)}
            {field("Số điện thoại", phone, setPhone, { keyboardType: "phone-pad" })}

            <Text style={m.section}>Quyền riêng tư</Text>
            <Text style={m.privacySub}>Chọn thông tin hiển thị với mọi người</Text>
            {privacyRow("Ngày sinh",    "showBirthday", "calendar-outline")}
            {privacyRow("Quê quán",     "showHometown",  "location-outline")}
            {privacyRow("Số điện thoại","showPhone",     "call-outline")}
            {privacyRow("Email",        "showEmail",     "mail-outline")}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ═══════════════════════════════ STYLES ════════════════════════════════════*/
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f2f3f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  coverWrap: {
    height: 160,
    width: "100%",
    position: "relative",
  },
  coverImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#cbcbcbff", // Nền xanh cũ
  },
  settingsBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  changeCoverBtn: {
    position: "absolute",
    bottom: 12,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },

  avatarWrapper: {
    alignItems: "center",
    marginTop: -45, // Kéo lên đè lên ảnh bìa
    marginBottom: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: "#fff",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  name: { fontSize: 22, fontWeight: "700", color: "#111" },
  roleBadge: {
    backgroundColor: "#e53935",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  profileId: { textAlign: "center", color: "#888", fontSize: 13, marginTop: -6, marginBottom: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },

  bio: { marginHorizontal: 20, marginBottom: 8, textAlign: "center", color: "#555", fontSize: 14, lineHeight: 20 },

  infoBlock: { paddingHorizontal: 40, marginTop: 4, gap: 6, alignItems: "flex-start", alignSelf: "center" },
  infoRow:   { flexDirection: "row", alignItems: "center" },
  infoText:  { color: "#555", fontSize: 15 },

  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 18, fontWeight: "700", color: "#e53935" },
  statLabel:   { fontSize: 12, color: "#888", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#eee", alignSelf: "stretch" },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive:     { borderBottomColor: "#e53935" },
  tabText:       { fontSize: 13, color: "#888", fontWeight: "600" },
  tabTextActive: { color: "#e53935" },

  empty: { textAlign: "center", color: "#aaa", marginTop: 40, fontSize: 14 },
});

const m = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20, paddingBottom: 60 },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 25, // Đưa xuống 1 chút tránh tai thỏ
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  saveText:    { color: "#eb3c3cff", fontWeight: "700", fontSize: 15 },

  avatarSection: { alignItems: "center", marginBottom: 20 },
  avatarPreviewRing: {
    position: "relative",
  },
  avatarPreview: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#eee" },
  changeAvatarBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: "#5e5555ff",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff"
  },
  changeAvatarText: { marginTop: 12, color: "#0a0a0aff", fontSize: 13, fontWeight: "600" },

  section:    { fontSize: 13, fontWeight: "700", color: "#aaa", marginTop: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  privacySub: { color: "#aaa", fontSize: 12, marginBottom: 8, marginTop: -4 },

  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fafafa",
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  privacyLabel: { fontSize: 14, color: "#333" },
});

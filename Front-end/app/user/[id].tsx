import { Ionicons } from "@expo/vector-icons";
import { fetchUserProfile, fetchUserPosts } from "@/features/user/services/userApi";
import { followUser, unfollowUser } from "@/features/social/services/postsApi";
import { mapApiPostToUi, type FeedPostUi } from "@/features/social/mapPost";
import PostCard from "@/features/social/PostCard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { getToken } from "@/features/auth/utils/storage";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { PublicUser } from "@/features/user/services/userApi";
import { Image as ExpoImage } from "expo-image";

const AVATAR_SIZE = 90;
const COVER_HEIGHT = 160;
const FALLBACK = require("../../Uploads/AnhDaiDien.jpg");

function getAvatarSrc(uri?: string) {
  if (uri && uri.startsWith("http")) return { uri };
  return FALLBACK;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // An toàn: fallback về tabs nếu không có màn hình trước
  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const [user, setUser]           = useState<PublicUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [posts, setPosts]         = useState<FeedPostUi[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  /* ── Load profile ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để xem hồ sơ người khác.", [
            { text: "Đóng", style: "cancel", onPress: safeBack },
            { text: "Đăng nhập", onPress: () => router.replace("/login") }
          ]);
          setLoading(false);
          return;
        }

        const { user: u } = await fetchUserProfile(id);
        setUser(u);
        setFollowing(!!u.isFollowing);
      } catch (e: any) {
        Alert.alert("Lỗi", e.message, [{ text: "OK", onPress: safeBack }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── Load posts ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      const token = await getToken();
      if (!token) return;

      setPostsLoading(true);
      fetchUserPosts(id)
        .then(({ posts: raw }) => setPosts(raw.map(mapApiPostToUi)))
        .catch(() => {})
        .finally(() => setPostsLoading(false));
    })();
  }, [id]);

  /* ── Follow / Unfollow ── */
  const toggleFollow = async () => {
    if (!id || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowUser(id);
        setFollowing(false);
        setUser((u) => u ? { ...u, followersCount: Math.max(0, (u.followersCount ?? 0) - 1), isFollowing: false } : u);
      } else {
        await followUser(id);
        setFollowing(true);
        setUser((u) => u ? { ...u, followersCount: (u.followersCount ?? 0) + 1, isFollowing: true } : u);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setFollowBusy(false);
    }
  };

  const patchPost = (postId: string, patch: Partial<FeedPostUi>) =>
    setPosts((p) => p.map((x) => (x.id === postId ? { ...x, ...patch } : x)));

  /* ─── LOADING ─── */
  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#1877f2" />
      </SafeAreaView>
    );
  }

  const formatBirthday = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const infoRow = (icon: keyof typeof Ionicons.glyphMap, text?: string | null) =>
    text ? (
      <View style={s.infoRow}>
        <Ionicons name={icon} size={16} color="#666" style={{ marginRight: 8 }} />
        <Text style={s.infoText}>{text}</Text>
      </View>
    ) : null;

  /* ─── Header component (inside FlatList ListHeaderComponent) ─── */
  const Header = () => (
    <View>
      {/* Cover */}
      <View style={s.coverWrapper}>
        {user?.cover ? (
          <ExpoImage source={{ uri: user.cover }} style={s.coverImg} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={["#cbcbcbff", "#cbcbcbff"]} style={s.cover} />
        )}
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={safeBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        {/* Avatar */}
        <View style={s.avatarRing}>
          <ExpoImage source={getAvatarSrc(user?.avatar)} style={s.avatar} contentFit="cover" transition={200} />
        </View>
      </View>

      {/* Name + Follow button */}
      <View style={s.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user?.name || "Người dùng"}</Text>
          {user?.email ? <Text style={s.email}>{user.email}</Text> : null}
        </View>
        <TouchableOpacity
          style={[s.followBtn, following && s.followingBtn]}
          onPress={toggleFollow}
          disabled={followBusy}
        >
          {followBusy ? (
            <ActivityIndicator size="small" color={following ? "#e53935" : "#fff"} />
          ) : (
            <>
              <Ionicons
                name={following ? "person-remove-outline" : "person-add-outline"}
                size={15}
                color={following ? "#534a4aff" : "#fff"}
              />
              <Text style={[s.followText, following && s.followingText]}>
                {following ? "Đang theo dõi" : "Theo dõi"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bio */}
      {user?.profile?.bio ? <Text style={s.bio}>{user.profile.bio}</Text> : null}

      {/* Info */}
      <View style={s.infoBlock}>
        {infoRow("calendar-outline", formatBirthday(user?.profile?.birthday))}
        {infoRow("location-outline",  user?.profile?.hometown)}
        {infoRow("call-outline",      user?.profile?.phone)}
        {infoRow("mail-outline",      user?.email)}
      </View>

      {/* Stats */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{user?.postsCount ?? 0}</Text>
          <Text style={s.statLabel}>Bài viết</Text>
        </View>
        <View style={s.statDivider} />
        <TouchableOpacity 
          style={s.statItem} 
          activeOpacity={0.6}
          onPress={() => router.push({ pathname: "/followers-list", params: { userId: id, type: "followers", name: user?.name } })}
        >
          <Text style={s.statNum}>{user?.followersCount ?? 0}</Text>
          <Text style={s.statLabel}>Người theo dõi</Text>
        </TouchableOpacity>
        <View style={s.statDivider} />
        <TouchableOpacity 
          style={s.statItem}
          activeOpacity={0.6}
          onPress={() => router.push({ pathname: "/followers-list", params: { userId: id, type: "following", name: user?.name } })}
        >
          <Text style={s.statNum}>{user?.followingCount ?? 0}</Text>
          <Text style={s.statLabel}>Đang theo dõi</Text>
        </TouchableOpacity>
      </View>

      {/* Posts heading */}
      <View style={s.postsHeader}>
        <Ionicons name="grid-outline" size={16} color="#555" />
        <Text style={s.postsHeaderText}>Bài đã đăng</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {postsLoading && posts.length === 0 ? (
        <>
          <Header />
          <ActivityIndicator style={{ marginTop: 24 }} color="#e53935" />
        </>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onUpdated={patchPost}
              onOpenComments={(pid) => router.push({ pathname: "/post/[id]", params: { id: pid } })}
              onHidden={(pid) => setPosts((p) => p.filter((x) => x.id !== pid))}
            />
          )}
          ListHeaderComponent={<Header />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={s.empty}>Người dùng chưa có bài viết nào.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f2f3f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  coverWrapper: { height: COVER_HEIGHT, position: "relative" },
  cover:        { ...StyleSheet.absoluteFillObject },
  coverImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  backBtn: { position: "absolute", top: 14, left: 14 },

  avatarRing: {
    position: "absolute",
    bottom: -(AVATAR_SIZE / 2),
    left: 20,
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: AVATAR_SIZE / 2 + 10,
    marginHorizontal: 20,
    gap: 12,
  },
  name:  { fontSize: 20, fontWeight: "700", color: "#111" },
  profileId: { color: "#888", fontSize: 13, marginTop: 2, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  email: { fontSize: 13, color: "#888", marginTop: 2 },

  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e43131ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 110,
    justifyContent: "center",
  },
  followingBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#1b1414ff",
  },
  followText:    { color: "#fff",     fontWeight: "600", fontSize: 13 },
  followingText: { color: "#534a4aff", fontWeight: "600", fontSize: 13 },

  bio:      { marginHorizontal: 20, marginTop: 6,  color: "#555", fontSize: 14, lineHeight: 20 },
  infoBlock: { paddingHorizontal: 20, marginTop: 8, gap: 4 },
  infoRow:  { flexDirection: "row", alignItems: "center" },
  infoText: { color: "#605b5bff", fontSize: 13 },

  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 18, fontWeight: "700", color: "#de2828ff" },
  statLabel:   { fontSize: 12, color: "#888", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#eee", alignSelf: "stretch" },

  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  postsHeaderText: { fontSize: 14, fontWeight: "700", color: "#555" },

  empty: { textAlign: "center", color: "#aaa", marginTop: 40, fontSize: 14 },
});

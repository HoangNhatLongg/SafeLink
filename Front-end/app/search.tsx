import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchGlobalSearch, followUser, unfollowUser } from "@/features/social/services/postsApi";
import { fetchSuggestedUsers, type SuggestedUser } from "@/features/user/services/userApi";
import PostCard from "@/features/social/PostCard";
import { mapApiPostToUi } from "@/features/social/mapPost";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "posts", label: "Bài đăng" },
  { key: "users", label: "Mọi người" },
  { key: "locations", label: "Địa điểm" },
];

const FALLBACK = require("../../Uploads/AnhDaiDien.jpg");

function getAvatarSrc(uri?: string) {
  if (uri && uri.startsWith("http")) return { uri };
  return FALLBACK;
}

// Thẻ lý do gợi ý
function ReasonBadge({ reason }: { reason: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    "Mạng lưới chung": { bg: "#e7f3ff", text: "#1877f2" },
    "Đang theo dõi bạn": { bg: "#fff0f0", text: "#e43131" },
    "Cùng quê quán": { bg: "#f0fff4", text: "#2ecc71" },
    "Có thể biết": { bg: "#f5f5f5", text: "#888" },
  };
  const c = colorMap[reason] || { bg: "#f5f5f5", text: "#888" };
  return (
    <View style={[styles.reasonBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.reasonText, { color: c.text }]}>{reason}</Text>
    </View>
  );
}

// Card gợi ý người dùng
function SuggestionCard({
  item,
  onFollowChanged,
}: {
  item: SuggestedUser & { isFollowedByMe: boolean };
  onFollowChanged: (id: string, followed: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleFollow = async () => {
    setBusy(true);
    try {
      if (item.isFollowedByMe) {
        await unfollowUser(item._id);
        onFollowChanged(item._id, false);
      } else {
        await followUser(item._id);
        onFollowChanged(item._id, true);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.suggestionCard}>
      <TouchableOpacity
        style={styles.suggestionLeft}
        onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}
        activeOpacity={0.8}
      >
        <Image source={getAvatarSrc(item.avatar)} style={styles.suggestionAvatar} />
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
          {item.hometown ? (
            <Text style={styles.suggestionSub} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} color="#888" /> {item.hometown}
            </Text>
          ) : null}
          <Text style={styles.suggestionSub}>
            {item.followersCount} người theo dõi
          </Text>
          <View style={styles.reasonRow}>
            {item.reasons.slice(0, 2).map((r, i) => (
              <ReasonBadge key={i} reason={r} />
            ))}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.followBtn, item.isFollowedByMe && styles.followingBtn]}
        onPress={handleFollow}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color={item.isFollowedByMe ? "#555" : "#fff"} />
        ) : (
          <Text style={[styles.followBtnText, item.isFollowedByMe && styles.followingBtnText]}>
            {item.isFollowedByMe ? "Đang theo dõi" : "Theo dõi"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(params.q || "");
  const [activeTab, setActiveTab] = useState(params.q ? "all" : "users");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ users: any[]; posts: any[] }>({ users: [], posts: [] });

  // Suggestions state
  const [suggestions, setSuggestions] = useState<(SuggestedUser & { isFollowedByMe: boolean })[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // Load suggestions on mount
  useEffect(() => {
    fetchSuggestedUsers(20)
      .then(({ suggestions: s }) => {
        setSuggestions(s.map((u) => ({ ...u, isFollowedByMe: false })));
      })
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  }, []);

  const handleFollowChanged = (id: string, followed: boolean) => {
    setSuggestions((prev) =>
      prev.map((u) => (u._id === id ? { ...u, isFollowedByMe: followed } : u))
    );
  };

  const performSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) {
      setResults({ users: [], posts: [] });
      return;
    }
    setLoading(true);
    try {
      const { users, posts } = await fetchGlobalSearch(q.trim(), type);
      setResults({
        users: users || [],
        posts: (posts || []).map(mapApiPostToUi),
      });
    } catch (e: any) {
      console.error("Search Error:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], posts: [] });
      return;
    }
    const id = setTimeout(() => performSearch(query, activeTab), 500);
    return () => clearTimeout(id);
  }, [query, activeTab, performSearch]);

  // ─── Render: Khi không có từ khoá và tab là "Mọi người" ───
  const renderSuggestionsPanel = () => (
    <View style={styles.suggestionsSection}>
      <Text style={styles.sectionTitle}>✨ Những người bạn có thể biết</Text>
      {suggestionsLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#1877f2" />
      ) : suggestions.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có gợi ý nào.</Text>
      ) : (
        suggestions.map((item) => (
          <SuggestionCard
            key={item._id}
            item={item}
            onFollowChanged={handleFollowChanged}
          />
        ))
      )}
    </View>
  );

  const renderUserCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => router.push({ pathname: "/user/[id]", params: { id: item._id } })}
    >
      <Image source={getAvatarSrc(item.avatar)} style={styles.userAvatar} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderContent = () => {
    // Show suggestions when no query and on the "users" / "all" tab
    if (!query.trim()) {
      if (activeTab === "users" || activeTab === "all") {
        return renderSuggestionsPanel();
      }
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Nhập từ khóa hoặc #hashtag để tìm kiếm</Text>
        </View>
      );
    }

    if (loading) {
      return <ActivityIndicator style={{ marginTop: 40 }} color="#1877f2" size="large" />;
    }

    const dataList: any[] = [];
    if (activeTab === "all" || activeTab === "users") {
      results.users.forEach((u) => dataList.push({ type: "user", item: u }));
    }
    if (activeTab === "all" || activeTab === "posts" || activeTab === "locations") {
      results.posts.forEach((p) => dataList.push({ type: "post", item: p }));
    }

    if (dataList.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy kết quả nào cho "{query}"</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={dataList}
        keyExtractor={(d, i) =>
          d.type + "-" + (d.item.id || d.item._id || i)
        }
        contentContainerStyle={{ padding: 10, paddingBottom: 40 }}
        renderItem={({ item: d }) => {
          if (d.type === "user") return renderUserCard({ item: d.item });
          return (
            <PostCard
              post={d.item}
              onUpdated={(id, patch) =>
                setResults((prev) => ({
                  ...prev,
                  posts: prev.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
                }))
              }
              onHidden={(id) =>
                setResults((prev) => ({
                  ...prev,
                  posts: prev.posts.filter((p) => p.id !== id),
                }))
              }
              onOpenComments={(pid) =>
                router.push({ pathname: "/post/[id]", params: { id: pid } })
              }
            />
          );
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#888" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người dùng, bài đăng..."
            value={query}
            onChangeText={setQuery}
            autoFocus={!params.q}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color="#888"
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsMenu}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={renderContent()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f3f5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  backBtn: { padding: 8, marginRight: 4 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    minHeight: 40,
  },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 16, color: "#333" },

  tabsMenu: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#1877f2" },
  tabText: { fontSize: 13, color: "#666", fontWeight: "500" },
  tabTextActive: { color: "#1877f2", fontWeight: "700" },

  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { marginTop: 14, fontSize: 15, color: "#888", textAlign: "center" },

  // ── Suggestions ──
  suggestionsSection: { padding: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  suggestionAvatar: { width: 54, height: 54, borderRadius: 27, marginRight: 12 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  suggestionSub: { fontSize: 12, color: "#888", marginBottom: 2 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  reasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reasonText: { fontSize: 11, fontWeight: "600" },

  followBtn: {
    backgroundColor: "#1877f2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  followingBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc" },
  followBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  followingBtnText: { color: "#333" },

  // ── Search results - users ──
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#111" },
  userEmail: { fontSize: 13, color: "#666", marginTop: 2 },
});

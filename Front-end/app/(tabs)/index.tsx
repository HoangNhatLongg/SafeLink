import BreakingNewsTicker from "@/features/social/BreakingNewsTicker";
import PostCard from "@/features/social/PostCard";
import { mapApiPostToUi, type FeedPostUi } from "@/features/social/mapPost";
import { fetchFeed } from "@/features/social/services/postsApi";
import { fetchMe } from "@/features/user/services/userApi";
import {
  getToken,
  getUserJson,
  saveUserJson,
  type StoredUser,
} from "@/features/auth/utils/storage";
import {
  makeOnViewableItemsChanged,
} from "@/features/social/videoVisibilityStore";
import { Image as ExpoImage } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import SOSButton from "@/features/SOS/SOSButton";
import SOSModal from "@/features/SOS/SOSModal";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

export default function SocialScreen() {
  const router = useRouter();

  const [posts, setPosts] = useState<FeedPostUi[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [me, setMe] = useState<StoredUser | null>(null);
  const [sosVisible, setSosVisible] = useState(false);

  const onEndReachedCalledDuringMomentum = useRef(false);
  const initialFeedLoaded = useRef(false);

  const onViewableItemsChanged = useMemo(() => makeOnViewableItemsChanged(() => {}), []);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    const { posts: raw, pagination } = await fetchFeed(pageNum, 10);
    const mapped = raw.map(mapApiPostToUi);
    if (append) {
      setPosts((prev) => [...prev, ...mapped]);
    } else {
      setPosts(mapped);
    }
    const more =
      pagination.hasMore !== undefined
        ? pagination.hasMore
        : pageNum < pagination.totalPages;
    setHasMore(more);
    setPage(pageNum);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const token = await getToken();
        if (!alive) return;
        if (token) {
          const local = await getUserJson();
          setMe(local);
          try {
            const { user } = await fetchMe();
            const next: StoredUser = {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              role: user.role,
            };
            await saveUserJson(next);
            if (alive) setMe(next);
          } catch {
            /* giữ cache */
          }
        } else {
          setMe(null);
        }

        if (!initialFeedLoaded.current) {
          initialFeedLoaded.current = true;
          setLoading(true);
          try {
            await loadPage(1, false);
          } catch (e: any) {
            Alert.alert("Không tải được bảng tin", e.message || "Lỗi mạng");
            setPosts([]);
          } finally {
            if (alive) setLoading(false);
          }
        }
      })();
      return () => {
        alive = false;
      };
    }, [router, loadPage])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPage(1, false);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || onEndReachedCalledDuringMomentum.current) return;
    setLoadingMore(true);
    onEndReachedCalledDuringMomentum.current = true;
    try {
      await loadPage(page + 1, true);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const onPostUpdated = useCallback((id: string, patch: Partial<FeedPostUi>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const onPostHidden = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedPostUi }) => (
      <PostCard
        post={item}
        onUpdated={onPostUpdated}
        onOpenComments={(pid) => router.push({ pathname: "/post/[id]", params: { id: pid } })}
        onHidden={onPostHidden}
      />
    ),
    [onPostUpdated, onPostHidden, router]
  );

  const keyExtractor = useCallback((item: FeedPostUi) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <BreakingNewsTicker />

      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.hint}>Đang tải bảng tin…</Text>
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={420}
          ListHeaderComponent={<FeedHeader router={router} me={me} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Chưa có bài viết. Hãy là người đầu tiên đăng!</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.loadingText}>Đang tải thêm…</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
        />
      )}

      {/* Nút SOS nổi (có thể kéo thả) */}
      <SOSButton onPress={async () => {
        const token = await getToken();
        if (!token) {
          Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để gửi tín hiệu SOS.", [
            { text: "Bỏ qua", style: "cancel" },
            { text: "Đăng nhập", onPress: () => router.push("/login") },
          ]);
          return;
        }
        setSosVisible(true);
      }} />

      {/* Modal gửi SOS */}
      <SOSModal 
        visible={sosVisible} 
        onClose={() => setSosVisible(false)}
        onSuccess={() => {
          onRefresh(); // Làm mới feed để xem SOS mới
        }} 
      />
    </SafeAreaView>
  );
}

function FeedHeader({ router, me }: { router: any; me: StoredUser | null }) {
  const avatarSource =
    me?.avatar && me.avatar.startsWith("http")
      ? { uri: me.avatar }
      : require("@/Uploads/AnhDaiDien.jpg");

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        style={styles.searchContainer} 
        activeOpacity={0.8}
        onPress={() => router.push("/search")}
      >
        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
        <Text style={styles.searchInput}>Tìm kiếm thông tin, địa điểm…</Text>
      </TouchableOpacity>

      <View style={styles.createContainer}>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <ExpoImage
            source={avatarSource}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fakeInput}
          onPress={async () => {
            const token = await getToken();
            if (!token) {
              Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để đăng bài.", [
                { text: "Bỏ qua", style: "cancel" },
                { text: "Đăng nhập", onPress: () => router.push("/login") },
              ]);
              return;
            }
            router.push("/create-post");
          }}
        >
          <Text style={styles.placeholder}>Bạn muốn cập nhật tình hình gì?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f3f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  hint: {
    marginTop: 12,
    color: "#666",
  },
  empty: {
    textAlign: "center",
    color: "#888",
    padding: 24,
  },
  listContent: {
    padding: 10,
    paddingBottom: 30,
  },
  headerContainer: {
    marginBottom: 6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  createContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  fakeInput: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  placeholder: {
    color: "#777",
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 6,
    color: "#777",
    fontSize: 13,
  },
});

import { getToken } from "@/features/auth/utils/storage";
import { mapApiPostToUi, type FeedPostUi } from "@/features/social/mapPost";
import PostCard from "@/features/social/PostCard";
import { fetchNearby } from "@/features/social/services/postsApi";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NearbyScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPostUi[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("Nhấn để lấy vị trí và tải bài viết gần bạn (cần PostGIS trên server).");

  const load = useCallback(async () => {
    const t = await getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền vị trí", "Cần quyền để tìm bài đăng lân cận.");
      return;
    }
    setLoading(true);
    setHint("");
    try {
      const pos = await Location.getCurrentPositionAsync({});
      const { posts: raw } = await fetchNearby(
        pos.coords.latitude,
        pos.coords.longitude,
        8000,
        30
      );
      setPosts(raw.map(mapApiPostToUi));
      if (!raw.length) setHint("Không có bài nào trong bán kính hoặc server chưa bật PostgreSQL/PostGIS.");
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("503") || msg.toLowerCase().includes("postgres")) {
        setHint("Server chưa cấu hình POSTGRES_URI — tính năng bản đồ tắt.");
      } else {
        Alert.alert("Lỗi", msg);
      }
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const onUpdated = (id: string, patch: Partial<FeedPostUi>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <TouchableOpacity style={styles.btn} onPress={load} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Tải bài viết gần đây</Text>
        )}
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onUpdated={onUpdated}
            onOpenComments={(id) => router.push({ pathname: "/post/[id]", params: { id } })}
            onHidden={(id) => setPosts((p) => p.filter((x) => x.id !== id))}
          />
        )}
        contentContainerStyle={{ padding: 10, paddingBottom: 24 }}
        ListEmptyComponent={
          !loading && !hint ? <Text style={styles.empty}>Không có dữ liệu.</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f3f5" },
  btn: {
    margin: 12,
    backgroundColor: "#1877f2",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  hint: { paddingHorizontal: 16, color: "#666", marginBottom: 8 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
});

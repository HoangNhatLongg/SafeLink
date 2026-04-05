import { getToken } from "@/features/auth/utils/storage";
import { mapApiPostToUi, type FeedPostUi } from "@/features/social/mapPost";
import PostCard from "@/features/social/PostCard";
import { fetchSavedPosts } from "@/features/social/services/postsApi";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SavedPostsScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPostUi[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const t = await getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const { posts: raw } = await fetchSavedPosts(1, 50);
      setPosts(raw.map(mapApiPostToUi));
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const onUpdated = (id: string, patch: Partial<FeedPostUi>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1877f2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
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
        ListEmptyComponent={<Text style={styles.empty}>Chưa có bài viết đã lưu.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f3f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
});

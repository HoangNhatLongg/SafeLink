import { mapApiPostToUi } from "@/features/social/mapPost";
import PostCard from "@/features/social/PostCard";
import {
  addComment,
  fetchComments,
  fetchPost,
} from "@/features/social/services/postsApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPostUi } from "@/features/social/mapPost";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const postId = String(id || "");

  const [postUi, setPostUi] = useState<FeedPostUi | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { post } = await fetchPost(postId);
      setPostUi(mapApiPostToUi(post));
      const c = await fetchComments(postId, 1, 30);
      setComments(c.comments || []);
      setPage(1);
      setHasMore(c.pagination.hasMore ?? c.pagination.page < c.pagination.totalPages);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message, [{ text: "OK", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await addComment(postId, t);
      setText("");
      const c = await fetchComments(postId, 1, 50);
      setComments(c.comments || []);
      setPostUi((p) => (p ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setSending(false);
    }
  };

  const onPostUpdated = useCallback((pid: string, patch: Partial<FeedPostUi>) => {
    setPostUi((p) => (p && p.id === pid ? { ...p, ...patch } : p));
  }, []);

  if (loading || !postUi) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1877f2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={comments}
        keyExtractor={(item) => String(item._id)}
        ListHeaderComponent={
          <>
            <PostCard
              post={postUi}
              onUpdated={onPostUpdated}
              onOpenComments={() => {}}
            />
            <Text style={styles.sectionTitle}>Bình luận</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.cAuthor}>{item.author?.name || item.author?.email || "User"}</Text>
            <Text style={styles.cBody}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có bình luận.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
      />

      <View style={styles.compose}>
        <TextInput
          style={styles.input}
          placeholder="Viết bình luận…"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>Gửi</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f3f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  comment: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  cAuthor: { fontWeight: "700", marginBottom: 4 },
  cBody: { color: "#333" },
  empty: { color: "#888", textAlign: "center", padding: 16 },
  compose: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#1877f2",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendText: { color: "#fff", fontWeight: "700" },
});

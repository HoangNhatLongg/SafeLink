/**
 * PostDetailScreen
 * - Compose bar nằm trên bàn phím (KeyboardAvoidingView)
 * - Khi nhấn "Trả lời" ở bất kỳ comment nào → compose bar tự focus + hiện "@tên"
 * - Nhấn ngoài tag hoặc cancel để quay về bình luận gốc
 *
 * Fix bàn phím che ô nhập:
 *  - Dùng useHeaderHeight() để tính đúng keyboardVerticalOffset (bao gồm header Stack)
 *  - behavior="padding" cho cả iOS lẫn Android
 *  - SafeAreaView chỉ xử lý top; bottom safe area gắn trực tiếp vào compose bar
 */

import { mapApiPostToUi } from "@/features/social/mapPost";
import PostCard from "@/features/social/PostCard";
import CommentItem, { type CommentData } from "@/features/social/CommentItem";
import {
  addComment,
  fetchComments,
  fetchPost,
} from "@/features/social/services/postsApi";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { FeedPostUi } from "@/features/social/mapPost";


// ─── Kiểu reply target ────────────────────────────────────

type ReplyTarget = {
  commentId: string;      // parentId gửi lên API
  replyToUserId: string;  // userId được tag
  replyToName: string;    // Tên hiển thị trong chip
} | null;

// ─── Screen ───────────────────────────────────────────────

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const postId = String(id || "");

  // Quậy lại an toàn: fallback về tabs nếu không có màn hình trước
  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  // ── Điều chỉnh bàn phím ────────────────────────────────
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  // Compose bar có padding bottom = safe area bottom (cho thiết bị có notch/gesture bar)
  const composePaddingBottom = Math.max(insets.bottom, 8);

  const [postUi, setPostUi] = useState<FeedPostUi | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /** Reply target — null = đang gửi bình luận gốc */
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);

  const inputRef = useRef<TextInput>(null);

  // ── Load bài viết + trang comment đầu tiên ──────────────

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { post } = await fetchPost(postId);
      setPostUi(mapApiPostToUi(post));
      const c = await fetchComments(postId, 1, 15);
      setComments((c.comments ?? []) as CommentData[]);
      setPage(1);
      setHasMore(c.pagination.hasMore ?? c.pagination.page < c.pagination.totalPages);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message, [{ text: "OK", onPress: safeBack }]);
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Load thêm comment (pagination) ──────────────────────

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const c = await fetchComments(postId, next, 15);
      setComments((prev) => [...prev, ...((c.comments ?? []) as CommentData[])]);
      setPage(next);
      setHasMore(c.pagination.hasMore ?? c.pagination.page < c.pagination.totalPages);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Gửi comment / reply ──────────────────────────────────

  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    
    const token = await getToken();
    if (!token) {
      Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để bình luận.", [
        { text: "Bỏ qua", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/login") },
      ]);
      return;
    }

    setSending(true);
    try {
      if (replyTarget) {
        // Gửi reply (API tự resolve root parentId)
        await addComment(postId, t, replyTarget.commentId, replyTarget.replyToUserId);
        setReplyTarget(null);
      } else {
        // Gửi bình luận gốc
        await addComment(postId, t);
      }
      setText("");
      Keyboard.dismiss();
      // Reload comments
      const c = await fetchComments(postId, 1, 15);
      setComments((c.comments ?? []) as CommentData[]);
      setPage(1);
      setHasMore(c.pagination.hasMore ?? c.pagination.page < c.pagination.totalPages);
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

  const onCommentAdded = useCallback(() => {
    setPostUi((p) => (p ? { ...p, commentsCount: p.commentsCount + 1 } : p));
  }, []);

  // ── Reply request từ CommentItem ─────────────────────────

  const handleRequestReply = useCallback(
    (target: { commentId: string; replyToUserId: string; replyToName: string }) => {
      setReplyTarget(target);
      // Nhỏ delay để state set xong rồi mới focus
      setTimeout(() => inputRef.current?.focus(), 80);
    },
    []
  );

  const cancelReply = () => {
    setReplyTarget(null);
    setText("");
  };

  // ── Loading ──────────────────────────────────────────────

  if (loading || !postUi) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={styles.loadingText}>Đang tải bài viết…</Text>
      </SafeAreaView>
    );
  }

  // ── Placeholder compose bar ──────────────────────────────

  const composePlaceholder = replyTarget
    ? `Trả lời @${replyTarget.replyToName}…`
    : "Viết bình luận…";

  return (
    // edges=["top","left","right"]: chỉ xử lý safe area phía trên,
    // bottom được xử lý bằng composePaddingBottom để KAV hoạt động đúng
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {/* Danh sách comment */}
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item._id)}
          ListHeaderComponent={
            <>
              {/* Bài viết */}
              <PostCard
                post={postUi}
                onUpdated={onPostUpdated}
                onOpenComments={() => inputRef.current?.focus()}
              />

              {/* Header phần comment */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bình luận</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{postUi.commentsCount}</Text>
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              postId={postId}
              depth={0}
              onCommentAdded={onCommentAdded}
              onRequestReply={handleRequestReply}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>Chưa có bình luận nào.</Text>
              <Text style={styles.emptySubText}>Hãy là người đầu tiên bình luận!</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#e53935" style={{ marginVertical: 12 }} />
            ) : hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Xem thêm bình luận</Text>
                <Ionicons name="chevron-down" size={14} color="#e53935" />
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* ── Compose bar (nằm trên bàn phím) ── */}
        <View style={[styles.composeWrapper, { paddingBottom: composePaddingBottom }]}>
          {/* Chip hiển thị reply target */}
          {replyTarget && (
            <View style={styles.replyChip}>
              <Ionicons name="return-down-forward" size={13} color="#e53935" />
              <Text style={styles.replyChipText} numberOfLines={1}>
                Đang trả lời{" "}
                <Text style={styles.replyChipName}>@{replyTarget.replyToName}</Text>
              </Text>
              <TouchableOpacity onPress={cancelReply} activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="close" size={15} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.compose}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={composePlaceholder}
              placeholderTextColor="#aaa"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={onSend}
              disabled={sending || !text.trim()}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    gap: 12,
  },
  loadingText: { color: "#94a3b8", fontSize: 14 },

  listContent: {
    padding: 12,
    paddingBottom: 20,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  countBadge: {
    backgroundColor: "#e53935",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: "center",
  },
  countBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Empty state
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },
  emptySubText: { fontSize: 13, color: "#cbd5e1" },

  // Load more
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  loadMoreText: { fontSize: 13, color: "#e53935", fontWeight: "600" },

  // Compose wrapper (chứa chip + input bar)
  composeWrapper: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },

  // Reply chip
  replyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  replyChipText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
  },
  replyChipName: {
    fontWeight: "700",
    color: "#e53935",
  },

  // Input row
  compose: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 110,
    fontSize: 14,
    backgroundColor: "#f8fafc",
    color: "#1e293b",
  },
  sendBtn: {
    backgroundColor: "#e53935",
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: "#f08987ff",
    shadowOpacity: 0,
    elevation: 0,
  },
});

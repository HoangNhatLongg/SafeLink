/**
 * CommentItem — Nâng cấp:
 *  - Avatar thật (ảnh hoặc chữ cái) + click vào xem trang cá nhân
 *  - Flat replies: tất cả reply cùng cấp, tag @tên người được reply
 *  - Khi nhấn "Trả lời", gọi onRequestReply để compose bar ở màn hình cha hiện lên (trên bàn phím)
 *  - Không nội tuyến reply input (tránh cuộn lộn xộn)
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getUserJson } from "@/features/auth/utils/storage";
import {
  reactToComment,
  fetchReplies,
  deleteComment,
  updateComment,
} from "./services/postsApi";

// ─── Kiểu dữ liệu ─────────────────────────────────────

export type AuthorInfo = {
  _id?: string;
  name?: string;
  email?: string;
  /** Tên field trong userModel là 'avatar' */
  avatar?: string;
};

export type CommentData = {
  _id: string;
  content: string;
  author?: AuthorInfo;
  /** Người được tag khi reply */
  replyTo?: AuthorInfo | null;
  likesCount: number;
  dislikesCount: number;
  repliesCount: number;
  userReaction?: "like" | "dislike" | null;
  createdAt?: string;
};

type Props = {
  comment: CommentData;
  postId: string;
  /** depth: 0 = gốc, 1 = reply */
  depth?: number;
  onCommentAdded?: () => void;
  /** Gọi khi comment bị xóa — để màn hình cha remove khỏi list */
  onDeleted?: (commentId: string) => void;
  onRequestReply?: (target: {
    commentId: string;
    replyToUserId: string;
    replyToName: string;
  }) => void;
};

const REPLIES_PER_PAGE = 10;

// ─── Avatar mini helper ────────────────────────────────

/** Chỉ dùng Image khi avatar là URL thực (http/https hoặc file://) */
const isRemoteUrl = (url?: string) =>
  !!url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://"));

function Avatar({
  user,
  size,
  onPress,
}: {
  user?: AuthorInfo;
  size: number;
  onPress?: () => void;
}) {
  const [imgError, setImgError] = React.useState(false);
  const label = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const avatarUri = !imgError && isRemoteUrl(user?.avatar) ? user!.avatar! : undefined;

  const inner = avatarUri ? (
    <Image
      source={{ uri: avatarUri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setImgError(true)}
    />
  ) : (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarLetter, { fontSize: size * 0.42 }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

// ─── Hiển thị thời gian rút gọn ───────────────────────

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  return `${Math.floor(h / 24)} ngày`;
}

// ─── Component chính ────────────────────────────────────

export default function CommentItem({
  comment,
  postId,
  depth = 0,
  onCommentAdded,
  onDeleted,
  onRequestReply,
}: Props) {
  const router = useRouter();

  // Reaction
  const [likesCount, setLikesCount] = useState(comment.likesCount ?? 0);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    (comment.userReaction as "like" | "dislike" | null) ?? null
  );
  const [reactBusy, setReactBusy] = useState(false);

  // Edit / Delete state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const editInputRef = useRef<TextInput>(null);

  // Replies list
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const [repliesCount, setRepliesCount] = useState(comment.repliesCount ?? 0);
  const [showReplies, setShowReplies] = useState(false);

  // Lấy userId hiện tại từ storage để kiểm tra quyền xóa/sửa
  useEffect(() => {
    getUserJson().then((u) => setCurrentUserId(u?.id ?? null));
  }, []);

  // ── Helpers ───────────────────────────────────────────

  const goToProfile = (userId?: string) => {
    if (!userId) return;
    router.push(`/user/${userId}` as any);
  };

  // ── Handlers ──────────────────────────────────────────

  const handleLike = useCallback(async () => {
    if (reactBusy) return;
    setReactBusy(true);
    try {
      const r = await reactToComment(comment._id, "like");
      setUserReaction(r.userReaction as "like" | "dislike" | null);
      setLikesCount(r.likesCount);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setReactBusy(false);
    }
  }, [comment._id, reactBusy]);

  const loadReplies = useCallback(async (page: number, append = false) => {
    setLoadingReplies(true);
    try {
      const data = await fetchReplies(comment._id, page, REPLIES_PER_PAGE);
      const newReplies = (data.replies ?? []) as CommentData[];
      setReplies((prev) => (append ? [...prev, ...newReplies] : newReplies));
      setRepliesLoaded(true);
      setRepliesPage(page);
      setHasMoreReplies(data.pagination.page < data.pagination.totalPages);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoadingReplies(false);
    }
  }, [comment._id]);

  const toggleReplies = async () => {
    if (!showReplies) {
      setShowReplies(true);
      if (!repliesLoaded) await loadReplies(1);
    } else {
      setShowReplies(false);
    }
  };

  const loadMoreReplies = async () => {
    if (loadingReplies || !hasMoreReplies) return;
    await loadReplies(repliesPage + 1, true);
  };

  /** Khi có reply mới được gửi từ compose bar, thêm vào danh sách */
  const handleReplyAdded = useCallback(() => {
    setRepliesCount((c) => c + 1);
    setShowReplies(true);
    // Reload lại replies để lấy bình luận mới nhất
    loadReplies(1);
    onCommentAdded?.();
  }, [loadReplies, onCommentAdded]);

  /** Nhấn "Trả lời" — yêu cầu compose bar ở màn hình cha */
  const handlePressReply = () => {
    const targetCommentId = comment._id;
    const replyToUserId = comment.author?._id ?? "";
    const replyToName = comment.author?.name || comment.author?.email || "người dùng";
    onRequestReply?.({ commentId: targetCommentId, replyToUserId, replyToName });
  };

  /** Nhấn nút ⋯ — hiện menu Sửa / Xóa */
  const handlePressMenu = () => {
    const isOwner = !!currentUserId && currentUserId === comment.author?._id;
    if (!isOwner) return;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Hủy", "Sửa bình luận", "Xóa bình luận"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: "Tùy chọn bình luận",
        },
        (idx) => {
          if (idx === 1) startEdit();
          if (idx === 2) confirmDelete();
        }
      );
    } else {
      // Android: dùng Alert với buttons
      Alert.alert("Tùy chọn bình luận", undefined, [
        { text: "Sửa bình luận", onPress: startEdit },
        {
          text: "Xóa bình luận",
          style: "destructive",
          onPress: confirmDelete,
        },
        { text: "Hủy", style: "cancel" },
      ]);
    }
  };

  const startEdit = () => {
    setEditText(comment.content);
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 80);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.content);
  };

  const handleSaveEdit = async () => {
    const t = editText.trim();
    if (!t || t === comment.content) { cancelEdit(); return; }
    setEditBusy(true);
    try {
      await updateComment(comment._id, t);
      // Cập nhật nội dung hiển thị trực tiếp (optimistic)
      comment.content = t;
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Xóa bình luận",
      "Bạn có chắc muốn xóa bình luận này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: handleDelete,
        },
      ]
    );
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await deleteComment(comment._id);
      setIsDeleted(true);
      onDeleted?.(comment._id);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
      setDeleteBusy(false);
    }
  };

  // ── UI ────────────────────────────────────────────────

  // Nếu đã xóa → ẩn hoàn toàn khỏi danh sách
  if (isDeleted) return null;

  const isOwner = !!currentUserId && currentUserId === comment.author?._id;
  const authorLabel = comment.author?.name || comment.author?.email || "Người dùng";
  const isLiked = userReaction === "like";
  const isReply = depth > 0;

  return (
    <View style={[styles.wrapper, isReply && styles.replyWrapper]}>
      {/* Avatar column */}
      <View style={styles.avatarCol}>
        <Avatar
          user={comment.author}
          size={isReply ? 28 : 36}
          onPress={() => goToProfile(comment.author?._id)}
        />
        {/* Thread line */}
        {!isReply && showReplies && repliesCount > 0 && (
          <View style={styles.threadLine} />
        )}
      </View>

      {/* Content area */}
      <View style={styles.contentCol}>
        {/* Bubble */}
        <View style={[styles.bubble, isReply && styles.bubbleReply]}>
          {/* Header: tên tác giả + nút ⋯ (chỉ hiện với owner) */}
          <View style={styles.bubbleHeader}>
            <TouchableOpacity
              onPress={() => goToProfile(comment.author?._id)}
              activeOpacity={0.7}
              style={{ flex: 1 }}
            >
              <Text style={styles.authorName}>{authorLabel}</Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                onPress={handlePressMenu}
                activeOpacity={0.7}
                hitSlop={8}
                style={styles.menuBtn}
              >
                {deleteBusy ? (
                  <ActivityIndicator size={12} color="#94a3b8" />
                ) : (
                  <Ionicons name="ellipsis-horizontal" size={16} color="#94a3b8" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Tag @tên người được reply (chỉ ở reply level) */}
          {isReply && comment.replyTo && comment.replyTo._id !== comment.author?._id && (
            <TouchableOpacity
              onPress={() => goToProfile(comment.replyTo?._id)}
              activeOpacity={0.7}
            >
              <Text style={styles.replyToTag}>
                {"@"}
                {comment.replyTo.name || comment.replyTo.email || "người dùng"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Nội dung: chế độ sửa hoặc hiển thị bình thường */}
          {isEditing ? (
            <View style={styles.editBox}>
              <TextInput
                ref={editInputRef}
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                maxLength={2000}
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.editCancelBtn}
                  onPress={cancelEdit}
                  disabled={editBusy}
                >
                  <Text style={styles.editCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveBtn, editBusy && styles.editSaveBtnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={editBusy || !editText.trim()}
                >
                  {editBusy ? (
                    <ActivityIndicator size={12} color="#fff" />
                  ) : (
                    <Text style={styles.editSaveText}>Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.bodyText}>{comment.content}</Text>
          )}
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Text style={styles.timeText}>{timeAgo(comment.createdAt)}</Text>

          {/* Like */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            disabled={reactBusy}
            activeOpacity={0.7}
          >
            {reactBusy ? (
              <ActivityIndicator size={12} color="#e53935" />
            ) : (
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={14}
                color={isLiked ? "#e53935" : "#777"}
              />
            )}
            {likesCount > 0 && (
              <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>
                {likesCount}
              </Text>
            )}
          </TouchableOpacity>

          {/* Trả lời — hiện ở cả root và reply */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePressReply}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={13} color="#777" />
            <Text style={styles.actionLabel}>Trả lời</Text>
          </TouchableOpacity>
        </View>

        {/* Show/hide replies toggle (chỉ ở root comment) */}
        {!isReply && repliesCount > 0 && (
          <TouchableOpacity
            style={styles.repliesToggle}
            onPress={toggleReplies}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showReplies ? "chevron-up" : "chevron-down"}
              size={13}
              color="#e53935"
            />
            <Text style={styles.repliesToggleText}>
              {showReplies ? "Ẩn" : `Xem ${repliesCount} trả lời`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Replies list — flat, cùng cấp */}
        {showReplies && (
          <View style={styles.repliesList}>
            {loadingReplies && replies.length === 0 ? (
              <ActivityIndicator color="#e53935" style={{ marginVertical: 8 }} />
            ) : (
              <>
                {replies.map((r) => (
                  <CommentItem
                    key={r._id}
                    comment={r}
                    postId={postId}
                    depth={1}
                    onCommentAdded={handleReplyAdded}
                    onRequestReply={onRequestReply}
                  />
                ))}
                {hasMoreReplies && (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={loadMoreReplies}
                    disabled={loadingReplies}
                  >
                    {loadingReplies ? (
                      <ActivityIndicator size="small" color="#e53935" />
                    ) : (
                      <Text style={styles.loadMoreText}>Xem thêm câu trả lời…</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    marginBottom: 12,
  },
  replyWrapper: {
    marginBottom: 8,
  },

  // Avatar column
  avatarCol: {
    alignItems: "center",
    marginRight: 10,
    width: 36,
  },
  avatarFallback: {
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontWeight: "700",
    color: "#e53935",
  },
  threadLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#e2e8f0",
    marginTop: 4,
    borderRadius: 1,
  },

  // Content column
  contentCol: {
    flex: 1,
  },
  bubble: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleReply: {
    backgroundColor: "#fdf4ff",
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  menuBtn: {
    paddingLeft: 6,
    paddingVertical: 2,
  },
  authorName: {
    fontWeight: "700",
    fontSize: 13,
    color: "#1e293b",
  },
  replyToTag: {
    fontSize: 12,
    color: "#e53935",
    fontWeight: "600",
    marginBottom: 3,
  },
  bodyText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginTop: 2,
  },

  // Inline edit
  editBox: {
    marginTop: 6,
  },
  editInput: {
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
    minHeight: 60,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  editCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  editCancelText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  editSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#e53935",
    minWidth: 42,
    alignItems: "center",
  },
  editSaveBtnDisabled: {
    backgroundColor: "#e53935",
  },
  editSaveText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 6,
    gap: 12,
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  actionLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  actionCount: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  actionCountActive: {
    color: "#e53935",
  },

  // Replies toggle
  repliesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    marginLeft: 6,
    paddingVertical: 2,
  },
  repliesToggleText: {
    fontSize: 12,
    color: "#e53935",
    fontWeight: "600",
  },

  // Replies list
  repliesList: {
    marginTop: 8,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#e2e8f0",
  },
  loadMoreBtn: {
    paddingVertical: 6,
    paddingLeft: 6,
  },
  loadMoreText: {
    fontSize: 12,
    color: "#e53935",
    fontWeight: "600",
  },
});

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  ActivityIndicator,
} from "react-native";
import MediaGrid from "./MediaGrid";
import MediaViewerModal from "./MediaViewerModal";
import type { FeedPostUi } from "./mapPost";
import { getToken } from "@/features/auth/utils/storage";
import { useRouter } from "expo-router";
import {
  dislikePost,
  likePost,
  reportPost,
  sharePost,
  toggleHidePost,
  toggleSavePost,
  type ReportReason,
} from "@/features/social/services/postsApi";

const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: "spam", label: "Spam" },
  { key: "inappropriate", label: "Nội dung không phù hợp" },
  { key: "misinformation", label: "Thông tin sai" },
  { key: "harassment", label: "Quấy rối" },
  { key: "violence", label: "Bạo lực" },
  { key: "copyright", label: "Bản quyền" },
  { key: "other", label: "Khác" },
];

type Props = {
  post: FeedPostUi;
  onUpdated: (id: string, patch: Partial<FeedPostUi>) => void;
  onOpenComments: (id: string) => void;
  onHidden?: (id: string) => void;
};

export default function PostCard({ post, onUpdated, onOpenComments, onHidden }: Props) {
  const router = useRouter();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);

  const media = useMemo(() => {
    const result: { type: "image" | "video"; uri: string }[] = [];
    if (post.video) result.push({ type: "video", uri: post.video });
    if (post.images?.length) {
      post.images.forEach((uri) => result.push({ type: "image", uri }));
    }
    return result;
  }, [post]);

  const requireAuth = async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để thực hiện thao tác này.", [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/login") },
      ]);
      return false;
    }
    return true;
  };

  const openViewer = (index: number) => {
    setSelectedIndex(index);
    setViewerVisible(true);
  };

  const handleLike = async () => {
    if (!(await requireAuth())) return;
    setBusy("like");
    try {
      const r = await likePost(post.id);
      onUpdated(post.id, {
        userReaction: (r.userReaction as "like" | "dislike") || null,
        likes: r.likesCount,
        dislikes: r.dislikesCount,
        reputation: r.score,
      });
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể thích bài viết");
    } finally {
      setBusy(null);
    }
  };

  const handleDislike = async () => {
    if (!(await requireAuth())) return;
    setBusy("dislike");
    try {
      const r = await dislikePost(post.id);
      onUpdated(post.id, {
        userReaction: (r.userReaction as "like" | "dislike") || null,
        likes: r.likesCount,
        dislikes: r.dislikesCount,
        reputation: r.score,
      });
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể không thích");
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!(await requireAuth())) return;
    setBusy("save");
    try {
      const r = await toggleSavePost(post.id);
      onUpdated(post.id, { isSaved: r.saved });
      Alert.alert("", r.saved ? "Đã lưu bài viết" : "Đã bỏ lưu");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (!(await requireAuth())) return;
    setBusy("share");
    try {
      const r = await sharePost(post.id);
      onUpdated(post.id, { shares: r.sharesCount });
      await Share.share({
        message: `${post.username}: ${post.content?.slice(0, 200) || "Bài viết SafeLink"}`,
      });
    } catch (e: any) {
      if (e?.message !== "User did not share") Alert.alert("Lỗi", e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleHide = async () => {
    if (!(await requireAuth())) return;
    try {
      await toggleHidePost(post.id);
      onHidden?.(post.id);
      Alert.alert("", "Đã ẩn bài viết khỏi bảng tin của bạn.");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  const submitReport = async (reason: ReportReason) => {
    setReportVisible(false);
    if (!(await requireAuth())) return;
    try {
      await reportPost(post.id, reason);
      Alert.alert("", "Đã gửi báo cáo.");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  const openMenu = () => {
    Alert.alert("Tùy chọn", post.username, [
      { text: "Báo cáo", onPress: () => setReportVisible(true) },
      { text: "Ẩn bài viết", onPress: handleHide },
      { text: "Đóng", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          source={typeof post.avatar === "string" ? { uri: post.avatar } : post.avatar}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{post.username}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.location} numberOfLines={1}>
              📍 {post.location}
            </Text>
            <View style={styles.reputationBadge}>
              <Text style={styles.repText}>⭐ {post.reputation}</Text>
            </View>
            {post.time ? <Text style={styles.time}>{post.time}</Text> : null}
          </View>
        </View>

        <TouchableOpacity onPress={openMenu} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {post.hashtag ? (
        <Text style={styles.hashtagLine}>
          <Text style={styles.hashtag}>{post.hashtag}</Text>
        </Text>
      ) : null}

      <Text style={styles.content}>{post.content}</Text>

      {media.length > 0 && <MediaGrid media={media} onOpen={openViewer} />}

      <View style={styles.stats}>
        <Text style={post.userReaction === "like" ? styles.statActive : undefined}>
          👍 {post.likes}
        </Text>
        <Text style={post.userReaction === "dislike" ? styles.statActive : undefined}>
          👎 {post.dislikes}
        </Text>
        <Text>💬 {post.commentsCount}</Text>
        <Text>🔁 {post.shares}</Text>
        {post.isSaved ? <Text style={styles.saved}>Đã lưu</Text> : null}
      </View>

      <View style={styles.actions}>
        <ActionRow
          icon={post.userReaction === "like" ? "thumbs-up" : "thumbs-up-outline"}
          label="Thích"
          onPress={handleLike}
          loading={busy === "like"}
        />
        <ActionRow
          icon={post.userReaction === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
          label="Không thích"
          onPress={handleDislike}
          loading={busy === "dislike"}
        />
        <ActionRow
          icon="chatbubble-outline"
          label="Bình luận"
          onPress={async () => {
            if (!(await requireAuth())) return;
            onOpenComments(post.id);
          }}
        />
        <ActionRow
          icon={post.isSaved ? "bookmark" : "bookmark-outline"}
          label="Lưu"
          onPress={handleSave}
          loading={busy === "save"}
        />
        <ActionRow icon="share-social-outline" label="Chia sẻ" onPress={handleShare} loading={busy === "share"} />
      </View>

      <MediaViewerModal
        visible={viewerVisible}
        media={media}
        index={selectedIndex}
        onClose={() => setViewerVisible(false)}
      />

      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReportVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Chọn lý do báo cáo</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {REPORT_REASONS.map((r) => (
                <TouchableOpacity key={r.key} style={styles.modalRow} onPress={() => submitReport(r.key)}>
                  <Text style={styles.modalRowText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setReportVisible(false)}>
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator size="small" color="#444" /> : <Ionicons name={icon} size={18} color="#444" />}
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    marginVertical: 10,
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  username: {
    fontWeight: "700",
    fontSize: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  location: {
    fontSize: 12,
    color: "#777",
    maxWidth: "55%",
  },
  time: {
    fontSize: 11,
    color: "#999",
  },
  reputationBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  repText: {
    fontSize: 11,
    color: "#4f46e5",
    fontWeight: "600",
  },
  hashtagLine: {
    marginBottom: 4,
  },
  hashtag: {
    color: "#4f46e5",
    fontWeight: "600",
    fontSize: 13,
  },
  content: {
    marginVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  statActive: {
    fontWeight: "700",
    color: "#1877f2",
  },
  saved: {
    color: "#e6a700",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 10,
    gap: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: "18%",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 11,
    color: "#444",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  modalRowText: {
    fontSize: 15,
    color: "#222",
  },
  modalCancel: {
    marginTop: 8,
    padding: 16,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#1877f2",
    fontWeight: "600",
    fontSize: 16,
  },
});

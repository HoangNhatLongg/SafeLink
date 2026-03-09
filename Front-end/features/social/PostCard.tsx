import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MediaGrid from "./MediaGrid";
import MediaViewerModal from "./MediaViewerModal";

export default function PostCard({ post }: any) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  

  const media = useMemo(() => {
    const result: any[] = [];

    if (post.video) {
      result.push({
        type: "video",
        uri: post.video,
      });
    }

    if (post.images?.length) {
      post.images.forEach((img: any) => {
        result.push({
          type: "image",
          uri: img,
        });
      });
    }

    return result;
  }, [post]);

  const openViewer = (index: number) => {
    setSelectedIndex(index);
    setViewerVisible(true);
  };

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={
            typeof post.avatar === "string"
              ? { uri: post.avatar }
              : post.avatar
          }
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{post.username}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.location}>📍 {post.location}</Text>
            <View style={styles.reputationBadge}>
              <Text style={styles.repText}>⭐ {post.reputation}</Text>
            </View>
          </View>
        </View>

        <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
      </View>

      {/* TITLE */}
      <Text style={styles.title}>
        {post.title}{" "}
        <Text style={styles.hashtag}>#{post.hashtag}</Text>
      </Text>

      {/* CONTENT */}
      <Text style={styles.content}>{post.content}</Text>

      {/* MEDIA GRID */}
      {media.length > 0 && (
        <MediaGrid media={media} onOpen={openViewer} />
      )}

      {/* STATS */}
      <View style={styles.stats}>
        <Text>👍 {post.likes}</Text>
        <Text>👎 {post.dislikes}</Text>
        <Text>💬 {post.commentsCount}</Text>
        <Text>🔁 {post.shares}</Text>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <ActionButton icon="thumbs-up-outline" label="Like" />
        <ActionButton icon="thumbs-down-outline" label="Dislike" />
        <ActionButton icon="chatbubble-outline" label="Bình luận" />
        <ActionButton icon="share-social-outline" label="Chia sẻ" />
      </View>

      {/* MEDIA VIEWER MODAL */}
      <MediaViewerModal
        visible={viewerVisible}
        media={media}
        index={selectedIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

function ActionButton({ icon, label }: any) {
  return (
    <TouchableOpacity style={styles.actionBtn}>
      <Ionicons name={icon} size={18} color="#444" />
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
    gap: 6,
  },
  location: {
    fontSize: 12,
    color: "#777",
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
  title: {
    fontWeight: "600",
    fontSize: 15,
    marginTop: 6,
  },
  hashtag: {
    color: "#4f46e5",
  },
  content: {
    marginVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    color: "#444",
  },
});
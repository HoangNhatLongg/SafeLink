import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { SkillSummary } from "./types";
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from "./types";
import { isSkillSaved, saveSkill, removeSkill } from "./skillsOfflineStorage";

interface Props {
  item: SkillSummary;
}

export default function SkillCard({ item }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);

  // Kiểm tra trạng thái đã lưu khi mount
  useEffect(() => {
    isSkillSaved(item._id).then(setSaved);
  }, [item._id]);

  const handleBookmark = useCallback(async () => {
    if (savingInProgress) return;
    setSavingInProgress(true);
    try {
      if (saved) {
        await removeSkill(item._id);
        setSaved(false);
      } else {
        // Cần full Skill (với steps + ảnh) để lưu offline đầy đủ
        // → Fetch chi tiết trước khi lưu
        const { fetchSkillDetail } = await import("./skillsApi");
        const res = await fetchSkillDetail(item._id);
        await saveSkill(res.data);
        setSaved(true);
      }
    } catch {
      // Nếu fetch thất bại → báo user vào màn detail để lưu
      Alert.alert(
        "Không thể lưu offline",
        "Mở chi tiết kỹ năng và nhấn 'Lưu offline' để tải về thiết bị."
      );
    } finally {
      setSavingInProgress(false);
    }
  }, [saved, item._id, savingInProgress]);

  const difficultyColor = DIFFICULTY_COLORS[item.difficulty] ?? "#888";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/skill/${item._id}`)}
    >
      {/* Ảnh bìa */}
      <View style={styles.imageContainer}>
        {item.coverImage?.url ? (
          <Image source={{ uri: item.coverImage.url }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverPlaceholder]}>
            <Text style={styles.categoryEmoji}>
              {CATEGORY_ICONS[item.category] ?? "📋"}
            </Text>
          </View>
        )}
        {/* Badge danh mục */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
          </Text>
        </View>
        {/* Nút bookmark */}
        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={handleBookmark}
          disabled={savingInProgress}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? "#e53935" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* Nội dung */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {item.summary}
          </Text>
        ) : null}

        {/* Footer: độ khó + lượt xem */}
        <View style={styles.footer}>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + "22" }]}>
            <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
            <Text style={[styles.difficultyText, { color: difficultyColor }]}>
              {DIFFICULTY_LABELS[item.difficulty]}
            </Text>
          </View>
          <View style={styles.viewRow}>
            <Ionicons name="eye-outline" size={12} color="#aaa" />
            <Text style={styles.viewCount}>{item.viewCount ?? 0}</Text>
          </View>
        </View>

        {/* Thời gian ước tính */}
        {item.duration ? (
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={12} color="#888" />
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
    height: 130,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 42,
  },
  categoryBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  bookmarkBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    padding: 6,
  },
  content: {
    padding: 10,
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: 18,
  },
  summary: {
    fontSize: 11,
    color: "#666",
    lineHeight: 15,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "600",
  },
  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewCount: {
    fontSize: 11,
    color: "#aaa",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  durationText: {
    fontSize: 11,
    color: "#888",
  },
});

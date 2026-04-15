import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import {
  getSavedSkills,
  removeSkill,
  clearAllSavedSkills,
} from "@/features/skills/skillsOfflineStorage";
import type { Skill } from "@/features/skills/types";
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from "@/features/skills/types";

export default function SavedSkillsScreen() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);

  // Load lại mỗi khi focus vào trang
  useFocusEffect(
    useCallback(() => {
      getSavedSkills().then(setSkills);
    }, [])
  );

  const handleRemove = useCallback(
    (id: string, title: string) => {
      Alert.alert("Xóa kỹ năng", `Xóa "${title}" khỏi bộ nhớ offline?`, [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await removeSkill(id);
            setSkills((prev) => prev.filter((s) => s._id !== id));
          },
        },
      ]);
    },
    []
  );

  const handleClearAll = useCallback(() => {
    if (skills.length === 0) return;
    Alert.alert(
      "Xóa tất cả",
      `Xóa toàn bộ ${skills.length} kỹ năng đã lưu offline? Hành động này không thể hoàn tác.`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: async () => {
            await clearAllSavedSkills();
            setSkills([]);
          },
        },
      ]
    );
  }, [skills.length]);

  const renderItem = useCallback(
    ({ item }: { item: Skill }) => {
      const diffColor = DIFFICULTY_COLORS[item.difficulty] ?? "#888";
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => router.push(`/skill/${item._id}`)}
        >
          {/* Ảnh bìa nhỏ */}
          <View style={styles.cardLeft}>
            {item.coverImage?.url ? (
              <Image source={{ uri: item.coverImage.url }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Text style={styles.thumbEmoji}>
                  {CATEGORY_ICONS[item.category] ?? "📋"}
                </Text>
              </View>
            )}
          </View>

          {/* Thông tin */}
          <View style={styles.cardCenter}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.cardMeta}>
              <Text style={styles.categoryLabel}>
                {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
              </Text>
              <View style={[styles.diffBadge, { backgroundColor: diffColor + "22" }]}>
                <Text style={[styles.diffText, { color: diffColor }]}>
                  {DIFFICULTY_LABELS[item.difficulty]}
                </Text>
              </View>
            </View>
            <Text style={styles.stepsInfo}>
              {item.steps?.length ?? 0} bước · {item.duration || "—"}
            </Text>
          </View>

          {/* Nút xóa */}
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemove(item._id, item.title)}
          >
            <Ionicons name="trash-outline" size={18} color="#e53935" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [router, handleRemove]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kỹ Năng Đã Lưu</Text>
        {skills.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Xóa tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Thông báo offline */}
      <View style={styles.infoBanner}>
        <Ionicons name="cloud-done-outline" size={16} color="#4CAF50" />
        <Text style={styles.infoBannerText}>
          Các kỹ năng này đã được lưu kèm ảnh minh họa — xem offline bất kỳ lúc nào.
        </Text>
      </View>

      <FlatList
        data={skills}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📥</Text>
            <Text style={styles.emptyText}>Chưa lưu kỹ năng nào</Text>
            <Text style={styles.emptyHint}>
              Mở chi tiết kỹ năng và nhấn "Lưu offline" để tải về thiết bị.
            </Text>
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.goBtnText}>Khám phá kỹ năng</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  clearBtnText: { fontSize: 13, color: "#e53935", fontWeight: "600" },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoBannerText: { fontSize: 12, color: "#2E7D32", flex: 1 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  cardLeft: {},
  thumb: { width: 70, height: 70, borderRadius: 10, resizeMode: "cover" },
  thumbPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 28 },
  cardCenter: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a2e", lineHeight: 19 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  categoryLabel: { fontSize: 11, color: "#666" },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 10, fontWeight: "600" },
  stepsInfo: { fontSize: 11, color: "#aaa" },
  removeBtn: { padding: 8 },

  empty: { alignItems: "center", paddingVertical: 80, paddingHorizontal: 32, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#555" },
  emptyHint: { fontSize: 13, color: "#999", textAlign: "center" },
  goBtn: {
    marginTop: 12,
    backgroundColor: "#e53935",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  goBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

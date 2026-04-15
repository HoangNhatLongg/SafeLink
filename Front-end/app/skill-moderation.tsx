import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { fetchPendingSkills, reviewSkill } from "@/features/skills/skillsApi";
import type { Skill } from "@/features/skills/types";
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from "@/features/skills/types";

export default function SkillModerationScreen() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchPendingSkills();
      setSkills(res.data);
    } catch {
      Alert.alert("Lỗi", "Không tải được danh sách chờ duyệt.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Duyệt / Từ chối ──────────────────────────────────
  const handleApprove = useCallback(
    (id: string, title: string) => {
      Alert.alert("Duyệt kỹ năng", `Duyệt "${title}" và hiển thị công khai?`, [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            setProcessing(id);
            try {
              await reviewSkill(id, "approve");
              setSkills((prev) => prev.filter((s) => s._id !== id));
              Alert.alert("Thành công", "Đã duyệt kỹ năng.");
            } catch {
              Alert.alert("Lỗi", "Không thể duyệt.");
            } finally {
              setProcessing(null);
            }
          },
        },
      ]);
    },
    []
  );

  const handleReject = useCallback(
    (id: string, title: string) => {
      Alert.prompt(
        "Từ chối kỹ năng",
        `Nhập lý do từ chối "${title}":`,
        [
          { text: "Huỷ", style: "cancel" },
          {
            text: "Từ chối",
            style: "destructive",
            onPress: async (reason?: string) => {
              if (!reason?.trim()) {
                Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối.");
                return;
              }
              setProcessing(id);
              try {
                await reviewSkill(id, "reject", reason.trim());
                setSkills((prev) => prev.filter((s) => s._id !== id));
                Alert.alert("Đã từ chối", "Kỹ năng đã bị từ chối.");
              } catch {
                Alert.alert("Lỗi", "Không thể từ chối.");
              } finally {
                setProcessing(null);
              }
            },
          },
        ],
        "plain-text"
      );
    },
    []
  );

  // ── Render item ────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: Skill }) => {
      const isExpanded = expandedId === item._id;
      const isProcessingThis = processing === item._id;
      const diffColor = DIFFICULTY_COLORS[item.difficulty] ?? "#888";

      return (
        <View style={styles.card}>
          {/* Header — tap để expand */}
          <TouchableOpacity
            style={styles.cardHeader}
            activeOpacity={0.7}
            onPress={() => setExpandedId(isExpanded ? null : item._id)}
          >
            {/* Ảnh bìa nhỏ */}
            {item.coverImage?.url ? (
              <Image source={{ uri: item.coverImage.url }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Text style={styles.thumbEmoji}>
                  {CATEGORY_ICONS[item.category] ?? "📋"}
                </Text>
              </View>
            )}

            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={styles.catLabel}>
                  {CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
                </Text>
                <View style={[styles.diffBadge, { backgroundColor: diffColor + "22" }]}>
                  <Text style={[styles.diffBadgeText, { color: diffColor }]}>
                    {DIFFICULTY_LABELS[item.difficulty]}
                  </Text>
                </View>
              </View>
              <Text style={styles.submitter}>
                👤 {item.submittedBy?.name ?? "Ẩn danh"} · {item.steps?.length ?? 0} bước
              </Text>
            </View>

            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="#999"
            />
          </TouchableOpacity>

          {/* Expanded content */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              {item.summary && (
                <Text style={styles.summaryText}>{item.summary}</Text>
              )}

              {/* Các bước */}
              {item.steps?.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{step.order}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepContent} numberOfLines={3}>
                      {step.content}
                    </Text>
                    {step.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepImgs}>
                        {step.images.map((img, i) => (
                          <Image key={i} source={{ uri: img.url }} style={styles.stepImgThumb} />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>
              ))}

              {/* Video */}
              {item.videoUrl && (
                <Text style={styles.videoUrl}>🎬 Video: {item.videoUrl}</Text>
              )}

              {/* Nút duyệt / từ chối */}
              <View style={styles.actionsRow}>
                {isProcessingThis ? (
                  <ActivityIndicator size="small" color="#e53935" />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(item._id, item.title)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.approveBtnText}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(item._id, item.title)}
                    >
                      <Ionicons name="close-circle" size={18} color="#e53935" />
                      <Text style={styles.rejectBtnText}>Từ chối</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      );
    },
    [expandedId, processing, handleApprove, handleReject]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyệt Kỹ Năng</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{skills.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={skills}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={styles.emptyText}>Không có kỹ năng nào chờ duyệt</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },

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
  countBadge: {
    backgroundColor: "#e53935",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, resizeMode: "cover" },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 24 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a2e", lineHeight: 19 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  catLabel: { fontSize: 11, color: "#666" },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  diffBadgeText: { fontSize: 10, fontWeight: "600" },
  submitter: { fontSize: 11, color: "#aaa" },

  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },
  summaryText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
    marginTop: 8,
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
  },
  stepRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e53935",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: "600", color: "#333" },
  stepContent: { fontSize: 12, color: "#666", lineHeight: 17 },
  stepImgs: { marginTop: 6 },
  stepImgThumb: { width: 80, height: 60, borderRadius: 8, marginRight: 6 },
  videoUrl: { fontSize: 12, color: "#1976D2", marginTop: 4 },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#e53935",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rejectBtnText: { color: "#e53935", fontWeight: "700", fontSize: 13 },

  empty: { alignItems: "center", paddingVertical: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#555" },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import SkillCard from "@/features/skills/SkillCard";
import ContributeSkillModal from "@/features/skills/ContributeSkillModal";
import { fetchSkills } from "@/features/skills/skillsApi";
import {
  cacheSkillsList,
  getCachedSkillsList,
} from "@/features/skills/skillsOfflineStorage";
import type { SkillSummary, SkillCategory } from "@/features/skills/types";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/features/skills/types";
import { getToken } from "@/features/auth/utils/storage";

const ALL_CATEGORIES: (SkillCategory | "")[] = [
  "",
  "so_cap_cuu",
  "pccc",
  "thien_tai",
  "an_toan_dien",
  "tai_nan",
  "tam_ly",
  "khac",
];

export default function SkillsScreen() {
  const router = useRouter();

  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | "">("");
  const [contributeVisible, setContributeVisible] = useState(false);

  // ── Load data ──────────────────────────────────────────
  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await fetchSkills({
          category: selectedCategory || undefined,
          search: search.trim() || undefined,
          limit: 50,
        });
        setSkills(result.data);
        setIsOffline(false);
        // Cache cho offline
        if (!selectedCategory && !search.trim()) {
          cacheSkillsList(result.data);
        }
      } catch {
        // Offline — thử cache
        const cache = await getCachedSkillsList();
        if (cache && cache.items.length > 0) {
          setSkills(cache.items);
          setIsOffline(true);
        } else {
          setSkills([]);
          setIsOffline(true);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 400);
    return () => clearTimeout(timer);
  }, [loadData]);

  // ── Client-side filter offline ──────────────────────────
  const filteredSkills = useMemo(() => {
    if (!isOffline) return skills; // Server đã filter

    let result = skills;
    if (selectedCategory) {
      result = result.filter((s) => s.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.summary?.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [skills, selectedCategory, search, isOffline]);

  // ── Kiểm tra đăng nhập trước khi đóng góp ─────────────
  const handleContribute = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Để đóng góp kỹ năng, bạn cần đăng nhập trước.",
        [
          { text: "Huỷ", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/login") },
        ]
      );
      return;
    }
    setContributeVisible(true);
  }, [router]);

  // ── Render ─────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: SkillSummary }) => <SkillCard item={item} />,
    []
  );

  const keyExtractor = useCallback((item: SkillSummary) => item._id, []);

  const listHeader = useMemo(
    () => (
      <>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#aaa" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm kiếm kỹ năng..."
              placeholderTextColor="#bbb"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {ALL_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat || "all"}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat ? `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}` : "📖 Tất cả"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Kết quả */}
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {filteredSkills.length} kỹ năng
            {selectedCategory ? ` · ${CATEGORY_LABELS[selectedCategory]}` : ""}
          </Text>
        </View>
      </>
    ),
    [search, selectedCategory, filteredSkills.length]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>📚 Thư Viện Kỹ Năng</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.savedBtn}
            onPress={() => router.push("/saved-skills")}
          >
            <Ionicons name="bookmark" size={16} color="#e53935" />
            <Text style={styles.savedBtnText}>Đã lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contributeBtn} onPress={handleContribute}>
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.contributeBtnText}>Đóng góp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>
            Không có kết nối — đang hiển thị dữ liệu đã lưu
          </Text>
        </View>
      )}

      {/* Content */}
      {loading && skills.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Đang tải kỹ năng...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSkills}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={styles.emptyText}>Chưa có kỹ năng nào</Text>
              <Text style={styles.emptyHint}>
                {search || selectedCategory
                  ? "Thử thay đổi bộ lọc hoặc từ khóa"
                  : "Hãy là người đầu tiên đóng góp kỹ năng!"}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Contribute Modal */}
      <ContributeSkillModal
        visible={contributeVisible}
        onClose={() => {
          setContributeVisible(false);
          loadData(true); // Refresh sau khi đóng góp
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  savedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#e53935",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  savedBtnText: { color: "#e53935", fontWeight: "600", fontSize: 13 },
  contributeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#e53935",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  contributeBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F57C00",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineBannerText: { color: "#fff", fontSize: 12, flex: 1 },

  searchRow: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },

  chipsContainer: { paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 2,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
  },
  chipActive: { backgroundColor: "#fce4ec", borderColor: "#e53935" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#666" },
  chipTextActive: { color: "#e53935", fontWeight: "700" },

  resultRow: { paddingHorizontal: 14, paddingVertical: 6 },
  resultText: { fontSize: 13, color: "#888", fontWeight: "500" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#555", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#999", marginTop: 6, textAlign: "center" },
});
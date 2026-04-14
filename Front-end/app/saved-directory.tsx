import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Agency } from "@/features/emergency/types";
import { AGENCY_TYPE_COLORS, AGENCY_TYPE_ICONS, AGENCY_TYPE_LABELS } from "@/features/emergency/types";
import {
  getSavedAgencies,
  removeAgency,
  clearAllSavedAgencies,
} from "@/features/emergency/offlineStorage";
import AgencyCard from "@/features/emergency/AgencyCard";

export default function SavedDirectoryScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState<Agency[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const items = await getSavedAgencies();
    setSaved(items);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (item: Agency) => {
    Alert.alert(
      "Xoá khỏi danh sách lưu",
      `Bạn muốn xóa "${item.name}"?`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: async () => {
            await removeAgency(item._id ?? item.name);
            setSaved((prev) => prev.filter((a) => a._id !== item._id && a.name !== item.name));
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (saved.length === 0) return;
    Alert.alert(
      "Xoá tất cả",
      "Xoá toàn bộ danh bạ đã lưu? Không thể hoàn tác.",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá hết",
          style: "destructive",
          onPress: async () => {
            await clearAllSavedAgencies();
            setSaved([]);
          },
        },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: Agency }) => (
    <View>
      <AgencyCard item={item} />
      {/* Nút xoá riêng biệt bên dưới mỗi card */}
      <TouchableOpacity
        style={styles.deleteRow}
        onPress={() => handleDelete(item)}
      >
        <Ionicons name="trash-outline" size={15} color="#c62828" />
        <Text style={styles.deleteText}>Xoá khỏi danh sách lưu</Text>
      </TouchableOpacity>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>🔖 Danh bạ đã lưu</Text>
        <TouchableOpacity onPress={handleClearAll} disabled={saved.length === 0}>
          <Text style={[styles.clearAll, saved.length === 0 && { opacity: 0.3 }]}>
            Xoá hết
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#1565C0" />
        <Text style={styles.infoText}>
          Danh bạ đã lưu có thể xem được khi không có kết nối mạng.
        </Text>
      </View>

      <FlatList
        data={saved}
        keyExtractor={(item) => item._id ?? item.name}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={56} color="#ddd" />
            <Text style={styles.emptyTitle}>Chưa có danh bạ nào được lưu</Text>
            <Text style={styles.emptyHint}>
              Ấn vào biểu tượng 🔖 trên mỗi đơn vị trong tab Danh Bạ để lưu lại.
            </Text>
            <TouchableOpacity
              style={styles.goBackBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={16} color="#fff" />
              <Text style={styles.goBackText}>Về trang Danh Bạ</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  clearAll: { fontSize: 14, color: "#e53935", fontWeight: "600" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#c5d9fc",
  },
  infoText: { flex: 1, fontSize: 12, color: "#1565C0", lineHeight: 17 },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginTop: -4,
  },
  deleteText: { fontSize: 13, color: "#c62828" },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#555",
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  goBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    backgroundColor: "#e53935",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goBackText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fetchPendingDirectory, reviewDirectoryItem } from "@/features/emergency/directoryApi";
import type { Agency } from "@/features/emergency/types";
import { AGENCY_TYPE_COLORS, AGENCY_TYPE_ICONS, AGENCY_TYPE_LABELS } from "@/features/emergency/types";

export default function DirectoryModerationScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { items: data } = await fetchPendingDirectory();
      setItems(data);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReview = (item: Agency, action: "approve" | "reject") => {
    const msg = action === "approve"
      ? `Duyệt và hiển thị công khai "${item.name}"?`
      : `Từ chối đóng góp "${item.name}"?`;

    Alert.alert(action === "approve" ? "Duyệt đóng góp" : "Từ chối", msg, [
      { text: "Huỷ", style: "cancel" },
      {
        text: action === "approve" ? "Duyệt" : "Từ chối",
        style: action === "reject" ? "destructive" : "default",
        onPress: async () => {
          try {
            await reviewDirectoryItem(item._id, action);
            setItems((prev) => prev.filter((x) => x._id !== item._id));
          } catch (e: any) {
            Alert.alert("Lỗi", e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Duyệt đóng góp danh bạ</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e53935" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>✅</Text>
              <Text style={{ fontSize: 15, color: "#555", marginTop: 12 }}>Không có đóng góp nào chờ duyệt</Text>
            </View>
          }
          renderItem={({ item }) => {
            const color = AGENCY_TYPE_COLORS[item.type] ?? "#616161";
            return (
              <View style={styles.card}>
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeText}>{AGENCY_TYPE_ICONS[item.type]} {AGENCY_TYPE_LABELS[item.type]}</Text>
                </View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>📞 {item.phone}</Text>
                <Text style={styles.meta}>📍 {item.address}</Text>
                <Text style={styles.meta}>🗺 {[item.ward, item.district, item.province].filter(Boolean).join(", ")}</Text>
                <Text style={styles.meta}>🌐 {item.lat}, {item.lng}</Text>
                {item.note ? <Text style={styles.note}>📝 {item.note}</Text> : null}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReview(item, "reject")}
                  >
                    <Ionicons name="close" size={16} color="#c62828" />
                    <Text style={styles.rejectBtnText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleReview(item, "approve")}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Duyệt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.05, shadowRadius: 6,
  },
  badge: {
    alignSelf: "flex-start", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  meta: { fontSize: 13, color: "#555", marginBottom: 4 },
  note: { fontSize: 12, color: "#888", marginTop: 4, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  rejectBtn: { backgroundColor: "#ffebee", borderWidth: 1, borderColor: "#ef9a9a" },
  rejectBtnText: { color: "#c62828", fontWeight: "700" },
  approveBtn: { backgroundColor: "#388e3c" },
  approveBtnText: { color: "#fff", fontWeight: "700" },
});

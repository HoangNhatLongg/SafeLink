import { fetchMe } from "@/features/user/services/userApi";
import { fetchReports, patchReport } from "@/features/moderation/moderationApi";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ModerationScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { user } = await fetchMe();
      if (!["moderator", "admin"].includes(user.role || "")) {
        setAllowed(false);
        setReports([]);
        return;
      }
      setAllowed(true);
      const { reports: r } = await fetchReports("pending", 1, 40);
      setReports(r || []);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, status: "dismissed" | "actioned", flagPost?: boolean) => {
    try {
      await patchReport(id, { status, flagPost });
      setReports((prev) => prev.filter((x) => x._id !== id));
      Alert.alert("", "Đã cập nhật.");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1877f2" />
      </SafeAreaView>
    );
  }

  if (!allowed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.denied}>Chỉ moderator / admin mới xem được trang này.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>Không có báo cáo chờ xử lý.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.reason}>Lý do: {item.reason}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.meta}>
              Bài: {item.post?._id || item.post} — Người báo: {item.reporter?.email || "?"}
            </Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => act(item._id, "dismissed")}>
                <Text style={styles.smallBtnText}>Bỏ qua</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, styles.warn]}
                onPress={() => act(item._id, "actioned", true)}
              >
                <Text style={styles.smallBtnText}>Xử lý + gắn cờ bài</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f3f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  denied: { textAlign: "center", color: "#666", marginBottom: 16 },
  link: { color: "#1877f2", fontWeight: "600" },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  reason: { fontWeight: "700", marginBottom: 6 },
  desc: { color: "#444", marginBottom: 8 },
  meta: { fontSize: 12, color: "#888", marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallBtn: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warn: { backgroundColor: "#ffcc80" },
  smallBtnText: { fontWeight: "600", fontSize: 13 },
});

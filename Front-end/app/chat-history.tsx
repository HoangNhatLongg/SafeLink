import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMyConnections, updateConnectionStatus, type SOSConnection } from "@/features/chat/chatApi";
import { getUserJson, type StoredUser } from "@/features/auth/utils/storage";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export default function ChatHistoryScreen() {
  const router = useRouter();
  const [connections, setConnections] = useState<SOSConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  const loadData = async () => {
    try {
      const user = await getUserJson();
      setCurrentUser(user);
      const res = await getMyConnections();
      setConnections(res.connections || []);
    } catch (e: any) {
      console.warn("Lỗi tải danh sách chat:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleAction = async (id: string, action: "accepted" | "rejected") => {
    try {
      await updateConnectionStatus(id, action);
      Alert.alert("Thành công", `Đã ${action === "accepted" ? "chấp nhận" : "từ chối"} yêu cầu.`);
      loadData();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể thực hiện.");
    }
  };

  const renderItem = ({ item }: { item: SOSConnection }) => {
    const isSender = currentUser?.id === item.senderId?._id;
    const otherUser = isSender ? item.helperId : item.senderId;

    let statusText = "";
    let statusColor = "#666";
    if (item.status === "pending") {
      statusText = "Đang chờ duyệt";
      statusColor = "#FF9500";
    } else if (item.status === "accepted") {
      statusText = "Đang hỗ trợ";
      statusColor = "#34C759";
    } else if (item.status === "rejected") {
      statusText = "Đã từ chối";
      statusColor = "#FF3B30";
    } else {
      statusText = "Đã kết thúc";
      statusColor = "#8E8E93";
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (item.status === "accepted") {
            router.push(`/chat/${item._id}`);
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={40} color="#ccc" />
            <View style={styles.userText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Text style={styles.userName}>{otherUser?.name || "Người dùng"}</Text>
                {otherUser?.isVolunteer && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 2 }}>
                    <Ionicons name="shield-checkmark" size={12} color="#1565C0" />
                    <Text style={{ fontSize: 10, color: '#1565C0', fontWeight: '700', marginLeft: 2 }}>Đội Hỗ Trợ</Text>
                  </View>
                )}
              </View>
              <Text style={styles.roleText}>{isSender ? "Người muốn hỗ trợ bạn" : "Người bạn đang hỗ trợ"}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {item.sosId && (
          <View style={styles.sosInfo}>
            <Ionicons name="warning" size={14} color="#FF3B30" />
            <Text style={styles.sosText} numberOfLines={1}>
              SOS: {item.sosId.sosCategory || "Khẩn cấp"}
            </Text>
          </View>
        )}

        {isSender && item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnReject]}
              onPress={() => handleAction(item._id, "rejected")}
            >
              <Text style={styles.btnTextReject}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnAccept]}
              onPress={() => handleAction(item._id, "accepted")}
            >
              <Text style={styles.btnTextAccept}>Chấp nhận</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.timeText}>{dayjs(item.createdAt).fromNow()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hỗ trợ SOS</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF3B30" />
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f3f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  userText: { marginLeft: 10, flex: 1 },
  userName: { fontSize: 16, fontWeight: "600", color: "#222" },
  roleText: { fontSize: 13, color: "#666", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "700" },
  sosInfo: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f9f9", padding: 8, borderRadius: 8, marginBottom: 12 },
  sosText: { fontSize: 13, color: "#444", marginLeft: 6 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  btnReject: { backgroundColor: "#FFE0E0" },
  btnTextReject: { color: "#FF3B30", fontWeight: "600" },
  btnAccept: { backgroundColor: "#34C759" },
  btnTextAccept: { color: "#fff", fontWeight: "600" },
  timeText: { fontSize: 12, color: "#999", textAlign: "right" },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#888", marginTop: 10, fontSize: 15 },
});

import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { fetchPendingVolunteers, reviewVolunteer } from "@/features/emergency/volunteerApi";
import {
  ENTITY_KIND_LABELS,
  VOLUNTEER_TYPE_COLORS,
  VOLUNTEER_TYPE_ICONS,
  VOLUNTEER_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
  type VolunteerUnit,
} from "@/features/emergency/volunteerTypes";

export default function VolunteerModerationScreen() {
  const router = useRouter();
  const [items, setItems] = useState<VolunteerUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { items: data } = await fetchPendingVolunteers();
      setItems(data);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleReview = (item: VolunteerUnit, action: "approve" | "reject") => {
    if (action === "reject") {
      Alert.prompt(
        "Lý do từ chối",
        "Nhập lý do từ chối đơn đăng ký này:",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Từ chối",
            style: "destructive",
            onPress: async (reason) => {
              await doReview(item._id, "reject", reason || "");
            },
          },
        ],
        "plain-text"
      );
    } else {
      Alert.alert(
        "Xác nhận duyệt",
        `Duyệt đơn đăng ký của "${item.unitName}"?\nĐơn vị này sẽ hiển thị công khai trong Danh Bạ.`,
        [
          { text: "Hủy", style: "cancel" },
          { text: "Duyệt", onPress: () => doReview(item._id, "approve") },
        ]
      );
    }
  };

  const doReview = async (id: string, action: "approve" | "reject", reason?: string) => {
    try {
      setReviewingId(id);
      await reviewVolunteer(id, action, reason);
      setItems((prev) => prev.filter((i) => i._id !== id));
      Alert.alert("Thành công", action === "approve" ? "Đã duyệt đơn đăng ký." : "Đã từ chối đơn đăng ký.");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setReviewingId(null);
    }
  };

  const renderItem = ({ item }: { item: VolunteerUnit }) => {
    const isExpanded = expandedId === item._id;
    const typeColor = VOLUNTEER_TYPE_COLORS[item.unitType];
    const isReviewing = reviewingId === item._id;

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : item._id)}
          activeOpacity={0.8}
        >
          <View style={[styles.typeIcon, { backgroundColor: typeColor + "22" }]}>
            <Text style={styles.typeIconEmoji}>{VOLUNTEER_TYPE_ICONS[item.unitType]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.unitName} numberOfLines={1}>{item.unitName}</Text>
            <Text style={styles.unitMeta}>
              {VOLUNTEER_TYPE_LABELS[item.unitType]} · {ENTITY_KIND_LABELS[item.entityKind]}
            </Text>
            <Text style={styles.unitSub} numberOfLines={1}>
              📍 {item.province}{item.district ? ` · ${item.district}` : ""}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#999"
          />
        </TouchableOpacity>

        {/* Expanded Detail */}
        {isExpanded && (
          <View style={styles.cardDetail}>
            {/* Submitter */}
            {item.submittedBy && (
              <InfoRow icon="person-outline" label="Người đăng ký">
                {item.submittedBy.name} ({item.submittedBy.email})
              </InfoRow>
            )}
            <InfoRow icon="call-outline" label="Liên hệ">
              {item.contactName} · {item.phone}
            </InfoRow>
            <InfoRow icon="location-outline" label="Địa chỉ">
              {item.address}
              {item.ward ? `, ${item.ward}` : ""}
              {item.district ? `, ${item.district}` : ""}
              {`, ${item.province}`}
            </InfoRow>
            <InfoRow icon="navigate-circle-outline" label="GPS">
              {item.lat}, {item.lng}
            </InfoRow>
            <InfoRow icon="cash-outline" label="Loại dịch vụ">
              {SERVICE_TYPE_LABELS[item.serviceType]}
              {item.priceNote ? ` - ${item.priceNote}` : ""}
            </InfoRow>
            {item.description && (
              <InfoRow icon="document-text-outline" label="Mô tả">
                {item.description}
              </InfoRow>
            )}
            {item.serviceArea && (
              <InfoRow icon="map-outline" label="Phạm vi hoạt động">
                {item.serviceArea}
              </InfoRow>
            )}
            {item.availableTime && (
              <InfoRow icon="time-outline" label="Thời gian">
                {item.availableTime}
              </InfoRow>
            )}
            {item.note && (
              <InfoRow icon="chatbubble-outline" label="Ghi chú">
                {item.note}
              </InfoRow>
            )}
            {/* Ảnh xác minh */}
            {item.verificationImages && item.verificationImages.length > 0 && (
              <View style={styles.imagesSection}>
                <Text style={styles.imagesLabel}>
                  <Ionicons name="images-outline" size={14} /> Ảnh xác minh ({item.verificationImages.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                  {item.verificationImages.map((img, i) => (
                    <Image key={i} source={{ uri: img.url }} style={styles.verifyImg} />
                  ))}
                </ScrollView>
              </View>
            )}
            {/* Ngày nộp */}
            {item.createdAt && (
              <Text style={styles.dateText}>
                Nộp lúc: {new Date(item.createdAt).toLocaleString("vi-VN")}
              </Text>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, isReviewing && { opacity: 0.6 }]}
                disabled={isReviewing}
                onPress={() => handleReview(item, "reject")}
              >
                {isReviewing ? (
                  <ActivityIndicator size="small" color="#e53935" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#e53935" />
                    <Text style={styles.rejectBtnText}>Từ chối</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, isReviewing && { opacity: 0.6 }]}
                disabled={isReviewing}
                onPress={() => handleReview(item, "approve")}
              >
                {isReviewing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>Duyệt</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Duyệt Đội Cứu Hộ</Text>
          <Text style={styles.topBarSub}>
            {items.length > 0 ? `${items.length} đơn chờ xét duyệt` : "Không có đơn nào"}
          </Text>
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color="#e53935" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={styles.emptyText}>Không có đơn nào đang chờ duyệt</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── InfoRow helper ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, children }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color="#888" style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{children}</Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6fa" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  backBtn: { padding: 2 },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  topBarSub: { fontSize: 12, color: "#888", marginTop: 1 },
  refreshBtn: { padding: 4 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },
  emptyText: { fontSize: 16, color: "#555", fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  typeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconEmoji: { fontSize: 22 },
  unitName: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  unitMeta: { fontSize: 12, color: "#e53935", fontWeight: "600", marginTop: 2 },
  unitSub: { fontSize: 12, color: "#888", marginTop: 2 },

  cardDetail: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  infoLabel: { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 0.3 },
  infoValue: { fontSize: 13, color: "#333", marginTop: 2, lineHeight: 18 },

  imagesSection: { paddingTop: 10 },
  imagesLabel: { fontSize: 12, color: "#666", fontWeight: "600", marginBottom: 8 },
  imagesScroll: { marginBottom: 4 },
  verifyImg: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: "#eee",
  },

  dateText: { fontSize: 11, color: "#bbb", marginTop: 10, textAlign: "right" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e53935",
  },
  rejectBtnText: { color: "#e53935", fontWeight: "700", fontSize: 14 },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2E7D32",
  },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "@/features/auth/utils/storage";
import { getUserLocation } from "@/features/emergency/locationService";
import RegisterVolunteerModal from "@/features/emergency/RegisterVolunteerModal";
import { fetchMyRegistrations } from "@/features/emergency/volunteerApi";
import type { VolunteerUnit } from "@/features/emergency/volunteerTypes";
import {
  VOLUNTEER_TYPE_LABELS,
  VOLUNTEER_TYPE_ICONS,
  VOLUNTEER_TYPE_COLORS,
  ENTITY_KIND_LABELS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_ICONS,
  SERVICE_TYPE_COLORS,
} from "@/features/emergency/volunteerTypes";

export default function RegisterVolunteerScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [latestReg, setLatestReg] = useState<VolunteerUnit | null>(null);
  const [forceShowForm, setForceShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const loadData = async () => {
    try {
      const [loc, myRegs] = await Promise.all([
        getUserLocation().catch(() => null),
        fetchMyRegistrations().catch(() => ({ items: [] }))
      ]);
      if (loc) setLocation(loc);
      if (myRegs.items && myRegs.items.length > 0) {
        setLatestReg(myRegs.items[0]);
      }
    } catch (e) {
      console.warn("Lỗi khởi tạo màn đăng ký:", e);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      await loadData();
    };
    init();
  }, []);

  const handleRegistrationComplete = () => {
    setReady(false);
    setForceShowForm(false);
    setEditMode(false);
    loadData();
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e53935" />
      </View>
    );
  }

  // Show form if forced (rejected re-submit) or if no registration exists
  if (forceShowForm || !latestReg) {
    return (
      <RegisterVolunteerModal
        visible={true}
        onClose={() => router.back()}
        userLocation={location}
        onSuccess={handleRegistrationComplete}
      />
    );
  }

  // Show edit form with pre-filled data
  if (editMode) {
    return (
      <RegisterVolunteerModal
        visible={true}
        onClose={() => setEditMode(false)}
        userLocation={location}
        onSuccess={handleRegistrationComplete}
        initialData={latestReg}
      />
    );
  }

  const status = latestReg.status;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {status === "active" ? "Đội Cứu Hộ Của Tôi" : "Trạng Thái Đăng Ký"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ─── PENDING ─── */}
        {status === "pending" && (
          <View style={styles.card}>
            <View style={styles.iconCirclePending}>
              <Ionicons name="time" size={40} color="#FF9500" />
            </View>
            <Text style={styles.title}>Đơn đang chờ duyệt</Text>
            <Text style={styles.desc}>
              Đơn đăng ký Đội Cứu Hộ của bạn đang được Ban Quản Trị xem xét. Vui lòng kiên nhẫn chờ đợi, chúng tôi sẽ cập nhật trạng thái trong thời gian sớm nhất!
            </Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
              <Text style={styles.btnTextSecondary}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── ACTIVE — Chi tiết thông tin + Chỉnh sửa ─── */}
        {status === "active" && (
          <View style={styles.card}>
            {/* Badge */}
            <View style={styles.iconCircleSuccess}>
              <Ionicons name="shield-checkmark" size={40} color="#34C759" />
            </View>
            <Text style={styles.title}>🛡️ Đội Cứu Hộ Chính Thức</Text>
            <Text style={[styles.desc, { marginBottom: 20 }]}>
              Thông tin của bạn đang hiển thị trên Danh Bạ Cứu Hộ và Bản đồ SOS.
            </Text>

            {/* Thông tin chi tiết */}
            <View style={styles.detailSection}>
              {/* Tên đơn vị */}
              <View style={styles.detailRow}>
                <Ionicons name="business" size={18} color="#1565C0" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Tên đơn vị</Text>
                  <Text style={styles.detailValue}>{latestReg.unitName}</Text>
                </View>
              </View>

              {/* Loại */}
              <View style={styles.detailRow}>
                <Text style={{ fontSize: 18 }}>{VOLUNTEER_TYPE_ICONS[latestReg.unitType]}</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Loại dịch vụ</Text>
                  <View style={[styles.typeBadge, { backgroundColor: VOLUNTEER_TYPE_COLORS[latestReg.unitType] + "20" }]}>
                    <Text style={[styles.typeBadgeText, { color: VOLUNTEER_TYPE_COLORS[latestReg.unitType] }]}>
                      {VOLUNTEER_TYPE_LABELS[latestReg.unitType]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Hình thức */}
              <View style={styles.detailRow}>
                <Ionicons name="people" size={18} color="#7B1FA2" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Hình thức</Text>
                  <Text style={styles.detailValue}>{ENTITY_KIND_LABELS[latestReg.entityKind]}</Text>
                </View>
              </View>

              {/* Phí dịch vụ */}
              <View style={styles.detailRow}>
                <Text style={{ fontSize: 18 }}>{SERVICE_TYPE_ICONS[latestReg.serviceType]}</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phí dịch vụ</Text>
                  <View style={[styles.typeBadge, { backgroundColor: SERVICE_TYPE_COLORS[latestReg.serviceType].bg }]}>
                    <Text style={[styles.typeBadgeText, { color: SERVICE_TYPE_COLORS[latestReg.serviceType].text }]}>
                      {SERVICE_TYPE_LABELS[latestReg.serviceType]}
                    </Text>
                  </View>
                  {!!latestReg.priceNote && (
                    <Text style={styles.detailSub}>{latestReg.priceNote}</Text>
                  )}
                </View>
              </View>

              {/* Liên hệ */}
              <View style={styles.detailRow}>
                <Ionicons name="person" size={18} color="#E65100" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Người liên hệ</Text>
                  <Text style={styles.detailValue}>{latestReg.contactName}</Text>
                </View>
              </View>

              {/* SĐT */}
              <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${latestReg.phone}`)}>
                <Ionicons name="call" size={18} color="#2E7D32" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Số điện thoại</Text>
                  <Text style={[styles.detailValue, { color: "#1565C0", textDecorationLine: "underline" }]}>{latestReg.phone}</Text>
                </View>
              </TouchableOpacity>

              {/* Địa chỉ */}
              <View style={styles.detailRow}>
                <Ionicons name="location" size={18} color="#D32F2F" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Địa chỉ</Text>
                  <Text style={styles.detailValue}>
                    {[latestReg.address, latestReg.ward, latestReg.district, latestReg.province].filter(Boolean).join(", ")}
                  </Text>
                </View>
              </View>

              {/* Mô tả */}
              {!!latestReg.description && (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text" size={18} color="#546E7A" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Mô tả</Text>
                    <Text style={styles.detailValue}>{latestReg.description}</Text>
                  </View>
                </View>
              )}

              {/* Khu vực phục vụ */}
              {!!latestReg.serviceArea && (
                <View style={styles.detailRow}>
                  <Ionicons name="map" size={18} color="#00838F" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Khu vực phục vụ</Text>
                    <Text style={styles.detailValue}>{latestReg.serviceArea}</Text>
                  </View>
                </View>
              )}

              {/* Thời gian hoạt động */}
              {!!latestReg.availableTime && (
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={18} color="#F57F17" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Thời gian hoạt động</Text>
                    <Text style={styles.detailValue}>{latestReg.availableTime}</Text>
                  </View>
                </View>
              )}

              {/* Ghi chú */}
              {!!latestReg.note && (
                <View style={styles.detailRow}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#78909C" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Ghi chú</Text>
                    <Text style={styles.detailValue}>{latestReg.note}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Nút chỉnh sửa */}
            <TouchableOpacity style={styles.btnEdit} onPress={() => setEditMode(true)}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.btnEditText}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
              <Text style={styles.btnTextSecondary}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── REJECTED ─── */}
        {status === "rejected" && (
          <View style={styles.card}>
            <View style={styles.iconCircleReject}>
              <Ionicons name="close-circle" size={40} color="#FF3B30" />
            </View>
            <Text style={styles.title}>Đơn đăng ký bị từ chối</Text>
            <Text style={styles.desc}>
              Rất tiếc, đơn đăng ký của bạn không được phê duyệt với lý do sau:
            </Text>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>{latestReg.rejectReason || "Không đạt yêu cầu về thông tin xác thực."}</Text>
            </View>
            <Text style={styles.descSmall}>
              Bạn có thể cập nhật lại thông tin, hình ảnh và gửi lại đề nghị mới.
            </Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setForceShowForm(true)}>
              <Text style={styles.btnTextPrimary}>Gửi đề nghị mới</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
              <Text style={styles.btnTextSecondary}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#f5f6fa" },
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
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1a1a2e" },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  iconCirclePending: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF4E5", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  iconCircleSuccess: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  iconCircleReject: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFEBEE", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: "#222", marginBottom: 12, textAlign: "center" },
  desc: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  descSmall: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  reasonBox: { backgroundColor: "#FFEBEE", padding: 16, borderRadius: 12, width: "100%", marginBottom: 20, borderWidth: 1, borderColor: "#FFCDD2" },
  reasonText: { color: "#D32F2F", fontSize: 14, fontWeight: "600", textAlign: "center", fontStyle: "italic" },

  // ─── Detail Info ───
  detailSection: {
    width: "100%",
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    lineHeight: 22,
  },
  detailSub: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
    fontStyle: "italic",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // ─── Buttons ───
  btnEdit: {
    width: "100%",
    backgroundColor: "#1565C0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnEditText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnPrimary: { width: "100%", backgroundColor: "#e53935", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  btnTextPrimary: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: { width: "100%", backgroundColor: "#f0f0f0", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnTextSecondary: { color: "#444", fontSize: 16, fontWeight: "600" },
});

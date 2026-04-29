import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  ALL_VOLUNTEER_TYPES,
  ALL_SERVICE_TYPES,
  ENTITY_KIND_LABELS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_DESC,
  SERVICE_TYPE_ICONS,
  SERVICE_TYPE_LABELS,
  VOLUNTEER_TYPE_COLORS,
  VOLUNTEER_TYPE_ICONS,
  VOLUNTEER_TYPE_LABELS,
  type EntityKind,
  type ServiceType,
  type VolunteerUnitType,
} from "./volunteerTypes";
import { registerVolunteer, updateMyVolunteer } from "./volunteerApi";
import type { VolunteerUnit } from "./volunteerTypes";

interface Props {
  visible: boolean;
  onClose: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  onSuccess?: () => void;
  initialData?: VolunteerUnit | null;
}

export default function RegisterVolunteerModal({ visible, onClose, userLocation, onSuccess, initialData }: Props) {
  const isEditMode = !!initialData;
  // ─── Form state ──────────────────────────────────────
  const [unitName, setUnitName]           = useState(initialData?.unitName || "");
  const [unitType, setUnitType]           = useState<VolunteerUnitType>(initialData?.unitType || "doi_sos");
  const [entityKind, setEntityKind]       = useState<EntityKind>(initialData?.entityKind || "individual");
  const [contactName, setContactName]     = useState(initialData?.contactName || "");
  const [phone, setPhone]                 = useState(initialData?.phone || "");
  const [address, setAddress]             = useState(initialData?.address || "");
  const [province, setProvince]           = useState(initialData?.province || "");
  const [district, setDistrict]           = useState(initialData?.district || "");
  const [ward, setWard]                   = useState(initialData?.ward || "");
  const [description, setDescription]     = useState(initialData?.description || "");
  const [serviceArea, setServiceArea]     = useState(initialData?.serviceArea || "");
  const [availableTime, setAvailableTime] = useState(initialData?.availableTime || "");
  const [note, setNote]                   = useState(initialData?.note || "");
  const [latStr, setLatStr]               = useState(initialData ? String(initialData.lat) : (userLocation ? String(userLocation.latitude) : ""));
  const [lngStr, setLngStr]               = useState(initialData ? String(initialData.lng) : (userLocation ? String(userLocation.longitude) : ""));
  const [serviceType, setServiceType]     = useState<ServiceType>(initialData?.serviceType || "free");
  const [priceNote, setPriceNote]         = useState(initialData?.priceNote || "");

  // ─── Ảnh xác minh ───────────────────────────────────
  const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setUnitName(""); setContactName(""); setPhone(""); setAddress("");
    setProvince(""); setDistrict(""); setWard(""); setDescription("");
    setServiceArea(""); setAvailableTime(""); setNote("");
    setUnitType("doi_sos"); setEntityKind("individual");
    setServiceType("free"); setPriceNote("");
    setLatStr(userLocation ? String(userLocation.latitude) : "");
    setLngStr(userLocation ? String(userLocation.longitude) : "");
    setImages([]);
  };

  // ─── Chọn ảnh xác minh ──────────────────────────────
  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert("Giới hạn ảnh", "Bạn chỉ có thể upload tối đa 5 ảnh xác minh.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần quyền truy cập", "Vui lòng cho phép truy cập thư viện ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - images.length,
    });
    if (!result.canceled) {
      const newImgs = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `verify-${Date.now()}.jpg`,
        type: a.mimeType || "image/jpeg",
      }));
      setImages((prev) => [...prev, ...newImgs].slice(0, 5));
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!unitName.trim() || !contactName.trim() || !phone.trim() || !address.trim() || !province.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ các trường bắt buộc (*).");
      return;
    }
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Tọa độ không hợp lệ", "Vui lòng nhập tọa độ GPS chính xác.");
      return;
    }

    // Build FormData
    const fd = new FormData();
    fd.append("unitName", unitName.trim());
    fd.append("unitType", unitType);
    fd.append("entityKind", entityKind);
    fd.append("contactName", contactName.trim());
    fd.append("phone", phone.trim());
    fd.append("address", address.trim());
    fd.append("province", province.trim());
    if (district.trim()) fd.append("district", district.trim());
    if (ward.trim()) fd.append("ward", ward.trim());
    fd.append("lat", String(lat));
    fd.append("lng", String(lng));
    if (description.trim()) fd.append("description", description.trim());
    if (serviceArea.trim()) fd.append("serviceArea", serviceArea.trim());
    if (availableTime.trim()) fd.append("availableTime", availableTime.trim());
    if (note.trim()) fd.append("note", note.trim());
    fd.append("serviceType", serviceType);
    if (priceNote.trim()) fd.append("priceNote", priceNote.trim());

    // Attach ảnh xác minh
    images.forEach((img) => {
      fd.append("verificationImages", {
        uri: img.uri,
        name: img.name,
        type: img.type,
      } as any);
    });

    try {
      setSubmitting(true);
      if (isEditMode) {
        await updateMyVolunteer(fd);
        Alert.alert(
          "Cập nhật thành công! ✅",
          "Thông tin đội cứu hộ của bạn đã được cập nhật.",
          [{ text: "OK", onPress: () => { onClose(); if (onSuccess) onSuccess(); } }]
        );
      } else {
        await registerVolunteer(fd);
        Alert.alert(
          "Đăng ký thành công! 🎉",
          "Đơn đăng ký của bạn đang chờ Admin xác nhận. Sau khi được duyệt, đơn vị của bạn sẽ hiển thị trong Danh Bạ Cứu Hộ.",
          [{ text: "OK", onPress: () => { reset(); onClose(); if (onSuccess) onSuccess(); } }]
        );
      }
    } catch (e: any) {
      Alert.alert("Lỗi đăng ký", e.message || "Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#555" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isEditMode ? "Chỉnh Sửa Thông Tin" : "Đăng Ký Đội Cứu Hộ"}</Text>
            <Text style={styles.headerSub}>{isEditMode ? "Cập nhật thông tin đội cứu hộ của bạn" : "Chờ Admin xác nhận trước khi hiển thị"}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

          {/* Banner thông tin */}
          <View style={[styles.infoBanner, isEditMode && { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name={isEditMode ? "create" : "shield-checkmark"} size={20} color={isEditMode ? "#2E7D32" : "#1565C0"} />
            <Text style={[styles.infoBannerText, isEditMode && { color: "#2E7D32" }]}>
              {isEditMode
                ? "Thay đổi thông tin sẽ được cập nhật ngay lập tức trên Danh Bạ và Bản đồ."
                : "Đơn đăng ký sẽ được Admin xem xét. Sau khi duyệt, đơn vị của bạn sẽ xuất hiện trong tab Danh Bạ và có thể kết nối với người gửi SOS trong tương lai."
              }
            </Text>
          </View>

          {/* Loại dịch vụ: Miễn phí / Thu phí / Thỏa thuận */}
          <Section title="💰 Loại dịch vụ *">
            <Text style={styles.serviceTypeHint}>
              Vui lòng chọn loại dịch vụ của bạn để người dùng hiểu rõ trước khi liên hệ.
            </Text>
            <View style={styles.serviceTypeGrid}>
              {ALL_SERVICE_TYPES.map((st) => {
                const active = serviceType === st;
                const colors = SERVICE_TYPE_COLORS[st];
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.serviceTypeCard,
                      { borderColor: active ? colors.border : "#e0e0e0" },
                      active && { backgroundColor: colors.bg },
                    ]}
                    onPress={() => setServiceType(st)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.serviceTypeCardTop}>
                      <Text style={styles.serviceTypeEmoji}>{SERVICE_TYPE_ICONS[st]}</Text>
                      {active && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.border} />
                      )}
                    </View>
                    <Text style={[styles.serviceTypeLabel, active && { color: colors.text }]}>
                      {SERVICE_TYPE_LABELS[st]}
                    </Text>
                    <Text style={[styles.serviceTypeDesc, active && { color: colors.text + "CC" }]}>
                      {SERVICE_TYPE_DESC[st]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Ghi chú giá — chỉ hiện khi có thu phí hoặc thỏa thuận */}
            {serviceType !== "free" && (
              <Field
                label={serviceType === "paid" ? "Giá tham khảo" : "Ghi chú về phí"}
                value={priceNote}
                onChangeText={setPriceNote}
                placeholder={
                  serviceType === "paid"
                    ? "VD: 50.000đ/lần, 100.000đ trong bán kính 5km..."
                    : "VD: Miễn phí nếu khẩn cấp, thu phí xa..."
                }
              />
            )}
          </Section>

          {/* Loại hình đăng ký */}
          <Section title="Loại hình">
            <View style={styles.kindRow}>
              {(["individual", "group"] as EntityKind[]).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.kindChip, entityKind === k && styles.kindChipActive]}
                  onPress={() => setEntityKind(k)}
                >
                  <Ionicons
                    name={k === "individual" ? "person" : "people"}
                    size={16}
                    color={entityKind === k ? "#fff" : "#555"}
                  />
                  <Text style={[styles.kindChipText, entityKind === k && { color: "#fff" }]}>
                    {ENTITY_KIND_LABELS[k]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* Loại dịch vụ */}
          <Section title="Loại dịch vụ / Hỗ trợ *">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeScroll}
            >
              {ALL_VOLUNTEER_TYPES.map((t) => {
                const active = unitType === t;
                const color = VOLUNTEER_TYPE_COLORS[t];
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setUnitType(t)}
                  >
                    <Text style={styles.typeEmoji}>{VOLUNTEER_TYPE_ICONS[t]}</Text>
                    <Text style={[styles.typeChipText, active && { color: "#fff" }]}>
                      {VOLUNTEER_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Section>

          {/* Thông tin cơ bản */}
          <Section title="Thông tin cơ bản">
            <Field label="Tên đơn vị / cá nhân *" value={unitName} onChangeText={setUnitName}
              placeholder="VD: Đội xe SOS Quận 1, Anh Minh Vá Xe..." />
            <Field label="Người liên hệ *" value={contactName} onChangeText={setContactName}
              placeholder="Họ và tên người đại diện" />
            <Field label="Số điện thoại *" value={phone} onChangeText={setPhone}
              placeholder="VD: 0912345678" keyboardType="phone-pad" />
          </Section>

          {/* Địa chỉ */}
          <Section title="Địa chỉ hoạt động">
            <Field label="Địa chỉ *" value={address} onChangeText={setAddress}
              placeholder="Số nhà, đường, phường..." multiline />
            <Field label="Tỉnh / Thành phố *" value={province} onChangeText={setProvince}
              placeholder="VD: TP Hồ Chí Minh" />
            <Field label="Quận / Huyện" value={district} onChangeText={setDistrict}
              placeholder="VD: Quận 1" />
            <Field label="Phường / Xã" value={ward} onChangeText={setWard}
              placeholder="VD: Phường Bến Nghé" />
          </Section>

          {/* Tọa độ GPS */}
          <Section title="Vị trí GPS">
            <Text style={styles.gpsHint}>
              Mở Google Maps → ấn giữ địa điểm → sao chép tọa độ (lat, lng)
            </Text>
            <View style={styles.gpsRow}>
              <View style={{ flex: 1 }}>
                <Field label="Vĩ độ (lat)" value={latStr} onChangeText={setLatStr}
                  placeholder="10.7769" keyboardType="decimal-pad" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Field label="Kinh độ (lng)" value={lngStr} onChangeText={setLngStr}
                  placeholder="106.7009" keyboardType="decimal-pad" />
              </View>
            </View>
          </Section>

          {/* Mô tả chi tiết */}
          <Section title="Mô tả & Phạm vi">
            <Field label="Mô tả chi tiết" value={description} onChangeText={setDescription}
              placeholder="Mô tả dịch vụ bạn cung cấp, kinh nghiệm, trang thiết bị..."
              multiline rows={4} />
            <Field label="Phạm vi hoạt động" value={serviceArea} onChangeText={setServiceArea}
              placeholder="VD: Quận 1, 3, Bình Thạnh — TP HCM" />
            <Field label="Thời gian hoạt động" value={availableTime} onChangeText={setAvailableTime}
              placeholder="VD: 24/7, Thứ 2-6 (7h-22h)..." />
            <Field label="Ghi chú thêm" value={note} onChangeText={setNote}
              placeholder="Thông tin bổ sung..." multiline />
          </Section>

          {/* Ảnh xác minh */}
          <Section title={`Ảnh xác minh (${images.length}/5)`}>
            <Text style={styles.verifyHint}>
              Ảnh CMND/CCCD, ảnh đội cứu hộ, ảnh phương tiện, giấy phép... giúp Admin xác minh nhanh hơn.
            </Text>

            <View style={styles.imageGrid}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.imageThumb}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                  <TouchableOpacity
                    style={styles.removeImgBtn}
                    onPress={() => removeImage(idx)}
                  >
                    <Ionicons name="close-circle" size={20} color="#e53935" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                  <Ionicons name="camera-outline" size={28} color="#1565C0" />
                  <Text style={styles.addImageText}>Thêm ảnh</Text>
                </TouchableOpacity>
              )}
            </View>
          </Section>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Gửi Đơn Đăng Ký</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.submitNote}>
            Sau khi gửi, Admin sẽ xem xét và phản hồi. Bạn có thể kiểm tra trạng thái trong đơn của mình.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Field component ─────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, multiline, rows, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; multiline?: boolean; rows?: number; keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && { height: rows ? rows * 22 + 20 : 80, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? (rows || 3) : 1}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    marginTop: Platform.OS === "ios" ? 44 : 24,
  },
  closeBtn: { padding: 4 },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  headerSub: { fontSize: 11, color: "#888", marginTop: 2 },

  body: { flex: 1, backgroundColor: "#f5f6fa" },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 16,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#1565C0",
  },
  infoBannerText: { flex: 1, fontSize: 13, color: "#1565C0", lineHeight: 19 },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e53935",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  kindRow: { flexDirection: "row", gap: 10 },
  kindChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  kindChipActive: { backgroundColor: "#e53935", borderColor: "#e53935" },
  kindChipText: { fontSize: 14, fontWeight: "600", color: "#555" },

  typeScroll: { paddingVertical: 4, gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  typeEmoji: { fontSize: 16 },
  typeChipText: { fontSize: 13, fontWeight: "600", color: "#555" },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: "#222",
  },

  gpsHint: { fontSize: 12, color: "#999", marginBottom: 10, lineHeight: 17 },
  gpsRow: { flexDirection: "row" },

  verifyHint: { fontSize: 12, color: "#888", lineHeight: 17, marginBottom: 12 },

  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imageThumb: { width: 80, height: 80, position: "relative" },
  thumbImg: { width: 80, height: 80, borderRadius: 10, backgroundColor: "#eee" },
  removeImgBtn: { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 10 },
  addImageBtn: {
    width: 80, height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#1565C0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
  },
  addImageText: { fontSize: 10, color: "#1565C0", fontWeight: "600", marginTop: 2 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#e53935",
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: "#e53935",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  submitNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#aaa",
    marginHorizontal: 24,
    marginTop: 12,
    lineHeight: 17,
  },
});

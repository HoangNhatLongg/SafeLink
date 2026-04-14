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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AgencyType, ContributePayload } from "./types";
import { AGENCY_TYPE_LABELS, AGENCY_TYPE_COLORS, AGENCY_TYPE_ICONS } from "./types";
import { contributeDirectory } from "./directoryApi";

interface Props {
  visible: boolean;
  onClose: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

const TYPES: AgencyType[] = ["csgt", "pccc", "canh_sat", "benh_vien", "cuu_thuong", "khac"];

export default function ContributeModal({ visible, onClose, userLocation }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [type, setType] = useState<AgencyType>("csgt");
  const [note, setNote] = useState("");
  const [latStr, setLatStr] = useState(userLocation ? String(userLocation.latitude) : "");
  const [lngStr, setLngStr] = useState(userLocation ? String(userLocation.longitude) : "");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(""); setPhone(""); setAddress(""); setProvince("");
    setDistrict(""); setWard(""); setType("csgt"); setNote("");
    setLatStr(userLocation ? String(userLocation.latitude) : "");
    setLngStr(userLocation ? String(userLocation.longitude) : "");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !province.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ: Tên, Số điện thoại, Địa chỉ, Tỉnh/TP.");
      return;
    }
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Tọa độ không hợp lệ", "Vui lòng nhập tọa độ GPS chính xác.");
      return;
    }

    const payload: ContributePayload = {
      name: name.trim(), phone: phone.trim(), address: address.trim(),
      province: province.trim(), district: district.trim() || undefined,
      ward: ward.trim() || undefined, type, lat, lng,
      note: note.trim() || undefined,
    };

    try {
      setSubmitting(true);
      await contributeDirectory(payload);
      Alert.alert(
        "Đã gửi đóng góp! 🎉",
        "Thông tin của bạn đang chờ được quản trị viên kiểm duyệt. Cảm ơn bạn đã đóng góp cho cộng đồng!",
        [{ text: "OK", onPress: () => { reset(); onClose(); } }]
      );
    } catch (e: any) {
      Alert.alert("Lỗi gửi đóng góp", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#555" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đóng góp thông tin</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.sectionTitle}>Loại đơn vị</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
            {TYPES.map((t) => {
              const active = type === t;
              const color = AGENCY_TYPE_COLORS[t];
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setType(t)}
                >
                  <Text style={styles.typeEmoji}>{AGENCY_TYPE_ICONS[t]}</Text>
                  <Text style={[styles.typeChipText, active && { color: "#fff" }]}>
                    {AGENCY_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Field label="Tên đơn vị *" value={name} onChangeText={setName} placeholder="VD: Phòng CSGT Công an Quận 1" />
          <Field label="Số điện thoại *" value={phone} onChangeText={setPhone} placeholder="VD: 02438123456" keyboardType="phone-pad" />
          <Field label="Địa chỉ *" value={address} onChangeText={setAddress} placeholder="Số nhà, đường, phường..." multiline />
          <Field label="Tỉnh / Thành phố *" value={province} onChangeText={setProvince} placeholder="VD: TP HCM" />
          <Field label="Quận / Huyện" value={district} onChangeText={setDistrict} placeholder="VD: Quận 1" />
          <Field label="Phường / Xã" value={ward} onChangeText={setWard} placeholder="VD: Bến Nghé" />

          <Text style={styles.sectionTitle}>Tọa độ GPS</Text>
          <Text style={styles.gpsHint}>
            Bạn có thể dùng Google Maps để lấy tọa độ chính xác (ấn giữ để xem lat/lng).
          </Text>
          <View style={styles.gpsRow}>
            <View style={{ flex: 1 }}>
              <Field label="Vĩ độ (lat)" value={latStr} onChangeText={setLatStr} placeholder="10.7769" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Kinh độ (lng)" value={lngStr} onChangeText={setLngStr} placeholder="106.7009" keyboardType="numeric" />
            </View>
          </View>

          <Field label="Ghi chú" value={note} onChangeText={setNote} placeholder="Thông tin bổ sung..." multiline />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#1565C0" />
            <Text style={styles.infoText}>
              Thông tin đóng góp sẽ được gửi đến quản trị viên để kiểm duyệt trước khi hiển thị công khai.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Gửi đóng góp</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; multiline?: boolean; keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

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
    marginTop: 40,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  body: { flex: 1, backgroundColor: "#f8f9fa", padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#555", marginBottom: 8, marginTop: 4 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ddd",
  },
  typeEmoji: { fontSize: 14 },
  typeChipText: { fontSize: 13, color: "#555", fontWeight: "600" },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 },
  fieldInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#222",
  },
  gpsRow: { flexDirection: "row", gap: 8 },
  gpsHint: { fontSize: 12, color: "#999", marginBottom: 8 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#e8f0fe",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1565C0", lineHeight: 18 },
  submitBtn: {
    backgroundColor: "#e53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 30,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

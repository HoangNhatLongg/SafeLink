import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActionSheetIOS,
  Linking,
  Platform,
  Alert,
  Clipboard,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Agency } from "./types";
import { AGENCY_TYPE_LABELS, AGENCY_TYPE_COLORS, AGENCY_TYPE_ICONS, AGENCY_TYPE_IONICONS } from "./types";
import { saveAgency, removeAgency, isAgencySaved } from "./offlineStorage";

interface Props {
  item: Agency;
}

function openDirections(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  if (Platform.OS === "ios") {
    const url = `maps://app?daddr=${lat},${lng}&dirflg=d`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(
          `https://maps.google.com/maps?daddr=${lat},${lng}&q=${label}`
        );
      }
    });
  } else {
    Linking.openURL(
      `google.navigation:q=${lat},${lng}&mode=d`
    ).catch(() =>
      Linking.openURL(
        `https://maps.google.com/maps?daddr=${lat},${lng}&q=${label}`
      )
    );
  }
}

function handlePhonePress(phone: string) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Huỷ", `Gọi ${phone}`, "Sao chép số"],
        cancelButtonIndex: 0,
        title: "Số điện thoại",
      },
      (buttonIndex) => {
        if (buttonIndex === 1) Linking.openURL(`tel:${phone}`);
        if (buttonIndex === 2) {
          Clipboard.setString(phone);
          Alert.alert("Đã sao chép", phone);
        }
      }
    );
  } else {
    Alert.alert("Số điện thoại", phone, [
      { text: "Huỷ", style: "cancel" },
      { text: "Gọi ngay", onPress: () => Linking.openURL(`tel:${phone}`) },
      {
        text: "Sao chép",
        onPress: () => {
          Clipboard.setString(phone);
          Alert.alert("Đã sao chép", phone);
        },
      },
    ]);
  }
}

export default function AgencyCard({ item }: Props) {
  const [directionModalVisible, setDirectionModalVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const typeColor = AGENCY_TYPE_COLORS[item.type] ?? "#616161";
  const typeLabel = AGENCY_TYPE_LABELS[item.type] ?? "Khác";
  const typeIcon  = AGENCY_TYPE_ICONS[item.type] ?? "📍";
  const typeIonicon = AGENCY_TYPE_IONICONS[item.type] ?? "help-circle";

  // Kiểm tra trạng thái đã lưu hay chưa khi mời hiển thị
  useEffect(() => {
    const id = item._id ?? item.name;
    isAgencySaved(id).then(setSaved);
  }, [item._id, item.name]);

  const toggleSave = useCallback(async () => {
    const id = item._id ?? item.name;
    if (saved) {
      await removeAgency(id);
      setSaved(false);
      Alert.alert("Đã xóa", `Đã xóa "${item.name}" khỏi danh bạ đã lưu.`);
    } else {
      await saveAgency(item);
      setSaved(true);
      Alert.alert("Đã lưu ✅", `Đã lưu "${item.name}" để xem offline.`);
    }
  }, [saved, item]);

  return (
    <>
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <Ionicons name={typeIonicon as any} size={12} color="#fff" />
            <Text style={styles.typeText}>{typeIcon} {typeLabel}</Text>
          </View>
          <View style={styles.headerRight}>
            {item.distanceKm !== undefined && (
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={12} color="#666" />
                <Text style={styles.distanceText}>
                  {item.distanceKm < 1
                    ? `${Math.round(item.distanceKm * 1000)}m`
                    : `${item.distanceKm.toFixed(1)}km`}
                </Text>
              </View>
            )}
            {/* Nút lưu offline */}
            <TouchableOpacity onPress={toggleSave} style={styles.saveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saved ? typeColor : "#bbb"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name — tap to get directions */}
        <TouchableOpacity onPress={() => setDirectionModalVisible(true)}>
          <Text style={styles.name}>{item.name}</Text>
        </TouchableOpacity>

        {/* Address */}
        <View style={styles.row}>
          <Ionicons name="map-outline" size={14} color="#888" style={styles.rowIcon} />
          <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
        </View>

        {/* Province/District */}
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color="#888" style={styles.rowIcon} />
          <Text style={styles.meta}>
            {[item.ward, item.district, item.province].filter(Boolean).join(", ")}
          </Text>
        </View>

        {/* Phone — tap to call/copy */}
        <TouchableOpacity style={styles.row} onPress={() => handlePhonePress(item.phone)}>
          <Ionicons name="call" size={14} color={typeColor} style={styles.rowIcon} />
          <Text style={[styles.phone, { color: typeColor }]}>{item.phone}</Text>
        </TouchableOpacity>
      </View>

      {/* Direction Modal */}
      <Modal
        visible={directionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDirectionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDirectionModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalName}>{item.name}</Text>
            <Text style={styles.modalAddress}>{item.address}</Text>
            <TouchableOpacity
              style={[styles.directBtn, { backgroundColor: typeColor }]}
              onPress={() => {
                setDirectionModalVisible(false);
                openDirections(item.lat, item.lng, item.name);
              }}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.directBtnText}>Chỉ đường</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setDirectionModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distanceText: { fontSize: 11, color: "#666" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  saveBtn: {
    padding: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 8,
    textDecorationLine: "underline",
    textDecorationColor: "#999",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
    gap: 5,
  },
  rowIcon: { marginTop: 1 },
  address: { flex: 1, fontSize: 13, color: "#444" },
  meta: { flex: 1, fontSize: 12, color: "#888" },
  phone: { fontSize: 14, fontWeight: "600" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  modalName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 6,
  },
  modalAddress: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  directBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 30,
    gap: 8,
    marginBottom: 10,
    width: "100%",
    justifyContent: "center",
  },
  directBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: {
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  cancelBtnText: { color: "#888", fontSize: 15 },
});
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SOSMapProps {
  userLocation: { latitude: number; longitude: number };
  sentSOSInfo?: { category: string; coords: { latitude: number; longitude: number } } | null;
  onClearSentSOS?: () => void;
}

export default function SOSMap({ userLocation, sentSOSInfo, onClearSentSOS }: SOSMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="map-outline" size={48} color="#999" />
        <Text style={styles.text}>Bản đồ SOS không khả dụng trên trình duyệt web.</Text>
        <Text style={styles.subtext}>Vui lòng sử dụng ứng dụng di động SafeLink để xem các cảnh báo SOS và vị trí đơn vị cứu hộ gần bạn.</Text>
      </View>
      
      {sentSOSInfo && (
        <View style={styles.supportBanner}>
          <View style={styles.supportBannerLeft}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
            <Text style={styles.supportBannerText} numberOfLines={1}>
              Đã gửi yêu cầu SOS. Đơn vị hỗ trợ sẽ sớm liên hệ.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onClearSentSOS?.()}
            style={styles.supportBannerClose}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  /* ── Support Banner ── */
  supportBanner: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    marginTop: 40,
    backgroundColor: "#1565C0",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  supportBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  supportBannerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
  },
  supportBannerClose: { padding: 2 },
});

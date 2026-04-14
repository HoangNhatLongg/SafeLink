import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  Animated,
} from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fetchActiveSOS, type SOSItem } from "./sosApi";

// Nhãn hiển thị theo category
const CATEGORY_LABEL: Record<string, string> = {
  fire:      "🔥 Hỏa hoạn",
  landslide: "⛰️ Sạt lở",
  traffic:   "🚗 Tai nạn",
  robbery:   "🚨 Cướp giật",
  medical:   "🏥 Cấp cứu",
  flood:     "🌊 Lũ lụt",
  other:     "⚠️ Khẩn cấp",
};

/**
 * Mở Google Maps / Apple Maps với chỉ đường đến toạ độ đã cho.
 */
async function openDirections(lat: number, lng: number) {
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const googleAppUrl =
    Platform.OS === "android"
      ? `google.navigation:q=${lat},${lng}`
      : `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;

  const appleUrl = `maps://?daddr=${lat},${lng}&dirflg=d`;

  try {
    if (Platform.OS === "android") {
      const canGoogle = await Linking.canOpenURL(googleAppUrl);
      await Linking.openURL(canGoogle ? googleAppUrl : googleUrl);
    } else {
      const canGoogle = await Linking.canOpenURL(googleAppUrl);
      if (canGoogle) {
        await Linking.openURL(googleAppUrl);
      } else {
        const canApple = await Linking.canOpenURL(appleUrl);
        await Linking.openURL(canApple ? appleUrl : googleUrl);
      }
    }
  } catch {
    Alert.alert("Lỗi", "Không thể mở bản đồ chỉ đường.");
  }
}

interface SOSMapProps {
  userLocation: { latitude: number; longitude: number };
}

export default function SOSMap({ userLocation }: SOSMapProps) {
  const router = useRouter();
  const [activeSOS, setActiveSOS] = useState<SOSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSItem | null>(null);
  const mapRef = useRef<MapView>(null);
  const panelAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = visible

  useEffect(() => {
    loadSOS();
    const timer = setInterval(loadSOS, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Animate panel khi selectedSOS thay đổi
  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: selectedSOS ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [selectedSOS]);

  const loadSOS = async () => {
    try {
      const { sos } = await fetchActiveSOS({
        lat: userLocation.latitude,
        lon: userLocation.longitude,
        radius: 50,
      });
      setActiveSOS(sos);
    } catch (e) {
      console.warn("Error loading active SOS:", e);
    } finally {
      setLoading(false);
    }
  };

  const centerToUser = () => {
    mapRef.current?.animateToRegion({
      ...userLocation,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const handleMarkerPress = (sos: SOSItem) => {
    setSelectedSOS(sos);
    // Zoom vào marker được chọn
    mapRef.current?.animateToRegion({
      latitude: sos.location.latitude,
      longitude: sos.location.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const closePanel = () => setSelectedSOS(null);

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPress={() => setSelectedSOS(null)}
      >
        {activeSOS.map((sos) => (
          <React.Fragment key={sos.id}>
            {/* Vòng tròn bán kính cảnh báo */}
            <Circle
              center={{
                latitude: sos.location.latitude,
                longitude: sos.location.longitude,
              }}
              radius={sos.radius}
              fillColor="rgba(255, 59, 48, 0.08)"
              strokeColor="rgba(255, 59, 48, 0.35)"
              strokeWidth={1.5}
            />

            {/* Marker cảnh báo */}
            <Marker
              coordinate={{
                latitude: sos.location.latitude,
                longitude: sos.location.longitude,
              }}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkerPress(sos);
              }}
              onSelect={() => handleMarkerPress(sos)}
              tracksViewChanges={false}
              title={CATEGORY_LABEL[sos.category] ?? "SOS"}
              description={sos.description || "Ấn để xem chi tiết"}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.triangle,
                    selectedSOS?.id === sos.id && { borderBottomColor: "#CC0000" },
                  ]}
                />
                <Ionicons
                  name="warning"
                  size={selectedSOS?.id === sos.id ? 24 : 20}
                  color="#fff"
                  style={styles.warningIcon}
                />
              </View>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={loadSOS}>
          <Ionicons name="refresh" size={22} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={centerToUser}>
          <Ionicons name="locate" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Badge đếm SOS */}
      {activeSOS.length > 0 && (
        <View style={styles.sosCountBadge}>
          <Ionicons name="warning" size={12} color="#fff" />
          <Text style={styles.sosCountText}>
            {activeSOS.length} SOS đang hoạt động
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#FF3B30" />
        </View>
      )}

      {/* ── Bottom Panel (thay cho Callout) ── */}
      {selectedSOS && (
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateY: panelTranslateY }] },
          ]}
        >
          {/* Nút đóng */}
          <TouchableOpacity style={styles.panelClose} onPress={closePanel}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>

          {/* Category */}
          <Text style={styles.panelCategory}>
            {CATEGORY_LABEL[selectedSOS.category] ?? "⚠️ SOS"}
          </Text>

          {/* Tác giả */}
          <Text style={styles.panelAuthor} numberOfLines={1}>
            👤 {selectedSOS.author?.name ?? "Người dùng"}
          </Text>

          {/* Mô tả */}
          {!!selectedSOS.description && (
            <Text style={styles.panelDesc} numberOfLines={3}>
              {selectedSOS.description}
            </Text>
          )}

          {/* Địa chỉ */}
          {!!selectedSOS.location?.address && (
            <Text style={styles.panelAddr} numberOfLines={2}>
              📍 {selectedSOS.location.address}
            </Text>
          )}

          {/* 2 nút hành động */}
          <View style={styles.panelActions}>
            <TouchableOpacity
              style={styles.panelBtnView}
              onPress={() => {
                closePanel();
                router.push({
                  pathname: "/post/[id]",
                  params: { id: selectedSOS.id },
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.panelBtnText}>Xem bài viết</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.panelBtnNav}
              onPress={() =>
                openDirections(
                  selectedSOS.location.latitude,
                  selectedSOS.location.longitude
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.panelBtnText}>Chỉ đường</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  /* ── Marker ── */
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
  },
  markerSelected: {
    transform: [{ scale: 1.3 }],
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FF3B30",
    position: "absolute",
  },
  warningIcon: {
    marginTop: 4,
  },
  /* ── Controls ── */
  controls: {
    position: "absolute",
    right: 16,
    bottom: 30,
    gap: 12,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  /* ── Badge đếm SOS ── */
  sosCountBadge: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    backgroundColor: "#FF3B30",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sosCountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  /* ── Loader ── */
  loader: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 20,
  },
  /* ── Bottom Panel ── */
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  panelClose: {
    position: "absolute",
    top: 12,
    right: 14,
    zIndex: 2,
    padding: 4,
  },
  panelCategory: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FF3B30",
    marginBottom: 4,
  },
  panelAuthor: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
    marginBottom: 4,
  },
  panelDesc: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },
  panelAddr: {
    fontSize: 12,
    color: "#888",
    marginBottom: 10,
  },
  panelActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  panelBtnView: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  panelBtnNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  panelBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

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
import { getUserJson, type StoredUser } from "@/features/auth/utils/storage";
import { requestToHelpSOS, getMyConnections } from "@/features/chat/chatApi";
import {
  SOS_CATEGORY_TO_AGENCY_TYPES,
  AGENCY_TYPE_COLORS,
  AGENCY_TYPE_LABELS,
  AGENCY_TYPE_ICONS,
  AGENCY_TYPE_IONICONS,
  type Agency,
} from "@/features/emergency/types";
import { AGENCIES, mapFallback } from "@/features/emergency/agencyData";
import { fetchNearbyDirectory } from "@/features/emergency/directoryApi";

// ─── Nhãn hiển thị theo SOS category ─────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  fire:           "🔥 Hỏa hoạn",
  landslide:      "⛰️ Sạt lở",
  traffic:        "🚗 Tai nạn",
  robbery:        "🚨 Cướp giật",
  medical:        "🏥 Cấp cứu",
  flood:          "🌊 Lũ lụt",
  sos_support:    "🆘 Hỗ trợ SOS",
  vehicle_repair: "🔧 Sửa xe",
  other:          "⚠️ Khẩn cấp",
};

// ─── Tên đơn vị hỗ trợ ngắn gọn cho banner ────────────────────────────────────
const CATEGORY_SUPPORT_LABEL: Record<string, string> = {
  fire:           "PCCC",
  landslide:      "PCCC & Cứu thương",
  traffic:        "CSGT & Cứu thương",
  robbery:        "Công An",
  medical:        "Y tế & Cấp cứu",
  flood:          "PCCC & Cứu thương",
  sos_support:    "Hỗ trợ SOS",
  vehicle_repair: "Sửa xe cứu hộ",
  other:          "Tất cả đơn vị",
};

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

function callAgency(phone: string, name: string) {
  Alert.alert(
    name,
    `Gọi ${phone}?`,
    [
      { text: "Huỷ", style: "cancel" },
      { text: "Gọi ngay", onPress: () => Linking.openURL(`tel:${phone}`) },
    ]
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SOSMapProps {
  userLocation: { latitude: number; longitude: number };
  sentSOSInfo?: { category: string; coords: { latitude: number; longitude: number } } | null;
  onClearSentSOS?: () => void;
}

// ─── Lấy agencies theo loại SOS (fallback + API) ──────────────────────────────
async function loadSupportAgencies(
  userLat: number,
  userLng: number,
  category?: string
): Promise<Agency[]> {
  const targetTypes = category ? (SOS_CATEGORY_TO_AGENCY_TYPES[category] || []) : null;

  let items: Agency[] = [];
  
  // 1. Thử API trước (lấy gần nhất)
  try {
    const result = await fetchNearbyDirectory({ lat: userLat, lng: userLng, radius: 20 });
    items = result.items || [];
  } catch {
    // Fallback nếu API lỗi
  }

  // 2. Nếu API không trả về dữ liệu (hoặc lỗi), dùng dữ liệu giả lập (built-in)
  if (items.length === 0) {
    items = AGENCIES.map(mapFallback);
  }

  // 3. Nếu đang có yêu cầu SOS (có category), LỌC lại danh sách
  if (targetTypes && targetTypes.length > 0) {
    return items.filter((a) => targetTypes.includes(a.type as any));
  }

  // 4. Mặc định trả về tất cả
  return items;
}

export default function SOSMap({ userLocation, sentSOSInfo, onClearSentSOS }: SOSMapProps) {
  const router = useRouter();
  const [activeSOS, setActiveSOS] = useState<SOSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSItem | null>(null);
  const [supportAgencies, setSupportAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    getUserJson().then(setCurrentUser);
  }, []);

  const mapRef = useRef<MapView>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const agencyPanelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSOS();
    const timer = setInterval(loadSOS, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Poll for incoming help requests if the user is logged in
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchRequests = async () => {
      if (!currentUser) return;
      try {
        const res = await getMyConnections();
        // Count pending requests where current user is the SOS sender
        const count = res.connections?.filter(
          (c) => c.status === "pending" && (String(c.senderId?._id || c.senderId) === String(currentUser.id))
        ).length || 0;
        setPendingRequestsCount(count);
      } catch (e) {
        // silent
      }
    };

    if (currentUser) {
      fetchRequests();
      timer = setInterval(fetchRequests, 10000);
    }

    return () => clearInterval(timer);
  }, [currentUser]);

  // Listen to global socket events for SOS updates
  useEffect(() => {
    let active = true;
    import('@/features/chat/socketClient').then(({ getSocket, connectSocket }) => {
      connectSocket().then(socket => {
        if (!active || !socket) return;
        
        socket.on('newSOS', () => {
          loadSOS(); // Tải lại danh sách SOS khi có SOS mới
        });
        
        socket.on('sosResolved', () => {
          loadSOS(); // Tải lại danh sách SOS khi một SOS được giải quyết
        });
      });
    });

    return () => {
      active = false;
      import('@/features/chat/socketClient').then(({ getSocket }) => {
        const socket = getSocket();
        if (socket) {
          socket.off('newSOS');
          socket.off('sosResolved');
        }
      });
    };
  }, []);

  // Animate SOS panel
  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: selectedSOS ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [selectedSOS]);

  // Animate agency panel
  useEffect(() => {
    Animated.spring(agencyPanelAnim, {
      toValue: selectedAgency ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [selectedAgency]);

  // Khi nhận sentSOSInfo mới hoặc trạng thái bình thường → load agencies tương ứng
  useEffect(() => {
    setSupportAgencies([]);
    setSelectedAgency(null);
    setSupportLoading(true);

    loadSupportAgencies(
      userLocation.latitude,
      userLocation.longitude,
      sentSOSInfo?.category
    )
      .then(setSupportAgencies)
      .catch(() => setSupportAgencies([]))
      .finally(() => setSupportLoading(false));

    if (sentSOSInfo) {
      // Zoom ra xem tổng thể
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }
  }, [sentSOSInfo]);

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
    setSelectedAgency(null);
    mapRef.current?.animateToRegion({
      latitude: sos.location.latitude,
      longitude: sos.location.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const handleAgencyPress = (agency: Agency) => {
    setSelectedAgency(agency);
    setSelectedSOS(null);
    mapRef.current?.animateToRegion({
      latitude: agency.lat,
      longitude: agency.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const closeSOSPanel = () => setSelectedSOS(null);
  const closeAgencyPanel = () => setSelectedAgency(null);

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });
  const agencyPanelTranslateY = agencyPanelAnim.interpolate({
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
        onPress={() => { setSelectedSOS(null); setSelectedAgency(null); }}
      >
        {/* ── SOS alert markers ── */}
        {activeSOS.map((sos) => (
          <React.Fragment key={sos.id}>
            <Circle
              center={{ latitude: sos.location.latitude, longitude: sos.location.longitude }}
              radius={sos.radius}
              fillColor="rgba(255, 59, 48, 0.08)"
              strokeColor="rgba(255, 59, 48, 0.35)"
              strokeWidth={1.5}
            />
            <Marker
              coordinate={{ latitude: sos.location.latitude, longitude: sos.location.longitude }}
              onPress={(e) => { e.stopPropagation(); handleMarkerPress(sos); }}
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

        {/* ── Support agency markers ── */}
        {supportAgencies.map((agency) => {
          const color = AGENCY_TYPE_COLORS[agency.type] ?? "#607D8B";
          const iconName = AGENCY_TYPE_IONICONS[agency.type] ?? "help-circle";
          const isSelected = selectedAgency?._id === agency._id;
          return (
            <Marker
              key={`agency-${agency._id}`}
              coordinate={{ latitude: agency.lat, longitude: agency.lng }}
              onPress={(e) => { e.stopPropagation(); handleAgencyPress(agency); }}
              onSelect={() => handleAgencyPress(agency)}
              tracksViewChanges={false}
            >
              <View style={[styles.agencyMarker, { backgroundColor: color, transform: [{ scale: isSelected ? 1.25 : 1 }] }]}>
                <Text style={styles.agencyEmoji}>{AGENCY_TYPE_ICONS[agency.type] ?? "📍"}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={loadSOS}>
          <Ionicons name="refresh" size={22} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={centerToUser}>
          <Ionicons name="locate" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* ── SOS count badge ── */}
      {activeSOS.length > 0 && !sentSOSInfo && (
        <View style={styles.sosCountBadge}>
          <Ionicons name="warning" size={12} color="#fff" />
          <Text style={styles.sosCountText}>
            {activeSOS.length} SOS đang hoạt động
          </Text>
        </View>
      )}

      {/* ── Banner "đang hiển thị đơn vị hỗ trợ" ── */}
      {sentSOSInfo && (
        <View style={styles.supportBanner}>
          <View style={styles.supportBannerLeft}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
            <Text style={styles.supportBannerText} numberOfLines={1}>
              {supportLoading
                ? "Đang tìm đơn vị hỗ trợ..."
                : `${supportAgencies.length} đơn vị ${CATEGORY_SUPPORT_LABEL[sentSOSInfo.category] ?? ""} gần bạn`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { onClearSentSOS?.(); setSelectedAgency(null); }}
            style={styles.supportBannerClose}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Incoming Request Badge ── */}
      {pendingRequestsCount > 0 && (
        <TouchableOpacity
          style={styles.incomingRequestBadge}
          onPress={() => router.push("/chat-history")}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications" size={20} color="#fff" />
          <Text style={styles.incomingRequestText}>
            Bạn có {pendingRequestsCount} người muốn hỗ trợ! Bấm để xem
          </Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#FF3B30" />
        </View>
      )}

      {/* ── Bottom Panel — SOS detail ── */}
      {selectedSOS && (
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}
        >
          <TouchableOpacity style={styles.panelClose} onPress={closeSOSPanel}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
          <Text style={styles.panelCategory}>
            {CATEGORY_LABEL[selectedSOS.category] ?? "⚠️ SOS"}
          </Text>
          <Text style={styles.panelAuthor} numberOfLines={1}>
            👤 {selectedSOS.author?.name ?? "Người dùng"}
          </Text>
          {!!selectedSOS.description && (
            <Text style={styles.panelDesc} numberOfLines={3}>
              {selectedSOS.description}
            </Text>
          )}
          {!!selectedSOS.location?.address && (
            <Text style={styles.panelAddr} numberOfLines={2}>
              📍 {selectedSOS.location.address}
            </Text>
          )}
          <View style={styles.panelActions}>
            <TouchableOpacity
              style={styles.panelBtnView}
              onPress={() => {
                closeSOSPanel();
                router.push({ pathname: "/post/[id]", params: { id: selectedSOS.id } });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.panelBtnText}>Xem bài</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.panelBtnNav}
              onPress={() => openDirections(selectedSOS.location.latitude, selectedSOS.location.longitude)}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.panelBtnText}>Đường đi</Text>
            </TouchableOpacity>
            
            {selectedSOS.author?._id !== currentUser?.id && (
              <TouchableOpacity
                style={[styles.panelBtnConnect, connecting && { opacity: 0.7 }]}
                onPress={async () => {
                  if (!currentUser) {
                    Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để có thể đề nghị hỗ trợ.");
                    router.push("/login");
                    return;
                  }
                  try {
                    setConnecting(true);
                    await requestToHelpSOS(selectedSOS.id);
                    Alert.alert("Thành công", "Đã gửi yêu cầu hỗ trợ! Hãy chờ người dùng phản hồi.");
                  } catch (e: any) {
                    Alert.alert("Lỗi", e.message || "Không thể gửi yêu cầu.");
                  } finally {
                    setConnecting(false);
                  }
                }}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="hand-right" size={18} color="#fff" />
                    <Text style={styles.panelBtnText}>Hỗ trợ</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Bottom Panel — Agency detail ── */}
      {selectedAgency && (
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: agencyPanelTranslateY }] }]}
        >
          <TouchableOpacity style={styles.panelClose} onPress={closeAgencyPanel}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>

          {/* Header badge */}
          <View style={[styles.agencyBadge, { backgroundColor: AGENCY_TYPE_COLORS[selectedAgency.type] ?? "#607D8B" }]}>
            <Ionicons
              name={AGENCY_TYPE_IONICONS[selectedAgency.type] as any ?? "help-circle"}
              size={14}
              color="#fff"
            />
            <Text style={styles.agencyBadgeText}>
              {AGENCY_TYPE_ICONS[selectedAgency.type]} {AGENCY_TYPE_LABELS[selectedAgency.type]}
            </Text>
          </View>

          <Text style={styles.agencyName}>{selectedAgency.name}</Text>
          <Text style={styles.agencyAddress} numberOfLines={2}>
            📍 {selectedAgency.address}
          </Text>
          {selectedAgency.distanceKm !== undefined && (
            <Text style={styles.agencyDist}>
              📏 Cách bạn {selectedAgency.distanceKm < 1
                ? `${Math.round(selectedAgency.distanceKm * 1000)}m`
                : `${selectedAgency.distanceKm.toFixed(1)}km`}
            </Text>
          )}

          <View style={styles.panelActions}>
            {/* Nút Gọi điện */}
            <TouchableOpacity
              style={[styles.agencyCallBtn, { backgroundColor: AGENCY_TYPE_COLORS[selectedAgency.type] ?? "#607D8B" }]}
              onPress={() => callAgency(selectedAgency.phone, selectedAgency.name)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.panelBtnText}>Gọi {selectedAgency.phone}</Text>
            </TouchableOpacity>

            {/* Nút Chỉ đường */}
            <TouchableOpacity
              style={styles.panelBtnNav}
              onPress={() => openDirections(selectedAgency.lat, selectedAgency.lng)}
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
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  /* ── SOS Marker ── */
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
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
  warningIcon: { marginTop: 4 },

  /* ── Agency Marker ── */
  agencyMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  agencyEmoji: {
    fontSize: 16,
    lineHeight: 20,
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

  /* ── SOS Count Badge ── */
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
  sosCountText: { color: "#fff", fontWeight: "700", fontSize: 12 },

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

  /* ── Loader ── */
  loader: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 20,
  },

  incomingRequestBadge: {
    position: "absolute",
    top: 150,
    alignSelf: "center",
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    zIndex: 999,
    gap: 8,
  },
  incomingRequestText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* ── Bottom Panel (shared) ── */
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
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
  panelAuthor: { fontSize: 14, color: "#444", fontWeight: "600", marginBottom: 4 },
  panelDesc: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 4 },
  panelAddr: { fontSize: 12, color: "#888", marginBottom: 10 },
  panelActions: { flexDirection: "row", gap: 10, marginTop: 8 },
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
  panelBtnConnect: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9500",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  panelBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  /* ── Agency Panel specific ── */
  agencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  agencyBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  agencyName: { fontSize: 17, fontWeight: "800", color: "#1a1a2e", marginBottom: 6 },
  agencyAddress: { fontSize: 13, color: "#555", marginBottom: 4 },
  agencyDist: { fontSize: 12, color: "#888", marginBottom: 10 },
  agencyCallBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
});

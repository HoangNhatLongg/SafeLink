import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AgencyCard from "@/features/emergency/AgencyCard";
import { FilterBar, type FilterMode } from "@/features/emergency/FilterBar";
import ContributeModal from "@/features/emergency/ContributeModal";
import MapSection from "@/features/emergency/MapSection";
import { getUserLocation } from "@/features/emergency/locationService";
import { fetchDirectory, fetchNearbyDirectory } from "@/features/emergency/directoryApi";
import { fetchVolunteers } from "@/features/emergency/volunteerApi";
import type { Agency, AgencyType } from "@/features/emergency/types";
import type { VolunteerUnit } from "@/features/emergency/volunteerTypes";
import {
  VOLUNTEER_TYPE_ICONS,
  VOLUNTEER_TYPE_LABELS,
  VOLUNTEER_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_ICONS,
  ENTITY_KIND_LABELS,
} from "@/features/emergency/volunteerTypes";
import { AGENCIES as FALLBACK_AGENCIES, mapFallback } from "@/features/emergency/agencyData";
import {
  cacheDirectoryData,
  getCachedDirectory,
  isCacheValid,
} from "@/features/emergency/offlineStorage";
import { useRouter } from "expo-router";
import { getToken } from "@/features/auth/utils/storage";

export default function DirectoryScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const [mode, setMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<AgencyType | "">("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [allAgencies, setAllAgencies] = useState<Agency[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheDate, setCacheDate] = useState<Date | null>(null);

  const [contributeVisible, setContributeVisible] = useState(false);
  const [showMap, setShowMap] = useState(true);
  // Tab: 'official' = danh bạ chính thức, 'volunteer' = đội tình nguyện
  const [directoryTab, setDirectoryTab] = useState<'official' | 'volunteer'>('official');
  const [volunteers, setVolunteers] = useState<VolunteerUnit[]>([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [volunteersSearch, setVolunteersSearch] = useState("");
  const [expandedVolunteer, setExpandedVolunteer] = useState<string | null>(null);

  // Kiểm tra đăng nhập trước khi mở form đóng góp
  const handleContribute = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Để đóng góp thông tin vào danh bạ, bạn cần đăng nhập trước.",
        [
          { text: "Huỷ", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/login") },
        ]
      );
      return;
    }
    setContributeVisible(true);
  }, [router]);

  // ── Init location ──────────────────────────────
  useEffect(() => {
    getUserLocation()
      .then(setLocation)
      .catch(() => setLocation(null))
      .finally(() => setLocationLoading(false));
  }, []);

  // ── Client-side filter (luôn chạy khi allAgencies hoặc filter thay đổi) ──
  useEffect(() => {
    let filtered = allAgencies;
    if (selectedType) {
      filtered = filtered.filter((a) => a.type === selectedType);
    }
    if (search && mode !== "nearby") {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.address.toLowerCase().includes(q) ||
          a.phone.includes(q)
      );
    }
    setAgencies(filtered);
  }, [allAgencies, selectedType, search, mode]);

  // ── Load data (chỉ gọi API, không filter tại đây) ────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let result: { items: Agency[] };

      if (mode === "nearby" && location) {
        result = await fetchNearbyDirectory({
          lat: location.latitude,
          lng: location.longitude,
          radius: 5,
        });
      } else {
        result = await fetchDirectory({
          province: mode === "location" ? selectedProvince || undefined : undefined,
          district: mode === "location" ? selectedDistrict || undefined : undefined,
          limit: 200,
        });
      }

      setAllAgencies(result.items);
      setIsOffline(false);   // Xóa banner nếu trước đó bị offline
      setCacheDate(null);
      // Lưu cache để dùng khi offline sau này
      if (mode === "all" || mode === "location") {
        cacheDirectoryData(result.items);
      }
    } catch (err) {
      // Thử đọc cache trước
      const cache = await getCachedDirectory();
      if (cache && cache.items.length > 0) {
        setAllAgencies(cache.items);
        // Chỉ show banner nếu cache đã cũ hơn 1 giờ
        if (Date.now() - cache.timestamp > 60 * 60 * 1000) {
          setIsOffline(true);
          setCacheDate(new Date(cache.timestamp));
        } else {
          // Cache còn mới (<1h) — dùng ngầm, không hiện banner
          setIsOffline(false);
        }
      } else {
        // Không có cache → dùng mock data BI MẶT (không show banner)
        // Đây là lần đầu mở app hoặc chưa từng kết nối server
        setAllAgencies(FALLBACK_AGENCIES.map(mapFallback));
        setIsOffline(false);  // ← không hiện banner với dữ liệu mặc định
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, location, selectedProvince, selectedDistrict]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 400);
    return () => clearTimeout(timer);
  }, [loadData]);

  // ── Load danh sách đội tình nguyện ──────────────────────
  const loadVolunteers = useCallback(async () => {
    try {
      setVolunteersLoading(true);
      const { items } = await fetchVolunteers({ limit: 100 });
      setVolunteers(items);
    } catch {
      // Lỗi load volunteers — không cần thông báo to vì tab chính thức vẫn hiện
    } finally {
      setVolunteersLoading(false);
    }
  }, []);


  // ── Derived: unique provinces/districts ─────────────────────
  const provinces = useMemo(() => {
    const all = [...new Set(allAgencies.map((a) => a.province).filter(Boolean))].sort();
    return all;
  }, [allAgencies]);

  // We also load districts from server data; re-use agencies already loaded
  const districts = useMemo(() => {
    if (!selectedProvince) return [];
    const all = [...new Set(
      allAgencies
        .filter((a) => a.province === selectedProvince && a.district)
        .map((a) => a.district!)
    )].sort();
    return all;
  }, [agencies, selectedProvince]);

  // ── Render ─────────────────────────────────────────────────
  const keyExtractor = useCallback((item: Agency) => item._id ?? item.name, []);

  const renderItem = useCallback(({ item }: { item: Agency }) => (
    <AgencyCard item={item} />
  ), []);

  // Dùng useMemo để header re-render đúng khi agencies / filter thay đổi
  const listHeader = useMemo(() => (
    <>
      {showMap && location && (
        <MapSection location={location} agencies={agencies} />
      )}
      <FilterBar
        mode={mode}
        onModeChange={setMode}
        search={search}
        onSearchChange={setSearch}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedProvince={selectedProvince}
        onProvinceChange={setSelectedProvince}
        selectedDistrict={selectedDistrict}
        onDistrictChange={setSelectedDistrict}
        provinces={provinces}
        districts={districts}
      />
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {agencies.length} đơn vị
          {mode === "nearby" ? " gần bạn" : ""}
          {selectedType ? ` · ${selectedType.toUpperCase()}` : ""}
        </Text>
        <TouchableOpacity onPress={() => setShowMap((v) => !v)} style={styles.toggleMapBtn}>
          <Ionicons name={showMap ? "eye-off" : "map"} size={15} color="#e53935" />
          <Text style={styles.toggleMapText}>{showMap ? "Ẩn bản đồ" : "Hiện bản đồ"}</Text>
        </TouchableOpacity>
      </View>
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [agencies, showMap, location, mode, search, selectedType, selectedProvince, selectedDistrict, provinces, districts]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}> Danh Bạ Khẩn Cấp</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.savedBtn}
            onPress={() => router.push("/saved-directory")}
          >
            <Ionicons name="bookmark" size={16} color="#e53935" />
            <Text style={styles.savedBtnText}>Đã lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contributeBtn}
            onPress={handleContribute}
          >
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.contributeBtnText}>Đóng góp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push("/register-volunteer")}
          >
            <Ionicons name="shield-half-outline" size={16} color="#2E7D32" />
            <Text style={styles.registerBtnText}>Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher: Chính thức vs Tình nguyện */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, directoryTab === 'official' && styles.tabBtnActive]}
          onPress={() => setDirectoryTab('official')}
        >
          <Text style={[styles.tabBtnText, directoryTab === 'official' && styles.tabBtnTextActive]}>
            🏛️ Chính thức
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, directoryTab === 'volunteer' && styles.tabBtnActiveGreen]}
          onPress={() => {
            setDirectoryTab('volunteer');
            if (volunteers.length === 0) loadVolunteers();
          }}
        >
          <Text style={[styles.tabBtnText, directoryTab === 'volunteer' && styles.tabBtnTextActiveGreen]}>
            🤝 Tình nguyện
          </Text>
        </TouchableOpacity>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>
            {cacheDate
              ? `Đang hiển thị dữ liệu củ (${cacheDate.toLocaleDateString("vi-VN")})`
              : "Không có kết nối — đang dùng dữ liệu mẫu"}
          </Text>
        </View>
      )}

      {/* Content — Official Directory */}
      {directoryTab === 'official' && (
        <>
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
              <Text style={styles.offlineBannerText}>
                {cacheDate
                  ? `Đang hiển thị dữ liệu củ (${cacheDate.toLocaleDateString("vi-VN")})`
                  : "Không có kết nối — đang dùng dữ liệu mẫu"}
              </Text>
            </View>
          )}
          {loading && agencies.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#e53935" />
              <Text style={styles.loadingText}>Đang tải danh bạ...</Text>
            </View>
          ) : (
            <FlatList
              data={agencies}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ fontSize: 40 }}>🔍</Text>
                  <Text style={styles.emptyText}>Không tìm thấy đơn vị nào</Text>
                  <Text style={styles.emptyHint}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Content — Volunteer List */}
      {directoryTab === 'volunteer' && (
        <>
          {volunteersLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>Đang tải đội tình nguyện...</Text>
            </View>
          ) : volunteers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🤝</Text>
              <Text style={styles.emptyText}>Chưa có đội tình nguyện nào</Text>
              <Text style={styles.emptyHint}>Hãy là người đầu tiên đăng ký!</Text>
              <TouchableOpacity
                style={styles.registerPromptBtn}
                onPress={() => router.push("/register-volunteer")}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.registerPromptText}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={volunteers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isExpanded = expandedVolunteer === item._id;
                const svcColor = SERVICE_TYPE_COLORS[item.serviceType];
                return (
                  <TouchableOpacity
                    style={styles.volunteerCard}
                    activeOpacity={0.7}
                    onPress={() => setExpandedVolunteer(isExpanded ? null : item._id)}
                  >
                    {/* Header row */}
                    <View style={styles.volunteerHeaderRow}>
                      <View style={[styles.volunteerTypeIcon, { backgroundColor: VOLUNTEER_TYPE_COLORS[item.unitType] + "22" }]}>
                        <Text style={{ fontSize: 22 }}>{VOLUNTEER_TYPE_ICONS[item.unitType]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.volunteerNameRow}>
                          <Text style={styles.volunteerName} numberOfLines={1}>{item.unitName}</Text>
                          <View style={[styles.typePill, { backgroundColor: VOLUNTEER_TYPE_COLORS[item.unitType] }]}>
                            <Text style={styles.typePillText}>{VOLUNTEER_TYPE_LABELS[item.unitType]}</Text>
                          </View>
                        </View>
                        <Text style={styles.volunteerContact}>
                          👤 {item.contactName} · 📞 {item.phone}
                        </Text>
                        <Text style={styles.volunteerAddress} numberOfLines={1}>
                          📍 {item.address}, {item.province}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#999"
                        style={{ marginLeft: 4 }}
                      />
                    </View>

                    {/* Fee badge (always visible) */}
                    <View style={[styles.volFeeBadge, { backgroundColor: svcColor.bg, borderColor: svcColor.border }]}>
                      <Text style={{ fontSize: 14 }}>{SERVICE_TYPE_ICONS[item.serviceType]}</Text>
                      <Text style={[styles.volFeeBadgeText, { color: svcColor.text }]}>
                        {SERVICE_TYPE_LABELS[item.serviceType]}
                      </Text>
                      {!!item.priceNote && (
                        <Text style={[styles.volFeeNote, { color: svcColor.text }]}> — {item.priceNote}</Text>
                      )}
                    </View>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <View style={styles.volDetailSection}>
                        {/* Hình thức */}
                        <View style={styles.volDetailRow}>
                          <Ionicons name="people" size={16} color="#7B1FA2" />
                          <Text style={styles.volDetailLabel}>Hình thức:</Text>
                          <Text style={styles.volDetailValue}>{ENTITY_KIND_LABELS[item.entityKind]}</Text>
                        </View>

                        {/* Số điện thoại - bấm gọi */}
                        <TouchableOpacity
                          style={styles.volDetailRow}
                          onPress={() => Linking.openURL(`tel:${item.phone}`)}
                        >
                          <Ionicons name="call" size={16} color="#2E7D32" />
                          <Text style={styles.volDetailLabel}>Điện thoại:</Text>
                          <Text style={[styles.volDetailValue, { color: "#1565C0", textDecorationLine: "underline" }]}>{item.phone}</Text>
                        </TouchableOpacity>

                        {/* Địa chỉ đầy đủ */}
                        <View style={styles.volDetailRow}>
                          <Ionicons name="location" size={16} color="#D32F2F" />
                          <Text style={styles.volDetailLabel}>Địa chỉ:</Text>
                          <Text style={[styles.volDetailValue, { flex: 1 }]}>
                            {[item.address, item.ward, item.district, item.province].filter(Boolean).join(", ")}
                          </Text>
                        </View>

                        {/* Mô tả */}
                        {!!item.description && (
                          <View style={styles.volDetailRow}>
                            <Ionicons name="document-text" size={16} color="#546E7A" />
                            <Text style={styles.volDetailLabel}>Mô tả:</Text>
                            <Text style={[styles.volDetailValue, { flex: 1 }]}>{item.description}</Text>
                          </View>
                        )}

                        {/* Khu vực phục vụ */}
                        {!!item.serviceArea && (
                          <View style={styles.volDetailRow}>
                            <Ionicons name="map" size={16} color="#00838F" />
                            <Text style={styles.volDetailLabel}>Khu vực:</Text>
                            <Text style={[styles.volDetailValue, { flex: 1 }]}>{item.serviceArea}</Text>
                          </View>
                        )}

                        {/* Thời gian hoạt động */}
                        {!!item.availableTime && (
                          <View style={styles.volDetailRow}>
                            <Ionicons name="time" size={16} color="#F57F17" />
                            <Text style={styles.volDetailLabel}>Hoạt động:</Text>
                            <Text style={styles.volDetailValue}>{item.availableTime}</Text>
                          </View>
                        )}

                        {/* Ghi chú */}
                        {!!item.note && (
                          <View style={styles.volDetailRow}>
                            <Ionicons name="chatbubble-ellipses" size={16} color="#78909C" />
                            <Text style={styles.volDetailLabel}>Ghi chú:</Text>
                            <Text style={[styles.volDetailValue, { flex: 1 }]}>{item.note}</Text>
                          </View>
                        )}

                        {/* Action buttons */}
                        <View style={styles.volActionRow}>
                          <TouchableOpacity
                            style={[styles.volActionBtn, { backgroundColor: "#2E7D32" }]}
                            onPress={() => Linking.openURL(`tel:${item.phone}`)}
                          >
                            <Ionicons name="call" size={16} color="#fff" />
                            <Text style={styles.volActionText}>Gọi ngay</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.volActionBtn, { backgroundColor: "#1565C0" }]}
                            onPress={() => {
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=driving`;
                              Linking.openURL(url);
                            }}
                          >
                            <Ionicons name="navigate" size={16} color="#fff" />
                            <Text style={styles.volActionText}>Chỉ đường</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={volunteersLoading}
                  onRefresh={loadVolunteers}
                  colors={["#2E7D32"]}
                />
              }
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={styles.volunteerCount}>
                  {volunteers.length} đội tình nguyện đang hoạt động
                </Text>
              }
            />
          )}
        </>
      )}

      {/* Contribute Modal */}
      <ContributeModal
        visible={contributeVisible}
        onClose={() => setContributeVisible(false)}
        userLocation={location}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  savedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#e53935",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  savedBtnText: { color: "#e53935", fontWeight: "600", fontSize: 13 },
  contributeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#e53935",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  contributeBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#2E7D32",
  },
  registerBtnText: { color: "#2E7D32", fontWeight: "600", fontSize: 12 },

  // Tab switcher
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  tabBtnActive: { backgroundColor: "#e53935" },
  tabBtnActiveGreen: { backgroundColor: "#2E7D32" },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  tabBtnTextActive: { color: "#fff" },
  tabBtnTextActiveGreen: { color: "#fff" },

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F57C00",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineBannerText: { color: "#fff", fontSize: 12, flex: 1 },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
  },
  countText: { fontSize: 13, color: "#666", fontWeight: "500" },
  toggleMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleMapText: { fontSize: 12, color: "#e53935", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#555", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#999", marginTop: 6, textAlign: "center" },

  // Register prompt button (empty volunteer state)
  registerPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  registerPromptText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Volunteer cards
  volunteerCount: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 2,
  },
  volunteerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  volunteerHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  volunteerTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  volunteerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  volunteerName: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", flex: 1 },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typePillText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  volunteerContact: { fontSize: 12, color: "#555", marginBottom: 3 },
  volunteerAddress: { fontSize: 12, color: "#777", marginBottom: 3 },

  // Fee badge
  volFeeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  volFeeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  volFeeNote: {
    fontSize: 12,
    fontStyle: "italic",
  },

  // Expanded detail
  volDetailSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  volDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 7,
  },
  volDetailLabel: {
    fontSize: 13,
    color: "#999",
    fontWeight: "600",
    minWidth: 80,
  },
  volDetailValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    lineHeight: 20,
  },

  // Action buttons
  volActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  volActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  volActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
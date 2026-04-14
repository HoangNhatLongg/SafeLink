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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AgencyCard from "@/features/emergency/AgencyCard";
import { FilterBar, type FilterMode } from "@/features/emergency/FilterBar";
import ContributeModal from "@/features/emergency/ContributeModal";
import MapSection from "@/features/emergency/MapSection";
import { getUserLocation } from "@/features/emergency/locationService";
import { fetchDirectory, fetchNearbyDirectory } from "@/features/emergency/directoryApi";
import type { Agency, AgencyType } from "@/features/emergency/types";
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
        </View>
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

      {/* Content */}
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
});
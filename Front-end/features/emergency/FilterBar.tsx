import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AgencyType } from "./types";
import { AGENCY_TYPE_LABELS, AGENCY_TYPE_COLORS, AGENCY_TYPE_ICONS } from "./types";

export type FilterMode = "all" | "nearby" | "location";

interface Props {
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  search: string;
  onSearchChange: (text: string) => void;
  selectedType: AgencyType | "";
  onTypeChange: (type: AgencyType | "") => void;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  provinces: string[];
  districts: string[];
}

const TYPES: Array<{ key: AgencyType; label: string }> = [
  { key: "csgt",           label: "CSGT" },
  { key: "pccc",           label: "PCCC" },
  { key: "canh_sat",       label: "Công An" },
  { key: "benh_vien",      label: "Bệnh Viện" },
  { key: "cuu_thuong",     label: "Cấp Cứu" },
  { key: "sua_xe_cap_cuu", label: "Sửa Xe" },
  { key: "ho_tro_sos",     label: "Hỗ Trợ SOS" },
  { key: "khac",           label: "Khác" },
];

export function FilterBar({
  mode,
  onModeChange,
  search,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedProvince,
  onProvinceChange,
  selectedDistrict,
  onDistrictChange,
  provinces,
  districts,
}: Props) {
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm đơn vị, địa chỉ..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={onSearchChange}
          />
          {search ? (
            <TouchableOpacity onPress={() => onSearchChange("")}>
              <Ionicons name="close-circle" size={18} color="#bbb" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Mode selector */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "nearby" && styles.modeBtnActive]}
          onPress={() => onModeChange(mode === "nearby" ? "all" : "nearby")}
        >
          <Ionicons name="location" size={14} color={mode === "nearby" ? "#fff" : "#555"} />
          <Text style={[styles.modeBtnText, mode === "nearby" && styles.modeBtnTextActive]}>
            Gần tôi (5km)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mode === "location" && styles.modeBtnActive]}
          onPress={() => onModeChange(mode === "location" ? "all" : "location")}
        >
          <Ionicons name="filter" size={14} color={mode === "location" ? "#fff" : "#555"} />
          <Text style={[styles.modeBtnText, mode === "location" && styles.modeBtnTextActive]}>
            Lọc tỉnh/huyện
          </Text>
        </TouchableOpacity>
      </View>

      {/* Province/District pickers (only when mode=location) */}
      {mode === "location" && (
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationPickerBtn}
            onPress={() => setShowProvincePicker(true)}
          >
            <Text style={styles.locationPickerText} numberOfLines={1}>
              {selectedProvince || "Chọn Tỉnh/TP"}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationPickerBtn}
            onPress={() => setShowDistrictPicker(true)}
            disabled={!selectedProvince}
          >
            <Text style={[styles.locationPickerText, !selectedProvince && { color: "#bbb" }]} numberOfLines={1}>
              {selectedDistrict || "Chọn Huyện"}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        <TouchableOpacity
          style={[styles.typeChip, selectedType === "" && styles.typeChipAllActive]}
          onPress={() => onTypeChange("")}
        >
          <Text style={[styles.typeChipText, selectedType === "" && styles.typeChipTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        {TYPES.map((t) => {
          const active = selectedType === t.key;
          const color = AGENCY_TYPE_COLORS[t.key];
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeChip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => onTypeChange(active ? "" : t.key)}
            >
              <Text style={styles.typeChipEmoji}>{AGENCY_TYPE_ICONS[t.key]}</Text>
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Province picker modal */}
      <PickerModal
        visible={showProvincePicker}
        title="Chọn Tỉnh/TP"
        items={provinces}
        selected={selectedProvince}
        onSelect={(v) => {
          onProvinceChange(v);
          onDistrictChange("");
          setShowProvincePicker(false);
        }}
        onClose={() => setShowProvincePicker(false)}
        showAll
      />

      {/* District picker modal */}
      <PickerModal
        visible={showDistrictPicker}
        title="Chọn Huyện/Quận"
        items={districts}
        selected={selectedDistrict}
        onSelect={(v) => {
          onDistrictChange(v);
          setShowDistrictPicker(false);
        }}
        onClose={() => setShowDistrictPicker(false)}
        showAll
      />
    </View>
  );
}

function PickerModal({
  visible, title, items, selected, onSelect, onClose, showAll,
}: {
  visible: boolean;
  title: string;
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  showAll?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={showAll ? ["", ...items] : items}
            keyExtractor={(item, i) => item || `all-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[pickerStyles.item, selected === item && pickerStyles.itemActive]}
                onPress={() => onSelect(item)}
              >
                <Text style={[pickerStyles.itemText, selected === item && pickerStyles.itemTextActive]}>
                  {item || "Tất cả"}
                </Text>
                {selected === item && <Ionicons name="checkmark" size={18} color="#e53935" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchRow: { paddingHorizontal: 12, marginBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#222" },
  modeRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#efefef",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modeBtnActive: { backgroundColor: "#e53935", borderColor: "#e53935" },
  modeBtnText: { fontSize: 13, color: "#555", fontWeight: "500" },
  modeBtnTextActive: { color: "#fff" },
  locationRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  locationPickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  locationPickerText: { fontSize: 13, color: "#333", flex: 1 },
  typeRow: { marginBottom: 10 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  typeChipAllActive: { backgroundColor: "#e53935", borderColor: "#e53935" },
  typeChipEmoji: { fontSize: 13 },
  typeChipText: { fontSize: 12, color: "#555", fontWeight: "500" },
  typeChipTextActive: { color: "#fff" },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  itemActive: { backgroundColor: "#fdf1f1" },
  itemText: { fontSize: 15, color: "#333" },
  itemTextActive: { color: "#e53935", fontWeight: "600" },
});

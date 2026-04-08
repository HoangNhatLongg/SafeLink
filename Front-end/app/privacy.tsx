import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

/* ─── Types ─── */
type Visibility = "public" | "friends" | "private";

interface PrivacyItem {
  value: Visibility;
  label: string;
  description: string;
  icon: string;
  iconColor: string;
}

/* ─── Options ─── */
const OPTIONS: PrivacyItem[] = [
  {
    value: "public",
    label: "Công khai",
    description: "Mọi người đều có thể xem bài viết này.",
    icon: "globe",
    iconColor: "#1877F2",
  },
  {
    value: "friends",
    label: "Bạn bè",
    description: "Chỉ bạn bè (theo dõi lẫn nhau) mới xem được.",
    icon: "people",
    iconColor: "#31A24C",
  },
  {
    value: "private",
    label: "Chỉ mình tôi",
    description: "Chỉ mình bạn xem được.",
    icon: "lock-closed",
    iconColor: "#90949C",
  },
];

/* ─── Main Screen ─── */
interface PrivacyScreenProps {
  initialValue?: Visibility;
  onSelect?: (value: Visibility) => void;
}

export default function PrivacyScreen({
  initialValue = "public",
  onSelect,
}: PrivacyScreenProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Visibility>(initialValue);

  const handleDone = () => {
    if (onSelect) {
      onSelect(selected);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#050505" />
        </TouchableOpacity>
        <Text style={styles.title}>Ai có thể xem bài viết?</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Bài viết của bạn sẽ hiển thị theo cài đặt quyền riêng tư bạn chọn bên dưới.
        </Text>

        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              activeOpacity={0.7}
              onPress={() => setSelected(opt.value)}
            >
              <View style={[styles.iconWrap, { backgroundColor: opt.iconColor + "22" }]}>
                <Ionicons name={opt.icon as any} size={22} color={opt.iconColor} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
              <View style={styles.radio}>
                {isSelected ? (
                  <Ionicons name="radio-button-on" size={24} color="#1877F2" />
                ) : (
                  <Ionicons name="radio-button-off" size={24} color="#BEC3C9" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={handleDone}
        >
          <Text style={styles.doneText}>Xong</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F2F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DADDE1",
  },
  closeBtn: { padding: 6 },
  title: { fontSize: 17, fontWeight: "700", color: "#050505" },
  spacer: { width: 38 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 30 },
  subtitle: {
    fontSize: 14,
    color: "#65676B",
    lineHeight: 20,
    marginBottom: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionSelected: {
    borderColor: "#1877F2",
    backgroundColor: "#E7F3FF",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: "600", color: "#050505", marginBottom: 3 },
  optionDesc: { fontSize: 13, color: "#65676B", lineHeight: 18 },
  radio: { flexShrink: 0 },
  footer: {
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DADDE1",
  },
  doneBtn: {
    backgroundColor: "#1877F2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  doneText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

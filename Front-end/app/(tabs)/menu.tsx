import { getUserJson, clearSession, type StoredUser } from "@/features/auth/utils/storage";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { logoutApi } from "@/features/auth/services/authApi";
import { Alert } from "react-native";

export default function MenuTab() {
  const router = useRouter();
  const [me, setMe] = useState<StoredUser | null>(null);

  useFocusEffect(
    useCallback(() => {
      getUserJson().then(setMe);
    }, [])
  );

  const logout = () =>
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await logoutApi();
          } catch {}
          await clearSession();
          router.replace("/login");
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>Tài khoản</Text>
        <Text style={styles.sub}>{me?.email || "—"}</Text>

        <MenuRow
          icon="person-circle-outline"
          label="Hồ sơ"
          onPress={() => router.push("/profile")}
        />
        <MenuRow
          icon="bookmark-outline"
          label="Bài viết đã lưu"
          onPress={() => router.push("/saved-posts")}
        />
        <MenuRow
          icon="navigate-outline"
          label="Bài viết gần bạn (GPS)"
          onPress={() => router.push("/nearby")}
        />
        <MenuRow
          icon="log-out-outline"
          label="Đăng xuất"
          onPress={logout}
        />
        {["moderator", "admin"].includes(me?.role || "") ? (
          <MenuRow
            icon="shield-checkmark-outline"
            label="Duyệt báo cáo"
            onPress={() => router.push("/moderation")}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color="#1877f2" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
    
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f3f5" },
  wrap: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  sub: { color: "#666", marginBottom: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 16, color: "#222" },
});

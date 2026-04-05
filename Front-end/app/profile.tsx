import { logoutApi } from "@/features/auth/services/authApi";
import { clearSession, saveUserJson } from "@/features/auth/utils/storage";
import { fetchMe, updateMe } from "@/features/user/services/userApi";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const { user } = await fetchMe();
        if (c) return;
        setName(user.name || "");
        setAvatar(user.avatar || "");
        setEmail(user.email || "");
        setRole(user.role || "user");
      } catch (e: any) {
        Alert.alert("Lỗi", e.message, [{ text: "OK", onPress: () => router.back() }]);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [router]);

  const save = async () => {
    setSaving(true);
    try {
      const { user } = await updateMe({
        name: name.trim() || undefined,
        avatar: avatar.trim(),
      });
      await saveUserJson({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      });
      Alert.alert("", "Đã lưu hồ sơ.");
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await logoutApi();
          } catch {
            /* vẫn xóa local */
          }
          await clearSession();
          router.replace("/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1877f2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrap}>
          <Image
            source={
              avatar && avatar.startsWith("http")
                ? { uri: avatar }
                : require("@/Uploads/AnhDaiDien.jpg")
            }
            style={styles.avatar}
          />
        </View>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.role}>Vai trò: {role}</Text>

        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tên" />

        <Text style={styles.label}>URL ảnh đại diện</Text>
        <TextInput
          style={styles.input}
          value={avatar}
          onChangeText={setAvatar}
          placeholder="https://..."
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lưu thay đổi</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.outline} onPress={logout}>
          <Text style={styles.outlineText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  email: { textAlign: "center", color: "#555", marginBottom: 4 },
  role: { textAlign: "center", color: "#888", marginBottom: 20, fontSize: 13 },
  label: { fontWeight: "600", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  btn: {
    backgroundColor: "#1877f2",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  outline: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c00",
    alignItems: "center",
  },
  outlineText: { color: "#c00", fontWeight: "600" },
});

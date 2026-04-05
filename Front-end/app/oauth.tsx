import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/**
 * Màn hình trung gian khi redirect OAuth về app (safelink://oauth?...).
 * openAuthSessionAsync thường đã xử lý token; route này đảm bảo maybeCompleteAuthSession chạy.
 */
export default function OAuthBridgeScreen() {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    const t = setTimeout(() => router.replace("/(tabs)"), 800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.box}>
      <ActivityIndicator size="large" color="#1877f2" />
      <Text style={styles.txt}>Đang xử lý đăng nhập…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  txt: { marginTop: 12, color: "#666" },
});

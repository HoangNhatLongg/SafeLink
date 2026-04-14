import { API_BASE } from "@/constants/api";
import { fetchMe } from "@/features/user/services/userApi";
import { saveToken, saveUserJson } from "@/features/auth/utils/storage";
import { FontAwesome } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SocialLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const redirectUri = Linking.createURL("oauth");

  const runOAuth = async (provider: "google" | "facebook") => {
    setBusy(provider);
    try {
      const authUrl = `${API_BASE}/api/auth/${provider}?success_url=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        let token: string | null = null;
        try {
          const u = new URL(result.url);
          token = u.searchParams.get("token");
        } catch {
          token = null;
        }
        if (token) {
          await saveToken(token);
          try {
            const { user } = await fetchMe();
            await saveUserJson({
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              role: user.role,
            });
          } catch {
            /* vẫn vào app */
          }
          router.replace("/(tabs)");
          return;
        }
      }

      if (result.type === "dismiss") return;

      Alert.alert(
        "Đăng nhập OAuth",
        `Không lấy được token từ URL trả về.\n\nTrên Back-end, đặt OAUTH_SUCCESS_REDIRECT trùng với:\n${redirectUri}\n\n(Google/Facebook sẽ mở trình duyệt và redirect về app với ?token=...)`
      );
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "OAuth thất bại");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hoặc đăng nhập bằng</Text>
      <Text style={styles.hint} numberOfLines={2}>
        Cần cấu hình OAUTH_SUCCESS_REDIRECT trên server = {redirectUri}
      </Text>

      <TouchableOpacity
        style={[styles.googleButton, busy && { opacity: 0.6 }]}
        disabled={!!busy}
        onPress={() => runOAuth("google")}
      >
        {busy === "google" ? (
          <ActivityIndicator />
        ) : (
          <>
            <Image source={require("@/assets/images/google-color.png")} style={styles.googleIcon} />
            <Text style={styles.googleText}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.facebookBtn, busy && { opacity: 0.6 }]}
        disabled={!!busy}
        onPress={() => runOAuth("facebook")}
      >
        {busy === "facebook" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <FontAwesome name="facebook" size={20} color="#fff" />
            <Text style={styles.facebookText}>Tiếp tục với Facebook</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontSize: 14,
    color: "#666",
  },
  hint: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    gap: 10,
    width: "100%",
    minHeight: 48,
  },
  googleIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  googleText: {
    fontSize: 16,
    color: "#3c4043",
    fontWeight: "500",
  },
  facebookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1877F2",
    borderRadius: 30,
    paddingVertical: 14,
    marginTop: 12,
    gap: 10,
    width: "100%",
    minHeight: 48,
  },
  facebookText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

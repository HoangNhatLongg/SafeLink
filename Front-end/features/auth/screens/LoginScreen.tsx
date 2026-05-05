import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useRouter } from "expo-router";
import { useState } from "react";

import SocialLogin from "../components/SocialLogin";
import { Colors } from "@/constants/theme";
import { API_BASE } from "@/constants/api";

import { loginApi, verifyDeviceApi } from "@/features/auth/services/authApi";
import { saveToken, getDeviceId, saveUserJson } from "@/features/auth/utils/storage";

export default function LoginScreen() {

  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ban state
  const [isBanModalVisible, setIsBanModalVisible] = useState(false);
  const [banInfo, setBanInfo] = useState<{
    banReason: string;
    banExpiresAt: string | null;
    userId: string;
  } | null>(null);
  const [appealText, setAppealText] = useState("");
  const [isAppealStep, setIsAppealStep] = useState(false);
  const [isAppealSending, setIsAppealSending] = useState(false);

  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      const deviceId = await getDeviceId();
      const response = await loginApi(email, password, deviceId);

      if (response.status === 403 && response.data.requireOtp) {
        Alert.alert("Thiết bị mới!", "Vui lòng nhập mã OTP đã gửi qua email.");
        setIsOtpStep(true);
        return;
      }

      // Check if banned
      if (response.status === 403 && response.data.isBanned) {
        setBanInfo({
          banReason: response.data.banReason,
          banExpiresAt: response.data.banExpiresAt,
          userId: response.data.userId,
        });
        setIsBanModalVisible(true);
        return;
      }

      // Fallback for any other 403 error
      if (response.status === 403) {
        throw new Error(response.data.message || "Truy cập bị từ chối.");
      }

      await saveToken(response.data.token);
      const u = response.data.user;
      if (u) {
        await saveUserJson({
          id: u.id,
          email: u.email,
          name: (u as any).name,
          role: (u as any).role,
        });
      }
      router.replace("/(tabs)");

    } catch (error: any) {
      // Also check error response for ban
      if (error?.response?.status === 403 && error?.response?.data?.isBanned) {
        setBanInfo({
          banReason: error.response.data.banReason,
          banExpiresAt: error.response.data.banExpiresAt,
          userId: error.response.data.userId,
        });
        setIsBanModalVisible(true);
        return;
      }
      Alert.alert("Đăng nhập thất bại", error.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleVerifyOtp = async () => {
    try {
      setIsSubmitting(true);
      const deviceId = await getDeviceId();
      const data = await verifyDeviceApi(email, otpCode, deviceId);

      await saveToken(data.token);
      const u = data.user;
      if (u) {
        await saveUserJson({
          id: u.id,
          email: u.email,
          name: (u as any).name,
          role: (u as any).role,
        });
      }
      router.replace("/(tabs)");

    } catch (error: any) {
      Alert.alert("Xác thực thất bại", error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSendAppeal = async () => {
    if (!appealText.trim() || !banInfo?.userId) return;
    try {
      setIsAppealSending(true);
      const res = await fetch(`${API_BASE}/api/auth/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: banInfo.userId, reason: appealText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Thành công", data.message || "Khiếu nại đã được gửi. Vui lòng đợi phản hồi.");
        setIsAppealStep(false);
        setAppealText("");
        setIsBanModalVisible(false);
      } else {
        Alert.alert("Lỗi", data.message || "Không thể gửi khiếu nại");
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err.message || "Không thể kết nối đến máy chủ");
    } finally {
      setIsAppealSending(false);
    }
  };

  const formatBanExpiry = (dateStr: string | null) => {
    if (!dateStr) return "Vĩnh viễn";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={{
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: theme.background
    }}>
      <Text style={{
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 30,
        color: theme.text
      }}>
        SafeLink
      </Text>

      {!isOtpStep ? (
        <>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            style={{
              backgroundColor: theme.input,
              padding: 14,
              borderRadius: 10,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.border,
              color: theme.text
            }}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{
              backgroundColor: theme.input,
              padding: 14,
              borderRadius: 10,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: theme.border,
              color: theme.text
            }}
          />

          <TouchableOpacity
            style={{ alignSelf: "flex-end", marginBottom: 20 }}
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={{ color: theme.primary, fontWeight: "500" }}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isSubmitting}
            style={{
              backgroundColor: theme.primary,
              padding: 16,
              borderRadius: 30,
              alignItems: "center",
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            placeholder="Nhập mã OTP (từ Email)"
            placeholderTextColor="#888"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            style={{
              backgroundColor: theme.input,
              padding: 14,
              borderRadius: 10,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
              color: theme.text
            }}
          />

          <TouchableOpacity
            onPress={handleVerifyOtp}
            disabled={isSubmitting}
            style={{
              backgroundColor: theme.primary,
              padding: 16,
              borderRadius: 30,
              alignItems: "center",
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {isSubmitting ? "Đang kiểm tra..." : "Xác thực Thiết bị"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={() => router.push("/register")}
        style={{ marginTop: 20 }}
      >
        <Text style={{
          textAlign: "center",
          color: theme.text
        }}>
          Chưa có tài khoản? Đăng ký
        </Text>
      </TouchableOpacity>

      <SocialLogin />

      {/* Ban Modal */}
      <Modal
        visible={isBanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setIsBanModalVisible(false); setIsAppealStep(false); }}
      >
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 24,
        }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%" }}
          >
            <View style={{
              backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#fff",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              alignSelf: "center",
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
            }}>
              {!isAppealStep ? (
                <>
                  {/* Icon */}
                  <View style={{ alignItems: "center", marginBottom: 16 }}>
                    <View style={{
                      backgroundColor: "#FEE2E2",
                      borderRadius: 50,
                      width: 60,
                      height: 60,
                      justifyContent: "center",
                      alignItems: "center",
                    }}>
                      <Text style={{ fontSize: 28 }}>🚫</Text>
                    </View>
                  </View>

                  <Text style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#DC2626",
                    marginBottom: 8,
                  }}>
                    Tài khoản đã bị khóa
                  </Text>

                  <Text style={{
                    fontSize: 14,
                    color: colorScheme === "dark" ? "#aaa" : "#666",
                    textAlign: "center",
                    marginBottom: 20,
                  }}>
                    Tài khoản của bạn đã bị khóa bởi Ban quản trị.
                  </Text>

                  {/* Reason */}
                  <View style={{
                    backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#F9FAFB",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}>
                    <Text style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                      Lý do:
                    </Text>
                    <Text style={{ fontSize: 15, color: theme.text, fontWeight: "600" }}>
                      {banInfo?.banReason || "Không rõ"}
                    </Text>
                  </View>

                  {/* Expiry */}
                  <View style={{
                    backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#F9FAFB",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <Text style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                      Thời hạn khóa:
                    </Text>
                    <Text style={{ fontSize: 15, color: theme.text, fontWeight: "600" }}>
                      {banInfo?.banExpiresAt
                        ? `Đến ${formatBanExpiry(banInfo.banExpiresAt)}`
                        : "Vĩnh viễn"}
                    </Text>
                  </View>

                  {/* Buttons */}
                  <TouchableOpacity
                    onPress={() => setIsAppealStep(true)}
                    style={{
                      backgroundColor: "#3B82F6",
                      padding: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
                      📩 Gửi Khiếu Nại
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsBanModalVisible(false)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colorScheme === "dark" ? "#444" : "#E5E7EB",
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: "500", fontSize: 15 }}>
                      Đóng
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: theme.text,
                    marginBottom: 8,
                  }}>
                    Gửi Khiếu Nại
                  </Text>

                  <Text style={{
                    fontSize: 13,
                    color: "#888",
                    marginBottom: 16,
                  }}>
                    Hãy giải trình lý do tại sao bạn cho rằng việc khóa tài khoản là không hợp lý. Ban quản trị sẽ xem xét.
                  </Text>

                  <TextInput
                    placeholder="Nhập nội dung khiếu nại..."
                    placeholderTextColor="#888"
                    value={appealText}
                    onChangeText={setAppealText}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#F3F4F6",
                      padding: 14,
                      borderRadius: 12,
                      marginBottom: 16,
                      minHeight: 120,
                      borderWidth: 1,
                      borderColor: colorScheme === "dark" ? "#444" : "#E5E7EB",
                      color: theme.text,
                      fontSize: 14,
                    }}
                  />

                  <TouchableOpacity
                    onPress={handleSendAppeal}
                    disabled={isAppealSending || !appealText.trim()}
                    style={{
                      backgroundColor: !appealText.trim() ? "#9CA3AF" : "#3B82F6",
                      padding: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      marginBottom: 10,
                      opacity: isAppealSending ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
                      {isAppealSending ? "Đang gửi..." : "Gửi Khiếu Nại"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsAppealStep(false)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colorScheme === "dark" ? "#444" : "#E5E7EB",
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: "500", fontSize: 15 }}>
                      Quay lại
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  )
}
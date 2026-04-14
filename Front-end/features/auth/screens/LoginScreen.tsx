import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert
} from "react-native";

import { useRouter } from "expo-router";
import { useState } from "react";

import SocialLogin from "../components/SocialLogin";
import { Colors } from "@/constants/theme";

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
      Alert.alert("Đăng nhập thất bại", error.message);
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
    </View>
  )
}
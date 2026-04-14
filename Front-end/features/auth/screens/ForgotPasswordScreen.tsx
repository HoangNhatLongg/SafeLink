import { View, Text, TextInput, TouchableOpacity, useColorScheme, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Colors } from "@/constants/theme";
import { forgotPasswordApi, resetPasswordApi } from "@/features/auth/services/authApi";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email đang sử dụng cho tài khoản.");
      return;
    }
    try {
      setIsSubmitting(true);
      await forgotPasswordApi(email);
      Alert.alert("Thành công", "Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn.");
      setIsOtpStep(true);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ các thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      setIsSubmitting(true);
      await resetPasswordApi(email, otpCode, newPassword);
      Alert.alert("Thành công", "Đổi mật khẩu thành công. Hãy đăng nhập với mật khẩu mới.", [
        { text: "Đăng nhập", onPress: () => router.replace("/login") }
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 10, color: theme.text }}>
        Lấy lại mật khẩu
      </Text>

      {!isOtpStep ? (
        <>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
            Nhập email của bạn để nhận mã OTP lấy lại mật khẩu.
          </Text>

          <TextInput
            placeholder="Email đăng ký"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <TouchableOpacity
            onPress={handleRequestOtp}
            disabled={isSubmitting}
            style={[styles.btn, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          >
            <Text style={styles.btnText}>{isSubmitting ? "Đang gửi..." : "Nhận mã OTP"}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
            Điền mã OTP được gửi qua email kèm theo mật khẩu mới của bạn.
          </Text>

          <TextInput
            placeholder="Mã OTP"
            placeholderTextColor="#888"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <TextInput
            placeholder="Mật khẩu mới"
            placeholderTextColor="#888"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <TextInput
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor="#888"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={isSubmitting}
            style={[styles.btn, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          >
            <Text style={styles.btnText}>{isSubmitting ? "Đang xử lý..." : "Lưu mật khẩu mới"}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: "center", color: theme.text }}>Quay lại Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  btn: {
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold"
  }
});

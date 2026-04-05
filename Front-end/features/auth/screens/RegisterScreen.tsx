import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert
} from "react-native";

import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import { registerRequestApi, registerVerifyApi } from "@/features/auth/services/authApi";

export default function RegisterScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation Rules
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleRegisterRequest = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword || !day || !month || !year) {
      Alert.alert("Lỗi", "Vui lòng KHÔNG bỏ trống bất kỳ thông tin nào");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Lỗi", "Định dạng email không hợp lệ");
      return;
    }
    if (!isPasswordValid) {
      Alert.alert("Lỗi", "Mật khẩu chưa đáp ứng đủ yêu cầu an toàn");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu nhập lại không khớp");
      return;
    }

    try {
      setIsSubmitting(true);
      await registerRequestApi(email);
      Alert.alert("Thành công", "Mã OTP đã được gửi đến email của bạn.");
      setIsOtpStep(true);
    } catch (error: any) {
      Alert.alert("Lỗi đăng ký", error.message);
    }finally {
    setIsSubmitting(false);
  }

  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Alert.alert("Lỗi", "Vui lòng nhập OTP");
      return;
    }
    try {
      await registerVerifyApi(email, password, otpCode, name);
      Alert.alert("Thành công", "Tạo tài khoản thành công! Vui lòng đăng nhập.");
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("Xác thực thất bại", error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <Text style={[styles.title, { color: theme.text }]}>
        Chào mừng
      </Text>

      <Text style={[styles.subtitle, { color: theme.text }]}>
        Đăng ký để tạo kết nối
      </Text>

      {!isOtpStep ? (
        <>
          <TextInput
            placeholder="Họ và tên"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <TextInput
            placeholder="Email hợp lệ"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <Text style={[styles.label, { color: theme.text }]}>Ngày sinh</Text>
          <View style={styles.birthdayRow}>
            <TextInput
              placeholder="DD"
              placeholderTextColor="#888"
              keyboardType="numeric"
              maxLength={2}
              value={day}
              onChangeText={setDay}
              style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            />
            <TextInput
              placeholder="MM"
              placeholderTextColor="#888"
              keyboardType="numeric"
              maxLength={2}
              value={month}
              onChangeText={setMonth}
              style={[styles.input, { flex: 1, marginHorizontal: 5, backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            />
            <TextInput
              placeholder="YYYY"
              placeholderTextColor="#888"
              keyboardType="numeric"
              maxLength={4}
              value={year}
              onChangeText={setYear}
              style={[styles.input, { flex: 1.5, marginLeft: 5, backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputContainer, { backgroundColor: theme.input, borderColor: theme.border }]}>
            <TextInput
              style={[styles.inputField, { color: theme.text }]}
              placeholder="Mật khẩu"
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Password Requirements Checklist */}
          {password.length > 0 && (
            <View style={styles.checklist}>
              <Text style={{ color: hasMinLength ? "green" : "red", fontSize: 12 }}>
                {hasMinLength ? "✓" : "✗"} Ít nhất 8 ký tự
              </Text>
              <Text style={{ color: hasUpperCase ? "green" : "red", fontSize: 12 }}>
                {hasUpperCase ? "✓" : "✗"} Có chữ in hoa
              </Text>
              <Text style={{ color: hasNumber ? "green" : "red", fontSize: 12 }}>
                {hasNumber ? "✓" : "✗"} Có chữ số
              </Text>
              <Text style={{ color: hasSpecialChar ? "green" : "red", fontSize: 12 }}>
                {hasSpecialChar ? "✓" : "✗"} Có ký tự đặc biệt (!@#%^&...)
              </Text>
            </View>
          )}

          {/* Confirm Password */}
          <View style={[styles.inputContainer, { backgroundColor: theme.input, borderColor: theme.border, marginTop: 12 }]}>
            <TextInput
              style={[styles.inputField, { color: theme.text }]}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#888"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: theme.primary, opacity: (!name || !email || !password || !confirmPassword || !isPasswordValid) ? 0.6 : 1 }]}
            onPress={handleRegisterRequest}
            disabled={isSubmitting}
          >
            <Text style={styles.registerText}>{isSubmitting ? "Đang gửi..." : "Tiếp tục"}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            placeholder="Mã OTP từ email..."
            placeholderTextColor="#888"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          />

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: theme.primary }]}
            onPress={handleVerifyOtp}
          >
            <Text style={styles.registerText}>Xác thực & Tạo tài khoản</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.primary }]}
            onPress={() => setIsOtpStep(false)}
          >
            <Text style={[styles.registerText, { color: theme.primary }]}>Quay lại sửa thông tin</Text>
          </TouchableOpacity>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    marginBottom: 6,
    fontWeight: "bold",
    fontSize: 12
  },
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
  },
  eyeIcon: {
    padding: 10,
  },
  checklist: {
    marginLeft: 5,
    marginTop: 2,
    marginBottom: 5,
  },
  birthdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  registerBtn: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  registerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
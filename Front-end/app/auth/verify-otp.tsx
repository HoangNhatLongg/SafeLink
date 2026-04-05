import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const theme = {
    background: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#000000",
    border: isDark ? "#333" : "#ddd",
    input: isDark ? "#1e1e1e" : "#fafafa",
    primary: "#d32f2f",
  };

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const inputs = useRef<TextInput[]>([]);

  const handleChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleBackspace = (value: string, index: number) => {
    if (!value && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join("");
    console.log("OTP:", code);

    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Nhập mã xác nhận
      </Text>

      <Text style={{ textAlign: "center", color: theme.text, marginBottom: 30 }}>
        Vui lòng nhập mã OTP đã gửi đến bạn
      </Text>

      {/* OTP INPUTS */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
                if (ref) inputs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              {
                borderColor: theme.border,
                backgroundColor: theme.input,
                color: theme.text,
              },
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(value) => handleChange(value, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace") {
                handleBackspace(digit, index);
              }
            }}
          />
        ))}
      </View>

      {/* VERIFY BUTTON */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleVerify}
      >
        <Text style={styles.buttonText}>Xác nhận</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={{ textAlign: "center", marginTop: 20, color: theme.text }}>
          Gửi lại mã
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    paddingTop: 160
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
  },

  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function CreatePostScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [level, setLevel] = useState("Trung bình");
  const [media, setMedia] = useState<any[]>([]);
  const [layout, setLayout] = useState<"classic"|"column"|"frame">("classic");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    });

    if (!result.canceled) {
      setMedia([
        ...media,
        {
          type:
            result.assets[0].type === "video"
              ? "video"
              : "image",
          uri: result.assets[0].uri,
        },
      ]);
    }
  };

  const handleSubmit = () => {
    if (!title || !content) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề và nội dung");
      return;
    }

    // TODO: gửi lên server

    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Tạo cảnh báo mới</Text>

      {/* Mức độ nguy hiểm */}
      <Text style={styles.label}>Mức độ nguy hiểm</Text>
      <View style={styles.levelRow}>
        {["Thấp", "Trung bình", "Cao", "Khẩn cấp"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setLevel(item)}
            style={[
              styles.levelBtn,
              level === item && styles.levelActive,
            ]}
          >
            <Text
              style={{
                color: level === item ? "white" : "#333",
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tiêu đề */}
      <Text style={styles.label}>Tiêu đề</Text>
      <TextInput
        style={styles.input}
        placeholder="Ví dụ: Ngập nặng tại đường Lê Duẩn"
        value={title}
        onChangeText={setTitle}
      />

      {/* Nội dung */}
      <Text style={styles.label}>Mô tả chi tiết</Text>
      <TextInput
        style={[styles.input, { height: 120 }]}
        multiline
        placeholder="Mô tả tình trạng..."
        value={content}
        onChangeText={setContent}
      />

      {/* Thêm ảnh / video */}
      <TouchableOpacity
        style={styles.mediaBtn}
        onPress={pickImage}
      >
        <Ionicons name="image" size={20} color="#1877F2" />
        <Text style={{ marginLeft: 6 }}>
          Thêm ảnh hoặc video
        </Text>
      </TouchableOpacity>

      {/* Nút đăng */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>
          Đăng cảnh báo
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  levelBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelActive: {
    backgroundColor: "#d32f2f",
    borderColor: "#d32f2f",
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  submitBtn: {
    backgroundColor: "#1877F2",
    padding: 14,
    borderRadius: 10,
    marginTop: 30,
    alignItems: "center",
  },
});
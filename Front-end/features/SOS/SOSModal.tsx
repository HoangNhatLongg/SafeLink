import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { createSOS } from "./sosApi";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const CATEGORIES = [
  { id: "fire",           label: "Hỏa hoạn",    icon: "flame",          color: "#FF3B30" },
  { id: "medical",        label: "Cấp cứu",    icon: "medkit",         color: "#34C759" },
  { id: "traffic",        label: "Tai nạn",    icon: "car-sport",      color: "#FF9500" },
  { id: "robbery",        label: "Cướp giật",  icon: "shield-half",    color: "#5856D6" },
  { id: "flood",          label: "Lũ lụt",     icon: "water",          color: "#007AFF" },
  { id: "landslide",      label: "Sạt lở",    icon: "trail-sign",     color: "#A2845E" },
  { id: "sos_support",    label: "Hỗ trợ SOS", icon: "hand-left",      color: "#FF6B35" },
  { id: "vehicle_repair", label: "Sửa xe",     icon: "build",          color: "#795548" },
  { id: "other",          label: "Khác",       icon: "help-circle",    color: "#8E8E93" },
];

const RADIUS_OPTIONS = [
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
  { label: "2km", value: 2000 },
  { label: "5km", value: 5000 },
];

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (info: { category: string; coords: { latitude: number; longitude: number } }) => void;
}

export default function SOSModal({ visible, onClose, onSuccess }: SOSModalProps) {
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [radius, setRadius] = useState(1000);
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [locationName, setLocationName] = useState("Đang lấy vị trí...");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (visible) {
      initLocation();
    }
  }, [visible]);

  const initLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Không có quyền truy cập vị trí");
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const a = address[0];
        const readableAddress = `${a.streetNumber ? a.streetNumber + ' ' : ''}${a.street || ''}, ${a.subregion || a.city || ''}, ${a.region || ''}`;
        setLocationName(readableAddress.replace(/^, /, ''));
      } else {
        setLocationName("Vị trí không xác định");
      }
    } catch (e: any) {
      setLocationName("Lỗi lấy vị trí: " + e.message);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!category) {
      Alert.alert("Lỗi", "Vui lòng chọn loại khẩn cấp.");
      return;
    }

    if (!coords) {
      Alert.alert("Lỗi", "Không tìm thấy vị trí của bạn.");
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("description", description);
      formData.append("radius", radius.toString());
      formData.append("latitude", coords.latitude.toString());
      formData.append("longitude", coords.longitude.toString());
      formData.append("address", locationName);

      images.forEach((uri, i) => {
        const name = uri.split("/").pop();
        const ext = name?.split(".").pop() || "jpg";
        formData.append("images", {
          uri,
          name: `sos_${i}.${ext}`,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        } as any);
      });

      await createSOS(formData);
      Alert.alert("Thành công", "Tín hiệu SOS của bạn đã được gửi đi. Các đơn vị hỗ trợ phù hợp sẽ hiển thị trên bản đồ.");
      onSuccess?.({ category: category!, coords: coords! });
      onClose();
      // Reset form
      setCategory(null);
      setDescription("");
      setImages([]);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.header}>
            <View style={styles.headerIndicator} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>🆘 Gửi tín hiệu SOS</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Location Display */}
            <View style={styles.locationBox}>
              <Ionicons name="location" size={20} color="#FF3B30" />
              <Text style={styles.locationText} numberOfLines={2}>
                {locationName}
              </Text>
            </View>

            <Text style={styles.label}>Loại khẩn cấp bài viết:</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catItem,
                    category === cat.id && { backgroundColor: cat.color + "22", borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={category === cat.id ? cat.color : "#666"}
                  />
                  <Text style={[styles.catLabel, category === cat.id && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mô tả tình trạng:</Text>
            <TextInput
              style={styles.input}
              placeholder="Có người bị thương không? Tình hình hiện tại thế nào?..."
              multiline
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Bán kính cảnh báo:</Text>
            <View style={styles.radiusWrap}>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.radiusBtn, radius === opt.value && styles.radiusBtnActive]}
                  onPress={() => setRadius(opt.value)}
                >
                  <Text style={[styles.radiusText, radius === opt.value && styles.radiusTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hình ảnh hiện trường (nếu có):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              <TouchableOpacity style={styles.addImgBtn} onPress={pickImage}>
                <Ionicons name="camera" size={30} color="#666" />
                <Text style={styles.addImgText}>Thêm ảnh</Text>
              </TouchableOpacity>
              {images.map((uri, i) => (
                <View key={i} style={styles.imgWrap}>
                  <Image source={{ uri }} style={styles.img} />
                  <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.spacer} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, sending && styles.disabledBtn]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="megaphone" size={20} color="#fff" />
                  <Text style={styles.confirmText}>GỬI SOS NGAY</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.85,
  },
  header: {
    padding: 16,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF3B30",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 20,
  },
  content: {
    padding: 20,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  locationText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#4B5563",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  catItem: {
    width: "23%",
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#111",
    marginBottom: 20,
  },
  radiusWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 4,
  },
  radiusBtnActive: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
  },
  radiusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  radiusTextActive: {
    color: "#fff",
  },
  imageScroll: {
    marginBottom: 20,
  },
  addImgBtn: {
    width: 100,
    height: 100,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  addImgText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  imgWrap: {
    width: 100,
    height: 100,
    marginRight: 10,
    position: "relative",
  },
  img: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removeImg: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  spacer: {
    height: 40,
  },
  footer: {
    padding: 20,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});

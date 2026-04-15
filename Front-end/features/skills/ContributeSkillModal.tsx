import React, { useCallback, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { contributeSkill } from "./skillsApi";
import type { SkillCategory, SkillDifficulty, ContributeStep } from "./types";
import { CATEGORY_LABELS, CATEGORY_ICONS, DIFFICULTY_LABELS } from "./types";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: SkillCategory[] = [
  "so_cap_cuu", "pccc", "thien_tai", "an_toan_dien", "tai_nan", "tam_ly", "khac",
];
const DIFFICULTIES: SkillDifficulty[] = ["co_ban", "trung_binh", "nang_cao"];

interface StepForm {
  title: string;
  content: string;
  images: ImagePicker.ImagePickerAsset[];
}

export default function ContributeSkillModal({ visible, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<SkillCategory>("so_cap_cuu");
  const [difficulty, setDifficulty] = useState<SkillDifficulty>("co_ban");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [coverImage, setCoverImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [steps, setSteps] = useState<StepForm[]>([{ title: "", content: "", images: [] }]);
  const [submitting, setSubmitting] = useState(false);

  // ── Chọn ảnh bìa ───────────────────────────────────────
  const pickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setCoverImage(result.assets[0]);
    }
  }, []);

  // ── Quản lý bước ───────────────────────────────────────
  const addStep = useCallback(() => {
    if (steps.length >= 10) {
      Alert.alert("Giới hạn", "Tối đa 10 bước.");
      return;
    }
    setSteps((prev) => [...prev, { title: "", content: "", images: [] }]);
  }, [steps.length]);

  const removeStep = useCallback((idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateStep = useCallback((idx: number, field: keyof StepForm, value: any) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }, []);

  const pickStepImage = useCallback(async (stepIdx: number) => {
    const currentStep = steps[stepIdx];
    if (currentStep.images.length >= 3) {
      Alert.alert("Giới hạn", "Tối đa 3 ảnh minh họa mỗi bước.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateStep(stepIdx, "images", [...currentStep.images, result.assets[0]]);
    }
  }, [steps, updateStep]);

  const removeStepImage = useCallback((stepIdx: number, imgIdx: number) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[stepIdx] = {
        ...copy[stepIdx],
        images: copy[stepIdx].images.filter((_, i) => i !== imgIdx),
      };
      return copy;
    });
  }, []);

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề kỹ năng.");
      return;
    }
    if (steps.length === 0 || !steps[0].content.trim()) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất 1 bước thực hiện.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("summary", summary.trim());
      formData.append("category", category);
      formData.append("difficulty", difficulty);
      if (duration.trim()) formData.append("duration", duration.trim());
      if (videoUrl.trim()) formData.append("videoUrl", videoUrl.trim());

      // Ảnh bìa
      if (coverImage) {
        const ext = coverImage.uri.split(".").pop() || "jpg";
        formData.append("coverImage", {
          uri: coverImage.uri,
          name: `cover.${ext}`,
          type: coverImage.mimeType || `image/${ext}`,
        } as any);
      }

      // Steps JSON (không kèm ảnh — ảnh gán riêng)
      const stepsJson: ContributeStep[] = steps.map((s, i) => ({
        order: i + 1,
        title: s.title.trim() || `Bước ${i + 1}`,
        content: s.content.trim(),
      }));
      formData.append("steps", JSON.stringify(stepsJson));

      // Ảnh cho từng step
      steps.forEach((step, stepIdx) => {
        step.images.forEach((img) => {
          const ext = img.uri.split(".").pop() || "jpg";
          formData.append(`step_${stepIdx}_image`, {
            uri: img.uri,
            name: `step${stepIdx}_${Date.now()}.${ext}`,
            type: img.mimeType || `image/${ext}`,
          } as any);
        });
      });

      await contributeSkill(formData);
      Alert.alert(
        "Thành công! 🎉",
        "Kỹ năng của bạn đã được gửi và đang chờ kiểm duyệt. Cảm ơn bạn đã đóng góp!",
        [{ text: "Đóng", onPress: onClose }]
      );

      // Reset form
      setTitle(""); setSummary(""); setCategory("so_cap_cuu");
      setDifficulty("co_ban"); setDuration(""); setVideoUrl("");
      setCoverImage(null);
      setSteps([{ title: "", content: "", images: [] }]);
    } catch (err: any) {
      Alert.alert("Lỗi", err.message || "Không thể gửi đóng góp. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }, [title, summary, category, difficulty, duration, videoUrl, coverImage, steps, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đóng Góp Kỹ Năng</Text>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Thông tin cơ bản */}
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            <Text style={styles.label}>Tiêu đề *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Cách sơ cứu bỏng nhiệt"
              maxLength={200}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Mô tả ngắn</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={summary}
              onChangeText={setSummary}
              placeholder="Mô tả ngắn gọn về kỹ năng này..."
              maxLength={500}
              multiline
              placeholderTextColor="#aaa"
            />

            {/* Danh mục */}
            <Text style={styles.label}>Danh mục *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Độ khó */}
            <Text style={styles.label}>Độ khó</Text>
            <View style={styles.inlineRow}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, difficulty === d && styles.chipActive]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>
                    {DIFFICULTY_LABELS[d]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Thời gian + Video */}
            <Text style={styles.label}>Thời gian ước tính</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="VD: 5-10 phút"
              maxLength={50}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Link video YouTube (tùy chọn)</Text>
            <TextInput
              style={styles.input}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/watch?v=..."
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor="#aaa"
            />

            {/* Ảnh bìa */}
            <Text style={styles.label}>Ảnh bìa</Text>
            <TouchableOpacity style={styles.coverPicker} onPress={pickCover}>
              {coverImage ? (
                <Image source={{ uri: coverImage.uri }} style={styles.coverPreview} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="image-outline" size={36} color="#bbb" />
                  <Text style={styles.coverPlaceholderText}>Chọn ảnh bìa</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Các bước thực hiện */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Các bước thực hiện</Text>
              <TouchableOpacity style={styles.addStepBtn} onPress={addStep}>
                <Ionicons name="add-circle" size={18} color="#e53935" />
                <Text style={styles.addStepText}>Thêm bước</Text>
              </TouchableOpacity>
            </View>

            {steps.map((step, idx) => (
              <View key={idx} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={step.title}
                    onChangeText={(v) => updateStep(idx, "title", v)}
                    placeholder={`Tiêu đề bước ${idx + 1}`}
                    maxLength={200}
                    placeholderTextColor="#aaa"
                  />
                  {steps.length > 1 && (
                    <TouchableOpacity onPress={() => removeStep(idx)} style={styles.removeStepBtn}>
                      <Ionicons name="trash-outline" size={18} color="#e53935" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[styles.input, styles.stepContent]}
                  value={step.content}
                  onChangeText={(v) => updateStep(idx, "content", v)}
                  placeholder="Mô tả chi tiết bước này..."
                  maxLength={3000}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor="#aaa"
                />

                {/* Ảnh minh họa cho bước */}
                <View style={styles.stepImagesRow}>
                  {step.images.map((img, imgIdx) => (
                    <View key={imgIdx} style={styles.stepImgWrapper}>
                      <Image source={{ uri: img.uri }} style={styles.stepImgThumb} />
                      <TouchableOpacity
                        style={styles.removeImgBtn}
                        onPress={() => removeStepImage(idx, imgIdx)}
                      >
                        <Ionicons name="close-circle" size={18} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {step.images.length < 3 && (
                    <TouchableOpacity
                      style={styles.addStepImgBtn}
                      onPress={() => pickStepImage(idx)}
                    >
                      <Ionicons name="camera-outline" size={20} color="#999" />
                      <Text style={styles.addImgText}>Ảnh</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingTop: 50,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  submitBtn: {
    backgroundColor: "#e53935",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 10, marginTop: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  chipsRow: { flexDirection: "row", marginBottom: 8 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#fce4ec", borderColor: "#e53935" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#666" },
  chipTextActive: { color: "#e53935", fontWeight: "700" },
  coverPicker: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 10,
  },
  coverPreview: { width: "100%", height: 160, resizeMode: "cover" },
  coverPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverPlaceholderText: { fontSize: 13, color: "#bbb" },
  addStepBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addStepText: { color: "#e53935", fontWeight: "600", fontSize: 13 },
  stepCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e53935",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  removeStepBtn: { padding: 4 },
  stepContent: { height: 80, textAlignVertical: "top" },
  stepImagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  stepImgWrapper: { position: "relative" },
  stepImgThumb: { width: 64, height: 64, borderRadius: 8 },
  removeImgBtn: { position: "absolute", top: -6, right: -6 },
  addStepImgBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addImgText: { fontSize: 10, color: "#999" },
});

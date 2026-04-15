import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";

import { fetchSkillDetail, incrementSkillView } from "@/features/skills/skillsApi";
import {
  isSkillSaved,
  saveSkill,
  removeSkill,
} from "@/features/skills/skillsOfflineStorage";
import type { Skill } from "@/features/skills/types";
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from "@/features/skills/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Chuyển YouTube URL thành embed URL.
 * Hỗ trợ: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
 */
function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  let videoId: string | null = null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return url; // Đã là embed
      }
      videoId = parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
}

export default function SkillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // ── Load skill detail ──────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSkillDetail(id);
        setSkill(res.data);
        // Tăng lượt xem (ngầm)
        incrementSkillView(id);
      } catch {
        // Thử tìm trong offline storage
        const { getSavedSkills } = await import(
          "@/features/skills/skillsOfflineStorage"
        );
        const savedList = await getSavedSkills();
        const offline = savedList.find((s) => s._id === id);
        if (offline) {
          setSkill(offline);
        } else {
          Alert.alert("Lỗi", "Không tìm thấy kỹ năng này.");
          router.back();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Kiểm tra trạng thái đã lưu ────────────────────────
  useEffect(() => {
    if (id) isSkillSaved(id).then(setSaved);
  }, [id]);

  // ── Toggle bookmark ────────────────────────────────────
  const handleBookmark = useCallback(async () => {
    if (!skill || savingInProgress) return;
    setSavingInProgress(true);
    try {
      if (saved) {
        await removeSkill(skill._id);
        setSaved(false);
        Alert.alert("Đã xóa", "Đã xóa kỹ năng khỏi bộ nhớ offline.");
      } else {
        const ok = await saveSkill(skill);
        setSaved(true);
        Alert.alert(
          "Đã lưu! 📥",
          ok
            ? "Kỹ năng và ảnh minh họa đã được tải về thiết bị. Bạn có thể xem offline."
            : "Kỹ năng này đã có trong bộ nhớ offline."
        );
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể lưu kỹ năng. Thử lại sau.");
    } finally {
      setSavingInProgress(false);
    }
  }, [skill, saved, savingInProgress]);

  // ── YouTube embed URL ──────────────────────────────────
  const embedUrl = skill?.videoUrl ? getYouTubeEmbedUrl(skill.videoUrl) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e53935" />
          <Text style={styles.loadingText}>Đang tải kỹ năng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!skill) return null;

  const diffColor = DIFFICULTY_COLORS[skill.difficulty] ?? "#888";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {skill.title}
        </Text>
        <TouchableOpacity
          onPress={handleBookmark}
          disabled={savingInProgress}
          style={styles.bookmarkHeaderBtn}
        >
          {savingInProgress ? (
            <ActivityIndicator size="small" color="#e53935" />
          ) : (
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? "#e53935" : "#333"}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Video player */}
        {embedUrl && (
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: embedUrl }}
              style={styles.video}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          </View>
        )}

        {/* Ảnh bìa (nếu không có video) */}
        {!embedUrl && skill.coverImage?.url && (
          <Image
            source={{ uri: skill.coverImage.url }}
            style={styles.coverImage}
          />
        )}

        {/* Meta badges */}
        <View style={styles.metaRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>
              {CATEGORY_ICONS[skill.category]} {CATEGORY_LABELS[skill.category]}
            </Text>
          </View>
          <View style={[styles.difficultyTag, { backgroundColor: diffColor + "22" }]}>
            <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
            <Text style={[styles.difficultyTagText, { color: diffColor }]}>
              {DIFFICULTY_LABELS[skill.difficulty]}
            </Text>
          </View>
          {skill.duration && (
            <View style={styles.durationTag}>
              <Ionicons name="time-outline" size={13} color="#666" />
              <Text style={styles.durationTagText}>{skill.duration}</Text>
            </View>
          )}
        </View>

        {/* Lượt xem + Tác giả */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="eye-outline" size={14} color="#aaa" />
            <Text style={styles.infoText}>{skill.viewCount} lượt xem</Text>
          </View>
          {skill.submittedBy?.name && (
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={14} color="#aaa" />
              <Text style={styles.infoText}>{skill.submittedBy.name}</Text>
            </View>
          )}
        </View>

        {/* Mô tả */}
        {skill.summary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{skill.summary}</Text>
          </View>
        )}

        {/* Link video gốc */}
        {skill.videoUrl && (
          <TouchableOpacity
            style={styles.videoLink}
            onPress={() => Linking.openURL(skill.videoUrl!)}
          >
            <Ionicons name="logo-youtube" size={18} color="#e53935" />
            <Text style={styles.videoLinkText}>Xem video trên YouTube</Text>
            <Ionicons name="open-outline" size={14} color="#e53935" />
          </TouchableOpacity>
        )}

        {/* Các bước thực hiện */}
        <Text style={styles.stepsTitle}>📋 Các bước thực hiện</Text>

        {skill.steps
          .sort((a, b) => a.order - b.order)
          .map((step, idx) => (
            <View key={idx} style={styles.stepCard}>
              {/* Thanh số bước */}
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.order}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>

              {/* Nội dung bước */}
              <Text style={styles.stepContent}>{step.content}</Text>

              {/* Ảnh minh họa */}
              {step.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.stepImagesScroll}
                  contentContainerStyle={styles.stepImagesContainer}
                >
                  {step.images.map((img, imgIdx) => (
                    <TouchableOpacity
                      key={imgIdx}
                      onPress={() =>
                        setExpandedImage(
                          expandedImage === img.url ? null : img.url
                        )
                      }
                    >
                      <Image
                        source={{ uri: img.url }}
                        style={
                          expandedImage === img.url
                            ? styles.stepImgExpanded
                            : styles.stepImgThumb
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ))}

        {/* Tags */}
        {skill.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {skill.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Nút lưu offline lớn ở cuối */}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSaved]}
          onPress={handleBookmark}
          disabled={savingInProgress}
        >
          {savingInProgress ? (
            <ActivityIndicator size="small" color={saved ? "#e53935" : "#fff"} />
          ) : (
            <>
              <Ionicons
                name={saved ? "bookmark" : "download-outline"}
                size={20}
                color={saved ? "#e53935" : "#fff"}
              />
              <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
                {saved ? "Đã lưu offline · Xóa" : "Lưu offline (kèm ảnh)"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  bookmarkHeaderBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

  videoContainer: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
    backgroundColor: "#000",
  },
  video: { flex: 1 },

  coverImage: {
    width: SCREEN_WIDTH,
    height: 200,
    resizeMode: "cover",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  categoryTag: {
    backgroundColor: "#e8eaf6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  categoryTagText: { fontSize: 12, fontWeight: "600", color: "#3949AB" },
  difficultyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  diffDot: { width: 7, height: 7, borderRadius: 4 },
  difficultyTagText: { fontSize: 12, fontWeight: "600" },
  durationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  durationTagText: { fontSize: 12, color: "#666", fontWeight: "500" },

  infoRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 12, color: "#aaa" },

  summaryBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#e53935",
  },
  summaryText: { fontSize: 14, color: "#444", lineHeight: 21 },

  videoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    backgroundColor: "#fff3f3",
    borderRadius: 10,
  },
  videoLinkText: { fontSize: 13, color: "#e53935", fontWeight: "600", flex: 1 },

  stepsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },

  stepCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e53935",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  stepContent: { fontSize: 14, color: "#444", lineHeight: 22, marginLeft: 40 },

  stepImagesScroll: { marginTop: 10, marginLeft: 40 },
  stepImagesContainer: { gap: 8 },
  stepImgThumb: {
    width: 120,
    height: 90,
    borderRadius: 10,
    resizeMode: "cover",
  },
  stepImgExpanded: {
    width: SCREEN_WIDTH - 80,
    height: ((SCREEN_WIDTH - 80) * 3) / 4,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: "#f0f0f0",
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagText: { fontSize: 12, color: "#666" },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#e53935",
  },
  saveBtnSaved: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e53935",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  saveBtnTextSaved: { color: "#e53935" },
});

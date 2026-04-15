/**
 * Offline Storage cho Thư Viện Kỹ Năng
 *
 * Lưu toàn bộ kỹ năng (bao gồm ảnh) xuống thiết bị để dùng offline:
 * - Dùng expo-file-system để download ảnh về thư mục local
 * - URL ảnh trong Skill object được thay bằng đường dẫn local
 * - Không save video — video chỉ xem được khi online
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import type { Skill, SkillSummary } from "./types";

const SAVED_KEY = "safelink_saved_skills";
const CACHE_KEY = "safelink_skills_cache";
const SKILLS_IMG_DIR = `${FileSystem.documentDirectory}skills_images/`;

// ─── Đảm bảo thư mục ảnh tồn tại ─────────────────────────────────────────────
async function ensureImgDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(SKILLS_IMG_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SKILLS_IMG_DIR, { intermediates: true });
  }
}

/**
 * Download một ảnh về local.
 * Trả về path local nếu thành công, hoặc URL gốc nếu lỗi.
 */
async function downloadImage(remoteUrl: string, filename: string): Promise<string> {
  if (!remoteUrl || remoteUrl.startsWith("file://")) return remoteUrl;
  try {
    await ensureImgDir();
    const localPath = `${SKILLS_IMG_DIR}${filename}`;
    const info = await FileSystem.getInfoAsync(localPath);
    // Không download lại nếu đã có
    if (info.exists) return localPath;
    const result = await FileSystem.downloadAsync(remoteUrl, localPath);
    return result.uri;
  } catch {
    return remoteUrl; // Fallback về URL gốc
  }
}

/**
 * Download tất cả ảnh của một skill về local.
 * Trả về bản sao của skill với toàn bộ URL ảnh đã được thay bằng path local.
 */
async function downloadAllImages(skill: Skill): Promise<Skill> {
  const skillId = skill._id;

  // Download ảnh bìa
  let coverImage = skill.coverImage;
  if (coverImage?.url) {
    const filename = `${skillId}_cover_${Date.now()}.jpg`;
    const localUri = await downloadImage(coverImage.url, filename);
    coverImage = { ...coverImage, url: localUri };
  }

  // Download ảnh trong từng bước
  const steps = await Promise.all(
    skill.steps.map(async (step, stepIdx) => {
      const images = await Promise.all(
        step.images.map(async (img, imgIdx) => {
          const filename = `${skillId}_step${stepIdx}_img${imgIdx}_${Date.now()}.jpg`;
          const localUri = await downloadImage(img.url, filename);
          return { ...img, url: localUri };
        })
      );
      return { ...step, images };
    })
  );

  return {
    ...skill,
    coverImage,
    steps,
    videoUrl: undefined, // Không lưu video offline
  };
}

// ─── CRUD kỹ năng đã lưu ──────────────────────────────────────────────────────

export async function getSavedSkills(): Promise<Skill[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Skill[]) : [];
  } catch {
    return [];
  }
}

export async function isSkillSaved(id: string): Promise<boolean> {
  const saved = await getSavedSkills();
  return saved.some((s) => s._id === id);
}

/**
 * Lưu kỹ năng offline — download toàn bộ ảnh về local trước khi lưu.
 * @returns true nếu lưu thành công, false nếu đã tồn tại
 */
export async function saveSkill(skill: Skill): Promise<boolean> {
  const current = await getSavedSkills();
  if (current.some((s) => s._id === skill._id)) return false;

  // Download ảnh về local
  const localSkill = await downloadAllImages(skill);

  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...current, localSkill]));
  return true;
}

/**
 * Xóa kỹ năng đã lưu và dọn ảnh local liên quan
 */
export async function removeSkill(id: string): Promise<void> {
  const current = await getSavedSkills();
  const skill = current.find((s) => s._id === id);

  // Xóa các file ảnh local (best-effort, bỏ qua lỗi)
  if (skill) {
    const imageUrls: string[] = [];
    if (skill.coverImage?.url?.startsWith("file://")) {
      imageUrls.push(skill.coverImage.url);
    }
    for (const step of skill.steps) {
      for (const img of step.images) {
        if (img.url?.startsWith("file://")) imageUrls.push(img.url);
      }
    }
    await Promise.all(
      imageUrls.map((uri) =>
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {})
      )
    );
  }

  const updated = current.filter((s) => s._id !== id);
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
}

export async function clearAllSavedSkills(): Promise<void> {
  // Xóa thư mục ảnh skills
  try {
    await FileSystem.deleteAsync(SKILLS_IMG_DIR, { idempotent: true });
  } catch {}
  await AsyncStorage.removeItem(SAVED_KEY);
}

// ─── Cache danh sách kỹ năng (online → dùng khi offline) ─────────────────────

export interface SkillsListCache {
  timestamp: number;
  items: SkillSummary[];
}

export async function cacheSkillsList(items: SkillSummary[]): Promise<void> {
  try {
    const payload: SkillsListCache = { timestamp: Date.now(), items };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export async function getCachedSkillsList(): Promise<SkillsListCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SkillsListCache) : null;
  } catch {
    return null;
  }
}

/** Cache hợp lệ trong 24 giờ */
export function isCacheValid(cache: SkillsListCache): boolean {
  return Date.now() - cache.timestamp < 24 * 60 * 60 * 1000;
}

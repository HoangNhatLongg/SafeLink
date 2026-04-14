import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Agency } from "./types";

const STORAGE_KEY = "safelink_saved_directory";
const CACHE_KEY   = "safelink_directory_cache";

// ─── Danh bạ đã lưu (bookmarked) ────────────────────────────────────────────

export async function getSavedAgencies(): Promise<Agency[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Agency[]) : [];
  } catch {
    return [];
  }
}

export async function saveAgency(agency: Agency): Promise<void> {
  const current = await getSavedAgencies();
  const exists = current.some((a) => a._id === agency._id || a.name === agency.name);
  if (!exists) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...current, agency]));
  }
}

export async function removeAgency(agencyId: string): Promise<void> {
  const current = await getSavedAgencies();
  const updated = current.filter((a) => a._id !== agencyId && a.name !== agencyId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function isAgencySaved(agencyId: string): Promise<boolean> {
  const current = await getSavedAgencies();
  return current.some((a) => a._id === agencyId || a.name === agencyId);
}

export async function clearAllSavedAgencies(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ─── Cache toàn bộ danh bạ (cho offline) ────────────────────────────────────

export interface DirectoryCache {
  timestamp: number;
  items: Agency[];
}

export async function cacheDirectoryData(items: Agency[]): Promise<void> {
  try {
    const payload: DirectoryCache = { timestamp: Date.now(), items };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* bỏ qua lỗi storage */
  }
}

export async function getCachedDirectory(): Promise<DirectoryCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DirectoryCache) : null;
  } catch {
    return null;
  }
}

/** Cache còn hiệu lực trong 24h */
export function isCacheValid(cache: DirectoryCache): boolean {
  return Date.now() - cache.timestamp < 24 * 60 * 60 * 1000;
}

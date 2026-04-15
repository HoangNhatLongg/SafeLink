import { API_BASE } from "@/constants/api";
import { apiFetch, parseJson } from "@/features/api/http";
import type { Skill, SkillSummary, SkillCategory, SkillDifficulty } from "./types";

const BASE = `${API_BASE}/api/skills`;
const TIMEOUT_MS = 8000;

/** Fetch public endpoints với timeout — không dùng apiFetch (không cần token) */
async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("SERVER_TIMEOUT");
    throw err;
  }
}

// ─── Public APIs ─────────────────────────────────────────────────────────────

export async function fetchSkills(params: {
  category?: SkillCategory | "";
  difficulty?: SkillDifficulty | "";
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: SkillSummary[]; meta: { total: number; totalPages: number; page: number } }> {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.difficulty) q.set("difficulty", params.difficulty);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const res = await fetchWithTimeout(`${BASE}?${q.toString()}`);
  if (!res.ok) throw new Error("Không thể tải danh sách kỹ năng");
  return res.json();
}

export async function fetchSkillDetail(id: string): Promise<{ data: Skill }> {
  const res = await fetchWithTimeout(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Không tìm thấy kỹ năng");
  return res.json();
}

/** Gọi ngầm, không throw nếu lỗi */
export async function incrementSkillView(id: string): Promise<void> {
  try {
    await fetchWithTimeout(`${BASE}/${id}/view`, { method: "POST" });
  } catch {
    // bỏ qua lỗi — lượt xem không quan trọng
  }
}

// ─── Authenticated APIs (JWT required) ───────────────────────────────────────

/**
 * Đóng góp kỹ năng mới — gửi FormData (ảnh bìa + ảnh bước)
 * Steps được JSON.stringify vào field "steps"
 */
export async function contributeSkill(formData: FormData): Promise<{ message: string; data: { _id: string; title: string } }> {
  const res = await apiFetch("/api/skills/contribute", {
    method: "POST",
    body: formData,
    // Không đặt Content-Type — để fetch tự thêm boundary cho multipart
  });
  return parseJson(res);
}

// ─── Moderator APIs ───────────────────────────────────────────────────────────

export async function fetchPendingSkills(page = 1): Promise<{ data: Skill[]; meta: { total: number } }> {
  const res = await apiFetch(`/api/skills/pending?page=${page}&limit=20`);
  return parseJson(res);
}

export async function reviewSkill(
  id: string,
  action: "approve" | "reject",
  rejectReason?: string
): Promise<{ message: string }> {
  const res = await apiFetch(`/api/skills/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, rejectReason }),
  });
  return parseJson(res);
}

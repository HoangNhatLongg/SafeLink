import { apiFetch, parseJson } from "@/features/api/http";
import { API_BASE } from "@/constants/api";
import type { VolunteerUnit } from "./volunteerTypes";

const BASE = `${API_BASE}/api/volunteers`;
const TIMEOUT_MS = 8000;

/** Fetch với timeout cho public endpoints */
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

/**
 * GET /api/volunteers — Danh sách đội tình nguyện đã duyệt
 */
export async function fetchVolunteers(params: {
  province?: string;
  district?: string;
  unitType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: VolunteerUnit[]; total: number }> {
  const q = new URLSearchParams();
  if (params.province) q.set("province", params.province);
  if (params.district) q.set("district", params.district);
  if (params.unitType) q.set("unitType", params.unitType);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const res = await fetchWithTimeout(`${BASE}?${q.toString()}`);
  if (!res.ok) throw new Error("Không thể tải danh sách đội tình nguyện.");
  return res.json();
}

/**
 * GET /api/volunteers/nearby — Đội tình nguyện gần vị trí
 */
export async function fetchNearbyVolunteers(params: {
  lat: number;
  lng: number;
  radius?: number;
  unitType?: string;
}): Promise<{ items: VolunteerUnit[]; total: number }> {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius: String(params.radius ?? 10),
  });
  if (params.unitType) q.set("unitType", params.unitType);

  const res = await fetchWithTimeout(`${BASE}/nearby?${q.toString()}`);
  if (!res.ok) throw new Error("Không tải được danh sách gần bạn.");
  return res.json();
}

/**
 * POST /api/volunteers/register — Đăng ký làm đội tình nguyện (FormData, JWT required)
 */
export async function registerVolunteer(formData: FormData): Promise<{ message: string; item: VolunteerUnit }> {
  const res = await apiFetch("/api/volunteers/register", {
    method: "POST",
    body: formData,
    // Không set Content-Type — để fetch tự set boundary cho multipart/form-data
  });
  return parseJson(res);
}

/**
 * GET /api/volunteers/my — Xem đơn đăng ký của chính mình (JWT required)
 */
export async function fetchMyRegistrations(): Promise<{ items: VolunteerUnit[]; total: number }> {
  const res = await apiFetch("/api/volunteers/my");
  return parseJson(res);
}

/**
 * GET /api/volunteers/pending — Admin: danh sách chờ duyệt (JWT + admin required)
 */
export async function fetchPendingVolunteers(): Promise<{ items: VolunteerUnit[]; total: number }> {
  const res = await apiFetch("/api/volunteers/pending");
  return parseJson(res);
}

/**
 * PATCH /api/volunteers/:id/review — Admin: duyệt/từ chối
 */
export async function reviewVolunteer(
  id: string,
  action: "approve" | "reject",
  rejectReason?: string
): Promise<{ message: string }> {
  const res = await apiFetch(`/api/volunteers/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, rejectReason }),
  });
  return parseJson(res);
}

/**
 * PUT /api/volunteers/my — Cập nhật thông tin đội cứu hộ đã duyệt (JWT required)
 */
export async function updateMyVolunteer(formData: FormData): Promise<{ message: string; item: VolunteerUnit }> {
  const res = await apiFetch("/api/volunteers/my", {
    method: "PUT",
    body: formData,
  });
  return parseJson(res);
}

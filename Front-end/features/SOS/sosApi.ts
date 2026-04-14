import { apiFetch, parseJson } from "@/features/api/http";

/** Shape của 1 SOS item trả về từ GET /api/sos/active */
export interface SOSItem {
  id: string;
  author: { _id: string; name: string; avatar?: string };
  category: string;
  description: string;
  images: { url: string }[];
  location: { latitude: number; longitude: number; address?: string };
  radius: number;
  sosStatus: "active" | "resolved";
  expiresAt: string;
  createdAt: string;
}

/**
 * Lấy danh sách SOS đang hoạt động cho bản đồ
 * Không cần token (endpoint public)
 */
export async function fetchActiveSOS(params?: {
  lat?: number;
  lon?: number;
  radius?: number;
}) {
  const q = new URLSearchParams();
  if (params?.lat !== undefined) q.set("lat", String(params.lat));
  if (params?.lon !== undefined) q.set("lon", String(params.lon));
  if (params?.radius !== undefined) q.set("radius", String(params.radius));

  const qs = q.toString() ? `?${q.toString()}` : "";
  // skipAuth = true vì đây là endpoint public
  const res = await apiFetch(`/api/sos/active${qs}`, {}, true);
  return parseJson<{ sos: SOSItem[] }>(res);
}

/**
 * Gửi tín hiệu SOS mới (yêu cầu đăng nhập)
 */
export async function createSOS(formData: FormData) {
  const res = await apiFetch("/api/sos", { method: "POST", body: formData });
  return parseJson<{
    message: string;
    post: SOSItem;
    notified: { nearby: number; staff: number };
  }>(res);
}

/**
 * Đánh dấu SOS đã được giải quyết
 */
export async function resolveSOS(id: string) {
  const res = await apiFetch(`/api/sos/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
  return parseJson<{ message: string; sosStatus: string }>(res);
}

/**
 * Cập nhật vị trí hiện tại của user để nhận alerts chính xác
 * Silent — không throw lỗi để không ảnh hưởng trải nghiệm
 */
export async function updateLocation(
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    const res = await apiFetch("/api/sos/me/location", {
      method: "PATCH",
      body: JSON.stringify({ latitude, longitude }),
    });
    await parseJson(res);
  } catch {
    /* silent — không critical */
  }
}

/**
 * Lưu Expo Push Token của thiết bị lên server
 * Silent — không throw lỗi
 */
export async function uploadPushToken(token: string): Promise<void> {
  try {
    const res = await apiFetch("/api/sos/me/push-token", {
      method: "PATCH",
      body: JSON.stringify({ token }),
    });
    await parseJson(res);
  } catch {
    /* silent */
  }
}

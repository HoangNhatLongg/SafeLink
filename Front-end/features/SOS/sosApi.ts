import axios from "axios";
import { API_URL } from "@/constants/api";
import { getAuthToken } from "@/features/auth/utils/storage";

/**
 * Lấy danh sách SOS đang hoạt động cho bản đồ
 */
export async function fetchActiveSOS(params?: { lat?: number; lon?: number; radius?: number }) {
  try {
    const response = await axios.get(`${API_URL}/sos/active`, { params });
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Không thể tải dữ liệu SOS.");
  }
}

/**
 * Gửi tín hiệu SOS mới
 */
export async function createSOS(formData: FormData) {
  try {
    const token = await getAuthToken();
    const response = await axios.post(`${API_URL}/sos`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Không thể gửi tín hiệu SOS.");
  }
}

/**
 * Đánh dấu SOS đã được giải quyết
 */
export async function resolveSOS(id: string) {
  try {
    const token = await getAuthToken();
    const response = await axios.patch(`${API_URL}/sos/${id}/resolve`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Không thể đóng SOS này.");
  }
}

/**
 * Cập nhật vị trí hiện tại của user để nhận alerts chính xác
 */
export async function updateLocation(latitude: number, longitude: number) {
  try {
    const token = await getAuthToken();
    await axios.patch(`${API_URL}/sos/me/location`, { latitude, longitude }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {/* silent */}
}

/**
 * Lưu Push Token của thiết bị lên server
 */
export async function uploadPushToken(token: string) {
  try {
    const authToken = await getAuthToken();
    await axios.patch(`${API_URL}/sos/me/push-token`, { token }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  } catch {/* silent */}
}

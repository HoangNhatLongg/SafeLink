import { API_BASE } from "@/constants/api";
import { apiFetch, parseJson } from "@/features/api/http";

const API_URL = `${API_BASE}/api/auth`;

const TIMEOUT_MS = 10000; // 10 giây timeout

// Utility: fetch với timeout tự động
const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Không kết nối được máy chủ. Kiểm tra IP Wi-Fi trong authApi.ts và đảm bảo máy tính và điện thoại cùng mạng Wi-Fi.");
    }
    throw err;
  }
};

export const registerRequestApi = async (email: string) => {
  const response = await fetchWithTimeout(`${API_URL}/register-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Registration failed");
  return data;
};

export const registerVerifyApi = async (email: string, password: string, otpCode: string, name: string) => {
  const response = await fetchWithTimeout(`${API_URL}/register-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, otpCode, name })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Verification failed");
  return data;
};

export const loginApi = async (email: string, password: string, deviceId: string) => {
  const response = await fetchWithTimeout(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId
    },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok && response.status !== 403) {
    throw new Error(data.message || "Login failed");
  }
  return { data, status: response.status };
};

export const verifyDeviceApi = async (email: string, otpCode: string, deviceId: string) => {
  const response = await fetchWithTimeout(`${API_URL}/verify-device`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: JSON.stringify({ email, otpCode }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Device verification failed");
  return data;
};

export const logoutApi = async () => {
  const res = await apiFetch("/api/auth/logout", { method: "POST" });
  return parseJson(res);
};
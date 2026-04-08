import { API_BASE } from "@/constants/api";
import { clearSession, getToken } from "@/features/auth/utils/storage";

/** Upload video lớn (200MB) qua Wi-Fi cần đủ thời gian — 5 phút */
const TIMEOUT_MS = 5 * 60 * 1000;

/** Gọi khi token hết hạn / không hợp lệ (401 có Bearer). Đăng ký từ Root layout. */
let onSessionExpired: ((serverMessage?: string) => void) | null = null;
let lastSessionExpiredUiAt = 0;

export function setSessionExpiredHandler(handler: ((serverMessage?: string) => void) | null) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * fetch với Bearer token (trừ khi skipAuth). FormData không set Content-Type.
 */
export async function apiFetch(path: string, options: RequestInit = {}, skipAuth = false) {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (!skipAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(tid);
    return res;
  } catch (e: any) {
    clearTimeout(tid);
    if (e?.name === "AbortError") {
      throw new ApiError(
        "Yêu cầu bị timeout (quá 5 phút). Nếu đang upload video lớn hãy thử lại trên Wi-Fi tốt hơn. Nếu không phải upload, kiểm tra API_BASE trong constants/api.ts và mạng Wi-Fi.",
        0
      );
    }
    throw e;
  }
}

export async function parseJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Lỗi không xác định" };
  }
  if (!res.ok) {
    if (res.status === 401) {
      const hadToken = await getToken();
      if (hadToken) {
        await clearSession();
        const now = Date.now();
        if (now - lastSessionExpiredUiAt > 2000) {
          lastSessionExpiredUiAt = now;
          onSessionExpired?.(typeof data.message === "string" ? data.message : undefined);
        }
      }
    }
    const msg = data.message || `Lỗi ${res.status}`;
    const extra =
      res.status >= 500 && typeof data.error === "string" && data.error
        ? ` — ${data.error}`
        : "";
    throw new ApiError(msg + extra, res.status);
  }
  return data as T;
}

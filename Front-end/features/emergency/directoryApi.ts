import { API_BASE } from "@/constants/api";
import { apiFetch, parseJson } from "@/features/api/http";
import type { Agency, ContributePayload } from "./types";

const BASE = `${API_BASE}/api/directory`;
const TIMEOUT_MS = 8000;

/** Fetch với timeout tự động - tránh treo mãi khi server không phản hồi */
async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("SERVER_TIMEOUT");
    }
    throw err;
  }
}

export async function fetchDirectory(params: {
  province?: string;
  district?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Agency[]; total: number }> {
  const q = new URLSearchParams();
  if (params.province) q.set("province", params.province);
  if (params.district) q.set("district", params.district);
  if (params.type) q.set("type", params.type);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const res = await fetchWithTimeout(`${BASE}?${q.toString()}`);
  if (!res.ok) throw new Error("Không thể tải danh bạ.");
  return res.json();
}

export async function fetchNearbyDirectory(params: {
  lat: number;
  lng: number;
  radius?: number;
  type?: string;
}): Promise<{ items: Agency[]; total: number }> {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius: String(params.radius ?? 5),
  });
  if (params.type) q.set("type", params.type);

  const res = await fetchWithTimeout(`${BASE}/nearby?${q.toString()}`);
  if (!res.ok) throw new Error("Không tải được danh sách gần bạn.");
  return res.json();
}

export async function contributeDirectory(payload: ContributePayload): Promise<{ message: string }> {
  const res = await apiFetch("/api/directory/contribute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function fetchPendingDirectory(): Promise<{ items: Agency[] }> {
  const res = await apiFetch("/api/directory/pending");
  return parseJson(res);
}

export async function reviewDirectoryItem(
  id: string,
  action: "approve" | "reject",
  rejectReason?: string
): Promise<{ message: string }> {
  const res = await apiFetch(`/api/directory/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, rejectReason }),
  });
  return parseJson(res);
}

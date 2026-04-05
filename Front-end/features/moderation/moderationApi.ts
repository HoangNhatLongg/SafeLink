import { apiFetch, parseJson } from "@/features/api/http";

export async function fetchReports(status?: string, page = 1, limit = 20) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set("status", status);
  const res = await apiFetch(`/api/moderation/reports?${q.toString()}`);
  return parseJson<{ reports: any[]; pagination: any }>(res);
}

export async function patchReport(
  id: string,
  body: { status: "reviewed" | "dismissed" | "actioned"; flagPost?: boolean }
) {
  const res = await apiFetch(`/api/moderation/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

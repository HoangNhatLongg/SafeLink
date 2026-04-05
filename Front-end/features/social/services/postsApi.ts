import { apiFetch, parseJson } from "@/features/api/http";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
};

export async function fetchFeed(page = 1, limit = 10, authorId?: string) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (authorId) q.set("authorId", authorId);
  const res = await apiFetch(`/api/posts?${q.toString()}`);
  return parseJson<{ posts: any[]; pagination: Pagination }>(res);
}

export async function fetchNearby(lat: number, lng: number, radius = 5000, limit = 20) {
  const q = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    limit: String(limit),
  });
  const res = await apiFetch(`/api/posts/nearby?${q.toString()}`);
  return parseJson<{ posts: any[]; locations: any[] }>(res);
}

export async function fetchSavedPosts(page = 1, limit = 10) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/posts/saved?${q.toString()}`);
  return parseJson<{ posts: any[]; pagination: Pagination }>(res);
}

export async function fetchPost(id: string) {
  const res = await apiFetch(`/api/posts/${id}`);
  return parseJson<{ post: any }>(res);
}

export async function createPostFormData(form: FormData) {
  const res = await apiFetch("/api/posts", { method: "POST", body: form });
  return parseJson(res);
}

export async function likePost(id: string) {
  const res = await apiFetch(`/api/posts/${id}/like`, { method: "POST", body: JSON.stringify({}) });
  return parseJson<{
    action: string;
    userReaction: string | null;
    likesCount: number;
    dislikesCount: number;
    score: number;
  }>(res);
}

export async function dislikePost(id: string) {
  const res = await apiFetch(`/api/posts/${id}/dislike`, { method: "POST", body: JSON.stringify({}) });
  return parseJson<{
    action: string;
    userReaction: string | null;
    likesCount: number;
    dislikesCount: number;
    score: number;
  }>(res);
}

export async function toggleSavePost(id: string) {
  const res = await apiFetch(`/api/posts/${id}/save`, { method: "POST", body: JSON.stringify({}) });
  return parseJson<{ saved: boolean }>(res);
}

export async function toggleHidePost(id: string) {
  const res = await apiFetch(`/api/posts/${id}/hide`, { method: "POST", body: JSON.stringify({}) });
  return parseJson<{ hidden: boolean }>(res);
}

export async function sharePost(id: string) {
  const res = await apiFetch(`/api/posts/${id}/share`, { method: "POST", body: JSON.stringify({}) });
  return parseJson<{ sharesCount: number }>(res);
}

export type ReportReason =
  | "spam"
  | "inappropriate"
  | "misinformation"
  | "harassment"
  | "violence"
  | "copyright"
  | "other";

export async function reportPost(id: string, reason: ReportReason, description?: string) {
  const res = await apiFetch(`/api/posts/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, description }),
  });
  return parseJson(res);
}

export async function fetchComments(postId: string, page = 1, limit = 20) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/posts/${postId}/comments?${q.toString()}`);
  return parseJson<{ comments: any[]; pagination: Pagination }>(res);
}

export async function addComment(postId: string, content: string) {
  const res = await apiFetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return parseJson(res);
}

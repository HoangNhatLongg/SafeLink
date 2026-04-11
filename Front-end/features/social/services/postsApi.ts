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

/**
 * Feed đề xuất theo 5 tầng ưu tiên:
 * SOS → Bạn bè → Gần vị trí → Điểm cao → Còn lại
 */
export async function fetchRecommendedFeed(
  page = 1,
  limit = 20,
  lat?: number,
  lng?: number,
  radius = 10000
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (lat !== undefined && lng !== undefined) {
    q.set("lat", String(lat));
    q.set("lng", String(lng));
    q.set("radius", String(radius));
  }
  const res = await apiFetch(`/api/posts/recommended?${q.toString()}`);
  return parseJson<{
    posts: any[];
    pagination: Pagination & { hasMore: boolean };
    meta: { tiers: { sos: number; friends: number; nearby: number; top: number; remaining: number } };
  }>(res);
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

export async function updatePostFormData(id: string, form: FormData) {
  const res = await apiFetch(`/api/posts/${id}`, {
    method: "PUT",
    body: form,
  });
  return parseJson(res);
}

export async function deletePost(id: string) {
  const res = await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
  return parseJson<{ message: string }>(res);
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

export async function addComment(postId: string, content: string, parentId?: string, replyToUserId?: string) {
  const endpoint = parentId
    ? `/api/comments/${parentId}/replies`
    : `/api/posts/${postId}/comments`;
  const res = await apiFetch(endpoint, {
    method: "POST",
    body: JSON.stringify({ content, replyToUserId }),
  });
  return parseJson(res);
}

export async function fetchReplies(commentId: string, page = 1, limit = 10) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/comments/${commentId}/replies?${q.toString()}`);
  return parseJson<{ replies: any[]; pagination: Pagination }>(res);
}

export async function reactToComment(commentId: string, type: "like" | "dislike") {
  const res = await apiFetch(`/api/comments/${commentId}/like`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
  return parseJson<{
    action: string;
    userReaction: string | null;
    likesCount: number;
    dislikesCount: number;
  }>(res);
}

export async function deleteComment(commentId: string) {
  const res = await apiFetch(`/api/comments/${commentId}`, { method: "DELETE" });
  return parseJson<{ message: string }>(res);
}

export async function updateComment(commentId: string, content: string) {
  const res = await apiFetch(`/api/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
  return parseJson<{ message: string; comment: any }>(res);
}

/* ── Follow API ─────────────────────────────────────────────────── */

export async function followUser(userId: string) {
  const res = await apiFetch(`/api/users/${userId}/follow`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return parseJson<{ message: string }>(res);
}

export async function unfollowUser(userId: string) {
  const res = await apiFetch(`/api/users/${userId}/follow`, { method: "DELETE" });
  return parseJson<{ message: string }>(res);
}

export async function fetchFollowers(userId: string, search: string = "", page = 1, limit = 20) {
  const q = new URLSearchParams({ search, page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/users/${userId}/followers?${q.toString()}`);
  return parseJson<{ followers: any[]; pagination: Pagination }>(res);
}

export async function fetchFollowing(userId: string, search: string = "", page = 1, limit = 20) {
  const q = new URLSearchParams({ search, page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/users/${userId}/following?${q.toString()}`);
  return parseJson<{ following: any[]; pagination: Pagination }>(res);
}

/* ── Search API ─────────────────────────────────────────────────── */

export async function fetchGlobalSearch(qStr: string, type: string, page = 1, limit = 20) {
  const q = new URLSearchParams({ q: qStr, type, page: String(page), limit: String(limit) });
  const res = await apiFetch(`/api/search?${q.toString()}`);
  return parseJson<{ users: any[]; posts: any[]; pagination: any }>(res);
}

export async function fetchTagSuggestions(qStr: string) {
  const q = new URLSearchParams({ q: qStr });
  const res = await apiFetch(`/api/search/tags/suggest?${q.toString()}`);
  return parseJson<{ tags: string[] }>(res);
}

import { apiFetch, parseJson } from "@/features/api/http";

/* ── Types ─────────────────────────────────────────────────── */

export type ProfilePrivacy = {
  showBirthday: boolean;
  showHometown: boolean;
  showPhone: boolean;
  showEmail: boolean;
};

export type UserProfile = {
  bio?: string;
  birthday?: string | null;
  hometown?: string;
  phone?: string;
  privacy?: ProfilePrivacy;
};

export type MeUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  cover?: string;
  authType?: string;
  role?: string;
  status?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  profile?: UserProfile;
};

export type PublicUser = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  cover?: string;
  role?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  profile?: Omit<UserProfile, "privacy">;
};

/* ── My profile ─────────────────────────────────────────────── */

export async function fetchMe(): Promise<{ user: MeUser }> {
  const res = await apiFetch("/api/users/me");
  return parseJson(res);
}

export type UpdateMeBody = {
  name?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  birthday?: string | null;
  hometown?: string;
  phone?: string;
  privacy?: Partial<ProfilePrivacy>;
};

export async function updateMe(body: UpdateMeBody): Promise<{ user: MeUser }> {
  const res = await apiFetch("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function uploadAvatarForm(form: FormData): Promise<{ avatar: string; user: MeUser }> {
  const res = await apiFetch("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
  return parseJson(res);
}

export async function uploadCoverForm(form: FormData): Promise<{ cover: string; user: MeUser }> {
  const res = await apiFetch("/api/users/me/cover", {
    method: "POST",
    body: form,
  });
  return parseJson(res);
}

/* ── Other users ─────────────────────────────────────────────── */

export async function fetchUserProfile(userId: string): Promise<{ user: PublicUser }> {
  const res = await apiFetch(`/api/users/${userId}/profile`);
  return parseJson(res);
}

/** Lấy bài viết công khai của một user (dùng endpoint posts với filter authorId) */
export async function fetchUserPosts(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ posts: any[]; pagination: any }> {
  const res = await apiFetch(`/api/posts?authorId=${userId}&page=${page}&limit=${limit}`);
  return parseJson(res);
}

export type SuggestedUser = {
  _id: string;
  name: string;
  avatar: string;
  hometown?: string | null;
  role?: string;
  followersCount: number;
  isFollowedByMe: boolean;
  reasons: string[];
};

export async function fetchSuggestedUsers(limit = 20): Promise<{ suggestions: SuggestedUser[] }> {
  const res = await apiFetch(`/api/users/suggestions?limit=${limit}`);
  return parseJson(res);
}


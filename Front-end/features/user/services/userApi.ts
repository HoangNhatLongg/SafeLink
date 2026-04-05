import { apiFetch, parseJson } from "@/features/api/http";

export type MeUser = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  authType?: string;
  role?: string;
  status?: string;
};

export async function fetchMe(): Promise<{ user: MeUser }> {
  const res = await apiFetch("/api/users/me");
  return parseJson(res);
}

export async function updateMe(body: { name?: string; avatar?: string }): Promise<{ user: MeUser }> {
  const res = await apiFetch("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

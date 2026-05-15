import { apiFetch, parseJson } from "@/features/api/http";

export interface SOSConnection {
  _id: string;
  sosId: any;
  senderId: any;
  helperId: any;
  status: "pending" | "accepted" | "rejected" | "resolved";
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  connectionId: string;
  senderId: string;
  text: string;
  image?: { url: string; width?: number; height?: number };
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

export async function requestToHelpSOS(sosId: string): Promise<{ message: string; connection: SOSConnection }> {
  const res = await apiFetch(`/api/sos/${sosId}/connect`, {
    method: "POST",
  });
  return parseJson(res);
}

export async function getMyConnections(): Promise<{ connections: SOSConnection[] }> {
  const res = await apiFetch(`/api/sos/connections`);
  return parseJson(res);
}

export async function updateConnectionStatus(
  connectionId: string,
  status: "accepted" | "rejected" | "resolved"
): Promise<{ message: string; connection: SOSConnection }> {
  const res = await apiFetch(`/api/sos/connections/${connectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseJson(res);
}

export async function getChatHistory(connectionId: string): Promise<{ messages: ChatMessage[]; connection?: SOSConnection }> {
  const res = await apiFetch(`/api/sos/connections/${connectionId}/messages`);
  return parseJson(res);
}

export async function sendRestMessage(
  connectionId: string,
  text: string
): Promise<{ message: ChatMessage }> {
  const res = await apiFetch(`/api/sos/connections/${connectionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson(res);
}

export async function sendImageMessage(
  connectionId: string,
  formData: FormData
): Promise<{ message: ChatMessage }> {
  // apiFetch will not set Content-Type if it is FormData, so fetch will automatically set boundary
  const res = await apiFetch(`/api/sos/connections/${connectionId}/messages`, {
    method: "POST",
    body: formData,
  });
  return parseJson(res);
}

export async function editMessage(
  messageId: string,
  text: string
): Promise<{ message: ChatMessage }> {
  const res = await apiFetch(`/api/sos/messages/${messageId}/edit`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson(res);
}

export async function deleteMessage(
  messageId: string
): Promise<{ message: ChatMessage }> {
  const res = await apiFetch(`/api/sos/messages/${messageId}/delete`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return parseJson(res);
}

export async function deleteConnectionRecord(connectionId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/api/sos/connections/${connectionId}`, {
    method: "DELETE",
  });
  return parseJson(res);
}

export async function resolveSOS(sosId: string): Promise<{ message: string; sosStatus: string }> {
  const res = await apiFetch(`/api/sos/${sosId}/resolve`, {
    method: "PATCH",
  });
  return parseJson(res);
}

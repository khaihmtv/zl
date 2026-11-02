/**
 * Client helper to call the Zalo Bot mini-service (port 3003)
 * All requests go through the gateway using XTransformPort
 */

const ZALO_PORT = 3003;

function zaloUrl(path: string): string {
  return `${path}?XTransformPort=${ZALO_PORT}`;
}

export interface ZaloStatus {
  loggedIn: boolean;
  isSending: boolean;
  browserStarting: boolean;
  lastError?: string;
  sessionExists: boolean;
  serviceConnected?: boolean;
  stats: {
    total: number;
    success: number;
    warning: number;
    failed: number;
  };
}

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SendMessageResponse {
  status: "success" | "warning" | "failed";
  note?: string;
  to: string;
  message: string;
  error?: string;
}

export interface Conversation {
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread: number;
}

export interface ChatMessage {
  sender: string;
  content: string;
  direction: "incoming" | "outgoing";
}

export interface LogEntry {
  timestamp: string;
  to: string;
  message: string;
  status: "success" | "warning" | "failed";
  note?: string;
}

export interface LogsResponse {
  total: number;
  stats: {
    success: number;
    warning: number;
    failed: number;
  };
  logs: LogEntry[];
}

export async function getZaloStatus(): Promise<ZaloStatus> {
  const res = await fetch(zaloUrl("/api/zalo/status"), { cache: "no-store" });
  if (!res.ok) throw new Error("Không thể kết nối đến Zalo Bot");
  return res.json();
}

export async function sendZaloMessage(to: string, message: string): Promise<SendMessageResponse> {
  const res = await fetch(zaloUrl("/api/zalo/send"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gửi tin thất bại");
  return data;
}

export async function getConversations(): Promise<{ conversations: Conversation[]; total: number }> {
  const res = await fetch(zaloUrl("/api/zalo/conversations"), { cache: "no-store" });
  if (!res.ok) throw new Error("Không thể lấy danh sách hội thoại");
  return res.json();
}

export async function readConversationMessages(name: string, limit = 30): Promise<{ messages: ChatMessage[]; total: number; conversation: string }> {
  const res = await fetch(zaloUrl("/api/zalo/conversations/read"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, limit }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Không thể đọc tin nhắn");
  }
  return res.json();
}

export async function getZaloLogs(): Promise<LogsResponse> {
  const res = await fetch(zaloUrl("/api/zalo/logs"), { cache: "no-store" });
  if (!res.ok) throw new Error("Không thể lấy logs");
  return res.json();
}

export async function logoutZalo(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(zaloUrl("/api/zalo/logout"), { cache: "no-store" });
  return res.json();
}

export async function restartZalo(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(zaloUrl("/api/zalo/restart"), {
    method: "POST",
    cache: "no-store",
  });
  return res.json();
}

export function getQrImageUrl(): string {
  return `/api/zalo/qr-image?XTransformPort=${ZALO_PORT}&t=${Date.now()}`;
}

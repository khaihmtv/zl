import { create } from "zustand";
import type { ZaloStatus, Conversation, ChatMessage, LogEntry } from "@/lib/zalo-client";

interface ZaloStore {
  // Status
  status: ZaloStatus | null;
  statusLoading: boolean;
  // QR
  qrLoading: boolean;
  // Conversations
  conversations: Conversation[];
  conversationsLoading: boolean;
  selectedConversation: string | null;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  // Send
  sending: boolean;
  // Logs
  logs: LogEntry[];
  logsLoading: boolean;

  // Actions
  setStatus: (status: ZaloStatus | null) => void;
  setStatusLoading: (v: boolean) => void;
  setQrLoading: (v: boolean) => void;
  setConversations: (c: Conversation[]) => void;
  setConversationsLoading: (v: boolean) => void;
  setSelectedConversation: (name: string | null) => void;
  setChatMessages: (m: ChatMessage[]) => void;
  setChatLoading: (v: boolean) => void;
  setSending: (v: boolean) => void;
  setLogs: (l: LogEntry[]) => void;
  setLogsLoading: (v: boolean) => void;
}

export const useZaloStore = create<ZaloStore>((set) => ({
  status: null,
  statusLoading: true,
  qrLoading: false,
  conversations: [],
  conversationsLoading: false,
  selectedConversation: null,
  chatMessages: [],
  chatLoading: false,
  sending: false,
  logs: [],
  logsLoading: false,

  setStatus: (status) => set({ status }),
  setStatusLoading: (v) => set({ statusLoading: v }),
  setQrLoading: (v) => set({ qrLoading: v }),
  setConversations: (c) => set({ conversations: c }),
  setConversationsLoading: (v) => set({ conversationsLoading: v }),
  setSelectedConversation: (name) => set({ selectedConversation: name, chatMessages: [] }),
  setChatMessages: (m) => set({ chatMessages: m }),
  setChatLoading: (v) => set({ chatLoading: v }),
  setSending: (v) => set({ sending: v }),
  setLogs: (l) => set({ logs: l }),
  setLogsLoading: (v) => set({ logsLoading: v }),
}));

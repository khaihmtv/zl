"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Search,
  ArrowLeft,
  Loader2,
  User,
} from "lucide-react";
import { useZaloStore } from "@/stores/zalo-store";
import { useToast } from "@/hooks/use-toast";

interface ConversationsPanelProps {
  loggedIn: boolean;
}

export function ConversationsPanel({ loggedIn }: ConversationsPanelProps) {
  const {
    conversations,
    conversationsLoading,
    selectedConversation,
    chatMessages,
    chatLoading,
    setConversations,
    setConversationsLoading,
    setSelectedConversation,
    setChatMessages,
    setChatLoading,
  } = useZaloStore();

  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    if (!loggedIn) return;
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/zalo/conversations?XTransformPort=3003");
      if (!res.ok) throw new Error("Không thể lấy danh sách");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setConversationsLoading(false);
    }
  }, [loggedIn, setConversations, setConversationsLoading, toast]);

  const fetchMessages = useCallback(async (name: string) => {
    setChatLoading(true);
    setSelectedConversation(name);
    try {
      const res = await fetch("/api/zalo/conversations?XTransformPort=3003", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, limit: 50 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể đọc tin nhắn");
      }
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  }, [setChatLoading, setSelectedConversation, setChatMessages, toast]);

  useEffect(() => {
    if (loggedIn) fetchConversations();
  }, [loggedIn, fetchConversations]);

  const filteredConversations = search
    ? conversations.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  if (!loggedIn) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cần đăng nhập Zalo để xem hội thoại</p>
        </CardContent>
      </Card>
    );
  }

  // Chat View
  if (selectedConversation) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">{selectedConversation}</CardTitle>
              <CardDescription className="text-[11px]">
                {chatLoading ? "Đang tải..." : `${chatMessages.length} tin nhắn`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMessages(selectedConversation)}
              disabled={chatLoading}
            >
              <Loader2 className={`h-3.5 w-3.5 mr-1 ${chatLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {chatLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Không có tin nhắn nào</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-2">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        msg.direction === "outgoing"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  // Conversations List
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Hội thoại
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {conversations.length}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchConversations}
              disabled={conversationsLoading}
            >
              <Loader2 className={`h-4 w-4 ${conversationsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm hội thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {conversationsLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? "Không tìm thấy hội thoại" : "Chưa có hội thoại nào"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div>
              {filteredConversations.map((conv, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  onClick={() => fetchMessages(conv.name)}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {conv.avatar ? (
                      <img
                        src={conv.avatar}
                        alt={conv.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">{conv.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground truncate pr-2">
                        {conv.lastMessage || "(chưa có tin nhắn)"}
                      </span>
                      {conv.unread > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center rounded-full">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

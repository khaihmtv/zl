"use client";

import { useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusCard } from "@/components/zalo/status-card";
import { QrLogin } from "@/components/zalo/qr-login";
import { SendMessage } from "@/components/zalo/send-message";
import { ConversationsPanel } from "@/components/zalo/conversations";
import { LogsPanel } from "@/components/zalo/logs-panel";
import { OrderPanel } from "@/components/zalo/order-panel";
import { useZaloStore } from "@/stores/zalo-store";
import { useToast } from "@/hooks/use-toast";
import { Bot, MessageSquare, Send, ScrollText, ShoppingCart } from "lucide-react";

export default function HomePage() {
  const {
    status,
    statusLoading,
    sending,
    logs,
    logsLoading,
    setStatus,
    setStatusLoading,
    setSending,
    setLogs,
    setLogsLoading,
  } = useZaloStore();

  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/zalo/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [setStatus, setStatusLoading]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/zalo/logs?XTransformPort=3003");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, [setLogs, setLogsLoading]);

  const handleSend = useCallback(
    async (to: string, message: string) => {
      setSending(true);
      try {
        const res = await fetch("/api/zalo/send?XTransformPort=3003", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, message }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gửi thất bại");
        setTimeout(() => {
          fetchStatus();
          fetchLogs();
        }, 1000);
      } finally {
        setSending(false);
      }
    },
    [setSending, fetchStatus, fetchLogs]
  );

  const handleRestart = async () => {
    try {
      const res = await fetch("/api/zalo/restart?XTransformPort=3003", { method: "POST" });
      const data = await res.json();
      toast({ title: "Khởi động lại", description: data.message });
      setTimeout(fetchStatus, 3000);
    } catch {
      toast({ title: "Lỗi", description: "Không thể khởi động lại", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    if (!confirm("Bạn có chắc muốn đăng xuất? Session sẽ bị xóa.")) return;
    try {
      const res = await fetch("/api/zalo/logout?XTransformPort=3003");
      const data = await res.json();
      toast({ title: "Đã đăng xuất", description: data.message });
      setTimeout(fetchStatus, 1000);
    } catch {
      toast({ title: "Lỗi", description: "Không thể đăng xuất", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const loggedIn = status?.loggedIn ?? false;
  const serviceConnected = status?.serviceConnected !== false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl flex h-14 items-center px-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">Zalo Bot</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Quản lý tin nhắn & đơn hàng</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${loggedIn ? "bg-emerald-500" : "bg-red-400"}`} />
            <span className="text-xs text-muted-foreground">{loggedIn ? "Đã kết nối" : "Mất kết nối"}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            <StatusCard
              status={status}
              loading={statusLoading}
              onRefresh={fetchStatus}
              onRestart={handleRestart}
              onLogout={handleLogout}
            />
            {!loggedIn && <QrLogin loggedIn={loggedIn} serviceConnected={serviceConnected} onLoginSuccess={fetchStatus} />}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm">
                  <ShoppingCart className="h-3.5 w-3.5 hidden sm:block" />
                  Đơn hàng
                </TabsTrigger>
                <TabsTrigger value="send" className="gap-1.5 text-xs sm:text-sm">
                  <Send className="h-3.5 w-3.5 hidden sm:block" />
                  Gửi tin
                </TabsTrigger>
                <TabsTrigger value="conversations" className="gap-1.5 text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5 hidden sm:block" />
                  Đọc tin
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-1.5 text-xs sm:text-sm">
                  <ScrollText className="h-3.5 w-3.5 hidden sm:block" />
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <OrderPanel loggedIn={loggedIn} />
              </TabsContent>

              <TabsContent value="send" className="mt-4">
                <SendMessage loggedIn={loggedIn} sending={sending} onSend={handleSend} />
              </TabsContent>

              <TabsContent value="conversations" className="mt-4">
                <ConversationsPanel loggedIn={loggedIn} />
              </TabsContent>

              <TabsContent value="logs" className="mt-4">
                <LogsPanel onRefresh={fetchLogs} loading={logsLoading} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Zalo Bot v2.0 — Playwright Automation + Order Management
          </p>
          <p className="text-[11px] text-muted-foreground">
            API: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">/api/zalo/*</code> · <code className="bg-muted px-1 py-0.5 rounded text-[10px]">/api/orders/*</code>
          </p>
        </div>
      </footer>
    </div>
  );
}

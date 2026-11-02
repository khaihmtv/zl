"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { useZaloStore } from "@/stores/zalo-store";
import { useToast } from "@/hooks/use-toast";

interface LogsPanelProps {
  onRefresh: () => void;
  loading: boolean;
}

export function LogsPanel({ onRefresh, loading }: LogsPanelProps) {
  const { logs } = useZaloStore();
  const { toast } = useToast();

  const handleClearLogs = async () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ logs?")) return;
    try {
      const res = await fetch("/api/zalo/logs?XTransformPort=3003", { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Đã xóa", description: "Toàn bộ logs đã được xóa" });
        onRefresh();
      }
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa logs", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      warning: "secondary",
      failed: "destructive",
    };
    const labels: Record<string, string> = {
      success: "Thành công",
      warning: "Cảnh báo",
      failed: "Thất bại",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-[10px]">
        {labels[status] || status}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lịch sử gửi tin
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Chưa có log nào</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {logs.map((log, i) => (
                <div key={i} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{log.to}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(log.status)}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1 truncate">{log.message}</p>
                      {log.note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{log.note}</p>
                      )}
                    </div>
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
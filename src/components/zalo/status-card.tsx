"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ZaloStatus } from "@/lib/zalo-client";

interface StatusCardProps {
  status: ZaloStatus | null;
  loading: boolean;
  onRefresh: () => void;
  onRestart: () => void;
  onLogout: () => void;
}

export function StatusCard({ status, loading, onRefresh, onRestart, onLogout }: StatusCardProps) {
  if (loading && !status) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CircleDot className="h-4 w-4" />
            Trạng thái Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const serviceConnected = status?.serviceConnected !== false;
  const isUp = status?.loggedIn ?? false;
  const isBusy = status?.isSending ?? false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CircleDot className="h-4 w-4" />
            Trạng thái Bot
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service not connected warning */}
        {!serviceConnected && (
          <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-sm text-amber-800">Zalo Bot Service chưa chạy</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Ứng dụng cần VPS với Chromium để chạy Zalo Bot.
              Bạn đang xem frontend demo — để dùng đầy đủ, deploy lên VPS:
            </p>
            <div className="bg-white rounded-md p-3 border border-amber-200">
              <p className="text-[11px] font-mono text-amber-900 mb-1"># Trên VPS Ubuntu/Debian:</p>
              <pre className="text-[11px] font-mono text-amber-800 overflow-x-auto whitespace-pre-wrap">
{`git clone <repo-url> zalo-bot && cd zalo-bot
chmod +x setup-vps.sh && ./setup-vps.sh`}
              </pre>
            </div>
            <p className="text-[11px] text-amber-600">
              Yêu cầu: VPS Ubuntu/Debian, tối thiểu 2GB RAM, Docker đã cài sẵn.
              Script sẽ tự động cài mọi thứ.
            </p>
          </div>
        )}

        {/* Main Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          {isUp ? (
            <Wifi className="h-8 w-8 text-emerald-500" />
          ) : (
            <WifiOff className="h-8 w-8 text-destructive" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{isUp ? "Đã đăng nhập" : "Chưa đăng nhập"}</span>
              {isBusy && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Đang gửi tin
                </Badge>
              )}
              {status?.browserStarting && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Đang khởi động
                </Badge>
              )}
            </div>
            {status?.lastError && (
              <p className="text-xs text-destructive mt-0.5">{status.lastError}</p>
            )}
            {serviceConnected && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Session: {status?.sessionExists ? "Đã lưu" : "Chưa có"}
              </p>
            )}
          </div>
          <Badge variant={isUp ? "default" : "destructive"} className="text-xs">
            {isUp ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-background border">
            <div className="text-lg font-bold">{status?.stats.total ?? 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Tổng</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-0.5" />
            <div className="text-lg font-bold text-emerald-700">{status?.stats.success ?? 0}</div>
            <div className="text-[10px] text-emerald-600 uppercase tracking-wide">Thành công</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto mb-0.5" />
            <div className="text-lg font-bold text-amber-700">{status?.stats.warning ?? 0}</div>
            <div className="text-[10px] text-amber-600 uppercase tracking-wide">Cảnh báo</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50 border border-red-100">
            <XCircle className="h-3.5 w-3.5 text-red-500 mx-auto mb-0.5" />
            <div className="text-lg font-bold text-red-700">{status?.stats.failed ?? 0}</div>
            <div className="text-[10px] text-red-600 uppercase tracking-wide">Thất bại</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onRestart} disabled={!serviceConnected}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Khởi động lại
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={onLogout} disabled={!serviceConnected}>
            Đăng xuất
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

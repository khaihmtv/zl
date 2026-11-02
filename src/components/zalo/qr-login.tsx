"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, RefreshCw, CheckCircle2, Smartphone, ServerCrash } from "lucide-react";

interface QrLoginProps {
  loggedIn: boolean;
  serviceConnected: boolean;
  onLoginSuccess: () => void;
}

export function QrLogin({ loggedIn, serviceConnected, onLoginSuccess }: QrLoginProps) {
  const [qrSrc, setQrSrc] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch(`/api/zalo/qr-image?t=${Date.now()}`);

      if (res.status === 200) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("image")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setQrSrc(url);
          setError("");
          retryCountRef.current = 0;
        } else {
          const data = await res.json();
          if (data.status === "logged_in") {
            onLoginSuccess();
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } else if (res.status === 204) {
        retryCountRef.current++;
        if (retryCountRef.current > 30) {
          setError("QR chưa sẵn sàng. Đợi thêm vài giây...");
        }
      } else if (res.status === 502) {
        // Service not running
        if (retryCountRef.current > 3) {
          setError("");
        }
        retryCountRef.current++;
      } else {
        setError("Lỗi khi lấy mã QR");
      }
    } catch {
      // silent
    }
  }, [onLoginSuccess]);

  useEffect(() => {
    if (loggedIn || !serviceConnected) return;

    const loadQr = async () => {
      await fetchQr();
    };
    loadQr();

    intervalRef.current = setInterval(fetchQr, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loggedIn, serviceConnected, fetchQr]);

  const handleRefresh = async () => {
    setRefreshing(true);
    retryCountRef.current = 0;
    await fetchQr();
    setRefreshing(false);
  };

  if (loggedIn) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">Đã đăng nhập thành công</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Session đã được lưu tự động. Bạn có thể gửi và đọc tin nhắn ngay.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!serviceConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <ServerCrash className="h-8 w-8 text-amber-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Chưa kết nối được Bot Service</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cần deploy lên VPS để chạy Zalo Bot (Playwright + Chromium). Xem hướng dẫn ở cột trái.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Đăng nhập Zalo
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Smartphone className="h-3 w-3 mr-1" />
            Quét QR Code
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {/* QR Container */}
          <div className="relative bg-white rounded-xl p-4 border-2 border-dashed border-muted-foreground/20">
            {qrSrc ? (
              <img
                ref={imgRef}
                src={qrSrc}
                alt="Zalo QR Code"
                className="w-64 h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Mở ứng dụng Zalo trên điện thoại</p>
            <p className="text-xs text-muted-foreground">
              Vào <span className="font-semibold">Quét mã QR</span> → Đặt camera vào mã bên trên
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center max-w-sm">{error}</p>
          )}

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới mã QR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
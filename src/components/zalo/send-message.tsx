"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendMessageProps {
  loggedIn: boolean;
  sending: boolean;
  onSend: (to: string, message: string) => Promise<void>;
}

interface SendResult {
  status: "success" | "warning" | "failed";
  note?: string;
}

export function SendMessage({ loggedIn, sending, onSend }: SendMessageProps) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!to.trim() || !message.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên người nhận và nội dung tin nhắn", variant: "destructive" });
      return;
    }

    setResult(null);
    try {
      await onSend(to.trim(), message.trim());
      setResult({ status: "success", note: "Đã gửi thành công" });
      toast({ title: "Thành công", description: `Đã gửi tin nhắn đến ${to.trim()}` });
    } catch (err: any) {
      setResult({ status: "failed", note: err.message });
      toast({ title: "Thất bại", description: err.message, variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="h-4 w-4" />
              Gửi tin nhắn
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Gửi tin nhắn đến người dùng Zalo qua tên hiển thị
            </CardDescription>
          </div>
          {!loggedIn && (
            <Badge variant="destructive" className="text-xs">Chưa đăng nhập</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipient */}
        <div className="space-y-2">
          <Label htmlFor="recipient" className="text-sm font-medium">
            Người nhận <span className="text-destructive">*</span>
          </Label>
          <Input
            id="recipient"
            placeholder="Nhập tên người dùng Zalo (VD: Nguyễn Văn A)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={sending || !loggedIn}
            onKeyDown={handleKeyDown}
          />
          <p className="text-[11px] text-muted-foreground">
            Nhập chính xác tên hiển thị trong Zalo (tên trong danh bạ)
          </p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="msg-content" className="text-sm font-medium">
            Nội dung tin nhắn <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="msg-content"
            placeholder="Nhập nội dung tin nhắn..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending || !loggedIn}
            rows={4}
            className="resize-none"
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-muted-foreground">
              {message.length} ký tự
            </p>
            <p className="text-[11px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> để gửi
            </p>
          </div>
        </div>

        {/* Send Result */}
        {result && (
          <div
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
              result.status === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : result.status === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {result.status === "success" && <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {result.status === "warning" && <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {result.status === "failed" && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            <span>{result.note}</span>
          </div>
        )}

        {/* Send Button */}
        <Button
          className="w-full"
          onClick={handleSend}
          disabled={sending || !loggedIn || !to.trim() || !message.trim()}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Đang gửi...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Gửi tin nhắn
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

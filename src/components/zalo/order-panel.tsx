"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Loader2,
  Search,
  Trash2,
  CheckCircle2,
  CircleDashed,
  DollarSign,
  CalendarDays,
  Phone,
  RefreshCw,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DayGroup {
  date: string;
  total: number;
  records: {
    id: string;
    phone: string;
    name: string | null;
    amount: number;
    amountFormatted: string;
    note: string | null;
    sent: boolean;
    sentAt: string | null;
    time: string;
    createdAt: string;
  }[];
}

interface OrderData {
  days: DayGroup[];
  grandTotal: number;
  total: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export function OrderPanel({ loggedIn }: { loggedIn: boolean }) {
  const { toast } = useToast();

  // Form state
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sendZalo, setSendZalo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // List state
  const [data, setData] = useState<OrderData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (phoneFilter = "") => {
    setLoading(true);
    try {
      const query = phoneFilter ? `?phone=${encodeURIComponent(phoneFilter)}` : "";
      const res = await fetch(`/api/orders${query}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !amount || Number(amount) <= 0) return;

    if (sendZalo && !loggedIn) {
      toast({ title: "Chưa đăng nhập Zalo", description: "Hãy đăng nhập Zalo trước khi gửi tin", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || undefined,
          amount: Number(amount),
          note: note.trim() || undefined,
          sendZalo,
        }),
      });
      const json = await res.json();

      if (!res.ok && res.status !== 202) {
        throw new Error(json.error || "Lỗi không xác định");
      }

      const label = sendZalo
        ? (json.zaloResult?.status === "success"
          ? "Đã gửi Zalo + lưu thành công"
          : `Đã lưu DB. ${json.warning || ""}`)
        : "Đã lưu thành công";

      toast({ title: "Thành công", description: label });

      // Reset form
      setAmount("");
      setNote("");

      // Refresh list
      fetchData(search);
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa bản ghi này?")) return;
    try {
      await fetch(`/api/orders/${id}`, { method: "DELETE" });
      toast({ title: "Đã xóa" });
      fetchData(search);
    } catch {
      toast({ title: "Lỗi", description: "Xóa thất bại", variant: "destructive" });
    }
  };

  const handleSearch = () => {
    fetchData(search);
  };

  return (
    <div className="space-y-4">
      {/* Quick Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Gửi thông báo tiền hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tên khách hàng</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Anh Hếu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Số điện thoại Zalo *</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="0354730757"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Số tiền (VNĐ) *</Label>
                <Input
                  type="number"
                  placeholder="150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ghi chú (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Tiền hàng ngày 21/8"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={sendZalo}
                  onChange={(e) => setSendZalo(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Send className="h-3.5 w-3.5" />
                Gửi tin Zalo
              </label>
              <Button type="submit" disabled={submitting} size="sm">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Lưu & Gửi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Tổng hợp
              {data && data.total > 0 && (
                <Badge variant="secondary" className="ml-1">{formatCurrency(data.grandTotal)}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm SĐT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-8 h-8 w-40 text-xs"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchData(search)}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Đang tải...
            </div>
          ) : !data?.days?.length ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Chưa có bản ghi nào
            </p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {data.days.map((day) => (
                <div key={day.date}>
                  {/* Day header */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{day.date}</span>
                      <Badge variant="outline" className="text-[10px]">{day.records.length} bản ghi</Badge>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(day.total)}</span>
                  </div>
                  <Separator className="mb-2" />

                  {/* Records */}
                  <div className="space-y-1.5">
                    {day.records.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs text-muted-foreground w-12 shrink-0">{r.time}</span>
                          {r.name && <span className="text-xs font-medium truncate">{r.name}</span>}
                          <span className="text-xs font-mono truncate">{r.phone}</span>
                          {r.note && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {r.note}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold">{r.amountFormatted}</span>
                          {r.sent ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(r.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Grand total */}
              <Separator />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold">TỔNG CỘNG ({data.total} bản ghi)</span>
                <span className="text-base font-bold text-primary">{formatCurrency(data.grandTotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

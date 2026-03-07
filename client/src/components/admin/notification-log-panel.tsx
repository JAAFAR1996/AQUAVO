/**
 * Admin Notification Log Panel
 * Shows all AI-sent notifications — what was sent, to whom, and when
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Send,
  MousePointerClick,
  AlertTriangle,
  Users,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  Sparkles,
  Leaf,
  Package,
  TrendingDown,
} from "lucide-react";

interface NotificationLogEntry {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  url: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: string;
  clickedAt: string | null;
  failedAt: string | null;
  failReason: string | null;
}

interface NotificationStats {
  total: number;
  lastWeek: number;
  clicked: number;
  clickRate: number;
  byType: Record<string, number>;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  replenishment: { label: "تذكير شراء", icon: RefreshCw, color: "bg-blue-500/10 text-blue-500" },
  churn_prevention: { label: "منع خسارة", icon: TrendingDown, color: "bg-red-500/10 text-red-500" },
  welcome: { label: "ترحيب", icon: UserPlus, color: "bg-green-500/10 text-green-500" },
  cart_abandonment: { label: "سلة متروكة", icon: ShoppingCart, color: "bg-orange-500/10 text-orange-500" },
  new_product: { label: "منتج جديد", icon: Package, color: "bg-purple-500/10 text-purple-500" },
  seasonal_tip: { label: "نصيحة موسمية", icon: Leaf, color: "bg-emerald-500/10 text-emerald-500" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "الآن";
  if (hours < 24) return `قبل ${hours} ساعة`;
  if (days < 7) return `قبل ${days} يوم`;

  return date.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationLogPanel() {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery<NotificationLogEntry[]>({
    queryKey: ["admin-notification-log"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/admin-log", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery<NotificationStats>({
    queryKey: ["admin-notification-stats"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/admin-stats", { credentials: "include" });
      if (!res.ok) return { total: 0, lastWeek: 0, clicked: 0, clickRate: 0, byType: {} };
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const filteredLogs = filterType === "all" ? logs : logs.filter(l => l.type === filterType);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المرسلة</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">كل الوقت</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">آخر 7 أيام</CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.lastWeek ?? 0}</div>
            <p className="text-xs text-muted-foreground">إشعارات هذا الأسبوع</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تم النقر</CardTitle>
            <MousePointerClick className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.clicked ?? 0}</div>
            <p className="text-xs text-muted-foreground">نقرة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">نسبة النقر</CardTitle>
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats?.clickRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground">CTR</p>
          </CardContent>
        </Card>
      </div>

      {/* Type breakdown */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byType).map(([type, count]) => {
            const typeInfo = TYPE_LABELS[type] || { label: type, color: "bg-gray-500/10 text-gray-500" };
            return (
              <Badge key={type} variant="outline" className={`${typeInfo.color} px-3 py-1 gap-1`}>
                {typeInfo.label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Log Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                سجل الإشعارات المرسلة
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="فلتر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="replenishment">تذكير شراء</SelectItem>
                  <SelectItem value="churn_prevention">منع خسارة</SelectItem>
                  <SelectItem value="welcome">ترحيب</SelectItem>
                  <SelectItem value="cart_abandonment">سلة متروكة</SelectItem>
                  <SelectItem value="new_product">منتج جديد</SelectItem>
                  <SelectItem value="seasonal_tip">نصيحة موسمية</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جاري التحميل...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">لا توجد إشعارات مرسلة بعد</p>
              <p className="text-sm mt-1">الإشعارات ستظهر هنا بعد تشغيل المحرك الذكي</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">المحتوى</TableHead>
                    <TableHead className="text-right">القناة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const typeInfo = TYPE_LABELS[log.type] || { label: log.type, icon: Bell, color: "bg-gray-500/10 text-gray-500" };
                    const TypeIcon = typeInfo.icon;

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className={`${typeInfo.color} gap-1`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{log.userName || "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium max-w-[200px] truncate">{log.title}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground max-w-[250px] truncate">{log.body}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {log.channel === "push" ? "📱 Push" : log.channel === "email" ? "📧 Email" : log.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(log.sentAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.clickedAt ? (
                            <Badge className="bg-green-500/10 text-green-500 gap-1">
                              <MousePointerClick className="h-3 w-3" />
                              نقر
                            </Badge>
                          ) : log.failedAt ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              فشل
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              مرسل
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

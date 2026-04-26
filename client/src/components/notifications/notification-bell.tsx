/**
 * Notification Bell - In-App Notification Center
 * Shows AI-generated notifications directly in UI - no permissions needed
 */

import { useCallback } from "react";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  Leaf,
  Package,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  url: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: string;
  readAt: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  replenishment: { icon: RefreshCw, color: "text-blue-500" },
  churn_prevention: { icon: TrendingDown, color: "text-red-500" },
  welcome: { icon: UserPlus, color: "text-green-500" },
  cart_abandonment: { icon: ShoppingCart, color: "text-orange-500" },
  new_product: { icon: Package, color: "text-purple-500" },
  seasonal_tip: { icon: Leaf, color: "text-emerald-500" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ي`;
  return `${Math.floor(days / 7)} أ`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["my-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/my-notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000, // Refresh every 2 min
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
  }, [unreadCount, queryClient]);

  // Mark one as read when clicked
  const handleClickNotification = useCallback(
    async (notif: Notification) => {
      // Mark as clicked (and read)
      if (!notif.readAt || !notif.metadata?.clicked) {
        fetch(`/api/notifications/track-click/${notif.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }).then(() => queryClient.invalidateQueries({ queryKey: ["my-notifications"] }));
      }
      // Navigate if has URL
      if (notif.url) {
        window.location.href = notif.url;
      }
    },
    [queryClient]
  );

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`الإشعارات${unreadCount > 0 ? ` - ${unreadCount} جديد` : ""}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-primary animate-pulse" aria-hidden="true" />
          ) : (
            <Bell className="h-5 w-5" aria-hidden="true" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            إشعارات AQUAVO
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 gap-1"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3" />
              قراءة الكل
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              جاري التحميل...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="h-10 w-10 mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">لا توجد إشعارات حالياً</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                ستصلك إشعارات ذكية من AI
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const config = TYPE_CONFIG[notif.type] || { icon: Bell, color: "text-muted-foreground" };
              const Icon = config.icon;
              const isUnread = !notif.readAt;

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotification(notif)}
                  className={cn(
                    "w-full text-right flex gap-3 p-3 transition-colors border-b last:border-0",
                    "hover:bg-muted/50 cursor-pointer",
                    isUnread && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("mt-0.5 flex-shrink-0", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className={cn("text-sm leading-tight", isUnread ? "font-semibold" : "font-normal")}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {timeAgo(notif.sentAt)}
                    </p>
                  </div>

                  {/* Read indicator */}
                  <div className="flex-shrink-0 mt-1">
                    {isUnread ? (
                      <span className="block h-2 w-2 rounded-full bg-primary" />
                    ) : (
                      <Check className="h-3 w-3 text-muted-foreground/30" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

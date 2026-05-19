/**
 * Notification Bell - In-App Notification Center
 * Shows AI-generated notifications directly in UI - no permissions needed
 */

import { useCallback, useState } from "react";
import { useLocation } from "wouter";
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
  Star,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { phTrackNotificationClicked } from "@/lib/posthog";

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
  churn_prevention: { icon: Sparkles, color: "text-primary" },
  we_missed_you: { icon: Sparkles, color: "text-primary" },
  personalized_recommendations: { icon: Sparkles, color: "text-primary" },
  recommendation_bundle: { icon: Sparkles, color: "text-primary" },
  welcome: { icon: UserPlus, color: "text-green-500" },
  cart_abandonment: { icon: ShoppingCart, color: "text-orange-500" },
  new_product: { icon: Package, color: "text-purple-500" },
  product_back_in_stock: { icon: Package, color: "text-blue-500" },
  product_recommendation_single: { icon: Package, color: "text-purple-500" },
  seasonal_tip: { icon: Leaf, color: "text-emerald-500" },
  order_delivered: { icon: Package, color: "text-green-500" },
  order_shipped: { icon: Package, color: "text-blue-500" },
  order_status: { icon: Package, color: "text-orange-500" },
  loyalty_points_earned: { icon: Star, color: "text-yellow-500" },
  loyalty_tier_upgrade: { icon: Star, color: "text-yellow-600" },
  loyalty_milestone: { icon: Star, color: "text-yellow-500" },
  wishlist_price_change: { icon: Heart, color: "text-red-400" },
  wishlist_back_in_stock: { icon: Heart, color: "text-red-500" },
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

/** Resolve the best destination URL for a notification */
function resolveNotifUrl(notif: Notification): string | null {
  const meta = notif.metadata || {};

  // Derive entity-aware URL from type, then fall back to stored url, then type default
  const entityUrl = (() => {
    switch (notif.type) {
      // Order notifications
      case "order_delivered":
      case "order_shipped":
      case "order_status":
        return meta.orderId ? `/profile?tab=orders` : "/profile?tab=orders";

      // Single product — go straight to product page
      case "replenishment":
      case "new_product":
      case "product_back_in_stock":
      case "product_recommendation_single":
        return meta.productSlug
          ? `/products/${meta.productSlug}`
          : (meta.productId ? `/products/${meta.productId}` : null);

      // Cart abandonment — go to cart
      case "cart_abandonment":
        return "/cart";

      // Re-engagement / recommendation bundles — curated products view
      case "churn_prevention":
      case "we_missed_you":
      case "personalized_recommendations":
      case "recommendation_bundle":
        return "/products?recommended=1&source=notification";

      // Wishlist notifications — product page if we have slug, else wishlist
      case "wishlist_price_change":
      case "wishlist_back_in_stock":
        return meta.productSlug
          ? `/products/${meta.productSlug}`
          : "/wishlist";

      // Loyalty — profile loyalty tab
      case "loyalty_points_earned":
      case "loyalty_tier_upgrade":
      case "loyalty_milestone":
        return "/profile?tab=loyalty";

      // Welcome — homepage
      case "welcome":
        return "/";

      // Seasonal content — blog
      case "seasonal_tip":
        return meta.blogSlug ? `/blog/${meta.blogSlug}` : "/blog";

      case "discount":
      case "offer":
        return "/products?sort=discount";

      default:
        return null;
    }
  })();

  // Priority: entity-aware URL > stored url > fallback from type
  if (entityUrl) return entityUrl;
  if (notif.url && notif.url !== "/products") return notif.url;
  // Legacy notifications that only have "/products" — upgrade churn/reengagement by body text
  if (notif.url === "/products") {
    const isReengagement =
      notif.type === "churn_prevention" ||
      notif.body?.includes("افتقدنا") ||
      notif.body?.includes("جهزنالك");
    if (isReengagement) return "/products?recommended=1&source=notification";
    return notif.url;
  }
  return null; // show modal
}

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [modalNotif, setModalNotif] = useState<Notification | null>(null);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["my-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/my-notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
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

  // Smart click handler — navigate based on type or show modal
  const handleClickNotification = useCallback(
    async (notif: Notification) => {
      const dest = resolveNotifUrl(notif);

      // Track click (fire-and-forget), also marks as read
      fetch(`/api/notifications/track-click/${notif.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }).then(() => queryClient.invalidateQueries({ queryKey: ["my-notifications"] }));

      phTrackNotificationClicked({
        type: notif.type,
        hasTargetUrl: !!dest,
        entityType: notif.metadata?.entityType as string | undefined,
        source: "notification_center",
      });

      setPopoverOpen(false);
      if (dest) {
        // Delay navigation until popover close animation finishes
        // Without this, Radix Popover steals focus and blocks wouter's navigate
        setTimeout(() => {
          const [destPath, destQuery] = dest.split("?");
          const currentPath = window.location.pathname;
          const currentQuery = window.location.search.slice(1);
          const sameDestination = currentPath === destPath && currentQuery === (destQuery ?? "");
          if (sameDestination) {
            // Same URL — force reload so the recommended banner appears
            window.location.href = dest;
          } else {
            navigate(dest);
          }
        }, 150);
      } else {
        // No destination — show full message in a modal
        setModalNotif(notif);
      }
    },
    [queryClient, navigate]
  );

  if (!user) return null;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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

      {/* Message Modal — shown for notifications with no destination URL */}
      <Dialog open={!!modalNotif} onOpenChange={() => setModalNotif(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{modalNotif?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            {modalNotif?.body}
          </p>
          <p className="text-[11px] text-muted-foreground/50 mt-3">
            {modalNotif?.sentAt ? new Date(modalNotif.sentAt).toLocaleString("ar-IQ") : ""}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

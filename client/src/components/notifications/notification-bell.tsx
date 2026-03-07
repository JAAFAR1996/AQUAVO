/**
 * Notification Bell Popover Component
 * Shows push notification status and allows users to subscribe/unsubscribe
 */

import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing, BellOff, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  getNotificationPermission,
} from "@/lib/push-notifications";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Check if push is supported
  const pushSupported = isPushSupported();

  // Check subscription status
  const { data: isSubscribed, refetch: refetchSubscription } = useQuery({
    queryKey: ["push-subscription-status"],
    queryFn: isSubscribedToPush,
    enabled: !!user && pushSupported,
    staleTime: 30_000,
  });

  // Get notification permission status
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );

  // Smart notification badge (pending reminders)
  const { data: notifStatus } = useQuery({
    queryKey: ["notification-status"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/my-status", { credentials: "include" });
      if (!res.ok) return { pendingReminders: 0 };
      return res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const pendingReminders = notifStatus?.pendingReminders ?? 0;

  // Update permission status
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isOpen]);

  // Handle subscribe
  const handleSubscribe = useCallback(async () => {
    if (!user) {
      toast({
        title: "سجل دخول أولاً",
        description: "لازم تسجل دخول عشان تفعل الإشعارات",
        variant: "destructive",
      });
      return;
    }

    setIsSubscribing(true);
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        toast({
          title: "تم تفعيل الإشعارات ✅",
          description: "راح توصلك إشعارات بالعروض والتذكيرات الذكية",
        });
        await refetchSubscription();
        setPermissionStatus("granted");
      } else {
        // Check if permission was denied
        const perm = getNotificationPermission();
        setPermissionStatus(perm);
        if (perm === "denied") {
          toast({
            title: "الإشعارات محظورة ❌",
            description: "فعّل الإشعارات من إعدادات المتصفح ثم حاول مرة ثانية",
            variant: "destructive",
          });
        } else {
          toast({
            title: "فشل تفعيل الإشعارات",
            description: "حاول مرة ثانية لاحقاً",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تفعيل الإشعارات",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  }, [user, toast, refetchSubscription]);

  // Handle unsubscribe
  const handleUnsubscribe = useCallback(async () => {
    setIsSubscribing(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        toast({
          title: "تم إلغاء الإشعارات",
          description: "لن تصلك إشعارات بعد الآن",
        });
        await refetchSubscription();
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
    } finally {
      setIsSubscribing(false);
    }
  }, [toast, refetchSubscription]);

  // Toggle handler
  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        handleSubscribe();
      } else {
        handleUnsubscribe();
      }
    },
    [handleSubscribe, handleUnsubscribe]
  );

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`الإشعارات${pendingReminders > 0 ? ` - ${pendingReminders} تذكير` : ""}`}
        >
          {isSubscribed ? (
            <BellRing className={cn("h-5 w-5", pendingReminders > 0 && "text-primary")} aria-hidden="true" />
          ) : (
            <Bell className="h-5 w-5" aria-hidden="true" />
          )}
          {pendingReminders > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {pendingReminders}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            إشعارات AQUAVO
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Push notification toggle */}
          {pushSupported ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="push-toggle" className="text-sm font-medium">
                  إشعارات الهاتف
                </label>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed
                    ? "تصلك عروض وتذكيرات ذكية"
                    : "فعّل لتوصلك العروض والتذكيرات"}
                </p>
              </div>
              {isSubscribing ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  id="push-toggle"
                  checked={!!isSubscribed}
                  onCheckedChange={handleToggle}
                  disabled={permissionStatus === "denied"}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <BellOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                متصفحك لا يدعم الإشعارات
              </p>
            </div>
          )}

          {/* Permission denied warning */}
          {permissionStatus === "denied" && (
            <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md">
              <p className="font-medium mb-1">الإشعارات محظورة في المتصفح</p>
              <p>اذهب إلى إعدادات المتصفح → الإشعارات → اسمح لـ aquavoiq.com</p>
            </div>
          )}

          {/* Subscription success state */}
          {isSubscribed && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>الإشعارات مفعلة - راح توصلك عروض وتذكيرات ذكية</span>
            </div>
          )}

          {/* Pending reminders */}
          {pendingReminders > 0 && (
            <Link href="/#predicted-needs" onClick={() => setIsOpen(false)}>
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md hover:bg-primary/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="bg-accent text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {pendingReminders}
                  </span>
                  <span className="text-sm font-medium">تذكيرات ذكية</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

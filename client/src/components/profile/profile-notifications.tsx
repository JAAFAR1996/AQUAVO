import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  getNotificationPermission,
  isPushSupported,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-notifications";

export function ProfileNotifications() {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const canPush = isPushSupported();
    setSupported(canPush);
    setPermission(getNotificationPermission());
    setSubscribed(canPush ? await isSubscribedToPush() : false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    setLoading(true);
    try {
      await subscribeToPush();
      await refresh();
      toast({
        title: "تم تفعيل الإشعارات",
        description: "راح توصلك التنبيهات المهمة من AQUAVO على هذا الجهاز.",
      });
    } catch (error) {
      await refresh();
      const message = error instanceof Error ? error.message : "تعذر تفعيل الإشعارات";
      toast({
        title: "تعذر تفعيل الإشعارات",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    const ok = await unsubscribeFromPush();
    await refresh();
    setLoading(false);
    toast({
      title: ok ? "تم إيقاف الإشعارات" : "تعذر إيقاف الإشعارات",
      description: ok
        ? "ما راح نرسل Push لهذا الجهاز بعد الآن."
        : "حاول مرة ثانية من هذا الجهاز.",
      variant: ok ? "default" : "destructive",
    });
  };

  const statusText = !supported
    ? "هذا المتصفح ما يدعم Push Notifications."
    : permission === "denied"
      ? "الإشعارات محظورة من إعدادات المتصفح. اسمح بها للموقع أولاً ثم ارجع جرّب."
      : subscribed
        ? "الإشعارات مفعّلة على هذا الجهاز."
        : "الإشعارات غير مفعّلة على هذا الجهاز.";

  return (
    <Card className="mt-6 border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2.5 text-primary">
            {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-bold">إشعارات المتصفح</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{statusText}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              التفعيل اختياري وتكدر توقفه بأي وقت من هنا أو من إعدادات المتصفح.
            </p>
          </div>
        </div>

        {supported && permission !== "denied" && (
          <Button
            type="button"
            variant={subscribed ? "outline" : "default"}
            onClick={() => void (subscribed ? disable() : enable())}
            disabled={loading}
            className="min-w-36"
          >
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {subscribed ? "إيقاف الإشعارات" : "تفعيل الإشعارات"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

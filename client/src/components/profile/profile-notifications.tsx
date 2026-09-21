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
import { useTranslation } from "react-i18next";

export function ProfileNotifications() {
  const { t } = useTranslation("account");
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
        title: t("profile-notifications.s1"),
        description: t("profile-notifications.s2"),
      });
    } catch (error) {
      await refresh();
      const message = error instanceof Error ? error.message : t("profile-notifications.s3");
      toast({
        title: t("profile-notifications.s3"),
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
      title: ok ? t("profile-notifications.s4") : t("profile-notifications.s5"),
      description: ok
        ? t("profile-notifications.s6")
        : t("profile-notifications.s7"),
      variant: ok ? "default" : "destructive",
    });
  };

  const statusText = !supported
    ? t("profile-notifications.s8")
    : permission === "denied"
      ? t("profile-notifications.s9")
      : subscribed
        ? t("profile-notifications.s10")
        : t("profile-notifications.s11");

  return (
    <Card className="mt-6 border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2.5 text-primary">
            {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-bold">{t("profile-notifications.s12")}</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{statusText}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("profile-notifications.s13")}
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
            {subscribed ? t("profile-notifications.s14") : t("profile-notifications.s15")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

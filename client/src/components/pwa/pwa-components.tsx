import { useState, useEffect } from "react";
import { Download, X, Smartphone, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";

// Install Prompt Banner
export function InstallPrompt({ className }: { className?: string }) {
    const { isInstallable, promptInstall, isInstalled } = usePWA();
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const dismissedAt = localStorage.getItem("pwa-install-dismissed");
        if (dismissedAt) {
            const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismiss < 7) setDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("pwa-install-dismissed", String(Date.now()));
    };

    if (!isInstallable || isInstalled || dismissed) return null;

    return (
        <Card className={cn("overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10", className)}>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">تثبيت التطبيق</h3>
                        <p className="text-xs text-muted-foreground">
                            أضف AQUAVO إلى شاشتك الرئيسية للوصول السريع
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={promptInstall} className="gap-1">
                            <Download className="w-4 h-4" />
                            تثبيت
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Offline Status Indicator
export function OfflineIndicator() {
    const { isOnline } = usePWA();
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setShowBanner(true);
        } else {
            // Show briefly when coming back online
            const timer = setTimeout(() => setShowBanner(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    if (!showBanner) return null;

    return (
        <div
            className={cn(
                "fixed bottom-4 left-4 right-4 z-50 flex items-center justify-center gap-2 p-3 rounded-lg shadow-lg transition-all",
                isOnline
                    ? "bg-green-500 text-white"
                    : "bg-amber-500 text-white"
            )}
        >
            {isOnline ? (
                <>
                    <Wifi className="w-5 h-5" />
                    <span className="font-medium">تم استعادة الاتصال</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-5 h-5" />
                    <span className="font-medium">أنت غير متصل بالإنترنت</span>
                </>
            )}
        </div>
    );
}

// Update Available Banner
export function UpdateBanner() {
    const { updateAvailable, updateApp } = usePWA();
    const [dismissed, setDismissed] = useState(false);

    if (!updateAvailable || dismissed) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-3">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    <span className="font-medium">يوجد تحديث جديد متاح</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={updateApp}
                    >
                        تحديث الآن
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setDismissed(true)}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Combined PWA Status for Footer or Settings
export function PWAStatus({ className }: { className?: string }) {
    const { isInstalled, isOnline } = usePWA();

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {isInstalled && (
                <Badge variant="secondary" className="gap-1">
                    <Smartphone className="w-3 h-3" />
                    تطبيق
                </Badge>
            )}
            <Badge
                variant={isOnline ? "secondary" : "destructive"}
                className="gap-1"
            >
                {isOnline ? (
                    <>
                        <Wifi className="w-3 h-3" />
                        متصل
                    </>
                ) : (
                    <>
                        <WifiOff className="w-3 h-3" />
                        غير متصل
                    </>
                )}
            </Badge>
        </div>
    );
}

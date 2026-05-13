import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2, AlertTriangle, Truck } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";

interface SettingsData {
    store_name: string;
    support_email: string;
    maintenance_mode: string;
    orders_enabled: string;
    shipping_fee: string;
}

const defaultSettings: SettingsData = {
    store_name: "AQUAVO",
    support_email: "info@aquavoiq.com",
    maintenance_mode: "false",
    orders_enabled: "true",
    shipping_fee: "5000",
};

async function fetchSettings(): Promise<SettingsData> {
    const res = await fetch("/api/admin/settings", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
}

async function updateSettings(data: SettingsData): Promise<void> {
    const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save settings");
    }
}

type DangerKey = "maintenance_mode" | "orders_enabled";

interface PendingSwitch {
    key: DangerKey;
    value: boolean;
}

const DANGER_CONFIG: Record<DangerKey, { title: string; description: string; confirmLabel: string }> = {
    maintenance_mode: {
        title: "تفعيل وضع الصيانة؟",
        description: "سيتم إيقاف الموقع أمام الزوار فوراً وعرض صفحة «قريباً». تأكد أنك تريد هذا قبل المتابعة.",
        confirmLabel: "نعم، فعّل الصيانة",
    },
    orders_enabled: {
        title: "إيقاف استقبال الطلبات؟",
        description: "لن يتمكن العملاء من إنشاء طلبات جديدة. هذا الإجراء يؤثر مباشرة على المبيعات.",
        confirmLabel: "نعم، أوقف الطلبات",
    },
};

export default function SettingsManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<SettingsData>(defaultSettings);
    const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);

    const { data: settings, isLoading, isError } = useQuery({
        queryKey: ["admin-settings"],
        queryFn: fetchSettings,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                store_name: settings.store_name || defaultSettings.store_name,
                support_email: settings.support_email || defaultSettings.support_email,
                maintenance_mode: settings.maintenance_mode || defaultSettings.maintenance_mode,
                orders_enabled: settings.orders_enabled || defaultSettings.orders_enabled,
                shipping_fee: settings.shipping_fee || defaultSettings.shipping_fee,
            });
        }
    }, [settings]);

    const saveMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
            toast({ title: "تم حفظ الإعدادات بنجاح" });
        },
        onError: (error: Error) => {
            toast({ title: "فشل حفظ الإعدادات", description: error.message, variant: "destructive" });
        },
    });

    const handleInputChange = (key: keyof SettingsData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Dangerous toggles — require confirmation before applying
    const requestDangerSwitch = (key: DangerKey, checked: boolean) => {
        // Only confirm when enabling maintenance or disabling orders
        const isDangerous = (key === "maintenance_mode" && checked) || (key === "orders_enabled" && !checked);
        if (isDangerous) {
            setPendingSwitch({ key, value: checked });
        } else {
            setFormData(prev => ({ ...prev, [key]: checked ? "true" : "false" }));
        }
    };

    const confirmDangerSwitch = () => {
        if (!pendingSwitch) return;
        setFormData(prev => ({ ...prev, [pendingSwitch.key]: pendingSwitch.value ? "true" : "false" }));
        setPendingSwitch(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="mr-3">جاري تحميل الإعدادات...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-12 text-destructive">
                <p>فشل في تحميل الإعدادات. يرجى المحاولة مرة أخرى.</p>
                <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-settings"] })}>
                    إعادة المحاولة
                </Button>
            </div>
        );
    }

    const dangerCfg = pendingSwitch ? DANGER_CONFIG[pendingSwitch.key] : null;

    return (
        <>
            {/* Confirmation dialog for dangerous switches */}
            <AlertDialog open={!!pendingSwitch} onOpenChange={(open) => !open && setPendingSwitch(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            {dangerCfg?.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{dangerCfg?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmDangerSwitch}
                        >
                            {dangerCfg?.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="space-y-6">
                {/* General settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-6 w-6" />
                            إعدادات المتجر العامة
                        </CardTitle>
                        <CardDescription>تكوين إعدادات الموقع الأساسية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="store_name">اسم المتجر</Label>
                                <Input
                                    id="store_name"
                                    value={formData.store_name}
                                    onChange={(e) => handleInputChange("store_name", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="support_email">البريد الإلكتروني للدعم</Label>
                                <Input
                                    id="support_email"
                                    type="email"
                                    value={formData.support_email}
                                    onChange={(e) => handleInputChange("support_email", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Maintenance mode — dangerous */}
                        <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                            <div className="space-y-0.5">
                                <Label htmlFor="maintenance_mode" className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    وضع الصيانة
                                </Label>
                                <p className="text-sm text-muted-foreground">تفعيل صفحة «قريباً» وإيقاف الموقع للزوار</p>
                            </div>
                            <Switch
                                id="maintenance_mode"
                                checked={formData.maintenance_mode === "true"}
                                onCheckedChange={(checked) => requestDangerSwitch("maintenance_mode", checked)}
                            />
                        </div>

                        {/* Orders toggle — dangerous */}
                        <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                            <div className="space-y-0.5">
                                <Label htmlFor="orders_enabled" className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    تفعيل الطلبات
                                </Label>
                                <p className="text-sm text-muted-foreground">السماح للعملاء بإنشاء طلبات جديدة — إيقافه يوقف المبيعات فوراً</p>
                            </div>
                            <Switch
                                id="orders_enabled"
                                checked={formData.orders_enabled === "true"}
                                onCheckedChange={(checked) => requestDangerSwitch("orders_enabled", checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Shipping fee only — no tax in Iraq */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-6 w-6" />
                            رسوم التوصيل
                        </CardTitle>
                        <CardDescription>تكلفة التوصيل الافتراضية التي تُضاف على كل طلب</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs space-y-2">
                            <Label htmlFor="shipping_fee" className="flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                رسوم التوصيل (د.ع)
                            </Label>
                            <Input
                                id="shipping_fee"
                                type="number"
                                min="0"
                                step="500"
                                value={formData.shipping_fee}
                                onChange={(e) => handleInputChange("shipping_fee", e.target.value)}
                                placeholder="5000"
                            />
                            <p className="text-xs text-muted-foreground">صفر = توصيل مجاني</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} size="lg">
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 ml-2" />
                        )}
                        حفظ التغييرات
                    </Button>
                </div>
            </div>
        </>
    );
}

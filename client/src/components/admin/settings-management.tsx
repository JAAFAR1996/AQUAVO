import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";

interface SettingsData {
    store_name: string;
    support_email: string;
    maintenance_mode: string;
    orders_enabled: string;
}

const defaultSettings: SettingsData = {
    store_name: "AQUAVO",
    support_email: "support@aquavo.iq",
    maintenance_mode: "false",
    orders_enabled: "true",
};

async function fetchSettings(): Promise<SettingsData> {
    const res = await fetch("/api/admin/settings", {
        credentials: "include",
    });
    if (!res.ok) {
        throw new Error("Failed to fetch settings");
    }
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

export default function SettingsManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch settings from database
    const { data: settings, isLoading, isError } = useQuery({
        queryKey: ["admin-settings"],
        queryFn: fetchSettings,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Local state for form
    const [formData, setFormData] = useState<SettingsData>(defaultSettings);

    // Sync form with fetched data
    useEffect(() => {
        if (settings) {
            setFormData({
                store_name: settings.store_name || defaultSettings.store_name,
                support_email: settings.support_email || defaultSettings.support_email,
                maintenance_mode: settings.maintenance_mode || defaultSettings.maintenance_mode,
                orders_enabled: settings.orders_enabled || defaultSettings.orders_enabled,
            });
        }
    }, [settings]);

    // Mutation for saving
    const saveMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
            toast({ title: "تم حفظ الإعدادات بنجاح" });
        },
        onError: (error: Error) => {
            toast({
                title: "فشل حفظ الإعدادات",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleSave = () => {
        saveMutation.mutate(formData);
    };

    const handleInputChange = (key: keyof SettingsData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSwitchChange = (key: keyof SettingsData, checked: boolean) => {
        setFormData(prev => ({ ...prev, [key]: checked ? "true" : "false" }));
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
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-settings"] })}
                >
                    إعادة المحاولة
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="maintenance_mode">وضع الصيانة</Label>
                            <p className="text-sm text-muted-foreground">تفعيل صفحة "قريباً" وإيقاف الموقع للزوار</p>
                        </div>
                        <Switch
                            id="maintenance_mode"
                            checked={formData.maintenance_mode === "true"}
                            onCheckedChange={(checked) => handleSwitchChange("maintenance_mode", checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="orders_enabled">تفعيل الطلبات</Label>
                            <p className="text-sm text-muted-foreground">السماح للعملاء بإنشاء طلبات جديدة</p>
                        </div>
                        <Switch
                            id="orders_enabled"
                            checked={formData.orders_enabled === "true"}
                            onCheckedChange={(checked) => handleSwitchChange("orders_enabled", checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    size="lg"
                >
                    {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 ml-2" />
                    )}
                    حفظ التغييرات
                </Button>
            </div>
        </div>
    );
}

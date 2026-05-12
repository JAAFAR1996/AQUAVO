import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Shield,
    Download,
    RefreshCw,
    CheckCircle,
    XCircle,
    Ban,
    Unlock,
    AlertTriangle,
    Activity,
    Clock,
    Globe,
    Search,
    Lock,
    Eye,
    EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { addCsrfHeader } from "@/lib/csrf";

interface SecurityStats {
    totalLoginAttempts: number;
    failedAttempts24h: number;
    successfulAttempts24h: number;
    blockedIPsCount: number;
    recentSuspiciousIPs: { ip: string; attempts: number }[];
}

interface LoginAttempt {
    id: string;
    userId: string | null;
    email: string;
    success: boolean;
    ipAddress: string | null;
    userAgent: string | null;
    failureReason: string | null;
    createdAt: string;
}

interface BlockedIP {
    id: string;
    ipAddress: string;
    reason: string;
    failedAttempts: number;
    blockedAt: string;
    expiresAt: string | null;
    isActive: boolean;
}

export default function SecurityManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchEmail, setSearchEmail] = useState("");
    const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
    const [showPasswords, setShowPasswords] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Fetch security stats
    const { data: stats, isLoading: statsLoading } = useQuery<SecurityStats>({
        queryKey: ["/api/admin/security/stats"],
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch login attempts
    const { data: attemptsData, isLoading: attemptsLoading } = useQuery<{
        attempts: LoginAttempt[];
        total: number;
    }>({
        queryKey: ["/api/admin/security/login-attempts", searchEmail],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "50" });
            if (searchEmail) params.append("email", searchEmail);
            const response = await fetch(`/api/admin/security/login-attempts?${params}`, {
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch");
            return response.json();
        },
    });

    // Fetch blocked IPs
    const { data: blockedIPs, isLoading: blockedLoading } = useQuery<BlockedIP[]>({
        queryKey: ["/api/admin/security/blocked-ips"],
    });

    // Unblock IP mutation
    const unblockMutation = useMutation({
        mutationFn: async (ipAddress: string) => {
            const response = await fetch("/api/admin/security/unblock-ip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ipAddress }),
            });
            if (!response.ok) throw new Error("Failed to unblock");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/security/blocked-ips"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/security/stats"] });
            toast({ title: "تم إلغاء الحظر بنجاح" });
        },
        onError: () => {
            toast({ title: "فشل إلغاء الحظر", variant: "destructive" });
        },
    });

    // Download backup
    const handleDownloadBackup = async () => {
        try {
            toast({ title: "جاري إنشاء النسخة الاحتياطية..." });
            const response = await fetch("/api/admin/security/backup", {
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to create backup");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `aquavo-backup-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast({ title: "تم تنزيل النسخة الاحتياطية بنجاح" });
        } catch (error) {
            toast({ title: "فشل إنشاء النسخة الاحتياطية", variant: "destructive" });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        لوحة الأمان
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        مراقبة محاولات الدخول والنسخ الاحتياطي
                    </p>
                </div>
                <Button onClick={handleDownloadBackup} className="gap-2">
                    <Download className="w-4 h-4" />
                    نسخة احتياطية
                </Button>
            </div>

            {/* Change Password Section */}
            <Card className="border-red-200 dark:border-red-900/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Lock className="w-5 h-5 text-red-500" />
                        تغيير كلمة مرور الأدمن
                    </CardTitle>
                    <CardDescription>يُنصح بتغيير كلمة المرور بشكل دوري واستخدام كلمة قوية</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (passwordForm.newPass !== passwordForm.confirm) {
                            toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
                            return;
                        }
                        if (passwordForm.newPass.length < 8) {
                            toast({ title: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
                            return;
                        }
                        setChangingPassword(true);
                        try {
                            const res = await fetch("/api/users/user/change-password", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", ...addCsrfHeader() },
                                credentials: "include",
                                body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }),
                            });
                            if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                throw new Error(err?.message || "فشل تغيير كلمة المرور");
                            }
                            toast({ title: "✅ تم تغيير كلمة المرور بنجاح" });
                            setPasswordForm({ current: "", newPass: "", confirm: "" });
                        } catch (err: any) {
                            toast({ title: err.message || "فشل تغيير كلمة المرور", variant: "destructive" });
                        } finally {
                            setChangingPassword(false);
                        }
                    }} className="grid gap-4 max-w-md">
                        <div className="space-y-2">
                            <Label>كلمة المرور الحالية</Label>
                            <div className="relative">
                                <Input
                                    type={showPasswords ? "text" : "password"}
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                                    required
                                />
                                <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPasswords(!showPasswords)}>
                                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>كلمة المرور الجديدة</Label>
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={passwordForm.newPass}
                                onChange={(e) => setPasswordForm(p => ({ ...p, newPass: e.target.value }))}
                                required
                                minLength={8}
                            />
                            {passwordForm.newPass && (
                                <p className={`text-xs ${passwordForm.newPass.length >= 8 && /[A-Z]/.test(passwordForm.newPass) && /[0-9]/.test(passwordForm.newPass) ? "text-green-500" : "text-amber-500"}`}>
                                    {passwordForm.newPass.length >= 8 && /[A-Z]/.test(passwordForm.newPass) && /[0-9]/.test(passwordForm.newPass) ? "✓ كلمة مرور قوية" : "⚠ يُفضل: 8+ أحرف، حرف كبير، رقم"}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>تأكيد كلمة المرور الجديدة</Label>
                            <Input
                                type={showPasswords ? "text" : "password"}
                                value={passwordForm.confirm}
                                onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={changingPassword} className="w-fit">
                            {changingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي المحاولات</p>
                                <p className="text-2xl font-bold">{stats?.totalLoginAttempts || 0}</p>
                            </div>
                            <Activity className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">ناجحة (24 ساعة)</p>
                                <p className="text-2xl font-bold text-green-600">{stats?.successfulAttempts24h || 0}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">فاشلة (24 ساعة)</p>
                                <p className="text-2xl font-bold text-red-600">{stats?.failedAttempts24h || 0}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">IPs محظورة</p>
                                <p className="text-2xl font-bold text-orange-600">{stats?.blockedIPsCount || 0}</p>
                            </div>
                            <Ban className="w-8 h-8 text-orange-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Suspicious IPs Alert */}
            {stats?.recentSuspiciousIPs && stats.recentSuspiciousIPs.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            <AlertTriangle className="w-5 h-5" />
                            عناوين IP مشبوهة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {stats.recentSuspiciousIPs.map((item, index) => (
                                <Badge key={index} variant="outline" className="gap-1">
                                    <Globe className="w-3 h-3" />
                                    {item.ip}
                                    <span className="text-red-500">({item.attempts} محاولات)</span>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="attempts">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="attempts">محاولات الدخول</TabsTrigger>
                    <TabsTrigger value="blocked">IPs المحظورة</TabsTrigger>
                </TabsList>

                {/* Login Attempts Tab */}
                <TabsContent value="attempts" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>سجل محاولات الدخول</CardTitle>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="بحث بالبريد..."
                                            value={searchEmail}
                                            onChange={(e) => setSearchEmail(e.target.value)}
                                            className="pr-9 w-48"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/security/login-attempts"] })}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {attemptsLoading ? (
                                <div className="text-center py-8">جاري التحميل...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الحالة</TableHead>
                                            <TableHead>البريد</TableHead>
                                            <TableHead>IP</TableHead>
                                            <TableHead>السبب</TableHead>
                                            <TableHead>الوقت</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attemptsData?.attempts.map((attempt) => (
                                            <TableRow key={attempt.id}>
                                                <TableCell>
                                                    {attempt.success ? (
                                                        <Badge className="bg-green-500">نجاح</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">فشل</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{attempt.email}</TableCell>
                                                <TableCell className="font-mono text-sm">{attempt.ipAddress || "-"}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {attempt.failureReason || "-"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(attempt.createdAt)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!attemptsData?.attempts.length && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    لا توجد محاولات دخول مسجلة
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Blocked IPs Tab */}
                <TabsContent value="blocked" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>عناوين IP المحظورة</CardTitle>
                            <CardDescription>
                                يتم حظر عناوين IP تلقائياً بعد 5 محاولات فاشلة
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {blockedLoading ? (
                                <div className="text-center py-8">جاري التحميل...</div>
                            ) : blockedIPs?.length ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>عنوان IP</TableHead>
                                            <TableHead>السبب</TableHead>
                                            <TableHead>المحاولات</TableHead>
                                            <TableHead>تاريخ الحظر</TableHead>
                                            <TableHead>انتهاء الحظر</TableHead>
                                            <TableHead>إجراء</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {blockedIPs.map((blocked) => (
                                            <TableRow key={blocked.id}>
                                                <TableCell className="font-mono">{blocked.ipAddress}</TableCell>
                                                <TableCell className="text-sm">{blocked.reason}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{blocked.failedAttempts}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{formatDate(blocked.blockedAt)}</TableCell>
                                                <TableCell className="text-sm">
                                                    {blocked.expiresAt ? formatDate(blocked.expiresAt) : "دائم"}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => unblockMutation.mutate(blocked.ipAddress)}
                                                        disabled={unblockMutation.isPending}
                                                    >
                                                        <Unlock className="w-4 h-4 ml-1" />
                                                        إلغاء الحظر
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Ban className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    لا توجد عناوين IP محظورة
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

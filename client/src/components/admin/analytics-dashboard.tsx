import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    Eye,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    PieChart,
    Activity,
    Loader2,
    Route,
    Clock,
    Monitor,
    Smartphone,
    LayoutList,
} from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPie,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from "recharts";

interface SourceData {
    source: string;
    visits: number;
    uniqueUsers: number;
    recentVisitors: {
        fullName: string | null;
        email: string | null;
        pagePath: string;
        timestamp: string;
    }[];
}

interface AnalyticsData {
    summary: {
        totalRevenue: number;
        revenueChange: number;
        totalOrders: number;
        ordersChange: number;
        totalCustomers: number;
        customersChange: number;
        totalPageViews: number;
        pageViewsChange: number;
        averageOrderValue: number;
        conversionRate: number;
    };
    salesChart: { date: string; revenue: number; orders: number }[];
    topProducts: { name: string; sales: number; revenue: number }[];
    trafficSources: { source: string; visits: number; percentage: number }[];
    ordersByStatus: { status: string; count: number }[];
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PLATFORM_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    facebook:  { label: "فيسبوك",      emoji: "📘", color: "#1877f2", bg: "bg-blue-50 dark:bg-blue-950/30" },
    instagram: { label: "انستغرام",    emoji: "📸", color: "#e1306c", bg: "bg-pink-50 dark:bg-pink-950/30" },
    tiktok:    { label: "تيك توك",     emoji: "🎵", color: "#000000", bg: "bg-slate-50 dark:bg-slate-800/30" },
    google:    { label: "بحث Google",  emoji: "🔍", color: "#4285f4", bg: "bg-sky-50 dark:bg-sky-950/30" },
    youtube:   { label: "يوتيوب",      emoji: "▶️", color: "#ff0000", bg: "bg-red-50 dark:bg-red-950/30" },
    twitter:   { label: "تويتر / X",   emoji: "🐦", color: "#1da1f2", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
    snapchat:  { label: "سناب شات",    emoji: "👻", color: "#ffcc00", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    whatsapp:  { label: "واتساب",      emoji: "💬", color: "#25d366", bg: "bg-green-50 dark:bg-green-950/30" },
    telegram:  { label: "تيليغرام",    emoji: "✈️", color: "#0088cc", bg: "bg-blue-50 dark:bg-blue-950/30" },
    bing:      { label: "Bing",        emoji: "🔎", color: "#00809d", bg: "bg-teal-50 dark:bg-teal-950/30" },
    linkedin:  { label: "لينكدإن",     emoji: "💼", color: "#0a66c2", bg: "bg-blue-50 dark:bg-blue-950/30" },
    direct:    { label: "مباشر",       emoji: "🔗", color: "#6b7280", bg: "bg-gray-50 dark:bg-gray-800/30" },
    other:     { label: "أخرى",        emoji: "🌐", color: "#9ca3af", bg: "bg-gray-50 dark:bg-gray-800/30" },
};

export function AnalyticsDashboard() {
    const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

    const { data, isLoading, error } = useQuery<AnalyticsData>({
        queryKey: ["admin-analytics", period],
        queryFn: async () => {
            const res = await fetch(`/api/admin/analytics?period=${period}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        },
    });

    const { data: sourcesData } = useQuery<SourceData[]>({
        queryKey: ["admin-analytics-sources"],
        queryFn: async () => {
            const res = await fetch("/api/admin/analytics/sources", { credentials: "include" });
            if (!res.ok) throw new Error("Failed");
            const json = await res.json();

            // API returns { sources: [...], recentBySource: { [src]: [...] } }
            const rawSources: { source: string; visits: number; uniqueUsers: number }[] = json.sources ?? [];
            const recentBySource: Record<string, { userFullName: string | null; userEmail: string | null; pagePath: string; createdAt: string }[]> = json.recentBySource ?? {};

            return rawSources.map(s => ({
                source: s.source,
                visits: s.visits,
                uniqueUsers: s.uniqueUsers,
                recentVisitors: (recentBySource[s.source] ?? []).map(v => ({
                    fullName: v.userFullName ?? null,
                    email: v.userEmail ?? null,
                    pagePath: v.pagePath,
                    timestamp: v.createdAt,
                })),
            }));
        },
        refetchInterval: 60_000,
    });

    interface JourneySession {
        sessionId: string;
        userId: string | null;
        fullName: string | null;
        email: string | null;
        ipAddress: string | null;
        source: string;
        deviceType: string | null;
        startedAt: string;
        pages: { path: string; duration: number | null; timestamp: string }[];
    }

    interface PageStat {
        pagePath: string;
        views: number;
        uniqueUsers: number;
        anonymousViews: number;
        avgDuration: number;
        mobileViews: number;
        desktopViews: number;
        fromGoogle: number;
        fromFacebook: number;
        fromDirect: number;
        fromInstagram: number;
        fromTiktok: number;
        fromWhatsapp: number;
        fromOther: number;
    }

    interface ActiveNowPage { pagePath: string; total: number; loggedIn: number; anonymous: number; }

    const { data: pagesData, error: pagesError } = useQuery<{ pages: PageStat[]; days: number; totalViews: number }>({
        queryKey: ["admin-analytics-pages", period],
        queryFn: async () => {
            const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
            const res = await fetch(`/api/admin/analytics/pages?days=${days}&limit=50`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 60_000,
    });

    const { data: activeNow } = useQuery<{ total: number; byPage: ActiveNowPage[] }>({
        queryKey: ["admin-analytics-active-now"],
        queryFn: async () => {
            const res = await fetch("/api/admin/analytics/active-now", { credentials: "include" });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 30_000, // poll every 30s
    });

    const { data: journeysData } = useQuery<JourneySession[]>({
        queryKey: ["admin-analytics-journeys"],
        queryFn: async () => {
            const res = await fetch("/api/admin/analytics/journeys?days=7", { credentials: "include" });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 60_000,
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("ar-IQ", {
            style: "decimal",
            minimumFractionDigits: 0,
        }).format(value) + " د.ع";
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("ar-IQ").format(value);
    };

    const renderChangeIndicator = (change: number) => {
        const isPositive = change >= 0;
        return (
            <span className={`flex items-center text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(change).toFixed(1)}%
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">فشل تحميل التحليلات</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">التحليلات</h2>
                    <p className="text-muted-foreground">نظرة شاملة على أداء متجرك</p>
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">آخر 7 أيام</SelectItem>
                        <SelectItem value="30d">آخر 30 يوم</SelectItem>
                        <SelectItem value="90d">آخر 90 يوم</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                                <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            {renderChangeIndicator(data.summary.revenueChange)}
                            <span className="text-xs text-muted-foreground mr-1">مقارنة بالفترة السابقة</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                                <p className="text-2xl font-bold">{formatNumber(data.summary.totalOrders)}</p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                <ShoppingCart className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            {renderChangeIndicator(data.summary.ordersChange)}
                            <span className="text-xs text-muted-foreground mr-1">مقارنة بالفترة السابقة</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">العملاء</p>
                                <p className="text-2xl font-bold">{formatNumber(data.summary.totalCustomers)}</p>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            {renderChangeIndicator(data.summary.customersChange)}
                            <span className="text-xs text-muted-foreground mr-1">عملاء جدد</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">مشاهدات الصفحات</p>
                                <p className="text-2xl font-bold">{formatNumber(data.summary.totalPageViews)}</p>
                            </div>
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                <Eye className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            {renderChangeIndicator(data.summary.pageViewsChange)}
                            <span className="text-xs text-muted-foreground mr-1">مقارنة بالفترة السابقة</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full">
                                <Activity className="w-6 h-6 text-cyan-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">متوسط قيمة الطلب</p>
                                <p className="text-xl font-bold">{formatCurrency(data.summary.averageOrderValue)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                                <TrendingUp className="w-6 h-6 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">معدل التحويل</p>
                                <p className="text-xl font-bold">{data.summary.conversionRate.toFixed(2)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="sales" dir="rtl">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="sales">
                        <BarChart3 className="w-4 h-4 ml-2" />
                        المبيعات
                    </TabsTrigger>
                    <TabsTrigger value="products">
                        <Package className="w-4 h-4 ml-2" />
                        المنتجات
                    </TabsTrigger>
                    <TabsTrigger value="traffic">
                        <PieChart className="w-4 h-4 ml-2" />
                        الزيارات
                    </TabsTrigger>
                    <TabsTrigger value="pages">
                        <LayoutList className="w-4 h-4 ml-2" />
                        الصفحات
                    </TabsTrigger>
                    <TabsTrigger value="journeys">
                        <Route className="w-4 h-4 ml-2" />
                        رحلات الزوار
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>الإيرادات والطلبات</CardTitle>
                            <CardDescription>تطور المبيعات خلال الفترة المحددة</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.salesChart}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs" />
                                        <YAxis className="text-xs" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                            formatter={(value: number, name: string) => [
                                                name === "revenue" ? formatCurrency(value) : value,
                                                name === "revenue" ? "الإيرادات" : "الطلبات",
                                            ]}
                                        />
                                        <Legend formatter={(value) => (value === "revenue" ? "الإيرادات" : "الطلبات")} />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#10b981"
                                            fill="#10b98133"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="orders"
                                            stroke="#3b82f6"
                                            fill="#3b82f633"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="products" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>أكثر المنتجات مبيعاً</CardTitle>
                            <CardDescription>أفضل 10 منتجات حسب المبيعات</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.topProducts} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis type="number" className="text-xs" />
                                        <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                            formatter={(value: number) => [formatNumber(value), "المبيعات"]}
                                        />
                                        <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="traffic" className="mt-4 space-y-4">
                    {/* Per-platform source cards */}
                    {sourcesData && sourcesData.length > 0 ? (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">مصادر الزيارات حسب المنصة</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {sourcesData.map((src) => {
                                    const cfg = PLATFORM_CONFIG[src.source] ?? PLATFORM_CONFIG["other"];
                                    const totalVisits = sourcesData.reduce((s, x) => s + x.visits, 0);
                                    const pct = totalVisits > 0 ? Math.round((src.visits / totalVisits) * 100) : 0;
                                    return (
                                        <Card key={src.source} className={`border-0 ${cfg.bg}`}>
                                            <CardContent className="pt-4 pb-3 px-4">
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl">{cfg.emoji}</span>
                                                        <div>
                                                            <p className="font-semibold text-sm">{cfg.label}</p>
                                                            <p className="text-xs text-muted-foreground">{pct}% من الزيارات</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xl font-bold" style={{ color: cfg.color }}>{formatNumber(src.visits)}</p>
                                                        <p className="text-xs text-muted-foreground">{formatNumber(src.uniqueUsers)} فريد</p>
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                                                    <div
                                                        className="h-1.5 rounded-full transition-all"
                                                        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                                                    />
                                                </div>
                                                {/* Recent visitors */}
                                                {src.recentVisitors.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs text-muted-foreground font-medium mb-1">آخر الزوار</p>
                                                        {src.recentVisitors.slice(0, 4).map((v, i) => (
                                                            <div key={i} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                                                        style={{ backgroundColor: cfg.color }}>
                                                                        {(v.fullName ?? "؟").charAt(0)}
                                                                    </div>
                                                                    <span className="truncate font-medium">
                                                                        {v.fullName ?? (v.email ? v.email.split("@")[0] : "زائر مجهول")}
                                                                    </span>
                                                                </div>
                                                                <span className="text-muted-foreground truncate max-w-[80px] mr-1" dir="ltr">
                                                                    {v.pagePath.length > 14 ? v.pagePath.slice(0, 14) + "…" : v.pagePath}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground text-sm">
                                لا توجد بيانات مصادر بعد — ستظهر هنا تلقائياً عند بدء الزيارات
                            </CardContent>
                        </Card>
                    )}

                    {/* Original charts row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>توزيع المصادر</CardTitle>
                                <CardDescription>نسبة كل مصدر من إجمالي الزيارات</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPie>
                                            <Pie
                                                data={data.trafficSources}
                                                dataKey="visits"
                                                nameKey="source"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ source, percentage }) => `${source} (${percentage}%)`}
                                            >
                                                {data.trafficSources.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>حالة الطلبات</CardTitle>
                                <CardDescription>توزيع الطلبات حسب الحالة</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.ordersByStatus.map((item, index) => (
                                        <div key={item.status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-sm">{item.status}</span>
                                            </div>
                                            <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Journeys Tab */}
                <TabsContent value="journeys" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>رحلات الزوار</CardTitle>
                            <CardDescription>تتبع مسار كل زائر — أي صفحات زارها وكم ثانية بقي في كل صفحة</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {journeysData && journeysData.length > 0 ? (
                                <div className="space-y-3">
                                    {journeysData.slice(0, 30).map((session, idx) => {
                                        const cfg = PLATFORM_CONFIG[session.source] ?? PLATFORM_CONFIG["other"];
                                        const totalDuration = session.pages.reduce((s, p) => s + (p.duration ?? 0), 0);
                                        const isLoggedIn = !!session.fullName || !!session.email;
                                        // Visitor display name
                                        const visitorName = session.fullName
                                            ?? (session.email ? session.email.split("@")[0] : null)
                                            ?? `زائر #${idx + 1}`;
                                        const startDate = new Date(session.startedAt);
                                        const timeStr = startDate.toLocaleString("ar-IQ", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

                                        return (
                                            <div key={session.sessionId}
                                                className="border border-border rounded-lg p-4 bg-card text-card-foreground">
                                                {/* Session Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                                                            style={{ backgroundColor: cfg.color }}>
                                                            {isLoggedIn ? visitorName.charAt(0).toUpperCase() : `#${idx + 1}`}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-foreground">{visitorName}</p>
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                                                                {!isLoggedIn && session.ipAddress && (
                                                                    <>
                                                                        <span className="font-mono text-[11px]">IP: {session.ipAddress}</span>
                                                                        <span>•</span>
                                                                    </>
                                                                )}
                                                                <span>{cfg.emoji} {cfg.label}</span>
                                                                <span>•</span>
                                                                <span>{timeStr}</span>
                                                                <span>•</span>
                                                                {session.deviceType === "mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left shrink-0">
                                                        <p className="text-sm font-bold text-foreground">{session.pages.length} صفحات</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}د ${totalDuration % 60}ث` : `${totalDuration}ث`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Page Timeline */}
                                                <div className="relative mr-4">
                                                    {session.pages.map((page, i) => (
                                                        <div key={i} className="flex items-start gap-3 relative">
                                                            {/* Timeline line + dot */}
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? "bg-green-500" : i === session.pages.length - 1 ? "bg-red-400" : "bg-blue-400"}`} />
                                                                {i < session.pages.length - 1 && (
                                                                    <div className="w-0.5 h-6 bg-border" />
                                                                )}
                                                            </div>
                                                            {/* Content */}
                                                            <div className="flex items-center justify-between w-full pb-2 -mt-1">
                                                                <span className="text-xs font-mono truncate max-w-[200px] text-foreground" dir="ltr">{page.path}</span>
                                                                {page.duration != null && page.duration > 0 ? (
                                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                                                        {page.duration >= 60 ? `${Math.floor(page.duration / 60)}د ${page.duration % 60}ث` : `${page.duration}ث`}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">—</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-muted-foreground text-sm">
                                    لا توجد رحلات مسجلة بعد — ستظهر تلقائياً عند بدء الزيارات
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pages Tab */}
                <TabsContent value="pages" className="mt-4 space-y-4">

                    {/* Active Now Banner */}
                    <Card className="border-green-500/30 bg-green-500/5">
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                                    </span>
                                    <span className="font-bold text-green-400 text-lg">{activeNow?.total ?? "…"}</span>
                                    <span className="text-sm text-muted-foreground">شخص على الموقع الان (آخر 5 دقائق)</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(activeNow?.byPage ?? []).slice(0, 5).map(p => (
                                        <div key={p.pagePath} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            <span className="font-mono text-green-300" dir="ltr">
                                                {p.pagePath === "/" ? "الرئيسية" : p.pagePath.replace(/^\//, "").replace(/\/\d+$/, "/…")}
                                            </span>
                                            <span className="font-bold text-green-400">{p.total}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pages Detail Table */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <LayoutList className="w-4 h-4 text-primary" />
                                    تفاصيل الصفحات — آخر {pagesData?.days ?? "…"} يوم
                                </CardTitle>
                                <div className="text-xs text-muted-foreground">
                                    إجمالي: <strong className="text-foreground">{(pagesData?.totalViews ?? 0).toLocaleString("ar-IQ")}</strong> مشاهدة
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pagesError ? (
                                <p className="text-center text-destructive py-8 text-sm px-4">
                                    تعذر تحميل البيانات — {(pagesError as Error).message}
                                </p>
                            ) : !pagesData ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : pagesData.pages.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">لا توجد بيانات بعد — ستظهر بعد أول زيارة للموقع</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    {/* Header */}
                                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-x-2 px-4 py-2 text-xs text-muted-foreground font-semibold border-b border-border bg-muted/30 min-w-[780px]">
                                        <span>الصفحة</span>
                                        <span className="text-center">مشاهدات</span>
                                        <span className="text-center">مسجلين</span>
                                        <span className="text-center">ضيوف</span>
                                        <span className="text-center">وقت متوسط</span>
                                        <span className="text-center">موبايل%</span>
                                        <span className="text-center">أبرز المصادر</span>
                                    </div>
                                    <div className="divide-y divide-border min-w-[780px]">
                                        {pagesData.pages.map((page, i) => {
                                            const maxViews = pagesData.pages[0]?.views ?? 1;
                                            const barPct  = Math.round((page.views / maxViews) * 100);
                                            const mins    = Math.floor((page.avgDuration ?? 0) / 60);
                                            const secs    = (page.avgDuration ?? 0) % 60;
                                            const totalDev = (page.mobileViews + page.desktopViews) || 1;
                                            const mobilePct = Math.round((page.mobileViews / totalDev) * 100);
                                            const activePage = activeNow?.byPage.find(p => p.pagePath === page.pagePath);

                                            // Top source
                                            const sources = [
                                                { k: "google",    v: page.fromGoogle,    label: "Google",    color: "text-sky-400" },
                                                { k: "facebook",  v: page.fromFacebook,  label: "Facebook",  color: "text-blue-400" },
                                                { k: "instagram", v: page.fromInstagram, label: "Instagram", color: "text-pink-400" },
                                                { k: "tiktok",    v: page.fromTiktok,    label: "TikTok",    color: "text-purple-400" },
                                                { k: "whatsapp",  v: page.fromWhatsapp,  label: "WhatsApp",  color: "text-green-400" },
                                                { k: "direct",    v: page.fromDirect,    label: "مباشر",     color: "text-muted-foreground" },
                                                { k: "other",     v: page.fromOther,     label: "أخرى",      color: "text-muted-foreground" },
                                            ].filter(s => s.v > 0).sort((a, b) => b.v - a.v);

                                            return (
                                                <div key={page.pagePath} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-x-2 px-4 py-2.5 hover:bg-muted/20 transition-colors items-center">
                                                    {/* Page path + bar */}
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{i + 1}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-xs font-mono truncate text-foreground" dir="ltr">{page.pagePath}</p>
                                                                {activePage && activePage.total > 0 && (
                                                                    <span className="shrink-0 inline-flex items-center gap-1 bg-green-500/15 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-green-500/20">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                                        {activePage.total}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                                                                <div className="h-full rounded-full bg-primary/60" style={{ width: `${barPct}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Views */}
                                                    <div className="text-center">
                                                        <span className="text-sm font-bold text-primary">{page.views.toLocaleString()}</span>
                                                    </div>
                                                    {/* Logged-in unique */}
                                                    <div className="text-center">
                                                        <span className="text-xs text-blue-400">{page.uniqueUsers.toLocaleString()}</span>
                                                    </div>
                                                    {/* Anonymous */}
                                                    <div className="text-center">
                                                        <span className="text-xs text-muted-foreground">{page.anonymousViews.toLocaleString()}</span>
                                                    </div>
                                                    {/* Avg duration */}
                                                    <div className="text-center">
                                                        <span className="text-xs text-amber-400 font-mono">
                                                            {page.avgDuration > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : "—"}
                                                        </span>
                                                    </div>
                                                    {/* Mobile % */}
                                                    <div className="text-center">
                                                        <span className={`text-xs font-medium ${mobilePct > 60 ? "text-primary" : "text-muted-foreground"}`}>
                                                            {mobilePct}%
                                                        </span>
                                                    </div>
                                                    {/* Top sources */}
                                                    <div className="flex flex-wrap gap-1 justify-center">
                                                        {sources.slice(0, 3).map(s => (
                                                            <span key={s.k} className={`text-[10px] ${s.color}`}>
                                                                {s.label} <strong>{s.v}</strong>
                                                            </span>
                                                        ))}
                                                        {sources.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default AnalyticsDashboard;

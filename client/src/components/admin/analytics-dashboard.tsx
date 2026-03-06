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
                <TabsList className="grid w-full grid-cols-3">
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
            </Tabs>
        </div>
    );
}

export default AnalyticsDashboard;

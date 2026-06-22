import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Interface for real insights data from API
interface RealInsightsData {
    peakHours: string;
    cartAbandonment: number;
    geography: string;
    forecasts: Array<{
        category: string;
        trend: "up" | "down" | "stable";
        percentage: number;
        reason: string;
    }>;
}
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Package,
    Loader2,
    Sparkles,
    ShoppingCart,
    Users,
    MapPin,
    Clock,
    ArrowUpRight,
    Lightbulb,
    Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

interface Insight {
    id: string;
    type: "success" | "warning" | "info" | "action";
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

interface DemandForecast {
    category: string;
    trend: "up" | "down" | "stable";
    percentage: number;
    reason: string;
}

export function AIInsightsPanel() {
    const { toast } = useToast();

    // Fetch products
    const { data: productsData, isLoading: productsLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => fetchProducts(),
    });

    // Fetch real insights from API (2025 Best Practice: Real-time data)
    const { data: realInsightsData, isLoading: insightsLoading } = useQuery<{ success: boolean; data: RealInsightsData }>({
        queryKey: ["admin-insights"],
        queryFn: async () => {
            const res = await fetch("/api/analytics/insights", {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch insights");
            return res.json();
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    });

    const products = productsData?.products || [];
    const realInsights = realInsightsData?.data;
    const isLoading = productsLoading || insightsLoading;

    // Generate insights based on product data AND real API data
    const insights = useMemo((): Insight[] => {
        const insights: Insight[] = [];

        // 1. Low stock alerts (from products)
        if (products.length > 0) {
            const lowStockProducts = products.filter((p: Product) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5);
            if (lowStockProducts.length > 0) {
                insights.push({
                    id: "low-stock",
                    type: "warning",
                    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
                    title: `${lowStockProducts.length} منتجات مخزونها منخفض`,
                    description: `${lowStockProducts.slice(0, 3).map((p: Product) => p.name).join("، ")}${lowStockProducts.length > 3 ? " وأخرى..." : ""}`,
                    action: {
                        label: "عرض المنتجات",
                        href: "/admin?tab=products"
                    }
                });
            }

            // 2. Out of stock
            const outOfStock = products.filter((p: Product) => (p.stock ?? 0) === 0);
            if (outOfStock.length > 0) {
                insights.push({
                    id: "out-of-stock",
                    type: "warning",
                    icon: <Package className="w-5 h-5 text-red-500" />,
                    title: `${outOfStock.length} منتجات نفدت من المخزون`,
                    description: "تحتاج إعادة تعبئة فورية",
                    action: {
                        label: "إدارة المخزون",
                        href: "/admin?tab=products"
                    }
                });
            }

            // 3. High rating products
            const topRated = products.filter((p: Product) => (p.rating ?? 0) >= 4.5);
            if (topRated.length > 0) {
                insights.push({
                    id: "top-rated",
                    type: "success",
                    icon: <TrendingUp className="w-5 h-5 text-green-500" />,
                    title: `${topRated.length} منتجات بتقييم ممتاز`,
                    description: "منتجات مميزة يمكن الترويج لها",
                    action: {
                        label: "عرض المنتجات",
                        href: "/admin?tab=products"
                    }
                });
            }
        }

        // 4. Peak hours - NOW FROM REAL DATA! 🎉
        if (realInsights?.peakHours) {
            insights.push({
                id: "peak-hours",
                type: "info",
                icon: <Clock className="w-5 h-5 text-blue-500" />,
                title: "⏰ أفضل أوقات البيع",
                description: `معظم الطلبات تأتي بين الساعة ${realInsights.peakHours}`,
            });
        }

        // 5. Cart abandonment - NOW FROM REAL DATA! 🎉
        if (realInsights?.cartAbandonment !== undefined) {
            const abandonRate = realInsights.cartAbandonment;
            insights.push({
                id: "cart-abandon",
                type: abandonRate > 50 ? "warning" : "action",
                icon: <ShoppingCart className="w-5 h-5 text-orange-500" />,
                title: "🛒 معدل عدم إكمال الطلبات",
                description: `${abandonRate}% من الطلبات لم تكتمل${abandonRate > 30 ? ". جرب خصم 5% لتشجيعهم!" : ""}`,
                action: {
                    label: "إنشاء كوبون",
                    href: "/admin?tab=coupons"
                }
            });
        }

        // 6. Geographic insight - NOW FROM REAL DATA! 🎉
        if (realInsights?.geography) {
            insights.push({
                id: "geography",
                type: "info",
                icon: <MapPin className="w-5 h-5 text-purple-500" />,
                title: "📍 توزيع الطلبات الجغرافي",
                description: realInsights.geography,
            });
        }

        return insights;
    }, [products, realInsights]);

    // Generate demand forecasts — real data from API only
    const forecasts = useMemo((): DemandForecast[] => {
        if (realInsights?.forecasts && realInsights.forecasts.length > 0) {
            return realInsights.forecasts;
        }
        return [];
    }, [realInsights]);

    const getInsightBg = (type: Insight["type"]) => {
        switch (type) {
            case "success": return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
            case "warning": return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
            case "info": return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
            case "action": return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
            default: return "bg-muted";
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="bg-gradient-to-r from-primary/10 via-cyan-500/10 to-purple-500/10 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/20 rounded-xl">
                                <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">تحليلات AI الذكية</h2>
                                <p className="text-muted-foreground">رؤى وتنبؤات لتحسين مبيعاتك</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="gap-1 text-sm">
                            <Lightbulb className="w-4 h-4" />
                            {insights.length} رؤية جديدة
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Insights Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            رؤى ذكية
                        </CardTitle>
                        <CardDescription>
                            توصيات مبنية على بيانات متجرك
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {insights.map((insight) => (
                            <div
                                key={insight.id}
                                className={cn(
                                    "p-4 rounded-lg border transition-all hover:shadow-md",
                                    getInsightBg(insight.type)
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{insight.icon}</div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{insight.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {insight.description}
                                        </p>
                                        {insight.action && (
                                            <Link href={insight.action.href || "#"}>
                                                <Button variant="link" size="sm" className="p-0 h-auto mt-2 gap-1">
                                                    {insight.action.label}
                                                    <ArrowUpRight className="w-3 h-3" />
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Demand Forecast Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            توقعات الطلب
                        </CardTitle>
                        <CardDescription>
                            توقعات الشهر القادم بناءً على الموسم والبيانات
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {forecasts.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-4">
                                لا توجد بيانات مبيعات كافية بعد — ستظهر التوقعات بعد تسجيل أول طلبات
                            </p>
                        ) : forecasts.map((forecast, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {forecast.trend === "up" ? (
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                    ) : forecast.trend === "down" ? (
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </div>
                                    ) : (
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-semibold">{forecast.category}</h4>
                                        <p className="text-xs text-muted-foreground">{forecast.reason}</p>
                                    </div>
                                </div>
                                <Badge
                                    variant={forecast.trend === "up" ? "default" : forecast.trend === "down" ? "destructive" : "secondary"}
                                    className={cn(
                                        "font-bold",
                                        forecast.trend === "up" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    )}
                                >
                                    {forecast.trend === "up" ? "+" : ""}{forecast.percentage}%
                                </Badge>
                            </div>
                        ))}

                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground text-center">
                                📊 التوقعات محدّثة بناءً على الموسم الحالي وبيانات المبيعات
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Package className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold">{products.length}</p>
                                <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {products.filter((p: Product) => (p.stock ?? 0) > 0).length}
                                </p>
                                <p className="text-sm text-muted-foreground">منتجات متوفرة</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {products.filter((p: Product) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).length}
                                </p>
                                <p className="text-sm text-muted-foreground">مخزون منخفض</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {products.filter((p: Product) => (p.rating ?? 0) >= 4).length}
                                </p>
                                <p className="text-sm text-muted-foreground">تقييم 4+ نجوم</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

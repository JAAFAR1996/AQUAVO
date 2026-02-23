/**
 * AI Dashboard - لوحة الذكاء الاصطناعي للمدير
 * تعرض جميع ميزات AI المتقدمة في مكان واحد
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Brain,
    TrendingUp,
    Users,
    Package,
    AlertTriangle,
    ShieldAlert,
    Lightbulb,
    RefreshCw,
    BarChart3,
    UserX,
    BoxIcon,
    Mail,
    Sparkles,
    Activity,
} from "lucide-react";

// Fetch AI Dashboard Summary
async function fetchAIDashboard() {
    const response = await fetch("/api/ai-advanced/dashboard/summary");
    if (!response.ok) return null;
    return response.json();
}

// Fetch High Risk Customers (Churn)
async function fetchChurnRisk() {
    const response = await fetch("/api/ai-advanced/churn-high-risk");
    if (!response.ok) return { success: false, data: [] };
    return response.json();
}

// Fetch Inventory Recommendations
async function fetchInventoryRecommendations() {
    const response = await fetch("/api/ai-advanced/inventory/recommendations");
    if (!response.ok) return { success: false, data: [] };
    return response.json();
}

export default function AdminAI() {
    const [activeTab, setActiveTab] = useState("overview");

    // Queries
    const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
        queryKey: ["ai-dashboard"],
        queryFn: fetchAIDashboard,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const { data: churnData, isLoading: churnLoading, refetch: refetchChurn } = useQuery({
        queryKey: ["ai-churn-risk"],
        queryFn: fetchChurnRisk,
        staleTime: 1000 * 60 * 10,
    });

    const { data: inventoryData, isLoading: inventoryLoading, refetch: refetchInventory } = useQuery({
        queryKey: ["ai-inventory"],
        queryFn: fetchInventoryRecommendations,
        staleTime: 1000 * 60 * 10,
    });

    const handleRefreshAll = () => {
        refetchDashboard();
        refetchChurn();
        refetchInventory();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Brain className="h-8 w-8 text-purple-500" />
                        لوحة الذكاء الاصطناعي
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة وتحليلات AI المتقدمة للمتجر
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="default" className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => window.location.href = '/admin/ai-monitor'}>
                        <Activity className="h-4 w-4" />
                        المراقبة الحية للذكاء
                    </Button>
                    <Button onClick={handleRefreshAll} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        تحديث الكل
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="العملاء المهددين"
                    value={churnData?.data?.length || 0}
                    icon={<UserX className="h-5 w-5" />}
                    color="red"
                    loading={churnLoading}
                />
                <StatCard
                    title="توصيات المخزون"
                    value={inventoryData?.data?.length || 0}
                    icon={<BoxIcon className="h-5 w-5" />}
                    color="orange"
                    loading={inventoryLoading}
                />
                <StatCard
                    title="خدمات AI نشطة"
                    value={14}
                    icon={<Sparkles className="h-5 w-5" />}
                    color="purple"
                    loading={false}
                />
                <StatCard
                    title="حالة النظام"
                    value="يعمل"
                    icon={<Activity className="h-5 w-5" />}
                    color="green"
                    loading={false}
                />
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                    <TabsTrigger value="overview" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        نظرة عامة
                    </TabsTrigger>
                    <TabsTrigger value="churn" className="gap-2">
                        <UserX className="h-4 w-4" />
                        المغادرة
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-2">
                        <Package className="h-4 w-4" />
                        المخزون
                    </TabsTrigger>
                    <TabsTrigger value="features" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        الميزات
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* AI Insights */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                                    رؤى الذكاء الاصطناعي
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {dashboardLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : dashboardData?.data?.aiInsights ? (
                                    <p className="text-muted-foreground leading-relaxed">
                                        {dashboardData.data.aiInsights}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground">
                                        لا توجد رؤى متاحة حالياً. جرب تشغيل تحليل أو إضافة بيانات.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    التنبيهات
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {dashboardLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                ) : dashboardData?.data?.alerts?.length > 0 ? (
                                    <ul className="space-y-2">
                                        {dashboardData.data.alerts.map((alert: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                                                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                                                <span className="text-sm">{alert}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground">لا توجد تنبيهات</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Churn Tab */}
                <TabsContent value="churn" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserX className="h-5 w-5 text-red-500" />
                                العملاء المهددين بالمغادرة
                            </CardTitle>
                            <CardDescription>
                                عملاء يظهرون علامات قد تؤدي لتركهم المتجر
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {churnLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : churnData?.data?.length > 0 ? (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-3">
                                        {churnData.data.map((customer: any) => (
                                            <div
                                                key={customer.userId}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        العميل #{customer.userId.slice(0, 8)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {customer.actionPlan || "لا يوجد خطة"}
                                                    </p>
                                                </div>
                                                <div className="text-left">
                                                    <Badge
                                                        variant={
                                                            customer.riskLevel === "critical"
                                                                ? "destructive"
                                                                : customer.riskLevel === "high"
                                                                    ? "destructive"
                                                                    : "secondary"
                                                        }
                                                    >
                                                        {customer.riskLevel === "critical"
                                                            ? "حرج"
                                                            : customer.riskLevel === "high"
                                                                ? "عالي"
                                                                : "متوسط"}
                                                    </Badge>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        نسبة الخطر: {customer.churnScore}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>لا يوجد عملاء مهددين بالمغادرة حالياً</p>
                                    <p className="text-sm">هذا خبر جيد! 🎉</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-500" />
                                توصيات المخزون
                            </CardTitle>
                            <CardDescription>
                                منتجات تحتاج إعادة طلب أو لديها مخزون زائد
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {inventoryLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : inventoryData?.data?.length > 0 ? (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-3">
                                        {inventoryData.data.map((item: any) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        المنتج #{item.productId.slice(0, 8)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.reason || item.suggestedAction}
                                                    </p>
                                                </div>
                                                <div className="text-left">
                                                    <Badge
                                                        variant={
                                                            item.priority === "urgent"
                                                                ? "destructive"
                                                                : item.priority === "high"
                                                                    ? "destructive"
                                                                    : "secondary"
                                                        }
                                                    >
                                                        {item.priority === "urgent"
                                                            ? "عاجل"
                                                            : item.priority === "high"
                                                                ? "هام"
                                                                : "عادي"}
                                                    </Badge>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        المخزون: {item.currentStock}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>لا توجد توصيات للمخزون حالياً</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FeatureCard
                            title="مراقبة الذكاء الاصطناعي"
                            description="سجلات البحث وأداء النماذج (Live)"
                            icon={<Activity className="h-6 w-6" />}
                            status="active"
                            link="/admin/ai-monitor"
                        />
                        <FeatureCard
                            title="مساعد المبيعات"
                            description="دردشة ذكية للرد على استفسارات العملاء"
                            icon={<Brain className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="محلل الصور"
                            description="تحليل صور الأسماك والأحواض"
                            icon={<Sparkles className="h-6 w-6" />}
                            status="active"
                            link="/ai-tools"
                        />
                        <FeatureCard
                            title="تحليل المشاعر"
                            description="فهم مشاعر العملاء في المحادثات"
                            icon={<Activity className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="كشف المغادرة"
                            description="تحديد العملاء المعرضين للترك"
                            icon={<UserX className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="كشف الاحتيال"
                            description="تحليل الطلبات المشبوهة"
                            icon={<ShieldAlert className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="تحسين المخزون"
                            description="توصيات ذكية لإعادة الطلب"
                            icon={<Package className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="التحليلات التنبؤية"
                            description="توقع احتياجات العملاء"
                            icon={<TrendingUp className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="توليد المحتوى"
                            description="إنشاء وصف ومنشورات تلقائياً"
                            icon={<Lightbulb className="h-6 w-6" />}
                            status="active"
                        />
                        <FeatureCard
                            title="حملات البريد"
                            description="إدارة حملات البريد الذكية"
                            icon={<Mail className="h-6 w-6" />}
                            status="active"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Stat Card Component
function StatCard({
    title,
    value,
    icon,
    color,
    loading,
}: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: "red" | "orange" | "purple" | "green" | "blue";
    loading: boolean;
}) {
    const colorClasses = {
        red: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
        orange: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
        purple: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
        green: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        {loading ? (
                            <Skeleton className="h-6 w-12" />
                        ) : (
                            <p className="text-2xl font-bold">{value}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Feature Card Component
function FeatureCard({
    title,
    description,
    icon,
    status,
    link,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    status: "active" | "inactive";
    link?: string;
}) {
    const content = (
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                        {icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">{title}</h3>
                            <Badge variant={status === "active" ? "default" : "secondary"}>
                                {status === "active" ? "نشط" : "معطل"}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (link) {
        return <a href={link}>{content}</a>;
    }
    return content;
}

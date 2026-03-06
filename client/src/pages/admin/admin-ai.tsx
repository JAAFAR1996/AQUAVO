/**
 * AI Dashboard - لوحة الذكاء الاصطناعي للمدير
 * تعرض جميع ميزات AI المتقدمة في مكان واحد
 * يجلب الحالة الحقيقية من قاعدة البيانات
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
    Play,
    Power,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    Globe,
    Heart,
    Bell,
    ShoppingCart,
    Cpu,
    FileText,
    Layers,
    LayoutDashboard,
    RotateCcw,
    BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface AgentSetting {
    id: number;
    agentName: string;
    displayName: string;
    description: string;
    isEnabled: boolean;
    autoRun: boolean;
    runFrequency: string;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    actionsToday: number;
    totalActions: number;
    config: Record<string, unknown> | null;
}

// ─── Feature definitions mapping agent names to icons ─────────
const FEATURE_ICON_MAP: Record<string, { icon: typeof Brain; color: string }> = {
    sales:     { icon: Brain,          color: "text-blue-400" },
    inventory: { icon: Package,        color: "text-orange-400" },
    pricing:   { icon: BarChart3,      color: "text-teal-400" },
    marketing: { icon: Mail,           color: "text-rose-400" },
    sentiment: { icon: Heart,          color: "text-pink-400" },
    visual:    { icon: Cpu,            color: "text-fuchsia-400" },
    content:   { icon: FileText,       color: "text-purple-400" },
    aquarium:  { icon: Layers,         color: "text-sky-400" },
};

// ─── API helpers ──────────────────────────────────────────────
async function fetchAgentSettings(): Promise<AgentSetting[]> {
    const response = await fetch("/api/ai/settings", { credentials: "include" });
    if (!response.ok) throw new Error("Failed to fetch AI settings");
    const data = await response.json();
    return data.data ?? [];
}

async function toggleAgent(agentName: string): Promise<AgentSetting> {
    const response = await fetch(`/api/ai/settings/${agentName}/toggle`, {
        method: "POST",
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to toggle agent");
    const data = await response.json();
    return data.data;
}

async function runAgent(agentName: string): Promise<{ message: string; result?: unknown }> {
    const response = await fetch(`/api/ai/settings/${agentName}/run`, {
        method: "POST",
        credentials: "include",
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run agent");
    }
    const data = await response.json();
    return { message: data.message, result: data.result };
}

// Fetch AI Dashboard Summary
async function fetchAIDashboard() {
    const response = await fetch("/api/ai-advanced/dashboard/summary", { credentials: "include" });
    if (!response.ok) return null;
    return response.json();
}

// Fetch High Risk Customers (Churn)
async function fetchChurnRisk() {
    const response = await fetch("/api/ai-advanced/churn-high-risk", { credentials: "include" });
    if (!response.ok) return { success: false, data: [] };
    return response.json();
}

// Fetch Inventory Recommendations
async function fetchInventoryRecommendations() {
    const response = await fetch("/api/ai-advanced/inventory/recommendations", { credentials: "include" });
    if (!response.ok) return { success: false, data: [] };
    return response.json();
}

export default function AdminAI() {
    const [activeTab, setActiveTab] = useState("overview");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Queries
    const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
        queryKey: ["ai-agent-settings"],
        queryFn: fetchAgentSettings,
        staleTime: 1000 * 30,
    });

    const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
        queryKey: ["ai-dashboard"],
        queryFn: fetchAIDashboard,
        staleTime: 1000 * 60 * 5,
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

    // Mutations
    const toggleMutation = useMutation({
        mutationFn: toggleAgent,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["ai-agent-settings"] });
            toast({
                title: data.isEnabled ? "✅ تم تفعيل الوكيل" : "⏸️ تم تعطيل الوكيل",
                description: data.displayName,
            });
        },
        onError: (error: Error) => {
            toast({ title: "❌ خطأ", description: error.message, variant: "destructive" });
        },
    });

    const runMutation = useMutation({
        mutationFn: runAgent,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["ai-agent-settings"] });
            toast({ title: "✅ تم التشغيل", description: data.message });
        },
        onError: (error: Error) => {
            toast({ title: "❌ فشل التشغيل", description: error.message, variant: "destructive" });
        },
    });

    const handleRefreshAll = () => {
        refetchAgents();
        refetchDashboard();
        refetchChurn();
        refetchInventory();
    };

    // Computed stats
    const enabledCount = agents?.filter(a => a.isEnabled).length ?? 0;
    const totalCount = agents?.length ?? 0;

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
                <Button onClick={handleRefreshAll} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    تحديث الكل
                </Button>
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
                    value={agentsLoading ? "..." : `${enabledCount}/${totalCount}`}
                    icon={<Sparkles className="h-5 w-5" />}
                    color="purple"
                    loading={agentsLoading}
                />
                <StatCard
                    title="حالة النظام"
                    value={enabledCount > 0 ? "يعمل" : "متوقف"}
                    icon={<Activity className="h-5 w-5" />}
                    color={enabledCount > 0 ? "green" : "red"}
                    loading={agentsLoading}
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

                {/* Features Tab — REAL DATA from ai_agent_settings */}
                <TabsContent value="features" className="space-y-4">
                    {agentsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <Skeleton className="h-24 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(agents ?? []).map((agent) => (
                                <AgentFeatureCard
                                    key={agent.agentName}
                                    agent={agent}
                                    onToggle={(name) => toggleMutation.mutate(name)}
                                    onRun={(name) => runMutation.mutate(name)}
                                    isToggling={toggleMutation.isPending}
                                    isRunning={runMutation.isPending}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Agent Feature Card — shows real DB status ────────────────
function AgentFeatureCard({
    agent,
    onToggle,
    onRun,
    isToggling,
    isRunning,
}: {
    agent: AgentSetting;
    onToggle: (name: string) => void;
    onRun: (name: string) => void;
    isToggling: boolean;
    isRunning: boolean;
}) {
    const featureStyle = FEATURE_ICON_MAP[agent.agentName] ?? { icon: Sparkles, color: "text-purple-400" };
    const Icon = featureStyle.icon;

    const freqLabel = agent.runFrequency === "manual" ? "يدوي"
        : agent.runFrequency === "daily" ? "يومي"
        : agent.runFrequency === "weekly" ? "أسبوعي"
        : agent.runFrequency;

    const lastRunTime = agent.lastRunAt
        ? new Date(agent.lastRunAt).toLocaleString("ar-IQ", {
            day: "2-digit", month: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
        })
        : null;

    return (
        <Card className={`transition-all ${agent.isEnabled ? "hover:shadow-md" : "opacity-60"}`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${agent.isEnabled
                        ? "bg-purple-100 dark:bg-purple-950/50"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}>
                        <Icon className={`h-6 w-6 ${agent.isEnabled ? featureStyle.color : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium truncate">{agent.displayName}</h3>
                            <Badge variant={agent.isEnabled ? "default" : "secondary"}>
                                {agent.isEnabled ? "مفعل" : "معطل"}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {freqLabel}
                            </span>
                            {agent.totalActions > 0 && (
                                <span className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    {agent.totalActions} عملية
                                </span>
                            )}
                            {agent.lastRunStatus && (
                                <span className="flex items-center gap-1">
                                    {agent.lastRunStatus === "success"
                                        ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                                        : <XCircle className="h-3 w-3 text-red-500" />
                                    }
                                    {agent.lastRunStatus === "success" ? "نجح" : "فشل"}
                                </span>
                            )}
                        </div>

                        {/* Last run time */}
                        {lastRunTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                                آخر تشغيل: {lastRunTime}
                            </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs h-7"
                                onClick={() => onToggle(agent.agentName)}
                                disabled={isToggling}
                            >
                                <Power className="h-3 w-3" />
                                {agent.isEnabled ? "تعطيل" : "تفعيل"}
                            </Button>
                            {agent.isEnabled && agent.runFrequency !== "manual" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-xs h-7"
                                    onClick={() => onRun(agent.agentName)}
                                    disabled={isRunning || !agent.isEnabled}
                                >
                                    <Play className="h-3 w-3" />
                                    تشغيل الآن
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Stat Card Component ──────────────────────────────────────
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

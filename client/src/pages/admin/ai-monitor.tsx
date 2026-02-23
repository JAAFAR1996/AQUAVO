import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Activity,
    AlertCircle,
    Brain,
    CheckCircle2,
    Clock,
    Database,
    Globe,
    Key,
    LineChart,
    MessageSquare,
    RefreshCw,
    Search,
    Server,
    ShieldAlert,
    TerminalSquare,
    Zap
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart as RechartsLineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

// Fetchers
const fetchStats = async () => (await fetch("/api/admin/ai-monitor/stats")).json();
const fetchLogs = async (level: string) => (await fetch(`/api/admin/ai-monitor/logs?level=${level === 'all' ? '' : level}&limit=200`)).json();
const fetchChart = async () => (await fetch("/api/admin/ai-monitor/chart")).json();
const fetchModels = async () => (await fetch("/api/admin/ai-monitor/models")).json();
const fetchFeatures = async () => (await fetch("/api/admin/ai-monitor/features")).json();

export default function AIMonitor() {
    const [activeTab, setActiveTab] = useState("overview");
    const [logLevel, setLogLevel] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Queries
    const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useQuery({
        queryKey: ["ai-monitor-stats"], queryFn: fetchStats, staleTime: 30000,
    });
    const { data: logsData, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ["ai-monitor-logs", logLevel], queryFn: () => fetchLogs(logLevel), staleTime: 30000,
    });
    const { data: chartData, isLoading: loadingChart, refetch: refetchChart } = useQuery({
        queryKey: ["ai-monitor-chart"], queryFn: fetchChart, staleTime: 60000,
    });
    const { data: modelsData, isLoading: loadingModels, refetch: refetchModels } = useQuery({
        queryKey: ["ai-monitor-models"], queryFn: fetchModels, staleTime: 60000,
    });
    const { data: featuresData, isLoading: loadingFeatures, refetch: refetchFeatures } = useQuery({
        queryKey: ["ai-monitor-features"], queryFn: fetchFeatures, staleTime: 60000,
    });

    const handleRefreshAll = () => {
        refetchStats(); refetchLogs(); refetchChart(); refetchModels(); refetchFeatures();
    };

    // Filter logs based on search
    const filteredLogs = useMemo(() => {
        if (!logsData?.logs) return [];
        if (!searchQuery) return logsData.logs;
        const lowerQ = searchQuery.toLowerCase();
        return logsData.logs.filter((log: any) =>
            log.event?.toLowerCase().includes(lowerQ) ||
            log.errorMessage?.toLowerCase().includes(lowerQ) ||
            log.model?.toLowerCase().includes(lowerQ) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(lowerQ))
        );
    }, [logsData?.logs, searchQuery]);

    const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    if (loadingStats && !statsData) {
        return <div className="p-8"><Skeleton className="h-[500px] w-full rounded-3xl" /></div>;
    }

    return (
        <div className="p-6 space-y-6 container mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <TerminalSquare className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold">مراقب الذكاء الاصطناعي</h1>
                        {statsData?.status && (
                            <Badge variant={statsData.status === "critical" ? "destructive" : statsData.status === "warning" ? "secondary" : "default"} className="animate-pulse">
                                {statsData.status === "critical" ? "حرج" : statsData.status === "warning" ? "تحذير" : "مستقر"}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1">
                        مراقبة حية، كفاءة النماذج (Compound/Llama)، وعمليات بحث الإنترنت الذاتية
                    </p>
                </div>
                <Button onClick={handleRefreshAll} variant="outline" className="gap-2 shrink-0">
                    <RefreshCw className="h-4 w-4" />
                    تحديث البيانات
                </Button>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="إجمالي العمليات" value={statsData?.total || 0} icon={<Database className="h-4 w-4" />} />
                <StatCard title="استفسارات المحادثة" value={statsData?.chatCount || 0} icon={<MessageSquare className="h-4 w-4" />} />
                <StatCard title="عمليات فشل الذكاء" value={statsData?.errors || 0} icon={<AlertCircle className="h-4 w-4" />} color="red" />
                <StatCard title="البحث في الإنترنت" value={statsData?.webSearchCount || 0} icon={<Globe className="h-4 w-4" />} color="blue" />
                <StatCard title="سقوط النماذج (Fallbacks)" value={statsData?.fallbacks || 0} icon={<ShieldAlert className="h-4 w-4" />} color="orange" />
                <StatCard title="مفاتيح Groq النشطة" value={statsData?.groqKeysTotal || 0} icon={<Key className="h-4 w-4" />} color="green" />
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="w-full justify-start overflow-x-auto no-scrollbar border-b pb-0 h-auto rounded-none bg-transparent">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">نظرة عامة والرسوم</TabsTrigger>
                    <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">السجلات الحية (Logs)</TabsTrigger>
                    <TabsTrigger value="models" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">أداء النماذج ومحرك البحث</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Traffic Chart */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> حركة الذكاء الاصطناعي (أخر 24 ساعة)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    {loadingChart ? <Skeleton className="w-full h-full" /> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData?.chart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="hour" tickFormatter={(val) => format(parseISO(val), 'HH:00')} fontSize={12} stroke="#888" />
                                                <YAxis fontSize={12} stroke="#888" />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                                    labelFormatter={(label) => format(parseISO(label as string), 'yyyy/MM/dd - HH:00')}
                                                />
                                                <Area type="monotone" name="العمليات الناجحة" dataKey="total" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTotal)" />
                                                <Area type="monotone" name="الأخطاء" dataKey="errors" stroke="#ef4444" fillOpacity={1} fill="url(#colorErrors)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Features */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> أكثر الميزات استخداماً</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {loadingFeatures ? (
                                        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                                    ) : (
                                        featuresData?.features?.slice(0, 5).map((f: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="font-mono">{f.event}</Badge>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold">{f.total}</p>
                                                    <p className="text-xs text-muted-foreground">{Math.round(f.avgMs)}ms متوسط</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* LOGS TAB */}
                <TabsContent value="logs" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle>سجلات الذكاء الاصطناعي</CardTitle>
                                <CardDescription>تتبع كل المحادثات وعمليات البحث والأخطاء خطوة بخطوة</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ابحث في السجلات..."
                                        className="pl-2 pr-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={logLevel} onValueChange={setLogLevel}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="المستوى" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">الكل</SelectItem>
                                        <SelectItem value="info">مستقر (Info)</SelectItem>
                                        <SelectItem value="warning">تحذير (Warning)</SelectItem>
                                        <SelectItem value="error">خطأ (Error)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] w-full rounded-md border">
                                <div className="w-full min-w-[800px]">
                                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
                                        <div className="col-span-2">الوقت</div>
                                        <div className="col-span-1">المرحلة</div>
                                        <div className="col-span-2">الحدث</div>
                                        <div className="col-span-2">النموذج المستخدم</div>
                                        <div className="col-span-5">التفاصيل</div>
                                    </div>
                                    {loadingLogs ? (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b"><Skeleton className="col-span-12 h-6" /></div>
                                        ))
                                    ) : filteredLogs.length > 0 ? (
                                        filteredLogs.map((log: any) => (
                                            <div key={log.id} className="grid grid-cols-12 gap-4 p-4 border-b text-sm items-start hover:bg-muted/20 transition-colors">
                                                <div className="col-span-2 text-muted-foreground font-mono text-xs">
                                                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                                                </div>
                                                <div className="col-span-1">
                                                    <Badge variant={
                                                        log.level === 'error' ? 'destructive' :
                                                            log.level === 'warning' ? 'outline' : 'secondary'
                                                    } className={log.level === 'warning' ? 'border-yellow-500 text-yellow-500' : ''}>
                                                        {log.level}
                                                    </Badge>
                                                </div>
                                                <div className="col-span-2 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        {log.event === 'search' && <Search className="w-3 h-3 text-blue-500" />}
                                                        {log.event === 'chat' && <MessageSquare className="w-3 h-3 text-green-500" />}
                                                        {log.event === 'fallback' && <ShieldAlert className="w-3 h-3 text-orange-500" />}
                                                        {log.event === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                                        {log.event}
                                                    </span>
                                                </div>
                                                <div className="col-span-2">
                                                    {log.model ? (
                                                        <Badge variant="outline" className="bg-background text-xs font-mono">
                                                            {log.model.replace('-versatile', '').replace('-instant', '')}
                                                        </Badge>
                                                    ) : '-'}
                                                </div>
                                                <div className="col-span-5 space-y-1">
                                                    {log.webSearchUsed && (
                                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 mb-1">
                                                            <Globe className="w-3 h-3 mr-1" /> بحث في الإنترنت 🌐
                                                        </Badge>
                                                    )}
                                                    {log.fallbackUsed && (
                                                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 mb-1">
                                                            <RefreshCw className="w-3 h-3 mr-1" /> تفعيل نظام السقوط (Fallback)
                                                        </Badge>
                                                    )}
                                                    {log.errorMessage && <div className="text-red-500 font-mono mt-1 p-2 bg-red-500/10 rounded">{log.errorMessage}</div>}
                                                    {(log.responseTimeMs || log.productsFound! >= 0 || log.tokenCount) && (
                                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                                                            {log.responseTimeMs && <span>الزمن: {log.responseTimeMs}ms</span>}
                                                            {log.productsFound !== null && <span>المنتجات: {log.productsFound}</span>}
                                                            {log.tokenCount && <span>التوكنز: {log.tokenCount}</span>}
                                                        </div>
                                                    )}
                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                        <details className="mt-1 cursor-pointer">
                                                            <summary className="text-xs text-primary/70 hover:text-primary">عرض البيانات الفنية</summary>
                                                            <pre className="text-[10px] mt-1 p-2 bg-black/50 text-green-400 rounded overflow-x-auto">
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground col-span-12">لا توجد سجلات مطابقة</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODELS TAB */}
                <TabsContent value="models" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-purple-500" /> النماذج المستخدمة للمحادثات</CardTitle>
                                <CardDescription>مقارنة الاعتمادية والسرعة بين نماذج (Compound الذكي) و (Llama السريع)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingModels ? <Skeleton className="h-[300px] w-full" /> : (
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={modelsData?.models || []}
                                                    cx="50%" cy="50%" labelLine={false}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="total"
                                                    nameKey="model"
                                                    label={({ name, percent }) => `${name.replace('-beta', '').replace('-versatile', '')} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {(modelsData?.models || []).map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>أداء النماذج ومحرك البحث (متوسط الزمن)</CardTitle>
                                <CardDescription>كلما كان الزمن أقل، كانت تجربة المستخدم أسرع</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 mt-4">
                                    {loadingModels ? (
                                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                                    ) : (
                                        modelsData?.models?.map((model: any, i: number) => (
                                            <div key={i} className="p-4 rounded-xl border bg-card">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-bold flex items-center gap-2">
                                                        {model.model.includes('compound') && <Globe className="w-4 h-4 text-blue-500" />}
                                                        {model.model.includes('llama') && <Zap className="w-4 h-4 text-primary" />}
                                                        {model.model}
                                                    </h4>
                                                    <Badge variant={model.errors > 0 ? "destructive" : "secondary"}>
                                                        أخطاء: {model.errors}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1"><TerminalSquare className="w-3 h-3" /> {model.total} استدعاء</span>
                                                    <span className={`flex items-center gap-1 font-mono ${model.avgMs > 3000 ? 'text-orange-500' : 'text-green-500'}`}>
                                                        <Clock className="w-3 h-3" /> {Math.round(model.avgMs)}ms متوسط الزمن
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Sub-component for simple isolated stats
function StatCard({ title, value, icon, color = "default" }: { title: string, value: string | number, icon: React.ReactNode, color?: string }) {
    const colorClasses: Record<string, string> = {
        default: "text-primary bg-primary/10",
        red: "text-red-500 bg-red-500/10",
        blue: "text-blue-500 bg-blue-500/10",
        green: "text-green-500 bg-green-500/10",
        orange: "text-orange-500 bg-orange-500/10",
    };

    return (
        <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center text-center gap-2">
                <div className={`p-2 rounded-full ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

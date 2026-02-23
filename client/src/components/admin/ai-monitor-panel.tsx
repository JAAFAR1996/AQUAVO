/**
 * AI Monitor Panel — لوحة مراقبة الذكاء الاصطناعي الشاملة
 * Monitors ALL AI features: chat, blog, embeddings, predictions, churn, notifications, sentiment
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Activity, AlertTriangle, CheckCircle, Clock, Globe, MessageSquare,
    RefreshCw, Search, Wifi, WifiOff, Zap, XCircle, TrendingUp,
    BookOpen, Bell, Brain, User, ShoppingCart, Heart, BarChart3,
    Shield, Mail, Cpu, FileText, Package, RotateCcw, Users, Layers, LayoutDashboard,
} from "lucide-react";

// ─── API helpers ─────────────────────────────────────────────
const fetchStats    = () => fetch("/api/admin/ai-monitor/stats",    { credentials: "include" }).then(r => r.json());
const fetchLogs     = (level: string) => fetch(`/api/admin/ai-monitor/logs?limit=150&level=${level}`, { credentials: "include" }).then(r => r.json());
const fetchErrors   = () => fetch("/api/admin/ai-monitor/errors?limit=50",  { credentials: "include" }).then(r => r.json());
const fetchModels   = () => fetch("/api/admin/ai-monitor/models",   { credentials: "include" }).then(r => r.json());
const fetchFeatures = () => fetch("/api/admin/ai-monitor/features?hours=168", { credentials: "include" }).then(r => r.json());
const fetchCronJobs = () => fetch("/api/admin/ai-monitor/cron-jobs?limit=30", { credentials: "include" }).then(r => r.json());

// ─── Feature definitions — all AI features in the site ───────
const ALL_FEATURES = [
    { event: "chat",            label: "شاتبوت شريمب",        icon: MessageSquare, color: "text-blue-400",   desc: "المحادثات مع الزبائن" },
    { event: "search",          label: "بحث المنتجات",         icon: Search,        color: "text-cyan-400",   desc: "البحث التلقائي قبل كل رد" },
    { event: "compound_search", label: "بحث الإنترنت",         icon: Globe,         color: "text-violet-400", desc: "compound-beta web search" },
    { event: "sentiment",       label: "تحليل المشاعر",        icon: Heart,         color: "text-pink-400",   desc: "تحليل مشاعر الزبائن" },
    { event: "embedding",       label: "Embeddings",           icon: Brain,         color: "text-indigo-400", desc: "تحويل المنتجات لمتجهات ذكية" },
    { event: "blog_generated",  label: "مدونة تلقائية",        icon: BookOpen,      color: "text-emerald-400",desc: "كل أحد 5 صباحاً (بغداد)" },
    { event: "prediction",      label: "تنبؤ الاحتياجات",      icon: TrendingUp,    color: "text-amber-400",  desc: "يتنبأ بمشتريات الزبائن" },
    { event: "churn_analysis",  label: "كشف العزوف",           icon: User,          color: "text-orange-400", desc: "يكتشف الزبائن المعرضين للمغادرة" },
    { event: "notification_sent",label: "إشعارات ذكية",        icon: Bell,          color: "text-yellow-400", desc: "تذكير إعادة الشراء" },
    { event: "recommendation",  label: "توصيات المنتجات",      icon: ShoppingCart,  color: "text-lime-400",   desc: "مقترحات للسلة والصفحة الرئيسية" },
    { event: "email_campaign",  label: "حملات البريد",         icon: Mail,          color: "text-rose-400",   desc: "حملات AI بالبريد الإلكتروني" },
    { event: "fraud_check",     label: "كشف الاحتيال",         icon: Shield,        color: "text-red-400",    desc: "فحص الطلبات المشبوهة" },
    { event: "price_suggestion",label: "تسعير ذكي",            icon: BarChart3,     color: "text-teal-400",   desc: "اقتراحات الأسعار التنافسية" },
    { event: "visual_analysis",       label: "تحليل الصور",        icon: Cpu,             color: "text-fuchsia-400", desc: "Gemini Vision — فحص صور الحوض" },
    { event: "aquarium_design",       label: "مصمم الحوض",         icon: Layers,          color: "text-sky-400",     desc: "تصميم حوض + توافق الأسماك" },
    { event: "content_generated",     label: "توليد المحتوى",      icon: FileText,        color: "text-purple-400",  desc: "وصف منتجات + سوشيال + إيميل" },
    { event: "dashboard_insights",    label: "تحليل لوحة التحكم", icon: LayoutDashboard, color: "text-blue-300",    desc: "ملخص ذكي يومي للمدير" },
    { event: "inventory_optimization",label: "تحسين المخزون",      icon: Package,         color: "text-orange-300",  desc: "تحليل المخزون واقتراح الطلبيات" },
    { event: "returns_analysis",      label: "معالجة الإرجاع",     icon: RotateCcw,       color: "text-yellow-300",  desc: "قرارات إرجاع ذكية بالـ AI" },
    { event: "customer_analysis",     label: "تحليل العملاء",      icon: Users,           color: "text-green-300",   desc: "بناء ملف سلوكي لكل عميل" },
    { event: "cron_job",              label: "المهام المجدولة",    icon: Clock,           color: "text-slate-300",   desc: "كل المهام الليلية" },
];

// ─── Cron job display names ───────────────────────────────────
const CRON_JOB_NAMES: Record<string, string> = {
    auto_blog:       "📝 مدونة أسبوعية (أحد 5ص)",
    embeddings:      "🧠 توليد Embeddings (1:30ص)",
    predictions:     "💡 تنبؤ الاحتياجات (2ص)",
    churn:           "👤 كشف العزوف (3ص)",
    conversions:     "🔄 فحص التحويلات (4ص)",
    smart_reminders: "🔔 إشعارات ذكية (4:30ص)",
};

// ─── Helpers ──────────────────────────────────────────────────
function levelColor(level: string) {
    if (level === "critical") return "bg-red-600 text-white";
    if (level === "error")    return "bg-red-500 text-white";
    if (level === "warning")  return "bg-amber-500 text-white";
    return "bg-emerald-600 text-white";
}

function shortId(id: string | null | undefined) {
    if (!id) return null;
    return id.length > 12 ? id.slice(0, 8) + "…" : id;
}

function fullTimestamp(ts: string) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("ar-IQ", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
}

function renderDetailValue(v: any): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v, null, 0);
    return String(v);
}

function shortModel(model: string | null) {
    if (!model) return "—";
    return model
        .replace("llama-3.3-70b-versatile", "llama-70b")
        .replace("llama-3.1-8b-instant", "llama-8b")
        .replace("gemini-2.5-flash", "gemini-flash");
}

function eventIcon(event: string) {
    const f = ALL_FEATURES.find(x => x.event === event);
    if (f) { const Icon = f.icon; return <Icon className={`w-3.5 h-3.5 ${f.color}`} />; }
    if (event === "error")   return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    if (event === "timeout") return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    if (event === "fallback") return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
}

function formatMs(ms: number | null) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(ts: string) {
    if (!ts) return "—";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `منذ ${Math.floor(diff / 1000)}ث`;
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)}د`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)}س`;
    return `منذ ${Math.floor(diff / 86400000)}ي`;
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "text-white" }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">{icon}</div>
                    <div>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        {sub && <p className="text-xs text-slate-500">{sub}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Feature Card ─────────────────────────────────────────────
function FeatureCard({ feature, stats }: { feature: typeof ALL_FEATURES[0]; stats?: any }) {
    const Icon = feature.icon;
    const total  = Number(stats?.total ?? 0);
    const errors = Number(stats?.errors ?? 0);
    const rate   = total > 0 ? Math.round(((total - errors) / total) * 100) : null;
    const lastRun = stats?.lastRun ?? null;

    const isActive = total > 0;
    const hasError = errors > 0;

    const statusBadge = !isActive
        ? <Badge className="text-[10px] bg-slate-700 text-slate-400 px-1.5">غير مُسجَّل</Badge>
        : hasError
        ? <Badge className="text-[10px] bg-amber-700/80 text-amber-200 px-1.5">{errors} خطأ</Badge>
        : <Badge className="text-[10px] bg-emerald-800/80 text-emerald-300 px-1.5">✓ سليم</Badge>;

    return (
        <Card className={`bg-slate-800 border-slate-700 transition-all ${isActive ? "hover:border-slate-500" : "opacity-60"}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${feature.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">{feature.label}</p>
                            <p className="text-xs text-slate-500">{feature.desc}</p>
                        </div>
                    </div>
                    {statusBadge}
                </div>
                <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-3">
                        <span className="text-slate-400">{total > 0 ? `${total} عملية` : "—"}</span>
                        {rate !== null && <span className={rate < 80 ? "text-red-400" : "text-emerald-400"}>{rate}% نجاح</span>}
                    </div>
                    <span className="text-slate-500">{lastRun ? timeAgo(lastRun) : "لم يشتغل"}</span>
                </div>
                {total > 0 && (
                    <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${rate && rate >= 80 ? "bg-emerald-500" : rate && rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${rate ?? 0}%` }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────
export function AiMonitorPanel() {
    const [logLevel, setLogLevel] = useState("all");
    const [activeTab, setActiveTab] = useState<"overview" | "features" | "cron" | "logs">("overview");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const { data: stats, refetch: refetchStats, isFetching: statsFetching } = useQuery({
        queryKey: ["ai-monitor-stats"],
        queryFn: fetchStats,
        refetchInterval: 30000,
    });
    const { data: logsData, refetch: refetchLogs } = useQuery({
        queryKey: ["ai-monitor-logs", logLevel],
        queryFn: () => fetchLogs(logLevel),
        refetchInterval: 30000,
    });
    const { data: errorsData } = useQuery({
        queryKey: ["ai-monitor-errors"],
        queryFn: fetchErrors,
        refetchInterval: 60000,
    });
    const { data: modelsData } = useQuery({
        queryKey: ["ai-monitor-models"],
        queryFn: fetchModels,
        refetchInterval: 60000,
    });
    const { data: featuresData } = useQuery({
        queryKey: ["ai-monitor-features"],
        queryFn: fetchFeatures,
        refetchInterval: 60000,
    });
    const { data: cronData } = useQuery({
        queryKey: ["ai-monitor-cron"],
        queryFn: fetchCronJobs,
        refetchInterval: 60000,
    });

    const logs    = logsData?.logs ?? [];
    const errors  = errorsData?.errors ?? [];
    const models  = modelsData?.models ?? [];
    const featureBreakdown: any[] = featuresData?.features ?? [];
    const cronJobs: any[] = cronData?.jobs ?? [];

    // Map event → stats from DB
    const featureMap = new Map(featureBreakdown.map((f: any) => [f.event, f]));

    const statusColor = stats?.status === "critical" ? "text-red-400" :
                        stats?.status === "warning"  ? "text-amber-400" : "text-emerald-400";
    const StatusIcon  = stats?.status === "healthy"  ? Wifi : WifiOff;

    function refetchAll() { refetchStats(); refetchLogs(); }

    const tabs = [
        { id: "overview" as const, label: "نظرة عامة" },
        { id: "features" as const, label: "ميزات AI" },
        { id: "cron"     as const, label: "جدول المهام" },
        { id: "logs"     as const, label: "السجل الكامل" },
    ];

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" />
                        مراقبة الذكاء الاصطناعي
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">كل ميزة AI بالموقع — 21 ميزة تحت المجهر</p>
                </div>
                <Button variant="outline" size="sm" onClick={refetchAll} disabled={statsFetching}
                    className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-700">
                    <RefreshCw className={`w-4 h-4 ${statsFetching ? "animate-spin" : ""}`} />
                    تحديث
                </Button>
            </div>

            {/* Status Banner */}
            {stats && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                    stats.status === "critical" ? "bg-red-900/30 border-red-700" :
                    stats.status === "warning"  ? "bg-amber-900/30 border-amber-700" :
                                                  "bg-emerald-900/30 border-emerald-700"
                }`}>
                    <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                    <div>
                        <p className={`font-semibold ${statusColor}`}>
                            {stats.status === "critical" ? "🔴 حالة حرجة — نسبة خطأ عالية" :
                             stats.status === "warning"  ? "🟡 تحذير — راجع الأخطاء" :
                                                           "🟢 الـ AI يعمل بشكل طبيعي"}
                        </p>
                        <p className="text-slate-400 text-xs">
                            آخر {stats.hoursBack} ساعة | {stats.total} عملية | {stats.errorRate}% نسبة الخطأ
                        </p>
                    </div>
                </div>
            )}

            {/* Tab Nav */}
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? "bg-primary text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: نظرة عامة ─────────────────────────── */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={<MessageSquare className="w-5 h-5 text-blue-400" />}
                            label="محادثات (24س)" value={stats?.chatCount ?? "—"} />
                        <StatCard icon={<Clock className="w-5 h-5 text-violet-400" />}
                            label="متوسط وقت الرد" value={formatMs(stats?.avgResponseMs ?? 0)}
                            color={stats?.avgResponseMs > 10000 ? "text-red-400" : "text-white"} />
                        <StatCard icon={<XCircle className="w-5 h-5 text-red-400" />}
                            label="أخطاء (24س)" value={stats?.errors ?? "—"}
                            sub={`${stats?.errorRate ?? 0}% نسبة الخطأ`}
                            color={stats?.errors > 0 ? "text-red-400" : "text-emerald-400"} />
                        <StatCard icon={<Globe className="w-5 h-5 text-emerald-400" />}
                            label="بحث الإنترنت" value={stats?.webSearchCount ?? "—"}
                            sub="compound-beta" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatCard icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                            label="Fallback" value={stats?.fallbacks ?? "—"} />
                        <StatCard icon={<Zap className="w-5 h-5 text-primary" />}
                            label="مفاتيح Groq" value={stats?.groqKeysTotal ?? "—"} sub="API keys" />
                        <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                            label="إجمالي العمليات" value={stats?.total ?? "—"} sub="آخر 24 ساعة" />
                    </div>

                    {/* Models */}
                    {models.length > 0 && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-white text-sm flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary" /> استخدام النماذج
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {models.map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                                            <div className="flex items-center gap-2">
                                                {m.model === "compound-beta"
                                                    ? <Globe className="w-4 h-4 text-violet-400" />
                                                    : <Zap className="w-4 h-4 text-blue-400" />}
                                                <span className="text-slate-300 text-sm font-mono">{m.model ?? "unknown"}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs">
                                                <span className="text-slate-400">{m.total} طلب</span>
                                                <span className="text-amber-400">{m.errors} خطأ</span>
                                                <span className="text-slate-300">{formatMs(Math.round(Number(m.avgMs ?? 0)))}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Errors */}
                    {errors.length > 0 && (
                        <Card className="bg-slate-800 border-red-900/50 border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                                    <XCircle className="w-4 h-4" /> آخر الأخطاء ({errors.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-48">
                                    <div className="divide-y divide-slate-700">
                                        {errors.slice(0, 20).map((e: any) => (
                                            <div key={e.id} className="px-4 py-2.5 hover:bg-slate-700/50 transition-colors">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="text-[10px] bg-red-700 text-white px-1.5">{e.event}</Badge>
                                                        {e.errorCode && <span className="text-xs font-mono text-red-400">{e.errorCode}</span>}
                                                    </div>
                                                    <span className="text-xs text-slate-500">{timeAgo(e.timestamp)}</span>
                                                </div>
                                                <p className="text-xs text-red-300 truncate">{e.errorMessage ?? "خطأ غير محدد"}</p>
                                                {e.model && <p className="text-xs text-slate-500 mt-0.5">النموذج: {e.model}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── TAB: ميزات AI ──────────────────────────── */}
            {activeTab === "features" && (
                <div className="space-y-4">
                    <p className="text-slate-400 text-sm">كل ميزة AI بالموقع — آخر 7 أيام</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ALL_FEATURES.map(f => (
                            <FeatureCard
                                key={f.event}
                                feature={f}
                                stats={featureMap.get(f.event)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── TAB: جدول المهام ───────────────────────── */}
            {activeTab === "cron" && (
                <div className="space-y-4">
                    {/* Scheduled jobs reference */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" /> جدول المهام الليلية (توقيت بغداد)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.entries(CRON_JOB_NAMES).map(([key, label]) => {
                                    const lastJob = cronJobs.find(j => j.details?.job === key);
                                    const status = lastJob?.details?.status as string | undefined;
                                    return (
                                        <div key={key} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                            <span className="text-sm text-slate-300">{label}</span>
                                            <div className="flex items-center gap-2">
                                                {lastJob ? (
                                                    <>
                                                        <Badge className={`text-[10px] px-1.5 ${
                                                            status === "completed" ? "bg-emerald-800 text-emerald-300" :
                                                            status === "failed"    ? "bg-red-800 text-red-300" :
                                                                                    "bg-blue-800 text-blue-300"
                                                        }`}>
                                                            {status === "completed" ? "✓ نجح" : status === "failed" ? "✗ فشل" : status ?? "—"}
                                                        </Badge>
                                                        <span className="text-xs text-slate-500">{timeAgo(lastJob.timestamp)}</span>
                                                    </>
                                                ) : (
                                                    <Badge className="text-[10px] bg-slate-600 text-slate-400 px-1.5">لم يُسجَّل بعد</Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cron jobs history */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">سجل تشغيل المهام (آخر 30)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-80">
                                {cronJobs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                                        <Clock className="w-8 h-8 mb-2 text-slate-600" />
                                        <p className="text-sm">لا توجد سجلات مهام بعد</p>
                                        <p className="text-xs mt-1">المهام تعمل في الليل — راجع لاحقاً</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-700">
                                        {cronJobs.map((j: any) => {
                                            const detail = j.details ?? {};
                                            const jobName = CRON_JOB_NAMES[detail.job] ?? detail.job ?? j.event;
                                            const isCompleted = detail.status === "completed";
                                            const isFailed    = detail.status === "failed";
                                            return (
                                                <div key={j.id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            {isFailed
                                                                ? <XCircle className="w-4 h-4 text-red-400" />
                                                                : isCompleted
                                                                ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                                : <Activity className="w-4 h-4 text-blue-400" />}
                                                            <span className="text-sm text-slate-300">{jobName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {j.responseTimeMs && (
                                                                <span className="text-xs text-slate-500">{formatMs(j.responseTimeMs)}</span>
                                                            )}
                                                            <span className="text-xs text-slate-500">{timeAgo(j.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                    {/* Result details */}
                                                    {isCompleted && detail.job === "auto_blog" && detail.title && (
                                                        <p className="text-xs text-emerald-400 mt-0.5">📝 {detail.title}</p>
                                                    )}
                                                    {isCompleted && detail.usersAnalyzed !== undefined && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {detail.usersAnalyzed} مستخدم محلَّل
                                                            {detail.predictionsCreated !== undefined && ` | ${detail.predictionsCreated} تنبؤ`}
                                                            {detail.highRisk !== undefined && ` | ${detail.highRisk} خطر عالٍ`}
                                                        </p>
                                                    )}
                                                    {isCompleted && detail.job === "embeddings" && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            ✓ {detail.success ?? 0} embedding | ✗ {detail.failed ?? 0} فشل
                                                        </p>
                                                    )}
                                                    {isCompleted && detail.job === "smart_reminders" && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {detail.usersNotified ?? 0} مستخدم | {detail.emailsSent ?? 0} إيميل | {detail.pushSent ?? 0} push
                                                        </p>
                                                    )}
                                                    {isFailed && j.errorMessage && (
                                                        <p className="text-xs text-red-400 mt-0.5 truncate">{j.errorMessage}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── TAB: السجل الكامل ──────────────────────── */}
            {activeTab === "logs" && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" />
                                سجل العمليات التفصيلي
                                <span className="text-slate-500 font-normal text-xs">— اضغط على أي سطر لعرض كل التفاصيل</span>
                            </CardTitle>
                            <div className="flex gap-1 flex-wrap">
                                {["all", "info", "warning", "error", "critical"].map(l => (
                                    <button key={l} onClick={() => setLogLevel(l)}
                                        className={`px-2 py-1 rounded text-xs transition-colors ${
                                            logLevel === l ? "bg-primary text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        }`}>
                                        {l === "all" ? "الكل" : l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[650px]">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                                    <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                                    <p className="text-sm">لا يوجد سجلات بعد</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/40">
                                    {logs.map((log: any) => {
                                        const isExpanded = expandedLogId === log.id;
                                        const uid = shortId(log.userId);
                                        const sid = shortId(log.sessionId);
                                        const tools: string[] = log.toolsUsed ?? [];
                                        const details: Record<string, any> = log.details ?? {};
                                        const hasDetails = uid || sid || tools.length > 0 || log.tokenCount || log.messageLength || Object.keys(details).length > 0 || log.errorMessage || log.errorCode;

                                        return (
                                            <div key={log.id}>
                                                {/* ── Summary Row (always visible) ── */}
                                                <div
                                                    onClick={() => hasDetails && setExpandedLogId(isExpanded ? null : log.id)}
                                                    className={`px-4 py-3 transition-colors ${hasDetails ? "cursor-pointer" : ""} ${isExpanded ? "bg-slate-700/50" : "hover:bg-slate-700/30"}`}
                                                >
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        {/* Status dot */}
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.success ? "bg-emerald-500" : "bg-red-500"}`} />

                                                        {/* Event + icon */}
                                                        <div className="flex items-center gap-1.5 min-w-[130px]">
                                                            {eventIcon(log.event)}
                                                            <span className="text-slate-200 text-xs font-medium">{log.event}</span>
                                                        </div>

                                                        {/* Level */}
                                                        <Badge className={`text-[10px] px-1.5 flex-shrink-0 ${levelColor(log.level)}`}>{log.level}</Badge>

                                                        {/* User */}
                                                        <div className="flex items-center gap-1 text-xs">
                                                            <User className="w-3 h-3 text-slate-500" />
                                                            <span className={uid ? "text-blue-400 font-mono" : "text-slate-600"}>
                                                                {uid ?? "زائر"}
                                                            </span>
                                                        </div>

                                                        {/* Model */}
                                                        <span className="text-slate-500 font-mono text-xs flex-shrink-0">
                                                            {shortModel(log.model)}
                                                            {log.webSearchUsed && <Globe className="w-3 h-3 inline mr-1 text-violet-400" />}
                                                        </span>

                                                        {/* Duration */}
                                                        <span className={`text-xs font-mono flex-shrink-0 ${log.responseTimeMs > 10000 ? "text-red-400" : log.responseTimeMs > 5000 ? "text-amber-400" : "text-slate-400"}`}>
                                                            {formatMs(log.responseTimeMs)}
                                                        </span>

                                                        {/* Products */}
                                                        {log.productsFound > 0 && (
                                                            <span className="text-xs text-cyan-400 flex-shrink-0">
                                                                {log.productsFound} منتج
                                                            </span>
                                                        )}

                                                        {/* Flags */}
                                                        {log.fallbackUsed && <span className="text-[10px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">fallback</span>}

                                                        {/* Error snippet */}
                                                        {log.errorMessage && (
                                                            <span className="text-xs text-red-400 truncate max-w-[200px]">⚠ {log.errorMessage}</span>
                                                        )}

                                                        {/* Blog title */}
                                                        {!log.errorMessage && details.title && (
                                                            <span className="text-xs text-emerald-400 truncate max-w-[200px]">📝 {details.title}</span>
                                                        )}

                                                        {/* Timestamp */}
                                                        <span className="text-slate-600 text-xs mr-auto flex-shrink-0">{fullTimestamp(log.timestamp)}</span>

                                                        {/* Expand indicator */}
                                                        {hasDetails && (
                                                            <span className="text-slate-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ── Expanded Details ── */}
                                                {isExpanded && (
                                                    <div className="bg-slate-900/60 border-t border-slate-700 px-6 py-4 text-xs space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                                            {/* Identity */}
                                                            <div className="space-y-1.5">
                                                                <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">الهوية</p>
                                                                <div className="space-y-1">
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-20 flex-shrink-0">User ID</span>
                                                                        <span className={uid ? "text-blue-400 font-mono break-all" : "text-slate-600"}>{log.userId ?? "زائر (غير مسجل)"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-20 flex-shrink-0">Session</span>
                                                                        <span className="text-slate-400 font-mono break-all">{log.sessionId ?? "—"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-20 flex-shrink-0">Log ID</span>
                                                                        <span className="text-slate-600 font-mono text-[10px]">{log.id}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Performance */}
                                                            <div className="space-y-1.5">
                                                                <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">الأداء</p>
                                                                <div className="space-y-1">
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">وقت الاستجابة</span>
                                                                        <span className={`font-mono ${log.responseTimeMs > 10000 ? "text-red-400" : "text-slate-300"}`}>{formatMs(log.responseTimeMs)}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">الرموز (tokens)</span>
                                                                        <span className="text-slate-300 font-mono">{log.tokenCount ?? "—"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">طول الرسالة</span>
                                                                        <span className="text-slate-300 font-mono">{log.messageLength ? `${log.messageLength} حرف` : "—"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">منتجات وجدها</span>
                                                                        <span className="text-slate-300 font-mono">{log.productsFound ?? "—"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Flags */}
                                                            <div className="space-y-1.5">
                                                                <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">الإشارات</p>
                                                                <div className="space-y-1">
                                                                    <div className="flex gap-2 items-center">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">النجاح</span>
                                                                        {log.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                                                        <span className={log.success ? "text-emerald-400" : "text-red-400"}>{log.success ? "نعم" : "فشل"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">Fallback</span>
                                                                        <span className={log.fallbackUsed ? "text-amber-400" : "text-slate-600"}>{log.fallbackUsed ? "✓ مُستخدم" : "لا"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center">
                                                                        <span className="text-slate-500 w-24 flex-shrink-0">بحث إنترنت</span>
                                                                        <span className={log.webSearchUsed ? "text-violet-400" : "text-slate-600"}>{log.webSearchUsed ? "✓ مُستخدم" : "لا"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Tools Used */}
                                                        {tools.length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">الأدوات المستخدمة ({tools.length})</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {tools.map((t: string, i: number) => (
                                                                        <Badge key={i} className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-800 px-2 py-0.5 font-mono">
                                                                            {t}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Error Info */}
                                                        {(log.errorMessage || log.errorCode) && (
                                                            <div className="space-y-1.5 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
                                                                <p className="text-red-400 font-semibold text-[11px] uppercase tracking-wider">تفاصيل الخطأ</p>
                                                                {log.errorCode && (
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-20 flex-shrink-0">كود الخطأ</span>
                                                                        <span className="text-red-300 font-mono">{log.errorCode}</span>
                                                                    </div>
                                                                )}
                                                                {log.errorMessage && (
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 w-20 flex-shrink-0">الرسالة</span>
                                                                        <span className="text-red-300 break-all">{log.errorMessage}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Extra Details JSON */}
                                                        {Object.keys(details).length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">بيانات إضافية</p>
                                                                <div className="bg-slate-800 rounded-lg p-3 space-y-1 border border-slate-700">
                                                                    {Object.entries(details).map(([k, v]) => (
                                                                        <div key={k} className="flex gap-2">
                                                                            <span className="text-slate-500 font-mono min-w-[120px] flex-shrink-0">{k}</span>
                                                                            <span className="text-slate-300 break-all font-mono text-[11px]">{renderDetailValue(v)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/**
 * AI Monitor Panel — لوحة مراقبة الذكاء الاصطناعي
 * Shows every AI action, error, latency, model usage in real time
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
} from "lucide-react";

// ─── API helpers ─────────────────────────────────────────────
const fetchStats    = () => fetch("/api/admin/ai-monitor/stats",  { credentials: "include" }).then(r => r.json());
const fetchLogs     = (level: string) => fetch(`/api/admin/ai-monitor/logs?limit=150&level=${level}`, { credentials: "include" }).then(r => r.json());
const fetchErrors   = () => fetch("/api/admin/ai-monitor/errors?limit=50", { credentials: "include" }).then(r => r.json());
const fetchModels   = () => fetch("/api/admin/ai-monitor/models",  { credentials: "include" }).then(r => r.json());

// ─── Helpers ──────────────────────────────────────────────────
function levelColor(level: string) {
    if (level === "critical") return "bg-red-600 text-white";
    if (level === "error")    return "bg-red-500 text-white";
    if (level === "warning")  return "bg-amber-500 text-white";
    return "bg-emerald-600 text-white";
}

function eventIcon(event: string) {
    if (event === "chat")       return <MessageSquare className="w-3.5 h-3.5" />;
    if (event === "error")      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    if (event === "timeout")    return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    if (event === "fallback")   return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    if (event === "search")     return <Search className="w-3.5 h-3.5 text-blue-400" />;
    if (event === "compound_search") return <Globe className="w-3.5 h-3.5 text-violet-400" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
}

function formatMs(ms: number | null) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `منذ ${Math.floor(diff / 1000)}ث`;
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)}د`;
    return `منذ ${Math.floor(diff / 3600000)}س`;
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

// ─── Main Component ───────────────────────────────────────────
export function AiMonitorPanel() {
    const [logLevel, setLogLevel] = useState("all");

    const { data: stats, refetch: refetchStats, isFetching: statsFetching } = useQuery({
        queryKey: ["ai-monitor-stats"],
        queryFn: fetchStats,
        refetchInterval: 30000, // auto-refresh every 30s
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

    const logs   = logsData?.logs ?? [];
    const errors = errorsData?.errors ?? [];
    const models = modelsData?.models ?? [];

    const statusColor = stats?.status === "critical" ? "text-red-400" :
                        stats?.status === "warning"  ? "text-amber-400" : "text-emerald-400";
    const StatusIcon  = stats?.status === "healthy"  ? Wifi : WifiOff;

    function refetchAll() {
        refetchStats();
        refetchLogs();
    }

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" />
                        مراقبة الذكاء الاصطناعي
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">كل عملية يقوم بها الـ AI — لايف</p>
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

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                    label="Fallback (رجع للنسخة القديمة)" value={stats?.fallbacks ?? "—"} />
                <StatCard icon={<Zap className="w-5 h-5 text-primary" />}
                    label="مفاتيح Groq" value={stats?.groqKeysTotal ?? "—"} sub="API keys" />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                    label="إجمالي العمليات" value={stats?.total ?? "—"} sub="آخر 24 ساعة" />
            </div>

            {/* Models Usage */}
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
                                        {m.model === "compound-beta" ?
                                            <Globe className="w-4 h-4 text-violet-400" /> :
                                            <Zap className="w-4 h-4 text-blue-400" />}
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

            {/* All Logs */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" /> سجل العمليات الكامل
                        </CardTitle>
                        <div className="flex gap-1">
                            {["all", "info", "warning", "error", "critical"].map(l => (
                                <button key={l} onClick={() => setLogLevel(l)}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                        logLevel === l
                                            ? "bg-primary text-white"
                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                    }`}>
                                    {l === "all" ? "الكل" : l}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-96">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                                <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                                <p className="text-sm">لا يوجد سجلات بعد</p>
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                                    <tr className="text-slate-400">
                                        <th className="text-right px-4 py-2 font-medium">الوقت</th>
                                        <th className="text-right px-2 py-2 font-medium">الحدث</th>
                                        <th className="text-right px-2 py-2 font-medium">المستوى</th>
                                        <th className="text-right px-2 py-2 font-medium">النموذج</th>
                                        <th className="text-right px-2 py-2 font-medium">الوقت</th>
                                        <th className="text-right px-2 py-2 font-medium">منتجات</th>
                                        <th className="text-right px-2 py-2 font-medium">الحالة</th>
                                        <th className="text-right px-4 py-2 font-medium">التفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {logs.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{timeAgo(log.timestamp)}</td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center gap-1 whitespace-nowrap">
                                                    {eventIcon(log.event)}
                                                    <span className="text-slate-300">{log.event}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <Badge className={`text-[10px] px-1.5 ${levelColor(log.level)}`}>
                                                    {log.level}
                                                </Badge>
                                            </td>
                                            <td className="px-2 py-2 text-slate-400 font-mono whitespace-nowrap">
                                                {log.model ? log.model.replace("llama-3.3-70b-versatile", "llama-70b") : "—"}
                                                {log.webSearchUsed && <Globe className="w-3 h-3 inline mr-1 text-violet-400" />}
                                            </td>
                                            <td className="px-2 py-2 text-slate-300">
                                                {formatMs(log.responseTimeMs)}
                                            </td>
                                            <td className="px-2 py-2 text-slate-400">
                                                {log.productsFound ?? "—"}
                                            </td>
                                            <td className="px-2 py-2">
                                                {log.success
                                                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                    : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500 max-w-xs truncate">
                                                {log.errorMessage ?? (log.fallbackUsed ? "⚠️ fallback" : "")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

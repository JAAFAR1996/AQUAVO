import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  DollarSign,
  Eye,
  LayoutList,
  Loader2,
  Package,
  PieChart,
  Route,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsSummary {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  deliveredOrders: number;
  activeOrders: number;
  rejectedOrders: number;
  totalCustomers: number;
  customersChange: number;
  newCustomers: number;
  newCustomersChange: number;
  totalPageViews: number;
  pageViewsChange: number;
  uniqueVisitors: number;
  websiteOrders: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  salesChart: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  trafficSources: { source: string; visits: number; percentage: number }[];
  ordersByStatus: { status: string; count: number }[];
}

interface SourceData {
  source: string;
  visits: number;
  uniqueUsers: number;
  percentage: number;
  recentVisitors: {
    fullName: string | null;
    email: string | null;
    pagePath: string;
    timestamp: string;
  }[];
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

interface JourneySession {
  sessionId: string;
  fullName: string | null;
  email: string | null;
  ipAddress: string | null;
  source: string;
  deviceType: string | null;
  startedAt: string;
  pages: { path: string; duration: number | null; timestamp: string }[];
}

interface ActiveNowPage {
  pagePath: string;
  total: number;
  loggedIn: number;
  anonymous: number;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PLATFORM_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  facebook: { label: "فيسبوك", emoji: "📘", color: "#1877f2", bg: "bg-blue-50 dark:bg-blue-950/30" },
  instagram: { label: "انستغرام", emoji: "📸", color: "#e1306c", bg: "bg-pink-50 dark:bg-pink-950/30" },
  google: { label: "بحث Google", emoji: "🔍", color: "#4285f4", bg: "bg-sky-50 dark:bg-sky-950/30" },
  tiktok: { label: "تيك توك", emoji: "🎵", color: "#111827", bg: "bg-slate-50 dark:bg-slate-800/30" },
  youtube: { label: "يوتيوب", emoji: "▶️", color: "#ff0000", bg: "bg-red-50 dark:bg-red-950/30" },
  whatsapp: { label: "واتساب", emoji: "💬", color: "#25d366", bg: "bg-green-50 dark:bg-green-950/30" },
  "chatgpt.com": { label: "ChatGPT", emoji: "◉", color: "#10a37f", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  twitter: { label: "تويتر / X", emoji: "𝕏", color: "#111827", bg: "bg-slate-50 dark:bg-slate-800/30" },
  bing: { label: "Bing", emoji: "🔎", color: "#00809d", bg: "bg-teal-50 dark:bg-teal-950/30" },
  direct: { label: "مباشر", emoji: "🔗", color: "#6b7280", bg: "bg-gray-50 dark:bg-gray-800/30" },
  other: { label: "أخرى", emoji: "🌐", color: "#9ca3af", bg: "bg-gray-50 dark:bg-gray-800/30" },
};

function periodDays(period: "7d" | "30d" | "90d"): number {
  return period === "7d" ? 7 : period === "90d" ? 90 : 30;
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const days = periodDays(period);

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics", period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics?period=${period}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    refetchInterval: 60_000,
  });

  const { data: sourcesData = [] } = useQuery<SourceData[]>({
    queryKey: ["admin-analytics-sources", period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/sources?days=${days}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sources");
      const json = await response.json();
      const recentBySource: Record<string, Array<{
        userFullName: string | null;
        userEmail: string | null;
        pagePath: string;
        createdAt: string;
      }>> = json.recentBySource ?? {};
      return (json.sources ?? []).map((source: {
        source: string;
        visits: number;
        uniqueUsers: number;
        percentage: number;
      }) => ({
        ...source,
        recentVisitors: (recentBySource[source.source] ?? []).map((visitor) => ({
          fullName: visitor.userFullName,
          email: visitor.userEmail,
          pagePath: visitor.pagePath,
          timestamp: visitor.createdAt,
        })),
      }));
    },
    refetchInterval: 60_000,
  });

  const { data: pagesData, error: pagesError } = useQuery<{ pages: PageStat[]; days: number; totalViews: number }>({
    queryKey: ["admin-analytics-pages", period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/pages?days=${days}&limit=50`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch page analytics");
      return response.json();
    },
    refetchInterval: 60_000,
  });

  const { data: journeysData = [] } = useQuery<JourneySession[]>({
    queryKey: ["admin-analytics-journeys", period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/journeys?days=${days}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch journeys");
      return response.json();
    },
    refetchInterval: 60_000,
  });

  const { data: activeNow } = useQuery<{ total: number; byPage: ActiveNowPage[] }>({
    queryKey: ["admin-analytics-active-now"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics/active-now", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch active visitors");
      return response.json();
    },
    refetchInterval: 30_000,
  });

  const formatCurrency = (value: number) => `${new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(value)} د.ع`;
  const formatNumber = (value: number) => new Intl.NumberFormat("ar-IQ").format(value);

  const renderChange = (change: number) => {
    const positive = change >= 0;
    return (
      <span className={`inline-flex items-center text-sm ${positive ? "text-green-500" : "text-red-500"}`}>
        {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !data) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">فشل تحميل التحليلات</CardContent></Card>;
  }

  const summary = data.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">التحليلات</h2>
          <p className="text-muted-foreground">أرقام المتجر الفعلية بعد استبعاد نشاط الأدمن</p>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">آخر 7 أيام</SelectItem>
            <SelectItem value="30d">آخر 30 يوم</SelectItem>
            <SelectItem value="90d">آخر 90 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        الإيرادات هنا تعني قيمة الطلبات <strong className="text-foreground">الموصلة فقط</strong>، ومعدل التحويل يعني طلبات الموقع مقسومة على الزوار الفريدين. الطلبات المرفوضة وزيارات الأدمن لا تدخل بهذه المؤشرات.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">مبيعات الطلبات الموصلة</p><p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p></div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full"><DollarSign className="w-6 h-6 text-green-600" /></div>
          </div>
          <div className="mt-2">{renderChange(summary.revenueChange)} <span className="text-xs text-muted-foreground mr-1">مقارنة بالموصل في الفترة السابقة</span></div>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">إجمالي الطلبات المنشأة</p><p className="text-2xl font-bold">{formatNumber(summary.totalOrders)}</p></div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full"><ShoppingCart className="w-6 h-6 text-blue-600" /></div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">موصل {formatNumber(summary.deliveredOrders)} • جاري {formatNumber(summary.activeOrders)} • مرفوض/مرتجع {formatNumber(summary.rejectedOrders)}</div>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">العملاء المشترون</p><p className="text-2xl font-bold">{formatNumber(summary.totalCustomers)}</p></div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full"><Users className="w-6 h-6 text-purple-600" /></div>
          </div>
          <div className="mt-2">{renderChange(summary.customersChange)} <span className="text-xs text-muted-foreground mr-1">مقارنة بالفترة السابقة • {formatNumber(summary.newCustomers)} لأول مرة</span></div>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">مشاهدات المتجر</p><p className="text-2xl font-bold">{formatNumber(summary.totalPageViews)}</p></div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full"><Eye className="w-6 h-6 text-amber-600" /></div>
          </div>
          <div className="mt-2">{renderChange(summary.pageViewsChange)} <span className="text-xs text-muted-foreground mr-1">{formatNumber(summary.uniqueVisitors)} زائر فريد</span></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="pt-6 flex items-center gap-4">
          <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full"><Activity className="w-6 h-6 text-cyan-600" /></div>
          <div><p className="text-sm text-muted-foreground">متوسط الطلب الموصل</p><p className="text-xl font-bold">{formatCurrency(summary.averageOrderValue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full"><TrendingUp className="w-6 h-6 text-rose-600" /></div>
          <div><p className="text-sm text-muted-foreground">معدل تحويل الموقع</p><p className="text-xl font-bold">{summary.conversionRate.toFixed(2)}%</p><p className="text-xs text-muted-foreground">{formatNumber(summary.websiteOrders)} طلب موقع ÷ {formatNumber(summary.uniqueVisitors)} زائر</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="sales" dir="rtl">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sales"><BarChart3 className="w-4 h-4 ml-2" />المبيعات</TabsTrigger>
          <TabsTrigger value="products"><Package className="w-4 h-4 ml-2" />المنتجات</TabsTrigger>
          <TabsTrigger value="traffic"><PieChart className="w-4 h-4 ml-2" />الزيارات</TabsTrigger>
          <TabsTrigger value="pages"><LayoutList className="w-4 h-4 ml-2" />الصفحات</TabsTrigger>
          <TabsTrigger value="journeys"><Route className="w-4 h-4 ml-2" />رحلات الزوار</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <Card><CardHeader><CardTitle>المبيعات الموصلة يومياً</CardTitle><CardDescription>لا تشمل الطلبات الجارية أو المرفوضة أو المرتجعة</CardDescription></CardHeader><CardContent>
            <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.salesChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="date" className="text-xs" /><YAxis className="text-xs" />
              <Tooltip formatter={(value: number, name: string) => [name === "revenue" ? formatCurrency(value) : formatNumber(value), name === "revenue" ? "المبيعات" : "الطلبات الموصلة"]} />
              <Legend formatter={(value) => value === "revenue" ? "المبيعات" : "الطلبات الموصلة"} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
              <Area type="monotone" dataKey="orders" stroke="#3b82f6" fill="#3b82f633" strokeWidth={2} />
            </AreaChart></ResponsiveContainer></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card><CardHeader><CardTitle>أكثر المنتجات مبيعاً</CardTitle><CardDescription>من الطلبات الموصلة ضمن الفترة فقط</CardDescription></CardHeader><CardContent>
            {data.topProducts.length === 0 ? <p className="py-12 text-center text-muted-foreground">لا توجد مبيعات موصلة ضمن الفترة</p> :
              <div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={170} className="text-xs" />
                <Tooltip formatter={(value: number) => [formatNumber(value), "الكمية"]} /><Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart></ResponsiveContainer></div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="traffic" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sourcesData.map((source) => {
              const config = PLATFORM_CONFIG[source.source] ?? PLATFORM_CONFIG.other;
              return <Card key={source.source} className={`border-0 ${config.bg}`}><CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className="text-2xl">{config.emoji}</span><div><p className="font-semibold text-sm">{config.label}</p><p className="text-xs text-muted-foreground">{source.percentage}% من المشاهدات</p></div></div>
                  <div className="text-left"><p className="text-xl font-bold" style={{ color: config.color }}>{formatNumber(source.visits)}</p><p className="text-xs text-muted-foreground">{formatNumber(source.uniqueUsers)} زائر فريد</p></div></div>
                <div className="w-full bg-muted rounded-full h-1.5 mb-3"><div className="h-1.5 rounded-full" style={{ width: `${source.percentage}%`, backgroundColor: config.color }} /></div>
                {source.recentVisitors.length > 0 && <div className="space-y-1"><p className="text-xs text-muted-foreground">آخر الزوار</p>{source.recentVisitors.slice(0, 3).map((visitor, index) => <div key={`${source.source}-${index}`} className="flex justify-between text-xs"><span className="truncate">{visitor.fullName ?? visitor.email?.split("@")[0] ?? "زائر مجهول"}</span><span className="text-muted-foreground truncate max-w-[110px]" dir="ltr">{visitor.pagePath}</span></div>)}</div>}
              </CardContent></Card>;
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>توزيع مصادر الزيارة</CardTitle><CardDescription>بعد دمج المسميات المتكررة واستبعاد الأدمن</CardDescription></CardHeader><CardContent><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><RechartsPie><Pie data={data.trafficSources} dataKey="visits" nameKey="source" cx="50%" cy="50%" outerRadius={85} label={({ source, percentage }) => `${PLATFORM_CONFIG[source]?.label ?? source} (${percentage}%)`}>{data.trafficSources.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle>حالة الطلبات ضمن الفترة</CardTitle><CardDescription>كل الطلبات المنشأة، وليست الموصلة فقط</CardDescription></CardHeader><CardContent><div className="space-y-3">{data.ordersByStatus.map((item, index) => <div key={item.status} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span>{item.status}</span></div><Badge variant="secondary">{formatNumber(item.count)}</Badge></div>)}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="mt-4 space-y-4">
          <Card className="border-green-500/30 bg-green-500/5"><CardContent className="py-4 flex items-center justify-between flex-wrap gap-3"><div className="flex items-center gap-3"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" /></span><strong className="text-green-500 text-lg">{activeNow?.total ?? 0}</strong><span className="text-sm text-muted-foreground">زائر ظهر خلال آخر 5 دقائق</span></div><div className="flex gap-2 flex-wrap">{(activeNow?.byPage ?? []).slice(0, 5).map((page) => <Badge key={page.pagePath} variant="outline">{page.pagePath} — {page.total}</Badge>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>تفاصيل الصفحات</CardTitle><CardDescription>إجمالي {formatNumber(pagesData?.totalViews ?? 0)} مشاهدة حقيقية خلال {pagesData?.days ?? days} يوم</CardDescription></CardHeader><CardContent>
            {pagesError ? <p className="text-destructive text-center py-8">تعذر تحميل بيانات الصفحات</p> : !pagesData ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> :
              <div className="overflow-x-auto"><table className="w-full text-sm min-w-[760px]"><thead><tr className="border-b text-muted-foreground"><th className="text-right py-2">الصفحة</th><th>المشاهدات</th><th>زوار فريدون</th><th>ضيوف</th><th>متوسط الوقت</th><th>موبايل</th></tr></thead><tbody>{pagesData.pages.map((page) => {
                const devices = page.mobileViews + page.desktopViews;
                const mobilePct = devices > 0 ? Math.round((page.mobileViews / devices) * 100) : 0;
                return <tr key={page.pagePath} className="border-b last:border-0"><td className="py-3 font-mono" dir="ltr">{page.pagePath}</td><td className="text-center font-bold">{formatNumber(page.views)}</td><td className="text-center">{formatNumber(page.uniqueUsers)}</td><td className="text-center">{formatNumber(page.anonymousViews)}</td><td className="text-center">{page.avgDuration > 0 ? `${Math.floor(page.avgDuration / 60)}:${String(page.avgDuration % 60).padStart(2, "0")}` : "—"}</td><td className="text-center">{mobilePct}%</td></tr>;
              })}</tbody></table></div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="journeys" className="mt-4">
          <Card><CardHeader><CardTitle>رحلات الزوار</CardTitle><CardDescription>لا تظهر رحلات الأدمن، والفترة تتغير مع الاختيار أعلاه</CardDescription></CardHeader><CardContent>
            {journeysData.length === 0 ? <p className="text-center py-8 text-muted-foreground">لا توجد رحلات ضمن الفترة</p> : <div className="space-y-3">{journeysData.slice(0, 30).map((session, index) => {
              const config = PLATFORM_CONFIG[session.source] ?? PLATFORM_CONFIG.other;
              const totalDuration = session.pages.reduce((total, page) => total + (page.duration ?? 0), 0);
              const visitor = session.fullName ?? session.email?.split("@")[0] ?? `زائر #${index + 1}`;
              return <div key={session.sessionId} className="border rounded-lg p-4"><div className="flex justify-between gap-3 mb-3"><div><p className="font-bold">{visitor}</p><p className="text-xs text-muted-foreground">{config.emoji} {config.label} • {new Date(session.startedAt).toLocaleString("ar-IQ")}</p></div><div className="text-left"><p className="text-sm font-bold">{session.pages.length} صفحات</p><p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="w-3 h-3" />{totalDuration} ثانية</p></div></div><div className="flex flex-wrap gap-2">{session.pages.map((page, pageIndex) => <Badge key={`${session.sessionId}-${pageIndex}`} variant="secondary" dir="ltr">{page.path}{page.duration ? ` • ${page.duration}s` : ""}</Badge>)}</div></div>;
            })}</div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;

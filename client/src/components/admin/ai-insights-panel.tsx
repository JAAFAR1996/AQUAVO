import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  MapPin,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardTruth {
  generatedAt: string;
  periodDays: number;
  inventory: {
    liveProducts: number;
    lowStock: number;
    outOfStock: number;
    purchaseCostValue: number;
    retailValue: number;
    productsMissingCost: number;
  };
  orders: {
    activeNow: number;
    deliveredInPeriod: number;
    failedFinalizedInPeriod: number;
    finalizedInPeriod: number;
    finalizedFailureRate: number | null;
    realizedRevenueInPeriod: number;
    averageDeliveredOrderValue: number | null;
    websiteOrdersInPeriod: number;
  };
  peakDeliveredOrderHour: {
    label: string;
    hour: number;
    sampleSize: number;
  } | null;
  geography: Array<{
    city: string;
    deliveredOrders: number;
    percentage: number;
  }>;
  observedCategoryTrends: Array<{
    category: string;
    currentUnits: number;
    previousUnits: number;
    percentageChange: number | null;
    trend: "up" | "down" | "stable" | "new";
    evidence: string;
  }>;
  definitions: {
    revenue: string;
    lowStock: string;
    failureRate: string;
    trends: string;
  };
}

interface DashboardTruthResponse {
  success: boolean;
  data?: DashboardTruth;
  error?: string;
}

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString("ar-IQ", {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TrendIcon({ trend }: { trend: DashboardTruth["observedCategoryTrends"][number]["trend"] }) {
  if (trend === "up" || trend === "new") return <TrendingUp className="h-5 w-5 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-5 w-5 text-red-600" />;
  return <BarChart3 className="h-5 w-5 text-blue-600" />;
}

function trendLabel(trend: DashboardTruth["observedCategoryTrends"][number]["trend"], percentage: number | null) {
  if (trend === "new") return "ظهر طلب جديد";
  if (percentage === null) return "لا توجد مقارنة كافية";
  if (trend === "up") return `ارتفاع ${Math.abs(percentage)}%`;
  if (trend === "down") return `انخفاض ${Math.abs(percentage)}%`;
  return `مستقر تقريباً (${percentage > 0 ? "+" : ""}${percentage}%)`;
}

export function AIInsightsPanel() {
  const query = useQuery<DashboardTruthResponse>({
    queryKey: ["admin-ai", "verified-dashboard-insights"],
    queryFn: async () => {
      const response = await fetch("/api/pricing/dashboard-insights", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardTruthResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "تعذر قراءة بيانات الإدارة");
      }
      return payload;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري حساب المؤشرات من قاعدة البيانات...
        </CardContent>
      </Card>
    );
  }

  if (query.error || !query.data?.data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8">
          <div className="mx-auto max-w-xl rounded-lg bg-destructive/5 p-5 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="font-semibold">تعذر التحقق من الرؤى</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query.error instanceof Error ? query.error.message : "حدث خطأ غير معروف"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              لن نعرض أرقاماً قديمة أو تقديرية عند فشل جلب البيانات.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const truth = query.data.data;
  const failureRate = truth.orders.finalizedFailureRate;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-cyan-500/10 to-blue-500/10">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Database className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">رؤى مبنية على بيانات فعلية</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                كل رقم أدناه محسوب مباشرة من المنتجات والطلبات الموصلة، بدون نسب موسمية مفترضة.
              </p>
            </div>
            <div className="text-left">
              <Badge variant="secondary">آخر {truth.periodDays} يوم</Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                آخر تحديث: {formatGeneratedAt(truth.generatedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              الطلبات الفعلية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{truth.orders.deliveredInPeriod}</p>
            <p className="text-xs text-muted-foreground">طلب موصل خلال آخر 30 يوم</p>
            <p className="mt-2 text-sm">النشطة حالياً: {truth.orders.activeNow}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              الإيراد المحقق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {truth.orders.realizedRevenueInPeriod.toLocaleString("en-US")} د.ع
            </p>
            <p className="text-xs text-muted-foreground">من الطلبات الموصلة فقط</p>
            {truth.orders.averageDeliveredOrderValue !== null && (
              <p className="mt-2 text-sm">
                متوسط الطلب: {truth.orders.averageDeliveredOrderValue.toLocaleString("en-US")} د.ع
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-amber-600" />
              حالة المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{truth.inventory.lowStock}</p>
            <p className="text-xs text-muted-foreground">منتج منخفض وليس نافداً</p>
            <p className="mt-2 text-sm text-red-600">النافد: {truth.inventory.outOfStock}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Box className="h-4 w-4 text-purple-600" />
              تكلفة المخزون المسجلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {truth.inventory.purchaseCostValue.toLocaleString("en-US")} د.ع
            </p>
            <p className="text-xs text-muted-foreground">سعر الشراء × الكمية الحالية</p>
            <p className="mt-2 text-sm">
              قيمة البيع النظرية: {truth.inventory.retailValue.toLocaleString("en-US")} د.ع
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>رؤى موثّقة</CardTitle>
            <CardDescription>يظهر الدليل وعدد السجلات المستخدم مع كل نتيجة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">وقت إنشاء الطلبات الموصلة الأكثر تكراراً</p>
                  {truth.peakDeliveredOrderHour ? (
                    <>
                      <p className="mt-1 text-sm">{truth.peakDeliveredOrderHour.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        مبني على {truth.peakDeliveredOrderHour.sampleSize} طلب موصل خلال الفترة.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      البيانات غير كافية؛ نحتاج 5 طلبات موصلة على الأقل.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-semibold">نسبة النتائج النهائية غير الناجحة</p>
                  {failureRate === null ? (
                    <p className="mt-1 text-sm text-muted-foreground">لا توجد طلبات نهائية كافية للحساب.</p>
                  ) : (
                    <>
                      <p className="mt-1 text-lg font-bold">{failureRate}%</p>
                      <p className="text-xs text-muted-foreground">
                        {truth.orders.failedFinalizedInPeriod} مرفوض/ملغي/مرتجع من {truth.orders.finalizedInPeriod} طلب نهائي.
                        الطلبات النشطة غير داخلة بالحساب.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-purple-600" />
                <div className="w-full">
                  <p className="font-semibold">توزيع الطلبات الموصلة حسب المحافظة</p>
                  {truth.geography.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">عناوين الطلبات لا تحتوي بيانات كافية.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {truth.geography.map((item) => (
                        <div key={item.city} className="flex items-center justify-between gap-3 text-sm">
                          <span>{item.city}</span>
                          <span className="text-muted-foreground">
                            {item.deliveredOrders} طلب ({item.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>اتجاهات الطلب المرصودة</CardTitle>
            <CardDescription>
              مقارنة وحدات المنتجات الموصلة بآخر 30 يوم مع الـ30 يوم السابقة؛ ليست توقعات للمستقبل.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {truth.observedCategoryTrends.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                لا توجد مبيعات كافية في فئتين زمنيتين لإظهار اتجاه موثوق.
              </div>
            ) : (
              truth.observedCategoryTrends.map((trend) => (
                <div key={trend.category} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <TrendIcon trend={trend.trend} />
                      <div>
                        <p className="font-semibold">{trend.category}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{trend.evidence}</p>
                      </div>
                    </div>
                    <Badge variant={trend.trend === "down" ? "destructive" : trend.trend === "up" || trend.trend === "new" ? "default" : "secondary"}>
                      {trendLabel(trend.trend, trend.percentageChange)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">تعريفات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <p><strong className="text-foreground">الإيراد:</strong> {truth.definitions.revenue}</p>
          <p><strong className="text-foreground">المخزون المنخفض:</strong> {truth.definitions.lowStock}</p>
          <p><strong className="text-foreground">نسبة الفشل:</strong> {truth.definitions.failureRate}</p>
          <p><strong className="text-foreground">الاتجاهات:</strong> {truth.definitions.trends}</p>
        </CardContent>
      </Card>
    </div>
  );
}

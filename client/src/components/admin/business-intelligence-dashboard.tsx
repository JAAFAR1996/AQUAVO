import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CircleDollarSign, RefreshCw, ShoppingCart, Users } from "lucide-react";
import { addCsrfHeader } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Overview = {
  confidence: "exact" | "mixed" | "estimated";
  financials: {
    realizedOrders: number;
    grossCollected: number;
    productRevenue: number;
    cogs: number;
    contributionProfit: number;
    operatingExpenses: number;
    adSpend: number;
    netOperatingProfit: number;
    avgOrderValue: number;
    exactOrders: number;
    estimatedOrders: number;
  };
  customers: {
    customersTotal: number;
    repeatCustomersTotal: number;
    repeatCustomerRatePct: number;
  };
  inventory: {
    inventoryValue: number;
    packagingInventoryValue: number;
    deadStockValue: number;
    deadSkus: number;
    lowStockSkus: number;
    stockoutSkus: number;
    missingCurrentCosts: number;
  };
  marketing: {
    configured: boolean;
    adSpend: number;
    trackedConversions: number;
    roas: number | null;
    mer: number | null;
  };
  reconciliation: { orderFinancialOpen: number; orderTotalOpen: number; productCostOpen: number; inventoryDifference: number };
  findings: { open: number; critical: number; warning: number };
};

type Finding = {
  id: string;
  severity: string;
  title_ar: string;
  details: Record<string, unknown>;
};

const iq = (value: number | null | undefined) =>
  Math.round(Number(value ?? 0)).toLocaleString("en-US") + " د.ع";
const pct = (value: number | null | undefined) =>
  Number(value ?? 0).toFixed(1) + "%";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "HTTP " + response.status);
  return body as T;
}

export function BusinessIntelligenceDashboard() {
  const queryClient = useQueryClient();
  const overview = useQuery<Overview>({
    queryKey: ["business-intelligence", "overview"],
    queryFn: () => jsonFetch("/api/admin/business-intelligence/overview"),
    refetchInterval: 60_000,
  });
  const findings = useQuery<Finding[]>({
    queryKey: ["business-intelligence", "findings"],
    queryFn: () => jsonFetch("/api/admin/business-intelligence/findings"),
    refetchInterval: 60_000,
  });
  const refresh = useMutation({
    mutationFn: () =>
      jsonFetch("/api/admin/business-intelligence/refresh", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: "{}",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "findings"] }),
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "history"] }),
      ]);
    },
  });

  if (overview.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">جاري حساب حقيقة المشروع…</div>;
  }
  if (overview.error || !overview.data) {
    return (
      <div className="p-6 text-destructive">
        تعذر تحميل ذكاء الأعمال: {(overview.error as Error)?.message}
      </div>
    );
  }

  const data = overview.data;
  const cards = [
    {
      title: "الربح التشغيلي المسجل",
      value: iq(data.financials.netOperatingProfit),
      sub: "بعد COGS والتوصيل والتجهيز والمصاريف والإعلانات المسجلة",
      icon: CircleDollarSign,
    },
    {
      title: "مبيعات المنتجات",
      value: iq(data.financials.productRevenue),
      sub: data.financials.realizedOrders + " طلب محقق",
      icon: ShoppingCart,
    },
    {
      title: "قيمة المخزون",
      value: iq(data.inventory.inventoryValue),
      sub: "راكد 60 يوم: " + iq(data.inventory.deadStockValue),
      icon: Boxes,
    },
    {
      title: "العملاء المتكررون",
      value: pct(data.customers.repeatCustomerRatePct),
      sub: data.customers.repeatCustomersTotal + " من " + data.customers.customersTotal,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">AQUAVO Business OS</h2>
          <p className="text-sm text-muted-foreground">
            حقيقة مالية + مخزون + عملاء + تسويق. الحسابات حتمية والـAI يقرأها فقط.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data.confidence === "exact" ? "default" : "secondary"}>
            الثقة: {data.confidence === "exact" ? "دقيقة" : "مختلطة"}
          </Badge>
          <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            <RefreshCw
              className={"ml-2 h-4 w-4 " + (refresh.isPending ? "animate-spin" : "")}
            />
            تحديث اللقطة
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, sub, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">اقتصاد الطلبات</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>COGS</span><strong>{iq(data.financials.cogs)}</strong></div>
            <div className="flex justify-between"><span>ربح المساهمة</span><strong>{iq(data.financials.contributionProfit)}</strong></div>
            <div className="flex justify-between"><span>مصاريف تشغيلية</span><strong>{iq(data.financials.operatingExpenses)}</strong></div>
            <div className="flex justify-between"><span>متوسط الطلب</span><strong>{iq(data.financials.avgOrderValue)}</strong></div>
            <div className="flex justify-between"><span>مصالحة مالية مفتوحة</span><strong>{data.reconciliation.orderFinancialOpen}</strong></div>
            <p className="pt-2 text-xs text-muted-foreground">
              {data.financials.exactOrders} طلب Exact، {data.financials.estimatedOrders} طلب تاريخي معاد البناء.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">المخزون</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>مخزون منتجات</span><strong>{iq(data.inventory.inventoryValue)}</strong></div>
            <div className="flex justify-between"><span>مواد تجهيز</span><strong>{iq(data.inventory.packagingInventoryValue)}</strong></div>
            <div className="flex justify-between"><span>SKU راكد 60 يوم</span><strong>{data.inventory.deadSkus}</strong></div>
            <div className="flex justify-between"><span>مخزون منخفض / نافد</span><strong>{data.inventory.lowStockSkus} / {data.inventory.stockoutSkus}</strong></div>
            {data.inventory.missingCurrentCosts > 0 && (
              <p className="text-xs text-destructive">
                أكو {data.inventory.missingCurrentCosts} كلف مخزون ناقصة.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">التسويق</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Ad Spend المسجل</span><strong>{iq(data.marketing.adSpend)}</strong></div>
            <div className="flex justify-between"><span>Tracked conversions</span><strong>{data.marketing.trackedConversions}</strong></div>
            <div className="flex justify-between"><span>ROAS</span><strong>{data.marketing.roas == null ? "—" : data.marketing.roas.toFixed(2)}</strong></div>
            <div className="flex justify-between"><span>MER</span><strong>{data.marketing.mer == null ? "—" : data.marketing.mer.toFixed(2)}</strong></div>
            {!data.marketing.configured && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                مصدر Google/Meta بعده ما دا يكتب يومياً داخل Business OS؛ لذلك الربح يعرض فقط الإعلان المسجل.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            المشاكل المفتوحة ({data.findings.open})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(findings.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">ماكو تحذيرات مفتوحة.</p>
          ) : (
            <div className="space-y-2">
              {findings.data?.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{finding.title_ar}</p>
                    <p className="text-xs text-muted-foreground">{finding.severity}</p>
                  </div>
                  <Badge variant={finding.severity === "critical" ? "destructive" : "secondary"}>
                    {finding.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

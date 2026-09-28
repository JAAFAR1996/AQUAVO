import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CircleDollarSign, RefreshCw, ShoppingCart, Users } from "lucide-react";
import { addCsrfHeader } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerAquariumProfileManager } from "./customer-aquarium-profile-manager";

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

type Assessment = {
  status: "CONTINUE" | "FIX" | "REASSESS" | "INSUFFICIENT_DATA";
  dataReady: boolean;
  reasons: string[];
  operatingDays: number;
  evidence: {
    revenueGrowthPct: number;
    orderGrowthPct: number;
    current30ProductRevenue: number;
    previous30ProductRevenue: number;
    current30Orders: number;
    previous30Orders: number;
  };
};

type BusinessEvent = {
  id: string;
  occurred_at: string;
  event_type: string;
  title: string;
  source: string;
  severity: "info" | "warning" | "critical";
};

type GrowthOverview = {
  attribution: {
    realizedOrders: number;
    attributedOrders: number;
    attributionCoveragePct: number;
    googleClickOrders: number;
    metaClickOrders: number;
    googleMeasuredOrders: number;
    googlePurchaseMeasurementCoveragePct: number;
    metaMeasuredOrders: number;
    metaPurchaseMeasurementCoveragePct: number;
    providerSpendIqd: number;
    providerTrackedConversions: number;
  };
  inventory: {
    day: string | null;
    summary: {
      skuCount: number; fast: number; medium: number; slow: number; dead: number;
      new: number; stockout: number; capitalLocked: number; reorderSkus: number; reorderValue: number;
    };
  };
  lifecycle: {
    summary: {
      ready: number; planned: number; completed: number; suppressed: number; cancelled: number;
      failed: number; automatedReady: number; day7Ready: number; repurchaseReady: number;
    };
    jobs: Array<{
      id: string; jobType: string; dueAt: string; status: string; orderNumber: string;
      customerName: string; whatsappUrl: string | null; message: string;
      channel: string; automated: boolean; consentEligible: boolean;
      templateName: string | null; templateCategory: string | null;
      providerStatus: string | null; attemptCount: number; lastErrorCode: string | null;
    }>;
  };
  customerProfiles: { total: number; detailed: number; coveragePct: number };
  bundles: { count: number; live: number; inStock: number };
  expenses: { capturedUnpostedCount: number; capturedUnpostedAmount: number; marketingSpendCaptured: number };
};

type WhatsAppLifecycleReadiness = {
  enabled: boolean;
  cloudEnabled: boolean;
  lifecycleEnabled: boolean;
  templatesApproved: boolean;
  apiVersionConfigured: boolean;
  phoneNumberConfigured: boolean;
  tokenConfigured: boolean;
  day7TemplateConfigured: boolean;
  repurchaseTemplateConfigured: boolean;
  activationAt: string | null;
  sendWindowBaghdad: { startHour: number; endHour: number };
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
  const assessment = useQuery<Assessment>({
    queryKey: ["business-intelligence", "assessment"],
    queryFn: () => jsonFetch("/api/admin/business-intelligence/assessment"),
    refetchInterval: 60_000,
  });
  const events = useQuery<BusinessEvent[]>({
    queryKey: ["business-intelligence", "events"],
    queryFn: () => jsonFetch("/api/admin/business-intelligence/events?limit=8"),
    refetchInterval: 60_000,
  });
  const growth = useQuery<GrowthOverview>({
    queryKey: ["growth-os", "overview"],
    queryFn: () => jsonFetch("/api/admin/growth-os/overview"),
    refetchInterval: 60_000,
  });
  const whatsappReadiness = useQuery<WhatsAppLifecycleReadiness>({
    queryKey: ["growth-os", "whatsapp-readiness"],
    queryFn: () => jsonFetch("/api/admin/growth-os/whatsapp/readiness"),
    refetchInterval: 60_000,
  });
  const findings = useQuery<Finding[]>({
    queryKey: ["business-intelligence", "findings"],
    queryFn: () => jsonFetch("/api/admin/business-intelligence/findings"),
    refetchInterval: 60_000,
  });
  const refresh = useMutation({
    mutationFn: async () => {
      const request = (url: string) => jsonFetch(url, {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: "{}",
      });
      return Promise.all([
        request("/api/admin/business-intelligence/refresh"),
        request("/api/admin/growth-os/refresh"),
      ]);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "assessment"] }),
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "findings"] }),
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "events"] }),
        queryClient.invalidateQueries({ queryKey: ["business-intelligence", "history"] }),
        queryClient.invalidateQueries({ queryKey: ["growth-os", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["growth-os", "whatsapp-readiness"] }),
      ]);
    },
  });

  const completeLifecycle = useMutation({
    mutationFn: (jobId: string) =>
      jsonFetch("/api/admin/growth-os/lifecycle/" + encodeURIComponent(jobId) + "/complete", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: "{}",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["growth-os", "overview"] });
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

      {assessment.data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">قرار التشغيل الحالي</CardTitle>
              <Badge variant={
                assessment.data.status === "CONTINUE"
                  ? "default"
                  : assessment.data.status === "REASSESS"
                    ? "destructive"
                    : "secondary"
              }>
                {assessment.data.status === "CONTINUE"
                  ? "استمر"
                  : assessment.data.status === "FIX"
                    ? "أصلح قبل التوسع"
                    : assessment.data.status === "REASSESS"
                      ? "أعد تقييم النموذج"
                      : "البيانات غير كافية"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3"><span className="text-muted-foreground">نمو المبيعات 30 يوم</span><div className="font-bold">{pct(assessment.data.evidence.revenueGrowthPct)}</div></div>
              <div className="rounded-lg border p-3"><span className="text-muted-foreground">نمو الطلبات 30 يوم</span><div className="font-bold">{pct(assessment.data.evidence.orderGrowthPct)}</div></div>
              <div className="rounded-lg border p-3"><span className="text-muted-foreground">مبيعات آخر 30 يوم</span><div className="font-bold">{iq(assessment.data.evidence.current30ProductRevenue)}</div></div>
              <div className="rounded-lg border p-3"><span className="text-muted-foreground">أيام التشغيل المقاسة</span><div className="font-bold">{assessment.data.operatingDays}</div></div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {assessment.data.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

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

      {growth.data && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold">AQUAVO Growth OS</h3>
            <p className="text-sm text-muted-foreground">Attribution + دوران المخزون + إعادة الشراء + الباقات + اكتمال المصاريف.</p>
          </div>

          {whatsappReadiness.data && (
            <Card className={whatsappReadiness.data.enabled ? "border-emerald-500/30" : "border-amber-500/30"}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">WhatsApp Lifecycle</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold">{whatsappReadiness.data.enabled ? "جاهز للإرسال التلقائي" : "محمي — الإرسال التلقائي غير مفعل"}</p>
                  <p className="text-xs text-muted-foreground">
                    Templates: {whatsappReadiness.data.templatesApproved ? "Approved" : "بانتظار الاعتماد/التفعيل"} ·
                    {" "}نافذة الإرسال {whatsappReadiness.data.sendWindowBaghdad.startHour}:00–{whatsappReadiness.data.sendWindowBaghdad.endHour}:00 بغداد
                  </p>
                </div>
                <Badge variant={whatsappReadiness.data.enabled ? "default" : "secondary"}>
                  {whatsappReadiness.data.enabled ? "AUTO ON" : "AUTO OFF"}
                </Badge>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Attribution</CardTitle></CardHeader><CardContent>
              <div className="text-2xl font-bold">{pct(growth.data.attribution.attributionCoveragePct)}</div>
              <p className="text-xs text-muted-foreground">{growth.data.attribution.attributedOrders} من {growth.data.attribution.realizedOrders} طلب</p>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Google Purchase</CardTitle></CardHeader><CardContent>
              <div className="text-2xl font-bold">{pct(growth.data.attribution.googlePurchaseMeasurementCoveragePct)}</div>
              <p className="text-xs text-muted-foreground">{growth.data.attribution.googleMeasuredOrders} receipt</p>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Meta Purchase</CardTitle></CardHeader><CardContent>
              <div className="text-2xl font-bold">{pct(growth.data.attribution.metaPurchaseMeasurementCoveragePct)}</div>
              <p className="text-xs text-muted-foreground">{growth.data.attribution.metaMeasuredOrders} receipt</p>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Slow / Dead Capital</CardTitle></CardHeader><CardContent>
              <div className="text-2xl font-bold">{iq(growth.data.inventory.summary.capitalLocked)}</div>
              <p className="text-xs text-muted-foreground">Slow {growth.data.inventory.summary.slow} · Dead {growth.data.inventory.summary.dead}</p>
            </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">متابعات مستحقة</CardTitle></CardHeader><CardContent>
              <div className="text-2xl font-bold">{growth.data.lifecycle.summary.ready}</div>
              <p className="text-xs text-muted-foreground">Day 7: {growth.data.lifecycle.summary.day7Ready} · Reorder: {growth.data.lifecycle.summary.repurchaseReady}</p>
            </CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-base">حركة المخزون</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Fast</span><strong>{growth.data.inventory.summary.fast}</strong></div>
              <div className="flex justify-between"><span>Medium</span><strong>{growth.data.inventory.summary.medium}</strong></div>
              <div className="flex justify-between"><span>Slow</span><strong>{growth.data.inventory.summary.slow}</strong></div>
              <div className="flex justify-between"><span>Dead</span><strong>{growth.data.inventory.summary.dead}</strong></div>
              <div className="flex justify-between"><span>Stockout</span><strong>{growth.data.inventory.summary.stockout}</strong></div>
              <div className="flex justify-between border-t pt-2"><span>إعادة طلب مقترحة</span><strong>{growth.data.inventory.summary.reorderSkus}</strong></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">الزبائن والباقات</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>ملفات أحواض مكتملة</span><strong>{growth.data.customerProfiles.detailed}/{growth.data.customerProfiles.total}</strong></div>
              <div className="flex justify-between"><span>التغطية</span><strong>{pct(growth.data.customerProfiles.coveragePct)}</strong></div>
              <div className="flex justify-between"><span>الباقات المنشورة</span><strong>{growth.data.bundles.live}</strong></div>
              <div className="flex justify-between"><span>المتوفرة بالكامل</span><strong>{growth.data.bundles.inStock}</strong></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">اكتمال المصاريف والقياس</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Marketing spend captured</span><strong>{iq(growth.data.expenses.marketingSpendCaptured)}</strong></div>
              <div className="flex justify-between"><span>مصروف غير مرحّل</span><strong>{iq(growth.data.expenses.capturedUnpostedAmount)}</strong></div>
              <div className="flex justify-between"><span>Provider conversions</span><strong>{growth.data.attribution.providerTrackedConversions}</strong></div>
            </CardContent></Card>
          </div>

          {growth.data.lifecycle.jobs.some((job) => ["ready","sending","failed"].includes(job.status)) && (
            <Card><CardHeader><CardTitle className="text-base">متابعات WhatsApp</CardTitle></CardHeader><CardContent className="space-y-2">
              {growth.data.lifecycle.jobs.filter((job) => ["ready","sending","failed"].includes(job.status)).slice(0,10).map((job) => (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{job.jobType === "day7_care" ? "متابعة اليوم السابع" : "تذكير إعادة شراء"} · {job.customerName || job.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      #{job.orderNumber} · {new Date(job.dueAt).toLocaleDateString("ar-IQ")} ·
                      {" "}{job.automated ? "إرسال تلقائي" : "يدوي"}
                      {job.templateCategory ? " · " + job.templateCategory : ""}
                    </p>
                    {job.lastErrorCode && <p className="mt-1 text-xs text-destructive">{job.lastErrorCode}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.automated ? (
                      <Badge variant={job.status === "failed" ? "destructive" : "secondary"}>
                        {job.status === "sending" ? "جاري الإرسال" : job.status === "failed" ? "فشل" : "WhatsApp تلقائي"}
                      </Badge>
                    ) : job.whatsappUrl ? (
                      <>
                        <a href={job.whatsappUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">فتح WhatsApp</a>
                        <Button size="sm" variant="outline" disabled={completeLifecycle.isPending} onClick={() => completeLifecycle.mutate(job.id)}>تم التواصل</Button>
                      </>
                    ) : (
                      <Badge variant="secondary">{job.consentEligible ? "رقم غير صالح" : "لا توجد موافقة WhatsApp"}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent></Card>
          )}

          <CustomerAquariumProfileManager />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">آخر أحداث المشروع</CardTitle></CardHeader>
        <CardContent>
          {(events.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">ماكو أحداث مسجلة بعد.</p>
          ) : (
            <div className="space-y-2">
              {events.data?.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString("ar-IQ")} · {event.source}
                    </p>
                  </div>
                  <Badge variant={event.severity === "critical" ? "destructive" : "secondary"}>
                    {event.event_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

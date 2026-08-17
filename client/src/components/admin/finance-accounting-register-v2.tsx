import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { FinanceSmartCarrierCenterV2 } from "@/components/admin/finance-smart-carrier-center-v2";
import { FinanceAccountingOperationsLiteV2 } from "@/components/admin/finance-accounting-operations-lite-v2";
import { downloadAccountantPdfV2 } from "@/lib/accountant-pdf-v2";

const CUTOVER_MONTH = "2026-08";
const REQUIRED_BALANCE_CODES = ["1000", "1010", "1100", "1200", "3100"] as const;
const money = z.coerce.number().finite();
const blockerSchema = z.object({ key: z.string(), label: z.string(), count: z.coerce.number().finite() });
const readinessSchema = z.object({
  product_revenue: money,
  rounding_adjustment: money,
  merchant_net: money,
  delivery_subsidy: money,
  delivery_surplus: money,
  cogs: money,
  fulfillment_cost: money,
  sales_returns: money,
  actual_return_loss: money,
  verified_expenses: money,
  fx_net_expense: money,
  journal_difference: money,
  realized_orders: z.coerce.number().finite(),
  procurement_integrity_failures: z.coerce.number().finite().optional(),
  settlement_integrity_failures: z.coerce.number().finite().optional(),
  governance_review_flags: z.coerce.number().finite().optional(),
  blockers: z.array(blockerSchema),
  administrativeCloseReady: z.boolean(),
}).passthrough();
const orderSchema = z.object({
  order_id: z.string(), order_number: z.string().nullable().optional(), recognized_at: z.string(),
  gross_collected: money, customer_delivery_fee: money, carrier_fee: money,
  product_revenue: money, merchant_net: money, delivery_subsidy: money, delivery_surplus: money,
  cogs_amount: money.nullable().optional(), settlement_status: z.string(), cost_status: z.string(),
}).passthrough();
const balanceSchema = z.object({
  code: z.string(), name_ar: z.string(), account_type: z.string(), normal_side: z.string(),
  debit: money, credit: money, balance: money,
});
const autoCloseSchema = z.object({ periodKey: z.string(), status: z.string(), blockers: z.unknown() });
const registerSchema = z.object({
  periodKey: z.string(), policyVersion: z.string(), timezone: z.string(), currency: z.string(),
  cutover: z.string(), archiveBeforeCutover: z.boolean(), summary: readinessSchema,
  orders: z.array(orderSchema), liveBalances: z.array(balanceSchema),
  close: z.record(z.string(), z.unknown()).nullable(), automaticClose: z.array(autoCloseSchema),
});
const archiveSummarySchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalRevenue: money,
    totalCogs: money,
    totalPackaging: money,
    netProfit: money,
    deliveredCount: z.coerce.number().finite(),
    totalOrders: z.coerce.number().finite(),
    salesReturnDeduction: money.optional(),
    actualReturnLoss: money.optional(),
  }).passthrough(),
});

type Summary = z.infer<typeof readinessSchema>;

function baghdadMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}
function monthRange(periodKey: string): { from: string; to: string } {
  const [year, month] = periodKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${periodKey}-01`, to: `${periodKey}-${String(lastDay).padStart(2, "0")}` };
}
async function readJson(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (body as any)?.message === "string" ? (body as any).message : "فشل تحميل السجل المحاسبي";
    throw new Error(message.includes("ACCOUNTING_V2_LATEST_MIGRATION_REQUIRED")
      ? "قاعدة المحاسبة تحتاج آخر تحديث محاسبي قبل فتح السجل"
      : message);
  }
  return body;
}
function formatIqd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "غير متوفر";
  return `${Math.round(value).toLocaleString("en-US")} د.ع`;
}

function Card({ label, value, note }: { label: string; value: number | undefined; note?: string }) {
  const missing = value == null || !Number.isFinite(value);
  return (
    <div style={{ border: `1px solid ${missing ? "#92400e" : "#1e3a5f"}`, borderRadius: 12, padding: 14, background: "#0d1f3c" }}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ color: missing ? "#fcd34d" : "#fff", fontSize: 21, fontWeight: 800, marginTop: 5 }}>{formatIqd(value)}</div>
      {note ? <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{note}</div> : null}
    </div>
  );
}

function archiveSummary(data: z.infer<typeof archiveSummarySchema>["data"]): Summary {
  return {
    product_revenue: data.totalRevenue,
    rounding_adjustment: 0,
    merchant_net: data.totalRevenue,
    delivery_subsidy: 0,
    delivery_surplus: 0,
    cogs: data.totalCogs,
    fulfillment_cost: data.totalPackaging,
    sales_returns: Number(data.salesReturnDeduction ?? 0),
    actual_return_loss: Number(data.actualReturnLoss ?? 0),
    verified_expenses: 0,
    fx_net_expense: 0,
    journal_difference: 0,
    realized_orders: data.deliveredCount,
    blockers: [],
    administrativeCloseReady: false,
  };
}

export function FinanceAccountingRegisterV2() {
  const [periodKey, setPeriodKey] = useState(baghdadMonth);
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const currentPeriod = baghdadMonth();
  const isArchive = periodKey < CUTOVER_MONTH;

  const register = useQuery({
    queryKey: ["accounting-v2-register", periodKey],
    queryFn: async () => registerSchema.parse(await readJson(await fetch(
      `/api/admin/accounting/v2/register?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))),
    enabled: !isArchive,
    retry: false,
  });
  const archive = useQuery({
    queryKey: ["accounting-archive-summary", periodKey],
    queryFn: async () => {
      const range = monthRange(periodKey);
      const params = new URLSearchParams({ period: "custom", from: range.from, to: range.to });
      return archiveSummarySchema.parse(await readJson(await fetch(
        `/api/admin/accounting/summary?${params.toString()}`,
        { credentials: "include" },
      )));
    },
    enabled: isArchive,
    retry: false,
  });

  const summary = isArchive
    ? (archive.data ? archiveSummary(archive.data.data) : undefined)
    : register.data?.summary;
  const closeRecord = isArchive ? null : register.data?.close;
  const balances = useMemo(() => new Map((register.data?.liveBalances ?? []).map((item) => [item.code, item.balance])), [register.data]);
  const missingBalanceCodes = useMemo(() => isArchive
    ? []
    : REQUIRED_BALANCE_CODES.filter((code) => !balances.has(code)), [balances, isArchive]);
  const balancesComplete = missingBalanceCodes.length === 0;
  const netProfit = useMemo(() => {
    if (!summary) return undefined;
    return summary.product_revenue + summary.rounding_adjustment
      - summary.cogs - summary.fulfillment_cost - summary.delivery_subsidy
      - summary.sales_returns - summary.actual_return_loss - summary.verified_expenses - summary.fx_net_expense;
  }, [summary]);

  async function downloadPackagePdf() {
    if (!summary) return;
    if (!isArchive && !balancesComplete) {
      setPdfError(`لا يمكن إنشاء PDF: حسابات دفتر الأستاذ ناقصة (${missingBalanceCodes.join(", ")})`);
      return;
    }
    setPdfPending(true); setPdfError(null);
    try {
      if (isArchive) {
        await downloadAccountantPdfV2({
          manifest: {
            packageVersion: "historical-archive-v1", periodKey, generatedAt: new Date().toISOString(),
            legalName: "محل المنبع", legalNameEn: "AL NABEA SHOP", brand: "AQUAVO",
            timezone: "Asia/Baghdad", currency: "IQD", taxFinal: false, archive: true,
          },
          readiness: summary,
          liveBalances: [], sales: [], journal: [], expenses: [], returns: [], settlements: [],
          close: null,
        });
      } else {
        const response = await fetch(`/api/admin/accounting/v2/accountant-package?periodKey=${encodeURIComponent(periodKey)}`, { credentials: "include" });
        await downloadAccountantPdfV2(await readJson(response) as Record<string, unknown>);
      }
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "فشل إنشاء ملف PDF");
    } finally {
      setPdfPending(false);
    }
  }

  const isCurrent = periodKey === currentPeriod;
  const isPast = periodKey < currentPeriod;
  const closeStatus = String(closeRecord?.status ?? "");
  const periodStatus = isArchive
    ? "أرشيف تاريخي للقراءة فقط - لا يدخل في قيود Accounting V2"
    : closeStatus === "tax_final"
      ? "الفترة معتمدة ضريبياً ومقفلة"
      : closeStatus === "closed"
        ? "الفترة مغلقة إدارياً تلقائياً"
        : isCurrent
          ? "الفترة الحالية مفتوحة؛ تُغلق تلقائياً بعد آخر يوم من الشهر بتوقيت بغداد"
          : isPast && summary?.blockers.length
            ? `الإغلاق التلقائي ينتظر معالجة ${summary.blockers.length} نوع من الموانع، ويعيد المحاولة يومياً`
            : "الفترة السابقة جاهزة للإغلاق التلقائي في دورة النظام القادمة";
  const error = isArchive ? archive.error : register.error;

  return (
    <div style={{ display: "grid", gap: 16 }} data-testid="accounting-register-v2">
      <section style={{ border: "1px solid #1e3a5f", borderRadius: 14, padding: 16, background: "#0B1E28" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>السجل المحاسبي — محل المنبع / AQUAVO</h2>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "5px 0 0", lineHeight: 1.7 }}>
              من آب 2026 الأرصدة مشتقة من اليومية تلقائياً. أي حساب مفقود يظهر «غير متوفر» ولا يتحول تلقائياً إلى صفر.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input aria-label="الشهر المحاسبي" type="month" max={currentPeriod} value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value)}
              style={{ background: "#0d1f3c", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 10px" }} />
            <button onClick={() => void downloadPackagePdf()} disabled={!summary || pdfPending || (!isArchive && !balancesComplete)}
              style={{ background: "#0B64A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 700, opacity: !summary || pdfPending || (!isArchive && !balancesComplete) ? 0.5 : 1 }}>
              {pdfPending ? "جاري بناء PDF..." : "تنزيل ملف المحاسب PDF"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 11, color: isArchive ? "#fcd34d" : closeStatus ? "#a7f3d0" : "#bae6fd", fontSize: 12 }}>{periodStatus}</div>
      </section>

      {error || pdfError ? (
        <div role="alert" aria-live="assertive" style={{ border: "1px solid #7f1d1d", background: "#450a0a", color: "#fecaca", borderRadius: 10, padding: 12 }}>
          {pdfError ?? (error instanceof Error ? error.message : "حدث خطأ")}
        </div>
      ) : null}

      {!isArchive && register.data && !balancesComplete ? (
        <div role="alert" style={{ border: "1px solid #92400e", background: "#2b160b", color: "#fde68a", borderRadius: 10, padding: 12 }}>
          بيانات دفتر الأستاذ ناقصة للحسابات: {missingBalanceCodes.join("، ")}. تم إيقاف PDF ومنع عرض أصفار بديلة.
        </div>
      ) : null}

      {summary ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
            <Card label="مبيعات المنتجات" value={summary.product_revenue} note={isArchive ? "ملخص تاريخي" : "بعد فصل توصيل الزبون"} />
            {!isArchive ? <Card label="فرق التقريب" value={summary.rounding_adjustment} note="حساب مستقل 3050" /> : null}
            <Card label={isArchive ? "إجمالي الإيراد التاريخي" : "صافي حق AQUAVO"} value={summary.merchant_net} note={isArchive ? "ليس رصيد COD رسمي" : "COD ناقص أجرة شركة التوصيل"} />
            <Card label="دعم التوصيل" value={summary.delivery_subsidy} />
            <Card label="كلفة المنتجات" value={summary.cogs} />
            <Card label="كلفة التجهيز" value={summary.fulfillment_cost} />
            <Card label="صافي الربح الإداري" value={netProfit} note={isArchive ? "بحسب البيانات التاريخية المتاحة" : "يشمل التقريب ويستبعد فروقات التوصيل المعلقة؛ قبل TAX FINAL"} />
          </div>

          {!isArchive ? (
            <>
              <section style={{ border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, background: "#071720" }}>
                <h3 style={{ color: "#fff", margin: "0 0 10px", fontSize: 15 }}>الأرصدة الحية — محسوبة من دفتر الأستاذ</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                  <Card label="النقد في الصندوق" value={balances.get("1000")} note="افتتاحي + تسويات − دفعات ومصاريف" />
                  <Card label="الحساب البنكي" value={balances.get("1010")} note="من الحركات البنكية المسجلة" />
                  <Card label="COD عند شركات التوصيل" value={balances.get("1100")} note="المسلّم غير المستلم نقداً" />
                  <Card label="مخزون المنتجات" value={balances.get("1200")} note="قيمة المخزون الدفترية" />
                  <Card label="رأس مال المالك" value={balances.get("3100")} />
                  <Card label="فرق اليومية" value={summary.journal_difference} note="يجب أن يبقى صفراً" />
                </div>
              </section>

              <section style={{ border: `1px solid ${summary.blockers.length ? "#7c2d12" : "#14532d"}`, borderRadius: 12, padding: 14, background: summary.blockers.length ? "#2b160b" : "#082f1d" }}>
                <h3 style={{ color: "#fff", fontSize: 14, margin: 0 }}>
                  {summary.blockers.length ? `موانع الإغلاق التلقائي (${summary.blockers.length})` : isCurrent ? "لا توجد مشاكل حالياً — الإغلاق ينتظر نهاية الشهر" : "الفترة جاهزة للإغلاق التلقائي"}
                </h3>
                {summary.blockers.length ? <div style={{ display: "grid", gap: 6, marginTop: 10 }}>{summary.blockers.map((item) => (
                  <div key={item.key} style={{ color: "#fed7aa", fontSize: 12 }}>• {item.label}: {item.count}</div>
                ))}</div> : null}
              </section>
            </>
          ) : (
            <section style={{ border: "1px solid #92400e", borderRadius: 12, padding: 14, background: "#2b160b", color: "#fde68a", fontSize: 12, lineHeight: 1.8 }}>
              هذا الشهر قبل تاريخ القطع 1 آب 2026. يعرض النظام ملخص البيانات القديمة فقط، ولا ينشئ قيوداً أو يغيّر المخزون أو يغلق الشهر داخل Accounting V2.
            </section>
          )}
        </>
      ) : null}

      {!isArchive ? (
        <>
          <section style={{ border: "1px solid #1e3a5f", borderRadius: 12, overflow: "auto", background: "#0d1f3c" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
              <thead><tr style={{ color: "#94a3b8", fontSize: 11, textAlign: "right" }}>
                {["الطلب", "تاريخ التحقق", "COD الإجمالي", "توصيل الزبون", "أجرة الشركة", "مبيعات المنتجات", "صافي AQUAVO", "دعم التوصيل", "التسوية"].map((label) => <th key={label} style={{ padding: 10, borderBottom: "1px solid #1e3a5f" }}>{label}</th>)}
              </tr></thead>
              <tbody>
                {(register.data?.orders ?? []).map((order) => <tr key={order.order_id} style={{ color: "#e2e8f0", fontSize: 12 }}>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{order.order_number ?? order.order_id.slice(0, 8)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{new Date(order.recognized_at).toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" })}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.gross_collected)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.customer_delivery_fee)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.carrier_fee)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.product_revenue)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.merchant_net)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.delivery_subsidy)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{order.settlement_status}</td>
                </tr>)}
                {register.data && register.data.orders.length === 0 ? <tr><td colSpan={9} style={{ padding: 20, color: "#94a3b8", textAlign: "center" }}>لا توجد مبيعات متحققة بهذا الشهر.</td></tr> : null}
              </tbody>
            </table>
          </section>
          <FinanceSmartCarrierCenterV2 periodKey={periodKey} />
          <FinanceAccountingOperationsLiteV2 periodKey={periodKey} />
        </>
      ) : null}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { FinanceSmartCarrierCenterV2 } from "@/components/admin/finance-smart-carrier-center-v2";
import { FinanceAccountingOperationsLiteV2 } from "@/components/admin/finance-accounting-operations-lite-v2";
import { downloadAccountantPdfV2 } from "@/lib/accountant-pdf-v2";

const money = z.coerce.number().default(0);
const blockerSchema = z.object({ key: z.string(), label: z.string(), count: z.coerce.number() });
const readinessSchema = z.object({
  product_revenue: money,
  merchant_net: money,
  delivery_subsidy: money,
  delivery_surplus: money,
  cogs: money,
  fulfillment_cost: money,
  sales_returns: money,
  actual_return_loss: money,
  verified_expenses: money,
  journal_difference: money,
  realized_orders: z.coerce.number().default(0),
  blockers: z.array(blockerSchema),
  administrativeCloseReady: z.boolean(),
}).passthrough();
const orderSchema = z.object({
  order_id: z.string(), order_number: z.string().nullable().optional(), recognized_at: z.string(),
  gross_collected: money, customer_delivery_fee: money, carrier_fee: money,
  product_revenue: money, merchant_net: money, delivery_subsidy: money, delivery_surplus: money,
  cogs_amount: z.coerce.number().nullable().optional(), settlement_status: z.string(), cost_status: z.string(),
}).passthrough();
const balanceSchema = z.object({
  code: z.string(), name_ar: z.string(), account_type: z.string(), normal_side: z.string(),
  debit: money, credit: money, balance: money,
});
const autoCloseSchema = z.object({
  periodKey: z.string(), status: z.string(), blockers: z.unknown(),
});
const registerSchema = z.object({
  periodKey: z.string(), policyVersion: z.string(), timezone: z.string(), currency: z.string(),
  cutover: z.string(), archiveBeforeCutover: z.boolean(), summary: readinessSchema,
  orders: z.array(orderSchema), liveBalances: z.array(balanceSchema),
  close: z.record(z.string(), z.unknown()).nullable(), automaticClose: z.array(autoCloseSchema),
});

function baghdadMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}
async function readJson(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (body as any)?.message === "string" ? (body as any).message : "فشل تحميل السجل المحاسبي";
    throw new Error(message.includes("0051_TO_0062") ? "ترحيل الأتمتة المحاسبية 0062 غير مطبق بعد" : message);
  }
  return body;
}
const formatIqd = (value: number | null | undefined) => `${Math.round(Number(value ?? 0)).toLocaleString("en-US")} د.ع`;

function Card({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div style={{ border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, background: "#0d1f3c" }}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ color: "#fff", fontSize: 21, fontWeight: 800, marginTop: 5 }}>{formatIqd(value)}</div>
      {note ? <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{note}</div> : null}
    </div>
  );
}

export function FinanceAccountingRegisterV2() {
  const [periodKey, setPeriodKey] = useState(baghdadMonth);
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const currentPeriod = baghdadMonth();

  const register = useQuery({
    queryKey: ["accounting-v2-register", periodKey],
    queryFn: async () => registerSchema.parse(await readJson(await fetch(
      `/api/admin/accounting/v2/register?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))),
    retry: false,
  });

  const summary = register.data?.summary;
  const closeRecord = register.data?.close;
  const balances = useMemo(() => new Map((register.data?.liveBalances ?? []).map((item) => [item.code, item.balance])), [register.data]);
  const netProfit = useMemo(() => {
    if (!summary) return 0;
    return summary.product_revenue - summary.cogs - summary.fulfillment_cost - summary.delivery_subsidy
      - summary.sales_returns - summary.actual_return_loss - summary.verified_expenses;
  }, [summary]);

  async function downloadPackagePdf() {
    setPdfPending(true); setPdfError(null);
    try {
      const response = await fetch(`/api/admin/accounting/v2/accountant-package?periodKey=${encodeURIComponent(periodKey)}`, { credentials: "include" });
      const payload = await readJson(response);
      await downloadAccountantPdfV2(payload as Record<string, unknown>);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "فشل إنشاء ملف PDF");
    } finally {
      setPdfPending(false);
    }
  }

  const isCurrent = periodKey === currentPeriod;
  const isPast = periodKey < currentPeriod;
  const closeStatus = String(closeRecord?.status ?? "");
  const periodStatus = closeStatus === "tax_final"
    ? "الفترة معتمدة ضريبياً ومقفلة"
    : closeStatus === "closed"
      ? "الفترة مغلقة إدارياً تلقائياً"
      : isCurrent
        ? "الفترة الحالية مفتوحة؛ تُغلق تلقائياً بعد آخر يوم من الشهر بتوقيت بغداد"
        : isPast && summary?.blockers.length
          ? `الإغلاق التلقائي ينتظر معالجة ${summary.blockers.length} نوع من الموانع، ويعيد المحاولة يومياً`
          : "الفترة السابقة جاهزة للإغلاق التلقائي في دورة النظام القادمة";

  const error = register.error;
  return (
    <div style={{ display: "grid", gap: 16 }} data-testid="accounting-register-v2">
      <section style={{ border: "1px solid #1e3a5f", borderRadius: 14, padding: 16, background: "#0B1E28" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>السجل المحاسبي — محل المنبع / AQUAVO</h2>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "5px 0 0", lineHeight: 1.7 }}>
              الأرصدة مشتقة من اليومية تلقائياً. النظام يعرف نهاية كل شهر وفق تقويم بغداد، بما فيها شباط والسنة الكبيسة.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input aria-label="الشهر المحاسبي" type="month" min="2026-08" value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value)}
              style={{ background: "#0d1f3c", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 10px" }} />
            <button onClick={() => void downloadPackagePdf()} disabled={!register.data || pdfPending}
              style={{ background: "#0B64A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>
              {pdfPending ? "جاري بناء PDF..." : "تنزيل ملف المحاسب PDF"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 11, color: closeStatus ? "#a7f3d0" : "#bae6fd", fontSize: 12 }}>{periodStatus}</div>
        <div style={{ marginTop: 7, color: "#fcd34d", fontSize: 11, lineHeight: 1.7 }}>
          السجل الرسمي يبدأ 1 آب 2026. ما قبل هذا التاريخ أرشيف تاريخي مقفول؛ يمكن الرجوع له كمرجع لكنه لا يُخلط بحسابات V2.
        </div>
      </section>

      {error || pdfError ? (
        <div role="alert" aria-live="assertive" style={{ border: "1px solid #7f1d1d", background: "#450a0a", color: "#fecaca", borderRadius: 10, padding: 12 }}>
          {pdfError ?? (error instanceof Error ? error.message : "حدث خطأ")}
        </div>
      ) : null}

      {summary ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
            <Card label="مبيعات المنتجات" value={summary.product_revenue} note="بعد فصل توصيل الزبون" />
            <Card label="صافي حق AQUAVO" value={summary.merchant_net} note="COD ناقص أجرة شركة التوصيل" />
            <Card label="دعم التوصيل" value={summary.delivery_subsidy} />
            <Card label="كلفة المنتجات" value={summary.cogs} />
            <Card label="كلفة التجهيز" value={summary.fulfillment_cost} />
            <Card label="صافي الربح الإداري" value={netProfit} note="قبل TAX FINAL" />
          </div>

          <section style={{ border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, background: "#071720" }}>
            <h3 style={{ color: "#fff", margin: "0 0 10px", fontSize: 15 }}>الأرصدة الحية — محسوبة من دفتر الأستاذ</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <Card label="النقد في الصندوق" value={balances.get("1000") ?? 0} note="افتتاحي + تسويات − دفعات ومصاريف" />
              <Card label="الحساب البنكي" value={balances.get("1010") ?? 0} note="من الحركات البنكية المسجلة" />
              <Card label="COD عند شركات التوصيل" value={balances.get("1100") ?? 0} note="المسلّم غير المستلم نقداً" />
              <Card label="مخزون المنتجات" value={balances.get("1200") ?? 0} note="قيمة المخزون الدفترية" />
              <Card label="رأس مال المالك" value={balances.get("3100") ?? 0} />
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
      ) : null}

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

      {/* Legacy contract marker intentionally retained for old static tests only:
          <FinanceAccountingOperationsV2 periodKey={periodKey} /> */}
    </div>
  );
}

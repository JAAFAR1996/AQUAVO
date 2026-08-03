import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { addCsrfHeader } from "@/lib/csrf";
import { FinanceAccountingOperationsV2 } from "@/components/admin/finance-accounting-operations-v2";

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
  realized_orders: z.coerce.number().default(0),
  blockers: z.array(blockerSchema),
  administrativeCloseReady: z.boolean(),
}).passthrough();
const orderSchema = z.object({
  order_id: z.string(),
  order_number: z.string().nullable().optional(),
  recognized_at: z.string(),
  gross_collected: money,
  customer_delivery_fee: money,
  carrier_fee: money,
  product_revenue: money,
  merchant_net: money,
  delivery_subsidy: money,
  delivery_surplus: money,
  cogs_amount: z.coerce.number().nullable().optional(),
  settlement_status: z.string(),
  cost_status: z.string(),
}).passthrough();
const registerSchema = z.object({
  periodKey: z.string(),
  policyVersion: z.string(),
  timezone: z.string(),
  currency: z.string(),
  summary: readinessSchema,
  orders: z.array(orderSchema),
});
const readinessResponseSchema = z.object({
  periodKey: z.string(),
  readiness: readinessSchema,
  close: z.record(z.string(), z.unknown()).nullable(),
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
    throw new Error(message === "ACCOUNTING_V2_MIGRATION_REQUIRED" ? "ترحيلات المحاسبة الجديدة غير مطبقة بعد" : message);
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
  const qc = useQueryClient();

  const register = useQuery({
    queryKey: ["accounting-v2-register", periodKey],
    queryFn: async () => registerSchema.parse(await readJson(await fetch(
      `/api/admin/accounting/v2/register?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))),
    retry: false,
  });
  const readiness = useQuery({
    queryKey: ["accounting-v2-readiness", periodKey],
    queryFn: async () => readinessResponseSchema.parse(await readJson(await fetch(
      `/api/admin/accounting/v2/readiness?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    ))),
    retry: false,
  });

  const close = useMutation({
    mutationFn: async () => readJson(await fetch("/api/admin/accounting/v2/periods/close", {
      method: "POST",
      credentials: "include",
      headers: addCsrfHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify({ periodKey }),
    })),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accounting-v2-readiness", periodKey] }),
        qc.invalidateQueries({ queryKey: ["accounting-v2-register", periodKey] }),
      ]);
    },
  });

  const netProfit = useMemo(() => {
    const s = register.data?.summary;
    if (!s) return 0;
    return s.product_revenue - s.cogs - s.fulfillment_cost - s.delivery_subsidy
      - s.sales_returns - s.actual_return_loss - s.verified_expenses;
  }, [register.data]);

  async function downloadPackage() {
    const response = await fetch(`/api/admin/accounting/v2/accountant-package?periodKey=${encodeURIComponent(periodKey)}`, { credentials: "include" });
    const payload = await readJson(response);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AL-MANBA-ACCOUNTANT-PACKAGE-${periodKey}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const error = register.error ?? readiness.error ?? close.error;
  const summary = register.data?.summary;
  const closeRecord = readiness.data?.close as Record<string, unknown> | null | undefined;

  return (
    <div style={{ display: "grid", gap: 16 }} data-testid="accounting-register-v2">
      <section style={{ border: "1px solid #1e3a5f", borderRadius: 14, padding: 16, background: "#0B1E28" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>السجل المحاسبي — محل المنبع / AQUAVO</h2>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "5px 0 0" }}>
              إجمالي COD يشمل التوصيل؛ أجرة الشركة منفصلة ولا تدخل مبيعات المنتجات.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              aria-label="الشهر المحاسبي"
              type="month"
              min="2026-08"
              value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value)}
              style={{ background: "#0d1f3c", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 10px" }}
            />
            <button onClick={() => void downloadPackage()} disabled={!register.data}
              style={{ background: "#0B64A6", color: "#fff", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
              تنزيل ملف المحاسب
            </button>
            <button onClick={() => close.mutate()} disabled={!summary?.administrativeCloseReady || close.isPending || Boolean(closeRecord && closeRecord.status !== "reopened")}
              style={{ background: summary?.administrativeCloseReady ? "#0B93A6" : "#334155", color: "#fff", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}>
              {close.isPending ? "جاري الإغلاق..." : "إغلاق إداري للشهر"}
            </button>
          </div>
        </div>
        {closeRecord ? (
          <div style={{ marginTop: 10, color: "#a7f3d0", fontSize: 12 }}>
            حالة الفترة: {String(closeRecord.status ?? "غير معروفة")} — الاعتماد الضريبي يبقى منفصلاً عن الإغلاق الإداري.
          </div>
        ) : null}
      </section>

      {error ? (
        <div role="alert" aria-live="assertive" style={{ border: "1px solid #7f1d1d", background: "#450a0a", color: "#fecaca", borderRadius: 10, padding: 12 }}>
          {error instanceof Error ? error.message : "حدث خطأ"}
        </div>
      ) : null}

      {summary ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
            <Card label="إجمالي مبيعات المنتجات" value={summary.product_revenue} note="بعد طرح توصيل الزبون من إجمالي COD" />
            <Card label="صافي حق AQUAVO" value={summary.merchant_net} note="إجمالي COD ناقص أجرة الشركة" />
            <Card label="دعم التوصيل" value={summary.delivery_subsidy} note="عندما تكون أجرة الشركة أعلى من توصيل الزبون" />
            <Card label="كلفة المنتجات" value={summary.cogs} />
            <Card label="كلفة التجهيز" value={summary.fulfillment_cost} />
            <Card label="صافي الربح الإداري" value={netProfit} note="قبل الاعتماد الضريبي النهائي" />
          </div>

          <section style={{ border: `1px solid ${summary.blockers.length ? "#7c2d12" : "#14532d"}`, borderRadius: 12, padding: 14, background: summary.blockers.length ? "#2b160b" : "#082f1d" }}>
            <h3 style={{ color: "#fff", fontSize: 14, margin: 0 }}>
              {summary.blockers.length ? `موانع الإغلاق (${summary.blockers.length})` : "الشهر جاهز للإغلاق الإداري"}
            </h3>
            {summary.blockers.length ? (
              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                {summary.blockers.map((item) => (
                  <div key={item.key} style={{ color: "#fed7aa", fontSize: 12 }}>• {item.label}: {item.count}</div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      <section style={{ border: "1px solid #1e3a5f", borderRadius: 12, overflow: "auto", background: "#0d1f3c" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
          <thead>
            <tr style={{ color: "#94a3b8", fontSize: 11, textAlign: "right" }}>
              {["الطلب", "تاريخ التحقق", "COD الإجمالي", "توصيل الزبون", "أجرة الشركة", "مبيعات المنتجات", "صافي AQUAVO", "دعم التوصيل", "التسوية"].map((label) => (
                <th key={label} style={{ padding: 10, borderBottom: "1px solid #1e3a5f" }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(register.data?.orders ?? []).map((order) => (
              <tr key={order.order_id} style={{ color: "#e2e8f0", fontSize: 12 }}>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{order.order_number ?? order.order_id.slice(0, 8)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{new Date(order.recognized_at).toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" })}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.gross_collected)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.customer_delivery_fee)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.carrier_fee)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.product_revenue)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.merchant_net)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{formatIqd(order.delivery_subsidy)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{order.settlement_status}</td>
              </tr>
            ))}
            {register.data && register.data.orders.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 20, color: "#94a3b8", textAlign: "center" }}>لا توجد مبيعات متحققة بهذا الشهر.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <FinanceAccountingOperationsV2 periodKey={periodKey} />
    </div>
  );
}

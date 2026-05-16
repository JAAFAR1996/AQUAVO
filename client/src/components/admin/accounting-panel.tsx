import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import {
  accountingCodSummarySchema,
  accountingCostHistoryResponseSchema,
  accountingOrdersResponseSchema,
  accountingProductsResponseSchema,
  accountingSummarySchema,
  type AccountingCodSummary,
  type AccountingCostHistoryEntry,
  type AccountingOrderProfit,
  type AccountingPeriod,
  type AccountingProductProfit,
  type AccountingSummary,
} from "@shared/accounting";

type Period = Extract<AccountingPeriod, "day" | "week" | "month" | "year">;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

async function fetchAccounting<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
  return schema.parse(json.data);
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "اليوم" },
  { value: "week",  label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "year",  label: "السنة" },
];

const BOX_SIZES = [
  { label: "صغير", value: 480 },
  { label: "وسط",  value: 800 },
  { label: "كبير", value: 880 },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:           { label: "انتظار",      color: "#ef4444" },
  confirmed:         { label: "مؤكد",        color: "#3b82f6" },
  processing:        { label: "تجهيز",       color: "#f59e0b" },
  shipped:           { label: "عند الشركة",  color: "#f97316" },
  delivered:         { label: "موصّل",       color: "#22c55e" },
  rejected:          { label: "مرفوض",       color: "#ef4444" },
  rejected_returned: { label: "رجع للبائع",  color: "#f97316" },
  rejected_carrier:  { label: "بقي بالشركة", color: "#dc2626" },
  returned:          { label: "مسترجع",      color: "#a855f7" },
  cancelled:         { label: "ملغي",        color: "#6b7280" },
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = "#199bb8", big = false,
}: {
  label: string; value: string; sub?: string; color?: string; big?: boolean;
}) {
  return (
    <div style={{
      background: "#0d1f3c",
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: "14px 18px",
    }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: big ? 22 : 18, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: "#199bb8", fontSize: 13, fontWeight: 700,
      borderBottom: "1px solid #199bb820", paddingBottom: 8, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccountingPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("month");
  const [showOrders, setShowOrders] = useState(false);
  const [editProduct, setEditProduct] = useState<AccountingProductProfit | null>(null);
  const [costs, setCosts] = useState({ costPrice: 0, packagingCost: 0, insertCost: 0 });
  const [newCostDate, setNewCostDate] = useState("");
  const [costHistory, setCostHistory] = useState<AccountingCostHistoryEntry[]>([]);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ carrier: "", amount: "", notes: "" });
  const [savingBox, setSavingBox] = useState<string | null>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: summary, isLoading: loadingSum, error: sumErr } = useQuery<AccountingSummary>({
    queryKey: ["acc-summary", period],
    queryFn: () => fetchAccounting(`/api/admin/accounting/summary?period=${period}`, accountingSummarySchema),
  });

  const { data: products = [], isLoading: loadingProds } = useQuery<AccountingProductProfit[]>({
    queryKey: ["acc-products", period],
    queryFn: () => fetchAccounting(`/api/admin/accounting/products?period=${period}`, accountingProductsResponseSchema),
  });

  const { data: codData } = useQuery<AccountingCodSummary>({
    queryKey: ["acc-cod"],
    queryFn: () => fetchAccounting("/api/admin/accounting/cod-summary", accountingCodSummarySchema),
  });

  const { data: orderRows = [], isLoading: loadingOrders } = useQuery<AccountingOrderProfit[]>({
    queryKey: ["acc-orders", period],
    queryFn: () => fetchAccounting(`/api/admin/accounting/orders?period=${period}`, accountingOrdersResponseSchema),
    enabled: showOrders,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const saveCosts = useMutation({
    mutationFn: async () => {
      if (!editProduct) return;
      const r = await fetch(`/api/admin/accounting/costs/${editProduct.productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify(costs),
      });
      if (!r.ok) throw new Error("فشل الحفظ");
    },
    onSuccess: () => {
      toast({ title: "تم حفظ التكاليف" });
      qc.invalidateQueries({ queryKey: ["acc-products"] });
      qc.invalidateQueries({ queryKey: ["acc-summary"] });
      qc.invalidateQueries({ queryKey: ["acc-orders"] });
      setEditProduct(null);
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  const createSettlement = useMutation({
    mutationFn: async () => {
      if (!settlementForm.carrier || !settlementForm.amount) throw new Error("بيانات ناقصة");
      const r = await fetch("/api/admin/accounting/settlements", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          carrier: settlementForm.carrier,
          amount: Number(settlementForm.amount),
          notes: settlementForm.notes || undefined,
        }),
      });
      if (!r.ok) throw new Error("فشل تسجيل الدفعة");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acc-cod"] });
      setShowSettlement(false);
      setSettlementForm({ carrier: "", amount: "", notes: "" });
      toast({ title: "تم تسجيل الدفعة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل تسجيل الدفعة", variant: "destructive" }),
  });

  const saveBoxCost = async (orderId: string, boxCost: number) => {
    setSavingBox(orderId);
    try {
      const r = await fetch(`/api/admin/accounting/orders/${orderId}/box-cost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify({ boxCost }),
      });
      if (!r.ok) throw new Error("فشل");
      await qc.invalidateQueries({ queryKey: ["acc-orders"] });
      await qc.invalidateQueries({ queryKey: ["acc-summary"] });
      toast({ title: `كارتونة ${BOX_SIZES.find(b => b.value === boxCost)?.label} — ${fmtNum(boxCost)} د.ع` });
    } catch {
      toast({ title: "خطأ في حفظ الكارتونة", variant: "destructive" });
    } finally {
      setSavingBox(null);
    }
  };

  const fetchCostHistory = async (productId: string) => {
    try {
      const r = await fetch(`/api/admin/accounting/cost-history/${productId}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.success) throw new Error(j?.message ?? "فشل");
      setCostHistory(accountingCostHistoryResponseSchema.parse(j.data));
    } catch (e) {
      toast({ title: "خطأ", description: errMsg(e), variant: "destructive" });
      setCostHistory([]);
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────────
  const marginColor = (m: number) => m >= 30 ? "#22c55e" : m >= 15 ? "#f59e0b" : "#ef4444";
  const missingCostCount = products.filter(p => !p.costsComplete).length;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ direction: "rtl", padding: 16, maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>محاسب AQUAVO</div>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: period === p.value ? "#199bb8" : "#0d1f3c",
                border: period === p.value ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
                color: period === p.value ? "#fff" : "#94a3b8",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {sumErr && (
        <div style={{ background: "#ef444415", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
          {errMsg(sumErr)}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          قسم ١: صحة العمل
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionTitle>صحة العمل — {PERIODS.find(p => p.value === period)?.label}</SectionTitle>
        {loadingSum ? (
          <div style={{ color: "#199bb8", textAlign: "center", padding: 24 }}>جاري التحميل...</div>
        ) : summary ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
              <KpiCard
                label="إيراد موصّل (طلبات وصلت فعلاً)"
                value={fmt(summary.totalRevenue)}
                color="#22c55e"
                big
              />
              <KpiCard
                label="صافي الربح"
                value={fmt(summary.netProfit)}
                sub={`بعد البضاعة والكارتونات والخصومات`}
                color={summary.netProfit >= 0 ? "#199bb8" : "#ef4444"}
                big
              />
              <KpiCard
                label="هامش الربح"
                value={`${summary.margin}%`}
                sub={summary.margin >= 30 ? "ممتاز" : summary.margin >= 15 ? "مقبول" : "منخفض — راجع التكاليف"}
                color={marginColor(summary.margin)}
                big
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <KpiCard label="طلبات موصّلة" value={String(summary.deliveredCount)} color="#22c55e" />
              <KpiCard label="طلبات ملغاة / مرفوضة" value={String(summary.cancelledCount)} color="#ef4444" />
              <KpiCard label="نسبة RTO (إرجاع)" value={`${summary.rtoRate}%`} color={summary.rtoRate > 20 ? "#ef4444" : "#f59e0b"} />
              <KpiCard label="متوسط قيمة الطلب" value={fmt(summary.aov)} color="#ffd700" />
            </div>
            {!summary.costsComplete && (
              <div style={{ marginTop: 10, background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 8, padding: "8px 14px", color: "#fcd34d", fontSize: 12 }}>
                تحذير: {summary.missingCostLines} منتج بدون سعر شراء — الأرباح محسوبة من البيانات المتوفرة فقط
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          قسم ٢: وين فلوسك هسّه — COD
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionTitle>وين فلوسك هسّه — شركة الشحن</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
          <KpiCard
            label="باقي عند الشركة (يجب تدفع لك)"
            value={fmt(codData?.totalPending ?? 0)}
            color="#ef4444"
            big
          />
          <KpiCard
            label="استلمت من الشركة"
            value={fmt(codData?.totalReceived ?? 0)}
            color="#22c55e"
            big
          />
          <KpiCard
            label="في الطريق (لسه ما وصل للزبون)"
            value={fmt(codData?.totalInTransit ?? 0)}
            color="#f97316"
            big
          />
        </div>

        {/* سجل الدفعات */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>دفعات مسجّلة من شركات الشحن</div>
          <button
            onClick={() => setShowSettlement(true)}
            style={{ padding: "5px 14px", borderRadius: 7, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            سجّل دفعة جديدة
          </button>
        </div>
        {(codData?.settlements ?? []).length > 0 ? (
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#010611" }}>
                  {["شركة الشحن", "المبلغ", "ملاحظات", "التاريخ"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "right", color: "#94a3b8", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codData!.settlements.map(s => (
                  <tr key={s.id} style={{ borderTop: "1px solid #1e3a5f20" }}>
                    <td style={{ padding: "9px 14px", color: "#fff", fontSize: 13 }}>{s.carrier}</td>
                    <td style={{ padding: "9px 14px", color: "#22c55e", fontSize: 13 }}>{fmt(s.amount)}</td>
                    <td style={{ padding: "9px 14px", color: "#94a3b8", fontSize: 12 }}>{s.notes ?? "—"}</td>
                    <td style={{ padding: "9px 14px", color: "#64748b", fontSize: 12 }}>
                      {new Date(s.createdAt).toLocaleDateString("ar-IQ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#64748b", fontSize: 12, padding: "8px 0" }}>لا توجد دفعات مسجّلة بعد</div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          قسم ٣: أفضل المنتجات ربحاً
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle>
            ربحية المنتجات
            {missingCostCount > 0 && (
              <span style={{ marginRight: 8, fontSize: 11, color: "#f59e0b", fontWeight: 400 }}>
                ({missingCostCount} بدون سعر شراء)
              </span>
            )}
          </SectionTitle>
        </div>
        {loadingProds ? (
          <div style={{ color: "#199bb8", textAlign: "center", padding: 20 }}>جاري التحميل...</div>
        ) : products.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: 20, fontSize: 13 }}>لا توجد مبيعات في هذه الفترة</div>
        ) : (
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#010611" }}>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "#94a3b8", fontSize: 11 }}>المنتج</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>مبيع</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>إيراد</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>تكلفة بضاعة</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>صافي ربح</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>هامش</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map(row => (
                  <tr key={row.productId} style={{ borderTop: "1px solid #1e3a5f20" }}>
                    <td style={{ padding: "10px 14px", color: "#fff", fontSize: 13, maxWidth: 200 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
                      {!row.costsComplete && (
                        <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>بدون سعر شراء</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{row.unitsSold}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#22c55e", fontSize: 13 }}>{fmt(row.revenue)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#ef4444", fontSize: 13 }}>{fmt(row.cogs)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, fontWeight: 700, color: row.netProfit >= 0 ? "#199bb8" : "#ef4444" }}>
                      {fmt(row.netProfit)}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: marginColor(row.margin) + "20",
                        color: marginColor(row.margin),
                      }}>
                        {row.margin}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <button
                        onClick={() => {
                          setEditProduct(row);
                          setCosts({ costPrice: row.costPrice, packagingCost: row.packagingCost, insertCost: row.insertCost });
                          fetchCostHistory(row.productId);
                        }}
                        style={{ background: "none", border: "1px solid #1e3a5f", borderRadius: 6, color: "#199bb8", cursor: "pointer", padding: "3px 10px", fontSize: 11 }}
                      >
                        <Pencil style={{ width: 11, height: 11, display: "inline", marginLeft: 3 }} />
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          قسم ٤: تفصيل الطلبات (قابل للطي)
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <button
          onClick={() => setShowOrders(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%",
            background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10,
            padding: "11px 16px", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}
        >
          {showOrders ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
          تفصيل الطلبات — ربح كل طلب على حدة
          {showOrders && orderRows.length > 0 && (
            <span style={{ marginRight: "auto", fontSize: 11, color: "#64748b" }}>
              {orderRows.length} طلب
            </span>
          )}
        </button>

        {showOrders && (
          <div style={{ marginTop: 8, background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 10, overflow: "hidden" }}>
            {loadingOrders ? (
              <div style={{ textAlign: "center", padding: 24, color: "#199bb8" }}>جاري التحميل...</div>
            ) : orderRows.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 }}>لا توجد طلبات في هذه الفترة</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#010611" }}>
                    {["الزبون والمنتجات", "الحالة", "إيراد", "تكلفة بضاعة", "كارتونة", "كوبون / نقاط", "صافي ربح", "هامش"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: h === "الزبون والمنتجات" ? "right" : "center", color: "#94a3b8", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map(row => (
                    <tr key={row.orderId} style={{ borderTop: "1px solid #1e3a5f20", verticalAlign: "top" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{row.customerName ?? "زبون"}</div>
                        {row.customerPhone && <div style={{ color: "#199bb8", fontSize: 11 }}>{row.customerPhone}</div>}
                        <div style={{ marginTop: 4 }}>
                          {row.items.map((item, i) => (
                            <div key={i} style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
                              <span style={{ color: "#199bb8", fontWeight: 700 }}>{item.qty}×</span> {item.name}
                            </div>
                          ))}
                        </div>
                        {row.orderNumber && <div style={{ fontSize: 10, color: "#334155", marginTop: 3, fontFamily: "monospace" }}>{row.orderNumber}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                          background: (STATUS_LABELS[row.status]?.color ?? "#6b7280") + "20",
                          color: STATUS_LABELS[row.status]?.color ?? "#6b7280",
                        }}>
                          {STATUS_LABELS[row.status]?.label ?? row.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", color: "#22c55e", fontSize: 12 }}>{fmt(row.revenue)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center", color: "#ef4444", fontSize: 12 }}>{fmt(row.cogs)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
                          {BOX_SIZES.map(box => {
                            const sel = row.boxCost === box.value;
                            const saving = savingBox === row.orderId;
                            return (
                              <button
                                key={box.value}
                                disabled={saving}
                                onClick={() => saveBoxCost(row.orderId, box.value)}
                                style={{
                                  padding: "2px 6px", borderRadius: 5, fontSize: 10, cursor: saving ? "wait" : "pointer",
                                  border: sel ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
                                  background: sel ? "#199bb820" : "#010611",
                                  color: sel ? "#199bb8" : "#64748b", fontWeight: sel ? 700 : 400,
                                }}
                              >
                                {box.label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, textAlign: "center", marginTop: 2, color: row.boxCost > 0 ? "#64748b" : "#ef4444" }}>
                          {row.boxCost > 0 ? fmtNum(row.boxCost) + " د.ع" : "اختر حجم"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", color: "#f59e0b", fontSize: 12 }}>
                        {(row.couponDiscount + row.loyaltyDiscount) > 0 ? fmt(row.couponDiscount + row.loyaltyDiscount) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, fontSize: 12, color: row.netProfit >= 0 ? "#199bb8" : "#ef4444" }}>
                        {fmt(row.netProfit)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{
                          padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: marginColor(row.margin) + "20",
                          color: marginColor(row.margin),
                        }}>
                          {row.margin}%
                        </span>
                        {!row.costsComplete && <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 2 }}>كلفة ناقصة</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ══ Settlement Dialog ══ */}
      {showSettlement && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 24, width: 360, maxWidth: "92vw" }} dir="rtl">
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>تسجيل دفعة من شركة الشحن</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                placeholder="اسم شركة الشحن"
                value={settlementForm.carrier}
                onChange={e => setSettlementForm(p => ({ ...p, carrier: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="المبلغ (د.ع)"
                value={settlementForm.amount}
                onChange={e => setSettlementForm(p => ({ ...p, amount: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
              />
              <input
                placeholder="ملاحظات (اختياري)"
                value={settlementForm.notes}
                onChange={e => setSettlementForm(p => ({ ...p, notes: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 7, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setShowSettlement(false)} style={{ padding: "7px 16px", borderRadius: 7, background: "#1e3a5f", color: "#94a3b8", border: "none", cursor: "pointer" }}>إلغاء</button>
              <button
                onClick={() => createSettlement.mutate()}
                disabled={createSettlement.isPending}
                style={{ padding: "7px 18px", borderRadius: 7, background: "#199bb8", color: "#fff", border: "none", cursor: createSettlement.isPending ? "wait" : "pointer", opacity: createSettlement.isPending ? 0.7 : 1, fontWeight: 600 }}
              >
                {createSettlement.isPending ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Cost Dialog ══ */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="bg-[#0a1628] border-[#199bb8]/30 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">{editProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">سعر الشراء — التكلفة النهائية للبضاعة (د.ع)</label>
              <Input
                type="number"
                value={costs.costPrice}
                onChange={e => setCosts(c => ({ ...c, costPrice: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">تكلفة التغليف لكل قطعة (د.ع)</label>
              <Input
                type="number"
                value={costs.packagingCost}
                onChange={e => setCosts(c => ({ ...c, packagingCost: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">كارت / مواد داخلية (د.ع)</label>
              <Input
                type="number"
                value={costs.insertCost}
                onChange={e => setCosts(c => ({ ...c, insertCost: Number(e.target.value) }))}
                className="bg-[#010611] border-[#199bb8]/40 text-white"
              />
            </div>
            <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 14 }}>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>تطبيق السعر من تاريخ محدد (اختياري):</div>
              <input
                type="date"
                value={newCostDate}
                onChange={e => setNewCostDate(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, background: "#010611", border: "1px solid #1e3a5f", color: "#fff", width: "100%", marginBottom: 8, fontSize: 12 }}
              />
              <button
                disabled={!newCostDate}
                onClick={async () => {
                  const productId = editProduct?.productId;
                  if (!productId || !newCostDate) return;
                  try {
                    const r = await fetch(`/api/admin/accounting/cost-history/${productId}`, {
                      method: "POST",
                      headers: addCsrfHeader({ "Content-Type": "application/json" }),
                      credentials: "include",
                      body: JSON.stringify({ ...costs, effectiveFrom: newCostDate }),
                    });
                    const j = await r.json().catch(() => null);
                    if (!r.ok || !j?.success) throw new Error(j?.message ?? "فشل");
                    await fetchCostHistory(productId);
                    qc.invalidateQueries({ queryKey: ["acc-products"] });
                    qc.invalidateQueries({ queryKey: ["acc-summary"] });
                    setNewCostDate("");
                    toast({ title: "تم حفظ السعر من التاريخ المحدد" });
                  } catch (e) {
                    toast({ title: "خطأ", description: errMsg(e), variant: "destructive" });
                  }
                }}
                style={{ padding: "5px 12px", borderRadius: 6, background: "#199bb8", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, opacity: newCostDate ? 1 : 0.4 }}
              >
                حفظ بتاريخ محدد
              </button>
              {costHistory.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>التاريخ السابق:</div>
                  {costHistory.slice(0, 5).map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #1e3a5f20" }}>
                      <span>{new Date(h.effectiveFrom).toLocaleDateString("ar-IQ")}</span>
                      <span>{h.costPrice} د.ع</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveCosts.mutate()} disabled={saveCosts.isPending} className="bg-[#199bb8] hover:bg-[#199bb8]/80">
              {saveCosts.isPending ? "جاري الحفظ..." : "حفظ التكاليف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

import type { ZodType } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  accountingSummarySchema,
  accountingCodSummarySchema,
  accountingInventorySchema,
  type AccountingPeriod,
  type AccountingSummary,
  type AccountingCodSummary,
  type AccountingInventory,
} from "@shared/accounting";

type Period = Extract<AccountingPeriod, "day" | "week" | "month" | "year">;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

async function fetchAccounting<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
  return schema.parse(json.data);
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

function KpiCard({
  label,
  value,
  sub,
  color = "#199bb8",
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        background: "#0d1f3c",
        border: "1px solid #199bb820",
        borderRadius: 12,
        padding: "14px 18px",
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {badge && (
          <span style={{
            background: "#ef444420",
            color: "#fca5a5",
            fontSize: 9,
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: 4,
            border: "1px solid #ef444440",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ color, fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {sub && (
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        color: "#199bb8",
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 10,
      }}
    >
      {title}
    </div>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#0d1f3c",
            border: "1px solid #199bb820",
            borderRadius: 12,
            padding: "14px 18px",
            height: 72,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#1a0d0d",
        border: "1px solid #ef444440",
        color: "#fca5a5",
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: 12,
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  );
}

export function FinanceOverview({ period }: { period: Period }) {
  const {
    data: summary,
    isLoading: loadingSummary,
    error: errorSummary,
  } = useQuery<AccountingSummary>({
    queryKey: ["accounting-summary", period],
    queryFn: () =>
      fetchAccounting(
        `/api/admin/accounting/summary?period=${period}`,
        accountingSummarySchema,
      ),
  });

  const {
    data: codData,
    isLoading: loadingCod,
    error: errorCod,
  } = useQuery<AccountingCodSummary>({
    queryKey: ["accounting-cod-summary"],
    queryFn: () =>
      fetchAccounting("/api/admin/accounting/cod-summary", accountingCodSummarySchema),
  });

  const {
    data: inventory,
    isLoading: loadingInv,
    error: errorInv,
  } = useQuery<AccountingInventory>({
    queryKey: ["accounting-inventory"],
    queryFn: () =>
      fetchAccounting("/api/admin/accounting/inventory", accountingInventorySchema),
  });

  return (
    <div>
      {/* Incomplete costs warning */}
      {summary && !summary.costsComplete && (
        <div
          style={{
            background: "#1a2a1a",
            border: "1px solid #ef444440",
            color: "#fca5a5",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          بعض المنتجات لا تحتوي على تكاليف — أرقام الربح قد تكون غير دقيقة
        </div>
      )}

      {/* Row 1 — Revenue & Orders */}
      <SectionHeader title="الإيراد والطلبيات" />
      {loadingSummary && <LoadingSkeleton />}
      {errorSummary && <ErrorBanner message={errMsg(errorSummary)} />}
      {summary && (
        <KpiGrid>
          <KpiCard
            label="الإيراد الصافي"
            badge={!summary.costsComplete ? "غير مكتمل" : undefined}
            value={fmt(summary.totalRevenue)}
          />
          <KpiCard label="الطلبيات" value={String(summary.totalOrders)} />
          <KpiCard label="الطلبيات الموصّلة" value={String(summary.deliveredCount)} />
          <KpiCard
            label="معدل الإرجاع (RTO)"
            value={`${summary.rtoRate}%`}
            color={summary.rtoRate > 20 ? "#ef4444" : "#199bb8"}
          />
        </KpiGrid>
      )}

      {/* Row 2 — Profit */}
      <SectionHeader title="الربحية" />
      {summary && (
        <KpiGrid>
          <KpiCard
            label="صافي الربح"
            value={summary.costsComplete ? fmt(summary.netProfit) : "غير مكتمل"}
            color={summary.costsComplete ? "#199bb8" : "#94a3b8"}
          />
          <KpiCard
            label="هامش الربح"
            value={summary.costsComplete ? `${summary.margin}%` : "غير مكتمل"}
            color={summary.costsComplete ? "#199bb8" : "#94a3b8"}
          />
          <KpiCard label="متوسط قيمة الطلبية (AOV)" value={fmt(summary.aov)} />
        </KpiGrid>
      )}

      {/* Row 3 — Returns */}
      <SectionHeader title="الراجعات المعتمدة" />
      {summary && (
        <>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
            تُحسب فقط الراجعات بحالة verified — {summary.verifiedReturnEvents} راجع معتمد
          </div>
          <KpiGrid>
            <KpiCard
              label="الربح قبل الراجعات"
              value={summary.costsComplete ? fmt(summary.netProfitBeforeReturns) : "غير مكتمل"}
              color={summary.costsComplete ? "#199bb8" : "#94a3b8"}
            />
            <KpiCard
              label="خسائر الراجعات المعتمدة"
              value={fmt(summary.totalReturnFinancialImpact)}
              color={summary.totalReturnFinancialImpact > 0 ? "#ef4444" : "#64748b"}
              sub={summary.verifiedReturnEvents > 0 ? `${summary.verifiedReturnEvents} راجع` : undefined}
            />
            <KpiCard
              label="الربح بعد الراجعات"
              value={summary.costsComplete ? fmt(summary.netProfitAfterReturns) : "غير مكتمل"}
              color={
                !summary.costsComplete ? "#94a3b8"
                  : summary.netProfitAfterReturns > 0 ? "#22c55e"
                  : summary.netProfitAfterReturns < 0 ? "#ef4444"
                  : "#64748b"
              }
            />
            <KpiCard
              label="الهامش بعد الراجعات"
              value={summary.costsComplete ? `${summary.marginAfterReturns}%` : "غير مكتمل"}
              color={
                !summary.costsComplete ? "#94a3b8"
                  : summary.marginAfterReturns >= 20 ? "#22c55e"
                  : summary.marginAfterReturns > 0 ? "#f59e0b"
                  : "#ef4444"
              }
            />
          </KpiGrid>
        </>
      )}

      {/* Row 4 — COD */}
      <SectionHeader title="الكاش عند التسليم (COD)" />
      {loadingCod && <LoadingSkeleton />}
      {errorCod && <ErrorBanner message={errMsg(errorCod)} />}
      {codData && (
        <KpiGrid>
          <KpiCard label="كاش بالطريق" value={fmt(codData.totalInTransit)} />
          <KpiCard
            label="كاش محصّل — لم يُستلم"
            value={fmt(codData.totalPending)}
            color={codData.totalPending > 0 ? "#f97316" : "#199bb8"}
          />
          <KpiCard
            label="إجمالي الكاش المستلم"
            value={fmt(codData.totalReceived)}
            color="#22c55e"
          />
        </KpiGrid>
      )}

      {/* Row 4 — Inventory */}
      <SectionHeader title="المخزون" />
      {loadingInv && <LoadingSkeleton />}
      {errorInv && <ErrorBanner message={errMsg(errorInv)} />}
      {inventory && (
        <KpiGrid>
          <KpiCard
            label="قيمة المخزون (بالكلفة)"
            value={
              inventory.productsWithCost > 0
                ? fmt(inventory.inventoryValueAtCost)
                : "غير مكتمل"
            }
            color={inventory.productsWithCost > 0 ? "#199bb8" : "#94a3b8"}
          />
          <KpiCard
            label="قيمة المخزون (بالبيع)"
            value={fmt(inventory.inventoryValueAtRetail)}
          />
          <KpiCard
            label="منتجات بدون كلفة"
            value={String(inventory.productsWithoutCost)}
            color={inventory.productsWithoutCost > 0 ? "#ef4444" : "#199bb8"}
          />
          <KpiCard
            label="منتجات انتهى مخزونها"
            value={String(inventory.outOfStockProducts)}
            color={inventory.outOfStockProducts > 0 ? "#ef4444" : "#199bb8"}
          />
          <KpiCard
            label="منتجات مخزون منخفض"
            value={String(inventory.lowStockProducts)}
            color={inventory.lowStockProducts > 0 ? "#f97316" : "#199bb8"}
          />
        </KpiGrid>
      )}
    </div>
  );
}

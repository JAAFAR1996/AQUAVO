import type { ZodType } from "zod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  accountingSummarySchema,
  accountingCodSummarySchema,
  accountingCodDetailsSchema,
  accountingReturnedOrdersSchema,
  accountingReturnMetricsSchema,
  accountingInventorySchema,
  whatsappInvoiceDrilldownSchema,
  type AccountingPeriod,
  type AccountingSummary,
  type AccountingCodSummary,
  type AccountingCodDetails,
  type AccountingReturnedOrders,
  type AccountingReturnMetrics,
  type AccountingInventory,
  type WhatsappInvoiceDrilldown,
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
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#0d1f3c",
        border: "1px solid #199bb820",
        borderRadius: 12,
        padding: "14px 18px",
        cursor: onClick ? "pointer" : undefined,
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
  const [showCodDetails, setShowCodDetails] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [showWaDetails, setShowWaDetails] = useState(false);

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
    data: returnMetrics,
    isLoading: loadingReturnMetrics,
  } = useQuery<AccountingReturnMetrics>({
    queryKey: ["accounting-return-metrics", period],
    queryFn: () =>
      fetchAccounting(`/api/admin/accounting/return-metrics?period=${period}`, accountingReturnMetricsSchema),
  });

  const {
    data: codDetails,
    isLoading: loadingCodDetails,
  } = useQuery<AccountingCodDetails>({
    queryKey: ["accounting-cod-details"],
    queryFn: () =>
      fetchAccounting("/api/admin/accounting/cod-details", accountingCodDetailsSchema),
    enabled: showCodDetails,
  });

  const {
    data: returnedOrders,
    isLoading: loadingReturns,
  } = useQuery<AccountingReturnedOrders>({
    queryKey: ["accounting-returned-orders"],
    queryFn: () =>
      fetchAccounting("/api/admin/accounting/returned-orders", accountingReturnedOrdersSchema),
    enabled: showReturns,
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

  const {
    data: waInvoices,
    isLoading: loadingWa,
  } = useQuery<WhatsappInvoiceDrilldown>({
    queryKey: ["accounting-whatsapp-invoices", period],
    queryFn: () =>
      fetchAccounting(
        `/api/admin/accounting/whatsapp-invoices?period=${period}`,
        whatsappInvoiceDrilldownSchema,
      ),
    enabled: showWaDetails,
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
      {(loadingSummary || loadingReturnMetrics) && !summary && <LoadingSkeleton />}
      {summary && (
        <>
          {/* Tooltip explanation */}
          <div style={{
            background: "#0d1f3c",
            border: "1px solid #199bb820",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 10,
            color: "#64748b",
            marginBottom: 10,
            lineHeight: 1.6,
          }}>
            معدل إرجاع الطلبات يحسب الطلبات الراجعة بالكامل خلال الفترة المحددة. معدل إرجاع المنتجات يحسب المنتجات الراجعة فعلياً (كل الوقت) حتى لو الطلب رجع جزئياً.
          </div>
          <KpiGrid>
            <KpiCard
              label="الإيراد الصافي"
              badge={!summary.costsComplete ? "غير مكتمل" : undefined}
              value={fmt(summary.totalRevenue)}
            />
            <KpiCard label="الطلبيات" value={String(summary.totalOrders)} />
            <KpiCard label="الطلبيات الموصّلة" value={String(summary.deliveredCount)} />
            <KpiCard
              label="معدل إرجاع الطلبات"
              value={returnMetrics ? `${returnMetrics.orderReturnRate}%` : `${summary.rtoRate}%`}
              sub={returnMetrics ? `${returnMetrics.periodReturnedOrdersCount} من ${returnMetrics.periodTotalOrdersCount} طلبية (الفترة)` : undefined}
              color={(returnMetrics?.orderReturnRate ?? summary.rtoRate) > 20 ? "#ef4444" : "#199bb8"}
            />
            <KpiCard
              label="معدل إرجاع المنتجات"
              value={returnMetrics
                ? returnMetrics.productReturnRate > 0
                  ? `${returnMetrics.productReturnRate}%`
                  : "0%"
                : "—"}
              sub={returnMetrics
                ? `${returnMetrics.returnedItemsAllTime} منتج مُرجَع / ${returnMetrics.totalSoldItemsAllTime} مُباع (كل الوقت)`
                : loadingReturnMetrics ? "جاري الحساب…" : undefined}
              color={returnMetrics && returnMetrics.productReturnRate > 0 ? "#f97316" : "#199bb8"}
            />
          </KpiGrid>
        </>
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

      {/* Row 2b — WhatsApp Invoices */}
      {summary && summary.whatsappInvoices.total > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700 }}>فواتير واتساب</div>
            <button
              onClick={() => setShowWaDetails((v) => !v)}
              style={{
                background: "#0d1f3c",
                border: "1px solid #199bb830",
                borderRadius: 6,
                color: "#94a3b8",
                fontSize: 11,
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              {showWaDetails ? "إخفاء" : "عرض التفاصيل"}
            </button>
          </div>
          <KpiGrid>
            <KpiCard
              label="فواتير واتساب مقبولة"
              value={String(summary.whatsappInvoices.accepted)}
              sub={`من أصل ${summary.whatsappInvoices.total} فاتورة`}
              color="#199bb8"
            />
            <KpiCard
              label="فواتير واتساب بانتظار التسليم"
              value={String(summary.whatsappInvoices.pendingDelivery)}
              color={summary.whatsappInvoices.pendingDelivery > 0 ? "#f59e0b" : "#64748b"}
            />
            <KpiCard
              label="فواتير واتساب محسوبة مالياً"
              value={String(summary.whatsappInvoices.delivered)}
              sub={summary.whatsappInvoices.delivered > 0 ? fmt(summary.whatsappInvoices.revenue) : undefined}
              color={summary.whatsappInvoices.delivered > 0 ? "#22c55e" : "#64748b"}
            />
            {summary.whatsappInvoices.delivered > 0 && (
              <KpiCard
                label="ربح فواتير واتساب"
                value={summary.whatsappInvoices.costsComplete ? fmt(summary.whatsappInvoices.profit) : "كلفة ناقصة"}
                badge={!summary.whatsappInvoices.costsComplete ? "غير مكتمل" : undefined}
                color={summary.whatsappInvoices.costsComplete ? "#199bb8" : "#94a3b8"}
              />
            )}
          </KpiGrid>

          {/* WhatsApp Drilldown */}
          {showWaDetails && (
            <div style={{ background: "#0a1628", border: "1px solid #199bb830", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: "#199bb8", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                تفاصيل فواتير واتساب
              </div>
              {loadingWa && <div style={{ color: "#64748b", fontSize: 11 }}>جاري التحميل…</div>}
              {waInvoices && waInvoices.invoices.length === 0 && (
                <div style={{ color: "#64748b", fontSize: 12 }}>لا توجد فواتير في هذه الفترة</div>
              )}
              {waInvoices && waInvoices.invoices.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "#64748b", borderBottom: "1px solid #1e3a5f" }}>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>رقم الفاتورة</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>الزبون</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>حالة الفاتورة</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>حالة الطلبية</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>المجموع</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>الربح</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>مدرجة مالياً</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>السبب</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waInvoices.invoices.map((inv) => (
                        <tr key={inv.invoiceId} style={{ borderBottom: "1px solid #1e3a5f10", color: "#cbd5e1" }}>
                          <td style={{ padding: "5px 8px" }}>{inv.invoiceNo}</td>
                          <td style={{ padding: "5px 8px" }}>{inv.customerName}</td>
                          <td style={{ padding: "5px 8px" }}>
                            <span style={{
                              background: inv.invoiceStatus === "confirmed" || inv.invoiceStatus === "completed"
                                ? "#22c55e20" : "#ef444420",
                              color: inv.invoiceStatus === "confirmed" || inv.invoiceStatus === "completed"
                                ? "#86efac" : "#fca5a5",
                              padding: "1px 6px", borderRadius: 4, fontSize: 10,
                            }}>
                              {inv.invoiceStatus}
                            </span>
                          </td>
                          <td style={{ padding: "5px 8px", color: "#94a3b8" }}>{inv.orderStatus ?? "—"}</td>
                          <td style={{ padding: "5px 8px" }}>{fmt(inv.total)}</td>
                          <td style={{ padding: "5px 8px", color: inv.costsComplete ? "#199bb8" : "#94a3b8" }}>
                            {inv.costsComplete ? fmt(inv.profit) : "كلفة ناقصة"}
                          </td>
                          <td style={{ padding: "5px 8px", color: inv.financiallyIncluded ? "#22c55e" : "#64748b" }}>
                            {inv.financiallyIncluded ? "✓ نعم" : "لا"}
                          </td>
                          <td style={{ padding: "5px 8px", color: "#64748b", fontSize: 10 }}>
                            {inv.exclusionReason ?? "—"}
                          </td>
                          <td style={{ padding: "5px 8px" }}>{new Date(inv.createdAt).toLocaleDateString("ar-IQ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Row 3 — Returns */}
      <SectionHeader title="الراجعات المعتمدة" />
      {summary && (
        <>
          {summary.totalReturnEvents > summary.verifiedReturnEvents && (
            <div style={{
              background: "#1a1500",
              border: "1px solid #f59e0b60",
              color: "#fcd34d",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 10,
            }}>
              تنبيه: {summary.totalReturnEvents - summary.verifiedReturnEvents} راجع مسجّل بانتظار التعميد — لا تدخل في الأرقام المالية حتى تكون بحالة "verified". اذهب لتاب "الراجعات والخسائر" لتعميدها.
            </div>
          )}
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
              label="خصم تسوية راجعات"
              value={fmt(summary.salesReturnDeduction)}
              color={summary.salesReturnDeduction > 0 ? "#f97316" : "#64748b"}
              sub="عكس إيراد — ليس خسارة منتج"
            />
            <KpiCard
              label="خسائر راجعات فعلية"
              value={fmt(summary.actualReturnLoss)}
              color={summary.actualReturnLoss > 0 ? "#ef4444" : "#64748b"}
              sub={summary.nonSellableReturnedCount > 0 ? `${summary.nonSellableReturnedCount} غير قابل للبيع` : undefined}
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
        <>
          <KpiGrid>
            <KpiCard label="كاش بالطريق" value={fmt(codData.totalInTransit)} />
            <KpiCard
              label="مبالغ بانتظار التسوية"
              value={codData.totalPending > 0 ? fmt(codData.totalPending) : "لا توجد مبالغ بانتظار التسوية"}
              color={codData.totalPending > 0 ? "#f97316" : "#64748b"}
              sub="اضغط لعرض التفاصيل"
              onClick={() => setShowCodDetails((v) => !v)}
            />
            <KpiCard
              label="إجمالي الكاش المستلم"
              value={fmt(codData.totalReceived)}
              color="#22c55e"
            />
          </KpiGrid>

          {/* COD Drilldown */}
          {showCodDetails && (
            <div style={{ background: "#0a1628", border: "1px solid #199bb830", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: "#199bb8", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                تفاصيل الطلبيات المسلّمة
              </div>
              {/* 4-line settlement breakdown */}
              <div style={{ fontSize: 11, marginBottom: 14, lineHeight: 2, borderBottom: "1px solid #1e3a5f", paddingBottom: 10 }}>
                <div style={{ color: "#94a3b8" }}>
                  صافي الطلبات المسلّمة:{" "}
                  <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{fmt(codData.totalDelivered)}</span>
                </div>
                <div style={{ color: "#94a3b8" }}>
                  الكاش المستلم:{" "}
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>− {fmt(codData.totalReceived)}</span>
                </div>
                {codData.approvedReturnDeductions > 0 && (
                  <div style={{ color: "#94a3b8" }}>
                    خصومات الراجعات المعتمدة:{" "}
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>− {fmt(codData.approvedReturnDeductions)}</span>
                  </div>
                )}
                <div style={{ color: "#94a3b8", borderTop: "1px solid #1e3a5f", paddingTop: 4, marginTop: 2 }}>
                  المتبقي بانتظار التسوية:{" "}
                  <span style={{ color: codData.totalPending > 0 ? "#f97316" : "#22c55e", fontWeight: 700 }}>
                    {codData.totalPending > 0 ? fmt(codData.totalPending) : "صفر — تمت التسوية الكاملة ✓"}
                  </span>
                </div>
              </div>
              {loadingCodDetails && (
                <div style={{ color: "#64748b", fontSize: 11 }}>جاري التحميل…</div>
              )}
              {codDetails && codDetails.deliveredOrders.length === 0 && (
                <div style={{ color: "#64748b", fontSize: 11 }}>لا توجد طلبيات مسلّمة</div>
              )}
              {codDetails && codDetails.deliveredOrders.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "#64748b", borderBottom: "1px solid #1e3a5f" }}>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>رقم الطلب</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>الزبون</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>المجموع</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>التوصيل</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>المحصّل</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>الصافي</th>
                        {codDetails.approvedReturnDeductions > 0 && (
                          <th style={{ textAlign: "right", padding: "6px 8px" }}>خصم إرجاع</th>
                        )}
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>حالة الدفع</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>الشركة</th>
                        <th style={{ textAlign: "right", padding: "6px 8px" }}>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codDetails.deliveredOrders.map((o) => (
                        <tr key={o.orderId} style={{ borderBottom: "1px solid #1e3a5f10", color: "#cbd5e1" }}>
                          <td style={{ padding: "5px 8px" }}>{o.orderNumber ?? o.orderId.slice(0, 8)}</td>
                          <td style={{ padding: "5px 8px" }}>{o.customerName ?? "—"}</td>
                          <td style={{ padding: "5px 8px" }}>{fmt(o.orderTotal)}</td>
                          <td style={{ padding: "5px 8px" }}>{fmt(o.shippingCost)}</td>
                          <td style={{ padding: "5px 8px" }}>{fmt(o.collectedAmount)}</td>
                          <td style={{ padding: "5px 8px", color: "#f97316", fontWeight: 600 }}>{fmt(o.netAmount)}</td>
                          {codDetails.approvedReturnDeductions > 0 && (
                            <td style={{ padding: "5px 8px", color: o.returnDeduction > 0 ? "#ef4444" : "#64748b" }}>
                              {o.returnDeduction > 0 ? `− ${fmt(o.returnDeduction)}` : "—"}
                            </td>
                          )}
                          <td style={{ padding: "5px 8px" }}>{o.paymentStatus ?? "—"}</td>
                          <td style={{ padding: "5px 8px" }}>{o.carrier ?? "—"}</td>
                          <td style={{ padding: "5px 8px" }}>{new Date(o.createdAt).toLocaleDateString("ar-IQ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Row 5 — Returned Orders */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700 }}>المرتجعات</div>
        <button
          onClick={() => setShowReturns((v) => !v)}
          style={{
            background: "#0d1f3c",
            border: "1px solid #199bb830",
            borderRadius: 6,
            color: "#94a3b8",
            fontSize: 11,
            padding: "3px 10px",
            cursor: "pointer",
          }}
        >
          {showReturns ? "إخفاء" : "عرض"}
        </button>
      </div>
      {showReturns && (
        <div style={{ background: "#0a1628", border: "1px solid #199bb830", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          {loadingReturns && <div style={{ color: "#64748b", fontSize: 11 }}>جاري التحميل…</div>}
          {returnedOrders && returnedOrders.totalCount === 0 && (
            <div style={{ color: "#64748b", fontSize: 12 }}>لا توجد مرتجعات مسجلة</div>
          )}
          {returnedOrders && returnedOrders.totalCount > 0 && (
            <>
              <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 10 }}>
                {returnedOrders.totalCount} طلبية مُرجَعة
                {returnedOrders.totalRefundAmount > 0 && ` | إجمالي المبالغ المستردة: ${fmt(returnedOrders.totalRefundAmount)}`}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#64748b", borderBottom: "1px solid #1e3a5f" }}>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>رقم الطلب</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>الزبون</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>المجموع</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>الحالة</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>حدث مرتجع معتمد</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>المبلغ المسترد</th>
                      <th style={{ textAlign: "right", padding: "6px 8px" }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnedOrders.orders.map((o) => (
                      <tr key={o.orderId} style={{ borderBottom: "1px solid #1e3a5f10", color: "#cbd5e1" }}>
                        <td style={{ padding: "5px 8px" }}>{o.orderNumber ?? o.orderId.slice(0, 8)}</td>
                        <td style={{ padding: "5px 8px" }}>{o.customerName ?? "—"}</td>
                        <td style={{ padding: "5px 8px" }}>{fmt(o.orderTotal)}</td>
                        <td style={{ padding: "5px 8px" }}>
                          <span style={{
                            background: "#ef444420",
                            color: "#fca5a5",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                          }}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td style={{ padding: "5px 8px", color: o.hasVerifiedReturnEvent ? "#22c55e" : "#f59e0b" }}>
                          {o.hasVerifiedReturnEvent ? "✓ نعم" : "⚠ لا — سجّل حدث إرجاع"}
                        </td>
                        <td style={{ padding: "5px 8px", color: o.refundAmount > 0 ? "#ef4444" : "#64748b" }}>
                          {o.refundAmount > 0 ? fmt(o.refundAmount) : "—"}
                        </td>
                        <td style={{ padding: "5px 8px" }}>{new Date(o.createdAt).toLocaleDateString("ar-IQ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ color: "#64748b", fontSize: 10, marginTop: 10 }}>
                  * الطلبيات بدون حدث إرجاع معتمد لا تؤثر في حسابات الأرباح ومعدل الإرجاع. أضف حدث إرجاع من تبويب "return-events" لتسجيل التأثير المالي.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Row 6 — Inventory */}
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

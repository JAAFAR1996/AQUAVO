import { useQuery } from "@tanstack/react-query";

interface ReturnEvent {
  id: string;
  orderId: string;
  orderNumber: string | null;
  orderStatus: string | null;
  type: string;
  reason: string | null;
  refundAmount: number;
  deliveryCostLoss: number;
  returnShippingCost: number;
  packagingLoss: number;
  packagingClassificationLoss: number;
  packagingClassificationComplete: boolean;
  productWriteOffAmount: number;
  cogsLoss: number;
  restocked: boolean;
  restockedAt: string | null;
  status: "recorded" | "verified" | "disputed";
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReturnSummary {
  totalEvents: number;
  recordedEvents: number;
  verifiedEvents: number;
  disputedEvents: number;
  totalFinancialImpactVerified: number;
  packagingClassificationTotal: number;
}
interface ApiResponse {
  success: boolean;
  data: ReturnEvent[];
  summary: ReturnSummary;
  message?: string;
}

const fmtIqd = (value: number) => `${Math.round(Number(value || 0)).toLocaleString("en-US")} د.ع`;
const fmtDate = (value: string | null) => value
  ? new Date(value).toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" })
  : "—";

const typeLabels: Record<string, string> = {
  rejected_delivery: "رفض عند التوصيل",
  failed_delivery: "فشل التوصيل",
  customer_return: "إرجاع من الزبون",
  cancelled_before_shipping: "إلغاء قبل الشحن",
  cancelled_after_shipping: "إلغاء بعد الشحن",
  damaged_return: "راجع تالف",
  partial_return: "إرجاع جزئي",
  lost_package: "طرد ضائع",
};
const statusLabels: Record<string, string> = {
  recorded: "الطرد بعده خارج AQUAVO",
  verified: "اكتمل تلقائياً",
  disputed: "مستبعد",
};

function Kpi({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14 }}>
      <div style={{ color: "#94a3b8", fontSize: 11 }}>{label}</div>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 5 }}>{value}</div>
      {note ? <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{note}</div> : null}
    </div>
  );
}

export function FinanceAutomaticReturnsV2() {
  const query = useQuery<ApiResponse>({
    queryKey: ["return-events-automatic-v2"],
    queryFn: async () => {
      const response = await fetch("/api/admin/accounting/return-events?period=all", { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success !== true) throw new Error(data?.message || "فشل تحميل سجل الراجعات");
      return data as ApiResponse;
    },
    retry: false,
    staleTime: 30_000,
  });

  const items = query.data?.data ?? [];
  const summary = query.data?.summary;

  return (
    <div style={{ display: "grid", gap: 14 }} data-testid="automatic-returns-v2">
      <section style={{ background: "#15110b", border: "1px solid #6b4a16", borderRadius: 12, padding: 14 }}>
        <h2 style={{ color: "#fff", fontSize: 17, margin: 0 }}>الراجعات والخسائر — سجل تلقائي</h2>
        <p style={{ color: "#f3d9a5", fontSize: 12, lineHeight: 1.8, margin: "7px 0 0" }}>
          ماكو إنشاء راجع من صفحة المالية. «رفض الاستلام» ينشئ السجل، و«استلمت من الشركة»
          يرجع المنتجات للمخزون ويكمل الحدث تلقائياً. النظام يصنّف الكارتونة التالفة فقط؛
          الملصق وكارت الشكر ما ينحسبن خسارة ثانية، وأي اقتطاع ناقل يحتاج كشف الشركة ولا يُخمن.
        </p>
      </section>

      {query.error ? (
        <div role="alert" style={{ background: "#450a0a", color: "#fecaca", borderRadius: 10, padding: 12 }}>
          {query.error instanceof Error ? query.error.message : "حدث خطأ"}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <Kpi label="إجمالي الأحداث" value={summary?.totalEvents ?? 0} />
        <Kpi label="اكتملت تلقائياً" value={summary?.verifiedEvents ?? 0} />
        <Kpi label="الطرد بعده خارج AQUAVO" value={summary?.recordedEvents ?? 0} />
        <Kpi label="الأثر المالي الإضافي" value={fmtIqd(summary?.totalFinancialImpactVerified ?? 0)} note="لا يشمل إعادة تصنيف الكراتين" />
        <Kpi label="كراتين راجعة مصنفة" value={fmtIqd(summary?.packagingClassificationTotal ?? 0)} note="للعرض والتدقيق؛ لا تُخصم مرتين" />
      </div>

      <section style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
          <thead>
            <tr style={{ color: "#94a3b8", fontSize: 11, textAlign: "right" }}>
              {["الطلب", "النوع", "حالة الأتمتة", "المخزون", "رد المبلغ", "كارتونة تالفة", "خسائر إضافية", "آخر تحديث", "الملاحظة"].map((label) => (
                <th key={label} style={{ padding: 10, borderBottom: "1px solid #1e3a5f" }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const additiveLoss = item.deliveryCostLoss + item.returnShippingCost + item.packagingLoss
                + item.productWriteOffAmount + (item.restocked ? 0 : item.cogsLoss);
              return (
                <tr key={item.id} style={{ color: "#e2e8f0", fontSize: 12 }}>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{item.orderNumber ?? item.orderId.slice(0, 8)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{typeLabels[item.type] ?? item.type}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{statusLabels[item.status] ?? item.status}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{item.restocked ? `رجع فعلياً ${fmtDate(item.restockedAt)}` : "بعده خارج AQUAVO"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{fmtIqd(item.refundAmount)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>
                    {item.packagingClassificationComplete ? fmtIqd(item.packagingClassificationLoss) : "الكلفة غير مكتملة"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{fmtIqd(additiveLoss)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554" }}>{fmtDate(item.updatedAt)}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #172554", whiteSpace: "normal", minWidth: 280 }}>{item.note ?? "—"}</td>
                </tr>
              );
            })}
            {!query.isLoading && items.length === 0 ? (
              <tr><td colSpan={9} style={{ color: "#94a3b8", padding: 24, textAlign: "center" }}>لا توجد راجعات مسجلة.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

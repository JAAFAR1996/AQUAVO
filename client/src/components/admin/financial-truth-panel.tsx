import { useQuery } from "@tanstack/react-query";
import { financialTruthSchema, type FinancialTruth } from "@shared/financial-truth";

const money = (value: number | null) => value == null ? "غير متوفر" : `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} د.ع`;
export function FinancialTruthPanel({ periodKey, data, compact = false }: {
  periodKey?: string; data?: FinancialTruth; compact?: boolean;
}) {
  const query = useQuery({
    queryKey: ["financial-truth", periodKey ?? "current"], enabled: !data,
    queryFn: async () => {
      const response = await fetch(`/api/admin/accounting/v2/truth${periodKey ? `?periodKey=${encodeURIComponent(periodKey)}` : ""}`,
        { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("تعذر التحقق من مصدر الحسابات؛ لا تعتمد رقما نهائيا حتى يعود التحقق.");
      return financialTruthSchema.parse(await response.json());
    }, retry: false, staleTime: 30_000, refetchInterval: 60_000,
  });
  if (!data && query.isError) return <section role="alert" className="rounded-xl border border-destructive bg-card p-4 text-foreground" data-testid="financial-truth-unavailable">
    تعذر تحديث التحقق المالي. لا تعني البيانات غير المتوفرة أن الرصيد أو المخالفات صفر.
    <button className="mr-3 underline" onClick={() => void query.refetch()}>إعادة التحقق</button>
  </section>;
  const truth = data ?? query.data;
  if (!truth) return <div role="status" className="rounded-xl border p-4 text-muted-foreground">جاري التحقق من مصادر الحسابات…</div>;
  const currentIssues = truth.issues.filter(issue => issue.scope !== "historical");
  const status = truth.status === "checks_clear" ? "الفحوص الداخلية متطابقة — ليست تدقيقا مستقلا"
    : truth.status === "historical" ? "أرشيف تاريخي — لا يعامل كربح نهائي" : "الحسابات تحتاج مطابقة قبل الاعتماد النهائي";
  return <section dir="rtl" data-testid="financial-truth-panel" className="my-4 min-w-0 rounded-xl border border-border bg-card p-4 text-foreground">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h2 className="text-base font-bold">حالة توثيق الأرقام</h2><p className="mt-1 text-sm font-medium">{status}</p></div>
      <p className="text-xs text-muted-foreground">شهر التقرير: {truth.periodKey}<br />آخر تحقق: {new Date(truth.generatedAt).toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" })}</p>
    </div>
    <p className="mt-3 text-sm leading-7">{truth.notice}</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{truth.profit.label}</p><p className="mt-1 font-bold">{money(truth.profit.displayIqd)}</p></div>
      <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">فرق تقييم المخزون الحالي</p><p className="mt-1 font-bold">{money(truth.inventory.differenceIqd)}</p><p className="text-xs text-muted-foreground">فرق تقييم، وليس إثبات نقص بضاعة</p></div>
      <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">طلبات تحتاج ربط تسوية — كل الفترات</p><p className="mt-1 font-bold">{truth.settlements.count}</p><p className="text-xs text-muted-foreground">قد تكون مبالغها مستلمة بالفعل؛ لا تسجلها مرتين</p></div>
    </div>
    <details className="mt-3" open={compact ? undefined : true}>
      <summary className="cursor-pointer text-sm font-semibold">المصادر والفروق وخطوات المطابقة ({currentIssues.length})</summary>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">المخزون الموجود {money(truth.inventory.onHandIqd)} + بضاعة الطلبات غير المحققة {money(truth.inventory.inTransitIqd)} − الرصيد الدفتري {money(truth.inventory.ledgerIqd)}. هذه أرصدة حالية، وليست جردا تاريخيا للشهر المختار.</p>
      <p className="text-xs leading-6 text-muted-foreground">أصناف برصيد وكلفة ناقصة: {truth.inventory.missingStockedCosts}. منتجات بلا رصيد ولا سعر مكتمل: {truth.inventory.emptyCatalogDrafts}؛ لا يعامل نقص بياناتها كخسارة مخزون.</p>
      <div className="mt-2 grid gap-2">{currentIssues.map(issue => <div key={issue.key} className="rounded-lg border p-3 text-sm">
        <strong>{issue.label}: {issue.count}{issue.amountIqd != null ? ` — ${money(issue.amountIqd)}` : ""}</strong>
        <span className="mr-2 text-xs text-muted-foreground">{issue.scope === "period" ? "الفترة المختارة" : "الوضع الحالي"}</span>
        <p className="mt-1 text-xs leading-6">{issue.nextStep}</p>
      </div>)}</div>
      {truth.historicalMissingCostLines > 0 ? <p className="mt-3 text-sm">الأرشيف قبل النظام الجديد: {truth.historicalMissingCostLines} بندا بلا لقطة كلفة دقيقة. لا يدخل هذا العدد تلقائيا ضمن نقص كلفة الشهر الحالي.</p> : null}
      {truth.settlements.orders.length > 0 ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[470px] text-right text-xs">
        <caption className="mb-2 text-right">قائمة المطابقة — صافي الطلب المسجل ليس مطالبة قبض جديدة</caption>
        <thead><tr><th className="p-2">الطلب</th><th>الفترة</th><th>علامة القبض المسجلة</th><th>صافي الطلب المسجل</th></tr></thead>
        <tbody>{truth.settlements.orders.map(order => <tr className="border-t" key={order.orderId}><td className="p-2">{order.orderNumber}</td><td>{order.periodKey ?? "غير محددة"}</td><td>{order.recordedReceived ? "معلّم مستلم — يحتاج ربط المستند" : "غير مؤكد"}</td><td>{money(order.recordedNetIqd)}</td></tr>)}</tbody>
      </table>{truth.settlements.truncated ? <p>هذه أول {truth.settlements.orders.length} حالة من {truth.settlements.count}.</p> : null}</div> : null}
    </details>
  </section>;
}

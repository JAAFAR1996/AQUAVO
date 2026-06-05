import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  accountingReportSchema,
  accountingProductProfitFullResponseSchema,
  type AccountingReport,
  type AccountingProductProfitFull,
} from "@shared/accounting";
import type { ZodType } from "zod";

type Period = "day" | "week" | "month" | "year";

async function fetchAccounting<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
  return schema.parse(json.data);
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

type Priority = "high" | "medium" | "low";
type RiskLevel = "high" | "medium" | "low";

interface Recommendation {
  id: string;
  priority: Priority;
  riskLevel: RiskLevel;
  type: string;
  label: string;
  subject: string;
  reason: string;
  action: string;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "خطر عالي",
  medium: "خطر متوسط",
  low: "خطر منخفض",
};

const RISK_COLOR: Record<RiskLevel, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

function buildRecommendations(
  products: AccountingProductProfitFull[],
  report: AccountingReport,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const expensesTotal = report.summary.expensesTotal;

  // ── 8. Missing expenses warning ────────────────────────────────────────────
  if (expensesTotal === 0) {
    recs.push({
      id: "warn-no-expenses",
      priority: "high",
      riskLevel: "high",
      type: "تحذير بيانات",
      label: "المصاريف غير مدخلة",
      subject: "عام",
      reason: `لا توجد مصاريف مسجلة للفترة الحالية. صافي الربح المعروض (${fmt(report.summary.finalNetProfit)}) لا يعكس التكاليف التشغيلية مثل الإيجار والرواتب والتسويق.`,
      action: "أدخل المصاريف في تبويب المصاريف لتحصل على صافي ربح دقيق.",
    });
  }

  // ── 7. Missing cost data warnings ─────────────────────────────────────────
  const missingCostProducts = products.filter(
    (p) => !p.comingSoon && !p.costsComplete,
  );
  if (missingCostProducts.length > 0) {
    for (const p of missingCostProducts.slice(0, 5)) {
      recs.push({
        id: `missing-cost-${p.productId}`,
        priority: "high",
        riskLevel: "high",
        type: "بيانات ناقصة",
        label: "البيانات غير مكتملة",
        subject: p.name,
        reason: `كلفة هذا المنتج غير مدخلة (سعر الشراء = ${fmt(p.costPrice)}). أي ربح يظهر عليه غير موثوق.`,
        action: "أدخل تكلفة الشراء والتغليف والإدراج لهذا المنتج من تبويب تدقيق الكلف.",
      });
    }
    if (missingCostProducts.length > 5) {
      recs.push({
        id: "missing-cost-bulk",
        priority: "high",
        riskLevel: "high",
        type: "بيانات ناقصة",
        label: "البيانات غير مكتملة",
        subject: `${missingCostProducts.length} منتج`,
        reason: `${missingCostProducts.length} منتج بدون كلفة مدخلة. أرقام الربحية الإجمالية غير دقيقة.`,
        action: "راجع تبويب تدقيق الكلف وأدخل الكلف المفقودة.",
      });
    }
  }

  // ── Per-product recommendations ────────────────────────────────────────────
  for (const p of products) {
    if (p.comingSoon) continue;

    // ── 6. Out of stock ──────────────────────────────────────────────────────
    if (p.stock === 0) {
      const hasSales = p.unitsSold > 0;
      recs.push({
        id: `out-of-stock-${p.productId}`,
        priority: hasSales ? "high" : "medium",
        riskLevel: hasSales ? "high" : "medium",
        type: "تحذير مخزون",
        label: "نفد المخزون",
        subject: p.name,
        reason: hasSales
          ? `نفد المخزون بينما المنتج حقق ${p.unitsSold} وحدة مباعة وإيراد ${fmt(p.revenue)} في هذه الفترة. فرصة مبيعات ضائعة.`
          : `المخزون صفر ولا توجد مبيعات في هذه الفترة.`,
        action: hasSales
          ? "أعِد الطلب فوراً — المنتج يبيع وتضيع فرص."
          : "قيّم إذا كان هذا المنتج يستحق إعادة الطلب بناءً على الطلب التاريخي.",
      });
      // Do NOT continue — out-of-stock products may still have verified return events
    }

    // ── 5. Low stock warning ─────────────────────────────────────────────────
    if (p.stock > 0 && p.stock <= 3) {
      recs.push({
        id: `low-stock-${p.productId}`,
        priority: p.unitsSold > 0 ? "high" : "medium",
        riskLevel: "medium",
        type: "تحذير مخزون",
        label: "مخزون منخفض",
        subject: p.name,
        reason: `المخزون ${p.stock} ${p.stock === 1 ? "وحدة فقط" : "وحدات فقط"}${p.unitsSold > 0 ? `، وقد بيع منه ${p.unitsSold} وحدة في هذه الفترة` : ""}.`,
        action: "لا تسوي حملة إعلانية قوية. أعِد الطلب قبل أي ترويج.",
      });
    }

    // ── 4. Return risk ───────────────────────────────────────────────────────
    if (p.returnedQty > 0 && p.returnFinancialImpact > 0) {
      const priority: Priority = p.returnFinancialImpact > 20000 ? "high" : "medium";
      recs.push({
        id: `return-risk-${p.productId}`,
        priority,
        riskLevel: priority,
        type: "خطر راجعات",
        label: "راجع يحتاج متابعة",
        subject: p.name,
        reason: `رُجعت ${p.returnedQty} وحدة بخسارة مالية ${fmt(p.returnFinancialImpact)}. معدل الإرجاع ${pct(p.returnRate)} من المبيعات. الربح الصافي المعدّل: ${fmt(p.adjustedNetProfit)}.`,
        action: "راجع سبب الإرجاع. إذا تكرر، راجع جودة التغليف أو وصف المنتج.",
      });
    }

    // Skip stock/margin/ads checks for out-of-stock products
    if (p.stock === 0) continue;

    // ── 3. Weak margin ───────────────────────────────────────────────────────
    if (
      p.costsComplete &&
      !p.comingSoon &&
      p.unitsSold > 0 &&
      p.adjustedMargin < 20 &&
      p.adjustedMargin >= 0
    ) {
      recs.push({
        id: `weak-margin-${p.productId}`,
        priority: p.adjustedMargin < 10 ? "high" : "medium",
        riskLevel: p.adjustedMargin < 10 ? "high" : "medium",
        type: "هامش ضعيف",
        label: "هامشه ضعيف",
        subject: p.name,
        reason: `الهامش الإجمالي ${pct(p.grossMargin)} والهامش بعد الراجعات ${pct(p.adjustedMargin)}. كلفة الوحدة ${fmt(p.costPrice)} مقابل سعر بيع ${fmt(p.salePrice)}. الربح الإجمالي ${fmt(p.grossProfit)} على ${p.unitsSold} وحدة.`,
        action: "لا تعلن عنه وحده في حملة مدفوعة. فكر في رفع السعر أو تجميعه مع منتج آخر.",
      });
    }

    // ── 2. Not suitable for ads alone ───────────────────────────────────────
    // Low price + weak margin + return risk could eat profit
    if (
      p.costsComplete &&
      !p.comingSoon &&
      p.salePrice < 10000 &&
      p.adjustedMargin < 25 &&
      p.stock > 0
    ) {
      recs.push({
        id: `no-ads-alone-${p.productId}`,
        priority: "medium",
        riskLevel: "medium",
        type: "توصية إعلانية",
        label: "لا يصلح للإعلان وحده",
        subject: p.name,
        reason: `سعر المنتج ${fmt(p.salePrice)} منخفض، والهامش بعد الراجعات ${pct(p.adjustedMargin)}. تكلفة التوصيل (5,000 د.ع) تأكل جزءاً كبيراً من الربح إذا أُعلن منفرداً.`,
        action: "جمّعه مع منتج آخر لرفع متوسط قيمة الطلبية، أو استخدمه كمنتج إضافي في الطلبيات الكبيرة.",
      });
    }

    // ── 1. Suitable to promote ───────────────────────────────────────────────
    if (
      p.costsComplete &&
      !p.comingSoon &&
      p.stock > 3 &&
      p.adjustedMargin >= 20 &&
      p.returnRate === 0 &&
      p.adjustedNetProfit > 0
    ) {
      const priority: Priority = p.adjustedMargin >= 40 ? "low" : "low";
      recs.push({
        id: `promote-${p.productId}`,
        priority,
        riskLevel: "low",
        type: "فرصة ترويج",
        label: "مناسب للترويج",
        subject: p.name,
        reason: `هامشه بعد الراجعات ${pct(p.adjustedMargin)}، المخزون ${p.stock} وحدة، لا توجد راجعات. ربح صافي معدّل ${fmt(p.adjustedNetProfit)} على ${p.unitsSold > 0 ? `${p.unitsSold} وحدة مباعة` : "لا مبيعات بعد"}.`,
        action: `روّج هذا المنتج بهدوء: هامشه ${pct(p.adjustedMargin)} والمخزون كافٍ (${p.stock} وحدة) ولا توجد راجعات.`,
      });
    }
  }

  // Sort: high priority first, then medium, then low
  const ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div
      style={{
        background: "#0d1f3c",
        border: `1px solid ${PRIORITY_COLOR[rec.priority]}30`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 12,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {/* Priority badge */}
        <span
          style={{
            background: `${PRIORITY_COLOR[rec.priority]}20`,
            color: PRIORITY_COLOR[rec.priority],
            border: `1px solid ${PRIORITY_COLOR[rec.priority]}50`,
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 5,
          }}
        >
          أولوية {PRIORITY_LABEL[rec.priority]}
        </span>
        {/* Type badge */}
        <span
          style={{
            background: "#1e3a5f",
            color: "#94a3b8",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 5,
          }}
        >
          {rec.type}
        </span>
        {/* Label */}
        <span
          style={{
            color: "#199bb8",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {rec.label}
        </span>
        {/* Risk level — far right */}
        <span
          style={{
            marginRight: "auto",
            background: `${RISK_COLOR[rec.riskLevel]}15`,
            color: RISK_COLOR[rec.riskLevel],
            border: `1px solid ${RISK_COLOR[rec.riskLevel]}40`,
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 5,
          }}
        >
          {RISK_LABEL[rec.riskLevel]}
        </span>
      </div>

      {/* Subject */}
      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
        {rec.subject}
      </div>

      {/* Reason — the numbers */}
      <div
        style={{
          background: "#010611",
          border: "1px solid #1e3a5f",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "#94a3b8",
          lineHeight: 1.7,
          marginBottom: 10,
        }}
      >
        <span style={{ color: "#64748b", fontSize: 10, fontWeight: 600 }}>السبب: </span>
        {rec.reason}
      </div>

      {/* Suggested action */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 12,
          color: "#199bb8",
        }}
      >
        <span style={{ color: "#199bb8", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
          الإجراء المقترح:
        </span>
        <span style={{ color: "#cbd5e1" }}>{rec.action}</span>
      </div>
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

function LoadingSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#0d1f3c",
            border: "1px solid #1e3a5f",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 12,
            height: 120,
            opacity: 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function FinanceRecommendations({ period }: { period: Period }) {
  const {
    data: report,
    isLoading: loadingReport,
    error: errorReport,
  } = useQuery({
    queryKey: ["accounting-report", period],
    queryFn: () =>
      fetchAccounting(`/api/admin/accounting/report?period=${period}`, accountingReportSchema),
  });

  const {
    data: products,
    isLoading: loadingProducts,
    error: errorProducts,
  } = useQuery({
    queryKey: ["accounting-products-full", period],
    queryFn: () =>
      fetchAccounting(
        `/api/admin/accounting/products?period=${period}`,
        accountingProductProfitFullResponseSchema,
      ),
    select: (data): AccountingProductProfitFull[] =>
      data.map((p) => ({
        ...p,
        overridden: p.overridden ?? false,
        overrideReason: p.overrideReason ?? null,
      })),
  });

  const recommendations = useMemo(() => {
    if (!products || !report) return [];
    return buildRecommendations(products, report);
  }, [products, report]);

  const isLoading = loadingReport || loadingProducts;
  const hasError = errorReport || errorProducts;

  const highCount = recommendations.filter((r) => r.priority === "high").length;
  const medCount = recommendations.filter((r) => r.priority === "medium").length;
  const lowCount = recommendations.filter((r) => r.priority === "low").length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div style={{ color: "#199bb8", fontSize: 14, fontWeight: 700 }}>
            التوصيات المالية الذكية
          </div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
            بناءً على البيانات الفعلية — القراءة فقط، لا تطبيق تلقائي
          </div>
        </div>
        {!isLoading && !hasError && recommendations.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {highCount > 0 && (
              <span
                style={{
                  background: "#ef444420",
                  color: "#fca5a5",
                  border: "1px solid #ef444440",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 6,
                }}
              >
                {highCount} عالية الأولوية
              </span>
            )}
            {medCount > 0 && (
              <span
                style={{
                  background: "#f59e0b20",
                  color: "#fcd34d",
                  border: "1px solid #f59e0b40",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 6,
                }}
              >
                {medCount} متوسطة
              </span>
            )}
            {lowCount > 0 && (
              <span
                style={{
                  background: "#22c55e20",
                  color: "#86efac",
                  border: "1px solid #22c55e40",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 6,
                }}
              >
                {lowCount} منخفضة
              </span>
            )}
          </div>
        )}
      </div>

      {/* States */}
      {isLoading && <LoadingSkeleton />}
      {hasError && (
        <ErrorBanner
          message={
            hasError instanceof Error ? hasError.message : "خطأ في تحميل البيانات"
          }
        />
      )}

      {!isLoading && !hasError && recommendations.length === 0 && (
        <div
          style={{
            background: "#0d1f3c",
            border: "1px solid #1e3a5f",
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          لا توجد توصيات حالياً — البيانات مكتملة ولا توجد مشكلات مرصودة.
        </div>
      )}

      {/* High priority section */}
      {!isLoading && !hasError && highCount > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              color: "#ef4444",
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            — عالية الأولوية ({highCount})
          </div>
          {recommendations
            .filter((r) => r.priority === "high")
            .map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
        </div>
      )}

      {/* Medium priority section */}
      {!isLoading && !hasError && medCount > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              color: "#f59e0b",
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            — متوسطة الأولوية ({medCount})
          </div>
          {recommendations
            .filter((r) => r.priority === "medium")
            .map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
        </div>
      )}

      {/* Low priority section */}
      {!isLoading && !hasError && lowCount > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              color: "#22c55e",
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            — فرص ومنخفضة الأولوية ({lowCount})
          </div>
          {recommendations
            .filter((r) => r.priority === "low")
            .map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
        </div>
      )}
    </div>
  );
}

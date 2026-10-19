import { z } from "zod";

export const truthIssueSchema = z.object({
  key: z.string(), label: z.string(), scope: z.enum(["period", "current", "historical"]),
  count: z.number().int().nonnegative(), amountIqd: z.number().finite().nullable(),
  nextStep: z.string(),
});
export const financialTruthSchema = z.object({
  version: z.literal("financial-truth-v1"), generatedAt: z.string(), periodKey: z.string(),
  currency: z.literal("IQD"), timezone: z.literal("Asia/Baghdad"), cutoverAt: z.string(),
  engineConfigured: z.boolean(), independentlyAudited: z.literal(false),
  status: z.enum(["needs_review", "checks_clear", "historical"]),
  issues: z.array(truthIssueSchema),
  profit: z.object({ recordedIqd: z.number().finite().nullable(), displayIqd: z.number().finite().nullable(),
    componentsComplete: z.boolean(), label: z.string(), formula: z.string() }),
  inventory: z.object({ onHandIqd: z.number().finite(), inTransitIqd: z.number().finite(),
    ledgerIqd: z.number().finite(), differenceIqd: z.number().finite(),
    missingStockedCosts: z.number().int().nonnegative(), emptyCatalogDrafts: z.number().int().nonnegative() }),
  settlements: z.object({ count: z.number().int().nonnegative(), recordedNetIqd: z.number().finite().nullable(),
    scope: z.literal("all_open_orders"), truncated: z.boolean(),
    orders: z.array(z.object({ orderId: z.string(), orderNumber: z.string(), periodKey: z.string().nullable(),
      recordedReceived: z.boolean(), recordedNetIqd: z.number().finite().nullable(), reason: z.string() })) }),
  historicalMissingCostLines: z.number().int().nonnegative(),
  notice: z.string(),
});
export type FinancialTruth = z.infer<typeof financialTruthSchema>;
export type TruthRow = Record<string, unknown>;

/** Missing/invalid money is an error, never a fabricated zero. */
export function requiredFinancialNumber(value: unknown, field: string): number {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") {
    throw new Error(`FINANCIAL_SOURCE_MISSING:${field}`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`FINANCIAL_SOURCE_INVALID:${field}`);
  return parsed;
}
const nullableNumber = (v: unknown, key: string) => v == null ? null : requiredFinancialNumber(v, key);
const periodChecks: Record<string, string> = {
  incomplete_cost_orders: "طلبات بكلفة غير مكتملة", missing_fulfillment_orders: "طلبات بلا كلفة تجهيز مثبتة",
  incomplete_fulfillment_orders: "طلبات بتجهيز غير مكتمل الكلفة", payment_evidence_errors: "دليل دفع يحتاج مراجعة",
  unsettled_carrier_orders: "طلبات الفترة تحتاج مطابقة تسوية", unverified_returns: "راجعات غير معتمدة",
  undocumented_expenses: "مصاريف تنتظر التوثيق", procurement_integrity_failures: "عدم تطابق المشتريات والدفتر",
  settlement_integrity_failures: "عدم تطابق مستندات التسوية", delivery_surplus_exceptions: "فرق توصيل يحتاج تفسير",
};
const globalReadinessChecks = new Set(["procurement_integrity_failures", "settlement_integrity_failures"]);
const profitInputs = ["product_revenue", "rounding_adjustment", "cogs", "fulfillment_cost", "delivery_subsidy",
  "sales_returns", "actual_return_loss", "verified_expenses", "fx_net_expense"] as const;

export function buildFinancialTruth(input: {
  readiness: TruthRow; period: TruthRow | null; inventory: TruthRow; costCoverage: TruthRow;
  settlementSummary: TruthRow; settlements: TruthRow[]; periodKey: string;
}): FinancialTruth {
  const { readiness: r, period: p, inventory: inv, costCoverage: coverage } = input;
  const number = requiredFinancialNumber;
  const count = (v: unknown, key: string) => { const n = number(v, key); if (!Number.isInteger(n) || n < 0) throw new Error(`FINANCIAL_COUNT_INVALID:${key}`); return n; };
  const issues: FinancialTruth["issues"] = [];
  const add = (key: string, label: string, scope: FinancialTruth["issues"][number]["scope"], count: number,
    nextStep: string, amountIqd: number | null = null) => {
    if (count > 0) issues.push({ key, label, scope, count, amountIqd, nextStep });
  };
  const engineConfigured = r.inventory_ledger_mode === "enforce" && r.payment_ledger_enabled === "true"
    && r.snapshot_writer_enabled === "true";
  if (!engineConfigured) add("engine_not_configured", "إعدادات محرك المحاسبة غير مكتملة", "current", 1, "راجع إعدادات دفتر المخزون والدفع واللقطات قبل الاعتماد على الربح.");
  if (p) for (const [key, label] of Object.entries(periodChecks)) {
    add(key, label, globalReadinessChecks.has(key) ? "current" : "period", count(p[key], key), "طابق السجل مع مستنده الأصلي؛ لا تغيّر المبلغ لمجرد إزالة التنبيه.");
  }
  const differenceIqd = number(inv.difference_iqd, "difference_iqd");
  const missingStockedCosts = number(coverage.missing_stocked_costs, "missing_stocked_costs");
  const globalQueue = number(input.settlementSummary.affected_orders, "affected_orders");
  add("inventory_valuation_difference", "فرق بين تقييم المخزون والرصيد الدفتري", "current",
    Math.abs(differenceIqd) > 0.000001 ? 1 : 0, "راجع حركات المخزون وكلفة الوحدة والقيد المقابل. هذا فرق تقييم وليس إثبات نقص بضاعة.", differenceIqd);
  add("inventory_cost_incomplete", "أصناف لها رصيد وكلفتها غير مثبتة", "current", missingStockedCosts, "أرفق تكلفة هذه الأصناف؛ المنتجات بلا رصيد موضحة بشكل منفصل.");
  add("unrealized_cost_incomplete", "كلفة بضاعة طلبات غير محققة ناقصة", "current", number(inv.missing_unrealized_costs, "missing_unrealized_costs"), "راجع لقطة تكلفة البنود المصروفة لهذه الطلبات.");
  add("settlements_global", "طلبات غير مطابقة لتسوية عبر كل الفترات", "current", globalQueue,
    "طابق كشف شركة التوصيل مع وصل القبض. قد يكون المبلغ مستلما فعلا لكن الربط ناقص؛ لا تسجل قبضا مرة ثانية.");
  add("open_review_flags", "إشارات مراجعة محاسبية مفتوحة", "current", number(r.open_review_flags, "open_review_flags"), "راجع السبب والمستند قبل إغلاق إشارة المراجعة.");
  if (p) {
    const periodDifference = number(p.journal_difference, "period_journal_difference");
    add("period_journal_difference", "عدم توازن يومية الفترة", "period", Math.abs(periodDifference) > 0.000001 ? 1 : 0, "راجع قيود الفترة؛ توازن المجموع العام لا يلغي فرق فترة منفردة.", periodDifference);
  }
  const journalDifference = number(r.journal_difference, "journal_difference");
  add("journal_difference", "عدم توازن اليومية", "current", Math.abs(journalDifference) > 0.000001 ? 1 : 0, "راجع القيود؛ لا تنشئ قيدا تعويضيا بلا مستند.", journalDifference);
  if (p) add("inventory_quantity_difference", "فرق كميات المخزون", "current", number(p.inventory_mismatches, "inventory_mismatches"), "طابق الكميات مع دفتر الحركات والجرد.");
  const historicalMissingCostLines = number(r.legacy_realized_lines_without_exact_cost, "historical_cost_lines");
  add("historical_cost_incomplete", "بنود تاريخية بلا لقطة كلفة دقيقة", "historical", historicalMissingCostLines,
    "تظل الأرباح التاريخية تقديرية؛ لا تستخدم تكلفة اليوم كأنها تكلفة مثبتة وقت البيع.");
  const componentsComplete = p !== null && engineConfigured && ["incomplete_cost_orders", "missing_fulfillment_orders",
    "incomplete_fulfillment_orders", "payment_evidence_errors", "unverified_returns", "undocumented_expenses",
    "procurement_integrity_failures", "settlement_integrity_failures", "journal_difference"].every(key => number(p[key], key) === 0);
  const amounts = p ? profitInputs.map(key => number(p[key], key)) : null;
  const recordedIqd = amounts ? amounts[0] + amounts[1] - amounts.slice(2).reduce((sum, amount) => sum + amount, 0) : null;
  const periodClear = !issues.some(issue => issue.scope !== "historical");
  const status: FinancialTruth["status"] = !p ? "historical" : periodClear ? "checks_clear" : "needs_review";
  return financialTruthSchema.parse({
    version: "financial-truth-v1", generatedAt: new Date(String(r.checked_at)).toISOString(), periodKey: input.periodKey,
    cutoverAt: new Date(String(r.cutover_at)).toISOString(), currency: "IQD", timezone: "Asia/Baghdad",
    engineConfigured, independentlyAudited: false, status, issues,
    profit: { recordedIqd, displayIqd: componentsComplete ? recordedIqd : null, componentsComplete,
      label: componentsComplete ? "ربح دفتري حسب السجلات، غير معتمد نهائيا" : "الربح غير مكتمل — لا يعرض كرقم نهائي",
      formula: "مبيعات المنتجات + التقريب − كلفة البضاعة − التجهيز − دعم التوصيل − مردودات البيع − خسائر الراجعات − المصاريف الموثقة − فروقات العملة" },
    inventory: { onHandIqd: number(inv.on_hand_inventory_iqd, "on_hand_inventory_iqd"),
      inTransitIqd: number(inv.unrealized_order_inventory_iqd, "unrealized_order_inventory_iqd"),
      ledgerIqd: number(inv.gl_inventory_iqd, "gl_inventory_iqd"), differenceIqd, missingStockedCosts,
      emptyCatalogDrafts: number(coverage.empty_catalog_drafts, "empty_catalog_drafts") },
    settlements: { count: globalQueue, scope: "all_open_orders", truncated: globalQueue > input.settlements.length,
      recordedNetIqd: nullableNumber(input.settlementSummary.recorded_net_iqd, "recorded_net_iqd"),
      orders: input.settlements.map(row => ({ orderId: String(row.order_id), orderNumber: String(row.order_number ?? row.order_id),
        periodKey: row.period_key == null ? null : String(row.period_key), recordedReceived: row.cod_received === true,
        recordedNetIqd: nullableNumber(row.merchant_net, "merchant_net"), reason: String(row.reconciliation_reason) })) },
    historicalMissingCostLines,
    notice: "الربح ليس نقدا متاحا للسحب. اجتياز الفحوص الداخلية لا يثبت الجرد أو القبض خارج النظام ولا يمثل تدقيقا محاسبيا مستقلا. الفروق الحالية منفصلة عن شهر التقرير والأرشيف.",
  });
}

/** PostgreSQL readiness includes some global reconciliation subqueries. */
export function currentFinancialCloseBlockers(truth: Pick<FinancialTruth, "issues">): Record<string, number> {
  return Object.fromEntries(truth.issues
    .filter(issue => issue.scope === "current" && issue.key !== "settlements_global")
    .map(issue => [issue.key, issue.count]));
}

/** Unmatched receipts belonging to another month are warnings, not this month's blocker. */
export function financialPeriodChecksClear(truth: FinancialTruth): boolean {
  return truth.status !== "historical" && truth.profit.componentsComplete
    && !truth.issues.some(issue => issue.scope !== "historical" && issue.key !== "settlements_global");
}

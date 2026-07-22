import Groq from "groq-sdk";
import { getDb } from "../db.js";

// Finance-only Groq client — reads FINANCE_GROQ_API_KEY, never falls back to GROQ_API_KEY
function financeGroqHasKey(): boolean {
  return !!(process.env.FINANCE_GROQ_API_KEY?.trim());
}

function getFinanceGroqClient(): Groq {
  const key = process.env.FINANCE_GROQ_API_KEY?.trim();
  if (!key) throw new Error("FINANCE_GROQ_API_KEY غير مُعدّ. أضفه إلى ملف .env لتشغيل التدقيق.");
  return new Groq({ apiKey: key });
}
import {
  orders,
  products,
  shippingSettlements,
  orderReturnEvents,
  expenses,
} from "../../shared/schema.js";
import { count, isNull } from "drizzle-orm";
import { z } from "zod";
// ── Canonical accounting engine + primitives ────────────────────────────────
// Every number the AI auditor reads MUST come from the same engine the
// accounting page reads, otherwise the audit would police a second, divergent
// set of books. This file previously re-implemented collected-amount, the
// delivered filter, COGS and the return-loss split locally.
import {
  buildCostResolver,
  calcOrderProfit,
  collectProductIds,
  computePeriodFinancials,
  eventSalesReturnDeduction,
  getRealizedOrdersForPeriod,
} from "./accounting-engine.js";
import {
  orderCollectedAmount,
  toMoney,
  toMoneyOrNull,
} from "../../shared/order-financials.js";

// ─── Snapshot ────────────────────────────────────────────────────────────────

export interface FinanceSnapshot {
  generatedAt: string;
  scope: "all_time";            // snapshot always covers full history, not a period
  // Revenue
  grossRevenue: number;         // sum(collectedAmount) for delivered orders
  netRevenue: number;           // sum(collectedAmount - shippingCost) for delivered
  // Costs & profit (approximate: uses current product cost, not historical)
  totalCogs: number;
  grossProfit: number;
  expensesTotal: number;
  returnLossVerified: number;
  /** grossProfit (before expenses and before return losses) */
  profitBeforeExpensesAndReturns: number;
  /** grossProfit - expensesTotal (after expenses, BEFORE subtracting return losses) */
  profitAfterExpensesBeforeReturns: number;
  /** finalNetProfit = profitAfterExpensesBeforeReturns - salesReturnDeduction - actualReturnLoss */
  finalNetProfit: number;
  cogsBasis: "approximate_current_cost" | "unavailable";
  // COD settlement
  deliveredNetTotal: number;
  receivedCashTotal: number;
  approvedReturnDeductions: number;
  pendingSettlement: number;
  // Returns
  verifiedReturnEventsCount: number;
  recordedReturnEventsCount: number;
  returnedOrdersCount: number;
  returnedProductsCount: number;
  refundAmount: number;
  /** Revenue reversal: sum(refundAmount) for verified events — reduces netProfitAfterReturns but is NOT a product loss */
  salesReturnDeduction: number;
  /** Operational + non-recoverable product costs for verified events — restocked products do not contribute cogsLoss here */
  actualReturnLoss: number;
  totalReturnFinancialImpact: number;
  // Inventory
  inventoryValueAtCost: number;
  lowStockCount: number;
  outOfStockCount: number;
  // Data quality
  costsComplete: boolean;
  missingCostLines: number;
  // System capabilities
  hasCodDrilldown: boolean;
  hasReturnEvents: boolean;
  // Warnings from the system
  notes: Array<{ type: "warning" | "info"; message: string }>;
}

// ─── Invariant checks ────────────────────────────────────────────────────────

export interface InvariantCheck {
  name: string;
  passed: boolean;
  expected?: number | null;
  actual?: number | null;
  note?: string;
}

// ─── Audit report schema (Zod validates Groq output) ─────────────────────────

const findingSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.enum([
    "settlement",
    "returns",
    "profit",
    "inventory",
    "payment",
    "duplicate_counting",
    "missing_drilldown",
    "suspicious_number",
  ]),
  title: z.string(),
  explanation: z.string(),
  affectedOrders: z.array(z.string()),
  expectedValue: z.number().nullable(),
  actualValue: z.number().nullable(),
  difference: z.number().nullable(),
  suggestedFix: z.string(),
  requiresHumanApproval: z.literal(true),
});

export const auditReportSchema = z.object({
  overallStatus: z.enum(["ok", "warning", "critical"]),
  summary: z.string(),
  findings: z.array(findingSchema),
});

export type AuditFinding = z.infer<typeof findingSchema>;
export type AuditReport = z.infer<typeof auditReportSchema>;

export interface FinanceAuditResult {
  snapshot: FinanceSnapshot;
  invariantChecks: InvariantCheck[];
  report: AuditReport | null;
  error?: string;
  generatedAt: string;
}

// ─── In-memory cache (no DB table needed for now) ────────────────────────────

let lastAuditResult: FinanceAuditResult | null = null;

export function getLastAuditResult(): FinanceAuditResult | null {
  return lastAuditResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// `toNum` is the local alias for the canonical money coercion. Cost EVIDENCE
// must use toMoneyOrNull instead — an unknown cost is never 0 here.
const toNum = toMoney;

/** @deprecated Superseded by shared/order-financials.orderCollectedAmount.
 *  Kept for the gated deletion phase; no live caller. */
function collectedAmount(order: { roundedTotal?: unknown; total: unknown }): number {
  if (order.roundedTotal != null) return toNum(order.roundedTotal);
  return Math.round(toNum(order.total) / 250) * 250;
}
void collectedAmount;

/** @deprecated Superseded by accounting-engine.calcOrderProfit().revenue
 *  (collected − shipping). Kept for the gated deletion phase; no live caller. */
function netAmount(order: { roundedTotal?: unknown; total: unknown; shippingCost: unknown }): number {
  return collectedAmount(order) - toNum(order.shippingCost);
}
void netAmount;

/** Full-history range — the snapshot's scope is always `all_time`. */
const ALL_TIME_START = new Date(0);

// ─── Snapshot builder ────────────────────────────────────────────────────────

export async function buildFinanceSnapshot(): Promise<FinanceSnapshot> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  const [allOrders, settlements, returnEvents, expenseRows, activeProducts, deliveredOrders, fin] =
    await Promise.all([
      db.select().from(orders),
      db.select().from(shippingSettlements),
      db.select().from(orderReturnEvents),
      db.select().from(expenses),
      db.select().from(products).where(isNull(products.deletedAt)),
      // Canonical realized-order filter (REALIZED_STATUSES + financiallyCounted override).
      getRealizedOrdersForPeriod(db, ALL_TIME_START, now),
      // Canonical P&L for the same (all-time) window — the SAME numbers the
      // accounting page shows, so the auditor cannot police a different ledger.
      computePeriodFinancials(db, ALL_TIME_START, now),
    ]);

  // Collected (before shipping deduction) via the ONE collected-amount definition.
  const grossRevenue = Math.round(
    deliveredOrders.reduce((s, o) => s + orderCollectedAmount(o), 0)
  );
  // Net (collected − shipping) — identical to calcOrderProfit().revenue summed,
  // which is exactly what computePeriodFinancials reports as `revenue`.
  const deliveredNetTotal = fin.revenue;
  const netRevenue = deliveredNetTotal;

  // COD settlement
  const receivedCashTotal = Math.round(settlements.reduce((s, e) => s + toNum(e.amount), 0));
  const deliveredIds = new Set(deliveredOrders.map(o => o.id));
  const verifiedEvents = returnEvents.filter(e => e.status === "verified");
  const recordedEvents = returnEvents.filter(e => e.status === "recorded");
  // COD settlement deduction — canonical refund rule, restricted to realized
  // orders because only those were ever billed to the carrier.
  const approvedReturnDeductions = Math.round(
    verifiedEvents
      .filter(e => deliveredIds.has(e.orderId))
      .reduce((s, e) => s + eventSalesReturnDeduction(e), 0)
  );
  const pendingSettlement = Math.max(0, deliveredNetTotal - receivedCashTotal - approvedReturnDeductions);

  // Return losses (verified only) — split: revenue reversal vs actual loss.
  // Both come from computePeriodFinancials, which applies the canonical
  // eventSalesReturnDeduction / eventActualReturnLoss rules (restocked product
  // COGS is recovered to inventory, never counted as P&L loss).
  const salesReturnDeduction = fin.salesReturnDeduction;
  const actualReturnLoss = fin.actualReturnLoss;
  const totalReturnFinancialImpact = salesReturnDeduction + actualReturnLoss;
  const refundAmount = salesReturnDeduction;

  // Return counts
  const RETURN_STATUSES = [
    "cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned", "refunded",
  ];
  const returnedOrdersCount = allOrders.filter(o =>
    RETURN_STATUSES.includes(o.status ?? "")
  ).length;

  let returnedProductsCount = 0;
  for (const ev of verifiedEvents) {
    if (Array.isArray(ev.affectedItems)) {
      for (const item of ev.affectedItems as Array<{ qty?: number }>) {
        returnedProductsCount += toNum(item.qty ?? 1);
      }
    }
  }

  // COGS from the canonical engine (immutable per-line snapshots first, then the
  // effective-dated cost resolver). `totalCogs` keeps its historical meaning here:
  // product COGS + per-order box/packaging cost.
  const costResolver = await buildCostResolver(db, collectProductIds(deliveredOrders));
  let missingCostLines = 0;
  for (const order of deliveredOrders) {
    const p = calcOrderProfit(order, costResolver);
    // A line whose product is unknown is just as much a missing cost line.
    missingCostLines += p.missingCostLines + p.missingProductLines;
  }
  const totalCogs = fin.cogs + fin.packaging;
  const cogsBasis: FinanceSnapshot["cogsBasis"] =
    missingCostLines === 0 ? "approximate_current_cost" : "unavailable";
  const costsComplete = missingCostLines === 0;

  // P&L — every figure below is the engine's, so the AI auditor and the
  // accounting page can never quote different profits.
  const grossProfit = netRevenue - totalCogs;
  const expensesTotal = fin.expensesTotal;
  const profitBeforeExpensesAndReturns = grossProfit;
  const profitAfterExpensesBeforeReturns = grossProfit - expensesTotal;
  const finalNetProfit = fin.finalNetProfit;

  // Inventory
  let inventoryValueAtCost = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  for (const p of activeProducts) {
    const salePrice = toNum(p.price);
    // Cost EVIDENCE: null means UNKNOWN and is excluded from the valuation —
    // never coerced to 0, which would understate inventory silently.
    const costPrice = toMoneyOrNull(p.costPrice);
    const stock = Number(p.stock ?? 0);
    const threshold = Number(p.lowStockThreshold ?? 10);
    if (salePrice <= 0) continue;
    if (stock === 0) outOfStockCount++;
    else if (stock <= threshold) lowStockCount++;
    if (costPrice != null && costPrice > 0) inventoryValueAtCost += costPrice * stock;
  }

  // System notes
  const notes: Array<{ type: "warning" | "info"; message: string }> = [];
  if (!costsComplete) {
    notes.push({
      type: "warning",
      message: `${missingCostLines} سطر منتج بدون كلفة — أرقام الربح تقريبية وتعتمد الكلفة الحالية`,
    });
  }
  if (recordedEvents.length > 0) {
    notes.push({
      type: "warning",
      message: `${recordedEvents.length} راجع مسجّل غير معتمد — لا يدخل في الأرقام`,
    });
  }
  if (expenseRows.length === 0) {
    notes.push({
      type: "info",
      message: "لا مصاريف مسجّلة — صافي الربح قد يبدو أعلى مما هو فعلياً",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    scope: "all_time" as const,
    grossRevenue,
    netRevenue,
    totalCogs,
    grossProfit,
    expensesTotal,
    returnLossVerified: totalReturnFinancialImpact,
    profitBeforeExpensesAndReturns,
    profitAfterExpensesBeforeReturns,
    finalNetProfit,
    cogsBasis,
    deliveredNetTotal,
    receivedCashTotal,
    approvedReturnDeductions,
    pendingSettlement,
    verifiedReturnEventsCount: verifiedEvents.length,
    recordedReturnEventsCount: recordedEvents.length,
    returnedOrdersCount,
    returnedProductsCount,
    refundAmount,
    salesReturnDeduction,
    actualReturnLoss,
    totalReturnFinancialImpact,
    inventoryValueAtCost: Math.round(inventoryValueAtCost),
    lowStockCount,
    outOfStockCount,
    costsComplete,
    missingCostLines,
    hasCodDrilldown: true,
    hasReturnEvents: returnEvents.length > 0,
    notes,
  };
}

// ─── Deterministic invariant checks ──────────────────────────────────────────

export function runInvariantChecks(snapshot: FinanceSnapshot): InvariantCheck[] {
  const checks: InvariantCheck[] = [];

  // Rounding-drift budget for invariant #4.
  //
  // `finalNetProfit` is ONE Math.round() of the engine's exact expression, but
  // `computedFinal` re-derives the same quantity from SIX values the engine rounded
  // independently for display (revenue, cogs, packaging, expensesTotal,
  // salesReturnDeduction, actualReturnLoss). Each contributes up to 0.5 of error, so
  // the two can legitimately differ by up to 6 × 0.5 + 0.5 = 3.5 with no defect
  // present. A tolerance of 1 therefore produces FALSE invariant failures — the AI
  // auditor would report a phantom accounting problem. 4 is the smallest integer
  // that cannot false-fail. It is still a real check: a genuine formula error (a
  // component added twice, a sign flipped) is off by thousands of dinars, not by 4.
  const ROUNDING_DRIFT_TOLERANCE = 4;

  // 1. pendingSettlement formula
  const computedPending = Math.max(
    0,
    snapshot.deliveredNetTotal - snapshot.receivedCashTotal - snapshot.approvedReturnDeductions
  );
  checks.push({
    name: "pendingSettlement formula",
    passed: Math.abs(computedPending - snapshot.pendingSettlement) < 1,
    expected: computedPending,
    actual: snapshot.pendingSettlement,
    note: "pending = max(0, deliveredNetTotal - receivedCashTotal - approvedReturnDeductions)",
  });

  // 2. Settlement components balance
  const settlementSum =
    snapshot.receivedCashTotal + snapshot.approvedReturnDeductions + snapshot.pendingSettlement;
  checks.push({
    name: "settlement components balance",
    passed: Math.abs(settlementSum - snapshot.deliveredNetTotal) <= 1,
    expected: snapshot.deliveredNetTotal,
    actual: settlementSum,
    note: "receivedCash + returnDeductions + pending must equal deliveredNetTotal",
  });

  // 3. Approved return deductions do not exceed delivered net total
  checks.push({
    name: "no excessive return deductions",
    passed: snapshot.approvedReturnDeductions <= snapshot.deliveredNetTotal,
    expected: snapshot.deliveredNetTotal,
    actual: snapshot.approvedReturnDeductions,
    note: "approvedReturnDeductions must not exceed deliveredNetTotal",
  });

  // 4. Return loss applied once — finalNetProfit = profitAfterExpensesBeforeReturns - salesReturnDeduction - actualReturnLoss
  const computedFinal =
    snapshot.profitAfterExpensesBeforeReturns - snapshot.salesReturnDeduction - snapshot.actualReturnLoss;
  checks.push({
    name: "return loss affects profit once only",
    passed: Math.abs(computedFinal - snapshot.finalNetProfit) <= ROUNDING_DRIFT_TOLERANCE,
    expected: computedFinal,
    actual: snapshot.finalNetProfit,
    note: "finalNetProfit = profitAfterExpensesBeforeReturns - salesReturnDeduction - actualReturnLoss",
  });

  // 5. Returned product count is non-negative
  checks.push({
    name: "returned products count non-negative",
    passed: snapshot.returnedProductsCount >= 0,
    actual: snapshot.returnedProductsCount,
    note: "returnedProductsCount must not be negative",
  });

  // 6. COD drilldown available
  checks.push({
    name: "COD drilldown available",
    passed: snapshot.hasCodDrilldown,
    note: "COD details endpoint must exist for every pending settlement",
  });

  // 7. Inventory value non-negative
  checks.push({
    name: "inventory value non-negative",
    passed: snapshot.inventoryValueAtCost >= 0,
    actual: snapshot.inventoryValueAtCost,
    note: "inventoryValueAtCost must be >= 0",
  });

  // 8. salesReturnDeduction == refundAmount (refundAmount is revenue reversal only, not product loss)
  checks.push({
    name: "salesReturnDeduction equals refundAmount",
    passed: Math.abs(snapshot.salesReturnDeduction - snapshot.refundAmount) < 1,
    expected: snapshot.refundAmount,
    actual: snapshot.salesReturnDeduction,
    note: "refundAmount is a revenue reversal (not product loss) and must equal salesReturnDeduction",
  });

  // 9. Return deduction split is complete and consistent
  const splitSum = snapshot.salesReturnDeduction + snapshot.actualReturnLoss;
  checks.push({
    name: "return deduction split is consistent",
    passed: Math.abs(splitSum - snapshot.totalReturnFinancialImpact) < 1,
    expected: snapshot.totalReturnFinancialImpact,
    actual: splitSum,
    note: "salesReturnDeduction + actualReturnLoss must equal totalReturnFinancialImpact",
  });

  // 10. actualReturnLoss is non-negative (sellable returns must not create negative losses)
  checks.push({
    name: "actualReturnLoss non-negative",
    passed: snapshot.actualReturnLoss >= 0,
    actual: snapshot.actualReturnLoss,
    note: "actualReturnLoss (operational + non-recoverable product costs) must be >= 0",
  });

  // 11. salesReturnDeduction does not exceed deliveredNetTotal (can't refund more than was billed)
  checks.push({
    name: "salesReturnDeduction within delivered net total",
    passed: snapshot.salesReturnDeduction <= snapshot.deliveredNetTotal + 1,
    expected: snapshot.deliveredNetTotal,
    actual: snapshot.salesReturnDeduction,
    note: "salesReturnDeduction (total refunds) must not exceed deliveredNetTotal",
  });

  return checks;
}

// ─── Groq audit call ─────────────────────────────────────────────────────────

const AUDIT_SYSTEM_PROMPT = `أنت محاسب قانوني متخصص في تدقيق حسابات متاجر إلكترونية تعمل بنظام الدفع عند الاستلام (COD) في العراق.

ستتلقى لقطة مالية من نظام المحاسبة. مهمتك: تحليل الأرقام وتحديد أي مشاكل أو مخاوف محاسبية.

القواعد الصارمة:
١. لا تخترع أرقاماً. كل رقم يجب أن يكون مستخرجاً من البيانات المقدمة.
٢. لا تخترع أرقام طلبيات. إذا لم يكن هناك دليل كافٍ، قل "الدليل غير متوفر".
٣. كل إصلاح مقترح يجب أن يكون requiresHumanApproval: true بدون استثناء — لا يوجد استثناء لهذه القاعدة.
٤. ردك يجب أن يكون JSON فقط — لا مقدمات، لا تعليقات خارج الـ JSON.
٥. إذا الأرقام معقولة ولا توجد مشاكل واضحة، اجعل findings قائمة فارغة وقل ذلك في summary.

شكل الإجابة المطلوب (JSON فقط، لا شيء آخر):
{
  "overallStatus": "ok" | "warning" | "critical",
  "summary": "ملخص عام بالعربية العراقية",
  "findings": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "category": "settlement" | "returns" | "profit" | "inventory" | "payment" | "duplicate_counting" | "missing_drilldown" | "suspicious_number",
      "title": "عنوان المشكلة",
      "explanation": "شرح المشكلة بالتفصيل",
      "affectedOrders": [],
      "expectedValue": null,
      "actualValue": null,
      "difference": null,
      "suggestedFix": "الإصلاح المقترح",
      "requiresHumanApproval": true
    }
  ]
}`;

export async function runGroqAudit(
  snapshot: FinanceSnapshot,
  invariantChecks: InvariantCheck[]
): Promise<AuditReport> {
  if (!financeGroqHasKey()) {
    throw new Error("FINANCE_GROQ_API_KEY غير مُعدّ. أضفه إلى ملف .env لتشغيل التدقيق.");
  }

  const failedChecks = invariantChecks.filter(c => !c.passed);
  const userMessage = `لقطة مالية من نظام AQUAVO — التاريخ: ${snapshot.generatedAt}
ملاحظة مهمة: هذه اللقطة تشمل جميع البيانات منذ بداية المتجر (غير مقيدة بفترة زمنية — scope: all_time).

== أرقام الإيرادات والربح ==
إجمالي الإيرادات (المبلغ المحصّل من العملاء): ${snapshot.grossRevenue.toLocaleString("en-US")} د.ع
صافي الإيراد (بعد خصم رسوم الشحن للشركة): ${snapshot.netRevenue.toLocaleString("en-US")} د.ع
تكلفة البضاعة المباعة (COGS - تقريبي): ${snapshot.totalCogs.toLocaleString("en-US")} د.ع
أساس حساب الكلفة: ${snapshot.cogsBasis === "approximate_current_cost" ? "كلفة حالية (ليست تاريخية)" : "غير متوفر — بيانات كلفة ناقصة"}
إجمالي الربح الأولي (grossProfit = netRevenue - COGS): ${snapshot.grossProfit.toLocaleString("en-US")} د.ع
الربح قبل المصاريف وقبل الراجعات (profitBeforeExpensesAndReturns): ${snapshot.profitBeforeExpensesAndReturns.toLocaleString("en-US")} د.ع
إجمالي المصاريف: ${snapshot.expensesTotal.toLocaleString("en-US")} د.ع
الربح بعد المصاريف وقبل الراجعات (profitAfterExpensesBeforeReturns): ${snapshot.profitAfterExpensesBeforeReturns.toLocaleString("en-US")} د.ع
خصم تسوية الراجعات / عكس إيراد (salesReturnDeduction = refundAmount): ${snapshot.salesReturnDeduction.toLocaleString("en-US")} د.ع
خسائر الراجعات الفعلية — تشغيلية + منتجات غير قابلة للبيع (actualReturnLoss): ${snapshot.actualReturnLoss.toLocaleString("en-US")} د.ع
ملاحظة: المنتجات الراجعة القابلة للبيع (restocked=true) لا تُحسب كلفتها ضمن actualReturnLoss
صافي الربح النهائي (finalNetProfit = profitAfterExpensesBeforeReturns - salesReturnDeduction - actualReturnLoss): ${snapshot.finalNetProfit.toLocaleString("en-US")} د.ع

== تسوية COD ==
إجمالي ما يستحقه البائع (مسلّمات - رسوم شحن): ${snapshot.deliveredNetTotal.toLocaleString("en-US")} د.ع
المبلغ المستلم من شركات الشحن: ${snapshot.receivedCashTotal.toLocaleString("en-US")} د.ع
خصومات الراجعات المعتمدة (refundAmount للمسلّمات): ${snapshot.approvedReturnDeductions.toLocaleString("en-US")} د.ع
المبلغ المعلّق (غير مستلم بعد): ${snapshot.pendingSettlement.toLocaleString("en-US")} د.ع

== الراجعات والخسائر ==
أحداث إرجاع معتمدة: ${snapshot.verifiedReturnEventsCount}
أحداث إرجاع مسجّلة (غير معتمدة): ${snapshot.recordedReturnEventsCount}
طلبيات راجعة/ملغاة: ${snapshot.returnedOrdersCount}
منتجات راجعة (وحدات): ${snapshot.returnedProductsCount}
مبالغ مردودة (refundAmount / salesReturnDeduction): ${snapshot.refundAmount.toLocaleString("en-US")} د.ع
خصم تسوية COD (salesReturnDeduction — عكس إيراد، ليس خسارة منتج): ${snapshot.salesReturnDeduction.toLocaleString("en-US")} د.ع
خسائر فعلية للراجعات (actualReturnLoss — تشغيلية + غير قابلة للبيع): ${snapshot.actualReturnLoss.toLocaleString("en-US")} د.ع
إجمالي التأثير المالي للراجعات (salesReturnDeduction + actualReturnLoss): ${snapshot.totalReturnFinancialImpact.toLocaleString("en-US")} د.ع

== المخزون ==
قيمة المخزون بالكلفة: ${snapshot.inventoryValueAtCost.toLocaleString("en-US")} د.ع
منتجات مخزون منخفض: ${snapshot.lowStockCount}
منتجات نفد مخزونها: ${snapshot.outOfStockCount}

== جودة البيانات ==
بيانات الكلفة مكتملة: ${snapshot.costsComplete ? "نعم" : "لا"}
سطور بدون كلفة: ${snapshot.missingCostLines}
يوجد تفاصيل COD (drilldown): ${snapshot.hasCodDrilldown ? "نعم" : "لا"}
يوجد سجل أحداث إرجاع: ${snapshot.hasReturnEvents ? "نعم" : "لا"}

== تنبيهات النظام ==
${snapshot.notes.length === 0 ? "لا تنبيهات" : snapshot.notes.map(n => `[${n.type.toUpperCase()}] ${n.message}`).join("\n")}

== نتائج الفحوصات الحتمية ==
${invariantChecks.map(c => `[${c.passed ? "✓ نجح" : "✗ فشل"}] ${c.name}${c.note ? ` — ${c.note}` : ""}${!c.passed && c.expected != null ? ` | متوقع: ${c.expected} | فعلي: ${c.actual}` : ""}`).join("\n")}

${failedChecks.length > 0 ? `⚠️ فحوصات فاشلة (${failedChecks.length}): ${failedChecks.map(c => c.name).join(", ")}` : "✓ جميع الفحوصات الحتمية نجحت"}

قم بتحليل هذه الأرقام وأعط تقرير تدقيق JSON فقط.`;

  const financeGroq = getFinanceGroqClient();
  const model = process.env.FINANCE_GROQ_MODEL || "llama-3.1-8b-instant";
  const completion = await financeGroq.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 2048,
    messages: [
      { role: "system", content: AUDIT_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });
  const rawText = completion.choices[0]?.message?.content ?? "";

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`استجابة Groq ليست JSON صالح: ${cleaned.slice(0, 200)}`);
  }

  const validated = auditReportSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `تنسيق تقرير Groq غير صحيح: ${validated.error.issues.map(i => i.message).join(", ")}`
    );
  }

  return validated.data;
}

// ─── Accounting row-count snapshot (for safety verification) ─────────────────

export interface AccountingRowCounts {
  orders: number;
  settlements: number;
  returnEvents: number;
  expenses: number;
}

export async function getAccountingRowCounts(): Promise<AccountingRowCounts> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const [[{ value: ordersCount }], [{ value: settlementsCount }], [{ value: eventsCount }], [{ value: expensesCount }]] =
    await Promise.all([
      db.select({ value: count() }).from(orders),
      db.select({ value: count() }).from(shippingSettlements),
      db.select({ value: count() }).from(orderReturnEvents),
      db.select({ value: count() }).from(expenses),
    ]);

  return {
    orders: Number(ordersCount),
    settlements: Number(settlementsCount),
    returnEvents: Number(eventsCount),
    expenses: Number(expensesCount),
  };
}

// ─── Main orchestrator ───────────────────────────────────────────────────────

export async function runFinanceAudit(
  triggeredBy = "scheduled"
): Promise<FinanceAuditResult> {
  const generatedAt = new Date().toISOString();

  const snapshot = await buildFinanceSnapshot();
  const invariantChecks = runInvariantChecks(snapshot);

  let report: AuditReport | null = null;
  let error: string | undefined;

  try {
    report = await runGroqAudit(snapshot, invariantChecks);
  } catch (err) {
    error = err instanceof Error ? err.message : "خطأ غير معروف أثناء استدعاء Groq";
  }

  const result: FinanceAuditResult = { snapshot, invariantChecks, report, error, generatedAt };
  lastAuditResult = result;

  // Persist to DB (non-blocking — a storage failure must not surface to callers)
  try {
    const { financeAuditStorage } = await import("./financeAuditStorage.js");
    await financeAuditStorage.saveAuditRun(result, triggeredBy);
  } catch (storageErr) {
    console.error("[FinanceAudit] Failed to persist audit run:", storageErr instanceof Error ? storageErr.message : storageErr);
  }

  return result;
}

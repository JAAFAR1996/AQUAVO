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

// ─── Helpers (mirror accounting.ts — no import to avoid coupling) ─────────────

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function collectedAmount(order: { roundedTotal?: unknown; total: unknown }): number {
  if (order.roundedTotal != null) return toNum(order.roundedTotal);
  return Math.round(toNum(order.total) / 250) * 250;
}

function netAmount(order: { roundedTotal?: unknown; total: unknown; shippingCost: unknown }): number {
  return collectedAmount(order) - toNum(order.shippingCost);
}

// ─── Snapshot builder ────────────────────────────────────────────────────────

export async function buildFinanceSnapshot(): Promise<FinanceSnapshot> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const [allOrders, settlements, returnEvents, expenseRows, activeProducts] = await Promise.all([
    db.select().from(orders),
    db.select().from(shippingSettlements),
    db.select().from(orderReturnEvents),
    db.select().from(expenses),
    db.select().from(products).where(isNull(products.deletedAt)),
  ]);

  // Build a quick cost map from current product data
  const productCostMap = new Map<string, { costPrice: number; packagingCost: number; insertCost: number }>();
  for (const p of activeProducts) {
    productCostMap.set(p.id, {
      costPrice: toNum(p.costPrice),
      packagingCost: toNum(p.packagingCost),
      insertCost: toNum(p.insertCost),
    });
  }

  // Delivered orders
  const deliveredOrders = allOrders.filter(o => o.status === "delivered");
  const grossRevenue = Math.round(deliveredOrders.reduce((s, o) => s + collectedAmount(o), 0));
  const deliveredNetTotal = Math.round(deliveredOrders.reduce((s, o) => s + netAmount(o), 0));
  const netRevenue = deliveredNetTotal;

  // COD settlement
  const receivedCashTotal = Math.round(settlements.reduce((s, e) => s + toNum(e.amount), 0));
  const deliveredIds = new Set(deliveredOrders.map(o => o.id));
  const verifiedEvents = returnEvents.filter(e => e.status === "verified");
  const recordedEvents = returnEvents.filter(e => e.status === "recorded");
  const approvedReturnDeductions = Math.round(
    verifiedEvents
      .filter(e => deliveredIds.has(e.orderId))
      .reduce((s, e) => s + toNum(e.refundAmount), 0)
  );
  const pendingSettlement = Math.max(0, deliveredNetTotal - receivedCashTotal - approvedReturnDeductions);

  // Return losses (verified only) — split: revenue reversal vs actual loss
  type ReturnEventRow = typeof returnEvents[number];

  function evtSalesReturnDeduction(e: ReturnEventRow): number {
    return toNum(e.refundAmount);
  }

  function evtActualReturnLoss(e: ReturnEventRow): number {
    const opLoss = toNum(e.deliveryCostLoss) + toNum(e.returnShippingCost) + toNum(e.packagingLoss);
    const writeOff = toNum(e.productWriteOffAmount);
    const productCost = e.restocked !== true ? toNum(e.cogsLoss) : 0;
    return opLoss + writeOff + productCost;
  }

  const salesReturnDeduction = Math.round(verifiedEvents.reduce((s, e) => s + evtSalesReturnDeduction(e), 0));
  const actualReturnLoss = Math.round(verifiedEvents.reduce((s, e) => s + evtActualReturnLoss(e), 0));
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

  // Approximate COGS (current product cost, not historical)
  let totalCogs = 0;
  let missingCostLines = 0;
  for (const order of deliveredOrders) {
    const items = Array.isArray(order.items)
      ? (order.items as Array<{ productId?: string; quantity?: unknown }>)
      : [];
    for (const item of items) {
      const costs = item.productId ? productCostMap.get(item.productId) : undefined;
      const qty = toNum(item.quantity ?? 1);
      if (!costs || costs.costPrice <= 0) {
        missingCostLines++;
      } else {
        totalCogs += (costs.costPrice + costs.packagingCost + costs.insertCost) * qty;
      }
    }
    totalCogs += toNum((order as Record<string, unknown>).boxCost);
  }
  totalCogs = Math.round(totalCogs);
  const cogsBasis: FinanceSnapshot["cogsBasis"] =
    missingCostLines === 0 ? "approximate_current_cost" : "unavailable";
  const costsComplete = missingCostLines === 0;

  // P&L
  const grossProfit = netRevenue - totalCogs;
  const expensesTotal = Math.round(expenseRows.reduce((s, e) => s + toNum(e.amount), 0));
  const profitBeforeExpensesAndReturns = grossProfit;
  const profitAfterExpensesBeforeReturns = grossProfit - expensesTotal;
  const finalNetProfit = profitAfterExpensesBeforeReturns - salesReturnDeduction - actualReturnLoss;

  // Inventory
  let inventoryValueAtCost = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  for (const p of activeProducts) {
    const salePrice = toNum(p.price);
    const costPrice = toNum(p.costPrice);
    const stock = Number(p.stock ?? 0);
    const threshold = Number(p.lowStockThreshold ?? 10);
    if (salePrice <= 0) continue;
    if (stock === 0) outOfStockCount++;
    else if (stock <= threshold) lowStockCount++;
    if (costPrice > 0) inventoryValueAtCost += costPrice * stock;
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
    passed: Math.abs(computedFinal - snapshot.finalNetProfit) < 1,
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

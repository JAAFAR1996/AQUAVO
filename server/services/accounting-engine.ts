// Canonical accounting calculation engine (Stage: engine extraction).
//
// This module is the SINGLE, importable financial CALCULATION LAYER for AQUAVO.
// It was extracted verbatim from server/routes/accounting.ts so that other parts
// of the app can call ONE engine instead of reimplementing profit/cost/ledger
// formulas. It is PURE with respect to Express — it never touches req/res. The
// only I/O it performs is Drizzle DB reads via a passed-in Db handle.
//
// Behavior-preserving: same formulas, same numbers as the original route file.
import { getDb } from "../db.js";
import {
  orders,
  products,
  productCostHistory,
  productCostHistoryPreMigrationColumns,
  orderReturnEvents,
  expenses,
  manualInvoices,
  accountingManualAdjustments,
  orderFulfillmentEvents,
  orderFulfillmentLines,
  orderItems,
  orderItemsPreMigrationColumns,
} from "../../shared/schema.js";
import { and, gte, lte, inArray, eq, desc, isNull, sql } from "drizzle-orm";
import type { AccountingPeriod } from "../../shared/accounting.js";
// Canonical order-financial definitions — single source of truth (Stage A).
import {
  toMoney as toNumber,
  toMoneyOrNull,
  orderCollectedAmount,
  REALIZED_STATUSES,
} from "../../shared/order-financials.js";

/**
 * The canonical realized-status set as a SQL `IN (...)` list.
 *
 * Aggregate queries cannot call `isRealizedStatus`, so before this existed every
 * such query hard-coded its own `IN ('delivered', …)` literal and they drifted —
 * some counted `'confirmed'` as realized revenue. Derived from REALIZED_STATUSES,
 * so widening that array updates every query at once.
 */
export const REALIZED_STATUS_SQL = sql`(${sql.join(REALIZED_STATUSES.map((s) => sql`${s}`), sql`, `)})`;

export type Db = NonNullable<ReturnType<typeof getDb>>;
export type OrderRow = typeof orders.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
/**
 * Only the columns this engine reads, and only the columns that exist in
 * production today. Deliberately NOT `$inferSelect`: that would include the
 * resolution/evidence columns added by fix_product_cost_history_nullable.sql,
 * and the type would then permit a query the live database cannot answer.
 */
export type CostHistoryRow = Pick<
  typeof productCostHistory.$inferSelect,
  | "id" | "productId" | "costPrice" | "packagingCost" | "insertCost"
  | "effectiveFrom" | "note" | "changedBy" | "createdAt"
>;

export interface OrderLineItem {
  productId?: string;
  productName?: string;
  quantity?: number | string;
  priceAtPurchase?: number | string;
  variantId?: string;
  variantLabel?: string;
  // Immutable cost snapshot frozen at sale time (per unit). Preferred over the
  // effective-dated cost lookup when present. NULL = cost was UNKNOWN at sale
  // (never treat as 0). costStatus/costSource record how the snapshot was formed.
  costPrice?: number | string | null;
  packagingCost?: number | string | null;
  insertCost?: number | string | null;
  costStatus?: CostSnapshotStatus;
  costSource?: CostSnapshotSource;
}

/**
 * ─── STATUS LATTICE (single vocabulary for line, order and period level) ─────
 *
 *   exact         every cost component came from an immutable snapshot frozen at
 *                 sale time and is real evidence.
 *   verified_zero the cost is genuinely 0 and a human confirmed it (F-5:
 *                 products.*_resolution = 'verified_zero'). Numerically exact;
 *                 does NOT degrade an order.
 *   estimated     no frozen snapshot; the value was substituted from the current
 *                 catalog or the effective-dated cost history. It is a
 *                 substitution, not evidence — it REQUIRES an explicit source
 *                 (costSource = 'product_current' | 'cost_history' | 'manual').
 *   incomplete    SOME components are known and some are unknown. The known part
 *                 is still summed into the best-effort COGS; the order can no
 *                 longer report an exact figure.
 *   unknown       no cost evidence at all for this line/order.
 *
 * Degradation order (worst wins when rolling lines up into an order):
 *   unknown > incomplete > estimated > verified_zero ≈ exact
 *
 * INVARIANT: `unknown` is NEVER rendered as 0. A component with no evidence is
 * excluded from the sum and counted, it is not coerced.
 */
export type CostSnapshotStatus = "exact" | "verified_zero" | "estimated" | "incomplete" | "unknown";
export type CostSnapshotSource = "product_current" | "cost_history" | "manual" | "none";

/** Rank used to roll line statuses up. Higher = worse. */
const STATUS_RANK: Record<CostSnapshotStatus, number> = {
  exact: 0, verified_zero: 0, estimated: 1, incomplete: 2, unknown: 3,
};
export function worstStatus(a: CostSnapshotStatus, b: CostSnapshotStatus): CostSnapshotStatus {
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a;
}

export type CostResolution = "known" | "verified_zero" | "unresolved";

/**
 * F-5. Decide what a stored cost number MEANS.
 *
 *   NULL                              -> null  (already explicitly unknown)
 *   > 0                               -> value (a positive number is evidence)
 *   = 0 and resolution 'verified_zero' -> 0     (a real, human-confirmed zero)
 *   = 0 otherwise                      -> null  (AMBIGUOUS: `numeric DEFAULT '0'`
 *                                                means an untouched product is
 *                                                born holding a zero. Treating it
 *                                                as a cost of 0 is exactly the
 *                                                overloading F-5 is about.)
 *
 * `resolution` may legitimately be undefined/null — before the migration is
 * applied, or for tables that have no resolution columns (product_cost_history).
 * That case is read as 'unresolved', i.e. the conservative reading, so this
 * function is correct with or without the migration.
 */
export function resolveCostComponent(
  value: number | null | undefined,
  resolution: string | null | undefined,
): number | null {
  if (value == null) return null;
  if (value > 0) return value;
  if (value < 0) return value; // a negative cost is a real (if odd) entered value
  return resolution === "verified_zero" ? 0 : null;
}

/** True when this component is a confirmed zero rather than a positive cost. */
function isVerifiedZero(value: number | null, resolution: string | null | undefined): boolean {
  return value === 0 && resolution === "verified_zero";
}

/**
 * Build a ProductCost from an order line's immutable cost snapshot, if present.
 * Returns null when the line has no snapshot (older orders) so the caller falls
 * back to the effective-dated cost resolver.
 */
export function lineCostSnapshot(item: OrderLineItem): ProductCost | null {
  // STEP 1 of the cost-resolution hierarchy — EXACT SNAPSHOT ONLY.
  //
  // The immutable per-line snapshot is authoritative only when it actually
  // recorded exact evidence. `verified_zero` counts: a human-confirmed zero is
  // exact evidence and does not drift with time.
  //
  // Any other status — `unknown`, `estimated`, `incomplete`, or no snapshot at
  // all — is NOT usable evidence, so we return null and let the resolver walk
  // steps 2→4 (date-valid history → database reference → unknown). Previously an
  // `unknown` snapshot short-circuited to an all-NULL cost and the database was
  // never consulted, so a line whose product has a perfectly good
  // product_cost_history row still reported "no purchase price". That was the
  // root cause of the zero-cost dashboard.
  if (item.costStatus !== "exact" && item.costStatus !== "verified_zero") {
    return null; // fall back to the resolver — never fabricate, never short-circuit
  }
  // Known snapshot: preserve a real 0 as 0, but keep null if any field is absent.
  // F-10: a 0 is only a real 0 when the snapshot itself says `verified_zero`.
  // A 0 frozen under any other status is an ambiguous `DEFAULT '0'` value and
  // must fall back to the resolver rather than be read as a cost of nothing.
  const costPrice = resolveCostComponent(
    toMoneyOrNull(item.costPrice),
    item.costStatus === "verified_zero" ? "verified_zero" : null,
  );
  if (costPrice == null) return null; // no usable cost → fall back to resolver
  const packagingCost = toMoneyOrNull(item.packagingCost);
  const insertCost = toMoneyOrNull(item.insertCost);
  return {
    productId: item.productId ?? "",
    name: item.productName ?? item.productId ?? "",
    price: toNumber(item.priceAtPurchase),
    costPrice,
    packagingCost,
    insertCost,
    costKnown: true,
    costBasis: "exact_snapshot",
    // A verified zero is complete evidence, not a missing cost.
    costsComplete:
      (costPrice > 0 || item.costStatus === "verified_zero") &&
      packagingCost != null && insertCost != null,
    costStatus: item.costStatus ?? "exact",
    costSource: item.costSource ?? "manual",
  };
}

/**
 * WHICH RUNG of the cost-resolution hierarchy produced this cost. This is the
 * honesty channel: it tells the UI whether a number is immutable evidence or a
 * database-derived estimate, so an estimate can never be presented as fact.
 *
 *   exact_snapshot                — the order line's own frozen cost (or a
 *                                   human-verified zero). Immutable.
 *   estimated_history             — newest positive product_cost_history row
 *                                   effective on or before the sale date.
 *   estimated_database_reference  — a positive cost still in the database but
 *                                   not date-valid for this sale.
 *   unknown                       — no positive cost evidence anywhere. Cost,
 *                                   COGS, profit and margin all stay NULL.
 */
export type CostBasis =
  | "exact_snapshot"
  | "estimated_history"
  | "estimated_database_reference"
  | "unknown";

/** Arabic labels shown to the operator. Kept beside the type so they cannot drift. */
export const COST_BASIS_LABEL_AR: Readonly<Record<CostBasis, string>> = {
  exact_snapshot: "كلفة الطلب الأصلية",
  estimated_history: "تقديري من سجل الكلفة بتاريخ البيع",
  estimated_database_reference: "تقديري من آخر كلفة محفوظة بقاعدة البيانات",
  unknown: "الكلفة غير متوفرة",
};

/**
 * CANONICAL carrier cash position.
 *
 * Source of truth: `cash_settlements` rows with status='reconciled'. Nothing
 * else. The legacy `shipping_settlements` log and `orders.shipping_cost` are
 * operational records that under-record real cash; reading either produced a
 * phantom outstanding balance.
 *
 * Invariant every reconciled row satisfies: gross = fees + net. The carrier's
 * fee is money it KEEPS, so it is subtracted — never reported as a receivable.
 *
 * Returns (approved return refunds) are NOT subtracted here. A refund is already
 * reflected in the reconciled gross/net figures; deducting it again would charge
 * the carrier twice for the same money. It is surfaced separately, as
 * information, in `documentedAdjustments`.
 */
export interface CarrierBalance {
  grossCustomerCollections: number;
  carrierFees: number;
  netCashReceived: number;
  /** Informational only — never subtracted from `outstanding`. */
  documentedAdjustments: number;
  outstanding: number;
  fullySettled: boolean;
  /**
   * RED TEAM B-5. Reconciled rows where gross <> fees + net. Such a row is an
   * arithmetically impossible document, NOT money owed by the carrier — the
   * two must never share a representation. Reported as an exception so the
   * corrupt document is investigated rather than banked.
   */
  invariantViolationCount: number;
  /** Signed total of (gross - fees - net) contributed by violating rows. */
  invariantViolationAmount: number;
  /** True when any reconciled row breaks the identity. Blocks tax finality. */
  hasInvariantViolation: boolean;
}

type ReconciledSettlementRow = {
  status: string | null;
  grossAmount: string | number | null;
  feesAmount: string | number | null;
  netAmount: string | number | null;
};

export function computeCarrierBalance(
  rows: ReconciledSettlementRow[],
  documentedAdjustments: number,
): CarrierBalance {
  const reconciled = rows.filter((s) => s.status === "reconciled");
  const grossCustomerCollections = reconciled.reduce((sum, s) => sum + toNumber(s.grossAmount), 0);
  const carrierFees = reconciled.reduce((sum, s) => sum + toNumber(s.feesAmount), 0);
  const netCashReceived = reconciled.reduce((sum, s) => sum + toNumber(s.netAmount), 0);

  // Per-row integrity check. Deliberately per-row, not on the totals: two rows
  // with equal and opposite errors would net to zero and hide both.
  let invariantViolationCount = 0;
  let invariantViolationAmount = 0;
  for (const s of reconciled) {
    const delta = toNumber(s.grossAmount) - toNumber(s.feesAmount) - toNumber(s.netAmount);
    if (delta !== 0) {
      invariantViolationCount++;
      invariantViolationAmount += delta;
    }
  }

  // NOT clamped to zero: a genuine shortfall in the recorded settlements must
  // stay visible rather than be hidden behind a max(0, …).
  //
  // `outstanding` is left as the raw arithmetic on purpose — subtracting the
  // violating rows out of it would silently restate a reported balance. The
  // violation is surfaced alongside instead, so a reader can see that part of
  // this figure originates in a broken document rather than in unpaid cash.
  const outstanding = grossCustomerCollections - carrierFees - netCashReceived;
  return {
    grossCustomerCollections,
    carrierFees,
    netCashReceived,
    documentedAdjustments,
    outstanding,
    // A file with a corrupt settlement document is not settled, even at zero.
    fullySettled: outstanding === 0 && invariantViolationCount === 0,
    invariantViolationCount,
    invariantViolationAmount,
    hasInvariantViolation: invariantViolationCount > 0,
  };
}

/**
 * TAX READINESS.
 *
 * A period is tax-final ONLY when every counted sale line carries an immutable
 * cost snapshot taken at the moment of sale (`exact_snapshot`). Costs recovered
 * from `product_cost_history` or from the product's current database cost are
 * ESTIMATES: they are good enough to steer the business, and not good enough to
 * file. An estimate must never be promoted to evidence by rounding, defaulting,
 * or an empty period reading as "ready" — hence the `> 0` guard.
 */
export interface TaxReadiness {
  exactCostLines: number;
  estimatedHistoryLines: number;
  estimatedReferenceLines: number;
  unknownCostLines: number;
  totalFinancialLines: number;
  /**
   * Cost-snapshot coverage ONLY — every counted line carries an
   * `exact_snapshot`. This is condition 8 of the 23 in the mission spec §5.
   * It is NOT tax readiness, and must never be rendered to the user as if it
   * were. Exposed separately so the UI can show honest progress while
   * `taxReportReady` stays pinned false.
   */
  costSnapshotsComplete: boolean;
  taxReportReady: boolean;
  /** Shown verbatim in the UI whenever `taxReportReady` is false. */
  taxReadinessWarning: string | null;
}

export const TAX_NOT_READY_WARNING_AR =
  "غير صالح كتقرير ضريبي نهائي — الكلف التاريخية تقديرية ولم تُثبت بلقطات كلفة وقت البيع.";

export const TAX_READINESS_ENGINE_PENDING_AR =
  "غير صالح كتقرير ضريبي نهائي — محرك الجاهزية الضريبية غير منفَّذ بعد. " +
  "لقطات الكلفة شرط واحد من 23 شرطاً؛ الهوية الضريبية ودليل الحسابات المعتمد " +
  "والسنة المالية واعتماد المحاسب القانوني وتوثيق المصروفات لم تُنفَّذ بعد.";

/**
 * RED TEAM M-10 — FALSE-READINESS PIN.
 *
 * The mission spec §5 defines 23 conditions for `taxReportReady`. Only one of
 * them (exact cost snapshots on every line) is implemented today. Phase 1 makes
 * NEW orders capture exact snapshots, which means the first fully-exact month
 * would otherwise flip this flag to `true` and unlock period close and final
 * export — with no tax profile, no approved chart of accounts (نظام مسك الدفاتر
 * م.3/ثالثاً), no fiscal year, no accountant approval, and no expense
 * documentation. That is 22 conditions short.
 *
 * A gate that reports a guarantee it does not enforce is worse than no gate:
 * it misleads the owner, the accountant, and the inspector at once. So the flag
 * is pinned `false` at the source until the full readiness engine ships and
 * flips this constant. Do not flip it to unblock a demo.
 */
export const FULL_TAX_READINESS_ENGINE_IMPLEMENTED = false;

export function computeTaxReadiness(input: {
  exactCostLines: number;
  estimatedHistoryLines: number;
  estimatedReferenceLines: number;
  unknownCostLines: number;
}): TaxReadiness {
  const totalFinancialLines =
    input.exactCostLines +
    input.estimatedHistoryLines +
    input.estimatedReferenceLines +
    input.unknownCostLines;
  const costSnapshotsComplete =
    totalFinancialLines > 0 && input.exactCostLines === totalFinancialLines;
  const taxReportReady = FULL_TAX_READINESS_ENGINE_IMPLEMENTED && costSnapshotsComplete;
  // Two distinct failures, two distinct messages: estimated costs are a DATA
  // problem the owner can fix with invoices; a missing readiness engine is a
  // SYSTEM limitation the owner cannot fix. Collapsing them would misdirect
  // the remediation effort.
  const taxReadinessWarning = taxReportReady
    ? null
    : costSnapshotsComplete
      ? TAX_READINESS_ENGINE_PENDING_AR
      : TAX_NOT_READY_WARNING_AR;
  return {
    ...input,
    totalFinancialLines,
    costSnapshotsComplete,
    taxReportReady,
    taxReadinessWarning,
  };
}

export interface ProductCost {
  productId: string;
  name: string;
  price: number;
  /** Which rung of the hierarchy produced this cost. */
  costBasis?: CostBasis;
  // Cost evidence is NULLABLE. null = UNKNOWN (never treat as 0). A real 0 stays 0.
  costPrice: number | null;
  packagingCost: number | null;
  insertCost: number | null;
  costKnown: boolean; // convenience === (costPrice != null); consumers should prefer costStatus
  costsComplete: boolean;
  costStatus?: CostSnapshotStatus;
  costSource?: CostSnapshotSource;
  overridden?: boolean;
  overrideReason?: string;
  overrideField?: string;
}

export interface CostResolver {
  getCurrent(productId: string): ProductCost | undefined;
  getEffective(productId: string, at: Date): ProductCost | undefined;
}

// ─── Fulfillment cost (separate contribution-margin component) ───────────────
// Computed from the IMMUTABLE order_fulfillment_lines snapshot — NOT from the live
// catalog, so later material price changes never rewrite a completed order's cost.
export interface OrderFulfillmentCost {
  orderId: string;
  // Per-event-type breakdown (confirmed, non-reversed events only). Each is null
  // if any contributing line cost is unknown — never coerced to 0.
  originalFulfillmentCost: number | null;
  reshipmentCost: number | null;
  returnHandlingCost: number | null;
  replacementCost: number | null;
  adjustmentCost: number | null;
  reversedCost: number;          // total value of reversed events (informational)
  totalFulfillmentCost: number | null; // sum of all confirmed non-reversed events
  status: CostSnapshotStatus;    // exact | estimated | incomplete | unknown (over all counted events)
  expectedCost: number | null;
  actualCost: number | null;
  variance: number | null;
  eventCount: number;
  unknownLines: number;
}

export interface FulfillmentResolver {
  get(orderId: string): OrderFulfillmentCost | undefined;
}

/**
 * Batch-load ALL confirmed, NON-REVERSED fulfillment events (original + reshipments
 * + return-handling + replacement + adjustment) for a set of orders, from the
 * IMMUTABLE lines. A line with an unknown (NULL) cost makes that event incomplete;
 * an incomplete event makes the order's total fulfillment cost incomplete (NULL) —
 * never coerced to 0. Reversed events (workflow_state='reversed', or events pointed
 * at by a reversal) are excluded from the total.
 */
export async function buildFulfillmentResolver(db: Db, orderIds: Set<string>): Promise<FulfillmentResolver> {
  const byOrder = new Map<string, OrderFulfillmentCost>();
  if (orderIds.size === 0) return { get: () => undefined };
  const ids = [...orderIds];

  const events = await db
    .select()
    .from(orderFulfillmentEvents)
    .where(inArray(orderFulfillmentEvents.orderId, ids));
  if (events.length === 0) return { get: () => undefined };

  // events that a reversal points at are considered reversed too
  const reversedIds = new Set<string>();
  for (const e of events) {
    if (e.workflowState === "reversed") reversedIds.add(e.id);
    if (e.reversalOfEventId) reversedIds.add(e.reversalOfEventId);
  }

  const lines = await db
    .select()
    .from(orderFulfillmentLines)
    .where(inArray(orderFulfillmentLines.eventId, events.map((e) => e.id)));
  const linesByEvent = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByEvent.get(l.eventId) ?? [];
    arr.push(l); linesByEvent.set(l.eventId, arr);
  }

  // eventCost: sum of known line totals; null if any line unknown
  function eventCost(eventId: string): { total: number | null; unknown: number; estimated: boolean; lineCount: number } {
    const evLines = linesByEvent.get(eventId) ?? [];
    let total = 0, unknown = 0, estimated = false;
    for (const l of evLines) {
      const lt = toMoneyOrNull(l.totalCost);
      if (lt == null || l.costStatus === "unknown" || l.costStatus === "incomplete") unknown++;
      else { total += lt; if (l.costStatus === "estimated") estimated = true; }
    }
    return { total: (evLines.length === 0 || unknown > 0) ? null : total, unknown, estimated, lineCount: evLines.length };
  }

  const byOrderEvents = new Map<string, typeof events>();
  for (const e of events) {
    const arr = byOrderEvents.get(e.orderId) ?? [];
    arr.push(e); byOrderEvents.set(e.orderId, arr);
  }

  for (const [orderId, orderEvents] of byOrderEvents) {
    const bucket: Record<string, number | null> = {
      original: null, reshipment: null, return_handling: null, replacement: null, adjustment: null,
    };
    let total = 0, totalNull = false, unknownLines = 0, anyEstimated = false, counted = 0, reversedCost = 0;
    for (const e of orderEvents) {
      const c = eventCost(e.id);
      if (reversedIds.has(e.id) || e.workflowState === "reversed") {
        if (c.total != null) reversedCost += c.total;
        continue;
      }
      if (!["confirmed", "adjusted"].includes(e.workflowState)) continue; // only settled events count
      // A REVERSAL is a counter-entry: its financial effect is achieved by excluding
      // the event it reverses (already done above). It carries no cost lines of its
      // own, so counting it would make the order's total read as UNKNOWN even though
      // every remaining event is fully known.
      if (e.reversalOfEventId) continue;
      counted++;
      unknownLines += c.unknown;
      if (c.estimated) anyEstimated = true;
      // per-type bucket
      const key = e.eventType;
      if (c.total == null) { bucket[key] = bucket[key]; totalNull = true; }
      else { bucket[key] = (bucket[key] ?? 0) + c.total; total += c.total; }
      if (c.total == null) totalNull = true;
    }
    const status: CostSnapshotStatus =
      counted === 0 ? "unknown"
      : unknownLines > 0 ? "incomplete"
      : anyEstimated ? "estimated"
      : "exact";
    byOrder.set(orderId, {
      orderId,
      originalFulfillmentCost: bucket.original,
      reshipmentCost: bucket.reshipment,
      returnHandlingCost: bucket.return_handling,
      replacementCost: bucket.replacement,
      adjustmentCost: bucket.adjustment,
      reversedCost,
      totalFulfillmentCost: totalNull ? null : (counted === 0 ? null : total),
      status,
      expectedCost: null,
      actualCost: totalNull ? null : total,
      variance: null,
      eventCount: counted,
      unknownLines,
    });
  }
  return { get: (orderId) => byOrder.get(orderId) };
}

export interface OrderProfitItem {
  productId: string;
  name: string;
  qty: number;
  priceAtPurchase: number;
  // Per-line cost evidence — NULL means unknown (never 0). A consumer reading these
  // sees null, so it cannot mistake an unknown line for a genuine zero-cost line.
  unitCostPrice: number | null;
  unitPackagingCost: number | null;
  unitInsertCost: number | null;
  costStatus: CostSnapshotStatus;
}

export interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  createdAt: string;
  revenue: number;
  cogs: number;
  packaging: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  shipping: number;
  boxCost: number;
  netProfit: number;
  margin: number;
  costsComplete: boolean;
  missingCostLines: number;
  missingProductLines: number;
  estimatedCostLines: number; // >0 means some COGS was estimated, not from an immutable snapshot
  unknownCostLines: number;   // lines with NO cost evidence at all
  incompleteCostLines: number;// lines with partial cost evidence
  verifiedZeroLines: number;
  /** Lines whose cost came from the line's own immutable snapshot. */
  exactCostLines: number;
  /** Lines costed from date-valid product_cost_history. */
  estimatedHistoryLines: number;
  /** Lines costed from a non-date-valid database reference. */
  estimatedReferenceLines: number;
  /** DISTINCT products with no usable cost anywhere (never a line count). */
  missingCostProducts: number;  // lines whose zero cost is human-confirmed
  /** F-3: which store supplied the cost snapshots for this order. */
  costSourceOfTruth: "relational" | "jsonb";
  /** F-3: false = relational rows exist but disagree with the JSONB lines. */
  sourceReconciled: boolean;
  costStatus: CostSnapshotStatus; // exact | verified_zero | estimated | incomplete | unknown
  // `netProfit`/`cogs` above are a best-effort figure over KNOWN lines only.
  // These are non-null ONLY when costStatus === "exact" — the hard guard that an
  // unknown cost can never yield a value presented as an exact profit.
  exactCogs: number | null;
  exactNetProfit: number | null;
  // ── Fulfillment cost — a SEPARATE component from product COGS (formula boundary).
  // From the immutable snapshot; null when no confirmed snapshot or it's incomplete.
  fulfillmentCost: number | null;
  fulfillmentStatus: CostSnapshotStatus;
  // ── Layered profit (each null unless its inputs are all known — never labelled
  // exact when information is missing; ads/overhead are NEVER allocated here).
  grossMerchandiseProfit: number | null; // revenue − product COGS
  contributionProfit: number | null;     // revenue − product COGS − fulfillment
  contributionMargin: number | null;     // contributionProfit / revenue (%)
  items: OrderProfitItem[];
}

export interface ProductProfit {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  packaging: number;
  netProfit: number;
  margin: number;
  costPrice: number;
  packagingCost: number;
  insertCost: number;
  costsComplete: boolean;
  missingCostLines: number;
  missingProductLines: number;
}

export function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

// ─── Return-loss helpers ─────────────────────────────────────────────────────
// Business rule: a product returned sellable (restocked=true) means COGS is
// recovered to inventory — it must NOT be counted as P&L loss.
// refundAmount is a revenue reversal / COD settlement deduction — separate from
// operational loss.

export type ReturnEventLike = {
  refundAmount: string | number | null;
  deliveryCostLoss: string | number | null;
  returnShippingCost: string | number | null;
  packagingLoss: string | number | null;
  productWriteOffAmount: string | number | null;
  cogsLoss: string | number | null;
  restocked: boolean | null;
};

/** refundAmount: revenue reversal — affects COD settlement AND reduces net revenue */
export function eventSalesReturnDeduction(e: ReturnEventLike): number {
  return toNumber(e.refundAmount);
}

/**
 * Actual unrecoverable P&L loss (does NOT include refundAmount).
 *
 * productWriteOffAmount: always real (explicit write-off, even partial).
 * cogsLoss: counted only when restocked=false (product NOT back in stock).
 */
export function eventActualReturnLoss(e: ReturnEventLike): number {
  const opLoss =
    toNumber(e.deliveryCostLoss) +
    toNumber(e.returnShippingCost) +
    toNumber(e.packagingLoss);
  const writeOff = toNumber(e.productWriteOffAmount);
  const productCost = e.restocked !== true ? toNumber(e.cogsLoss) : 0;
  return opLoss + writeOff + productCost;
}

export function periodRange(period: AccountingPeriod, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "week") {
    const day = now.getDay();
    const diffToSat = (day + 1) % 7; // السبت بداية الأسبوع (عراقي)
    const start = new Date(now);
    start.setDate(now.getDate() - diffToSat);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  // month (default)
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export function getOrderItems(order: OrderRow): OrderLineItem[] {
  return Array.isArray(order.items) ? (order.items as OrderLineItem[]) : [];
}

// ═══════════════════════════════════════════════════════════════════════════
// F-3 — SOURCE-OF-TRUTH POLICY for a line's cost snapshot
// ═══════════════════════════════════════════════════════════════════════════
// The engine historically read cost evidence ONLY from the `orders.items` JSONB
// blob. The relational store `order_items_relational` also carries a per-line
// cost snapshot, and for the historically backfilled lines it is the ONLY place
// that records the truth: unit_cost_price = NULL, cost_snapshot_status =
// 'unknown'. Reading JSONB alone lost that signal, so those lines fell through
// to the effective-dated resolver and surfaced as `estimated` — today's catalog
// cost silently substituted for a cost nobody ever knew.
//
// POLICY (deterministic, no guessing):
//   1. `orders.items` remains the REVENUE basis. It is what the customer was
//      charged and it is never overridden here.
//   2. `order_items_relational` is the COST-SNAPSHOT source of truth whenever
//      rows exist for the order AND they reconcile with the JSONB lines
//      (same multiset of productId → total quantity).
//   3. Reconciled: the relational cost snapshot REPLACES the JSONB cost fields,
//      matched positionally within each productId (nth occurrence ↔ nth row).
//      A relational row that says `unknown` therefore stays `unknown` and the
//      resolver fallback is NOT consulted for it.
//   4. Not reconciled (row counts or quantities disagree): nothing is merged —
//      merging mismatched stores would fabricate an attribution. The JSONB
//      lines are used as-is and the ORDER is degraded to `incomplete`, with
//      `sourceReconciled=false` so the residue is visible rather than silent.
//   5. No relational rows at all: unchanged legacy behaviour (JSONB only).

export interface RelationalLineSnapshot {
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  costPrice: number | null;
  packagingCost: number | null;
  insertCost: number | null;
  costStatus: CostSnapshotStatus | null;
  costSource: CostSnapshotSource | null;
}

export interface RelationalLineResolver {
  get(orderId: string): RelationalLineSnapshot[] | undefined;
}

const VALID_STATUSES: readonly string[] = ["exact", "verified_zero", "estimated", "incomplete", "unknown"];
const VALID_SOURCES: readonly string[] = ["product_current", "cost_history", "manual", "none"];

/** Batch-load the relational cost snapshots for a set of orders. */
export async function buildRelationalLineResolver(db: Db, orderIds: Set<string>): Promise<RelationalLineResolver> {
  if (orderIds.size === 0) return { get: () => undefined };
  // DEPLOYMENT COMPATIBILITY — explicit projection. See the note in
  // buildCostResolver: add_order_item_sale_price_snapshot.sql adds columns that
  // production does not yet have, and a bare select() would query them and fail
  // on deploy, before the migration runs. This projection is valid both before
  // and after that migration.
  const rows = await db
    .select(orderItemsPreMigrationColumns)
    .from(orderItems)
    .where(inArray(orderItems.orderId, [...orderIds]));
  const byOrder = new Map<string, RelationalLineSnapshot[]>();
  for (const r of rows) {
    const status = VALID_STATUSES.includes(r.costSnapshotStatus ?? "")
      ? (r.costSnapshotStatus as CostSnapshotStatus) : null;
    const source = VALID_SOURCES.includes(r.costSnapshotSource ?? "")
      ? (r.costSnapshotSource as CostSnapshotSource) : null;
    const snap: RelationalLineSnapshot = {
      orderId: r.orderId,
      productId: r.productId,
      quantity: Number(r.quantity) || 0,
      priceAtPurchase: toNumber(r.priceAtPurchase),
      // NULL stays NULL. A relational 0 is NOT promoted to a cost of zero
      // unless the row itself says the snapshot was verified.
      costPrice: resolveCostComponent(toMoneyOrNull(r.unitCostPrice), status === "verified_zero" ? "verified_zero" : null),
      packagingCost: resolveCostComponent(toMoneyOrNull(r.unitPackagingCost), status === "verified_zero" ? "verified_zero" : null),
      insertCost: resolveCostComponent(toMoneyOrNull(r.unitInsertCost), status === "verified_zero" ? "verified_zero" : null),
      costStatus: status,
      costSource: source,
    };
    const arr = byOrder.get(r.orderId) ?? [];
    arr.push(snap);
    byOrder.set(r.orderId, arr);
  }
  return { get: (orderId) => byOrder.get(orderId) };
}

export interface ReconciledLines {
  items: OrderLineItem[];
  sourceOfTruth: "relational" | "jsonb";
  /** false = relational rows exist but do not agree with the JSONB lines */
  reconciled: boolean;
}

/** Multiset key: productId → summed quantity. */
function quantityByProduct(pairs: Array<{ productId: string; quantity: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pairs) m.set(p.productId, (m.get(p.productId) ?? 0) + p.quantity);
  return m;
}

/**
 * Apply the source-of-truth policy above. PURE — no I/O, fully testable.
 */
export function reconcileOrderLines(
  jsonbItems: OrderLineItem[],
  relational: RelationalLineSnapshot[] | undefined,
): ReconciledLines {
  if (!relational || relational.length === 0) {
    return { items: jsonbItems, sourceOfTruth: "jsonb", reconciled: true };
  }
  const jsonbPairs = jsonbItems
    .filter((i) => !!i.productId)
    .map((i) => ({ productId: i.productId as string, quantity: lineQuantity(i) }));
  // Lines without a productId cannot be matched to a relational row at all.
  const unmatchableJsonb = jsonbItems.length - jsonbPairs.length;
  const jq = quantityByProduct(jsonbPairs);
  const rq = quantityByProduct(relational.map((r) => ({ productId: r.productId, quantity: r.quantity })));
  const agree =
    unmatchableJsonb === 0 &&
    jq.size === rq.size &&
    [...jq].every(([pid, qty]) => rq.get(pid) === qty) &&
    jsonbPairs.length === relational.length;
  if (!agree) {
    return { items: jsonbItems, sourceOfTruth: "jsonb", reconciled: false };
  }

  // Positional match within each productId (nth JSONB occurrence ↔ nth row).
  const queues = new Map<string, RelationalLineSnapshot[]>();
  for (const r of relational) {
    const arr = queues.get(r.productId) ?? [];
    arr.push(r);
    queues.set(r.productId, arr);
  }
  const merged = jsonbItems.map((item) => {
    const q = queues.get(item.productId as string);
    const rel = q && q.length > 0 ? q.shift()! : undefined;
    if (!rel) return item;
    // A relational row that asserts NOTHING (no status and no cost value) is not
    // evidence of "unknown" — it is an absence of information. Leave the JSONB
    // line untouched so a legitimate JSONB snapshot is never demoted.
    const asserts =
      rel.costStatus != null || rel.costPrice != null || rel.packagingCost != null || rel.insertCost != null;
    if (!asserts) return item;
    return {
      ...item,
      // cost evidence is taken WHOLESALE from the relational snapshot — never a
      // field-by-field mix of the two stores.
      costPrice: rel.costPrice,
      packagingCost: rel.packagingCost,
      insertCost: rel.insertCost,
      costStatus: rel.costStatus ?? "unknown",
      costSource: rel.costSource ?? "none",
    } satisfies OrderLineItem;
  });
  return { items: merged, sourceOfTruth: "relational", reconciled: true };
}

export function lineQuantity(item: OrderLineItem): number {
  const qty = toNumber(item.quantity);
  return qty > 0 ? qty : 1;
}

export function orderSubtotal(items: OrderLineItem[]): number {
  return items.reduce((sum, item) => {
    return sum + toNumber(item.priceAtPurchase) * lineQuantity(item);
  }, 0);
}

export function productCostFromProduct(product: ProductRow): ProductCost {
  // F-5: a stored 0 is only a cost of zero when a human verified it; otherwise
  // it is UNKNOWN (see resolveCostComponent). NULL was always unknown.
  const res = product as unknown as {
    costPriceResolution?: string | null;
    packagingCostResolution?: string | null;
    insertCostResolution?: string | null;
  };
  const costPrice = resolveCostComponent(toMoneyOrNull(product.costPrice), res.costPriceResolution);
  const packagingCost = resolveCostComponent(toMoneyOrNull(product.packagingCost), res.packagingCostResolution);
  const insertCost = resolveCostComponent(toMoneyOrNull(product.insertCost), res.insertCostResolution);
  const costKnown = costPrice != null;
  // A verified zero is EXACT evidence, not an estimate — even when read from the
  // current catalog, because "this costs nothing" does not drift with time.
  const allVerifiedZero =
    isVerifiedZero(costPrice, res.costPriceResolution) &&
    isVerifiedZero(packagingCost, res.packagingCostResolution) &&
    isVerifiedZero(insertCost, res.insertCostResolution);
  return {
    productId: product.id,
    name: product.name,
    price: toNumber(product.price),
    costPrice,
    packagingCost,
    insertCost,
    costKnown,
    costsComplete: costKnown && packagingCost != null && insertCost != null,
    costStatus: allVerifiedZero ? "verified_zero"
      : costKnown ? "estimated"   // current cost used for a past sale = estimate
      : "unknown",
    costSource: costKnown ? "product_current" : "none",
  };
}

export function productCostFromHistory(product: ProductRow, history: CostHistoryRow): ProductCost {
  // product_cost_history has no resolution columns — every zero there is
  // ambiguous by construction, so it resolves to UNKNOWN. Never guessed.
  const costPrice = resolveCostComponent(toMoneyOrNull(history.costPrice), null);
  const packagingCost = resolveCostComponent(toMoneyOrNull(history.packagingCost), null);
  const insertCost = resolveCostComponent(toMoneyOrNull(history.insertCost), null);
  const costKnown = costPrice != null;
  return {
    productId: product.id,
    name: product.name,
    price: toNumber(product.price),
    costPrice,
    packagingCost,
    insertCost,
    costKnown,
    costsComplete: costKnown && packagingCost != null && insertCost != null,
    costStatus: costKnown ? "estimated" : "unknown", // effective-dated history estimate
    costSource: costKnown ? "cost_history" : "none",
  };
}

export async function buildCostResolver(db: Db, productIds: Set<string>): Promise<CostResolver> {
  const productMap = new Map<string, ProductRow>();
  const historyMap = new Map<string, CostHistoryRow[]>();

  if (productIds.size > 0) {
    const ids = [...productIds];
    const productRows = await db.select().from(products).where(inArray(products.id, ids));
    for (const product of productRows) productMap.set(product.id, product);

    // DEPLOYMENT COMPATIBILITY — explicit projection, deliberately narrow.
    //
    // `db.select()` with no projection makes Drizzle emit every column named in
    // the schema definition. fix_product_cost_history_nullable.sql adds
    // resolution/evidence columns to this table, and that migration is NOT yet
    // applied to production. A bare select() would therefore compile a query
    // referencing `cost_price_resolution` against a database that does not have
    // it, and every accounting read would fail the moment this deploys —
    // before the migration runs.
    //
    // Listing only the pre-existing columns keeps this query valid BOTH before
    // and after the migration. Widen it in a later change, once the migration
    // has been applied and verified in production.
    const historyRows = await db
      .select(productCostHistoryPreMigrationColumns)
      .from(productCostHistory)
      .where(inArray(productCostHistory.productId, ids))
      .orderBy(desc(productCostHistory.effectiveFrom), desc(productCostHistory.createdAt));

    for (const history of historyRows) {
      const rows = historyMap.get(history.productId) ?? [];
      rows.push(history);
      historyMap.set(history.productId, rows);
    }
  }

  // Load approved cost overrides for these products
  const costOverrideRows = productIds.size > 0
    ? await db
        .select()
        .from(accountingManualAdjustments)
        .where(
          and(
            eq(accountingManualAdjustments.entityType, "product"),
            inArray(accountingManualAdjustments.entityId, [...productIds]),
          )
        )
        .orderBy(desc(accountingManualAdjustments.createdAt))
    : [];

  // Build map: productId → { fieldName → { value, reason } }
  const overrideMap = new Map<string, Map<string, { value: unknown; reason: string }>>();
  for (const row of costOverrideRows) {
    if (row.status !== "approved" && row.status !== "applied") continue;
    if (!["costPrice", "packagingCost", "insertCost"].includes(row.fieldName)) continue;
    if (!overrideMap.has(row.entityId)) overrideMap.set(row.entityId, new Map());
    // Use most recent entry per field (already sorted by DESC createdAt from DB)
    const fieldMap = overrideMap.get(row.entityId)!;
    if (!fieldMap.has(row.fieldName)) {
      fieldMap.set(row.fieldName, { value: row.newValueJson, reason: row.reason });
    }
  }

  function applyOverrides(cost: ProductCost, productId: string): ProductCost {
    const fields = overrideMap.get(productId);
    if (!fields || fields.size === 0) return cost;
    const result = { ...cost };
    let overridden = false;
    const reasons: string[] = [];
    for (const [field, { value, reason }] of fields) {
      const num = Number(value);
      if (Number.isFinite(num)) {
        (result as any)[field] = num;
        overridden = true;
        reasons.push(`${field}: ${reason}`);
      }
    }
    if (overridden) {
      result.overridden = true;
      result.overrideReason = reasons.join(" | ");
      // A manual override supplies a KNOWN cost value.
      result.costKnown = true;
      result.costStatus = "manual" === (result.costSource ?? "") ? "exact" : "estimated";
      result.costSource = "manual";
      // An override only makes the cost complete when it actually supplied a value.
      // A null costPrice is UNKNOWN — it must never read as a complete zero cost.
      result.costsComplete = result.costPrice != null && result.costPrice > 0;
    }
    return result;
  }

  return {
    getCurrent(productId: string) {
      const product = productMap.get(productId);
      if (!product) return undefined;
      return applyOverrides(productCostFromProduct(product), productId);
    },
    getEffective(productId: string, at: Date) {
      const product = productMap.get(productId);
      if (!product) return undefined;

      const rows = historyMap.get(productId) ?? [];
      const positive = (h: CostHistoryRow) => toMoneyOrNull(h.costPrice) != null && Number(h.costPrice) > 0;

      // STEP 2 — estimated_history: newest POSITIVE history row effective on or
      // before the sale date. This is the best evidence of what the item actually
      // cost at the time it was sold. `historyMap` is already sorted newest-first.
      const dateValid = rows.find(
        (h) => positive(h) && toDate(h.effectiveFrom).getTime() <= at.getTime(),
      );
      if (dateValid) {
        const cost = productCostFromHistory(product, dateValid);
        return applyOverrides({ ...cost, costBasis: "estimated_history" }, productId);
      }

      // STEP 3 — estimated_database_reference: no date-valid history, so fall back
      // to whatever the database still knows. This is a weaker estimate (it may
      // post-date the sale) and is labelled as such — never as history.
      //   3a. the current catalog cost, but only when it is positive AND the
      //       operator has explicitly resolved it as `known`.
      const currentRes = (product as unknown as { costPriceResolution?: string | null }).costPriceResolution;
      const currentCost = toMoneyOrNull(product.costPrice);
      if (currentRes === "known" && currentCost != null && currentCost > 0) {
        const cost = productCostFromProduct(product);
        return applyOverrides({ ...cost, costBasis: "estimated_database_reference" }, productId);
      }
      //   3b. otherwise the newest positive history row of any date.
      const newestPositive = rows.find(positive);
      if (newestPositive) {
        const cost = productCostFromHistory(product, newestPositive);
        return applyOverrides({ ...cost, costBasis: "estimated_database_reference" }, productId);
      }

      // STEP 4 — unknown. No positive cost evidence exists anywhere in the
      // database. Cost stays NULL: never 0, so profit and margin stay NULL too.
      const cost = productCostFromProduct(product);
      const basis: CostBasis = cost.costPrice != null ? "estimated_database_reference" : "unknown";
      return applyOverrides({ ...cost, costBasis: basis }, productId);
    },
  };
}

export function collectProductIds(orderRows: OrderRow[]): Set<string> {
  const productIds = new Set<string>();
  for (const order of orderRows) {
    for (const item of getOrderItems(order)) {
      if (item.productId) productIds.add(item.productId);
    }
  }
  return productIds;
}

export async function getOrdersForPeriod(db: Db, start: Date, end: Date): Promise<OrderRow[]> {
  return await db
    .select()
    .from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
}

export interface WhatsappInvoiceFinanceRow {
  invoiceId: string;
  invoiceNo: string;
  customerName: string;
  invoiceStatus: string;
  orderStatus: string | null;
  paymentStatus: string | null;
  total: number;
  deliveryFee: number;
  subtotal: number;
  cost: number;
  profit: number;
  costsComplete: boolean;
  financiallyIncluded: boolean;
  exclusionReason: string | null;
  orderId: string | null;
  createdAt: string;
}

export async function buildWhatsappInvoiceBreakdown(
  db: Db,
  start: Date,
  end: Date,
  costs: CostResolver
): Promise<{
  summary: {
    total: number;
    accepted: number;
    pendingDelivery: number;
    delivered: number;
    revenue: number;
    profit: number;
    costsComplete: boolean;
  };
  invoices: WhatsappInvoiceFinanceRow[];
}> {
  const invoiceRows = await db
    .select()
    .from(manualInvoices)
    .where(and(gte(manualInvoices.createdAt, start), lte(manualInvoices.createdAt, end)));

  // Fetch linked orders for all invoices that have an orderId
  const orderIds = invoiceRows.map((i) => i.orderId).filter(Boolean) as string[];
  const linkedOrders =
    orderIds.length > 0
      ? await db.select().from(orders).where(inArray(orders.id, orderIds))
      : [];
  const orderMap = new Map(linkedOrders.map((o) => [o.id, o]));

  const ACCEPTED_STATUSES = ["confirmed", "completed"] as const;

  let accepted = 0;
  let pendingDelivery = 0;
  let delivered = 0;
  let revenue = 0;
  let profit = 0;
  let anyMissingCost = false;

  const invoiceList: WhatsappInvoiceFinanceRow[] = [];

  for (const inv of invoiceRows) {
    const linkedOrder = inv.orderId ? orderMap.get(inv.orderId) : undefined;
    const orderStatus = linkedOrder?.status ?? null;
    const paymentStatus = linkedOrder?.paymentStatus ?? null;
    const invTotal = toNumber(inv.total);
    const invDelivery = toNumber(inv.delivery);
    const invSubtotal = toNumber(inv.subtotal);
    const isAccepted = (ACCEPTED_STATUSES as readonly string[]).includes(inv.status);
    const isDelivered = orderStatus === "delivered";

    if (isAccepted) accepted++;
    if (isAccepted && !isDelivered) pendingDelivery++;
    if (isDelivered) delivered++;

    // Calculate per-invoice cost using current product costs
    let invCost = 0;
    let invCostsComplete = true;
    const items = Array.isArray(inv.items)
      ? (inv.items as Array<{ productId?: string; quantity?: number }>)
      : [];
    for (const item of items) {
      const qty = toNumber(item.quantity ?? 1);
      const cost = item.productId ? costs.getCurrent(item.productId) : undefined;
      // Sum ONLY when every cost component is known; a null cost is excluded and
      // flags the invoice incomplete — never coerced to 0.
      if (!cost || cost.costPrice == null || cost.packagingCost == null || cost.insertCost == null || cost.costPrice <= 0) {
        invCostsComplete = false;
      } else {
        invCost += (cost.costPrice + cost.packagingCost + cost.insertCost) * qty;
      }
    }
    if (!invCostsComplete) anyMissingCost = true;

    // WhatsApp invoice revenue = collected_from_customer - delivery_fee
    // (same formula as website orders: net amount seller actually receives)
    const invRevenue = invSubtotal - toNumber(inv.discount ?? 0);
    const invProfit = invCostsComplete ? invRevenue - invCost : 0;

    let financiallyIncluded = false;
    let exclusionReason: string | null = null;

    if (!isAccepted) {
      exclusionReason = `حالة الفاتورة: ${inv.status} — لم يتم القبول`;
    } else if (!isDelivered) {
      exclusionReason = `بانتظار التسليم — حالة الطلبية: ${orderStatus ?? "لا يوجد طلب"}`;
    } else {
      financiallyIncluded = true;
    }

    // Check manual financiallyCounted override on invoice
    const manualFc = (inv as any).financiallyCounted;
    if (manualFc === false) {
      financiallyIncluded = false;
      exclusionReason = `مستبعد يدويًا من الحسابات${(inv as any).note ? ': ' + (inv as any).note : ''}`;
    } else if (manualFc === true && isAccepted) {
      financiallyIncluded = true;
      exclusionReason = null;
    }

    if (isDelivered) {
      revenue += invRevenue;
      profit += invProfit;
    }

    invoiceList.push({
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      customerName: inv.customerName,
      invoiceStatus: inv.status,
      orderStatus,
      paymentStatus,
      total: invTotal,
      deliveryFee: invDelivery,
      subtotal: invSubtotal,
      cost: Math.round(invCost),
      profit: Math.round(invProfit),
      costsComplete: invCostsComplete,
      financiallyIncluded,
      exclusionReason,
      orderId: inv.orderId ?? null,
      createdAt: toDate(inv.createdAt).toISOString(),
    });
  }

  return {
    summary: {
      total: invoiceRows.length,
      accepted,
      pendingDelivery,
      delivered,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      costsComplete: !anyMissingCost,
    },
    invoices: invoiceList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
}

// للربح الفعلي فقط: طلبات موصّلة
// financiallyCounted=true forces include, false forces exclude, null=auto (use status)
export async function getRealizedOrdersForPeriod(db: Db, start: Date, end: Date): Promise<OrderRow[]> {
  const all = await db
    .select()
    .from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
  return all.filter((o) => {
    const fc = (o as any).financiallyCounted;
    if (fc === false) return false;
    if (fc === true) return true;
    return REALIZED_STATUSES.includes(o.status as (typeof REALIZED_STATUSES)[number]);
  });
}

export function calcOrderProfit(
  order: OrderRow,
  costs: CostResolver,
  fulfillment?: OrderFulfillmentCost,
  relationalLines?: RelationalLineSnapshot[],
): OrderProfit {
  // F-3: apply the source-of-truth policy before any cost is read.
  const reconciliation = reconcileOrderLines(getOrderItems(order), relationalLines);
  const rawItems = reconciliation.items;
  const createdAt = toDate(order.createdAt);
  let cogs = 0;
  let missingCostLines = 0;   // lines with at least one unknown component
  let unknownCostLines = 0;   // lines with NO cost evidence at all
  let incompleteCostLines = 0;// lines with partial cost evidence
  let verifiedZeroLines = 0;
  let missingProductLines = 0;
  let estimatedCostLines = 0; // lines with no immutable snapshot → cost estimated from history/current
  // Coverage by cost-resolution rung, so the operator can see how much of the
  // number is hard evidence versus a database estimate.
  let exactCostLines = 0;
  let estimatedHistoryLines = 0;
  let estimatedReferenceLines = 0;
  // Distinct products with NO usable cost anywhere — counted by product id, not
  // by line, so 182 lines across 79 products can never be reported as 182.
  const unknownCostProductIds = new Set<string>();
  const resolvedItems: OrderProfitItem[] = [];
  let worst: CostSnapshotStatus = "exact";

  for (const item of rawItems) {
    const qty = lineQuantity(item);
    const price = toNumber(item.priceAtPurchase);

    if (!item.productId) {
      missingProductLines++;
      resolvedItems.push({ productId: "", name: "منتج غير معروف", qty, priceAtPurchase: price,
        unitCostPrice: null, unitPackagingCost: null, unitInsertCost: null, costStatus: "unknown" });
      continue;
    }

    // Prefer the immutable snapshot frozen on the line; only fall back to the
    // effective-dated resolver for older orders that predate cost snapshots.
    const snapshot = lineCostSnapshot(item);
    const cost = snapshot ?? costs.getEffective(item.productId, createdAt);
    if (!snapshot) estimatedCostLines++;
    if (!cost) {
      // The PRODUCT is known — it is right there on the order line. What is
      // missing is COST EVIDENCE, and the two must not be conflated: counting
      // this as a missing product hid it from missingCostLines entirely, so an
      // order with no usable cost reported zero missing cost lines.
      missingCostLines++;
      unknownCostLines++;
      unknownCostProductIds.add(item.productId);
      worst = worstStatus(worst, "unknown");
      resolvedItems.push({ productId: item.productId, name: item.productId, qty, priceAtPurchase: price,
        unitCostPrice: null, unitPackagingCost: null, unitInsertCost: null, costStatus: "unknown" });
      continue;
    }
    // Coverage by which rung of the hierarchy produced this line's cost.
    switch (cost.costBasis) {
      case "exact_snapshot": exactCostLines++; break;
      case "estimated_history": estimatedHistoryLines++; break;
      case "estimated_database_reference": estimatedReferenceLines++; break;
      default: break; // `unknown` is counted below, where the cost is inspected
    }

    // COMPONENT-WISE evidence. An unknown (null) component is NEVER coerced to
    // 0: it is excluded from the sum and the line is flagged. A line with SOME
    // known components still contributes those — that is `incomplete`, and it is
    // numerically identical to the old all-or-nothing rule whenever the unknown
    // components were the ambiguous zeros F-5 is about (they added 0 anyway).
    //
    // ACQUISITION COST GATES THE LINE. If `costPrice` itself is unknown the line
    // contributes NOTHING (as before) — a packaging figure alone is not a COGS.
    // If `costPrice` IS known, the line contributes it plus whichever ancillary
    // components are known. Both branches reproduce the previous arithmetic
    // exactly whenever the newly-unknown components are the ambiguous zeros F-5
    // is about, because those added 0 anyway → no monetary drift, only honesty.
    const components: Array<number | null> = [cost.costPrice, cost.packagingCost, cost.insertCost];
    const knownComponents = components.filter((v): v is number => v != null);
    const unknownComponents = components.length - knownComponents.length;

    let lineStatus: CostSnapshotStatus;
    if (cost.costPrice == null) {
      lineStatus = unknownComponents === components.length ? "unknown" : "incomplete";
      missingCostLines++;
      if (lineStatus === "unknown") {
        unknownCostLines++;
        unknownCostProductIds.add(item.productId);
      } else incompleteCostLines++;
    } else if (unknownComponents > 0) {
      lineStatus = "incomplete";
      missingCostLines++;
      incompleteCostLines++;
      cogs += knownComponents.reduce((s, v) => s + v, 0) * qty;
    } else {
      // Fully known. `estimated` REQUIRES an explicit substitution source; a
      // frozen snapshot keeps its own recorded status.
      lineStatus = snapshot
        ? (cost.costStatus ?? "exact")
        : cost.costStatus === "verified_zero"
          ? "verified_zero"
          : "estimated";
      if (lineStatus === "verified_zero") verifiedZeroLines++;
      cogs += knownComponents.reduce((s, v) => s + v, 0) * qty;
    }
    worst = worstStatus(worst, lineStatus);
    resolvedItems.push({
      productId: item.productId, name: cost.name, qty, priceAtPurchase: price,
      unitCostPrice: cost.costPrice, unitPackagingCost: cost.packagingCost, unitInsertCost: cost.insertCost,
      costStatus: lineStatus,
    });
  }

  // الإيراد = المبلغ الذي يستلمه البائع فعلاً من الشركة (مقرّب - الشحن)
  const shipping = toNumber(order.shippingCost);
  const revenue = orderCollectedAmount(order) - shipping;
  const packaging = toNumber(order.boxCost);
  const couponDiscount = toNumber(order.discountTotal);
  const loyaltyDiscount = toNumber(order.pointsDiscount);
  // الكوبونات والنقاط مدموجة في المبلغ المحصّل — تُعرض للمعلومة فقط
  const netProfit = revenue - cogs - packaging;
  const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  // ── Order rollup over the status lattice (worst line wins) ────────────────
  // A line the engine could not resolve to a product at all, or a relational /
  // JSONB disagreement, degrades the order to at least `incomplete`.
  let orderCostStatus = worst;
  if (missingProductLines > 0 || !reconciliation.reconciled) {
    orderCostStatus = worstStatus(orderCostStatus, "incomplete");
  }
  // ORDER-LEVEL VOCABULARY is deliberately narrower than the line-level lattice:
  // {exact, verified_zero, estimated, incomplete}. An order with unknown lines is
  // `incomplete` — the pre-existing, published contract that consumers (MCP,
  // dashboards, period close) already branch on. The finer distinction is not
  // lost: it is reported per line in `items[].costStatus` and counted in
  // `unknownCostLines` / `incompleteCostLines`.
  if (orderCostStatus === "unknown") orderCostStatus = "incomplete";
  // An order whose every line is a human-verified zero reports `verified_zero`
  // rather than the indistinguishable `exact` — the reader can tell that this
  // order genuinely cost nothing, not that it was fully costed at nonzero.
  if (orderCostStatus === "exact" && verifiedZeroLines > 0 && verifiedZeroLines === resolvedItems.length) {
    orderCostStatus = "verified_zero";
  }
  // Exact figures are emitted ONLY when nothing is unknown/estimated. Otherwise
  // null — a consumer literally cannot read an "exact" profit off an incomplete order.
  // `verified_zero` is exact evidence (a confirmed zero), so it does not block
  // an exact figure. Everything below it on the lattice does.
  const isExact = orderCostStatus === "exact" || orderCostStatus === "verified_zero";

  // ── Fulfillment cost (separate component). null when no confirmed snapshot or
  // incomplete — a consumer cannot read a fulfillment cost that isn't fully known.
  const fulfillmentCost = fulfillment ? fulfillment.totalFulfillmentCost : null;
  const fulfillmentStatus: CostSnapshotStatus = fulfillment ? fulfillment.status : "unknown";
  const fulfillmentExact = fulfillmentStatus === "exact" && fulfillmentCost != null;

  // Layered, NULL-propagating profit. product COGS and fulfillment are kept apart;
  // ads/overhead are NOT allocated to the order.
  const grossMerchandiseProfit = isExact ? revenue - cogs : null;
  const contributionProfit =
    isExact && fulfillmentExact ? revenue - cogs - (fulfillmentCost as number) : null;
  const contributionMargin =
    contributionProfit != null && revenue > 0 ? Math.round((contributionProfit / revenue) * 100) : null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    status: order.status ?? "pending",
    createdAt: createdAt.toISOString(),
    revenue,
    cogs,
    packaging,
    boxCost: packaging,
    couponDiscount,
    loyaltyDiscount,
    shipping,
    netProfit,
    margin,
    costsComplete: missingCostLines === 0 && missingProductLines === 0,
    missingCostLines,
    missingProductLines,
    estimatedCostLines,
    unknownCostLines,
    incompleteCostLines,
    verifiedZeroLines,
    // Cost-basis coverage. Lines by rung, plus DISTINCT products with no cost.
    exactCostLines,
    estimatedHistoryLines,
    estimatedReferenceLines,
    missingCostProducts: unknownCostProductIds.size,
    costSourceOfTruth: reconciliation.sourceOfTruth,
    sourceReconciled: reconciliation.reconciled,
    costStatus: orderCostStatus,
    exactCogs: isExact ? cogs : null,
    exactNetProfit: isExact ? netProfit : null,
    fulfillmentCost,
    fulfillmentStatus,
    grossMerchandiseProfit,
    contributionProfit,
    contributionMargin,
    items: resolvedItems,
  };
}

/**
 * Full per-order profitability (product COGS + fulfillment + layered profit) for a
 * single order — the source for the per-order profitability page. Reads immutable
 * snapshots only; changing a current material/product cost never rewrites this.
 */
export async function computeOrderProfitability(db: Db, order: OrderRow): Promise<OrderProfit> {
  const costs = await buildCostResolver(db, collectProductIds([order]));
  const fulfillment = await buildFulfillmentResolver(db, new Set([order.id]));
  const relational = await buildRelationalLineResolver(db, new Set([order.id]));
  return calcOrderProfit(order, costs, fulfillment.get(order.id), relational.get(order.id));
}

export interface PeriodFinancials {
  deliveredOrders: number;
  revenue: number;
  cogs: number;
  packaging: number;
  grossProfit: number;
  expensesTotal: number;
  salesReturnDeduction: number;
  actualReturnLoss: number;
  finalNetProfit: number;
  // Completeness: revenue is exact (collected-based), but cogs/profit are only
  // exact when EVERY delivered order had fully-known cost. Otherwise these profit
  // figures are estimates over known-cost lines, and exact* are null.
  costComplete: boolean;
  ordersWithIncompleteCost: number;
  costStatus: CostSnapshotStatus;
  exactCogs: number | null;
  exactFinalNetProfit: number | null;
}

/**
 * Single source of truth for a period's key financials. Used by BOTH the
 * period-close snapshot and the reconciliation recompute, so any difference
 * between "frozen" and "recomputed" reflects real data drift — never a
 * computation mismatch.
 */
export async function computePeriodFinancials(db: Db, start: Date, end: Date): Promise<PeriodFinancials> {
  const realizedOrders = await getRealizedOrdersForPeriod(db, start, end);
  const costs = await buildCostResolver(db, collectProductIds(realizedOrders));
  // F-3: relational cost snapshots are the source of truth where they exist.
  const relational = await buildRelationalLineResolver(db, new Set(realizedOrders.map((o) => o.id)));

  let revenue = 0, cogs = 0, packaging = 0, ordersWithIncompleteCost = 0;
  for (const order of realizedOrders) {
    const p = calcOrderProfit(order, costs, undefined, relational.get(order.id));
    revenue += p.revenue;
    cogs += p.cogs;
    packaging += p.boxCost;
    if (p.costStatus === "incomplete") ordersWithIncompleteCost++;
  }
  const costComplete = ordersWithIncompleteCost === 0;
  const grossProfit = revenue - cogs;
  const netProfitBeforeReturns = revenue - cogs - packaging;

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)));
  const expensesTotal = expenseRows.reduce((s, e) => s + toNumber(e.amount), 0);

  const returnRows = await db
    .select()
    .from(orderReturnEvents)
    .where(and(gte(orderReturnEvents.createdAt, start), lte(orderReturnEvents.createdAt, end)));
  const verified = returnRows.filter((e) => e.status === "verified");
  const salesReturnDeduction = verified.reduce((s, e) => s + eventSalesReturnDeduction(e), 0);
  const actualReturnLoss = verified.reduce((s, e) => s + eventActualReturnLoss(e), 0);

  const finalNetProfit = netProfitBeforeReturns - salesReturnDeduction - actualReturnLoss - expensesTotal;

  return {
    deliveredOrders: realizedOrders.length,
    revenue: Math.round(revenue),
    cogs: Math.round(cogs),
    packaging: Math.round(packaging),
    grossProfit: Math.round(grossProfit),
    expensesTotal: Math.round(expensesTotal),
    salesReturnDeduction: Math.round(salesReturnDeduction),
    actualReturnLoss: Math.round(actualReturnLoss),
    finalNetProfit: Math.round(finalNetProfit),
    costComplete,
    ordersWithIncompleteCost,
    costStatus: costComplete ? "exact" : "incomplete",
    exactCogs: costComplete ? Math.round(cogs) : null,
    exactFinalNetProfit: costComplete ? Math.round(finalNetProfit) : null,
  };
}

/** Resolve a "YYYY-MM" period key into its exact start/end timestamps. */
export function monthKeyToRange(periodKey: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return null;
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

export function serializeCostHistory(history: CostHistoryRow) {
  return {
    id: history.id,
    productId: history.productId,
    costPrice: toNumber(history.costPrice),
    packagingCost: toNumber(history.packagingCost),
    insertCost: toNumber(history.insertCost),
    effectiveFrom: toDate(history.effectiveFrom).toISOString(),
    note: history.note ?? null,
    changedBy: history.changedBy ?? null,
    createdAt: toDate(history.createdAt).toISOString(),
  };
}

// ═══════════════════ Double-Entry Ledger (derived) ═══════════════════════════
// A real-accounting view DERIVED from existing data (orders/expenses/returns).
// Every transaction posts a BALANCED journal entry (debits === credits), so the
// trial balance is guaranteed to net to zero. The ledger's net income must equal
// computePeriodFinancials().finalNetProfit — that equality is the integrity proof.

export type AccountType = "asset" | "liability" | "revenue" | "expense" | "contra_revenue";

export interface LedgerAccount {
  code: string;
  name: string;
  type: AccountType;
  normal: "debit" | "credit";
}

const CHART_OF_ACCOUNTS: LedgerAccount[] = [
  { code: "1000", name: "الصندوق (نقد محصّل)", type: "asset", normal: "debit" },
  { code: "1100", name: "ذمم COD (معلّق لدى الناقل)", type: "asset", normal: "debit" },
  { code: "1200", name: "المخزون", type: "asset", normal: "debit" },
  { code: "3000", name: "إيرادات المبيعات", type: "revenue", normal: "credit" },
  { code: "4000", name: "كلفة البضاعة المباعة", type: "expense", normal: "debit" },
  { code: "4100", name: "مردودات المبيعات", type: "contra_revenue", normal: "debit" },
  { code: "4200", name: "خسائر الراجعات", type: "expense", normal: "debit" },
  { code: "5000", name: "مصاريف تشغيلية", type: "expense", normal: "debit" },
  { code: "5100", name: "تكلفة الكراتين", type: "expense", normal: "debit" },
];

export interface LedgerResult {
  trialBalance: { code: string; name: string; type: AccountType; debit: number; credit: number; balance: number }[];
  totals: { totalDebit: number; totalCredit: number; difference: number; balanced: boolean };
  incomeStatement: {
    revenue: number;
    salesReturns: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    packaging: number;
    returnsLoss: number;
    operatingExpenses: number;
    netIncome: number;
  };
  integrity: { ledgerNetIncome: number; computedFinalNetProfit: number; difference: number; matches: boolean };
  counts: { orders: number; expenses: number; returns: number; journalEntries: number };
}

export async function buildLedger(db: Db, start: Date, end: Date): Promise<LedgerResult> {
  // Posting accumulator: per-account debit/credit totals.
  const acc = new Map<string, { debit: number; credit: number }>();
  for (const a of CHART_OF_ACCOUNTS) acc.set(a.code, { debit: 0, credit: 0 });
  const post = (code: string, debit: number, credit: number) => {
    const e = acc.get(code);
    if (!e) return;
    e.debit += debit;
    e.credit += credit;
  };
  let journalEntries = 0;

  // 1. Realized (delivered) orders → revenue, COGS, packaging
  const realizedOrders = await getRealizedOrdersForPeriod(db, start, end);
  const costs = await buildCostResolver(db, collectProductIds(realizedOrders));
  // F-3: relational cost snapshots are the source of truth where they exist.
  const relationalLedger = await buildRelationalLineResolver(db, new Set(realizedOrders.map((o) => o.id)));
  for (const order of realizedOrders) {
    const p = calcOrderProfit(order, costs, undefined, relationalLedger.get(order.id));
    const cashAccount = (order as any).codReceived === true ? "1000" : "1100";
    // Sale: Dr Cash/Receivable, Cr Revenue
    post(cashAccount, p.revenue, 0);
    post("3000", 0, p.revenue);
    // COGS: Dr COGS, Cr Inventory
    if (p.cogs > 0) {
      post("4000", p.cogs, 0);
      post("1200", 0, p.cogs);
    }
    // Packaging (box): Dr Packaging expense, Cr Cash
    if (p.boxCost > 0) {
      post("5100", p.boxCost, 0);
      post("1000", 0, p.boxCost);
    }
    journalEntries++;
  }

  // 2. Operating expenses → Dr Operating, Cr Cash
  const expenseRows = await db
    .select()
    .from(expenses)
    .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)));
  for (const e of expenseRows) {
    const amt = toNumber(e.amount);
    if (amt === 0) continue;
    post("5000", amt, 0);
    post("1000", 0, amt);
    journalEntries++;
  }

  // 3. Verified returns → sales returns (refund) + operational loss
  const returnRows = await db
    .select()
    .from(orderReturnEvents)
    .where(and(gte(orderReturnEvents.createdAt, start), lte(orderReturnEvents.createdAt, end)));
  const verified = returnRows.filter((e) => e.status === "verified");
  for (const e of verified) {
    const refund = eventSalesReturnDeduction(e);
    const loss = eventActualReturnLoss(e);
    if (refund > 0) {
      post("4100", refund, 0); // Dr Sales Returns (contra-revenue)
      post("1000", 0, refund); // Cr Cash (refund paid out)
    }
    if (loss > 0) {
      post("4200", loss, 0); // Dr Returns Loss
      post("1200", 0, loss); // Cr Inventory (written off / not restocked)
    }
    if (refund > 0 || loss > 0) journalEntries++;
  }

  // Build trial balance
  const trialBalance = CHART_OF_ACCOUNTS.map((a) => {
    const e = acc.get(a.code) ?? { debit: 0, credit: 0 };
    const balance = a.normal === "debit" ? e.debit - e.credit : e.credit - e.debit;
    return { code: a.code, name: a.name, type: a.type, debit: Math.round(e.debit), credit: Math.round(e.credit), balance: Math.round(balance) };
  });

  const totalDebit = Math.round(trialBalance.reduce((s, a) => s + a.debit, 0));
  const totalCredit = Math.round(trialBalance.reduce((s, a) => s + a.credit, 0));
  const difference = totalDebit - totalCredit;

  // Income statement from ledger accounts
  const bal = (code: string) => trialBalance.find((a) => a.code === code)?.balance ?? 0;
  const revenue = bal("3000");
  const salesReturns = bal("4100");
  const cogs = bal("4000");
  const returnsLoss = bal("4200");
  const operatingExpenses = bal("5000");
  const packaging = bal("5100");
  const netRevenue = revenue - salesReturns;
  const grossProfit = netRevenue - cogs;
  const netIncome = grossProfit - packaging - returnsLoss - operatingExpenses;

  // Integrity: ledger net income MUST equal the Phase-3 computation
  const fin = await computePeriodFinancials(db, start, end);
  const ledgerVsComputed = netIncome - fin.finalNetProfit;

  return {
    trialBalance,
    totals: { totalDebit, totalCredit, difference, balanced: difference === 0 },
    incomeStatement: { revenue, salesReturns, netRevenue, cogs, grossProfit, packaging, returnsLoss, operatingExpenses, netIncome },
    integrity: { ledgerNetIncome: netIncome, computedFinalNetProfit: fin.finalNetProfit, difference: ledgerVsComputed, matches: ledgerVsComputed === 0 },
    counts: { orders: realizedOrders.length, expenses: expenseRows.length, returns: verified.length, journalEntries },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL per-order cost breakdown (the shape every consumer must read).
//
// This is the ONLY place the breakdown is assembled. Route handlers, React
// components, AI tools and exports must call this — none of them may recompute
// revenue, COGS or profit. Every field is NULL when its inputs are unknown; a
// partial figure is never presented as a total.
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderCostBreakdown {
  orderId: string;
  orderNumber: string | null;
  status: string;
  createdAt: string;

  /** What the customer actually paid (COD collected, after rounding). */
  collectedAmount: number;
  /** Collected minus the shipping the courier keeps — the seller's revenue. */
  revenue: number;

  // ── Direct costs, kept in strictly disjoint components ──────────────────
  /** Product acquisition only (what AQUAVO paid the supplier for the goods). */
  productCogs: number | null;
  /** Packaging/inserts that arrive FROM the supplier with the product. */
  supplierPackaging: number | null;
  /** AQUAVO's OWN fulfillment materials, from the immutable event snapshots. */
  aquavoFulfillmentCost: number | null;
  originalShipmentCost: number | null;
  reshipmentCost: number | null;
  returnHandlingCost: number | null;
  replacementCost: number | null;
  /** Courier / last-mile delivery. */
  courierCost: number | null;
  commissions: number | null;
  paymentFees: number | null;
  otherDirectCosts: number | null;

  /** Sum of the components above. NULL when ANY component is unknown. */
  totalKnownDirectCost: number | null;
  /** revenue − totalKnownDirectCost. NULL unless every input is known. */
  contributionProfit: number | null;
  contributionMargin: number | null;

  /** Amounts that exist but cannot be attributed to a component yet. */
  unallocated: {
    /** Legacy per-order boxCost not yet migrated into a fulfillment event. */
    legacyBoxCost: number | null;
    /** Lines whose product cost is unknown. */
    unknownProductLines: number;
    /** Fulfillment lines whose unit cost is unknown. */
    unknownFulfillmentLines: number;
    /** Value of reversed fulfillment events (informational, excluded from totals). */
    reversedFulfillmentCost: number;
  };

  /** exact = every input known; estimated = some derived; incomplete = something unknown. */
  dataStatus: CostSnapshotStatus;
  productCostStatus: CostSnapshotStatus;
  fulfillmentCostStatus: CostSnapshotStatus;
  items: OrderProfitItem[];
}

/** Extra deterministic direct costs an order may carry (courier/fees/commissions). */
export interface DirectCostInputs {
  courierCost?: number | null;
  commissions?: number | null;
  paymentFees?: number | null;
  otherDirectCosts?: number | null;
}

/**
 * Assemble the canonical breakdown from an already-computed OrderProfit plus the
 * fulfillment snapshot. Pure — no I/O — so it is trivially unit-testable.
 */
export function buildOrderCostBreakdown(
  order: OrderRow,
  profit: OrderProfit,
  fulfillment: OrderFulfillmentCost | undefined,
  direct: DirectCostInputs = {},
): OrderCostBreakdown {
  // Split product COGS into acquisition vs supplier packaging using the same
  // per-line evidence calcOrderProfit already resolved. A line with any unknown
  // component contributes to NEITHER total (it is counted as unknown instead).
  let acquisition: number | null = 0;
  let supplierPackaging: number | null = 0;
  let unknownProductLines = 0;
  for (const it of profit.items) {
    if (it.unitCostPrice == null || it.unitPackagingCost == null || it.unitInsertCost == null) {
      unknownProductLines++;
      acquisition = null;
      supplierPackaging = null;
      continue;
    }
    if (acquisition != null) acquisition += it.unitCostPrice * it.qty;
    if (supplierPackaging != null) supplierPackaging += (it.unitPackagingCost + it.unitInsertCost) * it.qty;
  }
  if (profit.items.length === 0) { acquisition = null; supplierPackaging = null; }

  const courierCost = direct.courierCost ?? toMoneyOrNull(order.shippingCost);
  const commissions = direct.commissions ?? null;
  const paymentFees = direct.paymentFees ?? null;
  const otherDirectCosts = direct.otherDirectCosts ?? null;

  // A component that is genuinely ABSENT (no commission on a COD order) is 0;
  // a component that is UNKNOWN is null and poisons the total. We treat the
  // caller-supplied direct costs as "absent = 0" only when explicitly passed.
  const components: Array<number | null> = [
    acquisition,
    supplierPackaging,
    fulfillment ? fulfillment.totalFulfillmentCost : null,
    courierCost,
    commissions ?? 0,
    paymentFees ?? 0,
    otherDirectCosts ?? 0,
  ];
  const anyUnknown = components.some((c) => c == null);
  const totalKnownDirectCost = anyUnknown
    ? null
    : components.reduce<number>((sum, c) => sum + (c as number), 0);

  const contributionProfit = totalKnownDirectCost == null ? null : profit.revenue - totalKnownDirectCost;
  const contributionMargin =
    contributionProfit != null && profit.revenue > 0
      ? Math.round((contributionProfit / profit.revenue) * 100)
      : null;

  const overall: CostSnapshotStatus =
    (profit.costStatus === "incomplete" || (fulfillment?.status ?? "unknown") === "incomplete"
      || anyUnknown) ? "incomplete"
    : (profit.costStatus === "estimated" || fulfillment?.status === "estimated") ? "estimated"
    : (profit.costStatus === "exact" && fulfillment?.status === "exact") ? "exact"
    : "unknown";

  return {
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    status: order.status ?? "pending",
    createdAt: profit.createdAt,
    collectedAmount: orderCollectedAmount(order),
    revenue: profit.revenue,
    productCogs: acquisition,
    supplierPackaging,
    aquavoFulfillmentCost: fulfillment ? fulfillment.totalFulfillmentCost : null,
    originalShipmentCost: fulfillment ? fulfillment.originalFulfillmentCost : null,
    reshipmentCost: fulfillment ? fulfillment.reshipmentCost : null,
    returnHandlingCost: fulfillment ? fulfillment.returnHandlingCost : null,
    replacementCost: fulfillment ? fulfillment.replacementCost : null,
    courierCost,
    commissions,
    paymentFees,
    otherDirectCosts,
    totalKnownDirectCost,
    contributionProfit,
    contributionMargin,
    unallocated: {
      legacyBoxCost: toMoneyOrNull(order.boxCost),
      unknownProductLines,
      unknownFulfillmentLines: fulfillment?.unknownLines ?? 0,
      reversedFulfillmentCost: fulfillment?.reversedCost ?? 0,
    },
    dataStatus: overall,
    productCostStatus: profit.costStatus,
    fulfillmentCostStatus: fulfillment?.status ?? "unknown",
    items: profit.items,
  };
}

/** Load an order and return its canonical breakdown. The API's single entry point. */
export async function computeOrderCostBreakdown(
  db: Db,
  orderId: string,
  direct: DirectCostInputs = {},
): Promise<OrderCostBreakdown | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const costs = await buildCostResolver(db, collectProductIds([order]));
  const fulfillment = await buildFulfillmentResolver(db, new Set([order.id]));
  const snapshot = fulfillment.get(order.id);
  const relational = await buildRelationalLineResolver(db, new Set([order.id]));
  const profit = calcOrderProfit(order, costs, snapshot, relational.get(order.id));
  return buildOrderCostBreakdown(order, profit, snapshot, direct);
}

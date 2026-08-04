import { COD_REFUSAL_STATUSES } from "./cod-refusal-policy.js";

// ─────────────────────────────────────────────────────────────────────────────
// Canonical order-financial definitions — SINGLE SOURCE OF TRUTH.
//
// Every admin/analytics/accounting screen MUST derive revenue, realized status,
// collected amount, and rounding from THIS file. Do not re-implement these rules
// elsewhere (Stage A found three divergent revenue formulas across the codebase).
//
// Money note: IQD is stored as whole dinars; amounts arrive from Neon `numeric`
// columns as strings. Always pass them through `toMoney()` — never raw Number()
// scattered across call sites, and never floats for money math.
// ─────────────────────────────────────────────────────────────────────────────

/** Order statuses that count as realized revenue (customer actually received & paid). */
export const REALIZED_STATUSES = ["delivered"] as const;

/** Order statuses that must NEVER count toward revenue or profit. */
export const CANCELLED_STATUSES = [
  "cancelled",
  ...COD_REFUSAL_STATUSES,
  "returned",
] as const;

/** Order statuses still in flight — not yet realized, not cancelled. */
export const IN_PROGRESS_STATUSES = ["pending", "confirmed", "processing", "shipped"] as const;

const REALIZED_SET = new Set<string>(REALIZED_STATUSES);
const CANCELLED_SET = new Set<string>(CANCELLED_STATUSES);
const IN_PROGRESS_SET = new Set<string>(IN_PROGRESS_STATUSES);

function normStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

/** True when the order is delivered and its revenue is realized. */
export function isRealizedStatus(status: string | null | undefined): boolean {
  return REALIZED_SET.has(normStatus(status));
}

/** True when the order is cancelled/rejected/returned and must be excluded from revenue. */
export function isCancelledStatus(status: string | null | undefined): boolean {
  return CANCELLED_SET.has(normStatus(status));
}

/** True when the order is still in progress (not realized, not cancelled). */
export function isInProgressStatus(status: string | null | undefined): boolean {
  return IN_PROGRESS_SET.has(normStatus(status));
}

/**
 * Statuses an order can only reach AFTER it was delivered. A return does not
 * un-deliver the sale: the original revenue and cost happened, and the return
 * is a separate, later event. COD refusal statuses are deliberately absent —
 * they happen before customer acceptance and never realise a sale.
 */
export const POST_DELIVERY_STATUSES = ["returned"] as const;
const POST_DELIVERY_SET = new Set<string>(POST_DELIVERY_STATUSES);

/**
 * FINANCIAL REALIZATION — the single rule that decides whether an order's
 * historical financial facts are frozen.
 *
 * This deliberately does NOT depend on cost completeness. The previous design
 * froze a line only when its cost snapshot was `exact` or `verified_zero`;
 * because 0 of 114 catalogue products can currently produce either, that meant
 * `price_at_purchase`, `quantity` and `total_price` were editable on every real
 * order. An unknown COST must stay unknown — but that is no licence to rewrite
 * the SALE price or the quantity that was actually shipped.
 *
 * Frozen when ANY of:
 *   - the order is delivered (revenue realized), or
 *   - it has moved to a true post-delivery state (`returned`), or
 *   - an operator explicitly forced it into the financial set
 *     (`financiallyCounted === true`).
 *
 * NOT frozen: pending / confirmed / processing / shipped / cancelled and every
 * COD refusal status. None has produced realized revenue, so ordinary order
 * correction must remain possible and no sale may be fabricated.
 *
 * `financiallyCounted === false` does NOT unfreeze a delivered order. Excluding
 * an order from revenue is a reporting decision; it does not un-happen the sale,
 * and the exclusion can be reversed later.
 */
export function isFinanciallyRealizedOrder(input: {
  status: string | null | undefined;
  financiallyCounted?: boolean | null;
}): boolean {
  if (input.financiallyCounted === true) return true;
  const s = normStatus(input.status);
  return REALIZED_SET.has(s) || POST_DELIVERY_SET.has(s);
}

/** Money-safe numeric coercion: non-finite / null / garbage → 0 (never NaN).
 *  Use ONLY for values where 0 is a correct default (e.g. revenue/shipping that
 *  is genuinely absent). NEVER use for cost evidence — see toMoneyOrNull. */
export function toMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Nullable money coercion for ACCOUNTING EVIDENCE (costs): unknown/absent/invalid
 *  stays `null` (never silently 0). A real `0` (or "0") is preserved as `0`.
 *  This is the guard against overstating profit from an unknown cost. */
export function toMoneyOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** IQD rounding granularity used at checkout and for COD collection. */
export const ROUNDING_STEP = 250;

/**
 * The amount actually charged to the customer, rounded to the nearest 250 IQD.
 * This mirrors the fallback used when `roundedTotal` was not persisted.
 */
export function roundCollected(rawTotal: unknown): number {
  const raw = toMoney(rawTotal);
  return Math.round(raw / ROUNDING_STEP) * ROUNDING_STEP;
}

/** Minimal shape needed to compute the collected amount for an order. */
export interface CollectedAmountOrder {
  total: string | number | null;
  roundedTotal?: string | number | null;
}

/**
 * The real amount the customer pays / the delivery agent collects.
 * Prefers the persisted `roundedTotal`; falls back to rounding `total`.
 * This is the ONE definition of "amount collected" — COD notifications,
 * receivables, and revenue must all use it (Stage A: cashback COD-overcharge bug
 * came from reading raw `total` instead of this).
 */
export function orderCollectedAmount(order: CollectedAmountOrder): number {
  if (order.roundedTotal != null) return toMoney(order.roundedTotal);
  return roundCollected(order.total);
}

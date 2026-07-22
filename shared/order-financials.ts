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
  "rejected",
  "rejected_returned",
  "rejected_carrier",
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

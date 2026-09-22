// FILE: client/src/lib/ad-currency.ts
// AQUAVO — currency normalisation for ad-platform events
//
// Meta ad accounts cannot bill or optimise in Iraqi dinar: IQD is absent from
// Meta's supported-currency table, so fbevents.js rejects every event that
// carries `currency: "IQD"` with "Invalid parameter format for currency" and
// the `value` is dropped. Value-based optimisation (ROAS bidding, value
// lookalikes) therefore never sees a single order.
//
// The fix is to report ad values in USD. Meta needs a supported currency and a
// value that is CONSISTENT across events; it does not need the exact market
// rate on the day, because its optimisation compares orders against each
// other (a 23,000 IQD order is always ~1.5x a 15,000 IQD one whatever the
// rate). Internal analytics (PostHog, GA4) keep the IQD figure.
//
// Iraq has no single rate: the CBI official rate is 1,310 while retail is
// priced against the parallel market (Kifah / Harithiya), which moves. The
// parallel rate is what AQUAVO's prices are actually built on, so that is the
// one used here. Override it per deployment with VITE_META_IQD_PER_USD when
// the market moves enough to matter (a change needs a redeploy; Vite inlines
// env values at build time).

/** The only currency AQUAVO reports to Meta. Must be a Meta-supported ISO 4217 code. */
export const META_AD_CURRENCY = "USD";

/** Parallel-market fallback (Baghdad, Sept 2026: ~1,580–1,600 IQD per USD). */
const DEFAULT_IQD_PER_USD = 1600;

function readRateOverride(): number | undefined {
  const n = Number(import.meta.env.VITE_META_IQD_PER_USD);
  // Anything outside a sane band is a typo, not a market move.
  return Number.isFinite(n) && n >= 1000 && n <= 3000 ? n : undefined;
}

/** IQD per 1 USD used for ad values: the env override when set and sane, else the fallback. */
export const IQD_PER_USD = readRateOverride() ?? DEFAULT_IQD_PER_USD;

/**
 * Convert an IQD amount to the USD value sent to Meta, rounded to cents.
 * Non-finite or negative input becomes 0 rather than a NaN that Meta drops.
 */
export function iqdToAdValue(iqd: number): number {
  if (!Number.isFinite(iqd) || iqd <= 0) return 0;
  return Math.round((iqd / IQD_PER_USD) * 100) / 100;
}

// FILE: client/src/lib/ad-currency.ts
// AQUAVO — currency normalisation for ad-platform events
//
// Meta ad accounts cannot bill or optimise in Iraqi dinar: IQD is absent from
// Meta's supported-currency table, so fbevents.js rejects every event that
// carries `currency: "IQD"` with "Invalid parameter format for currency" and
// the `value` is dropped. Value-based optimisation (ROAS bidding, value
// lookalikes) therefore never sees a single order.
//
// The fix is to report ad values in USD at a fixed, documented rate. Meta only
// needs a consistent, supported currency; it does not need the exact market
// rate on the day. Internal analytics (PostHog, GA4) keep the IQD figure.

/** The only currency AQUAVO reports to Meta. Must be a Meta-supported ISO 4217 code. */
export const META_AD_CURRENCY = "USD";

/** Central Bank of Iraq official rate (1 USD = 1,310 IQD, fixed since Feb 2023). */
export const IQD_PER_USD = 1310;

/**
 * Convert an IQD amount to the USD value sent to Meta, rounded to cents.
 * Non-finite or negative input becomes 0 rather than a NaN that Meta drops.
 */
export function iqdToAdValue(iqd: number): number {
  if (!Number.isFinite(iqd) || iqd <= 0) return 0;
  return Math.round((iqd / IQD_PER_USD) * 100) / 100;
}

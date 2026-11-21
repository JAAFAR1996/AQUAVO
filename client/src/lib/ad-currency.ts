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

import { iqdToAdValueAtRate, resolveAdCurrencyRate } from "@shared/ad-currency";
export { META_AD_CURRENCY } from "@shared/ad-currency";
export const IQD_PER_USD = resolveAdCurrencyRate(import.meta.env.VITE_META_IQD_PER_USD);
export function iqdToAdValue(iqd: number): number {
  return iqdToAdValueAtRate(iqd, IQD_PER_USD);
}

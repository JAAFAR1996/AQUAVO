/** Shared ad reporting conversion. This does not change storefront prices or rounding. */
export const META_AD_CURRENCY = "USD";
export const DEFAULT_IQD_PER_USD = 1600;

export function resolveAdCurrencyRate(value: unknown): number {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 1000 && rate <= 3000 ? rate : DEFAULT_IQD_PER_USD;
}

export function iqdToAdValueAtRate(iqd: number, rate: number): number {
  if (!Number.isFinite(iqd) || iqd <= 0) return 0;
  return Math.round(iqd / resolveAdCurrencyRate(rate) * 100) / 100;
}

export function metaPurchaseEventId(publicOrderId: string): string {
  return `aquavo-purchase-${publicOrderId}`;
}

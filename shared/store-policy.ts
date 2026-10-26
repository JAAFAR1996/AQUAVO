/** Runtime merchant values originate in public.settings, not a frontend build. */
export const DEFAULT_CUSTOMER_SHIPPING_FEE_IQD = 5000;

/** Used only when the database setting is unavailable or invalid. */
export function customerShippingFee(value: unknown): number {
  if (value === null || value === undefined || value === "") return DEFAULT_CUSTOMER_SHIPPING_FEE_IQD;
  const fee = Number(value);
  return Number.isFinite(fee) && fee > 0 ? fee : DEFAULT_CUSTOMER_SHIPPING_FEE_IQD;
}

import { toPublicOrderItem } from "./public-product.js";

/** Customer-owned order DTO: future private columns are excluded by default. */
const FIELDS = [
  "id", "orderNumber", "status", "paymentStatus", "paymentMethod", "paymentRecordStatus",
  "total", "roundedTotal", "shippingCost", "discountTotal", "pointsUsed", "cashbackUsed",
  "pointsDiscount", "pointsEarned", "roundingCashback", "createdAt", "updatedAt",
  "customerName", "customerEmail", "customerPhone", "shippingAddress",
] as const;
const LOYALTY_FIELDS = ["pointsEarned", "cashbackEarned", "cashbackUsed", "roundedTotal", "tier", "tierUpgraded"] as const;
const ADDRESS_FIELDS = ["address", "addressLine1", "addressLine2", "city", "governorate", "country", "postalCode", "phone"] as const;
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function pick(value: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
}
export function toCustomerOrder(value: unknown): Record<string, unknown> {
  const source = record(value);
  const result = pick(source, FIELDS);
  result.items = Array.isArray(source.items) ? source.items.map(toPublicOrderItem) : [];
  if (typeof source.shippingAddress === "object" && source.shippingAddress !== null) {
    result.shippingAddress = pick(record(source.shippingAddress), ADDRESS_FIELDS);
  }
  if (source.loyalty) result.loyalty = pick(record(source.loyalty), LOYALTY_FIELDS);
  return result;
}

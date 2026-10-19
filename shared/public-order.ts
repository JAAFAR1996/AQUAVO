import { toPublicOrderItem } from "./public-product.js";
// One customer response boundary for create, replay, list and detail.
const FIELDS=["id","orderNumber","userId","status","paymentStatus","total","roundedTotal","shippingCost",
  "discountTotal","shippingAddress","customerName","customerPhone","customerEmail","carrier","createdAt","updatedAt",
  "pointsUsed","cashbackUsed","pointsDiscount","pointsEarned","roundingCashback","deliveredAt"] as const;
export function toPublicOrder(input:unknown):Record<string,any> {
  if (!input || typeof input!=="object" || Array.isArray(input)) return {};
  const source=input as Record<string,any>,out:Record<string,any>={};
  for (const key of FIELDS) if (source[key]!==undefined) out[key]=source[key];
  out.items=Array.isArray(source.items)?source.items.map(toPublicOrderItem):[];
  return JSON.parse(JSON.stringify(out,(_key,value)=>typeof value==="bigint"?String(value):value));
}

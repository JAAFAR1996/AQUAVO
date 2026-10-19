import { createHash, timingSafeEqual } from "node:crypto";
export interface CheckoutLine { productId:string; quantity:number; variantId?:string; }
export class CheckoutConflict extends Error {
  readonly status=409;
  constructor() { super("تعذر إعادة استخدام محاولة الطلب. ارجع إلى طلبك الأصلي أو تواصل مع الدعم."); }
}
export function sessionHash(sessionId:string):string {
  if (!sessionId) throw new CheckoutConflict();
  return createHash("sha256").update(`checkout-session-v1:${sessionId}`).digest("hex");
}
export function normalizeCheckoutLines(items:CheckoutLine[]):CheckoutLine[] {
  const map=new Map<string,CheckoutLine>();
  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity<=0) throw new Error("Invalid order quantity");
    const variantId=item.variantId?.trim() || undefined;
    const key=JSON.stringify([item.productId,variantId ?? null]);
    const quantity=(map.get(key)?.quantity ?? 0)+item.quantity;
    if (quantity>100) throw new Error("Invalid order quantity: maximum 100 per option");
    map.set(key,{productId:item.productId,quantity,...(variantId?{variantId}:{})});
  }
  // Shared lock order across COD/online transactions, independent of cart order.
  return [...map.values()].sort((a,b)=>a.productId<b.productId?-1:a.productId>b.productId?1:
    (a.variantId ?? "").localeCompare(b.variantId ?? ""));
}
export function checkoutRequestHash(input: {
  items:CheckoutLine[]; customerInfo:{name:string;phone:string;address:string;email?:string};
  couponCode?:string; useCashback?:boolean; cashbackToUse?:number;
}):string {
  const c=input.customerInfo;
  const canonical={v:1,items:normalizeCheckoutLines(input.items),customer:{name:c.name.trim(),phone:c.phone.trim(),
    address:c.address.trim(),email:(c.email ?? "").trim().toLowerCase()},coupon:(input.couponCode ?? "").trim().toUpperCase(),
    useCashback:input.useCashback===true,cashbackToUse:input.useCashback?Number(input.cashbackToUse ?? 0):0};
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
function digestEquals(a:unknown,b:string):boolean {
  return typeof a==="string" && /^[0-9a-f]{64}$/.test(a) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
}
export function assertCheckoutReplay(order:{userId?:string|null;checkoutSessionHash?:string|null;checkoutRequestHash?:string|null},
  actor:{userId?:string|null;sessionId:string;requestHash:string}):void {
  const owns=order.userId ? Boolean(actor.userId && actor.userId===order.userId)
    : digestEquals(order.checkoutSessionHash,sessionHash(actor.sessionId));
  if (!owns || !digestEquals(order.checkoutRequestHash,actor.requestHash)) throw new CheckoutConflict();
}

import { sql } from "drizzle-orm";
import type { Coupon } from "../../shared/schema.js";
interface CouponContext { userId:string|null; subtotal:number; excludeOrderId?:string; }
function rows(result:any):any[] { return Array.isArray(result)?result:result?.rows ?? []; }
export class CouponPolicyError extends Error { constructor(message:string,readonly status=400){super(message);} }
export function couponBenefit(coupon:Pick<Coupon,"type"|"value">,subtotal:number,shipping:number):{discount:number;shipping:number} {
  const amount=Number(coupon.value);
  if (!Number.isFinite(subtotal) || subtotal<0 || !Number.isFinite(shipping) || shipping<0) throw new CouponPolicyError("قيمة الطلب غير صالحة.");
  if (coupon.type==="free_shipping") return {discount:0,shipping:0};
  if (!Number.isFinite(amount) || amount<0 || (coupon.type==="percentage" && amount>100)) throw new CouponPolicyError("تعذر استخدام هذا الكوبون.");
  const discount=coupon.type==="percentage"?Math.round(subtotal*amount/100):coupon.type==="fixed"?amount:NaN;
  if (!Number.isFinite(discount)) throw new CouponPolicyError("نوع الكوبون غير مدعوم.");
  return {discount:Math.min(subtotal,discount),shipping};
}
/** Authoritative validation in the checkout transaction, not browser totals.
 * All coupon users serialize on this row. Pending online links reserve capacity
 * until their payment/order is terminal, so a live discounted quote is honored.
 */
export async function eligibleCoupon(tx:any,code:string,context:CouponContext):Promise<Coupon> {
  if (typeof code!=="string" || !code.trim() || code.length>100) throw new CouponPolicyError("رمز الكوبون غير صالح.");
  const c=rows(await tx.execute(sql`SELECT *,
    (start_date IS NULL OR start_date<=now()) AND (end_date IS NULL OR end_date>=now()) AS date_valid
    FROM coupons WHERE lower(code)=lower(${code.trim()}) FOR UPDATE`))[0];
  if (!c) throw new CouponPolicyError("رمز الكوبون غير صحيح",404);
  if (!c.is_active) throw new CouponPolicyError("هذا الكوبون غير فعال حالياً");
  if (!c.date_valid) {
    if (c.start_date && new Date(c.start_date).getTime()>Date.now()) throw new CouponPolicyError("هذا الكوبون لم يبدأ بعد");
    throw new CouponPolicyError("انتهت صلاحية هذا الكوبون");
  }
  if (Number(c.min_order_amount ?? 0)>context.subtotal) throw new CouponPolicyError(`يجب أن يكون مجموع الطلب ${c.min_order_amount} د.ع على الأقل لاستخدام هذا الكوبون`);
  if (c.user_id && c.user_id!==context.userId) throw new CouponPolicyError("هذا الكوبون مخصص لحساب آخر.");
  if (c.max_uses_per_user!=null && !context.userId) throw new CouponPolicyError("هذا الكوبون يحتاج تسجيل الدخول للتحقق من أهليتك.");
  const totals=rows(await tx.execute(sql`SELECT
    count(*) FILTER(WHERE status='pending_payment' AND payment_status='pending')::int AS online_holds,
    count(*) FILTER(WHERE user_id=${context.userId} AND status NOT IN ('cancelled','expired','failed') AND (status<>'pending_payment' OR payment_status='pending'))::int AS user_uses
    FROM orders WHERE coupon_id=${c.id} AND coalesce(is_test,false)=false
      ${context.excludeOrderId?sql`AND id<>${context.excludeOrderId}`:sql``}`))[0] ?? {};
  if (c.max_uses!=null && Number(c.used_count ?? 0)+Number(totals.online_holds ?? 0)>=Number(c.max_uses)) throw new CouponPolicyError("تم استخدام هذا الكوبون بالكامل");
  if (c.max_uses_per_user!=null && Number(totals.user_uses ?? 0)>=Number(c.max_uses_per_user)) throw new CouponPolicyError("وصلت إلى عدد مرات استخدام هذا الكوبون.");
  const coupon={id:c.id,code:c.code,type:c.discount_type,value:c.discount_value,minOrderAmount:c.min_order_amount,
    maxUses:c.max_uses,usedCount:c.used_count,maxUsesPerUser:c.max_uses_per_user,startDate:c.start_date,endDate:c.end_date,
    isActive:c.is_active,description:c.description,userId:c.user_id,createdAt:c.created_at} as Coupon;
  couponBenefit(coupon,context.subtotal,0);
  return coupon;
}

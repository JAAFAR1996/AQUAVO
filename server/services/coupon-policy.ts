import { sql } from "drizzle-orm";
import { rowsOf, type SecurityExecutor } from "./security-db.js";
export interface EligibleCoupon {
  id: string; code: string; type: "percentage" | "fixed" | "free_shipping";
  value: string; minOrderAmount: string | null;
}
interface CouponRow extends Record<string, unknown> {
  id: string; code: string; discount_type: string; discount_value: string;
  user_id: string | null; used_count: number; max_uses: number | null;
  max_uses_per_user: number | null; min_order_amount: string | null;
  is_active: boolean; start_date: Date | string | null; end_date: Date | string | null;
}
export const INVALID_COUPON_MESSAGE = "كود الخصم غير متاح لهذا الحساب أو لم يعد صالحاً. أعد التحقق قبل إكمال الطلب.";
const rejected = () => Object.assign(new Error(INVALID_COUPON_MESSAGE), { status: 400 });
/** One owner/expiry/usage rule for both payment methods, inside the order transaction. */
export async function lockEligibleCoupon(tx: SecurityExecutor, code: string, userId: string | null, subtotal: number): Promise<EligibleCoupon> {
  if (!code.trim() || code.length > 100 || !Number.isFinite(subtotal) || subtotal < 0) throw rejected();
  const coupon = rowsOf<CouponRow>(await tx.execute(sql`SELECT * FROM coupons WHERE lower(code)=lower(${code.trim()}) FOR UPDATE`))[0];
  const now = Date.now();
  if (!coupon || !coupon.is_active || (coupon.user_id !== null && coupon.user_id !== userId)
      || (coupon.start_date && new Date(coupon.start_date).getTime() > now)
      || (coupon.end_date && new Date(coupon.end_date).getTime() <= now)
      || (coupon.min_order_amount !== null && subtotal < Number(coupon.min_order_amount))) throw rejected();
  if (!["percentage", "fixed", "free_shipping"].includes(coupon.discount_type)) throw rejected();
  const value = Number(coupon.discount_value);
  if (!Number.isFinite(value) || value < 0 || (coupon.discount_type !== "free_shipping" && value <= 0)
      || (coupon.discount_type === "percentage" && value > 100)) throw rejected();
  // Honor already-issued online prices by reserving their redemption capacity.
  const pending = rowsOf<{ count: string }>(await tx.execute(sql`
    SELECT count(*) AS count FROM orders WHERE coupon_id=${coupon.id}
      AND status IN ('pending_payment','payment_review') AND COALESCE(is_test,false)=false
  `))[0];
  if (coupon.max_uses !== null && Number(coupon.used_count ?? 0) + Number(pending?.count ?? 0) >= Number(coupon.max_uses)) throw rejected();
  if (coupon.max_uses_per_user !== null) {
    if (!userId) throw rejected();
    const used = rowsOf<{ count: string }>(await tx.execute(sql`
      SELECT count(*) AS count FROM orders WHERE coupon_id=${coupon.id} AND user_id=${userId}
        AND status NOT IN ('cancelled','rejected_returned','returned') AND COALESCE(is_test,false)=false
    `))[0];
    if (Number(used?.count ?? 0) >= Number(coupon.max_uses_per_user)) throw rejected();
  }
  return { id: coupon.id, code: coupon.code, type: coupon.discount_type as EligibleCoupon["type"], value: String(value), minOrderAmount: coupon.min_order_amount };
}
export function couponAmounts(coupon: EligibleCoupon, subtotal: number, shipping: number): { discount: number; shipping: number } {
  if (coupon.type === "free_shipping") return { discount: 0, shipping: 0 };
  const amount = coupon.type === "percentage" ? Math.round(subtotal * Number(coupon.value) / 100) : Number(coupon.value);
  return { discount: Math.min(subtotal, Math.max(0, amount)), shipping };
}

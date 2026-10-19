import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { normalizeCheckoutItems, type CheckoutLine } from "../../shared/checkout-items.js";
import type { Request } from "express";
import { rowsOf, type SecurityExecutor } from "./security-db.js";
export interface CheckoutRequestBinding { principalHash: string; requestHash: string }
export const CHECKOUT_REPLAY_MESSAGE = "تعذر إعادة هذا الطلب بأمان. افتح طلبك السابق أو تواصل مع الدعم قبل إنشاء طلب جديد.";
export function checkoutConflict(): Error & { status: number } {
  return Object.assign(new Error(CHECKOUT_REPLAY_MESSAGE), { status: 409 });
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().filter((key) => object[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
export function commercialRequestHash(payload: Record<string, unknown>): string {
  return digest(stable({
    items: normalizeCheckoutItems(payload.items as CheckoutLine[]),
    customerInfo: payload.customerInfo,
    couponCode: typeof payload.couponCode === "string" ? payload.couponCode.trim().toUpperCase() : "",
    useCashback: payload.useCashback === true,
    cashbackToUse: payload.useCashback === true ? Number(payload.cashbackToUse ?? 0) : 0,
    whatsappMarketingOptIn: payload.whatsappMarketingOptIn === true,
  }));
}
export async function checkoutRequestBinding(req: Request, payload: Record<string, unknown>): Promise<CheckoutRequestBinding> {
  if (!req.session) throw Object.assign(new Error("Checkout session unavailable"), { status: 503 });
  if (!req.session.userId && !req.session.checkoutOwner) {
    req.session.checkoutOwner = randomBytes(32).toString("hex");
    await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
  }
  const principal = req.session.userId ? `user:${req.session.userId}` : `guest:${req.session.checkoutOwner}`;
  return { principalHash: digest(principal), requestHash: commercialRequestHash(payload) };
}
function sameDigest(left: unknown, right: string): boolean {
  return typeof left === "string" && /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right)
    && timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
export async function assertCheckoutReplay(db: SecurityExecutor, orderId: string, binding: CheckoutRequestBinding): Promise<void> {
  const row = rowsOf<{ principal_hash: string; request_hash: string }>(await db.execute(sql`
    SELECT principal_hash, request_hash FROM commerce_request_bindings WHERE order_id=${orderId} LIMIT 1
  `))[0];
  if (!row || !sameDigest(row.principal_hash, binding.principalHash) || !sameDigest(row.request_hash, binding.requestHash)) throw checkoutConflict();
}
export async function persistCheckoutBinding(tx: SecurityExecutor, orderId: string, binding?: CheckoutRequestBinding): Promise<void> {
  if (!binding) {
    if (process.env.NODE_ENV === "production") throw checkoutConflict();
    return;
  }
  await tx.execute(sql`INSERT INTO commerce_request_bindings(order_id,principal_hash,request_hash)
    VALUES(${orderId},${binding.principalHash},${binding.requestHash})`);
}

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

export type ProductionTestOrderItemInput = {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type ProductionTestCustomer = {
  name: string;
  phone: string;
  email?: string;
  address: string;
};

type DbRow = Record<string, unknown>;

type ProductRow = {
  id: string;
  name: string;
  price: string | number;
  variants: unknown;
  has_variants: boolean | null;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function variantsOf(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function publicOrder(row: DbRow) {
  return {
    id: String(row.id),
    orderNumber: row.order_number == null ? null : String(row.order_number),
    status: String(row.status ?? "pending"),
    paymentStatus: String(row.payment_status ?? "pending"),
    total: Number(row.total ?? 0),
    roundedTotal: row.rounded_total == null ? null : Number(row.rounded_total),
    shippingCost: Number(row.shipping_cost ?? 0),
    discountTotal: Number(row.discount_total ?? 0),
    items: Array.isArray(row.items) ? row.items : [],
    customerName: row.customer_name == null ? null : String(row.customer_name),
    customerPhone: row.customer_phone == null ? null : String(row.customer_phone),
    customerEmail: row.customer_email == null ? null : String(row.customer_email),
    source: String(row.source ?? "test"),
    isTest: Boolean(row.is_test),
    testContext: row.test_context == null ? null : String(row.test_context),
    financiallyCounted: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createProductionTestOrder(input: {
  userId: string;
  items: ProductionTestOrderItemInput[];
  customerInfo: ProductionTestCustomer;
  idempotencyKey?: string;
}) {
  const db = getDb();
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });

  const ids = [...new Set(input.items.map((item) => item.productId))];
  const productResult = await db.execute(sql`
    SELECT id,name,price,variants,has_variants
    FROM public.products
    WHERE id = ANY(${ids}::text[]) AND deleted_at IS NULL
  `);
  const products = rowsOf<ProductRow>(productResult);
  const byId = new Map(products.map((product) => [product.id, product]));
  if (byId.size !== ids.length) {
    throw Object.assign(new Error("أحد منتجات طلب الاختبار غير موجود"), { statusCode: 409 });
  }

  let subtotal = 0;
  const snapshot = input.items.map((item) => {
    const product = byId.get(item.productId)!;
    let unitPrice = Number(product.price);
    let variantLabel: string | undefined;

    if (item.variantId) {
      const variant = variantsOf(product.variants).find((candidate) => String(candidate.id ?? "") === item.variantId);
      if (!variant) throw Object.assign(new Error(`خيار المنتج غير موجود: ${product.name}`), { statusCode: 409 });
      const variantPrice = Number(variant.price);
      if (Number.isFinite(variantPrice) && variantPrice >= 0) unitPrice = variantPrice;
      variantLabel = variant.label == null ? undefined : String(variant.label);
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw Object.assign(new Error(`سعر المنتج غير صالح: ${product.name}`), { statusCode: 409 });
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(variantLabel ? { variantLabel } : {}),
      priceAtPurchase: unitPrice,
      lineTotal,
      testOnly: true,
    };
  });

  const shippingCost = 5000;
  const total = subtotal + shippingCost;
  const orderId = input.idempotencyKey ?? randomUUID();
  const orderNumber = `TEST-${orderId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;

  return await db.transaction(async (tx) => {
    const existingResult = await tx.execute(sql`
      SELECT id,order_number,status,payment_status,total,rounded_total,shipping_cost,
             discount_total,items,customer_name,customer_phone,customer_email,source,
             is_test,test_context,financially_counted,created_at,updated_at
      FROM public.orders WHERE id=${orderId} LIMIT 1
    `);
    const existing = rowsOf<DbRow>(existingResult)[0];
    if (existing) {
      if (!Boolean(existing.is_test)) {
        throw Object.assign(new Error("تعارض مفتاح طلب الاختبار"), { statusCode: 409 });
      }
      return publicOrder(existing);
    }

    await tx.execute(sql`SELECT set_config('aquavo.allow_test_order_write','on',true)`);

    const inserted = await tx.execute(sql`
      INSERT INTO public.orders(
        id,order_number,user_id,status,payment_status,total,rounded_total,shipping_cost,
        discount_total,points_used,cashback_used,points_discount,points_earned,rounding_cashback,
        items,shipping_address,customer_name,customer_email,customer_phone,source,
        financially_counted,is_test,test_context,created_at,updated_at
      ) VALUES (
        ${orderId},${orderNumber},${input.userId},'pending','pending',${String(total)}::numeric,
        ${String(total)}::numeric,${String(shippingCost)}::numeric,'0'::numeric,0,0,'0'::numeric,0,0,
        ${JSON.stringify(snapshot)}::jsonb,
        ${JSON.stringify({ addressLine1: input.customerInfo.address, city: "Iraq", country: "IQ" })}::jsonb,
        ${input.customerInfo.name},${input.customerInfo.email || null},${input.customerInfo.phone},'test',
        false,true,'admin_checkout_whatsapp_test',clock_timestamp(),clock_timestamp()
      )
      RETURNING id,order_number,status,payment_status,total,rounded_total,shipping_cost,
                discount_total,items,customer_name,customer_phone,customer_email,source,
                is_test,test_context,financially_counted,created_at,updated_at
    `);
    const row = rowsOf<DbRow>(inserted)[0];
    if (!row) throw new Error("فشل إنشاء طلب الاختبار");
    return publicOrder(row);
  });
}

export async function transitionProductionTestOrder(orderId: string, status: string) {
  const db = getDb();
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });
  if (!["delivered", "cancelled"].includes(status)) {
    throw Object.assign(new Error("طلب الاختبار يسمح فقط بـ تم الاستلام أو الإلغاء"), { statusCode: 400 });
  }

  return await db.transaction(async (tx) => {
    const lockedResult = await tx.execute(sql`
      SELECT id,status,is_test FROM public.orders WHERE id=${orderId} FOR UPDATE
    `);
    const locked = rowsOf<DbRow>(lockedResult)[0];
    if (!locked) throw Object.assign(new Error("الطلب غير موجود"), { statusCode: 404 });
    if (!Boolean(locked.is_test)) throw Object.assign(new Error("هذا ليس طلب اختبار"), { statusCode: 409 });

    await tx.execute(sql`SELECT set_config('aquavo.allow_test_order_write','on',true)`);
    await tx.execute(sql`SELECT set_config('aquavo.allow_test_order_status','on',true)`);

    const updatedResult = await tx.execute(sql`
      UPDATE public.orders
      SET status=${status},updated_at=clock_timestamp()
      WHERE id=${orderId} AND is_test=true
      RETURNING id,order_number,status,payment_status,total,rounded_total,shipping_cost,
                discount_total,items,customer_name,customer_phone,customer_email,source,
                is_test,test_context,financially_counted,created_at,updated_at
    `);
    const updated = rowsOf<DbRow>(updatedResult)[0];
    if (!updated) throw new Error("فشل تحديث طلب الاختبار");
    return { order: publicOrder(updated), oldStatus: String(locked.status) };
  });
}

export async function deleteProductionTestOrder(orderId: string) {
  const db = getDb();
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });

  return await db.transaction(async (tx) => {
    const lockedResult = await tx.execute(sql`
      SELECT id,is_test FROM public.orders WHERE id=${orderId} FOR UPDATE
    `);
    const locked = rowsOf<DbRow>(lockedResult)[0];
    if (!locked) return { deleted: false, notFound: true };
    if (!Boolean(locked.is_test)) throw Object.assign(new Error("رفض حذف الطلب: هذا طلب حقيقي"), { statusCode: 409 });

    await tx.execute(sql`SELECT set_config('aquavo.allow_test_order_write','on',true)`);
    await tx.execute(sql`DELETE FROM public.customer_message_jobs WHERE order_id=${orderId}`);
    const deleted = await tx.execute(sql`DELETE FROM public.orders WHERE id=${orderId} AND is_test=true RETURNING id`);
    return { deleted: rowsOf<DbRow>(deleted).length === 1, notFound: false };
  });
}

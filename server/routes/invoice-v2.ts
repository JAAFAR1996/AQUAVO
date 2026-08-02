import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { manualInvoices, orderItems, orders } from "../../shared/schema.js";
import { getDb } from "../db.js";
import {
  buildProductCostSnapshot,
  lockProductRowForUpdate,
  toJsonbCostFields,
  toRelationalCostFields,
} from "../services/product-cost-snapshot.js";
import { getSchemaReadiness, assertOrderCreationReady } from "../services/schema-readiness.js";

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function money(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw Object.assign(new Error(`${label} غير صالح`), { status: 400 });
  return number;
}

/**
 * Atomically converts a sent WhatsApp invoice into an order.
 * The invoice lock, cost snapshots, order, relational lines, inventory ledger
 * movements and invoice confirmation commit together or not at all.
 */
export function createInvoiceV2Router() {
  const router = Router();

  router.post("/:token/confirm", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) {
      res.status(503).json({ success: false, message: "قاعدة البيانات غير مهيأة" });
      return;
    }

    try {
      const outcome = await db.transaction(async (tx) => {
        const lockedResult = await tx.execute(sql`
          SELECT * FROM manual_invoices WHERE token=${req.params.token} FOR UPDATE
        `);
        const invoice = rowsOf<any>(lockedResult)[0];
        if (!invoice) throw Object.assign(new Error("الفاتورة غير موجودة"), { status: 404 });

        if (invoice.status === "confirmed" && invoice.order_id) {
          return { kind: "confirmed" as const, orderId: invoice.order_id, invoiceNo: invoice.invoice_no };
        }
        if (invoice.status !== "sent") {
          throw Object.assign(new Error(invoice.status === "rejected" ? "تم رفض هذه الفاتورة" : "لا يمكن قبول هذه الفاتورة في حالتها الحالية"), { status: 400 });
        }
        if (invoice.expires_at && new Date(invoice.expires_at).getTime() < Date.now()) {
          await tx.update(manualInvoices).set({ status: "cancelled", updatedAt: new Date() } as any)
            .where(eq(manualInvoices.id, invoice.id));
          return { kind: "expired" as const, invoiceNo: invoice.invoice_no };
        }

        assertOrderCreationReady(await getSchemaReadiness(tx as never));

        const rawLines = Array.isArray(invoice.items) ? invoice.items : [];
        if (rawLines.length === 0) throw Object.assign(new Error("الفاتورة لا تحتوي منتجات"), { status: 400 });

        const snapshotAt = new Date();
        const lines: Array<{ raw: any; snapshot: ReturnType<typeof buildProductCostSnapshot> }> = [];
        let calculatedSubtotal = 0;

        for (const raw of rawLines) {
          const product = await lockProductRowForUpdate(tx as never, String(raw.productId ?? ""));
          if (!product) throw Object.assign(new Error(`المنتج غير موجود ضمن الفاتورة (${raw.productId})`), { status: 400 });

          const quantity = Number(raw.quantity);
          if (!Number.isInteger(quantity) || quantity <= 0) throw Object.assign(new Error(`كمية غير صالحة للمنتج ${product.name}`), { status: 400 });
          const unitPrice = money(raw.unitPrice, `سعر ${product.name}`);
          if (unitPrice <= 0) throw Object.assign(new Error(`سعر ${product.name} يجب أن يكون أكبر من صفر`), { status: 400 });

          if (raw.variantId) {
            const variant = (Array.isArray(product.variants) ? product.variants : []).find((v: any) => v.id === raw.variantId);
            if (!variant || Number(variant.stock ?? 0) < quantity) {
              throw Object.assign(new Error(`الكمية المطلوبة غير متوفرة (${product.name} — ${raw.variantLabel ?? raw.variantId})`), { status: 409 });
            }
          } else if (Number(product.stock ?? 0) < quantity) {
            throw Object.assign(new Error(`الكمية المطلوبة غير متوفرة (${product.name})`), { status: 409 });
          }

          calculatedSubtotal += unitPrice * quantity;
          lines.push({ raw: { ...raw, quantity, unitPrice }, snapshot: buildProductCostSnapshot(product, snapshotAt) });
        }

        const invoiceSubtotal = money(invoice.subtotal, "المجموع الفرعي");
        const discount = money(invoice.discount ?? 0, "الخصم");
        const delivery = money(invoice.delivery ?? 0, "التوصيل");
        const total = money(invoice.total, "الإجمالي");
        if (calculatedSubtotal !== invoiceSubtotal || total !== Math.max(0, invoiceSubtotal - discount + delivery)) {
          throw Object.assign(new Error("مبالغ الفاتورة لا تطابق سطور المنتجات"), { status: 409 });
        }

        const orderId = randomUUID();
        await tx.insert(orders).values({
          id: orderId,
          orderNumber: invoice.invoice_no,
          userId: null,
          status: "pending",
          paymentStatus: "pending",
          total: String(total),
          roundedTotal: String(total),
          shippingCost: String(delivery),
          discountTotal: String(discount),
          customerName: invoice.customer_name,
          customerPhone: invoice.customer_phone,
          shippingAddress: invoice.customer_city || invoice.customer_address ? {
            addressLine1: invoice.customer_address ?? "",
            city: invoice.customer_city ?? "",
            country: "IQ",
          } : null,
          source: "whatsapp",
          items: lines.map(({ raw, snapshot }) => ({
            productId: raw.productId,
            productName: raw.name,
            quantity: raw.quantity,
            priceAtPurchase: raw.unitPrice,
            lineTotal: raw.unitPrice * raw.quantity,
            ...(raw.variantId ? { variantId: raw.variantId } : {}),
            ...(raw.variantLabel ? { variantLabel: raw.variantLabel } : {}),
            ...toJsonbCostFields(snapshot),
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        await tx.insert(orderItems).values(lines.map(({ raw, snapshot }) => ({
          id: randomUUID(),
          orderId,
          productId: raw.productId,
          quantity: raw.quantity,
          priceAtPurchase: String(raw.unitPrice),
          totalPrice: String(raw.unitPrice * raw.quantity),
          ...toRelationalCostFields(snapshot),
          unitSalePriceSnapshot: String(raw.unitPrice),
          discountSnapshot: "0",
          finalUnitSalePriceSnapshot: String(raw.unitPrice),
          salePriceSnapshotAt: snapshotAt,
          salePriceSource: "manual_invoice_confirmation",
          metadata: {
            productName: raw.name,
            variantId: raw.variantId ?? null,
            variantLabel: raw.variantLabel ?? null,
          },
        })) as any);

        const [confirmed] = await tx.update(manualInvoices).set({
          status: "confirmed",
          confirmedAt: new Date(),
          orderId,
          updatedAt: new Date(),
        } as any).where(eq(manualInvoices.id, invoice.id)).returning();

        return { kind: "confirmed" as const, orderId, invoiceNo: confirmed.invoiceNo };
      });

      if (outcome.kind === "expired") {
        res.status(410).json({ success: false, message: "انتهت صلاحية الفاتورة", invoiceNo: outcome.invoiceNo });
        return;
      }
      res.json({ success: true, message: "تم تأكيد طلبك بنجاح! شكراً لك", orderId: outcome.orderId, invoiceNo: outcome.invoiceNo });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  });

  return router;
}

import { isVariantPurchasable } from "../../shared/variant-commerce.js";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { randomUUID, randomBytes } from "crypto";
import {
  manualInvoices,
  contentTranslations,
  products,
  type ManualInvoiceItem,
  type ManualInvoice,
  type InsertManualInvoice,
  type InvoiceStatus,
} from "../../shared/schema.js";
import { validateManualInvoiceStock } from "../services/manual-invoice-stock.js";
import type { ManualInvoiceLocale } from "../../shared/manual-invoice-locale.js";
import { canonicalizeManualInvoiceItems, type InvoiceCatalogueProduct } from "../services/manual-invoice-names.js";

type InvoiceReader = Pick<NonNullable<ReturnType<typeof getDb>>, "select">;

async function resolveInvoiceNames(
  db: InvoiceReader,
  items: readonly ManualInvoiceItem[],
  catalogue: readonly InvoiceCatalogueProduct[],
  locale: ManualInvoiceLocale,
): Promise<ManualInvoiceItem[]> {
  if (locale !== "ckb" || !catalogue.length) return canonicalizeManualInvoiceItems(items, catalogue);
  const translations = await db.select({ id: contentTranslations.entityId, data: contentTranslations.data })
    .from(contentTranslations)
    .where(and(eq(contentTranslations.entityType, "product"), eq(contentTranslations.locale, locale),
      inArray(contentTranslations.entityId, catalogue.map(product => product.id))));
  return canonicalizeManualInvoiceItems(items, catalogue, new Map(translations.map(row => [row.id, row.data])));
}

// nanoid-compatible secure random token
function generateToken(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

// Generate invoice number in the same format as website orders: FH-YYMMDD-XXXXXXXX
function generateInvoiceNo(): string {
  const now = new Date();
  const year  = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day   = now.getDate().toString().padStart(2, "0");
  const randomSuffix = randomBytes(4).toString("hex").toUpperCase();
  return `FH-${year}${month}${day}-${randomSuffix}`;
}

export class InvoiceStorage {
  private db = getDb();

  private ensureDb() {
    if (!this.db) throw Object.assign(new Error("DB unavailable"), { status: 503 });
    return this.db;
  }

  private async canonicalizeDraftItems(db: InvoiceReader, items: readonly ManualInvoiceItem[], locale: ManualInvoiceLocale): Promise<ManualInvoiceItem[]> {
    if (items.length === 0) return [];
    const ids = [...new Set(items.map((item) => item.productId))];
    const catalogue = await db.select({
      id: products.id,
      name: products.name,
      variants: products.variants,
    }).from(products).where(inArray(products.id, ids));
    return resolveInvoiceNames(db, items, catalogue, locale);
  }

  /** جلب كل الفواتير (للـ admin) */
  async listInvoices(status?: InvoiceStatus): Promise<ManualInvoice[]> {
    const db = this.ensureDb();
    if (status) {
      return db.select().from(manualInvoices)
        .where(eq(manualInvoices.status, status))
        .orderBy(desc(manualInvoices.createdAt));
    }
    return db.select().from(manualInvoices).orderBy(desc(manualInvoices.createdAt));
  }

  /** جلب فاتورة بالـ ID */
  async getById(id: string): Promise<ManualInvoice | undefined> {
    const db = this.ensureDb();
    const [inv] = await db.select().from(manualInvoices).where(eq(manualInvoices.id, id));
    return inv;
  }

  /** جلب فاتورة بالـ token (رابط العميل) */
  async getByToken(token: string): Promise<ManualInvoice | undefined> {
    const db = this.ensureDb();
    const [inv] = await db.select().from(manualInvoices).where(eq(manualInvoices.token, token));
    return inv;
  }

  /** إنشاء فاتورة جديدة */
  async create(
    data: InsertManualInvoice,
    createdBy?: string,
    requestId?: string,
  ): Promise<ManualInvoice> {
    const db = this.ensureDb();
    const id = requestId ?? randomUUID();
    return db.transaction(async tx => {
      if (requestId) {
        // Serialize retries before validating stock. A successful original request
        // can legitimately be replayed after the product has sold out.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"manual-invoice:" + id}, 0))`);
        const [existing] = await tx.select().from(manualInvoices).where(eq(manualInvoices.id, id));
        if (existing) {
          if (existing.createdBy === (createdBy ?? null)) return existing;
          throw Object.assign(new Error("تعذر مطابقة محاولة حفظ الفاتورة"), { status: 409 });
        }
      }
      const catalogue = await validateManualInvoiceStock(tx, data.items);
      const items = await resolveInvoiceNames(tx, data.items, [...catalogue.values()], data.invoiceLocale);
      const [created] = await tx.insert(manualInvoices).values({
        id, invoiceNo: generateInvoiceNo(), token: generateToken(16),
        invoiceLocale: data.invoiceLocale, customerName: data.customerName, customerPhone: data.customerPhone,
        customerCity: data.customerCity, customerAddress: data.customerAddress, customerNotes: data.customerNotes,
        items, subtotal: String(data.subtotal), discount: String(data.discount ?? 0),
        delivery: String(data.delivery ?? 0), total: String(data.total), status: "draft",
        createdBy: createdBy ?? null,
      }).returning();
      return created;
    });
  }

  /** تحديث بيانات الفاتورة (draft فقط) */
  async update(
    id: string,
    data: Partial<InsertManualInvoice>
  ): Promise<ManualInvoice | undefined> {
    const db = this.ensureDb();

    return db.transaction(async tx => {
      const [existing] = await tx.select().from(manualInvoices)
        .where(eq(manualInvoices.id, id)).for("update");
      if (!existing || existing.status !== "draft") return undefined;

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (data.customerName    !== undefined) updates.customerName    = data.customerName;
      if (data.customerPhone   !== undefined) updates.customerPhone   = data.customerPhone;
      if (data.customerCity    !== undefined) updates.customerCity    = data.customerCity;
      if (data.customerAddress !== undefined) updates.customerAddress = data.customerAddress;
      if (data.customerNotes   !== undefined) updates.customerNotes   = data.customerNotes;
      if (data.invoiceLocale !== undefined) updates.invoiceLocale = data.invoiceLocale;
      if (data.items !== undefined) {
        const catalogue = await validateManualInvoiceStock(tx, data.items);
        updates.items = await resolveInvoiceNames(tx, data.items, [...catalogue.values()], data.invoiceLocale ?? existing.invoiceLocale);
      } else if (data.invoiceLocale !== undefined && data.invoiceLocale !== existing.invoiceLocale) {
        updates.items = await this.canonicalizeDraftItems(tx, existing.items, data.invoiceLocale);
      }
      if (data.subtotal        !== undefined) updates.subtotal        = String(data.subtotal);
      if (data.discount        !== undefined) updates.discount        = String(data.discount);
      if (data.delivery        !== undefined) updates.delivery        = String(data.delivery);
      if (data.total           !== undefined) updates.total           = String(data.total);

      const [updated] = await tx.update(manualInvoices)
        .set(updates as any)
        .where(and(eq(manualInvoices.id, id), eq(manualInvoices.status, "draft")))
        .returning();
      return updated;
    });
  }

  /** إرسال الفاتورة → تغيير الحالة لـ sent وتحديد وقت انتهاء الصلاحية */
  async send(id: string): Promise<ManualInvoice | undefined> {
    const db = this.ensureDb();
    return await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(manualInvoices)
        .where(eq(manualInvoices.id, id)).for("update");
      if (!locked) return undefined;
      if (locked.status === "sent") {
        if (locked.expiresAt && locked.expiresAt.getTime() <= Date.now()) {
          throw Object.assign(new Error("انتهت صلاحية رابط الفاتورة"), { status: 410 });
        }
        return locked;
      }
      if (locked.status !== "draft") return undefined;
      const lines = Array.isArray(locked.items) ? locked.items : [];
      const catalogue = await validateManualInvoiceStock(tx, lines);
      const canonicalLines = await resolveInvoiceNames(tx, lines, [...catalogue.values()], locked.invoiceLocale);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const [updated] = await tx.update(manualInvoices)
        .set({ items: canonicalLines, status: "sent", sentAt: new Date(), expiresAt, updatedAt: new Date() } as any)
        .where(and(eq(manualInvoices.id, id), eq(manualInvoices.status, "draft")))
        .returning();
      return updated;
    });
  }

  /** تأكيد الفاتورة من العميل → ينقص المخزون */
  async confirm(token: string): Promise<{ invoice: ManualInvoice; orderId?: string }> {
    const db = this.ensureDb();
    const existing = await this.getByToken(token);

    if (!existing) throw Object.assign(new Error("الفاتورة غير موجودة"), { status: 404 });
    if (existing.status !== "sent") {
      throw Object.assign(
        new Error(existing.status === "confirmed" ? "تم قبول هذه الفاتورة مسبقاً" :
          existing.status === "rejected" ? "تم رفض هذه الفاتورة" :
            "لا يمكن قبول هذه الفاتورة"),
        { status: 400 }
      );
    }

    // Check expiry
    if (existing.expiresAt && new Date() > new Date(existing.expiresAt)) {
      await db.update(manualInvoices)
        .set({ status: "cancelled", updatedAt: new Date() } as any)
        .where(eq(manualInvoices.id, existing.id));
      throw Object.assign(new Error("انتهت صلاحية الفاتورة"), { status: 410 });
    }

    // Create order in existing orders table
    const orderId = await this.createOrderFromInvoice(existing);

    // Mark confirmed
    const [updated] = await db.update(manualInvoices)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        orderId,
        updatedAt: new Date(),
      } as any)
      .where(eq(manualInvoices.id, existing.id))
      .returning();

    return { invoice: updated, orderId };
  }

  /** رفض الفاتورة من العميل */
  async reject(token: string): Promise<ManualInvoice> {
    const db = this.ensureDb();
    const existing = await this.getByToken(token);

    if (!existing) throw Object.assign(new Error("الفاتورة غير موجودة"), { status: 404 });
    if (existing.status !== "sent") {
      throw Object.assign(new Error("لا يمكن رفض هذه الفاتورة في حالتها الحالية"), { status: 400 });
    }

    const [updated] = await db.update(manualInvoices)
      .set({ status: "rejected", rejectedAt: new Date(), updatedAt: new Date() } as any)
      .where(and(eq(manualInvoices.id, existing.id), eq(manualInvoices.status, "sent")))
      .returning();
    if (!updated) throw Object.assign(new Error("تغيرت حالة الفاتورة، حدّث الصفحة"), { status: 409 });
    return updated;
  }

  /** إلغاء فاتورة من الـ admin */
  async cancel(id: string): Promise<ManualInvoice | undefined> {
    const db = this.ensureDb();
    const existing = await this.getById(id);
    if (!existing || ["completed", "cancelled"].includes(existing.status)) return undefined;

    const [updated] = await db.update(manualInvoices)
      .set({ status: "cancelled", updatedAt: new Date() } as any)
      .where(and(eq(manualInvoices.id, id), eq(manualInvoices.status, existing.status)))
      .returning();
    return updated;
  }

  /**
   * إنشاء Order من الفاتورة المقبولة (admin / WhatsApp path).
   *
   * F-2 FIX: this path previously wrote NO cost snapshot at all — not in
   * `orders.items` (JSONB) and not in `order_items_relational`. It therefore
   * disagreed with the storefront on a core invariant. It now locks each product
   * row FOR UPDATE via the canonical `lockProductRowForUpdate` and freezes the
   * snapshot with the canonical `buildProductCostSnapshot`, identical to
   * `createOrderSecure`. Verified 0 stays 0; UNKNOWN stays NULL.
   */
  private async createOrderFromInvoice(invoice: ManualInvoice): Promise<string> {
    const db = this.ensureDb();
    const { orders, orderItems } = await import("../../shared/schema.js");
    const {
      buildProductCostSnapshot,
      lockProductRowForUpdate,
      toJsonbCostFields,
      toRelationalCostFields,
    } = await import("../services/product-cost-snapshot.js");
    const orderId = randomUUID();

    // Same deployment guard as the storefront: this path now writes cost-snapshot
    // columns, so refuse up front if the migration has not been applied rather
    // than failing one confirmed invoice at a time.
    const { getSchemaReadiness, assertOrderCreationReady } =
      await import("../services/schema-readiness.js");
    assertOrderCreationReady(await getSchemaReadiness(db as any));

    // Order + items + stock deduction are wrapped in ONE transaction so a mid-loop
    // failure can't leave a half-created order with partially deducted stock.
    await db.transaction(async (tx) => {
      const snapshotAt = new Date();
      const invoiceLines = (invoice.items as any[]) ?? [];

      // 1. Lock every product row FIRST and freeze its cost snapshot, inside the
      //    same transaction that will deduct its stock.
      const lines = [] as Array<{ raw: any; snapshot: ReturnType<typeof buildProductCostSnapshot> }>;
      for (const item of invoiceLines) {
        const locked = await lockProductRowForUpdate(tx as any, item.productId);
        if (!locked) {
          // Fail closed: an invoice line pointing at a missing/deleted product
          // must abort the whole confirmation rather than create an uncostable order.
          throw Object.assign(
            new Error(`المنتج غير موجود ضمن الفاتورة (${item.productId})`),
            { status: 400 },
          );
        }
        if ((locked.hasVariants && !item.variantId) || (!locked.hasVariants && item.variantId)) {
          throw Object.assign(new Error("اختيار المنتج غير صالح؛ أعد اختيار النوع المطلوب"), { status: 400 });
        }
        if (item.variantId) {
          const variant = (Array.isArray(locked.variants) ? locked.variants : []).find((candidate) => candidate.id === item.variantId);
          if (!isVariantPurchasable(variant, Number(item.quantity))) {
            throw Object.assign(new Error("الخيار المحدد غير متاح للشراء"), { status: 409 });
          }
        }
        lines.push({ raw: item, snapshot: buildProductCostSnapshot(locked, snapshotAt, item.variantId) });
      }

      // 2. Create order (only columns that exist in the Drizzle schema).
      // Carry the invoice discount onto the order so order-based reporting sees it.
      await tx.insert(orders).values({
        id: orderId,
        orderNumber: invoice.invoiceNo,  // نفس رقم الفاتورة = نفس تسلسل طلبات الموقع
        userId: null,
        status: "pending",
        total: invoice.total,
        shippingCost: invoice.delivery,
        discountTotal: invoice.discount ?? undefined,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        // orders.shippingAddress is a typed JSONB object ({ addressLine1, city,
        // country }), NOT a string. The manual-invoice path previously wrote a
        // concatenated string, which both violated the declared column type and
        // disagreed at runtime with every reader that destructures the object.
        // Build the object the schema declares; country defaults to IQ (Iraq-only
        // storefront). Null when the invoice carries no address at all.
        shippingAddress:
          invoice.customerCity || invoice.customerAddress
            ? {
                addressLine1: invoice.customerAddress ?? "",
                city: invoice.customerCity ?? "",
                country: "IQ",
              }
            : null,
        source: "whatsapp",
        items: lines.map(({ raw, snapshot }) => ({
          productId: raw.productId,
          productName: raw.name,
          quantity: raw.quantity,
          priceAtPurchase: raw.unitPrice,
          lineTotal: Number(raw.unitPrice) * Number(raw.quantity),
          variantLabel: raw.variantLabel || undefined,
          variantId: raw.variantId || undefined,
          ...toJsonbCostFields(snapshot),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3. Relational lines carry the SAME snapshot objects → the two stores agree.
      for (const { raw: item, snapshot } of lines) {
        await tx.insert(orderItems).values({
          id: randomUUID(),
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: String(item.unitPrice),
          totalPrice: String(item.unitPrice * item.quantity),
          ...toRelationalCostFields(snapshot),
          metadata: {
            productName: item.name,
            variantLabel: item.variantLabel ?? null,
            variantId: item.variantId ?? null,
          },
        } as any);

        // Inventory is posted canonically by the
        // order_items_record_inventory_sale database trigger after this insert.
        // Never mutate products.stock here: that would be a second deduction
        // and is blocked when inventory_ledger_mode=enforce.
      }
    });

    return orderId;
  }

  /** إحصائيات سريعة */
  async getStats(): Promise<Record<string, number>> {
    const db = this.ensureDb();
    const { sql } = await import("drizzle-orm");
    const rows = await db.select({
      status: manualInvoices.status,
      count: sql<number>`count(*)`,
    }).from(manualInvoices).groupBy(manualInvoices.status);

    const stats: Record<string, number> = { total: 0 };
    rows.forEach((r) => {
      stats[r.status] = Number(r.count);
      stats.total += Number(r.count);
    });
    return stats;
  }

  async deleteById(id: string): Promise<boolean> {
    const db = getDb();
    if (!db) throw new Error("DB not initialized");
    const result = await db.delete(manualInvoices).where(eq(manualInvoices.id, id)).returning({ id: manualInvoices.id });
    return result.length > 0;
  }
}

export const invoiceStorage = new InvoiceStorage();

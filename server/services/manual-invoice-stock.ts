import { inArray, sql, type SQL } from "drizzle-orm";
import type { Product } from "../../shared/schema.js";
import { isVariantPurchasable, type VariantCommerceSource } from "../../shared/variant-commerce.js";
import { lockProductRowForUpdate, type LockedProductRow } from "./product-cost-snapshot.js";

type StockReader = { execute(query: SQL): Promise<unknown> };
type Identity = { productId: string; variantId?: string | null; quantity: number };
type WarehouseBalance = { productId: string; variantId: string | null; physical: number; reserved: number };

export class ManualInvoiceStockError extends Error {
  readonly status = 409;
  readonly code = "INVOICE_STOCK_UNAVAILABLE";
  constructor(
    readonly productId: string, readonly variantId: string | null, readonly available: number,
    label: string,
  ) {
    super(available > 0 ? `الكمية المتوفرة من ${label} هي ${available} فقط` : `${label} غير متوفر للإضافة إلى الفاتورة`);
  }
}

function skuKey(productId: string, variantId: string | null) {
  return JSON.stringify([productId, variantId]);
}

/** A draft does not reserve stock. Read the exact SKU at the warehouse used by order creation. */
async function readWarehouseBalances(db: StockReader, ids: string[]) {
  const balances = new Map<string, WarehouseBalance>();
  if (!ids.length) return balances;
  const result = await db.execute(sql`
    SELECT b.product_id AS "productId", b.variant_id AS "variantId", b.canonical_stock AS physical,
      (SELECT COALESCE(SUM(r.quantity),0) FROM public.payment_stock_reservations r
       WHERE r.product_id=b.product_id AND r.variant_id IS NOT DISTINCT FROM b.variant_id
         AND r.status='active' AND r.expires_at > now()) AS reserved
    FROM public.inventory_canonical_balances b
    JOIN public.inventory_locations l ON l.id=b.location_id AND l.code='MAIN' AND l.is_active
    JOIN public.products p ON p.id=b.product_id AND p.deleted_at IS NULL
    WHERE ${inArray(sql`b.product_id`, ids)}
  `);
  const rows = Array.isArray(result) ? result : (result as { rows: WarehouseBalance[] }).rows;
  for (const row of rows as WarehouseBalance[]) balances.set(skuKey(row.productId, row.variantId), row);
  return balances;
}

function availableUnits(source: VariantCommerceSource | undefined, balance: WarehouseBalance | undefined): number {
  if (!source || !isVariantPurchasable(source) || !balance) return 0;
  const qty = Math.min(Number(source.stock), Number(balance.physical)) - Number(balance.reserved);
  return Number.isSafeInteger(qty) && qty > 0 ? qty : 0;
}

export async function withManualInvoiceAvailability(db: StockReader, products: Product[]): Promise<Product[]> {
  const balances = await readWarehouseBalances(db, products.map(p => p.id));
  return products.map(p => {
    if (!p.hasVariants) return { ...p, stock: availableUnits(p, balances.get(skuKey(p.id, null))) };
    const variants = (p.variants ?? []).map(v => ({
      ...v, stock: availableUnits(v, balances.get(skuKey(p.id, v.id))),
    }));
    return { ...p, variants, stock: variants.reduce((sum, v) => sum + v.stock, 0) };
  });
}

/** Call inside the transaction that saves/sends/confirms. Preserve separate lines and agreed prices. */
export async function validateManualInvoiceStock(db: StockReader, lines: readonly Identity[]): Promise<Map<string, LockedProductRow>> {
  const ids = [...new Set(lines.map(line => line.productId))].sort();
  const catalogue = new Map<string, LockedProductRow>();
  for (const id of ids) {
    const product = await lockProductRowForUpdate(db, id);
    if (product) catalogue.set(id, product);
  }
  const balances = await readWarehouseBalances(db, ids);
  const quantities = new Map<string, number>();
  for (const line of lines) {
    const p = catalogue.get(line.productId);
    const variantId = line.variantId ?? null;
    const key = skuKey(line.productId, variantId);
    const option = variantId != null && p?.hasVariants ? p.variants?.find(v => v.id === variantId) : undefined;
    const source = p?.hasVariants ? option : variantId === null ? p : undefined;
    const available = availableUnits(source, balances.get(key));
    const quantity = line.quantity;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw Object.assign(new Error("كمية منتج الفاتورة غير صالحة"), { status: 400 });
    }
    const total = (quantities.get(key) ?? 0) + quantity;
    if (total > available) {
      const label = [p?.name ?? "المنتج", option?.label].filter(Boolean).join(" — ");
      throw new ManualInvoiceStockError(line.productId, variantId, available, label);
    }
    quantities.set(key, total);
  }
  return catalogue;
}

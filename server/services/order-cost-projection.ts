import { sql } from "drizzle-orm";
import { rowsOf, type SecurityExecutor } from "./security-db.js";
interface StoredOrder { id: string; items: unknown }
interface RelationalRow extends Record<string, unknown> {
  product_id: string; quantity: number; price_at_purchase: string;
  metadata: { variantId?: string } | null;
  unit_cost_price: string | null; unit_packaging_cost: string | null; unit_insert_cost: string | null;
  cost_snapshot_status: string | null; cost_snapshot_source: string | null;
}
const numberOrNull = (value: string | null) => value === null ? null : Number(value);
const key = (product: unknown, variant: unknown, quantity: unknown, price: unknown) => JSON.stringify([product, variant || null, Number(quantity), Number(price)]);
/** NEW order creation only; never repairs or rewrites historical evidence. */
export async function projectNewOrderCosts(tx: SecurityExecutor, order: StoredOrder): Promise<void> {
  const source = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  const rows = rowsOf<RelationalRow>(await tx.execute(sql`SELECT product_id,quantity,price_at_purchase,metadata,
    unit_cost_price,unit_packaging_cost,unit_insert_cost,cost_snapshot_status,cost_snapshot_source
    FROM order_items_relational WHERE order_id=${order.id} ORDER BY id`));
  if (rows.length !== source.length) throw new Error("New-order cost projection cannot reconcile line count");
  const queues = new Map<string, RelationalRow[]>();
  for (const row of rows) {
    const id = key(row.product_id, row.metadata?.variantId, row.quantity, row.price_at_purchase);
    queues.set(id, [...(queues.get(id) ?? []), row]);
  }
  const items = source.map((line) => {
    const row = queues.get(key(line.productId, line.variantId, line.quantity, line.priceAtPurchase))?.shift();
    if (!row) throw new Error("New-order cost projection cannot reconcile product option");
    return { ...line, costPrice: numberOrNull(row.unit_cost_price), packagingCost: numberOrNull(row.unit_packaging_cost),
      insertCost: numberOrNull(row.unit_insert_cost), costStatus: row.cost_snapshot_status, costSource: row.cost_snapshot_source };
  });
  const updated = rowsOf<{ id: string }>(await tx.execute(sql`UPDATE orders SET items=${JSON.stringify(items)}::jsonb
    WHERE id=${order.id} AND status IN ('pending','pending_payment') RETURNING id`));
  if (updated.length !== 1) throw new Error("New-order projection cannot change historical or finalized state");
  order.items = items;
}

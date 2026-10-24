/**
 * Configure the existing red/black volcanic-rock pages as four size variants each.
 * Run without flags to inspect. Applying requires BOTH --apply and
 * AQUAVO_CONFIRM_VARIANTS=YES; it must not run as part of a deployment.
 *
 * Catalog evidence: the existing simple SKU is 3–5 cm, not all four sizes.
 * Unknown-size prices and inventories remain zero and cannot be purchased.
 * No direct inventory quantity updates: the canonical service journals the
 * base→3–5 cm identity transfer without altering aggregate physical stock.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db.js";
import { setCanonicalVariantConfiguration } from "../server/services/inventory-adjustment-service.js";

const PRODUCT_IDS = ["houyi-volcanic-stone-black", "houyi-volcanic-stone-red"] as const;
const SIZE_OPTIONS = [
  { id: "size-1-2cm", title: "صغير", range: "1–2 سم", current: false },
  { id: "size-3-5cm", title: "متوسط", range: "3–5 سم", current: true },
  { id: "size-5-8cm", title: "كبير", range: "5–8 سم", current: false },
  { id: "size-10-30cm", title: "كبير جدا", range: "10–30 سم", current: false },
] as const;

type ProductRow = {
  id: string; name: string; price: number | string; stock: number;
  has_variants: boolean; variants: unknown; specifications: Record<string, unknown> | null;
  cost_price: number | string | null; cost_price_resolution: string | null;
};

function getRows(result: unknown): ProductRow[] {
  return ((result as { rows?: ProductRow[] })?.rows ?? []);
}

function assertReady(rows: ProductRow[]): void {
  if (rows.length !== PRODUCT_IDS.length ||
      PRODUCT_IDS.some(id => !rows.some(row => row.id === id))) {
    throw new Error("Expected exactly the two existing volcanic-rock product records");
  }
  for (const row of rows) {
    if (row.has_variants || (Array.isArray(row.variants) && row.variants.length > 0)) {
      throw new Error(`${row.id} already has variants; review before changing it`);
    }
    if (row.specifications?.["حجم القطع"] !== "3–5 سم") {
      throw new Error(`${row.id}: existing item is not verified as 3–5 cm`);
    }
    if (!Number.isInteger(Number(row.stock)) || Number(row.stock) < 0 ||
        !Number.isFinite(Number(row.price)) || Number(row.price) <= 0) {
      throw new Error(`${row.id}: invalid existing stock or price`);
    }
  }
}

function buildVariants(row: ProductRow) {
  const currentPrice = Number(row.price);
  const currentStock = Number(row.stock);
  const currentCost = Number(row.cost_price);
  const knownCost = row.cost_price_resolution === "known" &&
    row.cost_price !== null && Number.isFinite(currentCost) && currentCost > 0;
  return SIZE_OPTIONS.map(option => {
    const comingSoon = !option.current;
    const choice = `${option.title} (${option.range})${comingSoon ? " — قريبا" : ""}`;
    return {
      id: option.id, label: choice,
      price: option.current ? currentPrice : 0,
      stock: option.current ? currentStock : 0,
      isDefault: option.current,
      specifications: { "الحجم": choice, "حجم القطعة": option.range },
      ...(option.current && knownCost ? {
        costPrice: currentCost,
        costStatus: "verified_derived",
        costBasis: "existing_parent_known_unit_cost",
        costEvidence: "Existing product.cost_price (resolution=known) for the original 3–5 cm SKU; carried across the identity transfer.",
      } : {}),
    };
  });
}

function printPlan(rows: ProductRow[]): void {
  for (const row of rows) {
    const variants = buildVariants(row);
    process.stdout.write(`${row.name} (${row.id}): base stock ${row.stock}, current price ${row.price} IQD\n`);
    for (const v of variants) process.stdout.write(`  ${v.label}: ${v.stock} in stock; price ${v.price > 0 ? v.price + " IQD" : "unpriced"}\n`);
  }
}

async function main() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const preflight = await db.execute(sql`
    SELECT id, name, price, stock, has_variants, variants, specifications,
           cost_price, cost_price_resolution
    FROM products
    WHERE id IN (${PRODUCT_IDS[0]}, ${PRODUCT_IDS[1]}) AND deleted_at IS NULL
    ORDER BY id
  `);
  const rows = getRows(preflight);
  assertReady(rows);
  printPlan(rows);
  const apply = process.argv.includes("--apply");
  if (!apply) {
    process.stdout.write("DRY RUN only. No changes applied.\n");
    return;
  }
  if (process.env.AQUAVO_CONFIRM_VARIANTS !== "YES") {
    throw new Error("Explicit confirmation required: AQUAVO_CONFIRM_VARIANTS=YES");
  }
  await db.transaction(async tx => {
    const locked = await tx.execute(sql`
      SELECT id, name, price, stock, has_variants, variants, specifications,
             cost_price, cost_price_resolution
      FROM products
      WHERE id IN (${PRODUCT_IDS[0]}, ${PRODUCT_IDS[1]}) AND deleted_at IS NULL
      ORDER BY id FOR UPDATE
    `);
    const current = getRows(locked);
    assertReady(current);
    for (const product of current) {
      const beforeStock = Number(product.stock);
      await setCanonicalVariantConfiguration(
        tx, { clientId: "volcanic-size-20261024", mode: "static" },
        product.id, true, buildVariants(product),
      );
      const specsUpdate = JSON.stringify({
        "خيارات حجم القطع": "صغير 1–2 سم، متوسط 3–5 سم، كبير 5–8 سم، كبير جدا 10–30 سم",
        "مقاس الصور الحالية": "3–5 سم",
      });
      await tx.execute(sql`
        UPDATE products
        SET specifications = (COALESCE(specifications, '{}'::jsonb)
          - 'حجم القطع' - 'المقاسات القادمة') || ${specsUpdate}::jsonb,
            updated_at = now()
        WHERE id = ${product.id}
      `);
      const afterResult = await tx.execute(sql`
        SELECT stock, has_variants, variants FROM products WHERE id = ${product.id}
      `) as { rows?: Array<{ stock: number; has_variants: boolean; variants: any[] }> };
      const after = afterResult.rows?.[0];
      if (!after?.has_variants || !Array.isArray(after.variants) ||
          after.variants.length !== SIZE_OPTIONS.length ||
          Number(after.stock) !== beforeStock ||
          after.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0) !== beforeStock ||
          after.variants.some(v => v.id !== "size-3-5cm" && Number(v.stock) !== 0)) {
        throw new Error(`Post-update inventory verification failed for ${product.id}`);
      }
      const balance = await tx.execute(sql`
        SELECT COALESCE(SUM(quantity_delta), 0)::int AS qty
        FROM inventory_movements WHERE product_id = ${product.id} AND variant_id IS NULL
      `) as { rows?: Array<{ qty: number | string }> };
      if (Number(balance.rows?.[0]?.qty ?? -1) !== 0) {
        throw new Error(`Base ledger not zero after variant transfer: ${product.id}`);
      }
    }
  });
  process.stdout.write("All changes committed atomically and inventory reconciliation verified.\n");
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
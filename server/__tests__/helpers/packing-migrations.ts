// Carton-catalogue DDL for the PGlite test harnesses.
//
// The fulfillment suites build their database by executing real migration files,
// which is what makes them meaningful. Once the Drizzle model gained the carton
// columns (migration 0040), every `select()` on fulfillment_materials emits SQL
// naming them — so a harness that stops at add_pim_line_identity.sql now
// describes a schema the code no longer targets, and fails with
// `column "sku" does not exist`.
//
// Loading the real 0040 keeps the harness honest: the test database and the
// production schema come from the same file.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Minimal stand-in for the migration ledger. Real migrations register
 * themselves in it; PGlite harnesses do not create it, so provide it rather than
 * editing the migration to be test-aware.
 */
export const SCHEMA_MIGRATIONS_STUB = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  checksum text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text,
  rolled_back_at timestamptz,
  notes text
);`;

/**
 * Several older fulfillment PGlite suites intentionally create a tiny `orders`
 * table before applying the fulfillment migrations. The canonical service now
 * reads `orders.status` to decide whether a packaging reversal is still a
 * pre-shipment cancellation. Production has this column; the test harness must
 * model it too rather than teaching production code to tolerate a stale schema.
 *
 * `ADD COLUMN IF NOT EXISTS` backfills legacy id-only fixtures with `processing`.
 * `ALTER COLUMN ... SET DEFAULT` also fixes fixtures that already declared a
 * different default (for example `delivered`) before inserting their test order.
 * Existing explicit statuses are never rewritten.
 */
export const ORDER_STATUS_HARNESS_DDL = `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'processing';
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'processing';
UPDATE orders SET status = 'processing' WHERE status IS NULL;
`;

export function readMigration(name: string): string {
  return readFileSync(join(process.cwd(), "migrations", name), "utf8");
}

/**
 * The order lifecycle field, carton-catalogue columns, and reservation table,
 * ready to exec after the fulfillment migrations.
 *
 * 0042 is included because the confirmation stock guard now reads
 * `carton_reservations` to work out how much stock is actually free — a harness
 * carrying 0040 alone describes a schema the code no longer targets and fails
 * with `relation "carton_reservations" does not exist`. Both migration files are
 * idempotent (CREATE TABLE IF NOT EXISTS, guarded DO blocks), so a suite that
 * already applies 0042 itself is unaffected.
 */
export function cartonCatalogDdl(): string {
  return [
    SCHEMA_MIGRATIONS_STUB,
    ORDER_STATUS_HARNESS_DDL,
    readMigration("0040_packaging_carton_catalog.sql"),
    readMigration("0042_carton_reservations.sql"),
  ].join("\n");
}

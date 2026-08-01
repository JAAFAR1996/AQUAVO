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

export function readMigration(name: string): string {
  return readFileSync(join(process.cwd(), "migrations", name), "utf8");
}

/**
 * The carton-catalogue columns AND the reservation table, ready to exec after
 * the fulfillment migrations.
 *
 * 0042 is included because the confirmation stock guard now reads
 * `carton_reservations` to work out how much stock is actually free — a harness
 * carrying 0040 alone describes a schema the code no longer targets and fails
 * with `relation "carton_reservations" does not exist`. Both files are
 * idempotent (CREATE TABLE IF NOT EXISTS, guarded DO blocks), so a suite that
 * already applies 0042 itself is unaffected.
 */
export function cartonCatalogDdl(): string {
  return [
    SCHEMA_MIGRATIONS_STUB,
    readMigration("0040_packaging_carton_catalog.sql"),
    readMigration("0042_carton_reservations.sql"),
  ].join("\n");
}

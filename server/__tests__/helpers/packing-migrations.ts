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

/** The carton-catalogue columns, ready to exec after the fulfillment migrations. */
export function cartonCatalogDdl(): string {
  return `${SCHEMA_MIGRATIONS_STUB}\n${readMigration("0040_packaging_carton_catalog.sql")}`;
}

/**
 * _apply_migrations.mjs
 * Applies DDL for accounting tables and financially_counted columns to the DB.
 * Strips channel_binding=require (not supported by @neondatabase/serverless).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ override: true });

import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Strip channel_binding=require (not supported by the serverless driver)
const url = rawUrl.replace(/[&?]channel_binding=require/g, '');

const sql = neon(url);

const statements = [
  // --- accounting_manual_adjustments ---
  `CREATE TABLE IF NOT EXISTS "accounting_manual_adjustments" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "field_name" text NOT NULL,
    "old_value_json" jsonb,
    "new_value_json" jsonb NOT NULL,
    "reason" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "created_by" text NOT NULL,
    "approved_by" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "approved_at" timestamp,
    "applied_at" timestamp,
    "note" text
  )`,

  // --- accounting_review_flags ---
  `CREATE TABLE IF NOT EXISTS "accounting_review_flags" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "category" text NOT NULL,
    "severity" text DEFAULT 'medium' NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" text NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "detected_value_json" jsonb,
    "suggested_value_json" jsonb,
    "status" text DEFAULT 'open' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "resolved_at" timestamp,
    "resolved_by" text
  )`,

  // --- financiallyCounted on orders ---
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS financially_counted boolean`,

  // --- financiallyCounted on manual_invoices ---
  `ALTER TABLE manual_invoices ADD COLUMN IF NOT EXISTS financially_counted boolean`,

  // --- Indexes ---
  `CREATE INDEX IF NOT EXISTS "ama_entity_idx" ON "accounting_manual_adjustments" ("entity_type", "entity_id")`,
  `CREATE INDEX IF NOT EXISTS "ama_status_idx" ON "accounting_manual_adjustments" ("status")`,
  `CREATE INDEX IF NOT EXISTS "ama_created_at_idx" ON "accounting_manual_adjustments" ("created_at")`,
  `CREATE INDEX IF NOT EXISTS "arf_entity_idx" ON "accounting_review_flags" ("entity_type", "entity_id")`,
  `CREATE INDEX IF NOT EXISTS "arf_status_idx" ON "accounting_review_flags" ("status")`,
  `CREATE INDEX IF NOT EXISTS "arf_severity_idx" ON "accounting_review_flags" ("severity")`,
  `CREATE INDEX IF NOT EXISTS "arf_created_at_idx" ON "accounting_review_flags" ("created_at")`,
];

async function run() {
  for (const stmt of statements) {
    try {
      await sql(stmt);
    } catch (err) {
      // If column/table already exists errors, continue
      console.error('Stmt error (may be OK):', err.message?.slice(0, 120));
    }
  }

  // Verify tables
  const tableCheck = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('accounting_manual_adjustments', 'accounting_review_flags')
    ORDER BY table_name
  `;
  const existingTables = new Set(tableCheck.map(r => r.table_name));

  console.log('accounting_manual_adjustments:', existingTables.has('accounting_manual_adjustments') ? 'EXISTS' : 'MISSING');
  console.log('accounting_review_flags:', existingTables.has('accounting_review_flags') ? 'EXISTS' : 'MISSING');

  // Verify columns
  const colCheck = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('orders', 'manual_invoices')
      AND column_name = 'financially_counted'
  `;
  const colSet = new Set(colCheck.map(r => r.table_name));
  console.log('orders.financially_counted:', colSet.has('orders') ? 'EXISTS' : 'MISSING');
  console.log('manual_invoices.financially_counted:', colSet.has('manual_invoices') ? 'EXISTS' : 'MISSING');

  // Row counts
  const [amaCount] = await sql`SELECT COUNT(*) FROM accounting_manual_adjustments`;
  const [arfCount] = await sql`SELECT COUNT(*) FROM accounting_review_flags`;
  console.log('accounting_manual_adjustments row count:', amaCount.count);
  console.log('accounting_review_flags row count:', arfCount.count);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

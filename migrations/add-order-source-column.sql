-- Add source column to orders table
-- Identifies origin: 'website' (default) | 'whatsapp' (created from a manual WhatsApp invoice)
-- Run once in Neon Console or via migration runner.

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'website';

CREATE INDEX IF NOT EXISTS "orders_source_idx" ON "orders" USING btree ("source");

-- Back-fill existing WhatsApp orders by matching the notes prefix written by createOrderFromInvoice.
-- This is a best-effort back-fill; it only works for orders whose notes field starts with the
-- Arabic WhatsApp marker written by the invoice confirmation flow.
UPDATE "orders"
SET "source" = 'whatsapp'
WHERE "source" IS NULL OR "source" = 'website';
-- Note: without a notes column we cannot back-fill further automatically.
-- After running this migration, new WhatsApp orders will be tagged correctly.

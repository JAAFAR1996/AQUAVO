// Offline operator preparation for the product text corrected on 2026-11-15.
// Run from the repository root with the baseline commit available locally.
// Default: report field counts. --sql or --rollback-sql: print reviewable SQL.
// Neither mode connects to a database. Whole-row reseeding remains unchanged.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [mode = "--summary", ...extra] = process.argv.slice(2);
if (extra.length || !["--summary", "--sql", "--rollback-sql"].includes(mode)) {
  throw new Error("Usage: node TOOLS/i18n/prepare-product-copy-patch.mjs [--summary | --sql | --rollback-sql]");
}
const read = path => JSON.parse(readFileSync(path, "utf8"));
const manifest = read("data/i18n/manual-invoice-catalog-corrections-20261115.json");
const digest = text => createHash("sha256").update(text, "utf8").digest("hex");
const quote = text => "'" + text.replaceAll("'", "''") + "'";
const values = [];
const counts = {};
for (const locale of ["en", "ckb"]) {
  const path = `data/i18n/translations/${locale}/products.json`;
  const initial = JSON.parse(execFileSync("git", ["show", `${manifest.baselineCommit}:${path}`], {
    encoding: "utf8", maxBuffer: 8_000_000,
  }));
  const current = read(path);
  counts[locale] = 0;
  for (const { entityId, field, sourceSha256, locales } of manifest.fields) {
    if (!Object.hasOwn(locales, locale)) continue;
    if (!["name", "description"].includes(field) || !/^[a-f0-9]{64}$/.test(sourceSha256)) {
      throw new Error("Invalid product text correction manifest");
    }
    const before = initial[entityId].data[field];
    const after = current[entityId].data[field];
    if (typeof before !== "string" || before === after || digest(after) !== locales[locale]) {
      throw new Error(`Changed correction: ${locale}/${entityId}/${field}. Re-review before generating SQL.`);
    }
    const [expected, desired] = mode === "--rollback-sql" ? [after, before] : [before, after];
    values.push([entityId, locale, field, sourceSha256, expected, desired].map(quote).join(", "));
    counts[locale]++;
  }
}
if (mode === "--summary") {
  console.log(JSON.stringify({ mode: "offline", fields: counts, total: values.length }));
} else {
  // No INSERT into production translation tables and no writes to Arabic,
  // review status or whole-record source_hash. A discrepancy aborts the batch.
  console.log(`BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE invoice_copy_patch (
  entity_id text, locale text, field text, source_sha256 text, expected text, desired text,
  PRIMARY KEY (entity_id, locale, field)
) ON COMMIT DROP;
INSERT INTO invoice_copy_patch VALUES
${values.map(value => "(" + value + ")").join(",\n")};

-- Locks are held until commit, including while both source and target are checked.
SELECT p.id FROM public.products p
WHERE p.id IN (SELECT entity_id FROM invoice_copy_patch) ORDER BY p.id FOR SHARE;
SELECT t.id FROM public.content_translations t
WHERE t.entity_type = 'product' AND (t.entity_id,t.locale) IN
  (SELECT entity_id,locale FROM invoice_copy_patch) ORDER BY t.id FOR UPDATE;

DO $apply$
DECLARE change record;
BEGIN
  FOR change IN
    SELECT c.*, p.id AS product_id, p.deleted_at,
      CASE c.field WHEN 'name' THEN p.name ELSE p.description END AS arabic,
      t.id AS translation_id, t.status, t.data->>c.field AS existing
    FROM invoice_copy_patch c
    LEFT JOIN public.products p ON p.id = c.entity_id
    LEFT JOIN public.content_translations t ON t.entity_type='product'
      AND t.entity_id=c.entity_id AND t.locale=c.locale
    ORDER BY c.entity_id,c.locale,c.field
  LOOP
    IF change.status = 'reviewed' THEN
      RAISE NOTICE 'Protected reviewed translation %/%/%', change.entity_id,change.locale,change.field;
      CONTINUE;
    END IF;
    IF change.product_id IS NULL OR change.deleted_at IS NOT NULL
       OR change.status IS DISTINCT FROM 'machine'
       OR encode(sha256(convert_to(change.arabic,'UTF8')),'hex') IS DISTINCT FROM change.source_sha256 THEN
      RAISE EXCEPTION 'Source or eligibility changed: %/%/%', change.entity_id,change.locale,change.field;
    END IF;
    IF change.existing IS NOT DISTINCT FROM change.desired THEN CONTINUE; END IF;
    IF change.existing IS DISTINCT FROM change.expected THEN
      RAISE EXCEPTION 'Translation changed: %/%/%', change.entity_id,change.locale,change.field;
    END IF;
    UPDATE public.content_translations
      SET data=jsonb_set(data, ARRAY[change.field], to_jsonb(change.desired::text), false), updated_at=now()
      WHERE id=change.translation_id;
  END LOOP;
END $apply$;
COMMIT;`);
}

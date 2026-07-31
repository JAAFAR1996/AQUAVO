# Packaging & Carton Planner — Operator Runbook

**Branch:** `feature/accounting-packaging-carton-planner` (from `origin/main` `f9237c8`)
**Production:** never written to during this work.

This runbook covers the steps that require a **write-capable** database
connection. The implementing session's Neon MCP server is configured read-only —
every write tool is removed — so branch creation and migration application were
not performed and must be run by an operator who has write access.

---

## 0. Preconditions

- Neon project `shiny-tree-43710630` (`fishweb`), production branch
  `br-patient-mouse-a4d4cgr4`.
- Nothing here touches Production. Every step runs on a **test branch**.
- Production release is a separate, separately-approved step. This runbook stops
  at Preview.

---

## 1. Verify migration 0039 recovery

0039 is applied in Production but its file was missing from git; it has been
reconstructed from live definitions (see `0039-recovery-provenance.md`).
Two checks prove the reconstruction is faithful.

### 1a. It reproduces the migration

```
neon branches create --name verify-0039-<date> --parent br-late-thunder-a42sjx9q
psql "$TEST_URL" -v ON_ERROR_STOP=1 \
  -f migrations/0039_accounting_phase1b_snapshot_writer_and_payment_ledger.sql
```

Then run the signature query below against **that branch** and against
**production**. All six hashes must match.

```sql
WITH sig AS (
 SELECT 'T:'||table_name AS s, 'tables' k FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE'
 UNION ALL SELECT 'C:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'-'), 'columns'
   FROM information_schema.columns WHERE table_schema='public'
 UNION ALL SELECT 'F:'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')='||md5(pg_get_functiondef(p.oid)), 'functions'
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
 UNION ALL SELECT 'G:'||c.relname||'.'||t.tgname||'='||md5(pg_get_triggerdef(t.oid)), 'triggers'
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL SELECT 'K:'||conrelid::regclass::text||'.'||conname||'='||md5(pg_get_constraintdef(oid)), 'constraints'
   FROM pg_constraint WHERE connamespace='public'::regnamespace
 UNION ALL SELECT 'I:'||indexname||'='||md5(indexdef), 'indexes'
   FROM pg_indexes WHERE schemaname='public'
)
SELECT k, count(*) n, md5(string_agg(s, E'\n' ORDER BY s)) h FROM sig GROUP BY k ORDER BY k;
```

**Pass condition:** six rows, identical `n` and `h` on both branches.

For reference, the values recorded from Production on 2026-07-31:

| category | n | h |
|---|---|---|
| columns | 3386 | `795fa0a819e341c1282375d5013a6547` |
| constraints | 843 | `d7ea3dfb966bc827052f53f4b9e4c918` |
| functions | 194 | `95d0ebfba9bc8fc53672cc9d7973a2a1` |
| indexes | 767 | `a6beebd05d96d56c463e87459450683f` |
| tables | 250 | `79ea96a5b521dcc331756868d4de1562` |
| triggers | 49 | `6b0dd7824f25fd047f85c5dde82c726b` |

### 1b. It is a no-op on an already-migrated database

```
neon branches create --name noop-0039-<date> --parent br-patient-mouse-a4d4cgr4
psql "$NOOP_URL" -f migrations/0039_...sql
```

Re-run the signature query on that branch. **All six hashes must be unchanged**
from the table above. That proves running the file against Production would
change nothing.

---

## 2. Apply the carton migrations to a test branch

```
neon branches create --name carton-test-<date> --parent br-patient-mouse-a4d4cgr4
```

Apply **in order**, each with `ON_ERROR_STOP=1`:

| # | file |
|---|---|
| 0040 | `0040_packaging_carton_catalog.sql` |
| 0041 | `0041_product_packing_data.sql` |
| 0042 | `0042_carton_reservations.sql` |
| 0043 | `0043_order_packing_plans.sql` |
| 0044 | `0044_admin_stock_alerts.sql` |
| 0045 | `0045_order_return_packaging_losses.sql` |
| 0046 | `0046_return_packaging_loss_source.sql` |
| 0047 | `0047_packing_import_drafts.sql` |
| 0048 | `0048_packing_policy_and_preparation_costs.sql` |

Each is wrapped in `BEGIN … COMMIT`, is idempotent, and registers itself in
`schema_migrations`.

### Post-apply assertions

```sql
-- 1. Exactly two materials seeded, both per_order, neither stock-tracked.
SELECT sku, calculation_basis, stock_tracked, current_unit_cost
  FROM fulfillment_materials WHERE sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD');
--    PRICE_LABEL           | per_order | f | 50
--    THANK_YOU_SOCIAL_CARD | per_order | f | 100

-- 2. NO cartons invented.
SELECT count(*) FROM fulfillment_materials WHERE material_kind = 'carton';   -- 0

-- 3. No product packing data invented.
SELECT count(*) FROM product_packing_data;                                    -- 0

-- 4. Historical orders untouched.
SELECT count(*) FROM orders;                                                  -- unchanged
SELECT md5(string_agg(id||':'||total||':'||coalesce(rounded_total::text,'-')||':'||coalesce(box_cost::text,'-'), E'\n' ORDER BY id))
  FROM orders;   -- must equal the value captured before applying

-- 5. Product inventory untouched.
SELECT count(*) FROM inventory_movements;                                     -- unchanged
SELECT count(*) FROM packaging_inventory_movements;                           -- unchanged

-- 6. Return events: all four still 'manual', all still zero.
SELECT packaging_loss_source, count(*), sum(packaging_loss)
  FROM order_return_events GROUP BY 1;   -- manual | 4 | 0

-- 7. Operational flags unchanged.
SELECT key, value FROM settings
 WHERE key IN ('inventory_ledger_mode','payment_ledger_enabled','financial_snapshot_writer_enabled');
--    enforce / true / true

-- 8. Tax Final still fail-closed.
SELECT tax_report_ready, primary_tax_blocker FROM accounting_readiness_status;
--    f | historical_realized_lines_lack_exact_cost_snapshots (or similar)
```

### Rollback rehearsal

Apply the rollbacks in **reverse** order (0048 → 0040) on a throwaway branch and
confirm the schema returns to its pre-0040 signature. All nine migrations are
additive, so rollback drops only what they added.

---

## 3. Concurrency proof (requires a real database)

The unit suite covers the decision logic; the last-carton race needs a real
Postgres. On the test branch:

1. Seed one carton with `on_hand = 1` via a `purchase_receipt` movement.
2. From two connections, simultaneously call `reserveCartons` for two different
   orders, each needing 1.
3. **Expected:** one succeeds; the other fails with
   `INSUFFICIENT_CARTON_STOCK`. Never two active reservations.
4. Confirm `SELECT sum(quantity) FROM carton_reservations WHERE state='active'`
   is exactly 1.

The guarantee comes from `pg_advisory_xact_lock(hashtext('carton:'||material_id))`
taken in sorted material order, with the availability re-check performed inside
the lock.

---

## 4. Vercel Preview

Authorised for **Preview only**. Not authorised for Production.

The Vercel CLI is not installed in the implementing environment and the repo has
no `.vercel` link directory, so the project/team could not be discovered:

```
npm i -g vercel
cd C:\A16
vercel link          # authorised by the owner, Preview scope only
vercel deploy        # Preview. NOT `vercel deploy --prod`.
```

Preview needs `DATABASE_URL` pointed at the **test branch**, never Production.

---

## 5. What must not happen

- No `npm run db:push` — the schema has drifted and push would attempt
  destructive reconciliation.
- No write to `products.stock`, variant stock, or `inventory_movements` from any
  carton code path.
- No re-application of 0039 to Production; the row already exists.
- No `vercel deploy --prod` without the separate Production release token.
- No merge to `main`.

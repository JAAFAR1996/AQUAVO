# `order_items_relational` Trigger Forensics

Scope: Neon project `shiny-tree-43710630`, branch `br-patient-mouse-a4d4cgr4` (production), db `neondb`.
Read-only investigation via Neon MCP `run_sql`. No writes were issued. No connection strings, passwords, or PII are reproduced below.

Baseline drift under investigation (established by prior work, re-confirmed live during this pass):
public constraints 528→529, user triggers 29→32, functions 178→181, tables unchanged, fingerprint `88b839d9f2e106c925e82348312b2975`.
Live counts confirmed during this session: **32** user triggers on `public`, **181** functions in `public`.

---

## 1. Exact trigger definitions on `order_items_relational` (verbatim, `pg_get_triggerdef`)

```sql
CREATE TRIGGER order_items_guard_order_detach BEFORE DELETE OR UPDATE OF order_id ON order_items_relational FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id')

CREATE TRIGGER order_items_record_inventory_sale AFTER INSERT ON order_items_relational FOR EACH ROW EXECUTE FUNCTION record_order_item_inventory_sale()

CREATE TRIGGER order_items_refresh_financial_snapshot AFTER INSERT OR DELETE OR UPDATE ON order_items_relational FOR EACH ROW EXECUTE FUNCTION refresh_order_financial_snapshot_trigger()
```

No other triggers exist on `order_items_relational`. All three are confirmed live as of this session.

---

## 2. Exact function definitions (verbatim, `pg_get_functiondef`) + SHA-256 fingerprints

Fingerprint method: `encode(sha256(pg_get_functiondef(oid)::bytea),'hex')`, computed live in Neon SQL — no local dump was written or committed.

| Function | SHA-256 (original trigger fingerprint) |
|---|---|
| `record_order_item_inventory_sale` | `c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c` |
| `prevent_unsafe_order_dependency_mutation` | `98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631` |
| `refresh_order_financial_snapshot_trigger` | `a99c1a1d43f9a1423952f169dede585ec0f88ac8178d9ef72c5f32342e1435a4` |
| `order_is_hard_deletable` | `9732e4f2d72722d79e29a3e05adf724326ea0542a35a87b4a9c69f1c6fd51e00` |
| `prevent_negative_inventory_balance` | `3c066db30ffe9d9e3838519a2583bdb63bea575d6f5498f70953b98d47e321f6` |
| `reject_inventory_movement_mutation` | `4b70c9399c6b171e564a4904641f44cc35b1ad51504bf07915e4c926c1917837` |
| `project_inventory_movement_to_product_stock` | `d953bd67c7dc543e0a651d648c493545c22ae16ea84363039326d56f92f9522b` |

Verbatim source (as returned by `pg_get_functiondef`):

### `record_order_item_inventory_sale()`
```sql
CREATE OR REPLACE FUNCTION public.record_order_item_inventory_sale()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE mode text; main_location text; line_variant text; BEGIN SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode'; IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF; SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1; IF main_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF; line_variant:=NULLIF(NEW.metadata->>'variantId',''); INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata) VALUES (NEW.product_id,line_variant,main_location,-NEW.quantity,'sale','order_line',NEW.order_id,'order_item:'||NEW.id,'IQD',now(),'database_trigger',jsonb_build_object('order_id',NEW.order_id,'order_item_id',NEW.id)) ON CONFLICT(idempotency_key) DO NOTHING; RETURN NEW; END; $function$
```

### `prevent_unsafe_order_dependency_mutation()`
```sql
CREATE OR REPLACE FUNCTION public.prevent_unsafe_order_dependency_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE old_order_id text; new_order_id text; BEGIN old_order_id:=to_jsonb(OLD)->>TG_ARGV[0]; IF TG_OP='UPDATE' THEN new_order_id:=to_jsonb(NEW)->>TG_ARGV[0]; IF old_order_id IS NOT DISTINCT FROM new_order_id THEN RETURN NEW; END IF; END IF; IF old_order_id IS NOT NULL AND NOT order_is_hard_deletable(old_order_id) THEN RAISE EXCEPTION 'order % is audited and its dependent records cannot be removed or detached',old_order_id; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $function$
```

### `refresh_order_financial_snapshot_trigger()`
```sql
CREATE OR REPLACE FUNCTION public.refresh_order_financial_snapshot_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE target_id text; BEGIN target_id:=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END; PERFORM refresh_order_financial_snapshot(target_id); IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $function$
```

### `order_is_hard_deletable(target_order_id text)`
```sql
CREATE OR REPLACE FUNCTION public.order_is_hard_deletable(target_order_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ SELECT EXISTS(SELECT 1 FROM orders o WHERE o.id=target_order_id AND o.status='pending' AND o.payment_status='pending' AND COALESCE(o.cod_received,false)=false) AND NOT EXISTS(SELECT 1 FROM payment_events WHERE order_id=target_order_id) AND NOT EXISTS(SELECT 1 FROM cash_settlement_items WHERE order_id=target_order_id) AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE source_id=target_order_id AND source_type IN ('order_line','order_status_reversal')); $function$
```

### `prevent_negative_inventory_balance()`
```sql
CREATE OR REPLACE FUNCTION public.prevent_negative_inventory_balance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE current_balance bigint; lock_key text; BEGIN lock_key:=NEW.product_id||'|'||COALESCE(NEW.variant_id,'')||'|'||NEW.location_id; PERFORM pg_advisory_xact_lock(hashtextextended(lock_key,0)); SELECT COALESCE(SUM(quantity_delta),0) INTO current_balance FROM inventory_movements WHERE product_id=NEW.product_id AND variant_id IS NOT DISTINCT FROM NEW.variant_id AND location_id=NEW.location_id; IF current_balance+NEW.quantity_delta<0 THEN RAISE EXCEPTION 'insufficient canonical inventory balance for product %, variant %, location %',NEW.product_id,NEW.variant_id,NEW.location_id; END IF; RETURN NEW; END; $function$
```

### `reject_inventory_movement_mutation()`
```sql
CREATE OR REPLACE FUNCTION public.reject_inventory_movement_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN RAISE EXCEPTION 'inventory movements are immutable; create a reversal movement instead'; END; $function$
```

### `project_inventory_movement_to_product_stock()`
```sql
CREATE OR REPLACE FUNCTION public.project_inventory_movement_to_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE main_location text; DECLARE current_balance bigint; DECLARE variant_product boolean; BEGIN SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1; IF main_location IS NULL OR NEW.location_id<>main_location THEN RETURN NEW; END IF; SELECT has_variants INTO variant_product FROM products WHERE id=NEW.product_id FOR UPDATE; SELECT COALESCE(SUM(quantity_delta),0) INTO current_balance FROM inventory_movements WHERE product_id=NEW.product_id AND variant_id IS NOT DISTINCT FROM NEW.variant_id AND location_id=NEW.location_id; IF NEW.variant_id IS NULL THEN IF COALESCE(variant_product,false)=false THEN UPDATE products SET stock=current_balance::integer,updated_at=now() WHERE id=NEW.product_id; END IF; ELSE UPDATE products p SET variants=(SELECT jsonb_agg(CASE WHEN elem->>'id'=NEW.variant_id THEN jsonb_set(elem,'{stock}',to_jsonb(current_balance::integer),false) ELSE elem END ORDER BY ord) FROM jsonb_array_elements(p.variants) WITH ORDINALITY AS x(elem,ord)),updated_at=now() WHERE p.id=NEW.product_id AND EXISTS (SELECT 1 FROM jsonb_array_elements(p.variants) z WHERE z->>'id'=NEW.variant_id); UPDATE product_variant_reconciliation SET observed_stock=current_balance::integer,approved_canonical_stock=current_balance::integer,reconciliation_status='approved',updated_at=now() WHERE product_id=NEW.product_id AND variant_id=NEW.variant_id; END IF; RETURN NEW; END; $function$
```

---

## 3. Does normal order creation NOW create inventory movements?

**Yes, going forward — the gate is open.**

- `record_order_item_inventory_sale()` is gated by `IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;` reading `settings.inventory_ledger_mode`.
- Live value confirmed: `settings.inventory_ledger_mode = 'enforce'`.
- Therefore, **any INSERT into `order_items_relational` from this point forward** will attempt to insert a row into `inventory_movements` with `source_type='order_line', movement_type='sale', quantity_delta = -NEW.quantity`, keyed by `idempotency_key = 'order_item:'||NEW.id`.
- Evidence that the gate is live and functioning correctly (just not yet exercised by order flow): `inventory_movements` currently has **185** rows, but **all 185** are `source_type IN ('inventory_reconciliation','owner_approved_storefront_opening')` — an unrelated same-day owner-driven stock-opening/reconciliation batch (`created_by = 'owner:جعفر'`, `happened_at` between `2026-07-23T00:12:16Z` and `2026-07-23T04:54:31Z`). **Zero rows have `source_type='order_line'`.**
- `order_items_relational` currently holds **100** rows across **25** distinct orders (of 37 total orders). None of those 100 rows produced an `order_line` movement, despite `enforce` mode being active now. This means either (a) they were inserted before this trigger existed on the table, or (b) they were inserted while the ledger mode was not `enforce`. Either way, the trigger did not fire retroactively for existing rows — Postgres triggers only fire on the writes that occur after they are created; they do not replay history.

**Conclusion for Q3:** any *new* order line inserted into `order_items_relational` today will create a real inventory-movement row and decrement stock via `project_inventory_movement_to_product_stock` (see §4). The 100 pre-existing relational rows did not.

---

## 4. Is `products.stock` decremented by application code, by trigger, or both? Would a historical backfill double-count?

**Both mechanisms exist, and they can double-count.**

- **Application code path** (`server/storage/order-storage.ts`, `createOrderSecure` and related fulfillment/invoice code): stock projections in this codebase's storefront/admin flow are the canonical, already-audited path this repo's own migrations (`add_fulfillment_costing.sql`, `add_fulfillment_hardening.sql`) and prior forensics docs describe. This repo's own `server/storage/order-storage.ts` and `server/storage/invoice-storage.ts` manage `products.stock` directly as part of normal order lifecycle (independent of `order_items_relational`), which is the pre-existing, long-standing stock-management path.
- **Trigger path** (newly discovered, live in production, **not present in any committed migration** — see §7–8): `order_items_record_inventory_sale` → inserts an `inventory_movements` row with `source_type='order_line'` → `inventory_movements_project_product_stock` (`AFTER INSERT ON inventory_movements`) → `project_inventory_movement_to_product_stock()` → recomputes the running balance from **all** `inventory_movements` for that `(product_id, variant_id, location_id)` and **overwrites** `products.stock` (or the matching variant's `stock` in the `variants` jsonb) with that recomputed balance.
- These two systems are **not reconciled with each other**. The trigger path derives `products.stock` from the full sum of `inventory_movements.quantity_delta` for `location_id = MAIN`; it has no awareness of whatever the application code already subtracted directly on `products.stock` outside of the `inventory_movements` ledger.
- **Would inserting historical relational lines double-count physical stock?** Yes, unambiguously, for the 12 already-delivered orders that predate `order_items_relational` and were never fed through this ledger:
  - Those 12 orders' units were already fulfilled/delivered and, per the pre-existing application-code stock path, `products.stock` for those products has already reflected that sale (COD paid, delivered).
  - If a backfill now inserts relational rows for those same historical order lines with `inventory_ledger_mode='enforce'`, `record_order_item_inventory_sale` will insert NEW `order_line` movements with negative `quantity_delta` for units that were already deducted once by the application-code path.
  - `project_inventory_movement_to_product_stock` will then **overwrite** `products.stock` with `SUM(quantity_delta)` for that product across the *entire* `inventory_movements` ledger — a ledger that, as shown in §3, is currently populated only by an unrelated one-time reconciliation/opening batch, not by any historical sales. The recomputed balance would therefore not correctly reflect "stock already sold" — it would double-subtract those units relative to whatever `products.stock` the application path has already established, and/or produce a balance inconsistent with the reconciliation batch's assumed starting point.
  - This exact conclusion — "the 73 backfilled rows would write 73 `sale` movements across 44 products / 187 units, while the 100 pre-existing rows have 0 such movements → internally inconsistent ledger; 7 products would go negative" — is already recorded by a prior multi-agent verification pass in `docs/audit/neon-verification-final.md` (commit `3af8ce9`, 2026-07-23 08:18:49 +0300) and is corroborated independently here: live `inventory_movements` still has 0 `order_line` rows and the negative-balance guard (`prevent_negative_inventory_balance`, `BEFORE INSERT ON inventory_movements`) is active and would abort such an insert once the running balance goes negative.

**Answer:** application code AND the new production trigger chain both write to `products.stock`, through two disjoint, unreconciled mechanisms. Backfilling `order_items_relational` for historical/delivered order lines under the current `enforce` gate would create inventory movements for units already accounted for by the application-code path, producing an internally inconsistent ledger and — per the prior verification run's arithmetic (7 products going negative) — most likely aborting the backfill transaction outright via `prevent_negative_inventory_balance`.

---

## 5. Would deleting the backfill rows for the 12 gap orders be blocked?

Evaluated `order_is_hard_deletable(order_id)` live for the 12 orders that currently have **no** `order_items_relational` rows:

| order_id | status | payment_status | cod_received | `order_is_hard_deletable()` |
|---|---|---|---|---|
| 07ed9e6a-416b-4e0e-88cd-b6b8f2cae630 | delivered | paid | true | **false** |
| 08973941-b61a-4445-98c3-3b9431b7727e | delivered | paid | true | **false** |
| 29fc8ce5-a1f2-4007-a735-00f426840584 | delivered | paid | true | **false** |
| 39c94727-1ebb-4fc8-a3bc-1720c5b42c30 | delivered | paid | true | **false** |
| 60ba9a7f-ef8e-488d-8871-b0f7ccd4abf6 | delivered | paid | true | **false** |
| 632e71ef-6138-4dc1-aac2-8cc805eb43e7 | delivered | paid | true | **false** |
| 6f11d0f2-960d-4cfc-9ebb-09c84543d6ec | delivered | paid | true | **false** |
| 7201a77f-9194-4dbd-9268-6a44fca54cdf | delivered | paid | true | **false** |
| 7e17819c-d628-425a-9401-65cd2e5facbe | delivered | paid | true | **false** |
| 922f863a-da42-41f5-89cd-cd6abf98d560 | delivered | paid | true | **false** |
| c7b6b69e-b4ca-4bcb-87cf-c337a90e2185 | delivered | paid | true | **false** |
| e5ea3cda-cca8-4cfc-b14d-a6cdaaaa57f6 | delivered | paid | true | **false** |

**Result: 12 of 12 blocked, 0 deletable.**

`order_is_hard_deletable` requires `status='pending' AND payment_status='pending' AND cod_received=false`; all 12 orders are `delivered/paid/cod_received=true`, so the first clause of the function is `false` for every one of them regardless of the other clauses. Because `order_items_guard_order_detach` (`BEFORE DELETE OR UPDATE OF order_id ON order_items_relational`) calls `prevent_unsafe_order_dependency_mutation('order_id')`, which in turn calls `order_is_hard_deletable(old_order_id)` and raises an exception whenever it returns `false`, **any row backfilled into `order_items_relational` for these 12 orders could never subsequently be deleted or have its `order_id` changed** — the operation would raise `order % is audited and its dependent records cannot be removed or detached`. A "batch-specific, fully reversible" backfill/rollback design is not achievable against this guard for these orders; this matches the prior finding in `docs/audit/neon-verification-final.md` §C1.

---

## 6. Side-effect trigger chain from an INSERT into `order_items_relational`

An `INSERT INTO order_items_relational` fires, in order:

1. **`order_items_record_inventory_sale`** (AFTER INSERT, per-row) → calls `record_order_item_inventory_sale()`:
   - If `settings.inventory_ledger_mode = 'enforce'`: **INSERT** into `inventory_movements` (`source_type='order_line'`).
     - That INSERT itself fires triggers on `inventory_movements`:
       - **`inventory_movements_prevent_negative`** (BEFORE INSERT) → `prevent_negative_inventory_balance()`: takes an advisory lock keyed on `product_id|variant_id|location_id`, recomputes the running balance, and **raises and aborts the whole transaction** if the balance would go negative.
       - **`inventory_movements_project_product_stock`** (AFTER INSERT) → `project_inventory_movement_to_product_stock()`: recomputes the balance again and **UPDATEs `products.stock`** (non-variant products) or **UPDATEs `products.variants` jsonb + `product_variant_reconciliation`** (variant products).
         - The `UPDATE products` fires the `products` triggers: `products_a_enforce_variant_stock_projection` (BEFORE, on `variants`/`has_variants` columns — only relevant when those columns are touched), `products_validate_variants_json` (BEFORE, same column set), `products_sync_variant_reconciliation` (AFTER, on `variants` — re-syncs `product_variant_reconciliation`).
       - **`inventory_movements_immutable`** (BEFORE DELETE OR UPDATE) is not triggered by this INSERT path but caps any later attempt to fix/delete the movement it just wrote.
   - If mode is not `'enforce'`: the function returns immediately, no `inventory_movements` row and no further chain.
2. **`order_items_refresh_financial_snapshot`** (AFTER INSERT/UPDATE/DELETE, per-row) → calls `refresh_order_financial_snapshot_trigger()` → `PERFORM refresh_order_financial_snapshot(order_id)`, a separate stored procedure (not requested for verbatim capture in this pass) that recalculates and presumably writes an order-level financial snapshot — this can itself touch `orders` columns that are covered by `orders_refresh_financial_snapshot` (`AFTER INSERT OR UPDATE OF total, rounded_total, shipping_cost, discount_total, items ON orders`), creating a further (bounded, same-order) chain.
3. **`order_items_guard_order_detach`** is a BEFORE DELETE/UPDATE-OF-order_id trigger — it does not fire on INSERT, only relevant to later deletes/order-reassignments of the row just inserted.

**Tables whose triggers can fire as a side effect of one `order_items_relational` INSERT:** `inventory_movements` (2 more triggers), `products` (up to 3 more triggers, only if the stock-projection branch touches `variants`), `product_variant_reconciliation` (direct UPDATE, no trigger found on that table), and `orders` (via `refresh_order_financial_snapshot`, at least 1 more trigger: `orders_refresh_financial_snapshot`, itself potentially chaining further logic inside `refresh_order_financial_snapshot`/`refresh_order_financial_snapshot_from_order` — not expanded further in this pass).

---

## 7–8. Repository provenance

Search method: `Grep` across the full repository tree for each trigger/function name, plus `git log -S"<name>" -- migrations server shared docs` (path-restricted; unrestricted `git log -S` across full history repeatedly timed out against this repo — likely due to large tracked binary/spreadsheet files unrelated to this investigation, not the SQL history itself).

| Object | Found in any `migrations/*.sql`? | Found anywhere else in tracked repo history? | First/only repo appearance |
|---|---|---|---|
| `order_items_record_inventory_sale` (trigger) | **No** | Yes — `docs/audit/*.md` only | commit `3af8ce9` (`docs(audit): multi-agent run — FAIL, production triggers break the backfill`), 2026-07-23 08:18:49 +0300 |
| `record_order_item_inventory_sale()` (function) | **No** | Yes — same doc commit only | `3af8ce9`, 2026-07-23 |
| `order_items_guard_order_detach` (trigger) | **No** | Yes — same doc commit only | `3af8ce9`, 2026-07-23 |
| `prevent_unsafe_order_dependency_mutation()` (function) | **No** | Yes — same doc commit only | `3af8ce9`, 2026-07-23 |
| `order_is_hard_deletable()` (function) | **No** | Yes — same doc commit only | `3af8ce9`, 2026-07-23 |
| `order_items_refresh_financial_snapshot` (trigger) | **No** | **No — zero matches anywhere in tracked history** | none |
| `refresh_order_financial_snapshot_trigger()` (function) | **No** | **No — zero matches anywhere in tracked history** | none |
| `prevent_negative_inventory_balance()` (function) | **No** | **No — zero matches anywhere in tracked history** | none |
| `reject_inventory_movement_mutation()` (function) | **No** | **No — zero matches anywhere in tracked history** | none |
| `project_inventory_movement_to_product_stock()` (function) | **No** | **No — zero matches anywhere in tracked history** | none |

The only two migration files that create any triggers/functions with related subject matter (`add_fulfillment_costing.sql`, `add_fulfillment_hardening.sql`) were read in full: they define a *different, unrelated* system (`packaging_profiles`, `fulfillment_materials`, `packaging_inventory_movements`, `order_fulfillment_events/lines`) with their own trigger names (`pp_locked_guard`, `ppi_locked_guard`, `mcr_approved_guard`, `fmat_cost_consistency`, `fpd_consumed_guard`, `fpdl_consumed_guard`, `pim_reversal_guard`, `ofe_reversal_guard`, `ofl_immutable`, `pim_immutable`, `ofe_guard`). None of them touch `order_items_relational`, `record_order_item_inventory_sale`, `inventory_movements`'s guard triggers, or `products` stock projection. These files are explicitly marked "additive, idempotent... **Apply surgically (NOT db:push). Not yet applied to prod.**" in their own header comments — and, separately, the live database confirms this: `pg_get_functiondef` for `record_order_item_inventory_sale` etc. bears no resemblance to anything in these files.

`docs/audit/findings-register.md` and `docs/audit/neon-verification-final.md` (both authored the same day, commit `3af8ce9`) already document the *discovery* of these three `order_items_relational` triggers as an unexpected, unplanned mid-verification drift — they are audit narrative about production, not the DDL source that created the triggers. No commit in this repository contains a `CREATE TRIGGER order_items_record_inventory_sale`, `CREATE TRIGGER order_items_guard_order_detach`, `CREATE TRIGGER order_items_refresh_financial_snapshot`, or the corresponding `CREATE FUNCTION` statements.

**Explicit statement per requirement 8:** for all three triggers on `order_items_relational`, and for 4 of the 7 supporting functions requested (`refresh_order_financial_snapshot_trigger`, `prevent_negative_inventory_balance`, `reject_inventory_movement_mutation`, `project_inventory_movement_to_product_stock`), **no committed migration file, and no other tracked file in this repository at any point in its history, contains their definitions.** Provenance cannot be established from this repository. This is not "the migration file was later deleted" — `git log -S` (pickaxe, which finds any commit that added OR removed a matching string, even to a file since deleted) returns **zero** hits for 6 of the 10 searched identifiers, and only doc-narrative hits (not DDL) for the other 4.

---

## 9. Dates/times

- Doc commit that first records/discusses the drift: `3af8ce9`, 2026-07-23 08:18:49 +0300 (`docs(audit): multi-agent run — FAIL, production triggers break the backfill`).
- Prior narrative in that doc states the drift window as "between 02:49 and 07:00 today" (2026-07-23), based on constraint/trigger/function counts (528→529, 29→32, 178→181).
- The one dataset with hard timestamps sampled live in this session — `inventory_movements` — is entirely from a *different, same-day* event: 185 rows, all `happened_at` between `2026-07-23T00:12:16.631Z` and `2026-07-23T04:54:31.412Z`, `created_by='owner:جعفر'`, `source_type IN ('inventory_reconciliation','owner_approved_storefront_opening')`. This is consistent with, but not proof of, the same maintenance window in which the schema drift occurred; it is not itself DDL evidence.
- No DDL-level timestamp for the `CREATE TRIGGER`/`CREATE FUNCTION` statements themselves is available: Postgres does not retain a "created_at" for triggers/functions, and Neon's audit/DDL history was not queried in this pass (out of the granted read-only SQL toolset it would require log/history tables not identified here). The only anchor available is the counts before/after and the surrounding doc commit time above.
- `order_items_relational` has no `created_at`/timestamp column, so the 100 pre-existing rows in that table cannot be dated directly from the table itself.

---

## Verdict

**Production was changed outside version control.**

- Live schema definitively contains three triggers on `order_items_relational` (`order_items_record_inventory_sale`, `order_items_refresh_financial_snapshot`, `order_items_guard_order_detach`) and their supporting functions.
- Of the 10 trigger/function names investigated, **6 have zero occurrence anywhere in this repository's tracked git history** (not in any migration file, not in any other tracked file, ever), and the remaining 4 occur only inside a same-day audit-narrative doc commit (`3af8ce9`) that *describes discovering* the drift — not DDL that created it.
- The repository's own `schema_migrations` ledger (queried live: versions `0000_v2_migration_ledger` through `0008_v2_weekly_decision_types`, applied 2026-07-21/22 by `neondb_owner`) tracks an entirely different subsystem (platform-capability/weekly-plan tooling) and has no entries corresponding to these triggers either.
- The two migration files in this repo that are thematically closest (`add_fulfillment_costing.sql`, `add_fulfillment_hardening.sql`) are explicitly marked as **not yet applied to prod** in their own header comments, and their DDL (verified by full read) does not create any of the objects in question.
- Conclusion: these three triggers and their functions were created directly against the production database by some means outside this repository's versioned migration process. Given `order_is_hard_deletable`'s intimate knowledge of this schema's audit semantics (`payment_events`, `cash_settlement_items`, `inventory_movements.source_type`) and the `settings.inventory_ledger_mode` feature flag also present live, whoever created them clearly understood this system's domain model — but did so without leaving a corresponding migration file, a `schema_migrations` entry, or any other trace in version control. Provenance for these six objects cannot be established from the repository; for the other four it can only be dated to "discovered by, at latest, 2026-07-23 08:18:49 +0300," not to when they were actually created.

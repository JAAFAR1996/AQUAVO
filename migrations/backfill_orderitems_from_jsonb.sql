-- ============================================================================
-- BACKFILL: orders.items (JSONB)  →  order_items_relational
-- ============================================================================
-- EXECUTION CONTRACT (mandatory)
--   This file contains NO top-level BEGIN / COMMIT / ROLLBACK. The EXECUTOR owns
--   the transaction and MUST submit the complete file through one write-capable
--   transactional call:
--       BEGIN;  <entire file>  COMMIT;      -- on any error: ROLLBACK;
--   Every statement here — control-table creation, guards, locking, batch
--   creation, inserted lines and the completion stamp — then rolls back together.
--   PostgreSQL has no true nested transactions; internal BEGIN/COMMIT inside a
--   file wrapped by an external transaction produces warnings, can commit the
--   outer transaction early, and makes rollback evidence ambiguous.
--
-- DEPENDENCY (HARD): migrations/add_order_item_cost_snapshot.sql MUST be applied
-- first. STEP 2 raises an exception otherwise.
--
-- DEPENDENCY (HARD): migrations/add_orderitem_backfill_trigger_safety.sql MUST be
-- applied first (introduces the AFTER INSERT inventory-sale trigger's suppression
-- exception on order_items_relational). Without it, inserting the missing lines
-- will fire live inventory-sale movements for historical rows.
--
-- REQUIRED PARAMETER — set in the SAME transaction, BEFORE this file:
--       SET LOCAL aquavo.backfill_batch_id = '<fresh-uuid-generated-by-the-executor>';
--   There is deliberately NO internal `gen_random_uuid()` default anymore. The
--   trigger-safety migration's inventory-sale suppression exception is keyed off
--   this same GUC, and the exception must be visible to the trigger BEFORE the
--   INSERT that fires it — which is only possible if the batch id exists as a
--   session GUC (and as a row in orderitem_backfill_batches) before this file's
--   INSERT INTO order_items_relational runs. Generating the id inside this
--   migration (as before) would make it unknowable to the executor in time to
--   `SET LOCAL` it first, so the executor now owns UUID generation. Without this
--   GUC the migration RAISES immediately and writes nothing (fail closed).
--
-- CORRECTNESS RULES
--   * Cost is UNKNOWN for historical lines → NULL, never 0, never today's cost.
--   * Quantity is NEVER defaulted to 1. Price is NEVER defaulted to 0. A line
--     missing either is unresolved, not invented.
--   * Reconciliation is LINE-BY-LINE on the canonical identity, not order-by-order.
--   * Ambiguous duplicate groups are reported, never silently paired.
--   * Existing app-created rows are NEVER updated and NEVER deleted.
--
-- FAIL-CLOSED: if any JSONB line is unresolved, or any duplicate group is
-- ambiguous, this migration RAISES and the executor must roll back. To proceed
-- after owner review, set the override in the SAME transaction, before this file:
--       SET LOCAL aquavo.backfill_allow_unresolved = 'on';
-- Unresolved lines are then left uninserted and the reconciliation is recorded
-- as INCOMPLETE on the batch row.
--
-- Read-only detail of unresolved lines: migrations/backfill_orderitems_reconcile_report.sql
-- ============================================================================


-- ── STEP 1: batch control table (idempotent) ───────────────────────────────
CREATE TABLE IF NOT EXISTS orderitem_backfill_batches (
  batch_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  source         text NOT NULL DEFAULT 'orders.items',
  migration      text NOT NULL DEFAULT 'backfill_orderitems_from_jsonb.sql',
  rows_inserted  integer,
  unresolved_lines integer,
  ambiguous_groups integer,
  reconciliation_complete boolean,
  rolled_back_at timestamptz,
  note           text
);

-- Older deployments may predate these columns; add them idempotently.
ALTER TABLE orderitem_backfill_batches
  ADD COLUMN IF NOT EXISTS unresolved_lines        integer,
  ADD COLUMN IF NOT EXISTS ambiguous_groups        integer,
  ADD COLUMN IF NOT EXISTS reconciliation_complete boolean;


-- ── STEP 2: HARD GUARD — refuse to run without the snapshot columns ────────
DO $guard$
DECLARE missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO missing
  FROM unnest(ARRAY[
    'unit_cost_price','unit_packaging_cost','unit_insert_cost',
    'cost_snapshot_status','cost_snapshot_source','cost_snapshot_confidence',
    'cost_snapshot_version','cost_snapshot_at'
  ]) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='order_items_relational' AND column_name=c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'ABORT: add_order_item_cost_snapshot.sql has not been applied. Missing columns: %', missing;
  END IF;
END
$guard$;


-- ── STEP 3: BACKFILL ───────────────────────────────────────────────────────
-- Runs inside the EXECUTOR's transaction. No transaction control here.
DO $backfill$
DECLARE
  v_batch_txt  text := current_setting('aquavo.backfill_batch_id', true);
  v_batch      uuid;
  v_missing    bigint;
  v_unresolved bigint;
  v_ambig      bigint;
  v_ins        bigint;
  v_allow      text := COALESCE(current_setting('aquavo.backfill_allow_unresolved', true), 'off');
  v_reasons    text;
BEGIN
  ---------------------------------------------------------------------------
  -- 3.0 FAIL CLOSED: an explicit, fresh batch id is mandatory — checked before
  --     any other work so a missing GUC never falls through to a partial run.
  ---------------------------------------------------------------------------
  IF v_batch_txt IS NULL OR btrim(v_batch_txt) = '' THEN
    RAISE EXCEPTION
      'ABORT: no batch id supplied. Set "SET LOCAL aquavo.backfill_batch_id = ''<uuid>'';" '
      'in the SAME transaction, BEFORE this file — the trigger-safety inventory-suppression '
      'exception depends on the GUC being visible before the INSERT. There is deliberately no default.';
  END IF;

  BEGIN
    v_batch := btrim(v_batch_txt)::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'ABORT: aquavo.backfill_batch_id (%) is not a valid uuid.', v_batch_txt;
  END;

  IF EXISTS (SELECT 1 FROM orderitem_backfill_batches WHERE batch_id = v_batch) THEN
    RAISE EXCEPTION
      'ABORT: batch id % already exists in orderitem_backfill_batches — the executor '
      'must supply a fresh, never-before-used UUID for every run.', v_batch;
  END IF;

  -- Serialize concurrent backfill attempts.
  LOCK TABLE order_items_relational IN SHARE ROW EXCLUSIVE MODE;

  ---------------------------------------------------------------------------
  -- 3a. Parse and classify every JSONB line. Nothing is defaulted.
  ---------------------------------------------------------------------------
  CREATE TEMP TABLE _bf_lines ON COMMIT DROP AS
  WITH j_raw AS (
    SELECT o.id AS order_id, e.ord AS jsonb_index, e.item
    FROM orders o
    CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS e(item, ord)
    WHERE jsonb_typeof(o.items) = 'array'
  ),
  j_parsed AS (
    SELECT order_id, jsonb_index, item,
      NULLIF(btrim(item->>'productId'), '')       AS product_id,
      NULLIF(btrim(item->>'quantity'), '')        AS q_txt,
      NULLIF(btrim(item->>'priceAtPurchase'), '') AS p_txt,
      NULLIF(btrim(item->>'lineTotal'), '')       AS t_txt,
      COALESCE(NULLIF(btrim(item->>'variantId'), ''),
               NULLIF(lower(btrim(item->>'variantLabel')), ''),
               '~none~')                          AS variant_key
    FROM j_raw
  ),
  j_typed AS (
    SELECT *,
      CASE WHEN q_txt ~ '^[0-9]+$'            THEN q_txt::numeric END AS qty,
      CASE WHEN p_txt ~ '^[0-9]+(\.[0-9]+)?$' THEN p_txt::numeric END AS price,
      CASE WHEN t_txt ~ '^[0-9]+(\.[0-9]+)?$' THEN t_txt::numeric END AS total
    FROM j_parsed
  )
  SELECT order_id, jsonb_index, item, product_id, variant_key,
         qty, price, total,
         CASE
           WHEN jsonb_typeof(item) <> 'object'                                THEN 'malformed_jsonb_line'
           WHEN product_id IS NULL                                            THEN 'missing_product_id'
           WHEN NOT EXISTS (SELECT 1 FROM products p WHERE p.id = product_id) THEN 'missing_product'
           WHEN q_txt IS NULL OR qty IS NULL OR qty <= 0                      THEN 'invalid_quantity'
           WHEN p_txt IS NULL                                                 THEN 'missing_price'
           WHEN price IS NULL                                                 THEN 'invalid_price'
           WHEN t_txt IS NOT NULL AND total IS NULL                           THEN 'invalid_total'
           WHEN t_txt IS NOT NULL AND total <> qty * price                    THEN 'total_mismatch'
           ELSE NULL
         END AS reason_code
  FROM j_typed;

  SELECT count(*) INTO v_unresolved FROM _bf_lines WHERE reason_code IS NOT NULL;

  ---------------------------------------------------------------------------
  -- 3b. Canonical identity + ambiguity detection.
  ---------------------------------------------------------------------------
  CREATE TEMP TABLE _bf_j ON COMMIT DROP AS
  SELECT order_id, jsonb_index, item, product_id, variant_key,
         qty::int AS quantity, price AS price_at_purchase,
         COALESCE(total, qty * price) AS total_price,
         row_number() OVER (
           PARTITION BY order_id, product_id, variant_key, qty,
                        price, COALESCE(total, qty * price)
           ORDER BY jsonb_index) AS occ
  FROM _bf_lines WHERE reason_code IS NULL;

  CREATE TEMP TABLE _bf_r ON COMMIT DROP AS
  SELECT id, order_id, product_id, quantity, price_at_purchase, total_price, variant_key,
         row_number() OVER (
           PARTITION BY order_id, product_id, variant_key, quantity,
                        price_at_purchase, total_price
           ORDER BY id) AS occ
  FROM (
    SELECT id, order_id, product_id, quantity, price_at_purchase, total_price,
      COALESCE(NULLIF(btrim(metadata->>'variantId'), ''),
               NULLIF(lower(btrim(metadata->>'variantLabel')), ''),
               '~none~') AS variant_key
    FROM order_items_relational
  ) b;

  -- Ambiguous: JSONB side has >1 variant for a (order,product,qty,price) cluster
  -- AND a relational row there carries no variant metadata → unprovable pairing.
  CREATE TEMP TABLE _bf_ambig ON COMMIT DROP AS
  SELECT order_id, product_id, quantity, price_at_purchase
  FROM _bf_j GROUP BY 1,2,3,4 HAVING count(DISTINCT variant_key) > 1
  INTERSECT
  SELECT order_id, product_id, quantity, price_at_purchase
  FROM _bf_r WHERE variant_key = '~none~';

  SELECT count(*) INTO v_ambig FROM _bf_ambig;

  ---------------------------------------------------------------------------
  -- 3c. FAIL CLOSED on unresolved lines or ambiguous groups.
  ---------------------------------------------------------------------------
  IF (v_unresolved > 0 OR v_ambig > 0) AND v_allow <> 'on' THEN
    SELECT string_agg(reason_code || '=' || n, ', ' ORDER BY reason_code) INTO v_reasons
    FROM (SELECT reason_code, count(*) n FROM _bf_lines
          WHERE reason_code IS NOT NULL GROUP BY 1) s;
    RAISE EXCEPTION
      'ABORT: reconciliation incomplete — % unresolved line(s) [%], % ambiguous duplicate group(s). '
      'Review with backfill_orderitems_reconcile_report.sql. To proceed anyway, set '
      '"SET LOCAL aquavo.backfill_allow_unresolved = ''on'';" in the same transaction.',
      v_unresolved, COALESCE(v_reasons, 'none'), v_ambig;
  END IF;

  ---------------------------------------------------------------------------
  -- 3d. Deterministic-missing lines only.
  ---------------------------------------------------------------------------
  CREATE TEMP TABLE _bf_missing ON COMMIT DROP AS
  SELECT j.* FROM _bf_j j
  LEFT JOIN _bf_r r
    ON  r.order_id=j.order_id AND r.product_id=j.product_id
    AND r.variant_key=j.variant_key AND r.quantity=j.quantity
    AND r.price_at_purchase=j.price_at_purchase AND r.total_price=j.total_price
    AND r.occ=j.occ
  WHERE r.id IS NULL
    AND NOT EXISTS (SELECT 1 FROM _bf_ambig c
      WHERE c.order_id=j.order_id AND c.product_id=j.product_id
        AND c.quantity=j.quantity AND c.price_at_purchase=j.price_at_purchase);

  SELECT count(*) INTO v_missing FROM _bf_missing;

  IF v_missing = 0 THEN
    RAISE NOTICE 'Backfill: nothing deterministically missing — no batch opened, 0 rows inserted (unresolved=%, ambiguous=%).',
      v_unresolved, v_ambig;
    RETURN;
  END IF;

  ---------------------------------------------------------------------------
  -- 3e. Open the batch (with the executor-supplied id) and insert.
  --     The batch row MUST exist before the line INSERT below, so that the
  --     trigger-safety inventory-sale suppression exception — which looks up
  --     this same v_batch id in orderitem_backfill_batches — can see it.
  ---------------------------------------------------------------------------
  INSERT INTO orderitem_backfill_batches (batch_id, note)
  VALUES (v_batch, 'line-by-line canonical JSONB reconciliation');

  INSERT INTO order_items_relational (
    id, order_id, product_id, quantity, price_at_purchase, total_price,
    unit_cost_price, unit_packaging_cost, unit_insert_cost,
    cost_snapshot_status, cost_snapshot_source, cost_snapshot_confidence,
    cost_snapshot_version, cost_snapshot_at, metadata
  )
  SELECT
    gen_random_uuid()::text,
    m.order_id, m.product_id, m.quantity, m.price_at_purchase, m.total_price,
    -- Cost is UNKNOWN. NULL — never 0, never today's product cost.
    NULL, NULL, NULL,
    'unknown', 'none', NULL, NULL, NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'variantId',    m.item->>'variantId',
      'variantLabel', m.item->>'variantLabel',
      'productName',  m.item->>'productName',
      'backfill', jsonb_build_object(
        'batch_id',    v_batch,
        'source',      'orders.items',
        'migration',   'backfill_orderitems_from_jsonb.sql',
        'jsonb_index', m.jsonb_index,
        'variant_key', m.variant_key,
        'fingerprint', m.order_id || ':' || m.product_id || ':' || m.variant_key || ':'
                         || m.quantity || ':' || m.price_at_purchase || ':'
                         || m.total_price || ':' || m.occ,
        'at',          now()
      )
    ))
  FROM _bf_missing m;

  GET DIAGNOSTICS v_ins = ROW_COUNT;

  UPDATE orderitem_backfill_batches
  SET finished_at = now(),
      rows_inserted = v_ins,
      unresolved_lines = v_unresolved,
      ambiguous_groups = v_ambig,
      reconciliation_complete = (v_unresolved = 0 AND v_ambig = 0)
  WHERE batch_id = v_batch;

  RAISE NOTICE 'Backfill batch % inserted % rows (unresolved=%, ambiguous=%, complete=%).',
    v_batch, v_ins, v_unresolved, v_ambig, (v_unresolved = 0 AND v_ambig = 0);
END
$backfill$;

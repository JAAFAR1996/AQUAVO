-- 0063_accounting_cod_refusal_and_store_credit.sql
-- AQUAVO owner-approved policy, 2026-08-04:
--   * COD refusal occurs before acceptance, so it is not revenue and not a refund.
--   * The carrier charges AQUAVO zero for refused/returned COD parcels.
--   * All refused products become sellable when the carrier confirms refusal.
--   * Physical custody remains separately visible until AQUAVO receives the parcel.
--   * The carton is damaged/lost, but its shipment cost was already recognised;
--     the return classification must not deduct that carton a second time.
--   * Cheaper replacements create non-expiring, partially usable customer credit.
BEGIN;

-- 1. Correct the preparation-material meaning while preserving the stable SKU.
UPDATE public.fulfillment_materials
   SET name = 'ستكر هدية للمنتج',
       notes = 'ستكر هدية واحد لكل طلب؛ الكلفة المعتمدة 50 د.ع. ليس ملصق سعر.',
       updated_at = clock_timestamp()
 WHERE sku = 'PRICE_LABEL';

-- 2. Physical custody is not the same thing as sellable ownership.
-- The product can be offered for sale when the carrier reports refusal while the
-- parcel remains physically with the carrier. The later admin receipt click only
-- changes custody and must never increase stock a second time.
CREATE TABLE IF NOT EXISTS public.order_inventory_custody_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  custody_state text NOT NULL CHECK (custody_state IN ('carrier_return_pending','main_received')),
  source_order_status text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by text NOT NULL DEFAULT 'database_trigger',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS order_inventory_custody_order_idx
  ON public.order_inventory_custody_events(order_id,occurred_at,id);

CREATE OR REPLACE VIEW public.v_order_inventory_custody_latest AS
SELECT DISTINCT ON (e.order_id)
  e.order_id,e.custody_state,e.source_order_status,e.occurred_at,e.created_by,e.metadata
FROM public.order_inventory_custody_events e
ORDER BY e.order_id,e.occurred_at DESC,e.id DESC;

CREATE OR REPLACE FUNCTION public.prevent_custody_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'INVENTORY_CUSTODY_IMMUTABLE: append a correcting custody event instead';
END
$$;
DROP TRIGGER IF EXISTS order_inventory_custody_no_update ON public.order_inventory_custody_events;
CREATE TRIGGER order_inventory_custody_no_update
BEFORE UPDATE ON public.order_inventory_custody_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_custody_event_mutation();
DROP TRIGGER IF EXISTS order_inventory_custody_no_delete ON public.order_inventory_custody_events;
CREATE TRIGGER order_inventory_custody_no_delete
BEFORE DELETE ON public.order_inventory_custody_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_custody_event_mutation();

-- 3. Override 0062 inventory timing. Restore sellable stock immediately at the
-- refusal status; later `returned` / `rejected_returned` transitions reuse the
-- same idempotency key and therefore only confirm physical custody.
CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $inventory_refusal_0063$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status IN ('rejected','rejected_carrier') THEN
    INSERT INTO public.order_inventory_custody_events(
      order_id,custody_state,source_order_status,idempotency_key,metadata
    ) VALUES(
      NEW.id,'carrier_return_pending',NEW.status,
      'order_custody:'||NEW.id||':carrier_return_pending',
      jsonb_build_object('previous_status',OLD.status,'sellable_restored_at_refusal',true)
    ) ON CONFLICT(idempotency_key) DO NOTHING;
  ELSIF NEW.status IN ('rejected_returned','returned')
        AND OLD.status IN ('rejected','rejected_carrier','rejected_returned') THEN
    INSERT INTO public.order_inventory_custody_events(
      order_id,custody_state,source_order_status,idempotency_key,metadata
    ) VALUES(
      NEW.id,'main_received',NEW.status,
      'order_custody:'||NEW.id||':main_received',
      jsonb_build_object('previous_status',OLD.status,'inventory_incremented',false)
    ) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;

  SELECT value INTO mode FROM public.settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  IF NEW.status NOT IN ('cancelled','rejected','rejected_carrier','rejected_returned','returned') THEN
    IF OLD.status IN ('cancelled','rejected','rejected_carrier','rejected_returned','returned')
       AND EXISTS(
         SELECT 1 FROM public.inventory_movements
         WHERE source_type='order_status_reversal' AND source_id=NEW.id
       ) THEN
      RAISE EXCEPTION 'order % inventory was reversed; reopening requires an explicit inventory workflow',NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT id INTO main_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true LIMIT 1;
  IF main_location IS NULL THEN
    RAISE EXCEPTION 'MAIN inventory location is not configured';
  END IF;

  FOR item_row IN
    SELECT oi.id,oi.product_id,oi.quantity,oi.metadata
    FROM public.order_items_relational oi
    WHERE oi.order_id=NEW.id
  LOOP
    IF EXISTS(
      SELECT 1 FROM public.inventory_movements
      WHERE idempotency_key='order_item:'||item_row.id
    ) THEN
      line_variant:=NULLIF(item_row.metadata->>'variantId','');
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,currency,happened_at,created_by,metadata
      ) VALUES(
        item_row.product_id,line_variant,main_location,item_row.quantity,'sale_reversal',
        'order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,
        'IQD',clock_timestamp(),'database_trigger',
        jsonb_build_object(
          'order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status,
          'sellable_restored_at_refusal',NEW.status IN ('rejected','rejected_carrier')
        )
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $inventory_refusal_0063$;

-- 4. A rejected-delivery event documents the refusal but must not perform a
-- second inventory return. The status-trigger above is the single stock writer.
CREATE OR REPLACE FUNCTION public.apply_verified_return_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $return_inventory_0063$
DECLARE
  v_cutover timestamptz;
  v_location text;
  elem jsonb;
  v_idx integer:=0;
  v_product text;
  v_variant text;
  v_qty integer;
  v_original_movement text;
BEGIN
  v_cutover:=public.aquavo_active_cutover();
  IF NEW.created_at<(v_cutover AT TIME ZONE 'UTC') THEN RETURN NEW; END IF;

  IF NEW.type='rejected_delivery' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true LIMIT 1;
  IF v_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' AND NEW.restocked=true THEN
    FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb)) LOOP
      v_idx:=v_idx+1;
      v_product:=NULLIF(elem->>'productId','');
      v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);
      IF v_product IS NULL OR v_qty<=0 THEN
        RAISE EXCEPTION 'RETURN_INVENTORY_INVALID: event % item %',NEW.id,v_idx;
      END IF;
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata
      ) VALUES(
        v_product,v_variant,v_location,v_qty,'sale_reversal','return_event',NEW.id,
        'return_event:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,
        'IQD',COALESCE(NEW.restocked_at,clock_timestamp()),'database_trigger',
        jsonb_build_object('return_event_id',NEW.id,'item',elem)
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
  END IF;

  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' AND OLD.restocked=true THEN
    v_idx:=0;
    FOR elem IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.affected_items,'[]'::jsonb)) LOOP
      v_idx:=v_idx+1;
      v_product:=NULLIF(elem->>'productId','');
      v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);
      SELECT id INTO v_original_movement
      FROM public.inventory_movements
      WHERE idempotency_key='return_event:'||OLD.id||':'||v_idx;
      IF v_original_movement IS NULL THEN
        RAISE EXCEPTION 'RETURN_INVENTORY_REVERSAL_BLOCKED: original movement missing for event % item %',OLD.id,v_idx;
      END IF;
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata,
        reversed_movement_id
      ) VALUES(
        v_product,v_variant,v_location,-v_qty,'return_out','return_event_reversal',NEW.id,
        'return_event_reversal:'||NEW.id||':'||v_idx,NULLIF(elem->>'cogsAtTime','')::numeric,
        'IQD',clock_timestamp(),'database_trigger',
        jsonb_build_object('return_event_id',NEW.id,'reason',NEW.note,'item',elem),
        v_original_movement
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $return_inventory_0063$;

-- 5. Database-level financial safety. A verified refusal must follow a recorded
-- carrier-refusal status/custody event; all monetary and product-loss fields are
-- forced to zero and the products are reported as sellable/restocked.
CREATE OR REPLACE FUNCTION public.enforce_cod_refusal_return_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type='rejected_delivery' THEN
    NEW.refund_amount:=0;
    NEW.delivery_cost_loss:=0;
    NEW.return_shipping_cost:=0;
    NEW.packaging_loss:=0;
    NEW.product_write_off_amount:=0;
    NEW.cogs_loss:=0;
    NEW.restocked:=true;

    IF NEW.status='verified' THEN
      IF jsonb_array_length(COALESCE(NEW.affected_items,'[]'::jsonb))=0 THEN
        RAISE EXCEPTION 'COD_REFUSAL_ITEMS_REQUIRED: verified refusal must identify returned product quantities';
      END IF;
      IF NOT EXISTS(
        SELECT 1 FROM public.order_inventory_custody_events c
        WHERE c.order_id=NEW.order_id AND c.custody_state IN ('carrier_return_pending','main_received')
      ) THEN
        RAISE EXCEPTION 'COD_REFUSAL_STATUS_REQUIRED: record carrier refusal on the order before verification';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS order_return_events_enforce_cod_refusal ON public.order_return_events;
CREATE TRIGGER order_return_events_enforce_cod_refusal
BEFORE INSERT OR UPDATE ON public.order_return_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_cod_refusal_return_policy();

-- 6. Non-expiring, partially usable customer-credit ledger. Balance is derived,
-- never hand-edited. General-ledger posting remains an explicit integration gate
-- and is surfaced by accounting_status rather than silently pretending it posted.
INSERT INTO public.chart_of_accounts(code,name_ar,account_type,normal_side,system_account)
VALUES('2300','أرصدة الزبائن','liability','credit',true)
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_credit_accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL UNIQUE,
  user_id text,
  customer_phone text,
  customer_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','closed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (user_id IS NOT NULL OR customer_phone IS NOT NULL OR customer_email IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.customer_credit_entries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id text NOT NULL REFERENCES public.customer_credit_accounts(id),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(18,0) NOT NULL CHECK (amount>0 AND amount=trunc(amount)),
  currency text NOT NULL DEFAULT 'IQD' CHECK (currency='IQD'),
  source_type text NOT NULL,
  source_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  accounting_status text NOT NULL DEFAULT 'pending' CHECK (accounting_status IN ('pending','posted','reversed')),
  journal_entry_id text REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  note text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((accounting_status='posted' AND journal_entry_id IS NOT NULL) OR accounting_status<>'posted')
);
CREATE INDEX IF NOT EXISTS customer_credit_entries_account_idx
  ON public.customer_credit_entries(account_id,created_at,id);

CREATE OR REPLACE VIEW public.v_customer_credit_balances AS
SELECT
  a.id AS account_id,a.customer_key,a.user_id,a.customer_phone,a.customer_email,a.status,
  COALESCE(SUM(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END),0)::numeric(18,0) AS balance_iqd,
  COUNT(*) FILTER (WHERE e.accounting_status='pending')::integer AS pending_accounting_entries,
  MAX(e.created_at) AS last_entry_at
FROM public.customer_credit_accounts a
LEFT JOIN public.customer_credit_entries e ON e.account_id=a.id
GROUP BY a.id,a.customer_key,a.user_id,a.customer_phone,a.customer_email,a.status;

CREATE OR REPLACE FUNCTION public.guard_customer_credit_entry()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text;v_balance numeric(18,0);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.account_id,0));
  SELECT status INTO v_status FROM public.customer_credit_accounts WHERE id=NEW.account_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'CUSTOMER_CREDIT_ACCOUNT_NOT_FOUND'; END IF;
  IF v_status<>'active' THEN RAISE EXCEPTION 'CUSTOMER_CREDIT_ACCOUNT_NOT_ACTIVE: %',v_status; END IF;
  SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0)
    INTO v_balance FROM public.customer_credit_entries WHERE account_id=NEW.account_id;
  IF NEW.direction='debit' AND NEW.amount>v_balance THEN
    RAISE EXCEPTION 'CUSTOMER_CREDIT_INSUFFICIENT: requested %, available %',NEW.amount,v_balance;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS customer_credit_entries_guard ON public.customer_credit_entries;
CREATE TRIGGER customer_credit_entries_guard
BEFORE INSERT ON public.customer_credit_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_credit_entry();

CREATE OR REPLACE FUNCTION public.prevent_customer_credit_entry_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CUSTOMER_CREDIT_LEDGER_IMMUTABLE: post a correcting entry instead';
END
$$;
DROP TRIGGER IF EXISTS customer_credit_entries_no_update ON public.customer_credit_entries;
CREATE TRIGGER customer_credit_entries_no_update
BEFORE UPDATE ON public.customer_credit_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_credit_entry_mutation();
DROP TRIGGER IF EXISTS customer_credit_entries_no_delete ON public.customer_credit_entries;
CREATE TRIGGER customer_credit_entries_no_delete
BEFORE DELETE ON public.customer_credit_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_credit_entry_mutation();

-- 7. Audit surfaces. Both views should remain empty in normal operation.
CREATE OR REPLACE VIEW public.v_cod_refusal_policy_exceptions AS
SELECT
  r.id,r.order_id,r.status,r.refund_amount,r.delivery_cost_loss,
  r.return_shipping_cost,r.packaging_loss,r.product_write_off_amount,
  r.cogs_loss,r.restocked,r.affected_items,r.created_at,r.updated_at
FROM public.order_return_events r
WHERE r.type='rejected_delivery'
  AND (
    COALESCE(r.refund_amount,0)<>0 OR COALESCE(r.delivery_cost_loss,0)<>0 OR
    COALESCE(r.return_shipping_cost,0)<>0 OR COALESCE(r.packaging_loss,0)<>0 OR
    COALESCE(r.product_write_off_amount,0)<>0 OR COALESCE(r.cogs_loss,0)<>0 OR
    r.restocked IS DISTINCT FROM true
  );

CREATE OR REPLACE VIEW public.v_cod_refusal_inventory_exceptions AS
SELECT o.id AS order_id,o.status,c.custody_state
FROM public.orders o
LEFT JOIN public.v_order_inventory_custody_latest c ON c.order_id=o.id
WHERE o.status IN ('rejected','rejected_carrier','rejected_returned')
  AND COALESCE((SELECT value FROM public.settings WHERE key='inventory_ledger_mode'),'off')='enforce'
  AND NOT EXISTS(
    SELECT 1 FROM public.inventory_movements m
    WHERE m.source_type='order_status_reversal' AND m.source_id=o.id
  );

INSERT INTO public.schema_migrations(version,checksum,applied_by,notes)
SELECT
  '0063_accounting_cod_refusal_and_store_credit',
  '8b0ebbd46e74685a2b43b962d44a4dbc33b189239d2db520a6ae360e65c19912',
  current_user,
  'Immediate sellable restoration at COD refusal; immutable custody trail; double-restock guard; zero-loss refusal policy; gift sticker rename; customer-credit liability ledger foundation'
WHERE NOT EXISTS(
  SELECT 1 FROM public.schema_migrations
  WHERE version='0063_accounting_cod_refusal_and_store_credit'
);

COMMIT;

-- 0062_accounting_automation_opening_balances.sql
-- Make the August cutover ledger complete, derive live balances from journals,
-- close ended Baghdad months automatically, and only restore rejected stock
-- after AQUAVO actually receives the parcel back.
BEGIN;

-- ── 1. Immutable opening balances from owner-confirmed cutover evidence ──────
DO $$
DECLARE
  v_entry_id text;
  v_cash numeric:=0;
  v_carrier numeric:=0;
  v_inventory numeric:=0;
  v_total numeric:=0;
  v_line integer:=0;
BEGIN
  SELECT COALESCE(MAX(amount),0)
    INTO v_cash
  FROM public.accounting_monthly_positions
  WHERE period_key='2026-08'
    AND position_type='cash'
    AND status='confirmed';

  SELECT COALESCE(SUM(amount),0)
    INTO v_carrier
  FROM public.accounting_monthly_positions
  WHERE period_key='2026-08'
    AND position_type='carrier_receivable'
    AND status='confirmed';

  SELECT COALESCE(SUM(total_cost),0)
    INTO v_inventory
  FROM public.opening_inventory_snapshot
  WHERE cutover_id='aquavo-2026-08-01'
    AND cost_status IN ('exact','known','owner_confirmed')
    AND total_cost IS NOT NULL;

  v_total:=v_cash+v_carrier+v_inventory;

  SELECT id INTO v_entry_id
  FROM public.journal_entries
  WHERE source_type='accounting_cutover'
    AND source_id='aquavo-2026-08-01'
    AND event_kind='opening_balances';

  IF v_entry_id IS NULL AND v_total>0 THEN
    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,evidence,created_by
    ) VALUES(
      timestamptz '2026-08-01 00:00:00+03','2026-08','accounting_cutover',
      'aquavo-2026-08-01','opening_balances',
      'الأرصدة الافتتاحية المؤكدة لنظام AQUAVO المحاسبي من 1 آب 2026',
      v_total,v_total,
      jsonb_build_object(
        'cutover','2026-08-01','timezone','Asia/Baghdad',
        'cash',v_cash,'carrier_receivable',v_carrier,'inventory',v_inventory,
        'evidence','owner-confirmed monthly positions and opening inventory snapshot'
      ),
      'system-cutover'
    ) RETURNING id INTO v_entry_id;

    IF v_cash>0 THEN
      v_line:=v_line+1;
      INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
      VALUES(v_entry_id,v_line,'1000',v_cash,'النقد الافتتاحي المؤكد في صندوق AQUAVO',jsonb_build_object('cutover','2026-08-01'));
    END IF;

    IF v_carrier>0 THEN
      v_line:=v_line+1;
      INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
      VALUES(v_entry_id,v_line,'1100',v_carrier,'صافي COD الافتتاحي المؤكد لدى شركات التوصيل',jsonb_build_object('cutover','2026-08-01'));
    END IF;

    IF v_inventory>0 THEN
      v_line:=v_line+1;
      INSERT INTO public.journal_lines(entry_id,line_number,account_code,debit,memo,dimensions)
      VALUES(v_entry_id,v_line,'1200',v_inventory,'قيمة مخزون المنتجات الافتتاحي المدقق',jsonb_build_object('cutover','2026-08-01'));
    END IF;

    v_line:=v_line+1;
    INSERT INTO public.journal_lines(entry_id,line_number,account_code,credit,memo,dimensions)
    VALUES(v_entry_id,v_line,'3100',v_total,'رأس المال الافتتاحي المقابل للموجودات المدققة',jsonb_build_object('cutover','2026-08-01'));

    PERFORM public.validate_journal_entry(v_entry_id);
  END IF;
END $$;

-- ── 2. One canonical live-balance view; no monthly retyping ─────────────────
CREATE OR REPLACE VIEW public.v_accounting_live_balances AS
SELECT
  a.code,
  a.name_ar,
  a.account_type,
  a.normal_side,
  COALESCE(SUM(l.debit),0)::numeric AS debit,
  COALESCE(SUM(l.credit),0)::numeric AS credit,
  CASE
    WHEN a.normal_side='debit' THEN COALESCE(SUM(l.debit-l.credit),0)
    ELSE COALESCE(SUM(l.credit-l.debit),0)
  END::numeric AS balance
FROM public.chart_of_accounts a
LEFT JOIN public.journal_lines l ON l.account_code=a.code
WHERE a.active=true
GROUP BY a.code,a.name_ar,a.account_type,a.normal_side;

-- ── 3. Closed periods are immutable at both header and line level ───────────
CREATE OR REPLACE FUNCTION public.guard_closed_period_journal_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM public.accounting_period_closes c
    WHERE c.period_key=NEW.period_key
      AND c.status IN ('closed','tax_final')
  ) THEN
    RAISE EXCEPTION 'CLOSED_PERIOD_JOURNAL_BLOCKED: period % is closed; post a current-period reversal',NEW.period_key
      USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS journal_entries_closed_period_guard ON public.journal_entries;
CREATE TRIGGER journal_entries_closed_period_guard
BEFORE INSERT ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period_journal_insert();

CREATE OR REPLACE FUNCTION public.guard_journal_line_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_entry_id text;
  v_period text;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION 'POSTED_JOURNAL_LINE_IMMUTABLE: use a reversal entry' USING ERRCODE='55000';
  END IF;
  v_entry_id:=NEW.entry_id;
  SELECT period_key INTO v_period FROM public.journal_entries WHERE id=v_entry_id;
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'JOURNAL_ENTRY_NOT_FOUND: %',v_entry_id;
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.accounting_period_closes c
    WHERE c.period_key=v_period AND c.status IN ('closed','tax_final')
  ) THEN
    RAISE EXCEPTION 'CLOSED_PERIOD_JOURNAL_LINE_BLOCKED: period % is closed',v_period USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS journal_lines_immutable_guard ON public.journal_lines;
CREATE TRIGGER journal_lines_immutable_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION public.guard_journal_line_mutation();

-- ── 4. Calendar-correct automatic close using Baghdad time ──────────────────
CREATE OR REPLACE FUNCTION public.auto_close_ended_accounting_periods(
  p_actor_id text DEFAULT 'system',
  p_actor_name text DEFAULT 'AQUAVO automatic monthly close'
)
RETURNS TABLE(period_key text,close_status text,blockers jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_month date;
  v_key text;
  r public.v_accounting_period_readiness%ROWTYPE;
  v_blockers jsonb;
  v_block_count numeric;
BEGIN
  FOR v_month IN
    SELECT gs::date
    FROM public.accounting_cutovers c
    CROSS JOIN LATERAL generate_series(
      date_trunc('month',c.cutover_at AT TIME ZONE 'Asia/Baghdad'),
      date_trunc('month',clock_timestamp() AT TIME ZONE 'Asia/Baghdad')-interval '1 month',
      interval '1 month'
    ) gs
    WHERE c.status='active'
  LOOP
    v_key:=to_char(v_month,'YYYY-MM');

    IF EXISTS(
      SELECT 1 FROM public.accounting_period_closes
      WHERE accounting_period_closes.period_key=v_key
        AND status IN ('closed','tax_final')
    ) THEN
      period_key:=v_key;close_status:='already_closed';blockers:='[]'::jsonb;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT * INTO r
    FROM public.v_accounting_period_readiness
    WHERE v_accounting_period_readiness.period_key=v_key;

    IF NOT FOUND THEN
      period_key:=v_key;close_status:='missing_readiness';
      blockers:=jsonb_build_array(jsonb_build_object('key','missing_readiness','count',1));
      RETURN NEXT;
      CONTINUE;
    END IF;

    v_blockers:=jsonb_strip_nulls(jsonb_build_object(
      'incomplete_cost_orders',NULLIF(r.incomplete_cost_orders,0),
      'missing_fulfillment_orders',NULLIF(r.missing_fulfillment_orders,0),
      'incomplete_fulfillment_orders',NULLIF(r.incomplete_fulfillment_orders,0),
      'payment_evidence_errors',NULLIF(r.payment_evidence_errors,0),
      'unsettled_carrier_orders',NULLIF(r.unsettled_carrier_orders,0),
      'delivery_surplus_exceptions',NULLIF(r.delivery_surplus_exceptions,0),
      'unverified_returns',NULLIF(r.unverified_returns,0),
      'undocumented_expenses',NULLIF(r.undocumented_expenses,0),
      'inventory_mismatches',NULLIF(r.inventory_mismatches,0),
      'open_review_flags',NULLIF(r.open_review_flags,0),
      'journal_difference',NULLIF(abs(r.journal_difference),0)
    ));
    SELECT COALESCE(SUM(value::numeric),0)
      INTO v_block_count
    FROM jsonb_each_text(v_blockers);

    IF v_block_count=0 THEN
      INSERT INTO public.accounting_period_closes(
        period_key,period_start,period_end,status,closed_by,closed_by_name,snapshot_json,closed_at
      ) VALUES(
        v_key,v_month,(v_month+interval '1 month'),'closed',p_actor_id,p_actor_name,
        jsonb_build_object('automatic',true,'closed_at_baghdad',clock_timestamp() AT TIME ZONE 'Asia/Baghdad'),
        clock_timestamp()
      )
      ON CONFLICT(period_key) DO UPDATE SET
        status='closed',closed_by=EXCLUDED.closed_by,closed_by_name=EXCLUDED.closed_by_name,
        closed_at=clock_timestamp(),reopened_by=NULL,reopened_reason=NULL,reopened_at=NULL,
        snapshot_json=COALESCE(public.accounting_period_closes.snapshot_json,'{}'::jsonb)||EXCLUDED.snapshot_json
      WHERE public.accounting_period_closes.status='reopened';

      period_key:=v_key;close_status:='closed';blockers:='[]'::jsonb;
      RETURN NEXT;
    ELSE
      period_key:=v_key;close_status:='blocked';blockers:=v_blockers;
      RETURN NEXT;
    END IF;
  END LOOP;
END $$;

-- ── 5. Rejected stock stays out until the parcel is actually received ───────
CREATE OR REPLACE FUNCTION public.reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  -- 'rejected' and 'rejected_carrier' mean the parcel is still outside AQUAVO.
  -- Restore stock only after actual receipt ('returned'/'rejected_returned'),
  -- or a genuine pre-shipping cancellation.
  IF NEW.status NOT IN ('cancelled','rejected_returned','returned') THEN
    IF OLD.status IN ('cancelled','rejected_returned','returned')
       AND EXISTS(SELECT 1 FROM inventory_movements WHERE source_type='order_status_reversal' AND source_id=NEW.id) THEN
      RAISE EXCEPTION 'order % inventory was reversed; reopening requires an explicit inventory workflow',NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1;
  FOR item_row IN
    SELECT oi.id,oi.product_id,oi.quantity,oi.metadata
    FROM order_items_relational oi WHERE oi.order_id=NEW.id
  LOOP
    IF EXISTS(SELECT 1 FROM inventory_movements WHERE idempotency_key='order_item:'||item_row.id) THEN
      line_variant:=NULLIF(item_row.metadata->>'variantId','');
      INSERT INTO inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,currency,happened_at,created_by,metadata
      ) VALUES(
        item_row.product_id,line_variant,main_location,item_row.quantity,'sale_reversal',
        'order_status_reversal',NEW.id,'order_reversal:'||NEW.id||':'||item_row.id,
        'IQD',now(),'database_trigger',
        jsonb_build_object('order_id',NEW.id,'order_item_id',item_row.id,'status',NEW.status)
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0062_accounting_automation_opening_balances',
  'runner-normalizes-file-sha256',
  'Opening journal, live ledger balances, automatic Baghdad month close, closed-period guards, and actual-receipt inventory reversal'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

-- 0060_accounting_close_state_machine.sql
-- Fail closed when readiness/tax data is missing and enforce legal state changes.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_accounting_period_tax_finalization()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  r public.v_accounting_period_readiness%ROWTYPE;
  p public.tax_profiles%ROWTYPE;
  v_period_end date;
  v_old_status text:=lower(COALESCE(CASE WHEN TG_OP='UPDATE' THEN OLD.status END,''));
  v_new_status text:=lower(COALESCE(NEW.status,''));
BEGIN
  IF TG_OP='UPDATE' THEN
    IF v_old_status='tax_final' AND v_new_status IS DISTINCT FROM v_old_status THEN
      RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: tax-final period % is immutable',NEW.period_key;
    END IF;
    IF v_new_status='reopened' AND v_old_status<>'closed' THEN
      RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: only a closed period can be reopened';
    END IF;
    IF v_new_status='tax_final' AND v_old_status<>'closed' THEN
      RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: administrative close required';
    END IF;
    IF v_new_status='closed' AND v_old_status NOT IN ('closed','reopened') THEN
      RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: period must be open/reopened before administrative close';
    END IF;
  ELSIF v_new_status IN ('reopened','tax_final') THEN
    RAISE EXCEPTION 'PERIOD_STATE_BLOCKED: new periods must start with administrative close';
  END IF;

  IF v_new_status='reopened' THEN
    NEW.close_type:='administrative';
    RETURN NEW;
  END IF;

  SELECT * INTO r
  FROM public.v_accounting_period_readiness
  WHERE period_key=NEW.period_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLOSE_BLOCKED: readiness row missing for %',NEW.period_key;
  END IF;

  v_period_end:=(to_date(NEW.period_key||'-01','YYYY-MM-DD')+interval '1 month')::date;

  IF v_new_status IN ('closed','administrative_closed','locked') THEN
    IF (clock_timestamp() AT TIME ZONE 'Asia/Baghdad')::date<v_period_end THEN
      RAISE EXCEPTION 'ADMIN_CLOSE_BLOCKED: period % has not ended',NEW.period_key;
    END IF;
    IF r.incomplete_cost_orders>0
       OR r.missing_fulfillment_orders>0
       OR r.incomplete_fulfillment_orders>0
       OR r.payment_evidence_errors>0
       OR r.unverified_returns>0
       OR r.undocumented_expenses>0
       OR r.inventory_mismatches>0
       OR r.open_review_flags>0
       OR r.unsettled_carrier_orders>0
       OR r.delivery_surplus_exceptions>0
       OR r.journal_difference<>0 THEN
      RAISE EXCEPTION 'ADMIN_CLOSE_BLOCKED: readiness failed for %',NEW.period_key;
    END IF;
    NEW.status:='closed';
    NEW.close_type:='administrative';
  END IF;

  IF v_new_status IN ('final','finalized','approved','tax_final') THEN
    SELECT * INTO p FROM public.tax_profiles WHERE id='al-manba-aquavo';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: tax profile missing';
    END IF;
    IF p.status<>'approved'
       OR p.taxpayer_number IS NULL
       OR p.tax_branch IS NULL
       OR p.registered_address IS NULL
       OR p.accountant_license_number IS NULL
       OR p.accountant_approved_at IS NULL
       OR p.approval_evidence_id IS NULL THEN
      RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: tax profile/accountant approval incomplete';
    END IF;
    NEW.status:='tax_final';
    NEW.close_type:='tax_final';
  END IF;

  NEW.revenue:=r.product_revenue;
  NEW.cogs:=r.cogs;
  NEW.gross_profit:=r.product_revenue-r.cogs;
  NEW.expenses_total:=r.verified_expenses;
  NEW.sales_return_deduction:=r.sales_returns;
  NEW.actual_return_loss:=r.actual_return_loss;
  NEW.delivery_subsidy_total:=r.delivery_subsidy;
  NEW.delivery_surplus_total:=r.delivery_surplus;
  NEW.fulfillment_cost_total:=r.fulfillment_cost;
  NEW.final_net_profit:=r.product_revenue-r.cogs-r.fulfillment_cost-r.delivery_subsidy-r.sales_returns-r.actual_return_loss-r.verified_expenses;
  NEW.delivered_orders:=r.realized_orders;
  NEW.readiness_json:=to_jsonb(r);
  NEW.snapshot_json:=COALESCE(NEW.snapshot_json,'{}'::jsonb)||jsonb_build_object(
    'policy_version','v2_gross_includes_delivery_carrier_keeps_fee',
    'timezone','Asia/Baghdad',
    'cutover','2026-08-01',
    'readiness',to_jsonb(r)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_accounting_period_tax_finalization ON public.accounting_period_closes;
CREATE TRIGGER trg_guard_accounting_period_tax_finalization
BEFORE INSERT OR UPDATE OF status,period_start,period_end
ON public.accounting_period_closes
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_period_tax_finalization();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0060_accounting_close_state_machine',
  '4b40e0f89f51564a74947077753a942eb487cf5f205c9e791a3c9ac00ab60e3c',
  'Fail-closed readiness and tax-profile checks with immutable tax-final period state transitions'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

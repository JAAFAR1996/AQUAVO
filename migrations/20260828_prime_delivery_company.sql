-- Add Prime as an independent delivery company using the existing external-carrier flow.
-- Prime shares the same operational/accounting system as Al-Waseet, but keeps a
-- distinct company identity so orders, balances, positions, and settlements remain separate.

BEGIN;

INSERT INTO public.delivery_companies (
  id,
  company_key,
  name,
  default_fee,
  active,
  is_default,
  notes,
  created_by
)
VALUES (
  'prime-default',
  'prime',
  'برايم',
  5000,
  true,
  false,
  'حساب توصيل مستقل يستخدم نفس نظام شركة الوسيط مع أرصدة وتسويات منفصلة.',
  'migration_20260828_prime_delivery_company'
)
ON CONFLICT (company_key) DO UPDATE SET
  name = EXCLUDED.name,
  active = true,
  is_default = false,
  notes = EXCLUDED.notes,
  updated_at = clock_timestamp();

COMMIT;

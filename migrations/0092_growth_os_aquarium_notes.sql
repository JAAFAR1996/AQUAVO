-- 0092_growth_os_aquarium_notes.sql
-- Keep aquarium setup notes separate from generic CRM/customer notes.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0091_growth_operating_system'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0092_REQUIRES_ACTIVE_0091';
  END IF;
END
$guard$;

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS aquarium_notes text;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0092_growth_os_aquarium_notes',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Separate aquarium setup notes from generic customer_profiles.notes so Growth OS cannot overwrite CRM notes.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

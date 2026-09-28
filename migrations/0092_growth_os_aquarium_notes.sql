-- 0092_growth_os_aquarium_notes.sql
-- Keep aquarium setup notes separate from generic CRM/customer notes.

BEGIN;

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

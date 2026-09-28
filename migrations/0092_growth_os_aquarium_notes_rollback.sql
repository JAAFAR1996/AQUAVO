-- 0092_growth_os_aquarium_notes_rollback.sql
BEGIN;

ALTER TABLE public.customer_profiles
  DROP COLUMN IF EXISTS aquarium_notes;

UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'') || ' | Rolled back Growth OS aquarium notes separation.'
WHERE version='0092_growth_os_aquarium_notes'
  AND rolled_back_at IS NULL;

COMMIT;

-- 0055_accounting_checksum_manifest.sql
--
-- 0051..0054 were validated on a fresh Neon branch but their initial ledger rows
-- used obvious provisional repeated-character values. This migration replaces
-- them with deterministic SHA-256 migration-identity digests so Production never
-- retains a fake checksum. Git remains the byte-level source of truth; the DB
-- ledger digest binds the exact governed migration identifier.
BEGIN;

UPDATE public.schema_migrations SET checksum='621379dcb40456e016224b7d325f94368102f7a0711bd0b9d66cdbb8dd2efc79'
 WHERE version='0051_accounting_august_foundation';
UPDATE public.schema_migrations SET checksum='8469d31ee908c682295d5631d8c46e61b28df98b6bfb5caab3df1cbc138fcfa6'
 WHERE version='0052_accounting_cod_delivery_settlements';
UPDATE public.schema_migrations SET checksum='78ae41fdbcbf51a67e2b2ac4228f2f19ec8fe1bd1110aff389f315a7b0d886c4'
 WHERE version='0053_accounting_expenses_returns';
UPDATE public.schema_migrations SET checksum='a21a6853eba521cac327d78a0b34a0c0bfeae313bf4940744d02859f4f35782e'
 WHERE version='0054_accounting_fulfillment_readiness';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0055_accounting_checksum_manifest',
  '73bede31ad41357de7ee54a8e573bacd3afd730db72f2c56f7c710d611555d3c',
  'Replace provisional 0051-0054 checksums with deterministic migration identity SHA-256 digests'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;

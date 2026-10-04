-- 0100_whatsapp_lifecycle_provider_approval_rollback.sql
BEGIN;

UPDATE public.whatsapp_lifecycle_runtime_config
SET lifecycle_enabled=false,
    day7_enabled=false,
    repurchase_enabled=false,
    day7_provider_approved=false,
    repurchase_provider_approved=false,
    provider_approval_confirmed_at=NULL,
    provider_approval_source='rollback_0100',
    activation_reason='Lifecycle provider approval rolled back; fail closed.',
    updated_at=clock_timestamp()
WHERE id=1;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0100_whatsapp_lifecycle_provider_approval';

COMMIT;

-- Safe rollback for Prime delivery company.
-- Keep the row for historical accounting references and only disable future use.

BEGIN;

UPDATE public.delivery_companies
SET active = false,
    is_default = false,
    updated_at = clock_timestamp()
WHERE company_key = 'prime';

COMMIT;

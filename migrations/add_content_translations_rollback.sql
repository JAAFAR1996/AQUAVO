-- Rollback for migrations/add_content_translations.sql.
-- Drops only what that migration added. Arabic source content is untouched.
BEGIN;
DROP INDEX IF EXISTS content_translations_title_idx;
DROP INDEX IF EXISTS content_translations_name_idx;
DROP INDEX IF EXISTS content_translations_type_locale_idx;
DROP TABLE IF EXISTS content_translations;
ALTER TABLE users  DROP COLUMN IF EXISTS locale;
ALTER TABLE orders DROP COLUMN IF EXISTS locale;
COMMIT;

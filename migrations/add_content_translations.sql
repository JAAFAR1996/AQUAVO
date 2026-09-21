-- AQUAVO trilingual content: one translated record per (entity, locale).
-- Additive and reversible. Arabic source rows in products / blog_posts /
-- categories / blog_categories are never touched by this migration or by the
-- code that reads this table. See migrations/add_content_translations_rollback.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS content_translations (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type   text NOT NULL,          -- 'product' | 'blog_post' | 'category' | 'blog_category' | 'guide'
  entity_id     text NOT NULL,          -- primary key of the source row (products.id, blog_posts.id, ...)
  locale        text NOT NULL,          -- 'en' | 'ckb' (Arabic is the source and is never stored here)
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- only linguistic fields, shape per entity_type
  status        text NOT NULL DEFAULT 'machine',      -- 'machine' | 'reviewed'
  source_hash   text,                   -- sha1 of the Arabic source fields at translation time
  translated_by text,                   -- 'claude:<model>' | admin user id
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_translations_locale_chk CHECK (locale IN ('en', 'ckb')),
  CONSTRAINT content_translations_status_chk CHECK (status IN ('machine', 'reviewed')),
  CONSTRAINT content_translations_entity_chk CHECK (entity_type IN ('product', 'blog_post', 'category', 'blog_category', 'guide')),
  CONSTRAINT content_translations_entity_locale_key UNIQUE (entity_type, entity_id, locale)
);

-- Lookups are always "all translations of one entity" or "one locale of one type"
-- (search, sitemap, coverage report).
CREATE INDEX IF NOT EXISTS content_translations_type_locale_idx
  ON content_translations (entity_type, locale);

-- Localized search: ILIKE over the translated name/title.
CREATE INDEX IF NOT EXISTS content_translations_name_idx
  ON content_translations ((data->>'name'));
CREATE INDEX IF NOT EXISTS content_translations_title_idx
  ON content_translations ((data->>'title'));

-- Remember an explicit language choice for signed-in customers and for order
-- notifications. Additive nullable columns; no backfill needed (NULL = Arabic).
ALTER TABLE users  ADD COLUMN IF NOT EXISTS locale text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS locale text;

COMMIT;

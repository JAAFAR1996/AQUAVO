-- 0047_packing_import_drafts
-- Staging for the owner's measurement spreadsheet.
--
-- The import is a DRAFT, always. Product names in the sheet are colloquial
-- Arabic descriptions, not slugs or codes, so matching them to `products` is
-- inherently fuzzy. Every row therefore carries a match confidence and nothing
-- is written to product_packing_data until it is either an exact match or the
-- owner has confirmed it. Ambiguous rows are never applied.
--
-- The «عدد القطع» column is captured for reference only. It never touches
-- products.stock, variant stock, or inventory_movements — carton work does not
-- get to move product inventory.
-- ROLLBACK: 0047_packing_import_drafts_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS packing_import_drafts (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_name     text NOT NULL,
  file_hash     text,
  sheet_name    text,
  row_count     integer NOT NULL DEFAULT 0,
  state         text NOT NULL DEFAULT 'draft',
  imported_by   text,
  applied_at    timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packing_import_draft_lines (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  draft_id    text NOT NULL REFERENCES packing_import_drafts(id) ON DELETE CASCADE,
  row_number  integer NOT NULL,

  -- Raw cell values, kept verbatim so a mapping question can always be settled
  -- against what the sheet actually said.
  raw_product_name text NOT NULL,
  raw_piece_count  text,          -- «عدد القطع» — informational only
  raw_height       text,          -- «طول المنتج مع كارتونة»
  raw_width        text,          -- «عرض المنتج مع كارتونتة»
  raw_foldable     text,          -- «هل قابل للطي»

  -- Parsed values
  packed_height_cm numeric,
  packed_width_cm  numeric,
  foldable         boolean,

  -- Matching
  matched_product_id text REFERENCES products(id),
  match_confidence   text NOT NULL DEFAULT 'ambiguous',
  match_candidates   jsonb,
  confirmed_by       text,
  confirmed_at       timestamptz,
  applied            boolean NOT NULL DEFAULT false,
  parse_warnings     jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pid_state_chk') THEN
    ALTER TABLE packing_import_drafts ADD CONSTRAINT pid_state_chk
      CHECK (state IN ('draft','reviewing','applied','discarded')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pidl_confidence_chk') THEN
    ALTER TABLE packing_import_draft_lines ADD CONSTRAINT pidl_confidence_chk
      CHECK (match_confidence IN ('exact','probable','ambiguous')) NOT VALID;
  END IF;
  -- An ambiguous row can never be applied, and an applied row must name a product.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pidl_applied_chk') THEN
    ALTER TABLE packing_import_draft_lines ADD CONSTRAINT pidl_applied_chk
      CHECK (NOT applied OR (match_confidence <> 'ambiguous' AND matched_product_id IS NOT NULL))
      NOT VALID;
  END IF;
  -- A probable match needs a human before it can be applied.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pidl_probable_confirmed_chk') THEN
    ALTER TABLE packing_import_draft_lines ADD CONSTRAINT pidl_probable_confirmed_chk
      CHECK (NOT applied OR match_confidence <> 'probable' OR confirmed_by IS NOT NULL) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pidl_row_uidx
  ON packing_import_draft_lines(draft_id, row_number);
CREATE INDEX IF NOT EXISTS pidl_draft_idx ON packing_import_draft_lines(draft_id);
CREATE INDEX IF NOT EXISTS pidl_ambiguous_idx
  ON packing_import_draft_lines(draft_id) WHERE match_confidence = 'ambiguous';

DROP TRIGGER IF EXISTS pid_set_updated_at ON packing_import_drafts;
CREATE TRIGGER pid_set_updated_at BEFORE UPDATE ON packing_import_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0047_packing_import_drafts', 'pending', current_user,
       'spreadsheet staging with match confidence; piece count informational only, never touches stock'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0047_packing_import_drafts');

COMMIT;

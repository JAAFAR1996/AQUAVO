-- AQUAVO database repair: limited runtime privileges
-- Date: 2026-07-22
-- Creates a NOLOGIN group role. Create a separate LOGIN role in Neon and grant
-- membership to this role before changing DATABASE_URL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    CREATE ROLE aquavo_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT;
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM aquavo_runtime;
GRANT USAGE ON SCHEMA public TO aquavo_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO aquavo_runtime;

GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public
  TO aquavo_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aquavo_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO aquavo_runtime;

REVOKE ALL ON FUNCTION post_goods_receipt(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION post_goods_receipt(text,text) TO aquavo_runtime;

REVOKE ALL ON FUNCTION prevent_negative_inventory_balance() FROM PUBLIC;
REVOKE ALL ON FUNCTION reject_inventory_movement_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION reject_payment_event_mutation() FROM PUBLIC;

-- Verification expectations:
-- schema USAGE=true, schema CREATE=false
-- products SELECT/INSERT/UPDATE/DELETE=true
-- products TRUNCATE=false
-- post_goods_receipt EXECUTE=true

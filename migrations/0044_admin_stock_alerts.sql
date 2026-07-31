-- 0044_admin_stock_alerts
-- Low-stock alerts for the admin.
--
-- WHY NOT notification_log: that table's user_id is NOT NULL and references
-- users — it is the CUSTOMER notification system, with push/email delivery paths
-- and per-user indexes. Relaxing that constraint on a live table to squeeze in a
-- different audience costs more than a small dedicated table.
--
-- Deduplication is enforced by the DATABASE, not by application logic: a partial
-- unique index means at most one open alert per material can ever exist, so
-- INSERT ... ON CONFLICT DO NOTHING is safe even under concurrent evaluation.
--
-- Re-arming: an alert is closed when available rises back above the threshold.
-- Dropping below again creates a genuinely new alert. Reading never creates one.
-- ROLLBACK: 0044_admin_stock_alerts_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS admin_stock_alerts (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  material_id   text NOT NULL REFERENCES fulfillment_materials(id),
  alert_level   text NOT NULL,
  state         text NOT NULL DEFAULT 'open',

  -- Snapshot at the moment the alert opened, so the message stays truthful even
  -- after stock moves.
  on_hand_snapshot   numeric,
  reserved_snapshot  numeric,
  available_snapshot numeric,
  threshold_snapshot numeric,

  message_ar    text,
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='asa_level_chk') THEN
    ALTER TABLE admin_stock_alerts ADD CONSTRAINT asa_level_chk
      CHECK (alert_level IN ('low','critical')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='asa_state_chk') THEN
    ALTER TABLE admin_stock_alerts ADD CONSTRAINT asa_state_chk
      CHECK (state IN ('open','closed')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='asa_closed_at_chk') THEN
    ALTER TABLE admin_stock_alerts ADD CONSTRAINT asa_closed_at_chk
      CHECK ((state = 'closed') = (closed_at IS NOT NULL)) NOT VALID;
  END IF;
END $$;

-- The whole deduplication guarantee, in one line.
CREATE UNIQUE INDEX IF NOT EXISTS asa_one_open_uidx
  ON admin_stock_alerts(material_id) WHERE state = 'open';

CREATE INDEX IF NOT EXISTS asa_open_idx ON admin_stock_alerts(opened_at) WHERE state = 'open';

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0044_admin_stock_alerts', 'pending', current_user,
       'admin carton low-stock alerts, deduplicated by partial unique index, re-armed above threshold'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='0044_admin_stock_alerts');

COMMIT;

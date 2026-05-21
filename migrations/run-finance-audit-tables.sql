-- Finance Audit History Tables
-- Run in Neon Console: https://console.neon.tech
-- Adds persistent storage for scheduled/manual Groq finance audit runs and findings.

CREATE TABLE IF NOT EXISTS finance_audit_runs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  overall_status    TEXT NOT NULL,
  model             TEXT NOT NULL,
  summary           TEXT,
  snapshot          JSONB NOT NULL DEFAULT '{}',
  invariant_checks  JSONB NOT NULL DEFAULT '[]',
  started_at        TIMESTAMP NOT NULL,
  completed_at      TIMESTAMP NOT NULL,
  error_message     TEXT,
  triggered_by      TEXT NOT NULL DEFAULT 'scheduled',
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS far_overall_status_idx ON finance_audit_runs (overall_status);
CREATE INDEX IF NOT EXISTS far_started_at_idx     ON finance_audit_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS finance_audit_findings (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  run_id                  TEXT NOT NULL REFERENCES finance_audit_runs(id),
  severity                TEXT NOT NULL,
  category                TEXT NOT NULL,
  title                   TEXT NOT NULL,
  explanation             TEXT NOT NULL,
  affected_orders         JSONB,
  expected_value          NUMERIC,
  actual_value            NUMERIC,
  difference              NUMERIC,
  suggested_fix           TEXT NOT NULL,
  requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
  status                  TEXT NOT NULL DEFAULT 'open',
  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faf_run_id_idx  ON finance_audit_findings (run_id);
CREATE INDEX IF NOT EXISTS faf_severity_idx ON finance_audit_findings (severity);
CREATE INDEX IF NOT EXISTS faf_status_idx   ON finance_audit_findings (status);

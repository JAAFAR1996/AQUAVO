-- Field Sales Partners Program — برنامج شركاء المبيعات الميدانيين
-- Additive, idempotent migration. Apply surgically (do NOT use db:push).
-- Run against the Neon database after the feature is approved.

CREATE TABLE IF NOT EXISTS partner_applications (
  id                    text PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamp NOT NULL DEFAULT now(),
  full_name             varchar(255) NOT NULL,
  age                   integer,
  gender                varchar(16),
  governorate           varchar(64),
  area                  varchar(128),
  phone                 varchar(20) NOT NULL,
  whatsapp              varchar(20),
  social_link           text,
  field_ready           varchar(16),
  weekly_hours          varchar(64),
  transport             varchar(64),
  weekly_visits         varchar(64),
  first_week_places     text,
  sales_experience      varchar(16),
  relationships_details text,
  aquarium_knowledge    text,
  answers               jsonb DEFAULT '{}'::jsonb,
  system_score          integer DEFAULT 0,
  suggested_status      varchar(24) DEFAULT 'medium',
  red_flags             jsonb DEFAULT '[]'::jsonb,
  final_status          varchar(24) DEFAULT 'new',
  admin_notes           text,
  reviewed_at           timestamp,
  contacted_at          timestamp
);

CREATE INDEX IF NOT EXISTS partner_applications_phone_idx ON partner_applications (phone);
CREATE INDEX IF NOT EXISTS partner_applications_final_status_idx ON partner_applications (final_status);
CREATE INDEX IF NOT EXISTS partner_applications_created_at_idx ON partner_applications (created_at);

-- ============================================================
-- Migration 007: Reels Production + Per-Platform Publish Tracking
-- ============================================================

-- 1. Extend products with reel/video metadata
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE INDEX IF NOT EXISTS products_product_code_idx ON products(product_code) WHERE product_code IS NOT NULL;

-- 2. reel_projects — parent container for multi-frame reels
CREATE TABLE IF NOT EXISTS reel_projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reel_number INTEGER,
  product_code TEXT,
  product_name TEXT,
  duration_seconds INTEGER,
  publish_date TEXT,
  publish_time TEXT,
  caption TEXT,
  hashtags TEXT,
  hook_text TEXT,
  cta_text TEXT,
  music_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS reel_projects_status_idx ON reel_projects(status);
CREATE INDEX IF NOT EXISTS reel_projects_product_code_idx ON reel_projects(product_code) WHERE product_code IS NOT NULL;

-- 3. reel_frames — individual frames/clips within a reel
CREATE TABLE IF NOT EXISTS reel_frames (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL REFERENCES reel_projects(id) ON DELETE CASCADE,
  frame_order INTEGER NOT NULL,
  frame_type TEXT NOT NULL,
  prompt TEXT,
  overlay_text TEXT,
  duration_seconds INTEGER,
  asset_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  generation_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS reel_frames_reel_id_idx ON reel_frames(reel_id);
CREATE INDEX IF NOT EXISTS reel_frames_order_idx ON reel_frames(reel_id, frame_order);

-- 4. publish_logs — per-platform results for any content
CREATE TABLE IF NOT EXISTS publish_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  platform_post_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS publish_logs_content_idx ON publish_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS publish_logs_platform_idx ON publish_logs(platform, status);
CREATE INDEX IF NOT EXISTS publish_logs_status_idx ON publish_logs(status);

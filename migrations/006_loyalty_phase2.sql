-- ============================================================
-- Migration 006: Loyalty Phase 2 — Badges, Challenges
-- ============================================================

-- 1. Badges table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  points_reward INTEGER DEFAULT 0,
  criteria JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 2. User Badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  badge_id TEXT NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_badges_unique_idx ON user_badges(user_id, badge_id);
CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON user_badges(user_id);

-- 3. Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS challenges_month_type_idx ON challenges(month, type);

-- 4. User Challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  points_awarded BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS user_challenges_unique_idx ON user_challenges(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS user_challenges_user_id_idx ON user_challenges(user_id);

-- 5. Seed default badges
INSERT INTO badges (slug, title, description, icon, points_reward, criteria, sort_order) VALUES
  ('first_order', 'أول طلب', 'أكملت أول عملية شراء', 'ShoppingCart', 10, '{"type":"orders_count","target":1}', 1),
  ('aquarium_expert', 'صاحب حوض منظّم', 'أكملت استبيان ملف الحوض', 'Fish', 15, '{"type":"quiz_completed","target":1}', 2),
  ('maintenance_pro', 'خبير الصيانة', 'اشتريت 3 منتجات صيانة', 'Wrench', 30, '{"type":"maintenance_products","target":3}', 3),
  ('trusted_customer', 'عميل موثوق', '5 طلبات مؤكدة الاستلام', 'ShieldCheck', 40, '{"type":"orders_count","target":5}', 4),
  ('aquavo_friend', 'صديق AQUAVO', 'أحلت 3 أصدقاء سجلوا بالموقع', 'Users', 50, '{"type":"referrals_count","target":3}', 5),
  ('tier_silver', 'المستوى الفضي', 'وصلت للمستوى الفضي', 'Star', 25, '{"type":"tier_reached","target":1}', 6),
  ('tier_gold', 'المستوى الذهبي', 'وصلت للمستوى الذهبي', 'Crown', 50, '{"type":"tier_reached","target":2}', 7),
  ('tier_diamond', 'المستوى الماسي', 'وصلت للمستوى الماسي', 'Crown', 100, '{"type":"tier_reached","target":3}', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Migration 005: Loyalty Phase 1 — Welcome Bonus, Quiz, Bonus Reveal, Coupons
-- ============================================================

-- 1. Add welcome_bonus_claimed and aquarium_profile to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aquarium_profile JSONB;

-- 2. Add bonus_prize and bonus_claimed_at to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bonus_prize JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bonus_claimed_at TIMESTAMP;

-- 3. Create loyalty_coupons table
CREATE TABLE IF NOT EXISTS loyalty_coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  value JSONB NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  max_discount INTEGER,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_order_id TEXT REFERENCES orders(id),
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS loyalty_coupons_user_id_idx ON loyalty_coupons(user_id);
CREATE INDEX IF NOT EXISTS loyalty_coupons_expires_at_idx ON loyalty_coupons(expires_at);
CREATE INDEX IF NOT EXISTS loyalty_coupons_source_idx ON loyalty_coupons(source);

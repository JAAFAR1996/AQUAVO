-- ========================================
-- AQUAVO Loyalty Points & Membership System
-- Migration: 004_add_loyalty_system
-- ========================================

-- 1. Add totalSpent to users (for tier calculation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;

-- 2. Add loyalty fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rounded_total NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashback_used INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount NUMERIC DEFAULT '0';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rounding_cashback INTEGER DEFAULT 0;

-- 3. Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- 'purchase_earn', 'referral_earn', 'review_earn', 'rounding_earn', 'redeem', 'tier_bonus', 'expired'
  points_type TEXT NOT NULL DEFAULT 'loyalty', -- 'loyalty' | 'cashback'
  amount INTEGER NOT NULL, -- Positive = earned, Negative = spent
  balance_after INTEGER NOT NULL,
  order_id TEXT REFERENCES orders(id),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Indexes for loyalty_transactions
CREATE INDEX IF NOT EXISTS loyalty_tx_user_id_idx ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS loyalty_tx_type_idx ON loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS loyalty_tx_order_id_idx ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS loyalty_tx_created_at_idx ON loyalty_transactions(created_at);

-- 5. Ensure existing loyalty columns exist (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cashback_balance INTEGER DEFAULT 0;

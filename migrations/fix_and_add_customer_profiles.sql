-- Fix ai_confidence column type and add customer_profiles table
-- Run this manually in NEON console or psql

-- 1. Fix ai_confidence column type in support_tickets
ALTER TABLE support_tickets 
ALTER COLUMN ai_confidence TYPE numeric 
USING ai_confidence::numeric;

-- 2. Add unique constraint to product_embeddings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_embeddings_product_id_unique'
  ) THEN
    ALTER TABLE product_embeddings ADD CONSTRAINT product_embeddings_product_id_unique UNIQUE (product_id);
  END IF;
END $$;

-- 3. Create customer_profiles table
CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  preferred_categories JSONB,
  preferred_brands JSONB,
  price_range JSONB,
  interests JSONB,
  average_order_value NUMERIC,
  purchase_frequency TEXT,
  total_purchases INTEGER DEFAULT 0,
  ai_summary TEXT,
  ai_notes TEXT,
  sentiment_score NUMERIC,
  engagement_level TEXT,
  last_viewed_products JSONB,
  last_search_queries JSONB,
  last_interaction_at TIMESTAMP,
  last_analyzed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS customer_profiles_engagement_idx ON customer_profiles(engagement_level);
CREATE INDEX IF NOT EXISTS customer_profiles_expires_at_idx ON customer_profiles(expires_at);

-- Done!
SELECT 'Migration completed successfully!' as status;

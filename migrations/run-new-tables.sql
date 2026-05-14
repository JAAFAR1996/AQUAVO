-- Run in Neon Console: https://console.neon.tech → project → SQL Editor

-- 1. Add codReceived to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cod_received BOOLEAN DEFAULT FALSE;

-- 2. Create shipping_settlements table
CREATE TABLE IF NOT EXISTS shipping_settlements (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier     TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create product_cost_history table
CREATE TABLE IF NOT EXISTS product_cost_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL REFERENCES products(id),
  cost_price      NUMERIC NOT NULL DEFAULT 0,
  packaging_cost  NUMERIC NOT NULL DEFAULT 0,
  insert_cost     NUMERIC NOT NULL DEFAULT 0,
  effective_from  TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pch_product_id_idx ON product_cost_history(product_id);
CREATE INDEX IF NOT EXISTS pch_effective_from_idx ON product_cost_history(effective_from);

-- Verify:
SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cod_received';
SELECT table_name FROM information_schema.tables WHERE table_name IN ('shipping_settlements','product_cost_history');

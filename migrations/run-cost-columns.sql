-- Run this in Neon Console to add cost columns to products table
-- Go to: https://console.neon.tech → your project → SQL Editor
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insert_cost NUMERIC DEFAULT 0;

-- Verify:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('cost_price', 'packaging_cost', 'insert_cost');

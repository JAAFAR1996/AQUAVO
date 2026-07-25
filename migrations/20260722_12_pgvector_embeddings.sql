-- AQUAVO database repair: native vector search for 3072-dimension embeddings
-- Date: 2026-07-22
-- Existing JSONB embedding remains for application compatibility.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE product_embeddings
  ADD COLUMN IF NOT EXISTS embedding_half halfvec(3072)
  GENERATED ALWAYS AS (((embedding #>> '{}')::halfvec(3072))) STORED;

CREATE INDEX IF NOT EXISTS product_embeddings_embedding_half_hnsw_idx
  ON product_embeddings
  USING hnsw (embedding_half halfvec_cosine_ops);

ANALYZE product_embeddings;

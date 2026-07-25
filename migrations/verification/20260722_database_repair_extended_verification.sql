-- Extended read-only verification for AQUAVO repair migrations 09-14.

-- Migration audit records must be unique.
SELECT environment,migration_name,COUNT(*) AS duplicate_rows
FROM database_repair_runs
GROUP BY environment,migration_name
HAVING COUNT(*)>1;

-- Deprecated objects must be outside the public application namespace.
SELECT n.nspname AS schema_name,c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relname IN ('audit_log','orders_backup_cod_20260625')
ORDER BY c.relname;

SELECT
  (SELECT COUNT(*) FROM archive.orders_backup_cod_20260625) AS archived_order_backup_rows,
  (SELECT COUNT(*) FROM archive.audit_log) AS archived_deprecated_audit_rows;

-- Category taxonomy must cover every legacy category without changing its ID.
SELECT
  (SELECT COUNT(*) FROM canonical_categories) AS canonical_categories,
  (SELECT COUNT(*) FROM categories) AS legacy_categories,
  (SELECT COUNT(*) FROM category_canonical_mappings) AS mapped_categories,
  (SELECT COUNT(*)
   FROM categories c
   LEFT JOIN category_canonical_mappings cm ON cm.category_id=c.id
   WHERE cm.category_id IS NULL) AS unmapped_categories;

SELECT cc.key,cc.slug,COUNT(p.id) AS active_products
FROM canonical_categories cc
LEFT JOIN category_canonical_mappings cm ON cm.canonical_key=cc.key
LEFT JOIN products p ON p.category_id=cm.category_id AND p.deleted_at IS NULL
GROUP BY cc.key,cc.slug
ORDER BY cc.sort_order,cc.key;

-- All existing embeddings must have an indexed 3072-dimension halfvec.
SELECT
  (SELECT extversion FROM pg_extension WHERE extname='vector') AS vector_extension,
  COUNT(*) AS embedding_rows,
  COUNT(*) FILTER (WHERE embedding_half IS NULL) AS null_halfvecs,
  MIN(vector_dims(embedding_half)) AS min_dimensions,
  MAX(vector_dims(embedding_half)) AS max_dimensions
FROM product_embeddings;

SELECT indexname,indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND indexname='product_embeddings_embedding_half_hnsw_idx';

-- Current-cost baseline must cover every active product with a known current cost.
SELECT
  COUNT(*) FILTER (WHERE COALESCE(p.cost_price,0)>0) AS active_products_with_known_cost,
  COUNT(*) FILTER (
    WHERE COALESCE(p.cost_price,0)>0
      AND EXISTS (SELECT 1 FROM product_cost_history h WHERE h.product_id=p.id)
  ) AS known_cost_products_with_history,
  COUNT(*) FILTER (WHERE COALESCE(p.cost_price,0)=0) AS zero_current_cost_products
FROM products p
WHERE p.deleted_at IS NULL;

SELECT reconciliation_reason,COUNT(*) AS products
FROM product_cost_reconciliation
GROUP BY reconciliation_reason
ORDER BY reconciliation_reason;

-- Runtime role must remain data-only.
SELECT
  has_schema_privilege('aquavo_runtime','public','CREATE') AS runtime_can_create_public_objects,
  has_table_privilege('aquavo_runtime','products','TRUNCATE') AS runtime_can_truncate_products,
  has_table_privilege('aquavo_runtime','products','SELECT') AS runtime_can_read_products;

-- Feature flags remain fail-closed until owner-approved cutover.
SELECT key,value
FROM settings
WHERE key IN ('inventory_ledger_mode','payment_ledger_enabled')
ORDER BY key;

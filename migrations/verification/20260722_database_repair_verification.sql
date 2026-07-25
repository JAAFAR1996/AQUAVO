-- Read-only verification for AQUAVO database repair migrations.
-- Run after all 20260722 database-repair migrations on a temporary branch.

SELECT current_database() AS database_name, current_user AS database_user, version();

SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'data_source_registry','database_repair_runs','database_repair_findings',
    'inventory_legacy_snapshots','product_variant_reconciliation',
    'inventory_locations','inventory_reconciliations','inventory_movements',
    'suppliers','supplier_products','supplier_quotes','supplier_quote_items',
    'purchase_orders','purchase_order_items','goods_receipts','goods_receipt_items',
    'landed_cost_allocations','payment_events','cash_settlements',
    'cash_settlement_items','order_financial_adjustments'
  )
ORDER BY table_name;

SELECT
  (SELECT COUNT(*) FROM inventory) AS legacy_inventory_rows,
  (SELECT COUNT(*) FROM inventory_legacy_snapshots WHERE source_table='inventory') AS captured_inventory_rows,
  (SELECT COUNT(*)
   FROM products p
   CROSS JOIN LATERAL jsonb_array_elements(
     CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END
   ) x(value)) AS source_variant_rows,
  (SELECT COUNT(*) FROM product_variant_reconciliation WHERE is_active=true) AS active_captured_variant_rows;

SELECT
  COUNT(*) AS reconciliation_rows,
  COUNT(*) FILTER (WHERE status='count_required') AS count_required_rows,
  COUNT(*) FILTER (WHERE status='applied') AS applied_rows
FROM inventory_reconciliations;

SELECT reconciliation_reason, COUNT(*) AS products
FROM inventory_product_source_comparison
GROUP BY reconciliation_reason
ORDER BY reconciliation_reason;

SELECT *
FROM inventory_canonical_balances
WHERE canonical_stock < 0;

SELECT idempotency_key, COUNT(*) AS duplicates
FROM inventory_movements
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

SELECT idempotency_key, COUNT(*) AS duplicates
FROM payment_events
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

SELECT poi.id, poi.ordered_quantity, poi.received_quantity
FROM purchase_order_items poi
WHERE poi.received_quantity < 0
   OR poi.received_quantity > poi.ordered_quantity;

SELECT
  COUNT(*) FILTER (WHERE order_number IS NULL OR btrim(order_number)='') AS missing_order_numbers,
  COUNT(*) FILTER (
    WHERE total<0 OR shipping_cost<0 OR COALESCE(discount_total,0)<0
  ) AS invalid_order_money,
  COUNT(*) AS total_orders
FROM orders;

SELECT reconciliation_reason, COUNT(*) AS orders
FROM order_total_reconciliation
GROUP BY reconciliation_reason
ORDER BY reconciliation_reason;

SELECT reconciliation_reason, COUNT(*) AS orders
FROM order_financial_reconciliation
GROUP BY reconciliation_reason
ORDER BY reconciliation_reason;

SELECT reconciliation_reason, COUNT(*) AS invoices
FROM manual_invoice_reconciliation_queue
GROUP BY reconciliation_reason
ORDER BY reconciliation_reason;

SELECT domain,severity,status,COUNT(*) AS findings
FROM database_repair_findings
GROUP BY domain,severity,status
ORDER BY domain,severity,status;

SELECT
  conname,
  convalidated
FROM pg_constraint
WHERE conname IN (
  'orders_coupon_id_coupons_id_fk',
  'manual_invoices_order_id_orders_id_fk',
  'categories_parent_id_categories_id_fk',
  'cash_flow_order_id_orders_id_fk',
  'orders_order_number_present_check',
  'orders_nonnegative_money_check',
  'payment_events_event_amount_check',
  'cash_settlements_net_formula_check',
  'cash_settlement_items_net_formula_check'
)
ORDER BY conname;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema='public'
  AND routine_name IN (
    'prevent_negative_inventory_balance',
    'reject_inventory_movement_mutation',
    'post_goods_receipt',
    'reject_payment_event_mutation',
    'sync_product_variant_reconciliation',
    'record_order_item_inventory_sale',
    'reverse_order_inventory_on_terminal_status',
    'prevent_audited_order_hard_delete',
    'validate_payment_event_reversal',
    'sync_order_payment_status_from_events',
    'prevent_unverified_order_payment_status',
    'validate_cash_settlement_reconciliation',
    'ensure_order_number',
    'refresh_order_financial_snapshot',
    'validate_product_variants_json',
    'order_is_hard_deletable',
    'prevent_unsafe_order_dependency_mutation'
  )
ORDER BY routine_name;

SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_schema='public'
  AND trigger_name IN (
    'inventory_movements_prevent_negative',
    'inventory_movements_immutable',
    'payment_events_immutable',
    'products_sync_variant_reconciliation',
    'order_items_record_inventory_sale',
    'orders_reverse_inventory_on_terminal_status',
    'orders_prevent_audited_hard_delete',
    'payment_events_validate_reversal',
    'payment_events_sync_order_status',
    'orders_prevent_unverified_payment_status',
    'cash_settlements_validate_reconciliation',
    'orders_ensure_order_number',
    'order_items_refresh_financial_snapshot',
    'orders_refresh_financial_snapshot',
    'products_validate_variants_json',
    'referrals_guard_order_detach',
    'auto_orders_guard_order_detach',
    'loyalty_transactions_guard_order_detach',
    'loyalty_coupons_guard_order_detach',
    'return_requests_guard_order_detach',
    'order_items_guard_order_detach',
    'payments_guard_order_detach'
  )
ORDER BY event_object_table,trigger_name;

SELECT key,value
FROM settings
WHERE key IN ('inventory_ledger_mode','payment_ledger_enabled')
ORDER BY key;

SELECT
  has_schema_privilege('aquavo_runtime','public','USAGE') AS schema_usage,
  has_schema_privilege('aquavo_runtime','public','CREATE') AS schema_create,
  has_table_privilege('aquavo_runtime','products','SELECT') AS products_select,
  has_table_privilege('aquavo_runtime','products','INSERT') AS products_insert,
  has_table_privilege('aquavo_runtime','products','UPDATE') AS products_update,
  has_table_privilege('aquavo_runtime','products','DELETE') AS products_delete,
  has_table_privilege('aquavo_runtime','products','TRUNCATE') AS products_truncate,
  has_function_privilege('aquavo_runtime','post_goods_receipt(text,text)','EXECUTE') AS post_receipt_execute;

SELECT domain,source_name,decision_status,allowed_for_automated_decisions
FROM data_source_registry
ORDER BY domain,source_name;

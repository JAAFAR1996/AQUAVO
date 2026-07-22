-- AQUAVO database repair: supporting indexes for operational foreign keys
-- Date: 2026-07-22
-- Chosen from measured table size and expected transactional growth.

-- Existing application tables with current traffic/data.
CREATE INDEX IF NOT EXISTS email_logs_product_id_idx
  ON email_logs(product_id);
CREATE INDEX IF NOT EXISTS search_queries_clicked_product_id_idx
  ON search_queries(clicked_product_id);
CREATE INDEX IF NOT EXISTS search_queries_user_id_idx
  ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS login_attempts_user_id_idx
  ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS cart_sessions_user_id_idx
  ON cart_sessions(user_id);
CREATE INDEX IF NOT EXISTS cart_items_product_id_idx
  ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS coupons_user_id_idx
  ON coupons(user_id);
CREATE INDEX IF NOT EXISTS favorites_product_id_idx
  ON favorites(product_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx
  ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS review_ratings_review_id_idx
  ON review_ratings(review_id);
CREATE INDEX IF NOT EXISTS review_ratings_user_id_idx
  ON review_ratings(user_id);
CREATE INDEX IF NOT EXISTS return_requests_product_id_idx
  ON return_requests(product_id);
CREATE INDEX IF NOT EXISTS return_requests_processed_by_idx
  ON return_requests(processed_by);
CREATE INDEX IF NOT EXISTS referrals_first_order_id_idx
  ON referrals(first_order_id);
CREATE INDEX IF NOT EXISTS referrals_referral_code_id_idx
  ON referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS loyalty_coupons_used_order_id_idx
  ON loyalty_coupons(used_order_id);
CREATE INDEX IF NOT EXISTS auto_orders_last_order_id_idx
  ON auto_orders(last_order_id);

-- Repair, inventory, procurement, and payment tables.
CREATE INDEX IF NOT EXISTS database_repair_findings_run_id_idx
  ON database_repair_findings(repair_run_id);
CREATE INDEX IF NOT EXISTS inventory_reconciliations_location_id_idx
  ON inventory_reconciliations(location_id);
CREATE INDEX IF NOT EXISTS inventory_reconciliations_product_variant_idx
  ON inventory_reconciliations(product_id,variant_id);
CREATE INDEX IF NOT EXISTS inventory_movements_location_id_idx
  ON inventory_movements(location_id);
CREATE INDEX IF NOT EXISTS inventory_movements_reversed_id_idx
  ON inventory_movements(reversed_movement_id);
CREATE INDEX IF NOT EXISTS payment_events_reverses_event_id_idx
  ON payment_events(reverses_event_id);
CREATE INDEX IF NOT EXISTS cash_settlement_items_payment_event_id_idx
  ON cash_settlement_items(payment_event_id);
CREATE INDEX IF NOT EXISTS supplier_quotes_supplier_id_idx
  ON supplier_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_quote_items_product_id_idx
  ON supplier_quote_items(product_id);
CREATE INDEX IF NOT EXISTS supplier_quote_items_supplier_product_id_idx
  ON supplier_quote_items(supplier_product_id);
CREATE INDEX IF NOT EXISTS purchase_orders_source_quote_id_idx
  ON purchase_orders(source_quote_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_product_id_idx
  ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_supplier_product_id_idx
  ON purchase_order_items(supplier_product_id);
CREATE INDEX IF NOT EXISTS goods_receipts_location_id_idx
  ON goods_receipts(location_id);
CREATE INDEX IF NOT EXISTS goods_receipt_items_po_item_id_idx
  ON goods_receipt_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS goods_receipt_items_product_id_idx
  ON goods_receipt_items(product_id);
CREATE INDEX IF NOT EXISTS goods_receipt_items_product_variant_idx
  ON goods_receipt_items(product_id,variant_id);
CREATE INDEX IF NOT EXISTS goods_receipt_items_inventory_movement_id_idx
  ON goods_receipt_items(inventory_movement_id);
CREATE INDEX IF NOT EXISTS landed_cost_allocations_po_item_id_idx
  ON landed_cost_allocations(purchase_order_item_id);

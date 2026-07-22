# Commerce Money-Flow Audit (Agent: CommerceFlow)

READ-ONLY. Money-carrying flows end to end.

## Top correctness risks
1. **HIGH — Cashback redemption NOT subtracted from `orders.total`.** order-storage.ts:330 stores `total = subtotal + deliveryFee − couponDiscount` (:317); cashback unknown yet. loyalty-storage.ts:344-381 later computes `amountAfterDiscount = orderTotal − cashbackDiscount` and writes only `roundedTotal` + `cashbackUsed`, **never updates orders.total**. So orders.total (pre-cashback) and roundedTotal (real payable) disagree by the cashback value. COD Telegram notification sends unrounded pre-cashback `total` (orders.ts:271) → **delivery agent overcharges** by redeemed cashback; any report reading orders.total is inflated. FIX (safe): COD notif + confirmation read `roundedTotal` when present.
2. **MED — total vs roundedTotal ambiguity.** No single authoritative "amount to collect on delivery" field; roundedTotal up to 249 IQD higher than total.
3. **HIGH — Manual invoice totals client-trusted, never server-recomputed.** insertManualInvoiceSchema (schema.ts:2554-2574) accepts subtotal/discount/delivery/total + per-line unitPrice/total from client; invoice-storage.ts:72-90 stores verbatim, no check `total == subtotal − discount + delivery`, no price validation. Malformed total persists → becomes an orders row.
4. **HIGH — Invoice→Order conversion drops discount + raw-string SQL.** createOrderFromInvoice (invoice-storage.ts:214-237) writes only total + shippingCost, drops discountTotal/subtotal. Stock deducted via string-interpolated raw SQL (:259-261) `UPDATE products SET stock = GREATEST(stock-${qty},0) WHERE id='${productId}'` — SQL-injection sink (admin-sourced) + violates Drizzle-only rule + unbounded sequential UPDATEs without tx. FIX (safe): parameterize + wrap in tx.
5. **HIGH — Product unit cost NOT snapshotted on order line** (confirms RepoForensics #3 / SchemaMap gap 1).
6. **MED — order_items_relational insert UNGUARDED in order tx** (order-storage.ts:348, no try/catch). Memory claims table absent; since orders succeed it must exist. deleteOrder guards it but create does not → reconcile; single point of failure if ever missing.

## Flow notes (verified good)
- **Website order totals NOT client-trusted** — createOrderSchema (orders.ts:36-45) has no `total` field, items `.strict`; server fully recomputes. (Contrast manual invoice #3.)
- Shipping flat 5,000 IQD (constants/shipping.ts); server reads settings.shipping_fee fallback 5000 (order-storage.ts:275-277). `free_shipping` coupon zeros delivery. COD-only; no credit-card copy anywhere.
- Stock locked FOR UPDATE per line (order-storage.ts:53-63,201) prevents oversell. parsePositivePrice rejects price≤0. Order number FH-YYMMDD-XXXXXXXX, collision-retry ×3.
- Statuses free-text (schema.ts:134, no pgEnum). Transitions admin.ts:172-303; delivered approves loyalty points, cancelled reverses; financiallyCounted override audit-trailed. Real fulfilled status = `delivered` (no `completed`).
- Public track endpoint returns no PII (orders.ts:360-410); /:id requires owner-or-admin (:413-435).
- COD reconciliation partial: codReceived bool + shippingSettlements.coveredOrderIds; no automatic collected-vs-receivable ledger.
- Client checkout display grandTotal has NO 250-rounding (checkout.tsx:282; dialog:368) → shown amount ≠ server roundedTotal. Guest confirmation invoice uses client-computed stashed total.

## Safe vs strategic
- SAFE: (a) COD notif + confirmation read roundedTotal; (b) parameterize invoice stock UPDATE + tx; (c) guard/confirm order_items_relational insert.
- STRATEGIC: (a) single canonical payable column (post-cashback, post-rounding); (b) server-side recompute+validate manual-invoice totals, carry subtotal/discount onto converted order; (c) snapshot unit cost on order line; (d) real COD reconciliation ledger.

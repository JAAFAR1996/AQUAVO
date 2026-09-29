# AQUAVO Growth Operating System

Growth OS extends the canonical Business OS without replacing accounting, inventory or order truth.

It covers six operating loops: campaign attribution health, purchase-measurement diagnostics, SKU velocity/reorder intelligence, consumable repurchase timing, customer aquarium profiles, curated bundles, and expense-capture completeness.

## Attribution and measurement

Order attribution already lives on `orders` through the 0090 customer-lifecycle migration. Growth OS never reconstructs attribution from timestamp proximity.

A realized order is: non-test + delivered + paid + COD received. Attribution coverage counts realized orders carrying `aq_sid`. Google and Meta click coverage comes from the durable order click-id fields.

`purchase_measurement_receipts` answers a different question: did the AQUAVO storefront actually emit/attempt the purchase signal? A receipt does not mean an ad platform attributed the order. It lets us distinguish a website measurement failure from a platform-attribution problem.

Google Purchase uses IQD value and the real order number/id as `transaction_id`. The confirmation page intentionally retries the same purchase helper; local dedup and Google transaction-id dedup prevent duplicate business conversions.

## Inventory intelligence

`inventory_sku_daily` is calculated from canonical inventory balances and realized order items.

Classification v1:

- fast: >=4 units / 30 days or >=12 / 90 days
- medium: >=2 / 30 days or >=6 / 90 days
- slow: any realized sale / 90 days below those thresholds
- dead: no realized sale / 90 days and product age >=60 days
- new: too new to call dead
- stockout: canonical stock <=0

Default reorder assumptions are operational parameters, not supplier promises: 30-day lead time + 14-day safety buffer, reorder point at 44 days of observed 90-day velocity, target coverage 60 days.

Historical rows that cannot identify a variant may fall back to product-level sales for classification only. `product_fallback` rows never receive an automatic reorder quantity, because copying total product demand to every variant would over-order stock.

## Repurchase

`product_repurchase_profiles` stores the expected repurchase window for recurring consumables.

Rule-generated profiles cover fish food, test supplies, filter cotton, activated carbon, routine water conditioners/bacteria, fertilizer consumables, natural materials and scale-removal supplies. Feeding tools, treatment/algae products and fertilizer tools are deliberately excluded.

Manual/observed profiles are not overwritten by rule refreshes.

Repurchase timing is quantity- and variant-aware. Rule profiles treat the target interval as a per-pack baseline. When a consumable has size variants, Growth OS parses normalized pack measures from the variant label/specifications (for example g/kg, ml/L, strip/piece counts) and scales the rule interval relative to the product's default or median comparable pack size. The order planner then multiplies that per-pack interval by the purchased quantity, capped at 365 days.

Observed learning is also normalized per purchased unit and partitioned by exact variant. For example, if a customer bought two identical packs and repurchased 70 days later, the evidence contributes roughly 35 days per pack. After enough realized repeat evidence, the observed median replaces the rule estimate for that exact SKU/variant. Legacy or unparseable variants safely fall back to the product-level profile rather than being dropped.

## Customer aquarium profiles

AQUAVO already has canonical phone-centric `customer_profiles`, maintained by 0090 order triggers. Growth OS enriches that same record with tank volume/dimensions, livestock, plants, filter, heater, water profile and goals.

It does not create a second customer identity system.

## Lifecycle

`customer_lifecycle_jobs` plans two manual work queues:

- day-7 care follow-up
- consumable repurchase follow-up

No automatic WhatsApp message is sent by Growth OS. The admin dashboard opens a prefilled WhatsApp conversation and the operator marks the job complete.

A repurchase job is suppressed when a later realized order from the same canonical phone already contains one of the products being recommended.

## Bundles

Initial curated bundles:

- Betta Care Starter
- Guppy Starter
- Planted Tank Starter
- Filter Maintenance Pack
- Water Testing Pack

V1 uses normal component-price sum; it does not advertise a discount checkout cannot enforce.

Known bundle variants are pinned explicitly (for example the small sponge filter, black 4m airline, 1.5L soil and 15×20 media bag). The storefront passes that exact variant identity into the existing cart path.

Bundle seed is fail-closed: a bundle stays hidden until every expected component exists. Public bundle responses omit cost and gross margin; admin responses may include them.

## Expense completeness

Admin expenses are mirrored to `business_expense_inbox`. This is a completeness/reconciliation layer, not a second P&L.

Advertising spend already lives in `business_marketing_daily` and Business OS deducts it separately. Do not post the same spend as generic operating expense without changing the Business OS rule, or profit will double-count ads.

## API

Public:
- `GET /api/growth/bundles`
- `POST /api/growth/purchase-receipt`

Accounting-admin:
- `GET /api/admin/growth-os/overview`
- `GET /api/admin/growth-os/attribution`
- `GET /api/admin/growth-os/inventory`
- `GET /api/admin/growth-os/lifecycle`
- `POST /api/admin/growth-os/lifecycle/:id/complete`
- `POST /api/admin/growth-os/lifecycle/:id/suppress`
- `GET /api/admin/growth-os/profiles`
- `PUT /api/admin/growth-os/profiles/:id`
- `GET /api/admin/growth-os/bundles`
- `POST /api/admin/growth-os/bundles/seed`
- `GET /api/admin/growth-os/expenses/completeness`
- `POST /api/admin/growth-os/expenses`
- `POST /api/admin/growth-os/refresh`

## MCP

Read-only Growth OS tools:
- `get_growth_overview`
- `get_attribution_health`
- `get_inventory_intelligence`
- `get_customer_lifecycle`
- `get_customer_aquarium_profiles`
- `get_product_bundles`
- `get_expense_completeness`

AI can inspect calculated truth. It does not get authority here to send messages, place supplier orders, alter prices or post accounting entries.

## Daily operation

The existing finance-audit cron refreshes Business OS first and Growth OS second. Growth OS refreshes repurchase rules, profile enrichment, inventory intelligence, lifecycle planning and bundle integrity.

0091 is additive and has a paired rollback migration.

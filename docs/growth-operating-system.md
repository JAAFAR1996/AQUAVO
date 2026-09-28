# AQUAVO Growth Operating System

## Purpose

Growth OS sits on top of the canonical Business OS. Business OS answers "what happened financially?" Growth OS answers "what should AQUAVO measure and operationally act on next?" without allowing AI inference to become business truth.

The system covers:

- durable acquisition attribution
- purchase-measurement diagnostics
- SKU velocity and reorder intelligence
- consumable/repurchase cadence
- customer lifecycle follow-up
- customer aquarium profiles
- curated product bundles
- expense-capture completeness

## Attribution

The browser creates an opaque `aq_sid` and stores first/last campaign touch data. On a real COD or Wayl order, the validated acquisition payload is persisted to `order_attribution`.

No timestamp-proximity attribution is allowed. Historical orders without a durable join key remain unattributed.

Stored acquisition fields are campaign metadata or opaque ids: UTM values, gclid/gbraid/wbraid/fbclid, AQUAVO campaign identifiers, landing path and referrer host. Customer name, phone, email and address are not part of the attribution payload.

## Google purchase measurement

The storefront emits:

- GA4 `purchase`
- Google Ads `conversion`
- IQD value
- canonical order/order-number `transaction_id`

The client deduplicates per order locally and Google also receives `transaction_id`.

A second call on the order-confirmation page is an intentional recovery path. If the Google tag was unavailable during the first call, the first call does not mark the order as measured, so the confirmation page can retry.

`purchase_measurement_receipts` records whether AQUAVO actually attempted/emitted the Google purchase event. This distinguishes:

1. website never emitted Purchase
2. website emitted Purchase but Google Ads attribution still shows zero conversions

The receipt is diagnostic evidence, not proof that Google attributed the conversion.

## Inventory intelligence

`inventory_sku_daily` stores one row per canonical stock identity and day.

Default v1 classification:

- `fast`: at least 4 units in 30 days or 12 in 90 days
- `medium`: at least 2 in 30 days or 6 in 90 days
- `slow`: at least one realized sale in 90 days but below the thresholds
- `dead`: no realized sale in 90 days and product age at least 60 days
- `new`: too new to call dead and has no qualifying sales
- `stockout`: current canonical stock <= 0

Variant-level sales are used when variant history exists. If historical line data cannot identify the variant, the engine explicitly falls back to product-level sales and marks the basis/confidence accordingly.

Reorder v1 assumptions:

- supplier lead-time proxy: 30 days
- safety coverage: 14 days
- reorder point: 44 days of observed 90-day velocity
- target stock coverage: 60 days
- no reorder recommendation until at least 2 units sold in 90 days

These are operational defaults, not supplier promises. They can be versioned when actual lead-time history is available.

## Consumables and repurchase

`product_repurchase_profiles` stores the repurchase cadence per product/SKU.

Rule-based defaults cover fish food, water-test supplies, filter cotton, activated carbon, water conditioners/bacteria, fertilization, natural materials and scale-removal supplies.

Manual or observed profiles are never overwritten by the rule refresh.

## Customer lifecycle

`customer_lifecycle_jobs` plans:

- day-7 post-delivery care
- consumable repurchase follow-up

Important: Growth OS does **not** automatically send these messages.

Jobs are created as manual-ready work. The admin dashboard can open a prefilled WhatsApp conversation and then mark the job completed. Automatic WhatsApp outbound must remain disabled until the matching Meta templates, suppression rules and rollout boundary are explicitly approved.

The existing approved `aquavo_delivery_care_v1` immediate-delivery workflow stays separate.

## Customer aquarium profiles

`customer_aquarium_profiles` works for logged-in and guest customers using the same normalized customer key used by business analysis.

It can hold:

- tank volume/dimensions
- livestock
- plants
- filter
- heater
- water profile
- goals/problems
- notes

Legacy signed-in `users.aquarium_profile` fields are imported where available. Unknown fields remain unknown; the importer never invents tank facts.

## Bundles

The first bundle set is curated around real use cases:

- Betta Care Starter
- Guppy Starter
- Planted Tank Starter
- Filter Maintenance Pack
- Water Testing Pack

V1 uses ordinary component-price sum, so cart totals remain consistent with the existing checkout/accounting engine. Growth OS does not advertise a discount that checkout cannot enforce.

A bundle that contains an unspecified product variant is flagged `requiresVariantSelection` and cannot be blindly added as a fixed set.

Public bundle responses never expose unit cost, estimated COGS or gross margin. Admin responses may show those figures.

## Expenses

`business_expense_inbox` is a completeness layer.

Admin-entered expenses are mirrored here. They remain `captured` until reconciled/posted into canonical accounting. This prevents an off-ledger expense from silently disappearing from management review.

Marketing spend already lives in `business_marketing_daily` and is deducted separately by Business OS. Do not post the same advertising spend into a generic GL operating-expense calculation unless the Business OS rule is updated to exclude it, otherwise profit would double-count ads.

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
- `PUT /api/admin/growth-os/profiles/:customerKey`
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

AI reads the calculated truth. It does not get authority to automatically order stock, contact customers, change prices or post accounting entries.

## Daily operation

The existing finance-audit cron refreshes Growth OS after Business OS.

Daily sequence:

1. accounting close checks
2. Business OS snapshot
3. Growth OS repurchase/customer-profile rules
4. SKU intelligence
5. lifecycle planning
6. bundle reconciliation
7. findings/reporting layers

## Deployment

1. Run CI.
2. Prepare and test migration `0091_growth_operating_system.sql` on a Neon temporary branch.
3. Apply 0091 explicitly.
4. Deploy application.
5. Run the first Growth OS refresh.
6. Verify public bundles contain no cost fields.
7. Verify a controlled real/test-safe purchase path records attribution and Google measurement diagnostics without creating duplicate conversions.
8. Keep lifecycle outbound manual until approved messaging templates exist.

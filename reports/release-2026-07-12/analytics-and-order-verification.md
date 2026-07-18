# Analytics, Meta, and order verification

## Owner-confirmed production event

The previously observed `POST /api/orders -> 201` is owner-confirmed and expected. No customer PII, address, phone, or order contents are reproduced in this report. No additional real order is used for release testing.

## Duplicate-order protection

Each checkout attempt now receives a UUID idempotency key stored only in session storage alongside a cart signature containing product/variant/quantity and checkout adjustments—not customer PII. The server validates the UUID and uses it as the existing `orders.id` primary key inside the order transaction. A retry finds the already committed order before inventory, coupon, loyalty, notification, or analytics side effects. A concurrent duplicate is rejected by the database primary key; the route then returns the committed order without repeating side effects. No schema migration was needed.

The server remains authoritative for product price, stock, delivery fee, coupon use, loyalty, and total calculation.

## GA4

- CSP now narrowly permits the observed `https://www.google.com/g/collect` host by adding `https://www.google.com` to `connect-src`; no wildcard was added.
- Implemented/retained: `view_item`, `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, and `purchase`.
- Purchase executes only after a successful order API response and uses the confirmed order ID as `transaction_id`.
- Automated release browsing must not submit checkout and therefore cannot contaminate production purchase data.

## Meta Pixel/CAPI

Browser and server events share the same `event_id`. Purchase additionally has a stable per-order local deduplication guard. The server normalizes and SHA-256 hashes the phone only when CAPI is configured and does not log the raw value. Full address, email, and order notes are not sent to CAPI.

Meta's official docs were rate-limited during this run, so the hardcoded Graph API version was not changed without proof. Meta Events Manager test-mode confirmation remains required for a perfect score.

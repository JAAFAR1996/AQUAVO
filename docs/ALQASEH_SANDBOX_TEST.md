# Al-Qaseh sandbox verification for AQUAVO

## What this implements

This first integration stage proves the secure hosted-payment flow without creating an AQUAVO order or touching stock, coupons, loyalty, accounting, or purchase analytics.

AQUAVO is treated as a PCI-DSS non-certified merchant for this flow: card data is entered only on Al-Qaseh's hosted payment page and never passes through AQUAVO servers.

## Test flow

1. Sign in to AQUAVO as an admin.
2. Open `/api/payments/alqaseh/test`.
3. Click the sandbox payment button.
4. AQUAVO creates a 1,000 IQD payment context using server-side Basic Auth.
5. The browser is redirected with HTTP 303 to Al-Qaseh's hosted sandbox payment page.
6. After the payment attempt, Al-Qaseh redirects to `/api/payments/alqaseh/return`.
7. AQUAVO does **not** trust the query-string status. It retrieves the payment context server-to-server and verifies payment status, amount, currency, and sandbox order id.

## Official sandbox values

These values are public test data published in Al-Qaseh Documentation v2.0:

- API base: `https://api-test.alqaseh.com/v1`
- Hosted payment page: `https://pay-test.alqaseh.com/pay/:request_token`
- Client ID: `public_test`
- Test PAN: `5341432900077803`
- CVV2: `971`
- Expiry: `01-2027`

The official public sandbox client secret is present only in the server-side sandbox client because Al-Qaseh publishes it as test data. AQUAVO production credentials must never be committed.

## Production configuration

Production mode fails closed unless all of these server-side environment variables are configured:

```text
ALQASEH_ENV=production
ALQASEH_API_BASE_URL=<production API URL supplied by Al-Qaseh>
ALQASEH_PAY_BASE_URL=<production hosted payment URL supplied by Al-Qaseh>
ALQASEH_CLIENT_ID=<rotated production client id>
ALQASEH_CLIENT_SECRET=<rotated production client secret>
PUBLIC_SITE_URL=https://www.aquavoiq.com
```

Do not use a production credential that has appeared in a screenshot, chat, ticket, source file, or log. Rotate it first.

## Why checkout is not switched to card payment yet

The existing AQUAVO `/api/orders` flow commits inventory, coupon usage and pending loyalty effects when an order is created. A card payment can be abandoned or declined after payment context creation, so creating a normal order before confirmed payment would incorrectly consume business state.

The production rollout must add a DB-backed payment-intent/checkout-session layer (or equivalent reservation lifecycle) and only finalize the canonical AQUAVO order after Al-Qaseh status is independently verified as `succeeded`.

## Webhooks

Al-Qaseh supports server-to-server webhooks, but AQUAVO's global CSRF middleware currently blocks cross-origin POSTs without an Origin/Referer header. The sandbox verifier intentionally does not advertise a webhook URL yet. Production rollout must add a narrowly scoped CSRF exemption for the exact Al-Qaseh webhook path and then verify the received event against Al-Qaseh's authenticated `GET /egw/payments/{id}` response before mutating an order.

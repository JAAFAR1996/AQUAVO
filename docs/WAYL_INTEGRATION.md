# Wayl online payment — integration notes

Wayl (https://wayl.io) replaced Al-Qaseh as AQUAVO's online payment gateway on
2026-09-18. Cash on delivery is unchanged. Historical orders keep
`payments.method = 'alqaseh'`; new online orders use `payments.method = 'wayl'`.

## Sources

- Integration guide: https://docs.thewayl.com
- API reference (Scalar): https://api.thewayl.com/reference
- Developer support: jisr@wayl.io

## How it works

1. Customer picks "الدفع الإلكتروني الآمن" on the confirmation step.
2. Browser `POST /api/payments/wayl/checkout` with product IDs/quantities only and an
   `Idempotency-Key` UUID. The server re-prices from the DB, creates the AQUAVO order
   (`status=pending_payment`), a `payments` row (`method=wayl`) and soft stock
   reservations.
3. Server `POST https://api.thewayl.com/api/v1/links` with header
   `X-WAYL-AUTHENTICATION: <WAYL_API_KEY>` and body
   `{ env, referenceId, total, currency: "IQD", customParameter, lineItem[], webhookUrl, webhookSecret, redirectionUrl }`.
   `referenceId` is the AQUAVO order id (retries use `<orderId>#r<n>`). A fresh random
   `webhookSecret` is generated per link and stored on the payment row.
4. Browser is redirected to the hosted Wayl checkout URL returned by the API.
5. Wayl POSTs `webhookUrl` with header `x-wayl-signature-256` = HMAC-SHA256(raw body, webhookSecret).
   The server verifies the signature with the stored per-payment secret, then — never
   trusting the webhook body — calls `GET /api/v1/links/{referenceId}` and checks
   referenceId, amount and currency before touching order state.
6. Wayl redirects the customer to `redirectionUrl`; that handler also re-verifies via
   `GET /api/v1/links/{referenceId}` and then 303-redirects to `/payment/success|failed|pending`.
   Query parameters on the return URL are never treated as proof.
7. Documented link lifecycle: `Created, Pending, Processing, Complete, Delivered,
   Cancelled, Rejected, Returned`. Only `Complete` marks an order paid. `Cancelled` and
   `Rejected` are terminal non-paid: they release the stock reservation and are the
   only states that allow a retry (a new link). `Delivered`/`Returned` are post-payment
   states: a verified-paid order stays paid (local payment state is monotonic); an
   order never verified as `Complete` stays `pending` and a Telegram review alert is sent.
   Anything unrecognised stays `pending`.

## Link creation without locks across the network

`startWaylPaymentForOrder` runs: short tx (FOR UPDATE) that claims the next attempt,
generates and persists the per-link `webhookSecret` → `POST /api/v1/links` with no
transaction open → short tx that records `id`/`url`/`status` (or drops the claim and
restores the previous `transactionId` on failure). A live claim younger than 45 s makes a
concurrent second request return 409; older claims are treated as abandoned.

## Double-charge protection

- Repeated checkout for the same order returns the existing link (`reused: true`).
- A new link is only created after a live `GET /api/v1/links/{referenceId}` shows the
  current link as `Cancelled` or `Rejected`; `Created/Pending/Processing` refuse with 409.
- If two links for one order both report `Complete`, the first one finalizes the order and
  the second triggers a "possible double payment" Telegram alert for refund review.

## Routes

| Route | Purpose |
| --- | --- |
| `GET  /api/payments/wayl/availability` | Whether online payment is configured (drives the checkout radio). |
| `POST /api/payments/wayl/checkout` | Create order + Wayl link, returns `redirectUrl`. |
| `GET  /api/payments/wayl/order/:orderId/status?paymentId=` | Server-verified state, used by result-page polling. |
| `POST /api/payments/wayl/order/:orderId/retry` | New link for a failed/expired attempt on the same order. |
| `POST /api/payments/wayl/webhook` | Wayl → AQUAVO. Signature-verified, then re-verified against Wayl. CSRF-exempt in both `server/index.ts` and the Vercel entrypoint `api/index.ts`. |
| `GET  /api/payments/wayl/return` | Customer redirect back from Wayl. Verifies, then redirects to result page. |
| `GET  /payment/{success,failed,pending}` | Result pages (re-verify on every load; refresh never double-applies). |

## Environment variables

See `.env.example`: `WAYL_API_KEY` (required), `WAYL_ENV` (`test`/`live`),
`WAYL_API_BASE_URL` (optional), `WAYL_RESERVATION_TTL_MINUTES` (optional).
No static webhook secret is needed.

### `WAYL_ENV` — production activation is explicit

`WAYL_ENV` is sent as the `env` field on every create-link request. Wayl's docs say to
use `test` while testing and switch to `live` only when going live, so
`resolveWaylEnvironment` in `server/services/wayl-client.ts` enforces:

| NODE_ENV | WAYL_ENV | Result |
| --- | --- | --- |
| not production | missing | `test` (never silently live) |
| not production | `test` | `test` |
| not production | `live` | `live` (only when intentionally set) |
| production | `live` | `live` — the only way to take real payments |
| production | missing | configuration error; online checkout disabled |
| production | `test` | configuration error; online checkout disabled |
| any | anything else | configuration error |

"Disabled" means `GET /api/payments/wayl/availability` returns `{available:false}` (the
checkout radio falls back to cash on delivery) and `/checkout` returns an error. To go
live: set `WAYL_API_KEY` and `WAYL_ENV=live` in the production environment explicitly.
On Vercel, environment variable changes apply only to the *next* deployment.

### Availability is layered (updated 2026-09-19)

`checkWaylReadiness()` answers the checkout radio without creating disposable live
payment links in production:

| Step | Production check | Failure reason codes |
| --- | --- | --- |
| 1 | local config (`getWaylConfig`) | `WAYL_API_KEY_MISSING`, `WAYL_ENV_MISSING`, `WAYL_ENV_INVALID`, `WAYL_ENV_NOT_LIVE_IN_PRODUCTION`, `UNKNOWN_CONFIG_ERROR` |
| 2 | `GET /api/v1/verify-auth-key` | `WAYL_AUTH_FAILED` (401/403), `WAYL_RATE_LIMITED` (429), `WAYL_SERVICE_ERROR` (5xx), `WAYL_NETWORK_FAILED` |

Wayl documents no read-only "store verified" endpoint. Production therefore treats a
valid configuration + authenticated merchant key as sufficient to show online payment,
then uses the customer's real `POST /api/v1/links` call as the authoritative merchant
eligibility check. This follows Wayl's documented flow and avoids false negatives from
pre-creating throwaway links.

The optional 1000-IQD readiness link probe remains available outside production for
diagnostics. A real checkout that receives Wayl's store-verification 403 still fails
closed with a customer-safe 503 response and is never marked paid.

### Merchant-side activation

Per Wayl's docs, link creation "is available to verified stores only". Verification is
done by Wayl on the merchant account (contact jisr@wayl.io / the merchant dashboard); the
same API key is used before and after. There is no separate live key, no IP allowlist
and no callback-domain registration documented.

## Wayl dashboard values (production)

- Webhook URL: `https://www.aquavoiq.com/api/payments/wayl/webhook`
- Redirect URL: `https://www.aquavoiq.com/api/payments/wayl/return`

Both are also sent per request (`webhookUrl`, `redirectionUrl`) on link creation.

## Response schema

`POST /api/v1/links` (201) and `GET /api/v1/links/{referenceId}` (200) return
`{ message, data: { referenceId, id, code, total (string), currency, type, paymentMethod,
status, completedAt, createdAt, updatedAt, url, webhookUrl, redirectionUrl } }`.
`data.url` is the hosted checkout URL. `server/services/wayl-client.ts` validates this with
a strict Zod schema and fails closed (`WaylApiError`, HTTP 502 to the caller) on any
mismatch. No alternate field names are accepted.

## Still requires the merchant key

A real end-to-end run (create link → pay on the hosted page → webhook + return) has not
been executed; it needs `WAYL_API_KEY` with `WAYL_ENV=test`.

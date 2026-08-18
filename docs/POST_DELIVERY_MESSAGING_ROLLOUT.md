# AQUAVO post-delivery messaging rollout

Status: implementation branch; outbound WhatsApp is intentionally disabled by default.

## Trigger

The admin action `استلم الزبون` first opens a confirmation dialog. Only after explicit
confirmation does AQUAVO update the order to `delivered`.

Migration 0079 attaches a PostgreSQL `AFTER UPDATE OF status` trigger. A genuine
transition into `delivered` writes exactly one `delivery_care` outbox row.
`UNIQUE(order_id, job_type)` makes enqueue/retry paths idempotent.

After the order update succeeds, the admin UI immediately calls the admin-only
delivery-care dispatcher. Messaging failure never changes the delivered order.

Phase 1 does **not** enqueue or send review requests. Review automation remains deferred
until secure order-review tokens, verified-purchase submission and support suppression
are deployed together.

## Vercel Hobby recovery scheduler

AQUAVO currently runs on Vercel Hobby. Native Vercel Cron cannot run more than once
per day on Hobby, so it is not used for the retry worker.

The default-branch GitHub Actions workflow
`.github/workflows/customer-messaging-retry.yml` calls the protected production route
`/api/cron/customer-messaging` every five minutes. The route is protected by the same
`CRON_SECRET` contract already used by AQUAVO cron routes.

Required deployment/repository setup:

1. Keep `CRON_SECRET` in Vercel Production environment variables.
2. Add the exact same value as the GitHub repository Actions secret `CRON_SECRET`.
3. Never print or commit the secret.
4. The scheduled workflow becomes active only after it exists on the default branch.

The admin button remains the immediate-send path. The external worker is recovery for:

- explicit provider retryable failures such as HTTP 429/5xx;
- a browser closing after `delivered` was committed but before the immediate dispatch;
- pending jobs left for any other reason before an outbound provider request starts.

A `sending` claim older than 10 minutes is considered ambiguous. It is marked failed for
manual inspection rather than automatically resent, because Meta may already have
accepted the request before the process died. Transport timeout/network failures are
handled the same way when no `wamid` is available. This deliberately favors avoiding a
duplicate customer message over retrying an uncertain send.

The worker processes at most five messages per invocation to stay safely below the
Vercel function timeout even when provider requests approach their seven-second timeout.

## Manual recovery

Order details now include a `متابعة WhatsApp` panel showing the durable job state,
provider lifecycle state, attempt count, provider message ID and any compact failure
code.

A manual retry button appears only when the failure is known-safe to retry:

- invalid Iraqi mobile or invalid customer first name after the underlying data is corrected;
- an explicit provider HTTP 4xx/5xx response proving the original request did not complete normally.

Manual retry is deliberately blocked for timeout, network, unknown, stale-send and
successful-HTTP-without-`wamid` ambiguity. Those cases may already have reached Meta,
and resending could duplicate the customer message.

## Required Meta configuration before live sends

Set these only in the deployment secret/environment store, never in Git:

- `WHATSAPP_CLOUD_ENABLED=false` during setup/testing
- `WHATSAPP_API_VERSION`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_DELIVERY_CARE_TEMPLATE`
- `WHATSAPP_TEMPLATE_LANGUAGE=ar`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`

Webhook callback URL:

```
https://www.aquavoiq.com/api/webhooks/whatsapp
```

Configure that URL in the Meta App Webhooks settings using the same
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, subscribe the app/WABA to the WhatsApp `messages`
webhook field, and keep `META_APP_SECRET` available only to the server. Incoming POST
notifications are accepted only when `X-Hub-Signature-256` validates against the exact
raw body and the Meta App Secret.

Keep `POST_DELIVERY_REVIEW_AUTOMATION_ENABLED=false` until the secure order-token
review flow and support-suppression rules are deployed.

## Delivery-care template contract

The approved Meta template has exactly one body parameter, `{{1}}`, populated with the
customer's **first name only**. The server does not invent `أستاذ`, a greeting, or any
other fallback that would change the approved wording. If the stored name is missing or
malformed, the job is failed for inspection instead of sending altered copy.

Approved copy — keep it exactly as written:

```
{{1}}، وصلتك الطلبية. إذا طلع عندك أي سؤال عن المنتج أو شلون تستخدمه، إحنا موجودين بنفس الرقم.
```

The immediate delivery message must contain **no** emoji, gratitude word, signature,
review mention, order number, CTA, greeting or extra question. Its only job is to confirm
the handoff and keep the support channel open.

## Provider status semantics

When Meta returns a WhatsApp message ID (`wamid`), the outbox job becomes `completed`
and `provider_status='accepted'`. This means the provider accepted the API request; it
does not claim that the customer's handset received or read the message.

The signed webhook updates `provider_status` to `sent`, `delivered`, `read` or `failed`.
Migration 0079 stores `provider_status_at` from Meta's webhook timestamp. Updates are
applied by provider timestamp (with a same-timestamp status rank) so out-of-order or
repeated webhook delivery cannot regress a later state such as `read` back to `sent`.
The `provider_message_id` index is unique, so a provider lifecycle update can resolve to
at most one AQUAVO outbox job.

Verified webhook notifications that do not reference an AQUAVO `wamid` are acknowledged
without mutating data. Raw webhook bodies, customer messages and provider error text are
not persisted; failed status stores only a compact provider error code.

## Production order

1. Confirm active migration `0078_accounting_external_handoff_hardening` is present.
2. Keep this branch current with `main` and pass TypeScript/build/tests/migration-ledger checks.
3. Deploy code with `WHATSAPP_CLOUD_ENABLED=false`.
4. Configure Meta number/token/template plus `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET`.
5. Configure the callback URL and subscribe the WABA/app to the WhatsApp `messages` webhook field.
6. Configure matching `CRON_SECRET` values in Vercel Production and GitHub Actions.
7. Apply migration 0079 to the target database. 0079 fails closed if active 0078 is missing.
8. Verify `shipped -> delivered` creates one pending `delivery_care` job and that the confirmation dialog prevents accidental delivery transitions.
9. Manually run the GitHub recovery workflow while WhatsApp remains disabled; it must exit cleanly without sending.
10. Verify Meta's GET webhook challenge succeeds and a bad/missing POST signature is rejected.
11. Send to a controlled test recipient through the admin dispatcher.
12. Verify the outbox records `completed + provider_status=accepted + wamid`, then observe signed webhook progression to `sent`/`delivered` (and `read` when available).
13. Only after the controlled end-to-end test passes set `WHATSAPP_CLOUD_ENABLED=true`.

## Failure behavior

- Explicit Meta HTTP 429/5xx: durable scheduled retry; order remains delivered.
- Transport timeout/network ambiguity: failed/manual inspection; no blind resend.
- Successful HTTP without a `wamid`: treated as ambiguous; no blind/manual resend.
- Invalid Iraqi mobile: message marked failed; order remains delivered.
- Missing/malformed customer first name: message marked failed; approved copy is not altered.
- Duplicate admin action/retry: no duplicate outbox job.
- Browser interruption after delivery update but before provider call: external worker finds the pending job.
- Abandoned `sending` claim: marked failed after the 10-minute ambiguity lease; no blind resend.
- Delivery corrected to a reject/return terminal status before send: pending care job is cancelled.
- Invalid webhook signature: rejected before payload processing.
- Duplicate/out-of-order provider webhook: idempotent timestamp-ordered update; no duplicate message send.
- Review jobs are not created in phase 1.

## Approved review phase (deferred from phase 1)

The review request remains a **separate** WhatsApp message and is never combined with
the delivery-care message.

- Consumables: send the review request on **day 5** after delivery.
- Equipment/hardware: send the review request on **day 9** after delivery.
- Suppress the review request whenever a support issue/complaint/return is open.
- The review request is optional and should use a low-friction secure review link.
- Send at most one reminder to customers who have not reviewed, then stop.

Technical prerequisites before enabling that phase:

- Inbound reply capture and support-attention suppression.
- Secure random order-review tokens (store only token hash).
- Verified-purchase review submission without login/IP identity.

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

## Live activation boundary

Production sending is fail-closed behind two settings:

- `WHATSAPP_CLOUD_ENABLED=true`
- a valid `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT` ISO-8601 timestamp that is not in the future.

The activation timestamp is mandatory because migration 0079 may be deployed while live
WhatsApp sending is still disabled. Jobs created before that timestamp are marked
`cancelled` with `DELIVERY_CARE_PRE_ACTIVATION` and are never released as a stale rollout
backlog when live sending is enabled.

Set the activation timestamp once, immediately before the controlled live-send window,
using an explicit UTC timestamp such as `2026-08-18T15:00:00Z`. After production goes
live, treat this value as immutable. Moving it forward can intentionally suppress older
pending delivery-care jobs.

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
- pending jobs left for any other reason before an outbound provider request starts;
- signed provider-status events that raced the outbound `wamid` database write;
- bounded cleanup of old provider-status inbox rows.

A `sending` claim older than 10 minutes is considered ambiguous. It is marked failed for
manual inspection rather than automatically resent, because Meta may already have
accepted the request before the process died. Transport timeout/network failures are
handled the same way when no `wamid` is available. This deliberately favors avoiding a
duplicate customer message over retrying an uncertain send.

The worker processes at most five outbound messages per invocation. Provider-event
reconciliation and cleanup are independently bounded so maintenance work cannot expand
without limit.

## Manual recovery

Order details include a `متابعة WhatsApp` panel showing the durable job state,
provider lifecycle state, attempt count, provider message ID and compact failure code.

A manual retry button appears only when the failure is known-safe to retry:

- invalid Iraqi mobile or invalid customer first name after the underlying data is corrected;
- an explicit provider HTTP 4xx/5xx response;
- a signed Meta status webhook that explicitly marks an accepted `wamid` as `failed`.

For a confirmed provider failure, the previous `wamid`, provider status/timestamp,
acceptance timestamp and failure code are first copied into `metadata.manual_retry_history`.
Only then is the job reset for a new bounded attempt.

Manual retry is deliberately blocked for timeout, network, unknown, stale-send,
successful-HTTP-without-`wamid`, and acceptance-persistence ambiguity. Those cases may
already have reached Meta, and resending could duplicate the customer message.

## Required Meta configuration before live sends

Set these only in the deployment secret/environment store, never in Git:

- `WHATSAPP_CLOUD_ENABLED=false` during setup
- `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT` (set only for the controlled/live activation window)
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
and begins at `provider_status='accepted'`. The acceptance database write is idempotent
and is retried locally up to three times without ever repeating the provider send. If
acceptance still cannot be persisted, AQUAVO returns
`WHATSAPP_ACCEPTED_PERSISTENCE_AMBIGUOUS` and does not blindly resend.

A provider API acceptance does not claim that the customer's handset received or read
the message. The signed webhook supplies later `sent`, `delivered`, `read` or `failed`
status.

Migration 0079 creates a minimal `whatsapp_provider_status_events` inbox. A verified
status event is persisted there **before** reconciliation with the outbox. This closes
the race where Meta can deliver a status callback before the process has committed the
returned `wamid` into `customer_message_jobs`.

`provider_status_at` comes from Meta's webhook timestamp. Reconciliation applies events
by provider timestamp with a same-timestamp status rank so repeated or out-of-order
webhooks cannot regress a later state such as `read` back to `sent`.

Applied provider-event rows are eligible for cleanup after one day. Unmatched rows are
kept for seven days to preserve the race-recovery window, then removed by the bounded
recovery worker. The inbox stores only `wamid`, status, timestamp and compact failure
code — not raw webhook bodies, customer messages or provider error text.

## Production order

1. Confirm active migration `0078_accounting_external_handoff_hardening` is present.
2. Keep this branch current with `main` and pass TypeScript/build/tests/migration-ledger checks.
3. Deploy code with `WHATSAPP_CLOUD_ENABLED=false` and no live activation boundary yet.
4. Configure Meta number/token/template plus `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET`.
5. Configure the callback URL and subscribe the WABA/app to the WhatsApp `messages` webhook field.
6. Configure matching `CRON_SECRET` values in Vercel Production and GitHub Actions.
7. Apply migration 0079 to the target database. 0079 fails closed if active 0078 is missing.
8. Verify `shipped -> delivered` creates one pending `delivery_care` job and that the confirmation dialog prevents accidental delivery transitions.
9. Manually run the GitHub recovery workflow while WhatsApp remains disabled; it must reconcile/clean maintenance state but send zero outbound messages.
10. Verify Meta's GET webhook challenge succeeds and a bad/missing POST signature is rejected.
11. Choose the controlled activation instant and set `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT` to that exact UTC time. Do not reuse an old timestamp from earlier testing.
12. Enable `WHATSAPP_CLOUD_ENABLED=true` only for the controlled test window and deliver/send to a controlled recipient created after the activation boundary.
13. Verify all pre-activation pending delivery-care rows were cancelled rather than sent.
14. Verify the controlled job records `completed + provider_status=accepted + wamid`, then observe signed webhook progression to `sent`/`delivered` (and `read` when available).
15. Confirm no ambiguous job exposes a manual retry button and a simulated explicit provider failure does.
16. After the controlled end-to-end test passes, keep the same activation timestamp and leave `WHATSAPP_CLOUD_ENABLED=true` for live traffic.

## Failure behavior

- Explicit Meta HTTP 429/5xx: durable scheduled retry; order remains delivered.
- Transport timeout/network ambiguity: failed/manual inspection; no blind resend.
- Successful HTTP without a `wamid`: treated as ambiguous; no blind/manual resend.
- Meta accepted a `wamid` but its DB acknowledgement is ambiguous: local DB-only persistence retries; never provider resend.
- Signed provider status `failed`: visible in admin and eligible for guarded manual retry with prior `wamid` audit preserved.
- Invalid Iraqi mobile: message marked failed; order remains delivered.
- Missing/malformed customer first name: message marked failed; approved copy is not altered.
- Duplicate admin action/retry: no duplicate outbox job.
- Browser interruption after delivery update but before provider call: external worker finds the pending job.
- Abandoned `sending` claim: marked failed after the 10-minute ambiguity lease; no blind resend.
- Pre-activation rollout backlog: cancelled, never sent.
- Delivery corrected to a reject/return terminal status before send: pending care job is cancelled.
- Invalid webhook signature: rejected before payload processing.
- Verified webhook persistence failure: returns 503 so the provider can retry delivery of the callback.
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

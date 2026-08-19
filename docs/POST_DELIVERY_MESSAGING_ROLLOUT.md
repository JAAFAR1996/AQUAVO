# AQUAVO post-delivery messaging rollout

Status: implementation branch; outbound WhatsApp is intentionally disabled by default.

## Scope

Phase 1 sends only the immediate delivery-care message after an explicit admin-confirmed
transition to `delivered`. Review requests remain disabled until the separate secure
review-token and support-suppression flow is deployed.

The architecture deliberately separates order/accounting truth from customer messaging:
WhatsApp failure can never roll back a successful delivered-order transition.

## Trigger and durable outbox

The admin action `استلم الزبون` first opens a confirmation dialog. Only after explicit
confirmation does AQUAVO update the order to `delivered`.

Migration `0079_customer_post_delivery_messaging` attaches a PostgreSQL
`AFTER UPDATE OF status` trigger. A genuine transition into `delivered` writes exactly
one `delivery_care` outbox row. `UNIQUE(order_id, job_type)` makes enqueue/retry paths
idempotent.

After the order update succeeds, the admin UI immediately calls the admin-only
delivery-care dispatcher. The five-minute worker is the independent recovery path.

## Live activation boundary

Production sending is fail-closed behind both settings:

- `WHATSAPP_CLOUD_ENABLED=true`
- a valid `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT` ISO-8601 timestamp that is not in the future.

The activation timestamp prevents jobs accumulated while WhatsApp was disabled from
being released later as a stale backlog. Jobs created before the boundary are cancelled
with `DELIVERY_CARE_PRE_ACTIVATION`.

Set the boundary once, immediately before the controlled live test, using an explicit UTC
timestamp. After production goes live, treat it as immutable.

## External recovery scheduler

`.github/workflows/customer-messaging-retry.yml` calls the protected production route
`/api/cron/customer-messaging` every five minutes. The route uses `CRON_SECRET`, whose
value must match between Vercel Production and the GitHub Actions repository secret.

The worker covers:

- explicit retryable initial-send failures such as HTTP 429/5xx;
- browser interruption after `delivered` commits but before immediate dispatch;
- pending delivery-care jobs left before a provider request starts;
- signed provider-status callbacks that race outbound `wamid` persistence;
- signed Quick Reply callbacks that race outbound `wamid` persistence;
- Quick Reply callbacks received while Cloud API sending is disabled;
- Quick Reply auto-responses that received an explicit retryable 429/5xx rejection;
- stale `sending`/`processing` ambiguity handling;
- bounded cleanup of the provider-status and Quick Reply inboxes.

Each recovery stage is fault-isolated. Auto-reply candidates are processed independently,
so a malformed row or transient per-row database failure does not discard results from
unrelated jobs or turn a successful delivery-care batch into a failed cron invocation.

A delivery-care `sending` claim older than 10 minutes is terminally ambiguous. The same
rule applies to an auto-reply left in `processing` for more than 10 minutes. AQUAVO does
not resend either case because a provider request may already have left the process.

## Required Meta/deployment configuration

Keep these only in deployment/repository secret stores, never in Git:

- `WHATSAPP_CLOUD_ENABLED=false` during setup
- `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT=` until controlled activation
- `WHATSAPP_API_VERSION=v25.0`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_DELIVERY_CARE_TEMPLATE=aquavo_delivery_care_v1`
- `WHATSAPP_TEMPLATE_LANGUAGE=ar`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`
- `CRON_SECRET`
- `POST_DELIVERY_REVIEW_AUTOMATION_ENABLED=false`

Webhook callback URL:

```text
https://www.aquavoiq.com/api/webhooks/whatsapp
```

The Meta app/WABA must be subscribed to the WhatsApp `messages` webhook field. The
callback GET challenge uses `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; webhook POST requests are
accepted only after `X-Hub-Signature-256` validates against the exact raw body with
`META_APP_SECRET`.

The webhook parser then applies strict Zod schemas. It does not coerce malformed numeric
IDs, array timestamps, hexadecimal timestamps, numeric phone values, or unknown status
types into valid Meta events.

## Delivery-care template contract

The approved template name is `aquavo_delivery_care_v1`. It has exactly one body
parameter, `{{1}}`, populated with the customer's first name only. AQUAVO does not invent
a fallback name; a missing or malformed first name holds/fails the message for inspection.

Approved body — preserve it exactly:

```text
هلا أستاذ {{1}} 🌿
حبينا نطمن على طلبك بعد التوصيل.
إذا استلمته، كل القطع وصلت كاملة وبحالة زينة؟
```

Exactly two Quick Reply buttons, in this order:

1. `وصلتني وكلشي تمام`
2. `عندي ملاحظة عالطلب`

Stable developer payloads attached at send time:

- index `0` → `aquavo_delivery_ok_v1`
- index `1` → `aquavo_delivery_issue_v1`

The payload is the authoritative automation contract. Button text is accepted only as a
compatibility fallback for the configured visible label.

## Quick Reply validation and correlation

AQUAVO automates only signed inbound messages that strictly match Meta's button callback
shape and contain:

- `type="button"`
- an inbound message `id`
- sender `from`
- a decimal-string `timestamp`
- `context.id`, the original delivery-care `wamid`
- `button.payload` and/or `button.text`

Before an automatic response can be sent:

1. The payload/text must resolve to one of the two approved choices.
2. `context.id` must match a completed `delivery_care` job.
3. The normalized Iraqi sender number must match the customer phone on that order.
4. The inbound message ID must not already own the automatic-response claim.

The first valid choice is claimed in
`customer_message_jobs.metadata.delivery_care_reply` before the provider send. This is
the automatic-response idempotency boundary.

Approved automatic responses:

- `وصلتني وكلشي تمام` → `تتهنى بطلبك أستاذ، وإذا احتجت أي مساعدة بأي منتج، دزلنا بأي وقت.`
- `عندي ملاحظة عالطلب` → `أكيد أستاذ، كللنا شنو الملاحظة بالطلب حتى نتابعها وياك.`

Ordinary customer text is not consumed by this automation and remains available for human
support.

## Quick Reply race inbox — migration 0082

Migration `0082_whatsapp_delivery_care_button_inbox` creates
`whatsapp_delivery_care_button_events`.

This inbox closes the race in which Meta can deliver the customer's button callback after
accepting the outbound template but before AQUAVO durably stores the returned outbound
`wamid` in `customer_message_jobs`.

When a verified callback is temporarily `unmatched`:

1. the callback is persisted before HTTP 200 is returned;
2. `inbound_message_id` is unique, so Meta redelivery is idempotent;
3. the five-minute worker retries correlation after the originating job stores its `wamid`;
4. once the callback is transferred into the job lifecycle, the inbox row is marked applied.

Applied inbox rows are eligible for cleanup after one day. Still-unmatched rows are kept
for seven days. The inbox stores only the minimal fields needed for correlation/recovery,
not the raw webhook body.

Migration 0082 fails closed unless active migration 0079 exists and has a matching rollback
migration. Rollback is blocked while unapplied button events remain.

## Second button press / changed customer choice

Only the first valid callback can trigger an automatic reply. If the same customer later
presses the other button on the same delivery-care message, AQUAVO records the later
choice as `latest_choice`/`latest_choice_at` and appends a minimal audit entry under
`subsequent_choices`, but **does not send a second automatic reply**.

This matters operationally: if a customer first confirms everything is fine and later
presses `عندي ملاحظة عالطلب`, the admin panel shows the latest state as a customer issue.
Exact webhook redelivery of the original callback remains a no-op.

## Automatic-reply retry safety

Automatic responses use at-most-once safety:

- timeout/network → ambiguous, never automatically retried;
- HTTP success without a `wamid` → ambiguous, never automatically retried;
- explicit HTTP 429/5xx → retryable, at most three attempts;
- retryable attempts have a minimum 60-second backoff;
- the five-minute worker is independent of Meta webhook redelivery;
- callbacks captured while Cloud API sending is disabled remain durable and resumable;
- abandoned `processing` claims older than 10 minutes become terminal ambiguous;
- other explicit HTTP failures are terminal unless a future human-controlled policy says otherwise.

The recovery worker parses potentially malformed metadata timestamps in application code
and isolates each candidate so one corrupt record cannot poison a whole SQL batch.

## Provider status semantics

When Meta returns a WhatsApp message ID (`wamid`), the delivery-care job becomes
`completed` and starts at `provider_status='accepted'`. That means provider API acceptance,
not handset delivery.

Signed `messages` webhook status events later move lifecycle state through `sent`,
`delivered`, `read`, or `failed`.

Migration 0079's `whatsapp_provider_status_events` inbox persists a verified provider
status before reconciliation. That closes the analogous race where a status webhook can
arrive before the outbound `wamid` database write.

`provider_status_at` comes from Meta's event timestamp. Reconciliation is monotonic, so
repeated or out-of-order events cannot regress a newer provider state.

Applied provider-status inbox rows are cleaned after one day; unmatched rows are retained
for seven days.

## Admin privacy and operational UI

The admin `متابعة WhatsApp` panel displays operational fields such as job/provider state,
attempt count, latest customer delivery-care choice and auto-reply state.

The API does **not** expose the entire JSONB metadata object to the browser. It allowlists
only the reply fields needed by the UI:

- `choice`
- `received_at`
- `auto_reply_status`
- `auto_reply_attempts`
- `latest_choice`
- `latest_choice_at`

Internal inbound IDs, button payloads, automatic-response provider IDs and
`manual_retry_history` remain server-side.

Manual retry for the initial delivery-care message remains available only for known-safe
failure classes. Timeout/network/unknown/acceptance-persistence ambiguity remains blocked
from manual resend.

## Production order

1. Confirm active `0078_accounting_external_handoff_hardening`.
2. Keep PR #94 current with `main`; pass typecheck, build, security tests and migration-ledger governance.
3. Keep `WHATSAPP_CLOUD_ENABLED=false` and `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT` unset.
4. Confirm the real Meta number/system-user token and server secrets are configured.
5. Confirm callback verification and WABA/app subscription to the WhatsApp `messages` field.
6. Confirm matching `CRON_SECRET` in Vercel Production and GitHub Actions.
7. Ensure migration 0079 is active on the target database.
8. Apply migration 0082 before deploying/enabling the hardened Quick Reply code.
9. Run the protected recovery worker while WhatsApp remains disabled; it must perform maintenance but send no outbound messages.
10. Verify invalid/missing webhook signatures fail and valid Meta payloads pass strict schema parsing.
11. Confirm `aquavo_delivery_care_v1` is Approved/Active with the exact body and two buttons above.
12. Create exactly one controlled order after choosing the rollout boundary.
13. Set `WHATSAPP_DELIVERY_CARE_ACTIVATION_AT` to the exact controlled-test UTC instant.
14. Set `WHATSAPP_CLOUD_ENABLED=true` and redeploy.
15. Mark the controlled order delivered through the explicit admin confirmation.
16. Verify one delivery-care job records Meta acceptance and one outbound `wamid`.
17. Observe signed provider lifecycle progression when available.
18. Tap `وصلتني وكلشي تمام`; verify exactly one callback claim and exactly one auto-reply.
19. On a separate controlled order, test `عندي ملاحظة عالطلب`.
20. Verify an exact webhook redelivery cannot send a duplicate response.
21. Verify a later different button press updates the admin-visible latest choice but sends no second auto-reply.
22. Verify a deliberately unmatched/raced callback is parked in the 0082 inbox and reconciled later.
23. Verify explicit 429/5xx recovery respects backoff and the attempt cap.
24. Verify timeout and abandoned processing states become ambiguous and are never resent.
25. Only after the controlled end-to-end test passes, leave Cloud sending enabled for live traffic.

## Failure behavior

- Initial HTTP 429/5xx: durable scheduled retry; order remains delivered.
- Initial timeout/network ambiguity: terminal/manual inspection; no blind resend.
- Initial HTTP success without `wamid`: ambiguous; no blind resend.
- Meta accepted a `wamid` but local acceptance persistence is ambiguous: DB-only persistence retry; no provider resend.
- Provider status `failed`: visible in admin and eligible for guarded manual retry when proven safe.
- Invalid Iraqi mobile or invalid first name: delivery truth remains unchanged; message is held/failed.
- Duplicate admin action: no duplicate outbox job.
- Browser interruption: five-minute worker recovers pending work.
- Abandoned initial `sending`: terminal ambiguity after the lease; no blind resend.
- Pre-activation backlog: cancelled, never sent.
- Delivery corrected to a terminal reject/return before send: pending care job cancelled.
- Invalid webhook signature: rejected before payload processing.
- Malformed-but-coercible webhook fields: rejected by strict schema parsing.
- Verified persistence failure: non-2xx so the provider can retry the callback.
- Provider status callback racing outbound `wamid`: persisted in the 0079 inbox and reconciled later.
- Quick Reply callback racing outbound `wamid`: persisted in the 0082 inbox and reconciled later.
- Exact duplicate Quick Reply callback: no duplicate auto-reply.
- Later different button choice: latest choice recorded, no second auto-reply.
- Auto-reply received while Cloud API is disabled: durable disabled state, resumable later.
- Auto-reply HTTP 429/5xx: bounded safe retry after backoff.
- Auto-reply timeout/network ambiguity: recorded, never automatically repeated.
- Abandoned auto-reply processing: terminal ambiguity after 10 minutes.
- One auto-reply recovery row fails: other rows and the initial delivery-care recovery stage continue.
- Sender mismatch: no automatic response.
- Unrelated incoming text: ignored by automation and left for human support.
- Review jobs: not created in phase 1.

## Review phase — intentionally deferred

The review request remains a separate WhatsApp lifecycle and must not be enabled by this
release. Keep `POST_DELIVERY_REVIEW_AUTOMATION_ENABLED=false`.

Future review requirements remain:

- consumables: target day 5 after delivery;
- equipment/hardware: target day 9 after delivery;
- suppress while a support issue/complaint/return is open;
- secure random order-review tokens with only token hashes stored;
- verified-purchase review submission;
- at most one reminder, then stop.

# AQUAVO post-delivery messaging rollout

Status: implementation branch; outbound WhatsApp is intentionally disabled by default.

## Trigger

The existing admin action `استلم الزبون` updates the AQUAVO order to `delivered`.
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

## Required Meta configuration before live sends

Set these only in the deployment secret/environment store, never in Git:

- `WHATSAPP_CLOUD_ENABLED=true`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_DELIVERY_CARE_TEMPLATE`
- `WHATSAPP_TEMPLATE_LANGUAGE=ar`

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
review mention, order number, CTA, or extra question. Its only job is to confirm the
handoff and keep the support channel open.

## Provider status semantics

When Meta returns a WhatsApp message ID (`wamid`), the outbox job becomes `completed`
and `provider_status='accepted'`. This means the provider accepted the API request; it
does not claim that the customer's handset received or read the message.

The later webhook phase will move `provider_status` through `sent`, `delivered`, `read`
or `failed` from Meta webhook events.

## Production order

1. Merge/apply the in-flight 0078 accounting migration first.
2. Rebase this branch if needed.
3. Pass TypeScript/build/tests and migration-ledger checks.
4. Apply 0079 to the target database. 0079 fails closed if active 0078 is missing.
5. Configure Meta number/template credentials with `WHATSAPP_CLOUD_ENABLED=false`.
6. Configure matching `CRON_SECRET` values in Vercel Production and GitHub Actions.
7. Verify `shipped -> delivered` creates one pending `delivery_care` job.
8. Manually run the GitHub recovery workflow while WhatsApp remains disabled; it must exit cleanly without sending.
9. Send to a controlled test recipient through the admin dispatcher.
10. Verify the outbox records `completed + provider_status=accepted + wamid`.
11. Only then set `WHATSAPP_CLOUD_ENABLED=true`.

## Failure behavior

- Explicit Meta HTTP 429/5xx: durable scheduled retry; order remains delivered.
- Transport timeout/network ambiguity: failed/manual inspection; no blind resend.
- Invalid Iraqi mobile: message marked failed; order remains delivered.
- Missing/malformed customer first name: message marked failed; approved copy is not altered.
- Duplicate admin action/retry: no duplicate outbox job.
- Browser interruption after delivery update but before provider call: external worker finds the pending job.
- Abandoned `sending` claim: marked failed after the 10-minute ambiguity lease; no blind resend.
- Delivery corrected to a reject/return terminal status before send: pending care job is cancelled.
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

- Meta webhook signature verification and `sent/delivered/read/failed` status updates.
- Inbound reply capture and support-attention suppression.
- Secure random order-review tokens (store only token hash).
- Verified-purchase review submission without login/IP identity.

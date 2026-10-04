# AQUAVO Automatic WhatsApp Lifecycle v3

This system extends the existing immediate `delivery_care` WhatsApp outbox. It does not replace it.

## Research basis

The design follows current WhatsApp Business Platform behavior and current 2026 marketing guidance:

- Meta separates templates into Utility, Marketing and Authentication categories.
- Order-specific service updates are Utility use cases; promotions/replenishment nudges are Marketing.
- Proactive marketing should be expected by the customer and backed by clear opt-in.
- Marketing experiences should provide an easy stop/unsubscribe path.
- A successful Cloud API response with a `wamid` means Meta accepted the send; handset delivery/read truth comes later from signed webhook status events.
- Current AQUAVO lifecycle templates are intentionally buttonless. Legacy Quick Reply webhook recovery remains only for historical provider callbacks; new outbound lifecycle sends do not attach Quick Reply components.

The production design therefore keeps service follow-up and marketing replenishment as two separate approved templates.

## Lifecycle

### 0. Immediate delivery care

Trigger: admin changes a real order to `delivered`.

Template: `aquavo_delivery_care_v1`  
Category: **MARKETING**  
Variables: one (`{{1}}` = customer first name)  
Buttons: none

The same message contains both the delivery check-in and the Instagram Story/Reels
5% / 10% reward. Because the discount/reward is promotional, there is no Utility
fallback for this template. Sending requires a current WhatsApp marketing opt-in.
Without current consent the outbox is cancelled with `MARKETING_OPT_IN_REQUIRED`.

### 1. Day-7 service follow-up

Trigger: roughly 7 days after a realized delivered order.

Schedule: 11:30 Asia/Baghdad.

Category: **UTILITY**

Template: `aquavo_day7_care_v1`

Body:

هلا أستاذ {{1}}
صار تقريباً أسبوع على استلام طلبك من AQUAVO.
حبينا نطمن عليك: كلشي تمام لحد هسة ويا المنتجات والحوض؟
إذا أكو أي ملاحظة، حتى لو بسيطة، رد علينا هنا ونساعدك بيها.

One body variable, no buttons. Day-7 remains a Utility/service template, but any
business-initiated WhatsApp send still requires a current AQUAVO WhatsApp opt-in.
A later opt-out suppresses pending Day-7 and replenishment jobs.

### 2. Replenishment reminder

Trigger: quantity/variant-aware expected replenishment timing from Growth OS.

Schedule: 12:30 Asia/Baghdad.

Category: **MARKETING**

Template: `aquavo_repurchase_reminder_v1`

Body:

هلا أستاذ {{1}}
إذا {{2}} قرب يخلص عندك، حبينا نذكّرك بيه بوقت مناسب.
إذا تحتاجه من جديد، دزلنا هنا ونرتبلك المناسب.

Two body variables, no buttons. Current marketing consent is mandatory.

Timing uses the exact purchased variant/pack size when available, purchased quantity,
and realized repeat-purchase cadence. Nearby consumables may be grouped into one
reminder; a later purchase suppresses stale recommendations.

## Consent model

The existing required Terms acceptance is the storefront consent control. When accepted,
checkout sends `whatsappMarketingOptIn=true`; test-mode orders force it false.

The order-level consent flag and timestamp are written inside the same order-creation
transaction for both COD and Wayl. Projection to `customer_profiles` and the append-only
`customer_messaging_consent_events` ledger happens after commit and is repairable from
the durable order evidence.

A later explicit WhatsApp opt-out wins over an older opt-in. An order that does not add
new consent never revokes a previous consent by itself.

## Free-text replies

Current templates have no Quick Reply buttons. Normal `type="text"` webhook messages are
persisted idempotently in `whatsapp_customer_text_events`.

Correlation uses Meta `context.id` when present; otherwise it falls back to the same
phone's most recent completed AQUAVO WhatsApp lifecycle message inside a bounded 30-day
window. Recognized lifecycle text such as repurchase interest / stop or Day-7 help is
also applied to the lifecycle job. Generic text is surfaced to human support through
Telegram. Alert failures remain durable and are retried by the five-minute worker.

Explicit stop phrases record a canonical marketing opt-out and suppress pending
replenishment jobs.

## Anti-spam / quality controls

The automation is deliberately conservative:

- no test orders;
- only delivered + paid orders with financial realization evidence;
- COD requires `cod_received=true`;
- verified online orders require `payments.method IN ('wayl','alqaseh')` and `status='completed'`;
- no stale pre-activation backlog;
- daytime-only sending: 10:00–19:30 Asia/Baghdad;
- no repurchase marketing without current opt-in;
- maximum one accepted repurchase marketing message per customer per 30 days;
- no reminder for already-replenished or unavailable products;
- no lifecycle marketing while a support issue is open;
- provider timeout/network ambiguity is never blindly resent;
- only explicit 429/5xx failures use bounded retry;
- provider `sent/delivered/read/failed` state is reconciled from signed webhooks.

## Rollout gates

All lifecycle automation fails closed until the approved template names and rollout
boundary are configured.

Immediate delivery care:
`WHATSAPP_DELIVERY_CARE_TEMPLATE=aquavo_delivery_care_v1`

Day-7:
`WHATSAPP_DAY7_CARE_TEMPLATE=aquavo_day7_care_v1`
`WHATSAPP_DAY7_TEMPLATE_APPROVED=true` only after WhatsApp Manager shows the exact template Approved/Active.

Replenishment:
`WHATSAPP_REPURCHASE_TEMPLATE=aquavo_repurchase_reminder_v1`
`WHATSAPP_REPURCHASE_TEMPLATE_APPROVED=true` only after WhatsApp Manager shows the exact template Approved/Active.

Production runtime config in `whatsapp_lifecycle_runtime_config` controls activation of
Day-7 and replenishment. Migration `0097_whatsapp_lifecycle_fail_closed` deliberately
keeps both disabled until WhatsApp Manager shows the exact templates Approved/Active;
activation must then set a fresh boundary so no stale backlog is sent. Provider credentials
remain environment secrets.

Before merge, CI must run against the final PR head, including any verified dependency-lock
refresh committed by automation.

## Worker

The protected customer-messaging endpoint accepts two independent scheduler identities:

- primary: a Neon Function Trigger every five minutes. The function accepts only Neon-triggered invocations and calls AQUAVO with a dedicated bearer secret; AQUAVO stores only the SHA-256 digest in PostgreSQL.
- fallback: GitHub Actions OIDC pinned to the exact AQUAVO repository, workflow and main ref.

The worker runs:

- immediate delivery-care recovery;
- Day-7 / replenishment lifecycle sending;
- provider-status reconciliation;
- free-text support-alert recovery;
- bounded cleanup of reply/provider inboxes.

## Delivery truth

`status='completed'` on a lifecycle row means provider acceptance, not handset delivery.

Use:

- `provider_status='sent'`
- `provider_status='delivered'`
- `provider_status='read'`
- `provider_status='failed'`

for later provider lifecycle truth.

## Operational principle

Automation should reduce repetitive manual follow-up, not create repeated pressure on customers. A customer who does not repurchase receives no repeated marketing chase from the same order. A new realized order starts a new product-based lifecycle.

## Learning replenishment timing

Rule-based intervals are only the cold-start fallback. Growth OS also learns from
realized repeat purchases of products that are already classified as consumables.

Observed cadence becomes authoritative only after at least four valid repeat-purchase
intervals across at least two different customers. The engine uses the median interval,
ignores implausible gaps below 7 or above 180 days, and raises confidence only as evidence
grows. Equipment is excluded from this learning path so a customer buying a second tank
cannot accidentally teach AQUAVO that a heater or filter is a consumable.



## Rollout migrations

Migration `0098_whatsapp_text_alert_hardening` quarantines the pre-fix inbound-text backlog without deleting customer messages, so historical/general chat is never replayed as an operator-alert flood.

Migration `0099_customer_messaging_scheduler_auth` stores only the SHA-256 digest used to authenticate the primary Neon scheduler. The plaintext bearer credential exists only in the scheduler environment.

## Scheduler reliability

The primary scheduler is a Neon Function Trigger at a five-minute UTC cadence. GitHub Actions remains a secondary recovery path only; scheduled GitHub workflow execution can be delayed and must not be treated as an exact clock. Both callers hit the same idempotent protected worker.

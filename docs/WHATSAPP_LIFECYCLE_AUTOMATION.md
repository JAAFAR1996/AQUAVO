# AQUAVO Automatic WhatsApp Lifecycle v3

This system extends the existing immediate `delivery_care` WhatsApp outbox. It does not replace it.

## Research basis

The design follows current WhatsApp Business Platform behavior and current 2026 marketing guidance:

- Meta separates templates into Utility, Marketing and Authentication categories.
- Order-specific service updates are Utility use cases; promotions/replenishment nudges are Marketing.
- Proactive marketing should be expected by the customer and backed by clear opt-in.
- Marketing experiences should provide an easy stop/unsubscribe path.
- A successful Cloud API response with a `wamid` means Meta accepted the send; handset delivery/read truth comes later from signed webhook status events.
- Quick Reply buttons are supported on approved templates and can be used for support/opt-out actions.

The production design therefore keeps service follow-up and marketing replenishment as two separate approved templates.

## Lifecycle

### 0. Immediate delivery care — already existing

Trigger: admin changes the order to `delivered`.

Existing transactional outbox:
`customer_message_jobs.job_type='delivery_care'`

This path remains isolated and unchanged.

### 1. Day-7 service follow-up

Trigger: roughly 7 days after a realized delivered order.

Schedule: 11:30 Asia/Baghdad.

Category: **UTILITY**

Template name:
`aquavo_day7_care_v1`

Body:

هلا أستاذ {{1}}
صار تقريباً أسبوع على استلام طلبك رقم {{2}} من AQUAVO.
حبينا نطمن: كلشي تمام ويا المنتجات والحوض؟
إذا عندك أي ملاحظة أو تحتاج مساعدة، رد علينا هنا.

Quick Replies:

1. `كلشي تمام`
2. `أحتاج مساعدة`

The job is suppressed if the order stops being eligible or an existing delivery-care reply already shows a support issue.

### 2. Replenishment reminder

Trigger: product-specific expected replenishment timing from `product_repurchase_profiles`.

Schedule: 12:30 Asia/Baghdad.

Category: **MARKETING**

Template name:
`aquavo_repurchase_reminder_v1`

Body:

هلا أستاذ {{1}}
حسب طلبك السابق من AQUAVO، ممكن يكون {{2}} قرب يخلص.
إذا تحتاجه من جديد، نراجع احتياج حوضك ونرتبلك المناسب فقط.

Quick Replies:

1. `أحتاجه`
2. `إيقاف التذكيرات`

This message is allowed only when the canonical customer profile has a current explicit WhatsApp marketing opt-in.

## Consent model

Checkout shows a separate, optional, unchecked WhatsApp marketing consent control.

The consent is not bundled into acceptance of store Terms.

A true checkout opt-in is written to the order and then rolled into the canonical phone-centric `customer_profiles` record. Every opt-in/opt-out is preserved in the append-only `customer_messaging_consent_events` ledger.

An unchecked box does **not** mean opt-out and never revokes prior consent.

The repurchase template's `إيقاف التذكيرات` button performs an explicit opt-out and suppresses all still-open repurchase jobs for that phone.

Day-7 service follow-up does not depend on marketing consent.

## Anti-spam / quality controls

The automation is deliberately conservative:

- no test orders;
- only delivered + paid + COD-received realized orders;
- no stale pre-activation backlog;
- daytime-only sending: 10:00–19:30 Asia/Baghdad;
- day-7 backlog limited by the planner window;
- no repurchase marketing without explicit current opt-in;
- maximum one accepted repurchase marketing message per customer per 30 days;
- no repurchase reminder if the relevant product has already been repurchased;
- no repurchase reminder if no recommended product is currently storefront-visible and in stock;
- no lifecycle message when the immediate delivery-care path already records a customer issue;
- provider timeout/network ambiguity is never blindly resent;
- only explicit 429/5xx send failures receive bounded retry/backoff;
- provider `sent/delivered/read/failed` is stored from the signed webhook and cannot regress on out-of-order events.

## Rollout gates

All new automation fails closed until these are explicitly configured:

`WHATSAPP_LIFECYCLE_ENABLED=true`

`WHATSAPP_LIFECYCLE_ACTIVATION_AT=<controlled UTC instant>`

`WHATSAPP_DAY7_CARE_TEMPLATE=aquavo_day7_care_v1`

Replenishment has a second independent gate:

`WHATSAPP_REPURCHASE_ENABLED=true`

`WHATSAPP_REPURCHASE_TEMPLATE=aquavo_repurchase_reminder_v1`

Do not enable a template name until WhatsApp Manager shows the exact template as approved/active in its intended category.

## Worker

The existing protected five-minute customer-messaging worker now runs both:

- immediate delivery-care recovery;
- Growth OS lifecycle automation.

The worker also reconciles lifecycle quick-reply races and cleans the bounded reply inbox.

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

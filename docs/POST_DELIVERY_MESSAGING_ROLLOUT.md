# AQUAVO WhatsApp post-delivery rollout

## Production contract

AQUAVO uses one immediate post-delivery WhatsApp template:

- template: `aquavo_delivery_care_v1`
- category: **MARKETING**
- body variables: exactly one, `{{1}}` = customer first name
- buttons: **none**
- trigger: genuine admin-confirmed transition to `delivered`
- eligibility: current WhatsApp marketing consent
- idempotency: one `delivery_care` outbox row per order

The message combines delivery care with the Instagram Story/Reels reward. It is not
split into a Utility message plus a second marketing message. If current marketing
consent is absent, AQUAVO cancels the pending delivery-care send with
`MARKETING_OPT_IN_REQUIRED`; it never substitutes the marketing copy into a Utility path.

Intended body:

```text
السلام عليكم أستاذ {{1}}
سؤال سريع عن طلبك من AQUAVO:
وصلت كل القطع كاملة وبحالة زينة؟

إذا أكو أي ملاحظة، حتى لو بسيطة، دزلنا هنا مباشرة ونراجعها وياك.

وإذا كلشي تمام، عندك مكافأة بسيطة على طلبك الجاي إذا حبيت تشارك تجربتك:

ستوري + منشن @aquavo_iq = خصم 5%
ريلز لفتح الطلب + منشن @aquavo_iq = خصم 10%

حتى تصوير بسيط يكفي، وما يحتاج يكون مرتب أو رسمي — شارك تجربتك مثل ما هي.

من تسويلنا منشن، ندزلك كود الخصم مباشرة.
```

WhatsApp Manager remains the provider-side source of truth for the currently approved
body. Do not enable production sending until the template is Approved/Active and its
component shape is one body variable with no buttons.

## Consent durability

Checkout acceptance writes `orders.whatsapp_marketing_opt_in=true` and
`whatsapp_marketing_opt_in_at` inside the same order-creation transaction. Projection
to `customer_profiles` and the append-only consent ledger happens after commit and is
repairable. A crash between order creation and CRM projection cannot erase the customer's
order-level consent evidence.

An explicit later WhatsApp opt-out wins over an older opt-in. Unchecked checkout state is
not treated as opt-out.

## Day-7 care

Template: `aquavo_day7_care_v1`  
Category: **UTILITY**  
Variables: one (`{{1}}` = first name)  
Buttons: none

```text
هلا أستاذ {{1}}
صار تقريباً أسبوع على استلام طلبك من AQUAVO.
حبينا نطمن عليك: كلشي تمام لحد هسة ويا المنتجات والحوض؟

إذا أكو أي ملاحظة، حتى لو بسيطة، رد علينا هنا ونساعدك بيها.
```

Day-7 is a service follow-up, not a sales message. It is scheduled for 11:30
Asia/Baghdad after the configured rollout boundary.

## Replenishment reminder

Template: `aquavo_repurchase_reminder_v1`  
Category: **MARKETING**  
Variables: two (`{{1}}` first name, `{{2}}` product summary)  
Buttons: none

```text
هلا أستاذ {{1}}
إذا {{2}} قرب يخلص عندك، حبينا نذكّرك بيه بوقت مناسب.
إذا تحتاجه من جديد، دزلنا هنا ونرتبلك المناسب.
```

Replenishment requires current marketing consent. Timing uses the consumable product,
exact variant/pack size when available, purchased quantity, and learned realized
repurchase cadence. Later repurchase suppresses the stale recommendation. Nearby
consumables are grouped and marketing sends are frequency-capped.

## Free-text replies

Buttonless templates depend on normal customer text replies. Signed Meta webhook messages
of `type="text"` are persisted idempotently in
`whatsapp_customer_text_events`.

A reply is correlated first by `context.id` when Meta provides it. A non-contextual
reply is correlated to the sender's most recent completed AQUAVO WhatsApp lifecycle
message within 30 days. The reply is surfaced to human support through Telegram and
remains durable if the alert path temporarily fails.

Explicit stop phrases such as `إيقاف التذكيرات` or `STOP` record a canonical WhatsApp
marketing opt-out and suppress pending replenishment jobs. Ordinary customer text never
triggers the legacy Quick Reply auto-response path.

## Provider/retry safety

- Meta API acceptance is stored by `wamid`; later signed webhooks reconcile
  `sent/delivered/read/failed`.
- timeout/network ambiguity is never blindly resent.
- explicit HTTP 429/5xx can use bounded retry.
- stale `sending` claims become terminal ambiguity.
- the protected five-minute worker recovers safe pending work and support alerts.
- test orders are excluded/quarantined.
- a WhatsApp failure never rolls back order or accounting truth.

## Payment eligibility

For lifecycle purposes a delivered, paid order is financially eligible when either:

- COD has `cod_received=true`; or
- a verified online payment row uses `wayl` (legacy `alqaseh` is also recognized)
  with payment status `completed`.

Migration `0095_wayl_delivery_accounting` extends the delivery-accounting trigger so
verified Wayl orders can reach `delivered` using bank custody/capture accounting instead
of being rejected as an unsupported payment method.

## Production prerequisites

Before enabling a flow, verify its exact template is Approved/Active in WhatsApp Manager,
the Meta app is subscribed to the WABA `messages` webhook field, and Production has:
`WHATSAPP_CLOUD_ENABLED`, `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_LANGUAGE=ar`,
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, and `META_APP_SECRET`.

Immediate delivery care additionally requires
`WHATSAPP_DELIVERY_CARE_TEMPLATE=aquavo_delivery_care_v1` and a controlled
`WHATSAPP_DELIVERY_CARE_ACTIVATION_AT`.

Lifecycle jobs are protected by the durable runtime configuration in PostgreSQL. Day-7
must remain disabled until `aquavo_day7_care_v1` is approved. Replenishment must remain
disabled until `aquavo_repurchase_reminder_v1` is approved.

Webhook callback:

```text
https://www.aquavoiq.com/api/webhooks/whatsapp
```

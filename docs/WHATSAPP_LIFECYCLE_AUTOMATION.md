# AQUAVO WhatsApp Lifecycle Automation

## Purpose

This layer extends the existing immediate delivery-care WhatsApp workflow. It does not replace it.

Customer journey:

1. Customer explicitly opts in at checkout.
2. AQUAVO keeps the existing immediate delivered-order message.
3. About 7 days after delivery, AQUAVO may send one order-specific care follow-up.
4. For recurring consumables, AQUAVO may send one replenishment reminder near the product's expected replacement/reorder window.
5. If the customer buys the same consumable again first, the old reminder is suppressed.
6. A new successful order starts a new lifecycle cycle.
7. A customer can stop lifecycle WhatsApp at any time by replying an exact stop command such as `إيقاف` or `STOP`.

The system deliberately does not send the same reminder forever when the customer does not buy. That would create spam pressure and damage WhatsApp quality.

## Consent

Lifecycle automation is opt-in, independent from the required checkout Terms checkbox.

The checkout opt-in is optional and off by default:

> أريد استلام متابعة بعد البيع وتذكيرات إعادة شراء المنتجات المستهلكة على واتساب. أقدر أوقفها بأي وقت بإرسال «إيقاف».

A checked box records both:

- post-purchase follow-up consent
- replenishment/marketing consent

These are stored as separate scopes so AQUAVO can split the UI into granular consents later without changing the data model.

An unchecked box never revokes an older valid consent. Revocation is explicit through the WhatsApp stop command or an approved admin/customer-preference path.

Consent history is stored in `whatsapp_lifecycle_consent_events`.

## Opt-out

The signed Meta webhook recognizes exact stop commands only:

- إيقاف / ايقاف
- وقف
- إلغاء / الغاء
- STOP
- unsubscribe
- وەستاندن / وەستێنە

Exact matching is intentional. A normal support sentence such as “ممكن توقف الطلب؟” must not silently unsubscribe the customer.

Opt-out:

- disables follow-up consent
- disables marketing consent
- records an opt-out timestamp
- suppresses planned/ready lifecycle jobs
- leaves essential order/service messaging separate

Explicit re-opt-in commands are also supported.

## Templates

Business-initiated messages outside the 24-hour customer service window use approved WhatsApp templates.

### Day-7 care

Name:

`aquavo_day7_care_v1`

Intended category:

`UTILITY`

Arabic body:

```
هلا أستاذ {{1}}، مر أسبوع تقريباً على استلام طلبك رقم {{2}} من AQUAVO.
حبينا نطمن: كلشي تمام بالحوض والمنتجات؟
إذا عندك أي ملاحظة رد على هاي الرسالة وإحنا نتابع وياك.
```

Variables:

1. first name
2. AQUAVO order number

There is no discount, cross-sell or promotional copy in this template.

### Replenishment

Name:

`aquavo_repurchase_v1`

Category:

`MARKETING`

Arabic body:

```
هلا أستاذ {{1}}، حسب طلبك السابق من AQUAVO ممكن يكون قرب وقت تجديد {{2}}.
إذا بعدك تحتاجه، نكدر نراجع وياك الكمية المناسبة لحوضك.
إذا ما تريد تذكيرات إعادة شراء، رد «إيقاف».
```

Variables:

1. first name
2. purchased consumable/product names

Meta has final authority over template category/status. AQUAVO therefore requires an explicit production flag confirming both templates were approved before the automatic worker can send anything.

## Fail-closed production gates

All of the following must be true before automatic lifecycle sends are possible:

- `WHATSAPP_CLOUD_ENABLED=true`
- `WHATSAPP_LIFECYCLE_AUTOMATION_ENABLED=true`
- `WHATSAPP_LIFECYCLE_TEMPLATES_APPROVED=true`
- valid API version
- phone-number id configured
- access token configured
- both template names configured
- `WHATSAPP_LIFECYCLE_ACTIVATION_AT` is a valid UTC timestamp in the past

Old jobs created before the activation boundary are suppressed, never backfilled into a message blast.

## Send window

Automatic lifecycle sends are limited to a Baghdad-local daytime window.

Defaults:

- start: 10:00
- end: 20:00
- timezone: Asia/Baghdad

The protected five-minute customer-messaging worker can run all day. Outside the send window it performs safe housekeeping but sends no lifecycle template.

## Frequency controls

AQUAVO adds its own marketing cap even if Meta permits more:

- at most one automatic replenishment message per customer in a rolling 30-day period

A pending reminder is postponed rather than duplicated.

A repurchase reminder is also suppressed if a later realized order already contains one of the recommended products.

## Support-problem suppression

If the immediate delivery-care flow records `delivery_issue` for the same order, generic day-7/replenishment automation is suppressed. A customer with an unresolved problem should receive human support, not a marketing sequence.

## Delivery safety

Provider sends use the same safety principles as the existing production delivery-care system:

- real Meta wamid is the durable acceptance identity
- 429 / 5xx explicit rejections can be retried with bounded backoff
- network timeout / transport ambiguity is never blindly retried
- HTTP 2xx without a wamid is treated as ambiguous
- stale `sending` claims become terminal ambiguity rather than duplicate sends
- maximum send attempts: 5
- signed provider sent/delivered/read/failed events reconcile against lifecycle jobs

## Retry schedule

Explicit retryable rejection only:

1. ~5 minutes
2. ~30 minutes
3. ~2 hours
4. ~6 hours
5. terminal after the fifth attempt

## Lifecycle jobs

Growth OS continues to calculate the timing.

A job is promoted to channel `whatsapp` only when the corresponding explicit consent is active:

- `day7_care` -> follow-up consent -> Utility template
- `repurchase` -> marketing consent -> Marketing template

Without consent, the job remains internal/manual and the admin UI does not expose a WhatsApp send link.

## Monitoring

Admin Business Intelligence shows:

- automation readiness
- approved-template gate
- Baghdad send window
- automatic vs manual lifecycle jobs
- send failures and error codes
- provider status

MCP exposes a read-only `get_whatsapp_lifecycle_readiness` tool and never returns access tokens.

## Rollout order

1. Deploy database migration 0093.
2. Deploy code with lifecycle automation disabled.
3. Submit both templates to Meta.
4. Verify exact approved names/language/categories in WhatsApp Manager.
5. Set `WHATSAPP_LIFECYCLE_TEMPLATES_APPROVED=true`.
6. Set a future/present UTC `WHATSAPP_LIFECYCLE_ACTIVATION_AT`.
7. Enable `WHATSAPP_LIFECYCLE_AUTOMATION_ENABLED=true`.
8. Place one controlled real opt-in order.
9. Verify consent row, lifecycle job, provider wamid and delivered/read webhook status.
10. Only then leave the five-minute worker fully automatic.

Never enable lifecycle automation merely because the code is deployed.

# Translation validation (2026-09-20T03:01:20.223Z)

## UI bundles

| locale | present / total | errors | warnings |
|---|---|---|---|
| en | 5458 / 5458 | 0 | 0 |
| ckb | 5458 / 5458 | 0 | 168 |

## Content (public set)

| store | present / public | field-complete | passes all checks |
|---|---|---|---|
| en/products | 107 / 107 | 107 | 107 |
| en/blog_posts | 117 / 117 | 117 | 117 |
| en/blog_categories | 8 / 8 | 8 | 8 |
| ckb/products | 107 / 107 | 107 | 107 |
| ckb/blog_posts | 117 / 117 | 117 | 117 |
| ckb/blog_categories | 8 / 8 | 8 | 8 |

## Findings by code

| code | count |
|---|---|
| content/ckb/glossary | 143 |
| ui/ckb/glossary | 168 |

## Error samples (first 60)


## Warning samples (first 40)

- [ckb] common:validations.s16 — glossary terms-and-conditions: expected "مەرج و ڕێساکان"
- [ckb] common:cart-context.s6 — glossary login: expected "چوونەژوورەوە"
- [ckb] common:cart-context.s11 — glossary out-of-stock: expected "بەردەست نییە"
- [ckb] common:error-boundary.s3 — glossary track-order: expected "بەدواداچوونی داواکاری"
- [ckb] nav:links.orderTracking — glossary track-order: expected "بەدواداچوونی داواکاری"
- [ckb] nav:footer.aboutText — glossary decor: expected "دیکۆر"
- [ckb] home:hero.eyebrow — glossary decor: expected "دیکۆر"
- [ckb] home:categories.heatersDesc — glossary temperature: expected "پلەی گەرمی"
- [ckb] home:categories.water — glossary water-conditioner: expected "ئامادەکەری ئاو"
- [ckb] home:guides.heater.eyebrow — glossary temperature: expected "پلەی گەرمی"
- [ckb] home:why.focus.description — glossary decor: expected "دیکۆر"
- [ckb] products:meta.categoryListName — glossary decor: expected "دیکۆر"
- [ckb] product:viewer3d.error — glossary 3d-preview: expected "پێشبینینی سێ ڕەهەندی"
- [ckb] product:viewer3d.alt — glossary product: expected "بەرهەم"
- [ckb] product:viewer3d.start — glossary 3d-preview: expected "پێشبینینی سێ ڕەهەندی"
- [ckb] product:variants.tipHeater — glossary size: expected "قەبارە"
- [ckb] product:variantSelector.tipHeater — glossary size: expected "قەبارە"
- [ckb] checkout:form.addressPlaceholder — glossary point: expected "خاڵ"
- [ckb] checkout:summary.subtotal — glossary subtotal: expected "کۆی لاوەکی"
- [ckb] checkout:summary.invoice — glossary invoice: expected "فاکتۆر"
- [ckb] checkout:confirm.onlineWithPoints — glossary loyalty: expected "وفاداری"
- [ckb] checkout:loyalty.calculating — glossary account: expected "هەژمار"
- [ckb] checkout:success.track — glossary track-order: expected "بەدواداچوونی داواکاری"
- [ckb] account:register.s3 — glossary terms-and-conditions: expected "مەرج و ڕێساکان"
- [ckb] account:register.s10 — glossary loyalty-point: expected "خاڵی وفاداری"
- [ckb] account:register.s10 — glossary point: expected "خاڵ"
- [ckb] account:register.s15 — glossary discount: expected "داشکاندن"
- [ckb] account:register.s18 — glossary discount: expected "داشکاندن"
- [ckb] account:register.s28 — glossary discount: expected "داشکاندن"
- [ckb] account:register.s33 — glossary terms-and-conditions: expected "مەرج و ڕێساکان"
- [ckb] account:profile-referral.s7 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-referral.s9 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-referral.s12 — glossary point: expected "خاڵ"
- [ckb] account:profile-referral.s14 — glossary point: expected "خاڵ"
- [ckb] account:profile-referral.s17 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-referral.s24 — glossary point: expected "خاڵ"
- [ckb] account:profile-referral.s31 — glossary point: expected "خاڵ"
- [ckb] account:profile.s17 — glossary loyalty: expected "وفاداری"
- [ckb] account:profile.s26 — glossary loyalty: expected "وفاداری"
- [ckb] account:profile-orders.s5 — glossary delivery: expected "گەیاندن"

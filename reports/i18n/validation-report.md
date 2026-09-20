# Translation validation (2026-09-20T22:33:54.416Z)

## UI bundles

| locale | present / total | errors | warnings |
|---|---|---|---|
| en | 5458 / 5458 | 0 | 0 |
| ckb | 5458 / 5458 | 0 | 125 |

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
| content/ckb/glossary | 124 |
| ui/ckb/glossary | 125 |

## Error samples (first 60)


## Warning samples (first 40)

- [ckb] common:validations.s16 — glossary terms-and-conditions: expected "مەرج و بەندەکان"
- [ckb] common:cart-context.s11 — glossary out-of-stock: expected "بەردەست نییە لە کۆگا"
- [ckb] common:error-boundary.s3 — glossary track-order: expected "بەدواداچوونی داواکاری"
- [ckb] home:categories.water — glossary water-conditioner: expected "ئامادەکەری ئاو"
- [ckb] product:viewer3d.error — glossary 3d-preview: expected "پێشبینینی سێ ڕەهەندی"
- [ckb] product:viewer3d.alt — glossary product: expected "بەرهەم"
- [ckb] product:viewer3d.start — glossary 3d-preview: expected "پێشبینینی سێ ڕەهەندی"
- [ckb] product:variants.tipHeater — glossary size: expected "قەبارە"
- [ckb] product:variantSelector.tipHeater — glossary size: expected "قەبارە"
- [ckb] checkout:form.addressPlaceholder — glossary point: expected "خاڵ"
- [ckb] checkout:confirm.onlineWithPoints — glossary loyalty: expected "وەفاداری"
- [ckb] checkout:loyalty.calculating — glossary account: expected "هەژمار"
- [ckb] account:register.s3 — glossary terms-and-conditions: expected "مەرج و بەندەکان"
- [ckb] account:register.s15 — glossary discount: expected "داشکاندن"
- [ckb] account:register.s18 — glossary discount: expected "داشکاندن"
- [ckb] account:register.s28 — glossary discount: expected "داشکاندن"
- [ckb] account:register.s33 — glossary terms-and-conditions: expected "مەرج و بەندەکان"
- [ckb] account:profile-referral.s7 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-referral.s9 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-referral.s12 — glossary point: expected "خاڵ"
- [ckb] account:profile-referral.s14 — glossary point: expected "خاڵ"
- [ckb] account:profile-referral.s17 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-referral.s24 — glossary point: expected "خاڵ"
- [ckb] account:profile-referral.s31 — glossary point: expected "خاڵ"
- [ckb] account:profile.s17 — glossary loyalty: expected "وەفاداری"
- [ckb] account:profile.s26 — glossary loyalty: expected "وەفاداری"
- [ckb] account:profile-orders.s16 — glossary invoice: expected "پسووڵە"
- [ckb] account:login.s6 — glossary loyalty: expected "وەفاداری"
- [ckb] account:profile-coupons.s4 — glossary discount: expected "داشکاندن"
- [ckb] account:profile-coupons.s9 — glossary usage: expected "بەکارهێنان"
- [ckb] orders:order-confirmation.s4 — glossary delivery: expected "گەیاندن"
- [ckb] orders:order-confirmation.s15 — glossary electronic-payment: expected "پارەدانی ئەلیکترۆنی"
- [ckb] orders:order-confirmation.s16 — glossary electronic-payment: expected "پارەدانی ئەلیکترۆنی"
- [ckb] orders:order-confirmation.s59 — glossary loyalty: expected "وەفاداری"
- [ckb] orders:order-confirmation.s60 — glossary loyalty: expected "وەفاداری"
- [ckb] orders:order-confirmation.s74 — glossary invoice: expected "پسووڵە"
- [ckb] orders:invoice-dialog.s13 — glossary invoice: expected "پسووڵە"
- [ckb] orders:invoice-dialog.s14 — glossary invoice: expected "پسووڵە"
- [ckb] orders:invoice-dialog.s16 — glossary invoice: expected "پسووڵە"
- [ckb] orders:invoice-dialog.s18 — glossary invoice: expected "پسووڵە"

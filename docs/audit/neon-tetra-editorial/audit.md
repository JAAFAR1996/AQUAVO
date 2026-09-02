# Editorial correction — `neon-tetra-color-care-guide`

**Status: drafted 2026-09-02. Audited against the live catalogue and the live
store policy pages. Not yet applied.**

Separate from the script-purity work by design. `pass-2/migration.sql` repairs
*corrupted glyphs*; this one repairs *false and unsupported claims*. They touch
the same row, so this migration's pre-flight asserts pass 2 has already run.

## What the article claims, and what is actually true

Every verdict below was checked against a live source, not against memory:
the catalogue at `/api/products` (112 products, 11 categories), the governorate
list in `client/src/components/cart/checkout/types.ts`, the shipping constants
in `client/src/lib/constants/shipping.ts`, and the published policy pages
`return-policy.tsx` / `terms.tsx`.

| # | Claim in the article | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Water must be "خالية من الشوائب والكائنات الدقيقة الضارة" (twice) | **False** | Sterile water is the opposite of a cycled aquarium. AQUAVO itself sells `كبسولات بكتيريا نافعة` and `بكتيريا نافعة وبروبيوتيك` — the article contradicts both the biology and the shelf. |
| 2 | "استخدام معقم المياه" | **Unsupported** | No steriliser in the catalogue. `معالجة المياه` (13 SKUs) carries `معالج مياه للأحواض` and `مزيل كلور ومعالج مياه الأحواض` — the real product, and the correct advice. |
| 3 | "بتوفير نباتات مائية" | **Conflicts with the catalogue** | AQUAVO sells no live plants. The three "نبات" hits are `تربة أكواسكيب`, `حلقة سيراميك لتثبيت النباتات`, `قطن تثبيت للموس` — all accessories. `تربة وديكور` (27 SKUs) does carry natural driftwood, which is genuinely what a neon tetra needs for cover. |
| 4 | "من أفضل وأكبر متاجر الأسماك المائية في العراق" | **Unsupported superlative + wrong business** | Nothing supports "أفضل وأكبر". "متاجر الأسماك" reads as a fish store; AQUAVO sells equipment and consumables only. |
| 5 | "نقدم ضمانات عالية الجودة" | **False — contradicts the store's own policy** | `return-policy.tsx`: the limited warranty "ينطبق فقط إذا صفحة المنتج تذكره بوضوح", and `why-aquavo.tsx`: "ما نعمم وثيقة أو ضمان على كل المتجر". A blanket guarantee claim is exactly what those pages disclaim. |
| 6 | "المنتجات المستوردة عالية الجودة" | **Unverified** | Brands are present but no sourcing claim is documented anywhere. Dropped rather than defended. |
| 7 | "خدمات تسليم سريعة في 18 محافظة" | **TRUE — kept** | `GOVERNORATES` has exactly 18 entries; `DELIVERY_TEXT` is a flat 5,000 IQD across Iraq within 24 hours. Restated with the fee, which is verifiable. |
| 8 | "مجموعة واسعة" | **TRUE — kept** | 112 products across 11 categories. |
| 9 | Temperature "بين 20-24 درجة مئوية" | **TRUE — kept** | Inside the accepted range for *Paracheirodon innesi* (roughly 20–26 °C). Conservative, not wrong; left alone. |
| 10 | Heaters, filters, air pumps as advice | **TRUE — kept** | `التحكم بالحرارة` (3), `الفلترة والتنقية` (18), `التهوية والأكسجين` (13). |

Nothing outside rows 1–6 is touched. No new claim is introduced that the
catalogue or a policy page does not already support.

## Ordering

This migration **must run after** `docs/audit/language-contamination/pass-2/migration.sql`.
Two of its target strings only exist in their corrected form after pass 2, so
the pre-flight aborts if pass 2 has not been applied, rather than silently
matching nothing.

## Rollback

`rollback.sql` restores `content` verbatim from
`blog_posts_backup_neon_tetra_editorial_20260902`. Only `content` is written.

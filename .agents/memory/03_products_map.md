# 🏭 AQUAVO Products Map — Layer 3 Memory

## Product Brands

| Brand | Folder | Specialty |
|-------|--------|-----------|
| Hygger | `products/hygger/` | Pumps, heaters, lights |
| Yee | `products/yee/` | Budget filters, accessories |
| Houyi | `products/houyi/` | Aquarium tanks, substrate |
| SunSun | `products/sunsun/` | Canister filters |
| General | `products/general/` | Misc equipment |

## Product Image Structure

```
client/public/images/products/
└── {brand}/
    └── {product-slug}/
        ├── main.jpg          ← primary (largest, non-AI)
        ├── angle2.jpg
        ├── detail.jpg
        └── Gemini_*.png      ← AI-generated (skip for reference)
```

**Rule:** When looking for reference images, always prefer NON-Gemini_ files and pick the largest by filesize.

## Product Slug Patterns

| Brand prefix | Example slug |
|-------------|--------------|
| `hygger-` | `hygger-hang-on-filter-hg-912` |
| `yee-` | `yee-aquarium-heater-100w` |
| `houyi-` | `houyi-rimless-tank-60cm` |

**Smart lookup:** Strip brand prefix if no direct match found (e.g., `hang-on-filter-hg-912`).

## 7 Core Product Categories (Content Calendar)

1. **أحواض** — Tanks (rimless, bow-front, nano)
2. **فلاتر** — Filters (canister, HOB, sponge)
3. **سخانات** — Heaters (submersible, inline)
4. **إضاءة** — Lighting (LED, planted, reef)
5. **مضخات** — Pumps (wave makers, powerheads)
6. **غذاء** — Fish food (flakes, pellets, freeze-dried)
7. **ديكور** — Decor (driftwood, rocks, plants)

## Pricing Strategy (Iraq Market)

- **Price display:** IQD (دينار عراقي)
- **Anchor pricing:** Show original + discounted
- **Urgency:** "متوفر بالمخزن" — limited stock messaging
- **No harsh discounts** — premium positioning maintained

## Product Psychology Map

| Product | Primary Psychology | Hook |
|---------|-------------------|------|
| Tanks | Status + Identity | "حوضك يعكس شخصيتك" |
| Filters | Loss Aversion | "بدون فلتر جيد = سمك ميت" |
| Heaters | Safety + Fear | "درجة الحرارة الخاطئة تقتل" |
| LED Lights | Aspiration | "اجعل حوضك معرضاً فنياً" |
| Food | Care + Tribe | "كل خبير يعرف الفرق" |

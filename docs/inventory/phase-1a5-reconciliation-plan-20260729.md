> # DEPRECATED — DO NOT EXECUTE
>
> Superseded on 2026-07-30. This document plans the **8-row** settlement under the
> earlier decision code `OWNER_CONFIRMED_WEBSITE_STOCK_AS_CURRENT_TRUTH`. The owner
> has since widened the scope to the whole inventory under
> `OWNER_CONFIRMED_CURRENT_STOREFRONT_AS_CANONICAL_INVENTORY_TRUTH` (70 rows:
> A 45 / B 23 / C 2).
>
> The only executable source of truth is
> **`docs/inventory/phase1a5-full/canonical/`** — start at `RUNBOOK.md`.
> Kept here for provenance only.

# PHASE 1A.5 — خطة تسوية دفتر المخزون

**التاريخ:** 2026-07-29
**المصدر:** Neon `shiny-tree-43710630` / branch `production` (`br-patient-mouse-a4d4cgr4`)
**الحالة:** خطة معروضة للموافقة — **لم يُكتب أي شيء على Production**

---

## 0. سند القرار

```
decision_code : OWNER_CONFIRMED_WEBSITE_STOCK_AS_CURRENT_TRUTH
decided_at    : 2026-07-29
decided_by    : جعفر (مالك AQUAVO)
scope         : product_id + variant_id, location MAIN
statement     : مخزون الموقع الحالي على مستوى (منتج + متغيّر) هو المخزون
                الفعلي الصحيح 100% وهو Source of Truth.
method        : لا عدّ فعلي جديد. لا تعديل/حذف لأي حركة تاريخية.
                لا مساس بجرد STK-2026-06-25-MAIN.
                التسوية بحركات adjustment جديدة فقط.
reason        : الدفتر يحمل رصيداً افتتاحياً (2026-07-23) لا يطابق الرف،
                والموقع يعكس الواقع. تُسوّى الفجوة بحركة موثقة بدل أن
                يصححها أول بيع صدفةً.
```

**بصمة الدفتر قبل التسوية:** `800adda894150b38b212b809658388bd` (220 حركة)

---

## 1. آلية التنفيذ — لماذا INSERT حركة وليس UPDATE

`inventory_movements_project_product_stock` يعمل هكذا:

```
balance = SUM(quantity_delta) WHERE product_id = X
                                AND variant_id IS NOT DISTINCT FROM Y
                                AND location_id = MAIN
```
ثم:
- `variant_id IS NULL` و`has_variants=false` → `products.stock = balance`
- `variant_id` غير فارغ → `variants[i].stock = balance` + تحديث `product_variant_reconciliation`

وبما أن `adjustment = website − ledger`، فإن الرصيد بعد الحركة = website بالضبط،
فالإسقاط يكتب نفس الرقم الموجود أصلاً ⇒ **لا قفزة في مخزون الموقع**.

الحماية القائمة:
- `inventory_movements_immutable` → الحركات القديمة غير قابلة للتعديل/الحذف ✔
- `inventory_movements_prevent_negative` → لا رصيد سالب ✔
- `products_a_enforce_variant_stock_projection` → `products.stock` مشتق من مجموع المتغيّرات

`location_id` الإلزامي = `3bbe2906-3b51-44dd-825d-af94c4acf526` (MAIN، الموقع الوحيد)

---

## 2. خطة الصفوف السبعة

| # | product | variant | website | ledger before | adjustment | ledger after | website after (متوقع) | before hash |
|---|---|---|---|---|---|---|---|---|
| 1 | houyi-control-valve | `NULL` | 30 | 80 | **−50** | 30 | 30 (بلا تغيير) | `999268...79856` |
| 2 | houyi-planting-ring | `NULL` | 26 | 76 | **−50** | 26 | 26 (بلا تغيير) | `f38233...799577` |
| 3 | houyi-tracheal-suction | `NULL` | 26 | 75 | **−49** | 26 | 26 (بلا تغيير) | `c541f0...d58fb3` |
| 4 | houyi-tracheal-suction-cup | `NULL` | 47 | 96 | **−49** | 47 | 47 (بلا تغيير) | `10cafe...03b856` |
| 5 | houyi-white-sand | `1kg` | 3 | 30 | **−27** | 3 | 3 (بلا تغيير) | `36af17...8cb9c0` |
| 6 | houyi-net-bag | `black-15x20` | 43 | 17 | **+26** | 43 | 43 (بلا تغيير) | `cc00f0...86c4c1` |
| 7 | houyi-connectors-4mm | `shape-y` | 50 | 29 | **+21** | 50 | 50 (بلا تغيير) | `f36a38...58641e` |

**مجموع الفجوة:** 272 وحدة. الأرقام محسوبة من Production لا مُدخلة يدوياً،
وتطابق القيم التي اعتمدها المالك.

الصفوف 1–4 `has_variants=false` ⇒ `variant_id = NULL` (وليس نص `'base'`) —
هذا ما يخزّنه الدفتر فعلياً وما يتطلبه الـtrigger.

### شكل الحركة لكل صف

```sql
INSERT INTO inventory_movements
  (product_id, variant_id, location_id, quantity_delta,
   movement_type, source_type, source_id, idempotency_key,
   happened_at, created_by, metadata)
VALUES
  (:product_id, :variant_id, '3bbe2906-3b51-44dd-825d-af94c4acf526', :adjustment,
   'manual_adjustment', 'owner_confirmed_storefront_truth',
   'PHASE-1A5-20260729',
   'phase1a5:' || :product_id || ':' || COALESCE(:variant_id,'NULL'),
   now(), 'owner:jaafar',
   jsonb_build_object(
     'decision_code','OWNER_CONFIRMED_WEBSITE_STOCK_AS_CURRENT_TRUTH',
     'website_stock', :web, 'ledger_before', :led, 'adjustment', :adj,
     'decided_by','جعفر', 'decided_at','2026-07-29',
     'reason','ledger opening balance did not match storefront; owner confirmed storefront as truth',
     'before_hash', :before_hash));
```

`idempotency_key` يمنع الازدواج لو أُعيد التنفيذ.

---

## 3. أمران خارج السبعة اكتُشفا أثناء الحساب

### أ) 23 صفاً في الدفتر بلا وجود على الموقع — 135 وحدة

ثمانية منتجات رمل/وسائط لها أرصدة افتتاحية بمقاسات `2kg`/`3kg`/`5kg`
في الدفتر، لكن `products.variants` لم يعد يحوي إلا `1kg`:

`houyi-white-sand` (2kg=15, 3kg=5, 5kg=6) · `houyi-stream-sand` (18/12/7) ·
`houyi-dutch-sand` (10/5/4) · `houyi-river-sand` (10/6) ·
`houyi-ceramic-ring` (6/4/2) · `houyi-activated-carbon` (5/3/1) ·
`houyi-breathing-ring-white` (5/3/2) · `houyi-blue-dragon-stone` (3/2/1)

هذه **لا تؤثر على مخزون الموقع** (الإسقاط يشترط وجود المتغيّر في JSON فيتخطاها)،
لكنها رصيد وهمي في الدفتر. تحتاج قراراً منفصلاً.

> تصحيح لتدقيق الأمس: بند «61 فرقاً صغيراً / 342 وحدة» كان يخلط فئتين.
> التقسيم الصحيح: **38 فرق صغير حقيقي (207 وحدة)** + **23 صفاً بلا مقابل على الموقع (135 وحدة)**.
> 38+23=61 و207+135=342.

### ب) `houyi-connectors-4mm / shape-t`

website=50، ledger=30، فرق **+20** — أقل من عتبة الخطر بوحدة واحدة فلم يدخل السبعة،
لكنه نفس منتج `shape-y`. بعد تسوية `shape-y` وحده يبقى المنتج نصف متوافق.

---

## 4. التصنيف الكامل المعاد حسابه (2026-07-29)

| الفئة | صفوف | فجوة |
|---|---|---|
| A — مطابق | 117 | 0 |
| B — فرق صغير | 38 | 207 |
| D — خطر (السبعة) | 7 | 272 |
| E — بلا حركات | 19 | 6 |
| F — دفتر بلا مقابل على الموقع | 23 | 135 |

---

## 5. تسلسل التنفيذ المطلوب

1. فرع Neon جديد من أحدث Production + baseline كامل
2. تطبيق الحركات السبع على الفرع
3. إثبات: `ledger == website` لكل صف
4. إثبات: `products.stock` و`variants[].stock` لم تتغير
5. طلب اختباري داخل transaction ⇒ إثبات أن البيع ينقص **وحدة واحدة فقط** بلا قفزة
6. اختبار rollback
7. إثبات أن الطلبات والحسابات والكلف لم تتغير
8. عرض النتائج ← موافقة ← نسخة احتياطية Production ← إعادة قراءة لحظية
   (وإعادة حساب adjustment لو تغيّر أي صف بطلب حقيقي) ← تنفيذ صفاً صفاً مع تحقق بعد كل صف

`inventory_ledger_mode` يبقى `enforce` طوال العملية.

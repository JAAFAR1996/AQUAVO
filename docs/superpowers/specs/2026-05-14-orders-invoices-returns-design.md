# Orders, Invoices, Returns & Advanced Accounting — Design Spec
**التاريخ:** 2026-05-14

---

## الجزء A — إدارة الطلبات والفواتير

### A1: حذف الطلبات

**Backend:**
- `DELETE /api/admin/orders/:id` — يحذف الطلب نهائياً من قاعدة البيانات
- يُضاف في `server/routes/admin.ts` تحت `router.use(requireAdmin)`

**Frontend (orders-management.tsx):**
- زر "🗑️ حذف" بجانب كل طلب
- AlertDialog تأكيد: "هل تريد حذف الطلب رقم X؟ هذا الإجراء لا يمكن التراجع عنه"
- بعد الحذف: إزالة الطلب من القائمة فوراً

### A2: حالات الإرجاع للطلبات

**حالات الـ status الجديدة:**
```
rejected_returned  ← رفض ورجع للبائع  → يزيد المخزون تلقائياً
rejected_carrier   ← رفض وبقي بشركة الشحن → لا تغيير بالمخزون
```

**Backend:**
- `PATCH /api/admin/orders/:id` (موجود) — يُوسَّع ليدعم الحالتين الجديدتين
- عند تغيير status إلى `rejected_returned`: حلقة على order.items وزيادة stock لكل منتج بالكمية المطلوبة
- عند تغيير status إلى `rejected_carrier`: لا تغيير بالمخزون

**Frontend (orders-management.tsx):**
- في نافذة تفاصيل الطلب: Select لتغيير الحالة يشمل الحالات الجديدة
- تنبيه واضح عند اختيار `rejected_returned`: "سيتم إضافة المنتجات للمخزون تلقائياً"

### A3: حذف الفواتير

**Backend:**
- `DELETE /api/admin/invoices/:id` — حذف نهائي بدون قيود
- يُضاف في `server/routes/admin-invoices.ts`

**Frontend (invoices-list.tsx):**
- زر "🗑️ حذف" بجانب كل فاتورة
- AlertDialog تأكيد قبل الحذف
- بعد الحذف: إزالة الفاتورة من القائمة فوراً

---

## الجزء B — تتبع فلوس شركة الشحن (COD)

### B1: جدول جديد `shipping_settlements`

```typescript
shipping_settlements {
  id:        text PK (uuid)
  carrier:   text          -- اسم شركة الشحن
  amount:    numeric        -- المبلغ المستلم
  notes:     text nullable  -- ملاحظات
  createdAt: timestamp
}
```

### B2: حقل جديد على الطلبات

```typescript
orders {
  // حقل جديد:
  codReceived: boolean DEFAULT false  -- هل استُلمت فلوس COD هذا الطلب من الشركة
}
```

### B3: Backend

**ملف: `server/routes/accounting.ts`** — يُضاف إليه:
- `GET /api/admin/accounting/cod-summary` — إجمالي COD عند شركة الشحن / مستلم / باقي
- `POST /api/admin/accounting/settlements` — تسجيل استلام دفعة من الشركة (يقبل: carrier, amount, notes, orderIds[])
- `GET /api/admin/accounting/settlements` — قائمة كل الدفعات

### B4: Frontend

**في accounting-panel.tsx** — قسم جديد "شركة الشحن":
- بطاقة: إجمالي COD المسلّم / مستلم / **الباقي**
- زر "تسجيل دفعة جديدة" → نافذة: carrier + amount + notes
- جدول الدفعات السابقة

---

## الجزء C — تاريخ أسعار التكلفة + الكوبونات

### C1: جدول `product_cost_history`

```typescript
product_cost_history {
  id:            text PK (uuid)
  productId:     text FK → products.id
  costPrice:     numeric
  packagingCost: numeric
  insertCost:    numeric
  effectiveFrom: timestamp  -- من متى يسري هذا السعر
  createdAt:     timestamp
}
```

**منطق الحساب:**
- عند حساب ربح طلب بتاريخ T: ابحث عن آخر سجل في `product_cost_history` حيث `effectiveFrom <= T`
- إن لم يوجد تاريخ → استخدم `products.costPrice` (السعر الحالي)

### C2: Backend

**في `server/routes/accounting.ts`:**
- `GET /api/admin/accounting/cost-history/:productId` — تاريخ أسعار منتج
- `POST /api/admin/accounting/cost-history/:productId` — إضافة سعر جديد بتاريخ بدء
- تحديث `calcOrderProfit()` ليستخدم `product_cost_history`

### C3: تحليل الكوبونات

**في `server/routes/accounting.ts`:**
- `GET /api/admin/accounting/coupons?period=` — يجمع الطلبات التي استُخدم فيها كوبون:
  ```
  { couponCode, usageCount, totalDiscount, avgDiscount }[]
  ```

### C4: Frontend

**في accounting-panel.tsx:**
- خانة تعديل تكاليف المنتج: إضافة "سعر جديد من تاريخ محدد" بدلاً من الاستبدال المباشر
- تاب "الكوبونات": جدول يعرض كل كوبون واستخداماته وتكلفته الإجمالية
- سعر التكلفة الحالي + زر "تغيير السعر" → نافذة تطلب التاريخ والسعر الجديد

---

## ترتيب التنفيذ

1. A1: حذف الطلبات (Backend + Frontend) + حذف FH-260513-0001
2. A2: حالات الإرجاع + منطق المخزون
3. A3: حذف الفواتير (Backend + Frontend)
4. B: شركة الشحن COD (Schema + Backend + Frontend)
5. C1-C2: تاريخ أسعار التكلفة (Schema + Backend)
6. C3-C4: الكوبونات + Frontend المحاسب المحدّث

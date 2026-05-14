# نظام المحاسبة الكامل + مراقبة المنافسين
**التاريخ:** 2026-05-14  
**الحالة:** مراجعة المستخدم

---

## 1. ملخص المشروع

تاب المحاسبة: محاسب كامل يحسب الربح الصافي لكل طلب ومنتج بعد خصم كل التكاليف (تكلفة البضاعة، التغليف، الكارت، الكوبونات، نقاط الولاء، التوصيل).

تاب مراقبة المنافسين: يبحث عبر Apify عن نفس المنتج عند المنافسين ويرجع الأسعار + روابط مباشرة.

---

## 2. تغييرات قاعدة البيانات

### إضافة 3 حقول لجدول `products`

```sql
costPrice      NUMERIC   -- سعر الشراء من المورد (يدخله الأدمن)
packagingCost  NUMERIC   -- سعر الكارتونة/البوكس (يدخله الأدمن)
insertCost     NUMERIC   -- سعر الكارت/المواد الداخلية (يدخله الأدمن)
```

**Migration:** `ALTER TABLE products ADD COLUMN cost_price NUMERIC DEFAULT 0, ADD COLUMN packaging_cost NUMERIC DEFAULT 0, ADD COLUMN insert_cost NUMERIC DEFAULT 0;`

---

## 3. معادلة الربح الصافي (لكل سطر في الطلب)

```
إيراد السطر    = priceAtPurchase × quantity
تكلفة البضاعة  = costPrice × quantity
تكلفة التغليف  = packagingCost × quantity
تكلفة الكارت   = insertCost × quantity
حصة الكوبون    = discountTotal × (سعر السطر / إجمالي الطلب)
حصة النقاط     = pointsDiscount × (سعر السطر / إجمالي الطلب)
حصة التوصيل    = shippingCost × (سعر السطر / إجمالي الطلب)

الربح الصافي = إيراد السطر - تكلفة البضاعة - تكلفة التغليف - تكلفة الكارت - حصة الكوبون - حصة النقاط - حصة التوصيل
```

---

## 4. Backend — مسارات جديدة

**ملف:** `server/routes/accounting.ts`

| المسار | الوصف |
|--------|-------|
| `GET /api/admin/accounting/summary?period=day\|month\|year\|custom&from=&to=` | بطاقات الملخص: إيرادات، تكاليف، ربح صافي، هامش % |
| `GET /api/admin/accounting/products?period=` | ربحية كل منتج مع تفاصيل التكاليف |
| `GET /api/admin/accounting/orders?from=&to=&page=&limit=` | قائمة الطلبات مع الربح الصافي لكل طلب |
| `POST /api/admin/accounting/costs/:productId` | تحديث costPrice / packagingCost / insertCost |
| `POST /api/admin/accounting/competitor-check` | Apify: يبحث عن المنافسين لمنتج معين |

---

## 5. Apify Integration

**المكتبة:** `apify-client` (npm)  
**API Key:** يُخزن في `.env` كـ `APIFY_TOKEN`  
**Actor المستخدم:** `apify/google-shopping-scraper`

**منطق البحث:**
```
query = `${product.name} ${product.brand}`
country = "IQ" (العراق أولاً، ثم fallback للمنطقة العربية)
```

**الاستجابة لكل نتيجة:**
```json
{
  "store": "اسم المتجر",
  "price": 45000,
  "currency": "IQD",
  "url": "https://...",
  "checkedAt": "2026-05-14T10:00:00Z"
}
```

**Rate limiting:** 1 طلب لكل منتج كل 6 ساعات (نخزن `lastCheckedAt` بالداتابيس أو Redis).

---

## 6. Frontend

### 6.1 تاب المحاسب — `accounting-panel.tsx`

**القسم الأعلى: بطاقات الملخص (4 بطاقات)**
- إجمالي الإيرادات (أخضر)
- إجمالي التكاليف (أحمر)
- صافي الربح (أزرق AQUAVO)
- هامش الربح % (بنفسجي)

**فلاتر الفترة:** اليوم / هذا الشهر / هذه السنة / تخصيص (date range)

**جدول المنتجات:**
| المنتج | مبيع | إيراد | تكلفة | ربح صافي | هامش % | تعديل التكاليف |
- زر "تعديل" يفتح modal لإدخال costPrice / packagingCost / insertCost

**جدول الطلبات:**
| رقم الطلب | الزبون | التاريخ | الإيراد | الكوبون | النقاط | التوصيل | الربح الصافي |

### 6.2 تاب مراقبة المنافسين — `competitor-monitor-panel.tsx`

**قائمة المنتجات** مع:
- سعرك الحالي
- آخر فحص (lastCheckedAt)
- زر "فحص الآن" → loading → يعرض النتائج

**بطاقة النتائج لكل منتج:**
- جدول: المتجر | السعر | الفرق عن سعرك | رابط مباشر
- تنبيه أصفر: "منافس يبيع بـ X% أقل منك"
- تنبيه أخضر: "أنت الأرخص"

---

## 7. التكامل مع الأدمن

**ملف:** `client/src/pages/admin-dashboard.tsx`

إضافة تابَيْن جديدَيْن:
- `محاسب` → `<AccountingPanel />`
- `مراقبة المنافسين` → `<CompetitorMonitorPanel />`

---

## 8. ترتيب التنفيذ

1. Migration — إضافة الحقول الثلاثة لجدول products
2. Backend: `accounting.ts` — حسابات P&L
3. Backend: Apify integration في نفس الملف
4. Frontend: `accounting-panel.tsx`
5. Frontend: `competitor-monitor-panel.tsx`
6. ربط التابَيْن بالأدمن dashboard
7. تحديث نموذج تعديل المنتجات لإظهار حقول التكاليف

---

## 9. المتغيرات البيئية المطلوبة

```env
APIFY_TOKEN=apify_api_xxxx
```

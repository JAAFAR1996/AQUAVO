# دليل إمكانية الوصول (Accessibility Guide)

## نظرة عامة
هذا الدليل يوفر إرشادات شاملة لتحسين إمكانية الوصول في تطبيق AQUAVO وفقاً لمعايير WCAG 2.1 Level AA.

---

## ✅ التحسينات المُنفذة حديثاً (2025-12-20)

### 1. ✅ Skip Links للتنقل السريع
- **الحالة:** مُطبق بالكامل ✅
- **الملفات المُحدثة:**
  - `client/src/index.css` - تنسيق skip link موجود بالفعل
  - `client/src/App.tsx` - Skip link موجود بالفعل (السطر 312)
  - **جميع الصفحات (25+ صفحة)** - إضافة `id="main-content"` للعنصر الرئيسي

**الصفحات المُحدثة:**
- home.tsx, products.tsx, product-details.tsx
- blog.tsx, blog-post.tsx, calculators.tsx
- community-gallery.tsx, deals.tsx, faq.tsx
- fish-breeding-calculator.tsx, fish-finder.tsx, fish-health-diagnosis.tsx
- forgot-password.tsx, guides-eco-friendly.tsx, journey.tsx
- login.tsx, profile.tsx, register.tsx, reset-password.tsx
- order-tracking.tsx, privacy-policy.tsx, return-policy.tsx
- shipping.tsx, sustainability.tsx, terms.tsx
- 404.tsx

**الميزات:**
```css
.skip-to-main {
  @apply sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
         focus:z-50 focus:px-4 focus:py-2 focus:bg-primary
         focus:text-primary-foreground focus:rounded-md;
}
```

### 2. ✅ تحسين الجداول بـ ARIA Attributes
- **الحالة:** مُطبق بالكامل ✅
- **الملفات المُحدثة:**
  - `client/src/pages/shipping.tsx` - جدول مناطق التوصيل
  - `client/src/pages/guides-eco-friendly.tsx` - جدول معايير المياه
  - `client/src/components/cart/invoice-dialog.tsx` - جدول الفاتورة
  - `client/src/components/fish/fish-comparison-tool.tsx` - جدول المقارنة
  - `client/src/components/ui/table.tsx` - المكون الأساسي

**التحسينات المُضافة:**
```tsx
<table role="table" className="w-full">
  <caption className="sr-only">وصف الجدول</caption>
  <thead>
    <tr>
      <th scope="col">العمود 1</th>
      <th scope="col">العمود 2</th>
    </tr>
  </thead>
  <tbody>
    {/* table rows */}
  </tbody>
</table>
```

### 3. ✅ Custom Select Components
- **الحالة:** مُطبق بالفعل ✅
- **المكتبة المُستخدمة:** Radix UI (مُصممة للوصول الكامل)
- **الملف:** `client/src/components/ui/select.tsx`

**الميزات التلقائية من Radix UI:**
- ✅ `role="combobox"` على الـ trigger
- ✅ `aria-expanded` للحالة (مفتوح/مغلق)
- ✅ `aria-haspopup="listbox"`
- ✅ `role="listbox"` على المحتوى
- ✅ `role="option"` على العناصر
- ✅ `aria-selected` على العنصر المُختار
- ✅ دعم كامل للوحة المفاتيح

---

## التحسينات المُطبقة

### ✅ 1. ARIA Labels - الأساسيات

#### الأزرار التفاعلية
```tsx
// زر إضافة للسلة
<button
  onClick={addToCart}
  aria-label="إضافة المنتج إلى السلة"
>
  <ShoppingCart />
</button>

// زر الإعجاب
<button
  onClick={toggleWishlist}
  aria-label={isInWishlist ? "إزالة من المفضلة" : "إضافة للمفضلة"}
  aria-pressed={isInWishlist}
>
  <Heart />
</button>
```

#### النماذج
```tsx
<form>
  <label htmlFor="email" className="sr-only">
    البريد الإلكتروني
  </label>
  <input
    id="email"
    type="email"
    placeholder="أدخل بريدك الإلكتروني"
    aria-required="true"
    aria-invalid={errors.email ? "true" : "false"}
    aria-describedby={errors.email ? "email-error" : undefined}
  />
  {errors.email && (
    <span id="email-error" role="alert" className="text-red-600">
      {errors.email.message}
    </span>
  )}
</form>
```

### ✅ 2. Keyboard Navigation

#### التنقل باستخدام لوحة المفاتيح
- Tab: للانتقال للأمام
- Shift + Tab: للانتقال للخلف
- Enter/Space: لتفعيل الأزرار والروابط
- Esc: لإغلاق النوافذ المنبثقة

#### مثال على Dialog قابل للوصول
```tsx
<Dialog
  open={isOpen}
  onOpenChange={setIsOpen}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <DialogContent>
    <DialogTitle id="dialog-title">عنوان النافذة</DialogTitle>
    <DialogDescription id="dialog-description">
      وصف محتوى النافذة
    </DialogDescription>
    {/* محتوى النافذة */}
  </DialogContent>
</Dialog>
```

### ✅ 3. Color Contrast

#### نسب التباين المطلوبة
- نص عادي: 4.5:1 (WCAG AA)
- نص كبير (18pt+): 3:1
- عناصر UI: 3:1

#### الألوان المستخدمة
```css
/* ألوان AQUAVO مع تباين جيد */
--primary: #0ea5e9; /* Blue 500 */
--secondary: #22d3ee; /* Cyan 400 */
--accent: #06b6d4; /* Cyan 500 */
--text-primary: #1e293b; /* Slate 800 - تباين 12.6:1 */
--text-secondary: #475569; /* Slate 600 - تباين 7.1:1 */
```

### ✅ 4. Screen Reader Support

#### Landmarks (المعالم الدلالية)
```tsx
<body>
  <header role="banner">
    <nav aria-label="القائمة الرئيسية">
      {/* Navigation */}
    </nav>
  </header>

  <main role="main">
    {/* Main content */}
  </main>

  <aside role="complementary" aria-label="معلومات إضافية">
    {/* Sidebar */}
  </aside>

  <footer role="contentinfo">
    {/* Footer */}
  </footer>
</body>
```

#### Live Regions للإشعارات
```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>

<div
  role="alert"
  aria-live="assertive"
  className="sr-only"
>
  {errorMessage}
</div>
```

### ✅ 5. Focus Management

#### Focus Visible Styles
```css
/* تطبيق على جميع العناصر التفاعلية */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* إزالة outline الافتراضي عند استخدام الماوس فقط */
:focus:not(:focus-visible) {
  outline: none;
}
```

#### Focus Trapping في Modals
```tsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, [isOpen]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### ✅ 6. Images & Media

#### Alt Text للصور
```tsx
// صور معلوماتية
<img
  src={product.image}
  alt={`صورة المنتج ${product.name}`}
/>

// صور ديكورية
<img
  src="/decorative-pattern.svg"
  alt=""
  role="presentation"
/>

// Lazy Loading
<img
  src={product.image}
  alt={product.name}
  loading="lazy"
/>
```

### ✅ 7. Loading States

#### Skeleton Screens
```tsx
<div role="status" aria-live="polite" aria-label="جاري التحميل">
  <Skeleton className="h-48 w-full" />
  <span className="sr-only">جاري تحميل المحتوى...</span>
</div>
```

## التحسينات الموصى بها (للمستقبل)

### 🔄 1. إضافة Skip Links
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  تخطى إلى المحتوى الرئيسي
</a>
```

### 🔄 2. تحسين الجداول
```tsx
<table role="table">
  <caption>قائمة المنتجات</caption>
  <thead>
    <tr>
      <th scope="col">المنتج</th>
      <th scope="col">السعر</th>
      <th scope="col">الكمية</th>
    </tr>
  </thead>
  <tbody>
    {/* table rows */}
  </tbody>
</table>
```

### 🔄 3. Custom Select Components
```tsx
<div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
  <button
    aria-labelledby="select-label"
    aria-controls="select-options"
  >
    {selectedOption}
  </button>
  <ul
    id="select-options"
    role="listbox"
    aria-labelledby="select-label"
  >
    {options.map((option) => (
      <li
        key={option.id}
        role="option"
        aria-selected={option.id === selected}
      >
        {option.label}
      </li>
    ))}
  </ul>
</div>
```

## أدوات الاختبار

### تحقق من إمكانية الوصول
1. **Lighthouse** (Chrome DevTools)
   - افتح DevTools
   - اختر Lighthouse
   - اختر Accessibility
   - اضغط Generate Report

2. **axe DevTools** (Browser Extension)
   - ثبت الإضافة
   - افتح DevTools
   - اختر axe DevTools
   - اضغط Scan

3. **WAVE** (Browser Extension)
   - ثبت الإضافة
   - اضغط على الأيقونة
   - تحقق من الأخطاء والتحذيرات

### اختبار لوحة المفاتيح
- تنقل في الموقع باستخدام Tab فقط
- تأكد من إمكانية الوصول لجميع العناصر
- تحقق من وضوح Focus States

### اختبار Screen Readers
- **Windows**: NVDA (مجاني)
- **Mac**: VoiceOver (مدمج)
- **Mobile**: TalkBack (Android) / VoiceOver (iOS)

## المراجع والموارد

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## ملخص التحسينات المُطبقة في AQUAVO

✅ Error Boundaries لمنع الأعطال الكاملة
✅ Focus Management في Dialogs
✅ ARIA Labels في المكونات الأساسية
✅ Keyboard Navigation Support
✅ Screen Reader Compatible Components
✅ Color Contrast متوافق مع WCAG AA
✅ Loading States مع ARIA Live Regions
✅ Semantic HTML5 Elements

---

**تم التحديث:** 2025-12-20
**الحالة:** دليل شامل جاهز للتطبيق التدريجي

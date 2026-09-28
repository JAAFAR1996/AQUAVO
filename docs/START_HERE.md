# دليل البدء السريع - FIST-LIVE 🐟

## نظرة عامة على المشروع

FIST-LIVE هو متجر إلكتروني متكامل لمستلزمات أحواض الأسماك يتضمن:
- 🛒 واجهة متجر كاملة مع سلة تسوق
- 👤 نظام مستخدمين مع مصادقة
- 📊 لوحة تحكم للإدارة
- 📖 موسوعة أسماك شاملة
- ⭐ نظام مراجعات وتقييمات
- 🎫 نظام كوبونات خصم

---

## التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| **React 19** | واجهة المستخدم |
| **TypeScript** | type safety |
| **Vite** | Build tool |
| **Express** | Backend server |
| **PostgreSQL** | قاعدة البيانات (Neon) |
| **Drizzle ORM** | إدارة قاعدة البيانات |
| **TailwindCSS 4** | التنسيقات |
| **Radix UI** | مكونات UI |

---

## البدء السريع

### 1️⃣ استنساخ المشروع

```bash
git clone https://github.com/JAAFAR1996/FIST-LIVE.git
cd FIST-LIVE
```

### 2️⃣ تثبيت الاعتماديات

```bash
pnpm install
```

### 3️⃣ إعداد متغيرات البيئة

انسخ ملف المثال وعدّله:

```bash
cp .env.example .env.local
```

**المتغيرات المطلوبة:**

```env
# قاعدة البيانات (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# مفتاح الجلسة (لا تستخدم القيمة الافتراضية في الإنتاج!)
SESSION_SECRET=your-super-secret-key-here

# البريد الإلكتروني (Resend — لإعادة تعيين كلمة المرور والرسائل)
RESEND_API_KEY=your_resend_api_key
# يجب أن يكون من دومين موثّق في Resend
SMTP_FROM=AQUAVO <info@aquavoiq.com>
# حملات البريد الأسبوعية معطلة افتراضياً حتى يتم التحقق من القناة
EMAIL_CAMPAIGNS_ENABLED=false
SMTP_FROM=your_email@gmail.com
```

### 4️⃣ إعداد قاعدة البيانات

```bash
pnpm db:push
```

### 5️⃣ تشغيل الخادم

```bash
# وضع التطوير
pnpm dev

# الخادم يعمل على http://localhost:5000
```

---

## هيكل المشروع

```
FishWebClean/
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # مكونات UI
│   │   ├── pages/        # صفحات التطبيق
│   │   ├── hooks/        # Custom React hooks
│   │   └── data/         # بيانات ثابتة (أسماك، إلخ)
│   └── public/           # ملفات ثابتة
├── server/               # Backend Express
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── auth.ts           # Authentication
├── shared/               # مشترك بين frontend و backend
│   ├── schema.ts         # Database schema
│   └── mock-products.ts  # بيانات المنتجات
├── docs/                 # التوثيق
└── migrations/           # Database migrations
```

---

## الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `pnpm dev` | تشغيل خادم التطوير |
| `pnpm build` | بناء للإنتاج |
| `pnpm start` | تشغيل الإنتاج |
| `pnpm check` | فحص TypeScript |
| `pnpm db:push` | تطبيق تغييرات قاعدة البيانات |
| `pnpm test` | تشغيل الاختبارات |
| `pnpm admin:setup` | إعداد حساب المسؤول |

---

## الوثائق الإضافية

- 📋 [QUICK_FIX.md](./QUICK_FIX.md) - حلول المشاكل الشائعة
- 🔧 [DEBUG.md](./DEBUG.md) - دليل التصحيح والتشخيص
- 🔑 [ADMIN.md](./ADMIN.md) - دليل لوحة التحكم
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - دليل النشر
- 🐟 [FISH_ENCYCLOPEDIA.md](./FISH_ENCYCLOPEDIA.md) - دليل موسوعة الأسماك

---

## روابط مهمة

- 🌐 **الموقع**: https://fist-live.vercel.app
- 📂 **GitHub**: https://github.com/JAAFAR1996/FIST-LIVE
- 👤 **لوحة التحكم**: `/admin` (يتطلب تسجيل دخول مسؤول)

---

## الدعم

إذا واجهت مشاكل:
1. راجع [QUICK_FIX.md](./QUICK_FIX.md) للحلول السريعة
2. راجع [DEBUG.md](./DEBUG.md) للتشخيص المتقدم
3. افتح issue على GitHub

---

🎉 **مرحباً بك في FIST-LIVE!**

# دليل النشر - FISH WEB

هذا المشروع يدعم طريقتين للنشر:

## 🚀 طرق النشر

### 1. النشر على Vercel (Serverless)

#### الملفات المستخدمة:
- **`api/index.ts`** - نقطة الدخول الرئيسية للـ serverless function
- **`vercel.json`** - تكوين Vercel

#### كيف يعمل:
- يستخدم Vercel Serverless Functions
- كل request يشغّل function منفصلة
- مثالي للتوسع التلقائي (auto-scaling)
- الجلسات يجب أن تستخدم external store (Redis/PostgreSQL) لأن serverless functions لا تحتفظ بالذاكرة

#### الأوامر:
```bash
# النشر المباشر
vercel deploy

# النشر للإنتاج
vercel deploy --prod
```

#### ملاحظات مهمة:
- ⚠️ **لا تستخدم `memorystore`** في الإنتاج - استخدم Redis أو PostgreSQL session store
- Timeout محدد بـ 10 ثواني (قابل للتعديل في vercel.json)
- Memory محددة بـ 1024MB (قابلة للتعديل في vercel.json)

---

### 2. النشر التقليدي (Traditional Server)
> Requires Node.js 20+ when self-hosting (import.meta.dirname support).

#### الملفات المستخدمة:
- **`server/index.ts`** - Express server كامل يعمل بشكل مستمر
- **`dist/index.js`** - النسخة المبنية للإنتاج

#### كيف يعمل:
- Express server يعمل بشكل مستمر على VPS/Cloud server
- يحتفظ بالاتصال والذاكرة بين الطلبات
- مناسب للـ VPS، AWS EC2، DigitalOcean، Railway، Render، إلخ

#### الأوامر:
```bash
# البناء
pnpm build

# التشغيل في الإنتاج
pnpm start

# أو مع PM2
pm2 start dist/index.js --name fish-web

# التطوير المحلي
pnpm dev
```

#### ملاحظات مهمة:
- يمكن استخدام `memorystore` في بيئة single-instance
- للـ multi-instance deployment، استخدم Redis/PostgreSQL session store
- يحتاج process manager مثل PM2 للحفاظ على عمل السيرفر

---

## 📊 مقارنة بين الطريقتين

| الميزة | Vercel (Serverless) | Traditional Server |
|--------|---------------------|-------------------|
| **التوسع** | تلقائي | يدوي |
| **التكلفة** | Pay-per-request | ثابتة |
| **Cold Starts** | نعم | لا |
| **Session Store** | يجب أن يكون خارجي | يمكن استخدام الذاكرة |
| **WebSocket** | محدود | كامل الدعم |
| **Long Requests** | محدود (10-60s) | غير محدود |
| **مناسب لـ** | Traffic متقلب | Traffic ثابت |

---

## 🔧 التكوين المشترك

### متغيرات البيئة المطلوبة:

```bash
# Database
DATABASE_URL=postgresql://...

# Security
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

# Vite (client-side variables)
VITE_SITE_URL=https://your-domain.com
VITE_R2_PUBLIC_URL=https://your-r2-bucket.r2.dev
VITE_PLAUSIBLE_DOMAIN=your-domain.com
VITE_PLAUSIBLE_SCRIPT_URL=https://plausible.io/js/script.js
VITE_PWA_ENABLED=true
VITE_SHOW_INSTALL_PROMPT=true
VITE_OFFLINE_MODE_ENABLED=true

# Email
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=orders@your-domain.com
SUPPORT_EMAIL=support@your-domain.com

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
```

---

## 🎯 التوصيات

### استخدم Vercel إذا:
- ✅ لديك traffic متقلب (high peaks, low valleys)
- ✅ تريد توسع تلقائي
- ✅ لا تريد إدارة السيرفرات
- ✅ تستطيع استخدام external session store

### استخدم Traditional Server إذا:
- ✅ لديك traffic ثابت ومتوقع
- ✅ تحتاج WebSocket connections مستمرة
- ✅ تريد تحكم كامل في البيئة
- ✅ لديك long-running requests

---

## 🔄 الترحيل بين الطرق

### من Traditional إلى Vercel:
1. غيّر session store من memorystore إلى Redis/PostgreSQL
2. راجع أي long-running operations
3. اختبر cold start performance
4. نفّذ `vercel deploy`

### من Vercel إلى Traditional:
1. استخدم `pnpm build` لبناء المشروع
2. انشر `dist/` folder على السيرفر
3. شغّل `node dist/index.js`
4. استخدم PM2 أو systemd لإدارة العملية

---

## 📝 ملاحظات إضافية

- كلا الطريقتين يستخدمان نفس الكود في `server/routes.ts`
- Static files تُخدّم من `dist/public/`
- Database migrations تُنفّذ عبر `pnpm db:push`
- لا تنسى تحديث `VITE_*` variables عند تغيير الدومين

---

**آخر تحديث:** 2025-11-30



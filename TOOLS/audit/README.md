# 🔍 AQUAVO Website Audit Tool

أداة مستقلة لفحص موقع AQUAVO باستخدام GROQ AI

## 📋 المتطلبات

```bash
npm install
```

## 🚀 الاستخدام

```bash
# فحص كامل للموقع
npm run audit

# فحص منتج واحد
npm run audit:product -- --url "https://aquavo.vercel.app/products/xxx"
```

## ⚙️ الإعدادات

أنشئ ملف `.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
WEBSITE_URL=https://aquavo.vercel.app
EXCEL_PATH=./data/products.xlsx
```

## 📊 النتائج

التقرير يُحفظ في `./reports/audit_YYYY-MM-DD.md`

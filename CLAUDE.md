# 🧠 AQUAVO PROJECT MEMORY — CLAUDE.md
# هذا الملف هو "الدماغ" الرئيسي للمشروع — يُقرأ تلقائياً في كل جلسة

---

## 🏗️ ARCHITECTURE OVERVIEW

**Project:** AQUAVO — أحواض السمك والمعدات المائية (عراق 2026)
**Corpus:** `JAAFAR1996/AQUAVO`
**Workspace:** `C:\Users\jaafa\Desktop\upload\FishWebClean`
**Backend Pipeline:** `C:\Users\jaafa\Desktop\basarai\backend\`
**Stack:** Next.js 15 + TypeScript + Drizzle ORM + NEON PostgreSQL + Cloudflare R2

---

## 🎯 WHAT THIS PROJECT IS

AQUAVO هو متجر إلكتروني عراقي متخصص بأحواض السمك والمعدات المائية.
المشروع يحتوي على **جزأين** منفصلين:

### 1. الموقع الإلكتروني (`FishWebClean/`)
- **Frontend:** `client/` — React + Vite
- **Backend:** `server/` — Express + Drizzle
- **Database:** NEON PostgreSQL (remote)
- **Storage:** Cloudflare R2 (cloud)
- **Live URL:** aquavoiq.com

### 2. Content Engine (`basarai/backend/`)
- **Bot:** `telegram_content_bot.py` — توليد صور تسويقية عبر Telegram
- **Improver:** `improve_prompts.py` — يحسّن البرومبتات بـ Claude
- **Tagger:** `add_model_tags.py` — يضيف recommended_model لكل برومبت
- **Calendar:** `AQUAVO_CONTENT_CALENDAR.xlsx` — جدول النشر

---

## 📁 CRITICAL FILE PATHS

```
FishWebClean/
├── .agents/memory/         ← ملفات الميموري (هنا)
├── Launch_Ideas/promot/IMPROVED/   ← 80 برومبت محسّن (Weeks 1-4)
├── client/public/images/products/  ← صور المنتجات
└── server/db/              ← Drizzle schema

basarai/backend/
├── telegram_content_bot.py  ← Bot v3 (JSON Mode + Auto-Generate)
├── improve_prompts.py        ← AQUAVO Prompt Improvement Engine
├── add_model_tags.py         ← Model recommendation tagger
├── approved_content/         ← صور معتمدة منظّمة
└── completed_prompts.json    ← log التقدم
```

---

## 🛢️ DATABASE (NEON)

- **Connection:** `process.env.DATABASE_URL`
- **ORM:** Drizzle — دائماً استخدمه، لا raw SQL
- **Schema:** `server/db/schema.ts`
- **Key Tables:** `products`, `users`, `orders`, `provider_keys`, `brands`
- **provider_keys:** تخزن API keys للـ AI providers (vault_secret_id → Supabase vault)

---

## ☁️ CLOUDFLARE R2

- **Bucket:** `process.env.CLOUDFLARE_BUCKET_NAME`
- **CDN:** `process.env.CLOUDFLARE_CDN_URL`
- **Access:** AWS SDK S3 compatible
- **Max file:** 5MB — images only (jpg/png/webp/gif)

---

## 🤖 AI MODELS (Content Engine)

| Key | Model ID | Provider | Best For |
|-----|----------|----------|----------|
| `gpt2` | gpt-image-2 | openai | Product photography (primary) |
| `nano` | gemini-2.5-flash-image | gemini | Fast drafts, CTA slides |
| `dalle` | dall-e-3 | openai | Artistic compositions |
| `gpt1` | gpt-image-1 | openai | Fallback |

**Rule:** كل برومبت عنده `generation_settings.recommended_model` — استخدمه تلقائياً.

---

## 🎨 BRAND IDENTITY (Dark Premium)

```
Background:  #0a1628 (Deep Ocean) / #010611 (Abyss)
Primary:     #199bb8 (AQUAVO Cyan)
Accent:      #ff7b5a (Coral)  
Gold:        #ffd700 (Warm Gold)
Lighting:    Warm Amber 2700-3200K (NOT cold blue!)
Film Grain:  5-8%
Camera:      Canon R5 / Hasselblad X2D, 85mm, f/2.0-2.8
```

---

## 🗣️ BRAND VOICE

- **Language:** لهجة بغدادية خالصة (مو فصحى، مو خليجي)
- **Emoji:** صفر — ممنوع تماماً
- **Tone:** خبير واثق، مو بايع
- **CTA:** "متوفر الآن — aquavoiq.com"
- **Key words:** "هسه" (مو "الحالي") | "زحمة" (مو "فوضى")

---

## 📅 CONTENT CALENDAR STATUS

| Week | Theme | Prompts | Status |
|------|-------|---------|--------|
| Week 1 | التأسيس والحماية — 16 منتج | 7 | ✅ IMPROVED |
| Week 2 | البيئة البايولوجية | 19 | ✅ IMPROVED |
| Week 3 | التغذية الاحترافية والفحوصات | 18 | ✅ IMPROVED |
| Week 4 | المعدات والأحواض والتكاثر | 18 | ✅ IMPROVED |

**Total:** 62 prompts improved | **Completed:** 0 images generated
---

## ⚠️ CRITICAL RULES (NEVER VIOLATE)

1. **Database = NEON only** — لا local، لا SQLite
2. **Files = Cloudflare R2 only** — لا local storage
3. **TypeScript strict** — لا `any` أبداً
4. **Drizzle ORM** — لا raw SQL
5. **Zod validation** — كل input يُvalidate
6. **Baghdad dialect** — في كل النصوص العربية
7. **Zero emoji** — في كل محتوى AQUAVO
8. **`recommended_model`** — استخدمه تلقائياً في Auto-Generate

---

## 🔗 QUICK REFERENCES

- Brand Identity: `.agents/memory/02_brand_identity.md`
- Products Map: `.agents/memory/03_products_map.md`
- Decisions Log: `.agents/memory/04_decisions_log.md`
- Content Engine: `.agents/memory/05_content_engine.md`
- Psychology Framework: `.agents/memory/06_psychology_framework.md`

> **Last Updated:** 2026-05-01 02:54 | Prompts: 62 | Completed: 0

# 📋 Architecture Decisions Log — Layer 4 Memory
# كل قرار مهم يُسجَّل هنا مع السبب — لا تُكرر نفس النقاشات

---

## [2026-04-27] Database: NEON PostgreSQL (Remote)

**Decision:** استخدام NEON PostgreSQL فقط — ممنوع local SQLite أو MySQL  
**Why:** المشروع cloud-first، يحتاج يشتغل على Vercel بدون state محلي  
**Impact:** كل DB operations عبر `process.env.DATABASE_URL`  
**ORM:** Drizzle — parameterized queries فقط، لا raw SQL  

---

## [2026-04-27] Storage: Cloudflare R2

**Decision:** كل الملفات على Cloudflare R2 — ممنوع local storage  
**Why:** Vercel serverless = لا persistent disk، R2 يعطي CDN مجاني  
**Config:** AWS SDK S3-compatible API  
**Validation:** Max 5MB، images only (jpg/png/webp/gif)  

---

## [2026-04-27] Email: Resend API (not nodemailer/SMTP)

**Decision:** مهاجرة من nodemailer إلى Resend API  
**Why:** nodemailer يحتاج SMTP server، Resend أبسط + أموثوق للـ serverless  
**Status:** ✅ مكتمل

---

## [2026-04-28] Brand Voice: Baghdad Dialect + Zero Emoji

**Decision:** لهجة بغدادية خالصة، صفر إيموجي، نبرة خبير  
**Why:** السوق العراقي يرفض الخليجي والفصحى كنبرة تسويقية  
**Key fixes:** "هسه" (مو "الحالي") | "زحمة" (مو "فوضى") | "وشاركه ويا" (مو "ووديه")

---

## [2026-04-28] TikTok Pixel: Deferred Loading

**Decision:** تحميل TikTok Pixel بعد hydration (not blocking)  
**Why:** كان يسبب render-blocking ويضر Lighthouse score  
**Pattern:** `useEffect` + `requestIdleCallback` للتحميل المؤجل  

---

## [2026-04-29] Image Models: GPT Image 2 as Primary

**Decision:** gpt-image-2 هو الموديل الرئيسي لكل product photography  
**Why:** أفضل photorealism + product accuracy من DALL-E 3 و Gemini  
**Fallback:** gemini-2.5-flash-image للـ CTA slides والمسودات السريعة  
**Quality tiers:** high (product shots) | medium (stories) | low (drafts)  

---

## [2026-04-29] Prompt Engine: Claude as Improver

**Decision:** استخدام Claude Opus 4 لتحسين كل برومبت  
**Why:** يفهم السياق البغدادي والهوية البصرية بشكل أفضل  
**Output:** كل برومبت محسّن يحتوي 7 حقول إضافية (SEO + psychology + music)  
**Status:** ✅ Week 1-4 كاملة (80 prompts)  

---

## [2026-04-30] Bot v3: JSON Mode + Auto-Generate

**Decision:** إضافة JSON Mode يقرأ من IMPROVED files مباشرة  
**Why:** Excel كان محدود — JSON يحتوي psychology + SEO + model recommendations  
**Key feature:** `jauto` callback يقرأ الموديل من `generation_settings` تلقائياً  
**Screens:** Home → JSON Home → Week → Day → Prompt Detail → Auto-Generate  

---

## [2026-05-01] Memory System: Multi-Layer CLAUDE.md

**Decision:** بناء نظام ميموري متعدد الطبقات في `.agents/memory/`  
**Why:** كل جلسة كانت تبدأ من صفر — ضياع وقت في شرح السياق  
**Structure:**
- `CLAUDE.md` → الدماغ الرئيسي (يُقرأ تلقائياً)
- `02_brand_identity.md` → هوية البراند
- `03_products_map.md` → خارطة المنتجات  
- `04_decisions_log.md` → هذا الملف
- `05_content_engine.md` → محرك المحتوى
- `06_psychology_framework.md` → الإطار النفسي

---

---

## [2026-05-01] Bug Fix: text_overlay Type Crash

**Bug:** `'str' object has no attribute 'items'` in `screen_json_detail()`  
**Root Cause:** Some week JSON files store `text_overlay` as a plain string; others use a dict  
**Fix:** Added `isinstance()` check — handles both `str` and `dict` safely  
**File:** `basarai/backend/telegram_content_bot.py` line ~593  
**Prevention:** Always guard `.items()` calls with `isinstance(x, dict)` check  

---

## 📌 OPEN DECISIONS (قيد النقاش)

- [ ] هل نضيف Week 5 للمحتوى؟ (موضوع مقترح: السمك النادر)
- [ ] Instagram Auto-Publishing — هل نفعّل `instagram_publisher.py`؟
- [ ] هل نبني واجهة ويب للـ Content Engine بدل Telegram?
- [ ] A/B testing بين الموديلات (gpt2 vs nano) على نفس البرومبت

---

## ✅ COMPLETED MILESTONES
- [x] [2026-05-01] Added Week 4 prompts (18 prompts)
- [x] [2026-05-01] Memory System built (6 layers, auto-updater script)
- [x] [2026-05-01] Bug Fix: text_overlay 'str' crash in Bot v3 detail screen
- [x] NEON DB integration + Drizzle schema
- [x] Cloudflare R2 file upload
- [x] TikTok Pixel integration
- [x] AQUAVO Brand Identity System v1
- [x] Content Calendar (4 weeks, 62 prompts improved)
- [x] Prompt Improvement Engine (Claude Opus 4)
- [x] Model Tagging (generation_settings on every prompt)
- [x] Telegram Bot v3 (JSON Mode + Auto-Generate + jauto callback)
- [x] Memory System + Auto-Updater (`update_memory.py`)

---

## 🐛 KNOWN BUGS & GOTCHAS

| Bug | Status | Fix |
|-----|--------|-----|
| `text_overlay` can be str OR dict | ✅ Fixed 2026-05-01 | `isinstance()` guard |
| UnicodeEncodeError on Windows with Arabic | ✅ Fixed | `PYTHONIOENCODING=utf-8` |
| Week 1 only has 7 prompts (not 25) | ⚠️ Known | JSON meta shows 7 — needs expand |

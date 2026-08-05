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

## 📐 AUTHORITATIVE IDENTITY SOURCE

**The AQUAVO Master Identity System v2 is the single source of truth for colour,
typography, logo, Visual DNA, and permitted claims. This file is subordinate to it.**

Archive: `AQUAVO_Final_Master_Identity_System_v2.zip`

Authoritative documents (nine):

| Path in archive | Governs |
|---|---|
| `01_Brand_Foundation/AQUAVO_Brand_Foundation_v2.md` | positioning, personality, tone, red lines |
| `02_Legal_Brand_Usage/AQUAVO_Legal_Brand_Usage_Guide_v2.md` | the three names, approved + banned claims, contacts |
| `03_Logo_System/AQUAVO_Logo_Usage_Guide_v2.md` | logo versions, clear space, 120px minimum |
| `04_Color_System/AQUAVO_Master_Color_Tokens_v2.css` | **the one official colour system** |
| `05_Typography_System/AQUAVO_Master_Typography_Tokens_v2.css` | **the one official type system** |
| `06_Visual_DNA/AQUAVO_Visual_DNA_System_v2.md` | Clean Proof / Dark Authority, spacing, motion |
| `06_Visual_DNA/AQUAVO_Visual_DNA_Tokens_v2.css` | Proof Window, Waterline, Category Bands |
| `11_Ecommerce_System/AQUAVO_Ecommerce_Visual_Rules_v2.md` | product hero order, trust badges, mobile-first |
| `13_Validation/AQUAVO_Final_Validation_Report_v2.md` | what was re-tested |

**Rules of precedence**
1. If this file and a v2 document disagree, **the v2 document wins** — then fix this file.
2. `15_Archive/` is **never** an implementation source. Do not restore colours, fonts,
   components, or concepts from it.
3. No new colour, font, radius, shadow, motion curve, or customer-facing claim enters
   `client/src` unless it already exists in a v2 token file, or the owner has approved it
   and it is recorded here.
4. Token load order is mandated: colour → typography → Visual DNA.

---

## 🎨 BRAND IDENTITY — v2 APPROVED TOKENS

**Storefront / product / document surfaces (Clean Proof is the default).**

```
Primary teal:      #0B93A6   hsl(187 88% 35%)   brand mark, large headlines, CTAs
Primary dark:      #075F6B   hsl(187 88% 22%)   small text needing AA on light bg
Clean Light bg:    #F6F4EF   hsl(43 28% 95%)    DEFAULT page background
Deep Aquatic bg:   #0B1E28   hsl(201 57% 10%)   Dark Authority — see mode rule below
White:             #FFFFFF                     card / Proof Window surfaces ONLY
Text dark:         #232323   on light — 14.30:1
Text muted:        #6B6B6B   on light —  4.85:1
Text on dark:      #FFFFFF   on dark  — 17.07:1
Border:            #DDD8CE   hsl(40 18% 84%)
Warning:           #C97A2E   real warnings only, 18pt+/bold (3.03:1)
Substrate family:  #C9AE8C   icon/accent ONLY — never text (1.93:1, fails WCAG)
FlowLine family:   #0B64A6   hsl(206 88% 35%)  — see FlowLine rule below
```

### ⛔ ARCHIVED COLOURS — NOT PRODUCTION TOKENS

**`#199BB8` (cyan), `#FF7B5A` (coral), `#FFD700` (amber/gold), `#0a1628`, `#010611`
are ARCHIVED and were NEVER ADOPTED.** They come from a separate, unapproved
exploratory system (`15_Archive/unapproved_parallel_system_2026-07-07`). They were never
checked against the owner-approved brief, they introduce colours with no documented
rationale, and they conflict with the real locked primary.

Per `04_Color_System/AQUAVO_Master_Color_Tokens_v2.css`: *"do not merge into production."*

Do not reintroduce them in code, content, prompts, JSON-LD, or generated imagery.
Note `#0a1628` is **not** `#0B1E28` — the correct dark background is `#0B1E28`.

### 🔵 FLOWLINE RULE

**`#0B64A6` is the FlowLine product-family colour** (air tubes, air stones, check valves)
— hue-shifted +18° from the primary so that family owns its own real sub-brand colour.

**It must never replace the global primary `#0B93A6`.** Each family owns one colour and
no family ever borrows another's. FlowLine blue is permitted only on FlowLine-family
surfaces and Category Bands — never as `--primary`, never as the site-wide accent.
As text it is safe on light (5.64:1) but fails on dark (2.75:1 — accent/icon only there).

### 🌓 CLEAN PROOF vs DARK AUTHORITY

- **Clean Proof** (`#F6F4EF`) — the transactional register. Default for product pages,
  packaging, invoices, and anything trusted at the moment of purchase.
- **Dark Authority** (`#0B1E28`) — the brand-voice register. Permitted for social media,
  **educational content (including guide pages)**, and brand-voice communication.
  **Never** packaging, invoices, or legally-weighted documents.
- Exactly **three** approved backgrounds exist. Pure `#FFFFFF` is a card/Proof-Window
  surface, **not** a page background.

---

## 📸 CONTENT-ENGINE IMAGE DIRECTION (marketing imagery only)

Scope: generated marketing/social imagery produced by the Telegram content bot.
**These are not storefront UI tokens and must not be applied to site chrome.**

```
Lighting:    Warm Amber 2700-3200K (NOT cold blue!)
Film Grain:  5-8%
Camera:      Canon R5 / Hasselblad X2D, 85mm, f/2.0-2.8
```

Colour in generated imagery still uses the v2 approved palette above — never the
archived cyan/coral/amber.

---

## ✅ OWNER-APPROVED COMMERCIAL CLAIMS

**Status: FINAL — approved by the owner 2026-08-05.** These are the permitted
customer-facing service claims, in addition to the claim lines in
`02_Legal_Brand_Usage/AQUAVO_Legal_Brand_Usage_Guide_v2.md`.

| # | Approved claim (use verbatim) |
|---|---|
| 1 | `التوصيل خلال 24 ساعة إلى جميع المحافظات العراقية` |
| 2 | `الدعم متوفر 24/7` |
| 3 | `الرد خلال 24 ساعة إذا وصل المنتج تالف` |
| 4 | `الدفع عند الاستلام` (COD — carried forward, already approved) |
| 5 | `مختار ومفحوص ومعبأ بواسطة AQUAVO` (Checked & Packed — already approved) |

### Official support email

```
INFO@AQUAVOIQ.COM
```

**Owner-approved and authoritative.** This supersedes the `Info@aquavo.com` value in
`02_Legal_Brand_Usage/AQUAVO_Legal_Brand_Usage_Guide_v2.md` §"Official contact details",
which is a domain error in that document. The correct domain is **aquavoiq.com** — the
same domain as the website. The archive document should be corrected to match.

Other official contacts (unchanged, real, and answered):

| Channel | Detail |
|---|---|
| Phone / WhatsApp | `07747880673` (published as `+964 774 788 0673`) |
| Website | `aquavoiq.com` |
| Instagram / Facebook | `aquavo_iq` |

### Claim discipline

- Publish a claim **only** if it appears above or in the v2 legal guide. No invented claims.
- Never: `Manufactured by AQUAVO`, `Safe for all fish`, `100% Natural`, `Certified`,
  `Lab tested`, `Chemical-free`, `®`, `Al-Manbaa Store` (correct name is `AL NABEA SHOP`),
  or any live-organism implication.
- A badge graphic implying certification is as much a false claim as the text would be.
- To add a claim: owner approval first, recorded here **and** in the v2 legal guide.

---

## 🖼️ PRODUCT VISUAL POLICY

**Status: FINAL — approved by the owner 2026-08-05.**

- **Keep real product photography on transactional pages** (product cards, PDP hero,
  catalogue). The real product image is the default and must not be replaced.
- **Technical diagrams may support the product** — installation steps, dimension
  callouts, feature-proof rows — but must **not** replace the real product image by default.
- This is an explicit owner decision that **overrides** the non-photographic default in
  `06_Visual_DNA` §6 and `11_Ecommerce_System` "Product image rules" for transactional
  surfaces. Those documents already treat photography as permitted-and-optional
  (`06_Visual_DNA` §13), so this is a scoping decision, not a conflict.
- Still prohibited: images that pretend to be photographic evidence they are not —
  AI-generated imagery made to look like a real product photo, and generic stock photos
  standing in for a real one. Remove those wherever found.
- If real photography is used, `06_Visual_DNA` §13 applies: no filters, no preset LUTs
  beyond light white-balance correction, `#F6F4EF` background for product-alone shots,
  freshwater tank context only for lifestyle shots, never a coral/marine backdrop.

---

## 🚫 SUCCESS / STOCK COLOUR RULE

**Status: FINAL — approved by the owner 2026-08-05.**

**Do not introduce an unapproved green success token.** No `--aqv-success` exists in the
approved system; the `#3E8E5A` candidate in `04_Color_System` is a **proposal only** and
is not approved for production.

Until the owner explicitly approves a success colour, express stock and confirmation
states using approved tokens only:

| State | Use |
|---|---|
| In stock / available | `#232323` text-dark, or `#6B6B6B` text-muted |
| Low stock | `#C97A2E` warning — 18pt+/bold or icon only (3.03:1) |
| Out of stock | typographic + disabled control — **not** a colour signal |
| Order confirmed | `#0B93A6` primary, or neutral text |

Raw Tailwind `green-*` / `emerald-*` are **not** approved tokens. Same rule for reds:
use `--destructive` / `#C97A2E`, never raw `red-*`.

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

## 🐟 WHAT AQUAVO DOES NOT SELL

**CRITICAL for SEO, content, and JSON-LD:**
- NO live fish, NO live animals, NO water plants
- Valid categories: filters, heaters, food, decor, tanks, lighting, water treatment
- Any content mentioning "أسماك حية" or "نباتات مائية" is WRONG — fix immediately
- **Payment:** Cash on Delivery ONLY (no payment gateway is currently enabled — do not imply credit cards)
- **Shipping:** 5,000 IQD flat fee across Iraq
- **Delivery, support, and damaged-order claims:** use the exact approved wording in
  "OWNER-APPROVED COMMERCIAL CLAIMS" above — do not paraphrase, and do not contradict
  the 24/7 support claim with restrictive opening hours in copy or JSON-LD

---

## ⚡ SERVER-SIDE GOTCHAS (bugs fixed 2026-05)

- **BigInt safety:** Drizzle + Neon can return BigInt/Decimal — always sanitize before `res.json()`:
  ```ts
  JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === "bigint" ? Number(v) : v))
  ```
- **req.body null-check:** sendBeacon without Content-Type leaves `req.body` undefined. Always:
  ```ts
  const { x } = (req.body ?? {}) as { x?: string }
  ```
- **OG images must be absolute:** Product images are stored as relative `/images/...` paths.
  In `ssr-meta.ts`: `rawImage.startsWith("http") ? rawImage : \`${BASE}${rawImage}\``
- **Top-selling must filter:** Add `gt(products.stock, 0)` to Drizzle query + in-memory `parseFloat(price) > 0`
- **Cart suggestions fallback:** Co-purchase data is sparse early on — always fallback to `getTrendingProducts()`
- **VetRAG in serverless:** Embeddings reset per cold start — keyword search is the reliable path

---

## 🔍 SEO RULES (ssr-meta.ts is the source of truth)

- `api/ssr-meta.ts` controls ALL meta tags, JSON-LD, and OG for every page — edit there first
- Meta description truncation: `rawDesc.slice(0, rawDesc.lastIndexOf(" ", 155)) + "..."`
- JSON-LD must never include fish or plants in product ItemList or business description
- OG images: always build absolute URL before returning from ssr-meta.ts

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

## 📢 AQUAVO CONTENT ENGINE REFERENCES

For content, reels, stories, carousels, campaign planning, and social media strategy, always reference:

- `.agents/memory/07_hooks_2026.md` — 8 hook types, 3-second formula, algorithm signals, Iraqi dialect rules
- `.agents/memory/08_design_text_effects_2026.md` — color palette, typography, safe zone, 8 text effects, cinematic grade
- `.agents/memory/09_weekly_calendar_2026.md` — TOFU/MOFU/BOFU, weekly model, batch creation, metrics
- `.agents/memory/10_platform_psychology_2026.md` — 12 psychological triggers, buying journey, color psychology, shareability

**Content Rules:**
- Use these files as internal operating principles — not as public claims
- Numbers and percentages in these files are internal design guidelines — do not publish as verified facts without a cited source
- Keep AQUAVO tone: premium Iraqi/Baghdadi, no emojis, no pushy CTA, no fake urgency, no invented specs or prices
- Scarcity and FOMO: only use when the condition is real and true

---

## 🔗 QUICK REFERENCES

- Brand Identity: `.agents/memory/02_brand_identity.md`
- Products Map: `.agents/memory/03_products_map.md`
- Decisions Log: `.agents/memory/04_decisions_log.md`
- Content Engine: `.agents/memory/05_content_engine.md`
- Psychology Framework: `.agents/memory/06_psychology_framework.md`

> **Last Updated:** 2026-05-16 | Prompts: 62 | Completed: 0

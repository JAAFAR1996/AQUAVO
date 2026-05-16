# دليل التصميم + Text Effects 2026 — AQUAVO
## مبدأ تشغيلي داخلي | آخر تحديث: مايو 2026

---

## المبادئ الأساسية

### قاعدة الـ 3 ثوانٍ — Road Sign Rule
كل تصميم = لوحة إعلان على طريق سريع.
**فكرة واحدة فقط لكل تصميم** — لا مساومة.

### التسلسل البصري (Visual Hierarchy)
```
المستوى 1 → HOOK TEXT  (الأكبر + الأجرأ)
المستوى 2 → الصورة الرئيسية / المنتج
المستوى 3 → النص الثانوي (أصغر)
المستوى 4 → CTA / الشعار
```

### قاعدة الـ 3-2-1
- 3 ألوان أقصى
- 2 خطوط أقصى
- 1 فكرة رئيسية فقط

---

## لوحة الألوان الرسمية AQUAVO

| الاسم | الكود | الاستخدام |
|-------|-------|-----------|
| AQUAVO Primary | #199bb8 | الشعار + CTA |
| Deep Ocean Background | #0a1a2e | خلفية الريلزات |
| Warm Amber Accent | #f5a832 | تمييز النص المهم |
| AQUAVO Gold | #ffd700 | أرقام + إحصائيات |
| Pure White | #ffffff | نص على خلفيات داكنة |
| Soft White | #f0f8ff | نص ثانوي |

### Color Grade للفيديو
```
Shadows:    Teal-Cyan #1a3a4a
Highlights: Warm Amber #f5a832
Saturation: +15
Contrast:   +15
Film Grain: 5%
```

---

## Typography — الخطوط

| الخط | الاستخدام |
|------|-----------|
| **Changa Bold** | عناوين + هوكات |
| **Cairo** | نصوص طويلة + captions |
| **Lalezar** | أرقام + إحصائيات |

### قواعد العربي — لا تُكسر أبداً
- لا Letter-Spacing — يكسر اتصال الحروف العربية
- Line-height: 1.5 للنصوص
- النص يحاذى لليمين دائماً
- لا تمزج خطين عربيين بنفس الـ weight

### حجم النص (9:16 — 1080x1920)
| العنصر | الحجم الأدنى |
|--------|-------------|
| هوك رئيسي | 80-120px |
| نص ثانوي | 48-64px |
| caption صغير | 32px |
| الحد الأدنى المطلق | 28px |

---

## الـ Safe Zone (1080x1920)

```
┌─────────────────────────────┐
│  AVOID ── Top 15%           │  ← نوتيفيكيشن + status bar
├─────────────────────────────┤
│                             │
│   SAFE ZONE                 │
│   المنتصف 60%               │
│                             │
├─────────────────────────────┤
│  AVOID ── Bottom 25%        │  ← Caption + Like + Share + Follow
└─────────────────────────────┘
```

كل النصوص المهمة والهوك يكونون داخل الـ Safe Zone فقط.

---

## الـ 8 Text Effects المثبتة 2026

### Effect 1: Word-by-Word Reveal — الأقوى للهوكات
كل كلمة تظهر لوحدها بتوقيت الصوت بالضبط.
```
CapCut: Text → Animation → In → Typewriter / Fade Up
Duration: 0.3 ثانية لكل كلمة
```

### Effect 2: Bounce Text — للأرقام والإحصائيات
```
CapCut: Animation → In → Bounce
Duration: 0.4 ثانية
يدوياً: Scale 0% → 120% → 100%
```

### Effect 3: Glow / Neon Text — للـ CTA
```
CapCut: Text → Style → Glow
لون الـ Glow: Amber #f5a832
Intensity: 70-80%
```

### Effect 4: Text Behind Subject
```
CapCut: فيديو → Cutout → Smart Cutout
ضع النص تحت layer الشخص/المنتج
```

### Effect 5: Kinetic Typography
- كل نقطة إيقاع = كلمة تظهر أو تتحرك
- Motion Blur: 360° shutter angle
- Ease In/Out: دائماً

### Effect 6: Outline Text فقط
```
Canva: Text → Style → Stroke
لون الـ Stroke: #ffffff أو #ffd700
Fill: شفاف (0%)
```

### Effect 7: Scale Pop — للـ REVEAL
```
Frame 1: Scale 30%  + Opacity 0%
Frame 2: Scale 110% + Opacity 100%
Frame 3: Scale 100%
Duration: 0.3 ثانية
```

### Effect 8: Gradient Text
```
Canva: Text → Effects → Background Gradient
من: #199bb8
إلى: #f5a832
```

---

## Dark Cinematic AQUAVO

### الخلفية المثالية
- لون: `#0a1a2e` — مو أسود خالص
- إضاءة: ضوء الحوض فقط / Side lighting 45°
- درجة حرارة الضوء: Warm Amber 2700-3200K — ليس أزرق بارد

### Color Grade التفصيلي (CapCut)
```
Brightness:  -5 to -10
Contrast:    +15
Saturation:  +10
Highlights:  اسحب نحو Warm (+20 Orange)
Shadows:     اسحب نحو Cool (-20 Teal)
Vignette:    +20
Film Grain:  5-8%
```

---

## الأدوات

| الأداة | الاستخدام | الـ Effect الأفضل |
|--------|-----------|------------------|
| **CapCut** | كل ريلزات AQUAVO | Word-by-Word + Bounce + Glow |
| **Canva** | Carousels + Stories | Gradient Text + Outline |
| **Adobe Premiere** | مونتاج احترافي | Color Grade |
| **Lightroom** | تعديل صور المنتجات | Color Grade Cinematic |

---

## ترندات 2026

**HOT — استخدم:**
- Imperfect Authenticity (Film grain + خطوط يدوية)
- Dark Glassmorphism
- Text Behind Subject
- Kinetic Typography
- 3D Type للإحصائيات

**تجنب:**
- خلفيات بيضاء خالصة
- نصوص رفيعة على خلفيات ملونة
- أكثر من 3 ألوان متشبعة
- صور Stock Photo مصطنعة

---

## ورقة الغرف — ملخص سريع

```
تصميم الهوك:
خط: Changa Bold | حجم: 80-100px | لون: #ffffff أو #ffd700
Effect: Word-by-Word أو Bounce
موضع: المنتصف العلوي (داخل Safe Zone)

خلفية الريلز:
لون: #0a1a2e | إضاءة: Warm Amber فقط
Color Grade: Teal Shadows + Amber Highlights | Film Grain: 5%

الـ CTA:
خط: Cairo Bold | لون: #f5a832 (Amber)
Effect: Glow أو Scale Pop
موضع: المنتصف (داخل Safe Zone)
```

**القاعدة:** كل ريل يبدأ بـ Color Grade Cinematic + خط Changa للهوك.
توحيد التصميم يبني brand recognition ويزيد watch time.

# P3 — سخان ستيل مدرّع — سكربت CapCut الكامل

> **المنتج:** YEE Armored Stainless Steel Heater
> **المدة:** 16 ثانية | **الدقة:** 1080×1920 (9:16)
> **الاستبقاء المستهدف:** 92%+
> **الجمالية:** Documentary Drama + Safety Reveal

---

## 1. الخطوط المعتمدة

### الخط الرئيسي: Cairo Bold
- **لماذا:** خط عربي جيومتري صلب يعكس المتانة والقوة (مناسب جداً لتيمة "الستيل المدرع" والأمان)، مقروئية عالية للتحذيرات.
- **الاستخدام:** العناوين الرئيسية + Hook التحذيري + CTA
- **الوزن:** Bold (700) أو ExtraBold (800)
- **التحميل:** [Google Fonts — Cairo](https://fonts.google.com/specimen/Cairo)

### الخط الثانوي: Tajawal Regular
- **لماذا:** خط نظيف وعملي يوازن قوة Cairo، يعطي إحساساً هندسياً دقيقاً يليق بالمواصفات التقنية (ستانلس 304، نيكل-كروم).
- **الاستخدام:** النصوص الثانوية + المواصفات التقنية
- **الوزن:** Regular (400) أو Medium (500)
- **التحميل:** [Google Fonts — Tajawal](https://fonts.google.com/specimen/Tajawal)

### خط البراند: Inter Medium
- **لماذا:** للنص الإنجليزي فقط (AQUAVO + aquavoiq.com)
- **الوزن:** Medium (500)

> [!IMPORTANT]
> **قاعدة RTL:** كل النصوص العربية → محاذاة يمين. اكتب النص في Notes أولاً ثم الصقه في CapCut.

---

## 2. لوحة الألوان (P3)

| العنصر | HEX | الاستخدام |
|--------|-----|-----------|
| نص رئيسي أبيض | `#FFFFFF` | العناوين والمواصفات (وضوح عالي) |
| أحمر تحذيري | `#DC143C` | كلمات الخطر (قنبلة، صدمة، تدفع الثمن) |
| نص ذهبي | `#FFD700` | CTA + عبارات الحماية والأمان |
| ظل النص | `#000000CC` | Drop Shadow خلف كل نص (للفصل عن الخلفية المظلمة) |
| Stroke | `#00000099` | حدود الحروف 2px |

---

## 3. Safe Zone — المنطقة الآمنة

```text
0-250px (13%) ← DANGER: UI المنصة
537px (28%)   ← بداية المنطقة الآمنة
1305px (68%)  ← نهاية المنطقة الآمنة
1500-1920px   ← DANGER: أزرار التفاعل
هامش أيمن: 170px واضح (للقراءة RTL)
هامش أيسر: 50px واضح
```

---

## 4. مواصفات النص والأنيميشن

### الظل والحدود (على كل نص بدون استثناء)
- **Drop Shadow:** اتجاه 135° | مسافة 3px | blur 6px | `#000000CC`
- **Stroke:** 2px | `#00000099`

### أحجام الخطوط

| النوع | الحجم | الوزن | الخط |
|-------|-------|-------|------|
| Hook التحذيري | 54pt | Bold | Cairo |
| نص الخطر (أحمر) | 46pt | Bold | Cairo |
| المنقذ (ذهبي) | 50pt | Bold | Cairo |
| مواصفات تقنية | 46pt | Medium | Tajawal |
| CTA النهائي | 54pt | Bold | Cairo |
| AQUAVO | 54pt | Medium | Inter |

---

## 5. برومبتات توليد الصور (Nano Banana)
*(تم دمج تعليمات الكتابة داخل البرومبت بترتيب دقيق لتسهيل توليد النص العربي مع الصورة مباشرة إذا لم يُستخدم CapCut)*

### الصورة 1: الخطر (F1)
```text
Dramatic forensic-style photograph of a shattered glass aquarium heater on a dark surface. Broken glass fragments scattered in a pattern, each catching cold red warning light. The glass pieces are sharp and dangerous-looking. Behind the broken heater: a blurred aquarium with two magnificent bright orange-red Discus fish (Symphysodon) swimming nervously, their round bodies and flowing fins showing stress. The mood is ominous — a disaster waiting to happen. Cold blue-gray lighting with red accent spots. Dark dramatic background. Shot on Canon R5, 50mm lens, f/2.8. Forensic photography style. Vertical 9:16. Center band (30%-65%) left as dark space.

[TEXT OVERLAY INSTRUCTIONS]
Please perfectly render the following Arabic text in the center empty space (30%-65%). The typography must be flawless, right-aligned (RTL) but geometrically centered in the frame. Follow these exact styling rules:
- Font Family: 'Cairo' (Geometric Sans-Serif)
- Style: Crisp, sharp edges with a subtle black drop shadow (135°, 60% opacity) for depth.

1. "السخان القزاز قنبلة موقوتة بحوضك"
   (Size: 54pt, Weight: ExtraBold, Color: Pure White #FFFFFF, Position: Y=30%)
2. "يطق بأي صدمة — وأسماكك تدفع الثمن"
   (Size: 46pt, Weight: Bold, Color: Crimson Red #DC143C, Position: Y=44%)
3. "الستيل المدرّع — مستحيل ينكسر"
   (Size: 50pt, Weight: ExtraBold, Color: Gold #FFD700, Position: Y=57%)
```

### الصورة 2: المُنقذ (F2)
```text
Heroic product photograph of the YEE Armored Stainless Steel Heater. The heater stands vertically center-frame, gleaming under warm golden directional lighting from above. Thick stainless steel 304 body reflects light like polished armor. Camera angle is slightly low — looking UP at the heater — making it feel powerful and protective. In the background: a planted aquarium with two magnificent bright orange-red Discus fish swimming calmly and confidently. Lush green plants (Echinodorus and Anubias). Crystal clear water. The mood is: absolute protection, engineering excellence, quiet power. Shot on Hasselblad X2D, 85mm lens, f/2.0. Premium product photography. Vertical 9:16. Center band left as dark space.

[TEXT OVERLAY INSTRUCTIONS]
Please perfectly render the following Arabic text in the center empty space (30%-65%). The typography must be flawless, right-aligned (RTL) but geometrically centered in the frame. Follow these exact styling rules:
- Font Families: 'Cairo' (Headlines) and 'Tajawal' (Secondary)
- Style: Crisp, sharp edges with a subtle black drop shadow (135°, 60% opacity) for depth.

1. "ستانلس ستيل 304 — مستحيل ينكسر"
   (Size: 50pt, Weight: ExtraBold, Font: Cairo, Color: Pure White #FFFFFF, Position: Y=30%)
2. "لا يصدأ — لا يتعطّل — لا يخذلك"
   (Size: 46pt, Weight: Medium, Font: Tajawal, Color: Pure White #FFFFFF, Position: Y=42%)
3. "تسخين أسرع 10 مرات من الزجاج"
   (Size: 46pt, Weight: Medium, Font: Tajawal, Color: Gold #FFD700, Position: Y=53%)
4. "سلك نيكل-كروم + حماية تلقائية"
   (Size: 40pt, Weight: Medium, Font: Tajawal, Color: Pure White #FFFFFF, Position: Y=63%)
```

### الصورة 3: الأمان النهائي (F3)
```text
Warm, protective photograph of a pristine planted aquarium at golden hour. Two magnificent bright orange-red Discus fish swimming peacefully and proudly — round bodies glowing, fins flowing gracefully. The YEE Armored Steel Heater is visible but elegant inside the tank, its stainless steel body complementing the aquascape. Lush Echinodorus plants and Anubias on driftwood frame the scene. Crystal clear water with warm god-rays from above. In the foreground: the tank glass reflects warm ambient room lighting — evoking safety and domestic comfort. The mood is: these precious lives are safe now. Shot on Sony A7R V, 35mm lens, f/4.0. Editorial warmth. Vertical 9:16. Upper third clear.

[TEXT OVERLAY INSTRUCTIONS]
Please perfectly render the following Arabic text in the empty space. The typography must be flawless, right-aligned (RTL) but geometrically centered in the frame. Follow these exact styling rules:
- Font Families: 'Cairo' (Arabic) and 'Inter' (English)
- Style: Crisp, sharp edges with a subtle black drop shadow (135°, 60% opacity) for depth.

1. "أسماكك تستحق حماية حقيقية"
   (Size: 54pt, Weight: ExtraBold, Font: Cairo, Color: Gold #FFD700, Position: Y=33%)
2. "لا ينكسر — لا يصدأ — لا يتعطّل"
   (Size: 46pt, Weight: Bold, Font: Cairo, Color: Pure White #FFFFFF, Position: Y=45%)
3. "متوفر الآن — aquavoiq.com"
   (Size: 46pt, Weight: Bold, Font: Cairo, Color: Gold #FFD700, Position: Y=57%)
4. "AQUAVO"
   (Size: 54pt, Weight: Medium, Font: Inter, Color: Gold #FFD700, Position: Y=65%)
```

---

## 6. التايملاين الكامل (16 ثانية)

### الفريم 1: HOOK — الخطر الحقيقي (0:00 → 0:05.5)

| الوقت | النص | الحجم | اللون | Y% | أنيميشن IN | المدة |
|-------|------|-------|-------|----|-----------|-------|
| 0:00.0 | السخان القزاز قنبلة موقوتة بحوضك | 54pt Cairo Bold | `#FFFFFF` | 30% | **Scale Pop** 0.2ث | 2.5ث |
| 0:02.5 | يطق بأي صدمة — وأسماكك تدفع الثمن | 46pt Cairo Bold | `#DC143C` | 44% | **Slide Right** 0.3ث | 3.0ث |

**الصوت:** صوت زجاج ينكسر 'CRACK' (0:00) → صمت مرعب مع نبض قلب بطيء

---

### الفريم 2: SOLUTION — المُنقذ المدرّع (0:05.5 → 0:10.5)

| الوقت | النص | الحجم | اللون | Y% | أنيميشن IN | المدة |
|-------|------|-------|-------|----|-----------|-------|
| 0:05.5 | الستيل المدرّع — مستحيل ينكسر | 50pt Cairo Bold | `#FFD700` | 50% | **Fade In** 0.4ث | 2.5ث |
| 0:08.0 | تسخين أسرع 10 مرات من الزجاج | 46pt Tajawal Med | `#FFFFFF` | 50% | **Slide Right** 0.3ث | 2.5ث |

**الصوت:** صوت معدن صلب 'CLINK' (0:05.5) → دخول موسيقى دافئة

---

### الفريم 3: CTA — الحماية والأمان (0:10.5 → 0:16)

| الوقت | النص | الحجم | اللون | Y% | أنيميشن IN | المدة |
|-------|------|-------|-------|----|-----------|-------|
| 0:10.5 | أسماكك تستحق حماية حقيقية<br>*(السطر الأول)* | 54pt Cairo Bold | `#FFD700` | 45% | **Scale Pop** 0.3ث | 2.5ث |
| 0:10.5 | سلك نيكل-كروم وحماية تلقائية<br>*(السطر الثاني)* | 46pt Cairo Bold | `#FFFFFF` | 53% | **Fade In** 0.3ث | 2.5ث |
| 0:13.0 | متوفر الآن — aquavoiq.com<br>*(السطر الأول)* | 46pt Cairo Bold | `#FFFFFF` | 45% | **Slide Right** 0.3ث | 3.0ث |
| 0:13.0 | AQUAVO<br>*(السطر الثاني)* | 54pt Inter Med | `#FFD700` | 53% | **Scale Pop** 0.3ث | 3.0ث |

**الصوت:** الموسيقى تستقر بهدوء وأمان

---

## 7. قواعد الأنيميشن (CapCut)

| النوع | متى | السرعة | ملاحظة |
|-------|-----|--------|--------|
| **Scale Pop** | Hook (صدمة الخطر) + CTA الذهبي | 0.2-0.3ث | يعطي تأثير الصدمة والانتباه الفوري |
| **Fade In** | ظهور المنقذ (الستيل المدرع) | 0.4-0.5ث | يعطي إحساساً بالفخامة والطمأنينة |
| **Slide Right** | نصوص الشرح والمواصفات (عربي) | 0.3-0.4ث | يتبع اتجاه القراءة RTL بسلاسة |

**ممنوع:** Bounce، Rotate، Spin، Typewriter (تفقد الفيديو طابعه الوثائقي الجاد).

---

## 8. تعليمات CapCut

### الكليبات
```text
VID-01 (0:00-0:04): الخطر — الزجاج المكسور
VID-02 (0:04-0:09): التباين — الستيل الصلب يظهر
VID-03 (0:09-0:13): الحماية — الديسكس بأمان
VID-04 (0:13-0:16): الأمان النهائي (Grand Finale)
```

### الانتقالات
```text
VID-01 → VID-02: Hard Cut (قطع حاد يعزز تباين الخطر والأمان)
VID-02 → VID-03: Cross Dissolve 0.5ث (انتقال ناعم للطمأنينة)
VID-03 → VID-04: Cross Dissolve 0.3ث
```

### Engagement Loop
```text
آخر 0.5ث من VID-04 (أمان تام)
← قطع حاد ←
أول فريم VID-01 (كسر زجاج مفاجئ)
```

---

## 9. خريطة الريل البصرية (Documentary Flow)

```text
0────3────6────9───12───15───18
├── HOOK ────────┤├──── SOLUTION ────────────┤├ CTA ┤
██ أزرق بارد ████│██████ فضي صلب ████████████│█ ذهبي █│
خوف → قلق → إدراك │ طمأنينة → إعجاب → احترام │أمان عميق│
CRACK + نبض قلب   │ CLINK + موسيقى دافئة        │سلام   │
```

---

## 10. القواعد الذهبية (P3)

1. **التباين هو الملك:** الريل يبدأ بخوف (لون بارد/زجاج حاد) وينتهي بأمان (لون دافئ/ستيل صلب).
2. **لهجة بغدادية خالصة:** "يطق" وليس "ينكسر فجأة".
3. **نبرة وثائقية:** لا تصرخ على المشاهد، دعه يخاف من الحقيقة العلمية.
4. **كل النصوص 28%-68% عمودياً.**
5. **Drop Shadow + Stroke:** إلزامي لإبراز النص عن الخلفية الدرامية المظلمة.
6. **الأنيميشن أقل = وثائقي أكثر:** الحركة يجب أن تكون رزينة وجادة.

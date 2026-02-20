# 🎨 AQUAVO: بروموتات Nano Banana Pro — محتوى بدون ريلز
**كاروسيل + صور ثابتة + TikTok Photo Mode — نصوص عربية على الصور**

> ⚠️ **مهم:** كل بروموت يطلب من Nano Banana Pro كتابة النص العربي مباشرة على الصورة.
> استخدم نموذج `gemini-2.5-flash-image` عبر Higgsfield أو Gemini مباشرة.

---

# 🏷️ معايير AQUAVO الموحدة (تُطبق على كل بروموت)

## 🎨 ألوان العلامة التجارية
| اللون | الكود | الاستخدام |
|:------|:------|:----------|
| **Deep Teal** | `#004D61` | الخلفيات، الظلال |
| **Coral** | `#FF6F61` | التمييز، CTAs |
| **Seafoam** | `#00A884` | العناوين، الأيقونات |

## 🏷️ لوجو AQUAVO الموحد (نفس التصميم بالضبط في كل صورة)
> ⚠️ **مهم جداً:** اللوجو يجب أن يكون **متطابق 100%** في كل صورة — نفس اللون، الحجم، الموضع، والتصميم.

أضف هذا البلوك **كما هو بالضبط** لكل بروموت:
```json
"aquavo_branding": {
  "logo_text": "🐟 AQUAVO",
  "position": "bottom_right corner, 20px from edges",
  "font": "Inter Bold (or similar modern sans-serif)",
  "font_size": "14px",
  "color": "#FFFFFF white text",
  "icon_color": "#00A884 seafoam green fish icon",
  "background": "rounded rectangle pill, #000000 black at 50% opacity",
  "padding": "8px horizontal, 5px vertical",
  "border_radius": "12px",
  "consistency": "IDENTICAL in every single image — never change colors or style"
}
```
> 🎯 **السبب:** هوية بصرية موحدة = تعرّف فوري على العلامة التجارية عبر كل المنصات.

## 💡 7 أنماط إضاءة سينمائية (اختر واحداً لكل بروموت)

| # | النمط | متى تستخدمه | الكود |
|:--|:------|:------------|:------|
| 1 | **Golden Hour** | صور دافئة، lifestyle | `warm golden directional light, 45° from left, long shadows` |
| 2 | **Low Key** | صور درامية، أسماك على خلفية سوداء | `single hard light from above, deep shadows, black negative space` |
| 3 | **Spotlight** | Species Spotlight، بورتريه الأسماك | `single focused beam on subject, everything else falls to shadow` |
| 4 | **Chiaroscuro** | صدمة بصرية، ماكرو | `extreme contrast, Renaissance painting light, one side lit one side dark` |
| 5 | **Cutter** | انفوجرافيك، تعليمي | `shaped light through window blinds or grid, creating pattern shadows` |
| 6 | **Hard Flash** | مقارنات قبل/بعد | `direct frontal flash, flat harsh light, reveals every detail` |
| 7 | **Silhouette** | صور شعرية، Silent Tank | `strong backlight only, subject is dark outline against bright background` |

## 🔬 صيغة الواقعية (للصور الماكرو والبورتريه)
أضف هذه التفاصيل للصور الماكرو:
```
visible pores and micro-texture, subsurface scattering on translucent fins,
iridescent scale reflections, visible fin ray structure,
water caustics on surfaces, micro-bubbles on body,
chromatic aberration at edges, natural lens vignette
```

## ❌ Negative Prompts (أضفها لكل بروموت)
```json
"constraints": {
  "exclusions": ["cartoonish", "3D render", "plastic look", "AI artifacts",
    "oversaturated neon", "blurry text", "distorted anatomy",
    "low quality", "watermark", "grainy", "stock photo feel"],
  "style_raw": true
}
```

## ✏️ الخط الموحد — Cairo Bold Arabic
> ⚠️ **مهم جداً:** كل النصوص العربية على الصور تستخدم خط **Cairo Bold** فقط — بدون استثناء!

| العنصر | القيمة |
|:-------|:-------|
| **اسم الخط** | Cairo Bold Arabic |
| **السبب** | خط Google مجاني، عصري، sans-serif، ممتاز للقراءة على الشاشات الصغيرة |
| **الوزن** | Bold (عريض) — واضح على خلفيات الصور |
| **التوافق** | يعمل مع RTL + LTR، مدعوم على جميع المنصات |
| **القاعدة** | `"font_style": "Cairo Bold Arabic, [الألوان والتأثيرات]"` |

> 🎯 **السبب:** Cairo هو أفضل خط عربي للسوشيال ميديا — يجمع بين الأشكال الهندسية العصرية وعناصر النسخ التقليدية. وضوح ممتاز حتى بأحجام صغيرة.

## ➡️ سهم السحب — Swipe Indicator (للكاروسيل فقط)
> ⚠️ **أضف هذا لكل شرائح الكاروسيل ما عدا الشريحة الأخيرة (CTA)**

أضف هذا البلوك داخل `text_overlay` في كل شريحة كاروسيل:
```json
"swipe_indicator": {
  "text": "← اسحب",
  "position": "center_right, 15px from right edge",
  "style": "Cairo Bold Arabic, 16px, #FFFFFF at 70% opacity",
  "arrow_icon": "chevron_left ‹ icon, animated pulse feel",
  "background": "subtle gradient from transparent to rgba(0,0,0,0.3) on right edge"
}
```
> 🎯 **السبب:** المتابع يحتاج تلميح بصري واضح أن هناك شرائح إضافية. السهم على اليمين يدل على اتجاه السحب.


## 🏆 القواعد الذهبية الخمس — سر نجاح AQUAVO

### 1️⃣ اللهجة العراقية = السر 🇮🇶
> ⚠️ **كل الكابشنات والنصوص على الصور = لهجة عراقية، مو فصحى!**

| ❌ لا تكتب | ✅ اكتب |
|:----------|:--------|
| هل أنت بخير؟ | شلونك عيني؟ |
| انتبه جيداً | دير بالك! |
| تعال انظر | تعال شوف |
| هذا رائع جداً | هذا حلو مرة! |
| ماذا حدث؟ | شصار؟! |
| أنا خائف | أني خايف |
| ساعدني | ساعدني يبه |
| لا تفعل هذا | لا تسوي جذي |

> 🎯 **الناس تحب اللي يشبهها ويحكي لغتها.** اللهجة العراقية = ثقة + قرب + تفاعل أعلى.

### 2️⃣ ثبات شخصية السمكة — مذكرات سمكة 🐟
> ⚠️ **نفس السمكة في كل حلقة — المتابع لازم يعرفها ويحبها!**

```json
"character_consistency": {
  "fish_character": {
    "species": "Betta fish, male, halfmoon tail",
    "color": "deep royal blue body with red-tipped fins",
    "markings": "iridescent turquoise scales on gill covers",
    "size": "medium, proportional to tank",
    "personality": "curious, expressive, slightly dramatic",
    "eyes": "large, round, expressive — the viewer connects through the eyes"
  },
  "consistency_rule": "SAME fish appearance in EVERY episode — colors, markings, size, fin shape MUST match",
  "reference": "Use this exact description in every مذكرات سمكة prompt"
}
```

### 3️⃣ الشغل الوصخ = واقعي فعلاً 🧹
> ⚠️ **لا تصير مثالي! الناس تثق بيك لما تشوفك تعاني مثلهم.**

- 💚 **أبيّن** الطحالب الحقيقية، الماء العكر، الفلتر المسدود
- 💚 **أبيّن** الإيد وهي وسخة من الشغل
- 💚 **أبيّن** الفوضى قبل التنظيف
- ❌ **لا** أخلي كل شي لامع ومثالي — هذا مو واقعي

### 4️⃣ أول ساعة بعد النشر = ذهب ⏰
> ⚠️ **رد على كل تعليق بسؤال — كل واحد!**

| التعليق | ❌ رد عادي | ✅ رد ذهبي |
|:--------|:----------|:----------|
| "حلو الحوض!" | شكراً 🙏 | "تسلم عيني! عدك حوض أنت؟ شنو نوعه؟" |
| "شلون أعتني بالبيتا؟" | غيّر الماي | "سؤال حلو! أنت جديد على البيتا ولا عدك خبرة؟" |
| "❤️" | ❤️ | "يسلمووو! شنو أكثر شي عجبك؟" |

> 🎯 **كل رد بسؤال = تعليق ثاني = الخوارزمية تصعد المنشور للسماء!**

### 5️⃣ النفس الطويل = الاستمرارية 📅
> ⚠️ **لا توقف لو أول أسبوع ما شفت أرقام خيالية!**

- الخوارزمية تحتاج **٢-٤ أسابيع** حتى تفهم محتواك
- أول ١٠٠٠ متابع = الأصعب، بعدها الأمور تتسارع
- **الفشل الوحيد = التوقف!**
- انشر يومياً بنفس الأوقات، حتى لو التفاعل ضعيف بالبداية

---

## 🔍 سير العمل المحدّث: التوليد → الترقية → النشر

> ⚠️ **تغيير مهم:** كل نوع محتوى له قياس خاص عند التوليد!

### 📊 **قياسات التوليد الصحيحة:**

| نوع المحتوى | القياس | متى تستخدمه |
|:-----------|:-------|:------------|
| **Carousel (كاروسيل)** | **4:5** (1080×1350) | ✅ Instagram Carousel - ولّد مباشرة بهذا القياس |
| **Story (ستوري)** | **9:16** (1080×1920) | Instagram/TikTok Stories + Reels |
| **Feed Post (منشور عادي)** | **1:1** (1080×1080) | منشورات مربعة |

### **للكاروسيل (الأهم!):**
1. **التوليد:** Gemini 2.5 Flash Image — **4:5 مباشرة** (بدون 9:16!)
2. **الترقية:** Magnific AI — `Creativity: -3, Resemblance: 3, Upscale: 2x`
3. **النشر:** مباشرة بدون قص! ✅

### **للستوري:**
1. **التوليد:** Gemini 2.5 Flash Image — **9:16**
2. **الترقية:** Magnific AI (اختياري)
3. **النشر:** مباشرة بدون قص! ✅

> 💡 **الفرق:** الكاروسيل = 4:5 من البداية، الستوري = 9:16 من البداية. **بدون قص = بدون فقدان النص!**

---

## 📐 مناطق الأمان — تُطبّق على كل البروموتات

> [!IMPORTANT]
> أضف هذا البلوك لكل بروموت عند التوليد — يضمن النص يطلع بالمكان الصحيح

```json
"safe_zones": {
  "tiktok_9_16": {
    "resolution": "1080x1920",
    "avoid_top": "150-200px (اسم المستخدم + الصوت)",
    "avoid_bottom": "300-480px (كابشن + هاشتاقات + أزرار)",
    "avoid_right": "60-120px (أيقونات لايك/كومنت/شير)",
    "avoid_left": "50-70px (هامش أمان)",
    "safe_text_area": "الوسط 70% من الشاشة"
  },
  "instagram_carousel_4_5": {
    "resolution": "1080x1350",
    "avoid_top": "90px (قص الأجهزة)",
    "avoid_bottom": "90px (منطقة الكابشن)",
    "safe_text_area": "الوسط 80% من الإطار"
  },
  "instagram_story_9_16": {
    "resolution": "1080x1920",
    "avoid_top": "250px (اسم الحساب + ستيكرات)",
    "avoid_bottom": "250px (رد + إرسال)",
    "safe_text_area": "1080x1420px (المنطقة الوسطى)"
  }
}
```

---

# 🏷️ SEO والكلمات المفتاحية والهاشتاقات

> [!IMPORTANT]
> **قاعدة 2025/2026:** استخدم **3-5 هاشتاقات** فقط لكل منشور (توصية إنستجرام الرسمية).
> مزيج من **niche + popular** = أفضل وصول. الجودة والصلة أهم من الكمية.

---

## 📌 هاشتاقات AQUAVO الخاصة (تُستخدم في كل منشور)
```
#AQUAVO #MyAQUAVO #AQUAVOTank #AQUAVOFamily
```

## 📌 هاشتاقات حسب الفئة (اختر 3-5 لكل منشور)

| الفئة | الهاشتاقات الموصى بها | الكلمات المفتاحية (SEO) |
|:---|:---|:---|
| **S0 مذكرات سمكة** | `#FishDiary` `#FishStory` `#AquariumLife` `#FishKeeping` `#FishMemes` | fish diary, aquarium stories, pet fish, funny fish |
| **S1 عوالم مصغرة** | `#Aquascape` `#AquascapeDesign` `#NatureAquarium` `#PaludariumDesign` | aquascape ideas, nature aquarium, miniature worlds |
| **S2 تحولات** | `#TankTransformation` `#BeforeAndAfter` `#PlantedTankProgress` | tank transformation, aquarium before after, planted tank progress |
| **S3 صدمة بصرية** | `#BettaFish` `#MacroPhotography` `#FishPhotography` `#UnderwaterPhoto` | betta fish macro, fish photography, underwater art |
| **S4 تفاعلي** | `#AquariumQuiz` `#FishID` `#GuessTheFish` `#RateMyTank` | guess the fish, aquarium quiz, rate my tank |
| **S5 أنواع** | `#SpeciesSpotlight` `#FishSpecies` `#TropicalFishKeeping` `#FishCare` | fish species guide, tropical fish care, betta care guide |
| **S6 خرافات** | `#FishMyths` `#AquariumFacts` `#FishCare101` `#MythBusting` | fish myths debunked, aquarium facts, beginner mistakes |
| **S7 ميزانية** | `#BudgetAquarium` `#NanoTank` `#AquariumDIY` `#CheapAquarium` | budget aquarium build, cheap fish tank, nano tank setup |
| **S8 إنفوجرافيك** | `#FishCompatibility` `#AquariumChart` `#FishKeepingTips` | fish compatibility chart, aquarium infographic |
| **S9 الحوض الصامت** | `#AquariumZen` `#CalmAquarium` `#RelaxingFishTank` `#ASMR` | relaxing aquarium, zen fish tank, calming aquascape |

## 📌 هاشتاقات عامة (استخدم 1-2 من هذه + 3 من الفئة)
```
#Aquascaping #PlantedTank #AquariumLife #FreshwaterAquarium #NanoTank
#AquariumHobby #FishTank #TropicalFish #AquariumDesign #UnderwaterGarden
```

## 📌 نصائح SEO لإنستجرام 2025/2026

1. **النص داخل الصورة = OCR:** تيك توك وإنستجرام يقرآن النص على الصورة (OCR) — ضع كلمة مفتاحية إنجليزية صغيرة مثل "Betta Care Guide" في زاوية الصورة
2. **الوصف (Caption):** ابدأ بجملة قوية + ضع الهاشتاقات في آخر الوصف أو أول تعليق
3. **Alt Text:** اكتب وصف الصورة بالإنجليزية في خانة Alt Text (إنستجرام يستخدمه للتصنيف)
4. **الكاروسيل = منشور واحد:** مجموعة هاشتاقات واحدة تنطبق على كل شرائح الكاروسيل
5. **الموسيقى الترند:** إضافة موسيقى ترند للكاروسيل = ظهور في تبويب الريلز أيضاً!

---

---

# 📋 فهرس المحتويات

| # | القسم | النوع | عدد البروموتات |
|:--|:------|:------|:--------------|
| **A** | المعايير الموحدة | إعدادات | — |
| **B** | SEO والهاشتاقات | إعدادات | — |
| **1** | Carousel 1: دورة النيتروجين | كاروسيل تعليمي | 6 شرائح |
| **2** | Carousel 2: الإضاءة والطحالب | كاروسيل تعليمي | 6 شرائح |
| **3** | Carousel 3: الحرارة والقتل البطيء | كاروسيل تعليمي | 5 شرائح |
| **4** | Carousel 4: أنواع الفلاتر | كاروسيل مقارنة | 6 شرائح |
| **5** | الدليل 1: أخطاء التغذية | كاروسيل 8 شرائح | مفصل |
| **6** | الدليل 2: الحرارة الغلط | كاروسيل 8 شرائح | مفصل |
| **7** | الدليل 3: جارك القطو | كاروسيل 8 شرائح | مفصل |
| **8** | Species Spotlight: دليل Betta | كاروسيل 10 شرائح | مفصل |
| **9** | عوالم مصغرة — TikTok | TikTok Photo Mode | 4 بروموتات |
| **10** | خرافات vs حقائق | كاروسيل جدلي | 6 شرائح |
| **11** | صدمة بصرية + تفاعلي | صور ثابتة | متنوع |
| **12** | الشغل الوصخ + الصيدلية + النباتات | كاروسيلات واقعية | 3 كاروسيلات |
| **13** | Community Roast + Real vs AI | أفكار مستقبلية | 2 بروموت |

> **ملاحظة:** Carousel 1-4 هي اللي يرجع لها ملف `TODAY.md` — لذلك موجودة أولاً!

---

# 🏥 The Clinic Edition — Educational Carousels & Special Formats (2026)
> **Visual Style:** خلفيات سوداء مينيماليست، تايبوغرافي أبيض نظيف، رسوم بيانية علمية.
> **اللهجة:** عراقية صرفة — "ليش" مو "لماذا"، "شكد" مو "كم".
> **الفلسفة:** كل كاروسيل = **درس علمي** يخلّي المتابع يحس إنه "اكتشف سر" ما يعرفه.

---

## 📚 Carousel 1: دورة النيتروجين (The Nitrogen Cycle) — للمبتدئين
> **الهدف:** حل أكبر مشكلة تواجه المبتدئين (موت الأسماك بأول أسبوع).

### الشريحة 1 — الهوك (Hook)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "cinematic documentary photography",
  "subject": {
    "main": "A single dead fish (small tetra or guppy) lying belly-up at the bottom of a clean-looking aquarium. The water is clear. The gravel is white. It looks tragic but artistically composed. Dark moody lighting. The fish is in sharp focus. Everything else is slightly soft.",
    "composition": "Fish in bottom-center. Massive dark negative space above for text overlay.",
    "text_overlay": {
      "arabic_text": "ليش سمكاتك يموتن بعد اسبوع من تشتريهن؟",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, 48px, #FFFFFF",
      "font_size": "large"
    }
  },
  "environment": { "lighting": { "type": "Single spot from above", "quality": "Dramatic, somber" } },
  "style": { "artistic": "Documentary still life", "mood": "Tragic, attention-grabbing" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```
**Caption Text:** ليش سمكاتك يموتن بعد اسبوع من تشتريهن؟ 💀

### الشريحة 2 — كسر الخرافة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "minimalist typography design",
  "subject": {
    "main": "Pure black background (#0A0A0A). No images, no graphics, pure text slide. Clean typography design.",
    "composition": "Text centered in middle 70% of frame. Massive negative space around.",
    "text_overlay": {
      "line_1": {
        "arabic_text": "السبب مو \"عين\" ولا \"مرض\"...",
        "position": "center, top third",
        "font_style": "Cairo Bold Arabic, 40px, #FFFFFF"
      },
      "line_2": {
        "arabic_text": "السبب هو \"متلازمة الحوض الجديد\"",
        "position": "center, middle",
        "font_style": "Cairo Bold Arabic, 52px, #FF6F61 (coral accent)",
        "note": "Highlighted in brand coral color"
      },
      "line_3": {
        "english_subtitle": "(New Tank Syndrome)",
        "position": "center, below line_2",
        "font_style": "Inter Regular, 24px, #FFFFFF at 60% opacity"
      },
      "line_4": {
        "arabic_text": "وهذا أكبر قاتل بالهواية.",
        "position": "center, bottom third",
        "font_style": "Cairo Bold Arabic, 36px, #FFFFFF"
      }
    }
  },
  "environment": { "background": "solid #0A0A0A black" },
  "style": { "artistic": "Minimalist typography — statement slide", "mood": "Serious, revelatory" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF",
    "background": "rounded rectangle, #000000 at 50% opacity"
  }
}
```

### الشريحة 3 — الرسم البياني (The Science)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A clean infographic diagram on a dark background showing the Nitrogen Cycle in an aquarium. Flow chart style: Food → Fish Waste (Ammonia - RED, toxic symbol) → Bacteria Type 1 (Nitrosomonas) → Nitrite (ORANGE, toxic) → Bacteria Type 2 (Nitrospira) → Nitrate (GREEN, safe). Arrows connecting each stage. Minimalist icons. Very clean, like a medical diagram.",
    "text_overlay": {
      "arabic_text": "دورة النيتروجين — الفرق بين الحياة والموت",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, #FFFFFF"
    }
  },
  "style": { "artistic": "Medical/scientific infographic — dark mode", "mood": "Educational, authoritative" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 4 — الصدمة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "impact typography with icon",
  "subject": {
    "main": "Pure black background (#0A0A0A). Centered text with a skull icon (☠️) as visual element. Dramatic, warning-style design.",
    "composition": "Text stacked vertically in center. Skull icon integrated with text. High contrast white/red on black.",
    "text_overlay": {
      "line_1": {
        "arabic_text": "أنت من تشتري حوض وتذب بي سمك بنفس اليوم...",
        "position": "center, top quarter",
        "font_style": "Cairo Bold Arabic, 38px, #FFFFFF"
      },
      "line_2": {
        "arabic_text": "دتذبهم ببحيرة سموم.",
        "position": "center, below line_1",
        "font_style": "Cairo Bold Arabic, 44px, #FF4444 (red warning)",
        "note": "Red color for shock value"
      },
      "line_3": {
        "icon_text": "☠️",
        "position": "center, middle",
        "font_size": "80px"
      },
      "line_4": {
        "arabic_text": "الأمونيا = بول السمك = غاز سام شفاف",
        "position": "center, below icon",
        "font_style": "Cairo Bold Arabic, 36px, #FFFFFF"
      },
      "line_5": {
        "arabic_text": "بدون بكتيريا تكسره، سمكتك تختنك ببطء.",
        "position": "center, bottom quarter",
        "font_style": "Cairo Regular Arabic, 32px, #FFFFFF at 80% opacity"
      }
    }
  },
  "environment": { "background": "solid #0A0A0A black" },
  "style": { "artistic": "Warning poster — high impact typography", "mood": "Alarming, urgent, educational shock" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF",
    "background": "rounded rectangle, #000000 at 50% opacity"
  }
}
```

### الشريحة 5 — الحل
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "An empty running aquarium with filter bubbling, heater light on, but NO fish inside. The tank is cycling. A small calendar icon in the corner shows '21 days'. The tank looks professional and clean. Dark ambient room lighting. The aquarium light is the only source of light.",
    "text_overlay": {
      "arabic_text": "الحل: شغّل الحوض 'فارغ' لمدة ٣ أسابيع.",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, #FFFFFF"
    }
  },
  "style": { "artistic": "Product lifestyle — dark mode", "mood": "Patient, professional" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```
**النص:**
> لازم تشغل الحوض **"فارغ"** لمدة ٣ أسابيع.
> أو تستخدم **"بكتيريا حية"** لتسريع الدورة.

### الشريحة 6 — CTA (Call to Action)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A bottle of live bacteria supplement for aquariums, standing on a dark reflective surface. Dramatic product lighting (rim light). Behind it, a blurred but healthy planted aquarium glowing green. Premium product shot.",
    "composition": "Product in center-right. Blurred healthy tank behind."
  },
  "style": { "artistic": "Premium product photography — dark mode", "mood": "Solution, hope, premium" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```
**النص:**
> عندك صبر تنتظر ٣ أسابيع؟
> لو تريد **الحل السريع** — راسلنا 💎
> 📩 DM = استشارة مجانية

---

## 🌿 Carousel 2: الإضاءة والطحالب — المعادلة الذهبية
> **الهدف:** تعليم العلاقة بين الضوء وCO2 والطحالب — أكثر سؤال يتكرر.

### الشريحة 1 — الهوك
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A neglected aquarium completely covered in green algae. The glass is barely visible. The water is green pea soup. Hair algae hanging from plants like cobwebs. It looks disgusting but shot beautifully with cinematic dark lighting.",
    "text_overlay": {
      "arabic_text": "حوضك قلب أخضر؟ 🟢",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, 48px, #FFFFFF"
    }
  },
  "style": { "artistic": "Horror documentary — dark cinematic", "mood": "Disgust meets art" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 2 — كسر المفهوم
**خلفية:** سوداء
**النص:**
> الطحالب مو "نبات"..
> الطحالب هي **"انتهازي"** يستغل أخطائك.
> وأنت بنفسك تطعمها بدون ما تدري.

### الشريحة 3 — الخطأ #1
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Split image: LEFT side shows an aquarium light turned ON with a clock showing 14 hours (too long). RIGHT side shows green algae growing on everything. Visual cause-and-effect. Dark background.",
    "text_overlay": {
      "arabic_text": "الخطأ #١: تشغيل الضوة أكثر من ٨ ساعات",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, #FF4444 (red)"
    }
  },
  "style": { "artistic": "Before/after diagram — dark mode" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 4 — الخطأ #2
**خلفية:** سوداء
**النص:**
> الخطأ #٢: **ضوة الشمس المباشر** على الحوض.
> الشمس = طحالب بـ ٤٨ ساعة. مضمون.
> حتى لو عندك أفضل فلتر بالعالم.

### الشريحة 5 — المعادلة الذهبية
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A clean equation/formula diagram on dark background. TOP equation (GREEN, checkmark): Strong Light + High CO2 = Strong Plants (icon of lush plant). BOTTOM equation (RED, X mark): Strong Light + Low CO2 = ALGAE (icon of algae blob). Clean, scientific, minimalist.",
    "text_overlay": {
      "arabic_text": "المعادلة الذهبية ⚖️",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, #FFD700 (gold)"
    }
  },
  "style": { "artistic": "Scientific formula diagram — Apple Keynote style", "mood": "Eureka moment" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 6 — CTA
**خلفية:** سوداء
**النص:**
> 📌 **احفظ المنشور** حتى تضبط توقيت الإضاءة اليوم.
> ⏰ القاعدة: ٦-٨ ساعات ضوء فقط (استخدم تايمر).
> 
> عندك مشكلة طحالب؟ دزلنا صورة بالـ DM — تشخيص مجاني 💎

---

## 🌡️ Carousel 3: الحرارة والقتل البطيء
> **الهدف:** تعليم أهمية الحرارة الثابتة وخطر التقلبات.

### الشريحة 1 — الهوك
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Macro close-up of a submerged aquarium heater with the red indicator light glowing. The glass tube of the heater is in sharp focus. Dark moody water around it. You can see heat distortion (wavy lines) in the water near the heater.",
    "text_overlay": {
      "arabic_text": "هذا الجهاز ممكن يقتل كل حوضك بليلة واحدة.",
      "position": "bottom",
      "font_style": "Cairo Bold Arabic, #FF0000"
    }
  },
  "style": { "artistic": "Thriller movie poster feel", "mood": "Danger, suspense" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 2
**النص:**
> الـ Heater (السخان) هو **أخطر جهاز** بالحوض.
> إذا علق "ON" — يطبخ سمكاتك.
> إذا فصل بدون ما تدري — تجمد سمكاتك.

### الشريحة 3 — الإحصائية
**النص:**
> 📊 **٣٥٪** من حالات الموت الجماعي
> سببها **خلل بالسخان** (مصدر: Aquarium Co-Op Survey 2024).
>
> والأغلب يكتشف المشكلة **بعد فوات الأوان**.

### الشريحة 4 — الحل
**النص:**
> ✅ بروتوكول الحماية:
> ١. **لا تشتري سخان رخيص أبداً** — الكفالة = حياة سمكاتك.
> ٢. استخدم **ثرمومتر رقمي منفصل** (لا تعتمد على السخان نفسه).
> ٣. افحص الحرارة **مرتين يومياً** (صبح + ليل).
> ٤. الحرارة المثالية: **24-27°C** (ثابتة، بدون تقلبات).

### الشريحة 5 — CTA
**النص:**
> 🌡️ شكد حرارة حوضك **الحين**؟
> دزلنا بالكومنت ونقولك إذا طبيعية 👇
> 📌 احفظ — هذي معلومة تنقذ حوضك.

---

## 🧬 Carousel 4: أنواع الفلاتر — أيهم الصح الك؟
> **الهدف:** تعليم الفرق بين الفلاتر (لأن الأغلب يشتري الغلط).

### الشريحة 1 — الهوك
**النص:**
> ٩٠٪ من المبتدئين يشترون **الفلتر الغلط** لحوضهم.
> وبعدين يستغربون ليش المي يوسخ بسرعة.

### الشريحة 2 — المقارنة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Clean comparison layout on dark background. Three columns: LEFT: Sponge Filter (simple, bubbles). CENTER: Hang-On-Back (HOB) filter. RIGHT: Canister Filter (premium, large). Each has a small icon and specs below. Minimalist product layout like Apple's product comparison page.",
    "text_overlay": {
      "arabic_text": "سفنج vs HOB vs كانستر — شنو الفرق؟",
      "position": "top"
    }
  },
  "style": { "artistic": "Apple product comparison page — dark mode" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 3-5 — كل فلتر بالتفصيل
**الشريحة 3 (Sponge Filter):**
> 🟢 فلتر الإسفنج
> ✅ رخيص، صامت، مثالي لأحواض الجمبري والتفريخ.
> ❌ ضعيف للأحواض الكبيرة (فوك 60 لتر).
> 💰 مناسب للميزانيات المحدودة.

**الشريحة 4 (HOB):**
> 🟡 فلتر خارجي معلّق (HOB)
> ✅ سهل التركيب والصيانة.
> ❌ مو قوي بما فيه الكفاية للأحواض المزروعة.
> 💰 الخيار الوسط.

**الشريحة 5 (Canister):**
> 🔴 فلتر خارجي كامل (Canister)
> ✅ أقوى فلترة. صامت. ٣ مراحل (ميكانيكي + بيولوجي + كيميائي).
> ❌ غالي + يحتاج صيانة كل ٣ شهور.
> 💰 الاستثمار الصح لو حوضك فوك 100 لتر.

### الشريحة 6 — CTA
**النص:**
> مو متأكد شنو يناسب حوضك؟
> دزلنا حجم حوضك بالـ DM وننصحك بالمناسب 💎
> 📌 احفظ المنشور — راح تحتاجه.

-----

# 🐟 الفئة 1: أدلة العناية بالأسماك (S0) — كاروسيل تعليمي

> **ملاحظة:** كل دليل = 6 شرائح كاروسيل. الأسلوب تعليمي موثوق يبني هيبة البراند.

> ✅ **الأسلوب:** خبير موثوق يقدم قيمة حقيقية — لا أسلوب كارتوني أو طفولي!
> ✅ **السمكة:** Betta أزرق ملكي بزعانف حمراء — تستخدم كعنصر بصري في الصور (مو كشخصية تتكلم).
> ✅ **اللهجة:** عراقية طبيعية — بثقة وهيبة.

---

## 🎬 الدليل 1: "أخطاء التغذية — القاتل الصامت"

### الشريحة 1 — الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Canon EOS R5, Canon RF 15-35mm f/2.8L IS USM lens at 15mm, ISO 2000, f/2.8, 1/80s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph from inside a home aquarium looking upward through the water surface — Betta fish POV, natural light filtering through",
    "secondary": "Bold Arabic text overlay"
  },
  "subject": {
    "main": "A real photograph shot from the bottom of a home planted aquarium looking upward. A real royal blue male Betta fighter fish with flowing red-tipped halfmoon fins visible in mid-frame from below. Above, the water surface creates a natural mirror effect with light filtering through. Natural live plants (Java fern, Anubias) framing the edges. Small gravel and substrate visible at the very bottom of frame. Fine floating particles catching the light from above. Slight algae film on the inner glass edges. A filter intake tube and heater visible at the tank edge. Natural sediment on gravel"
  },
  "text_overlay": {
    "arabic_text": "أخطاء التغذية 🐟",
    "arabic_subtitle": "الخطأ الي يقتل 90% من الأسماك",
    "position": "center",
    "font_style": "Cairo Bold Arabic, white with dark shadow",
    "font_size": "large and readable"
  },
  "environment": {
    "setting": "Real home planted aquarium, natural light from above filtering through water surface",
    "lighting": {
      "type": "Aquarium LED strip from above creating natural light rays through water surface",
      "quality": "Natural aquarium LED, soft shimmer on water surface, no studio lights, light rays visible through floating particles"
    },
    "color_palette": {
      "dominant": "deep teal aquarium water",
      "secondary": "green plant silhouettes against light surface",
      "accent": "warm LED light filtering through water"
    }
  },
  "style": {
    "artistic": "hyper-realistic underwater aquarium photography, fish POV documentary",
    "camera": {
      "angle": "ultra low angle from bottom of tank looking up through water",
      "lens": "Canon RF 15-35mm at 15mm, wide angle distortion",
      "depth_of_field": "moderate, fish in focus, surface slightly soft"
    },
    "mood": "mysterious, immersive, documentary storytelling",
    "realism_details": "water surface acting as partial mirror from below, natural light scattering through particles, algae on glass corners, silicone seal visible at tank bottom edges, gravel texture with natural debris"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime"],
    "style_raw": true
  },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors, studio backdrop"
}
```

### الشريحة 2 — صباح هادئ
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Sony A7R V, Sony FE 90mm f/2.8 Macro G OSS lens, ISO 800, f/3.2, 1/125s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real morning photograph of a Betta fighter fish swimming lazily near the surface of a planted aquarium with natural morning window light",
    "secondary": "Arabic diary text overlay"
  },
  "subject": {
    "main": "A single real royal blue male Betta fighter fish with dramatic red-tipped halfmoon fins swimming lazily near the water surface in a home planted aquarium. Soft natural morning light from a nearby window creates warm golden streaks through the water, visible as subtle caustic patterns on the gravel. Natural air bubbles rising slowly from a sponge filter. Live plants (Anubias, Java fern) swaying gently in the slow filter current with natural minor imperfections — a yellowed lower leaf, slight algae on older stems. Fine floating particles catching the morning light. The Betta's fins trail gracefully, showing natural iridescent color variation. Water surface has a slight oil film sheen from fish activity",
    "text_overlay": {
      "arabic_text": "الإفراط بالتغذية = موت بطيء ⚠️",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, warm white with soft shadow",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "Real home planted aquarium at morning, natural window light",
    "lighting": {
      "type": "Natural morning window light from the side combined with aquarium LED just turning on",
      "quality": "Warm golden side light from window, cool LED from above, mixed color temperature, no studio lights"
    },
    "color_palette": {
      "dominant": "deep teal aquarium water",
      "accent": "warm golden morning light streaks"
    }
  },
  "style": {
    "artistic": "hyper-realistic aquarium photography, peaceful morning documentary",
    "camera": {
      "angle": "eye level with fish through glass, medium shot",
      "lens": "Sony 90mm f/2.8 Macro",
      "depth_of_field": "shallow, Betta sharp, background plants softly blurred"
    },
    "mood": "peaceful, calm, morning serenity, documentary",
    "realism_details": "morning window light gradient across tank, slight condensation on outer glass from overnight temperature difference, natural gravel with debris, filter intake tube in background"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors"
}
```

### الشريحة 3 — اللحظة الدرامية
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Nikon Z8, Nikon NIKKOR Z 50mm f/1.2 S lens, ISO 1600, f/2, 1/160s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Hand and action MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT. Keep hand away from edges.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph from inside an aquarium looking up at a human hand breaking through the water surface, Betta fish below looking up in alarm",
    "secondary": "Arabic text overlay expressing fish fear"
  },
  "subject": {
    "main": "Shot from underwater inside a real home aquarium looking upward. A real human hand and fingers breaking through the water surface from above — fingers slightly spread, creating real water ripples, air bubbles, and surface distortion. The hand is slightly blurred from water refraction, with natural details visible: fingerprints, a slightly dirty nail, skin wrinkles, knuckle hair. Below, the royal blue male Betta fighter fish with halfmoon red-tipped fins flared in alarm, body angled away, looking upward at the invading hand. Water surface has a natural meniscus distortion where the hand enters. Bubbles streaming upward from the point of entry. Fine sediment and particles kicked up from the disturbance. Plants moving from the water displacement",
    "text_overlay": {
      "arabic_text": "الكمية الصحيحة = بحجم عين السمكة 👁️",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, white with red glow",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "Real home planted aquarium, hand entering water from above, fish POV from below",
    "lighting": {
      "type": "Aquarium LED from above plus room ceiling light creating silhouette of hand against bright surface",
      "quality": "Natural lighting, hand partially silhouetted against bright surface light, underwater shadows cast by the hand"
    },
    "color_palette": {
      "dominant": "deep teal water with bright surface above",
      "accent": "dark hand silhouette against light surface, blue Betta below"
    }
  },
  "style": {
    "artistic": "hyper-realistic underwater aquarium photography, dramatic POV documentary",
    "camera": {
      "angle": "extreme low angle from bottom looking up at hand and surface",
      "lens": "Nikon Z 50mm f/1.2",
      "depth_of_field": "moderate, fish sharp, hand slightly soft from water refraction"
    },
    "mood": "dramatic fear, comedy undertone, documentary tension",
    "realism_details": "Snell's window effect on water surface from below, hand refraction distortion through water, air bubbles at surface break point, natural imperfections on human hand (skin pores, slight dirt under nail), filter tube visible at tank edge"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "cartoonish", "illustration", "digital art", "plastic fingers"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, cartoon, illustration, digital art, plastic fingers, studio backdrop"
}
```

### الشريحة 4 — الاختباء
```json
  {
    "model": "gemini-2.5-flash-image",
    "task_type": "generation",
    "prompt_style": "hyper-realistic photography",
    "camera_setup": "A candid photograph shot on Fujifilm X-T5, Fujinon XF 80mm f/2.8 R LM OIS WR Macro lens, ISO 2000, f/3.2, 1/100s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Hiding fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
    "priority": {
      "primary": "A real macro photograph of a Betta fighter fish hiding behind a large Java fern leaf inside a planted aquarium, peeking out cautiously",
      "secondary": "Arabic scared diary text"
    },
    "subject": {
      "main": "A real royal blue male Betta fighter fish cowering behind a dense Java fern leaf in a real home planted aquarium. The Betta is partially hidden — its eye and part of its royal blue body visible peeking around the leaf edge, its flowing red-tipped halfmoon fins trailing out behind the leaf, unable to fully conceal themselves. Tiny bubbles clinging to the Java fern leaves. Fine disturbed particles still floating from the earlier hand intrusion. A real Amano shrimp frozen motionless on a nearby rock, translucent body barely visible. Natural gravel substrate with scattered plant debris and mulm",
      "text_overlay": {
        "arabic_text": "الأكل الزايد يتحلل ويسمم الماء ☠️",
        "position": "bottom_center",
        "font_style": "Cairo Bold Arabic, white with slight trembling effect",
        "font_size": "medium"
      }
    },
    "environment": {
      "setting": "Dense planted area of a real home aquarium, fish hiding among plants",
      "lighting": {
        "type": "Aquarium LED from above, dappled through plant canopy creating natural shadow patterns",
        "quality": "Natural filtered light through plants, darker shadowed hiding area, bright spots where light breaks through leaf gaps"
      },
      "color_palette": {
        "dominant": "deep green plant shadows",
        "accent": "filtered teal-blue light through plants, Betta blue peeking through"
      }
    },
    "style": {
      "artistic": "hyper-realistic macro aquarium photography, behavioral wildlife documentation",
      "camera": { "angle": "close-up through plants on hiding fish, shallow depth of field", "lens": "Fujinon 80mm f/2.8 Macro", "depth_of_field": "very shallow, Betta eye and nearby leaf tack sharp, background plants beautifully blurred" },
      "mood": "tense, scared, empathetic, documentary",
      "realism_details": "hair algae on older Java fern leaves, a yellowing dying leaf on the plant, tiny bubbles on leaf undersides, natural rhizome structure visible on Java fern, mulm on gravel, shrimp transparent body showing internal organs"
    },
    "aquavo_branding": {
      "logo_text": "🐟 AQUAVO",
      "position": "bottom_right corner, 20px from edges",
      "font": "Inter Bold, 14px, #FFFFFF white",
      "icon_color": "#00A884 seafoam fish icon",
      "background": "pill #000000 at 50% opacity, border-radius 12px",
      "consistency": "IDENTICAL across all images"
    },
    "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
    "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "cartoonish", "illustration", "digital art"], "style_raw": true },
    "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, cartoon, illustration, digital art, oversaturated colors"
  }
```

### الشريحة 5 — الفضول يتغلب
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Canon EOS R6 Mark III, Canon RF 50mm f/1.2L USM lens, ISO 1250, f/2, 1/125s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Fish face MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph of a Betta fish cautiously emerging from behind a plant, looking up at fish food pellets slowly sinking from the surface",
    "secondary": "Arabic curious diary text"
  },
  "subject": {
    "main": "A real royal blue male Betta fighter fish halfway out of its hiding spot behind a Java fern leaf, body angled upward curiously. Its flowing red-tipped halfmoon fins trail behind it, partially still among the plant leaves. Above, real fish food micro-pellets are slowly sinking from the surface — tiny brown and reddish pellets with natural color variation, some still floating at the surface film, others drifting down through the water column catching the LED light. The human hand has withdrawn but residual surface ripples remain. The Betta's eye is focused upward, gill plates slightly moving. A few air bubbles still rising from the earlier hand disturbance. Water not yet fully settled",
    "text_overlay": {
      "arabic_text": "مرة واحدة باليوم تكفي — لا أكثر! ✅",
      "position": "center",
      "font_style": "Cairo Bold Arabic, white with golden shimmer",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "Real home planted aquarium, food falling from surface, Betta emerging from hiding",
    "lighting": {
      "type": "Aquarium LED from above, highlighting sinking food particles like tiny golden specks",
      "quality": "Natural LED light catching food pellets as they sink, creating tiny golden points of light against teal water"
    },
    "color_palette": {
      "dominant": "deep teal aquarium water",
      "accent": "golden-brown food pellets catching light, royal blue Betta emerging"
    }
  },
  "style": {
    "artistic": "hyper-realistic aquarium photography, behavioral feeding documentation",
    "camera": { "angle": "medium shot, Betta in lower frame emerging from plant, food pellets sinking in upper frame", "lens": "Canon RF 50mm f/1.2", "depth_of_field": "shallow, Betta sharp, food pellets at various depths of focus" },
    "mood": "curious, wonder, turning point, documentary",
    "realism_details": "food pellets have natural size variation and color (some brown, some reddish), surface film oil sheen where food was dropped, plant leaves with natural hair algae, residual turbulence in water from hand withdrawal, Betta's gill movement visible"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "cartoonish", "illustration", "digital art"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, cartoon, illustration, digital art, oversaturated colors, golden snow"
}
```

### الشريحة 6 — وقت الطعام!
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Sony A1, Sony FE 70-200mm f/2.8 GM OSS II at 200mm, ISO 3200, f/2.8, 1/500s, high-speed burst",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Action splash MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real high-speed photograph of a single Betta fighter fish lunging upward at food pellets near the water surface, dynamic feeding action",
    "secondary": "Arabic excited diary text"
  },
  "subject": {
    "main": "A real royal blue male Betta fighter fish swimming upward energetically toward floating micro-pellets at the water surface. The Betta is captured mid-lunge, body angled steeply upward, mouth slightly open about to grab a pellet. Its halfmoon red-tipped fins spread wide with the motion, showing natural translucency where light passes through the fin membranes. Micro-pellets scattered on the water surface — some still floating, some slowly sinking. The fish creates a visible wake in the water behind it. Small jet of water visibly expelled from gill flaps during the fast swim burst. One pellet about to be consumed. Water surface disturbed from the Betta's upward rush, creating tiny ripples",
    "text_overlay": {
      "arabic_text": "التغذية الصحيحة: حبيبات صغيرة + تنوع 🌿",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, yellow with energy glow",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "Real home planted aquarium, feeding time, Betta rushing to surface",
    "lighting": {
      "type": "Aquarium LED from above, bright at the surface where food is, highlighting the food pellets and the Betta's upward approach",
      "quality": "Natural overhead LED light, bright surface zone, darker below, no studio lights"
    },
    "color_palette": {
      "dominant": "teal aquarium water",
      "accent": "brown-gold food pellets catching light at surface shimmer"
    }
  },
  "style": {
    "artistic": "hyper-realistic high-speed aquarium photography, feeding behavior documentation",
    "camera": { "angle": "low angle looking up at Betta rushing toward surface, shot through side glass", "lens": "Sony 200mm f/2.8 telephoto", "depth_of_field": "shallow, Betta head and approaching pellet tack sharp, tail fins showing slight motion blur" },
    "mood": "joyful, energetic, comedic revelation, documentary",
    "realism_details": "water wake behind fast-swimming Betta, gill jet visible, food pellets have varied sizes and colors (brown/dark red), surface oil film slightly broken where fish disturbs surface, plant leaves rocking from water displacement"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "cartoonish", "illustration", "digital art", "multiple fish"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, cartoon, illustration, digital art, multiple fish, other fish species, oversaturated colors"
}
```

### الشريحة 7 — السلام بعد العاصفة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Nikon Z5, Nikon NIKKOR Z 85mm f/1.8 S lens, ISO 800, f/2, 1/100s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Sleeping fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph of a satisfied Betta fighter fish floating peacefully after eating, warm evening aquarium lighting, calm planted tank",
    "secondary": "Arabic satisfied diary text"
  },
  "subject": {
    "main": "A real royal blue male Betta fighter fish floating peacefully alone in a home planted aquarium after eating. The Betta has a naturally slightly rounded belly from the meal, visible in profile. Its flowing red-tipped halfmoon fins trail gently in the calm water, fully relaxed. The fish drifts lazily in mid-water, body slightly tilted as if resting. Warm evening aquarium LED light creates a golden ambiance. A tiny nerite snail on the glass nearby, its zigzag grazing trail faintly visible on the glass. A few uneaten food pellets resting on the gravel below. Live plants gently swaying. Water is calm and clear now. Natural gravel with scattered food debris and mulm",
    "text_overlay": {
      "arabic_text": "سمكة صحية = ألوان زاهية وحركة نشيطة 💙",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, warm white",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "Real home planted aquarium, calm evening after feeding, warm lighting",
    "lighting": {
      "type": "Aquarium LED set to warm evening mode (slightly dimmer, amber tone) combined with fading natural window light",
      "quality": "Warm, soft, peaceful evening ambiance, golden undertones, no harsh studio lights"
    },
    "color_palette": {
      "dominant": "warm teal aquarium water with golden evening tones",
      "accent": "warm golden highlights on Betta's scales and fins"
    }
  },
  "style": {
    "artistic": "hyper-realistic aquarium photography, peaceful evening portrait documentary",
    "camera": { "angle": "medium close-up through glass, Betta in profile showing rounded belly", "lens": "Nikon Z 85mm f/1.8", "depth_of_field": "shallow, Betta sharp, plants and snail softly blurred" },
    "mood": "peaceful, warm, satisfying conclusion, documentary contentment",
    "realism_details": "slightly rounded belly visible from meal, uneaten pellets on gravel, nerite snail trail on glass, natural water surface reflection on underside of lid, slight condensation on glass from warm water, evening room light gradient"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "cartoonish", "illustration", "digital art"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, cartoon, illustration, digital art, oversaturated colors"
}
```

### الشريحة 8 — الدرس (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography with text overlay",
  "camera_setup": "Canon EOS R5, RF 35mm f/1.4L VCM lens, ISO 400, f/1.4, 1/200s — heavily blurred aquarium as background",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Text and overlay MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place all text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Educational closing slide about fish feeding rules, with blurred real aquarium and sinking food pellets as cinematic background",
    "secondary": "Arabic educational text with save CTA"
  },
  "subject": {
    "main": "A heavily blurred (f/1.4 bokeh) real aquarium scene as background — out-of-focus green plants, soft blue water, and warm bokeh circles from aquarium LED. Blurred food pellets visible drifting in the water as soft golden dots. In the foreground, a small container of fish food pellets slightly out of focus, establishing the feeding theme. Text overlay goes on top of this cinematic blurred background with semi-transparent dark overlay for readability",
    "text_overlay": {
      "arabic_title": "💡 الدرس:",
      "arabic_text": "لا تطعم سمكتك أكثر من مرة بالیوم! 🐟",
      "arabic_question": "❓ شنو أكبر خطأ سوّيته وأنت مبتدئ بتربية السمك؟ احكيلنا!",
      "arabic_cta": "💾 هالمعلومة تنقذ سمكتك — احفظها الحين! | 📤 ارسله لصاحبك اللي عنده حوض!",
      "arabic_dm": "💬 أرسلنا 'دليل' بالخاص ونرسلك دليل المبتدئين مجاناً! 📖",
      "arabic_emoji_vote": "اكتب 🐟 إذا عندك حوض / 🤩 إذا تبي تشتري واحد!",
      "arabic_next": "➡️ الدليل القادم: الحرارة الغلط 🌡️ | ⬅️ تابعنا لكل الأدلة",
      "position": "center_vertical",
      "font_style": "Cairo Bold Arabic, white on semi-transparent dark overlay, CTA in #00A884 green",
      "font_size": "large"
    }
  },
  "environment": { "setting": "Real aquarium heavily blurred as bokeh background, semi-transparent dark overlay for text", "lighting": { "type": "Aquarium LED creating warm bokeh circles in blurred background", "quality": "Natural, warm, soft focus" } },
  "style": { "artistic": "hyper-realistic photography with editorial text overlay, magazine style", "mood": "educational, trustworthy, professional, actionable" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "flat gradient", "clip art", "stock photo feel", "cartoonish"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, flat gradient, clip art, generic stock photo, cartoon, illustration"
}
```

---

## 🎬 الدليل 2: "الحرارة الغلط تقتل سمكتك" 🌡️

### الشريحة 1 — الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Canon EOS R5, Sigma 105mm f/2.8 DG DN Macro Art lens, ISO 1600, f/4, 1/125s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph of a stressed Betta fish in a cold aquarium, shot through slightly dirty glass with visible condensation and water droplets",
    "secondary": "Arabic dramatic title with frozen effect"
  },
  "subject": {
    "main": "A real royal blue male Betta fighter fish huddling near the bottom of a home aquarium, alone, looking lethargic. Its normally flowing halfmoon red-tipped fins are clamped tight against its body. The fish's scales show natural imperfections and slight color fading from stress. Frost-like condensation droplets on inside glass edges. Water has a cold blue-grey cast with fine particles floating. A glass thermometer suction-cupped to the tank wall reads 18°C. Live plants showing slight browning and wilting from cold. Thin layer of natural sediment on the gravel substrate. Slight algae film on the glass edges",
    "text_overlay": {
      "arabic_text": "الحرارة الغلط تقتل سمكتك 🌡️",
      "arabic_subtitle": "دليل الصدمة الحرارية — Thermal Shock",
      "position": "center",
      "font_style": "Cairo Bold Arabic, white with ice-blue frozen effect",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "A real home aquarium in a cold room, natural imperfect setting",
    "lighting": {
      "type": "Natural aquarium LED strip lighting from above, muted and cold",
      "quality": "Soft cold white LED, no harsh studio lights, natural water shimmer, ambient room light barely visible"
    },
    "color_palette": { "dominant": "desaturated cold blue-grey", "accent": "pale teal undertones, muted fish colors" }
  },
  "style": {
    "artistic": "hyper-realistic aquarium photography, editorial documentary style",
    "camera": { "angle": "eye-level through glass, slight reflection visible on glass surface", "lens": "Sigma 105mm f/2.8 Macro", "depth_of_field": "shallow, fish sharp, background slightly soft" },
    "mood": "cold, quiet, documentary, empathetic",
    "realism_details": "water surface visible at top, slight refraction distortion through curved glass edges, micro air bubbles on glass, fingerprint smudge barely visible on glass"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors, studio backdrop"
}
```

### الشريحة 2 — الإحساس بالبرد
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Nikon Z8, Laowa 100mm f/2.8 2X Ultra Macro APO lens, ISO 2000, f/3.5, 1/160s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Fish eye/head MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "Extreme macro photograph of a real stressed Betta fish with clamped fins, shot through aquarium glass with visible water impurities", "secondary": "Arabic diary text about feeling cold" },
  "subject": {
    "main": "Extreme macro close-up of a real royal blue male Betta fighter fish with clamped halfmoon red-tipped fins, pale faded colors from cold stress, and dull listless eyes. The fish hovers near the bottom gravel, barely moving. Its fins are pressed tight against its body showing stress striping on scales. Water looks cold with visible suspended particles and slight cloudiness. A glass thermometer suction-cupped in the blurred background reads 18°C with red danger marking. Fine algae dusting on nearby glass. Natural gravel substrate with debris",
    "text_overlay": { "arabic_text": "الصدمة الحرارية تقتل خلال ساعات ⚠️", "arabic_subtitle": "انخفاض مفاجئ = خطر حقيقي", "position": "bottom_center", "font_style": "Cairo Bold Arabic, white with blue ice shimmer", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium in a cold room, natural unpolished setting", "lighting": { "type": "Dim aquarium LED from above, cold white spectrum", "quality": "Muted cold white LED, no warm tones, natural water surface reflections from above" }, "color_palette": { "dominant": "desaturated cold blue-grey", "accent": "pale washed-out fish colors" } },
  "style": { "artistic": "hyper-realistic macro aquarium photography, documentary style", "camera": { "angle": "macro close-up through glass, slight glass reflection visible", "lens": "Laowa 100mm f/2.8 Macro", "depth_of_field": "extremely shallow, fish eye tack sharp, body falls off into soft blur" }, "mood": "cold, sad, documentary, empathetic", "realism_details": "individual scale texture visible, micro scratches on glass, water refraction at glass edge, condensation on outer glass from cold" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors, studio backdrop"
}
```

### الشريحة 3 — العصر الجليدي
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Sony A7R V, Sony FE 50mm f/1.4 GM lens, ISO 1600, f/2.8, 1/100s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Fish in corner MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "A real photograph of a lone Betta fish curled up in the corner of a cold aquarium, shot eye-level through slightly dirty glass", "secondary": "Arabic dramatic cold text" },
  "subject": {
    "main": "A real royal blue male Betta fighter fish with clamped halfmoon fins curled up alone at the bottom corner of a home aquarium, trying to conserve warmth. Its usually vibrant royal blue color looks pale, faded and washed-out from cold stress. Red-tipped fins limp and pressed against gravel. Live plants around it showing browning leaf edges and slight algae on stems. A small nerite snail motionless on the nearby glass with visible trail mark. Natural gravel with scattered detritus and a thin biofilm layer. Cold grey-blue water with fine suspended particles. Condensation droplets on inside glass corner",
    "text_overlay": { "arabic_text": "الأسماك الاستوائية تحتاج 24-28°C — دائماً 🌡️", "position": "top_center", "font_style": "Cairo Bold Arabic, white with frost effect", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium corner, natural imperfect setting with visible water line stains", "lighting": { "type": "Dim aquarium LED from above, cold white", "quality": "Soft cold overhead LED, no harsh studio lights, faint ambient room light from side, natural water surface shimmer" }, "color_palette": { "dominant": "desaturated blue-grey cold", "accent": "pale washed-out fish colors, brownish plant tips" } },
  "style": { "artistic": "hyper-realistic aquarium photography, observational documentary style", "camera": { "angle": "eye-level through corner glass, slight double-reflection from corner join visible", "lens": "Sony 50mm f/1.4 GM", "depth_of_field": "shallow, fish sharp, far corner soft" }, "mood": "cold, lonely, documentary, sympathetic", "realism_details": "glass corner silicone seal visible, water level line with mineral deposits, micro air bubbles trapped on glass surface, slight dust on aquarium rim" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "actual snow"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors, studio backdrop"
}
```

### الشريحة 4 — الحنين للدفء
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Fujifilm GFX 100S, GF 80mm f/1.7 R WR lens, ISO 1250, f/2, 1/80s, double exposure composite",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Split line MUST be distinct. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "A real double-exposure style photograph: cold Betta at bottom fading into a warm golden memory of the same tank, editorial aquarium photography", "secondary": "Arabic nostalgic text" },
  "subject": {
    "main": "Split composition using real double-exposure photography technique: BOTTOM HALF shows the real cold scene — the royal blue male Betta fighter fish huddled near gravel in cold grey-blue water, fins clamped, color faded, surrounded by wilting plants and suspended particles. TOP HALF dissolves into a warmer double-exposure memory — the same tank bathed in natural golden afternoon sunlight streaming through a window, lush green healthy plants, warm amber water tone. The transition between cold reality and warm memory is a gradual photographic blend, not a cartoon bubble. Shot through glass with visible water level line at the transition point"
  },
  "text_overlay": { "arabic_text": "الحرارة المستقرة = سمك صحي وألوان زاهية 🌟", "position": "center between zones", "font_style": "Cairo Bold Arabic, warm gold for memory, cold blue for reality", "font_size": "medium" },
  "environment": { "setting": "Real home aquarium, double-exposure composite of two states of the same tank", "lighting": { "type": "Bottom: dim cold LED. Top: natural golden window light from memory", "quality": "Naturalistic contrast, cold LED below transitioning to warm afternoon sun above, no studio lights" } },
  "style": { "artistic": "hyper-realistic editorial aquarium photography, double-exposure technique", "camera": { "angle": "front-facing through glass, eye-level", "lens": "GF 80mm f/1.7", "depth_of_field": "moderate, both zones slightly soft at blend point" }, "mood": "nostalgic, melancholic, documentary, emotionally layered", "realism_details": "water surface creates the natural division line, mineral deposits visible at water line, glass rim with slight water spots, natural refraction at glass edges" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy bubble", "thought bubble", "anime"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, thought bubble, dream bubble, oversaturated colors"
}
```

### الشريحة 5 — البحث عن مصدر حرارة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Canon EOS R6 Mark II, Canon RF 50mm f/1.2L USM lens, ISO 1600, f/2.2, 1/125s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Heater and fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "A real photograph of a Betta fish inspecting a turned-off aquarium heater, shot through glass with natural imperfections", "secondary": "Arabic hopeful text" },
  "subject": {
    "main": "The real royal blue male Betta fighter fish swimming up alone to inspect a turned-off submersible aquarium heater (cylindrical glass type with suction cups). The Betta hovers right next to the heater tube, looking at it with its halfmoon red-tipped fins drooping listlessly. The heater's LED power indicator is clearly OFF (no glow). Visible calcium buildup on the heater glass tube. Suction cup marks and slight algae ring where the heater meets the glass wall. Heater power cord trailing upward out of frame. Natural gravel below with debris. Water slightly hazy with suspended particles",
    "text_overlay": { "arabic_text": "السخان مو رفاهية — ضرورة حياة! 🔌✅", "position": "bottom_center", "font_style": "Cairo Bold Arabic, white", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium, focus on heater equipment area with natural wear and tear", "lighting": { "type": "Dim cold aquarium LED from above, heater area dark and inactive", "quality": "Muted cold white LED, no warm glow from heater, ambient room light barely visible through back glass" } },
  "style": { "artistic": "hyper-realistic aquarium photography, equipment detail documentary", "camera": { "angle": "medium shot through glass, fish and heater both in frame, slight glass reflection", "lens": "Canon RF 50mm f/1.2L", "depth_of_field": "moderate, fish and heater sharp, background soft" }, "mood": "hopeful, melancholic, problem discovery, documentary", "realism_details": "heater suction cup deformation visible, power cord with water droplets, calcium ring on heater tube, slight water surface distortion at top of frame" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors, studio backdrop"
}
```

### الشريحة 6 — المنقذ! السخان يعمل
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Nikon Z9, Nikon NIKKOR Z 50mm f/1.2 S lens, ISO 1250, f/2, 1/100s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Glowing heater MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "A real photograph of an aquarium heater that just turned on — warm orange indicator glowing, Betta fish swimming near it, realistic heat convection visible in water", "secondary": "Arabic joy and relief text" },
  "subject": {
    "main": "A real submersible aquarium heater now ON — glowing with a small warm orange-red LED indicator light visible through the water. Subtle heat convection waves (schlieren effect) radiating from the heater into the surrounding water, visible as slight water distortion. The royal blue male Betta fighter fish hovering right next to it, basking in the warmth, its halfmoon red-tipped fins just starting to relax and unfurl slightly. Water immediately around the heater has a very subtle warm tint while further areas still retain cold blue-grey cast. Tiny micro bubbles forming on the heater surface from the temperature change. Calcium deposits visible on the heater tube. Suction cups slightly yellowed with age. Power cord running up and out of frame",
    "text_overlay": { "arabic_text": "اختار سخان بمؤقت وثيرموستات داخلي 🌡️✅", "position": "center", "font_style": "Cairo Bold Arabic, warm orange with glow", "font_size": "large" }
  },
  "environment": { "setting": "Real home aquarium, heater just activated, transitional moment", "lighting": { "type": "Cold aquarium LED from above with warm orange point-light from heater indicator", "quality": "Mixed temperature — cold ambient LED plus warm localized heater glow, no studio lights, natural water surface shimmer" }, "color_palette": { "dominant": "transitioning cold blue-grey to subtle warmth near heater", "accent": "small orange-red LED glow on heater" } },
  "style": { "artistic": "hyper-realistic aquarium photography, turning-point documentary moment", "camera": { "angle": "close-up through glass, fish and glowing heater both in frame, glass reflection visible", "lens": "Nikon Z 50mm f/1.2 S", "depth_of_field": "moderate, heater LED and fish sharp, background soft" }, "mood": "relief, warmth returning, documentary, hopeful", "realism_details": "heat shimmer distortion in water near heater visible as wavy refraction, micro bubbles nucleating on heater surface, calcium ring where water line was, condensation clearing on outer glass" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "actual fire", "flames"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, fire, flames, oversaturated colors, studio backdrop"
}
```

### الشريحة 7 — الدفء يعود
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Sony A1, Sony FE 90mm f/2.8 Macro G OSS lens, ISO 800, f/3.2, 1/160s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "A real photograph of a healthy, active Betta fish swimming proudly in a warm aquarium with a thermometer reading 26°C, natural afternoon lighting", "secondary": "Arabic happy relief text" },
  "subject": {
    "main": "A real royal blue male Betta fighter fish swimming actively and confidently in a warm home aquarium. Its halfmoon red-tipped fins are fully spread and flowing beautifully, showing their full span. Vivid royal blue body with natural iridescent scale shimmer — not CGI perfection, but real fish coloring with slight natural variations. The Betta looking slightly toward the camera. A glass thermometer suction-cupped to the wall prominently shows 26°C in the green safe zone. Live plants look healthy and green with natural minor imperfections (a yellowing lower leaf, slight algae on older stems). Water is clear but not impossibly pristine — a few floating particles visible in the light beam. Natural gravel substrate with a thin scattering of plant debris",
    "text_overlay": { "arabic_text": "26°C — الحرارة المثالية لأغلب الأسماك 🌡️✅", "position": "bottom_center", "font_style": "Cairo Bold Arabic, warm white with golden glow", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium, warm and healthy, natural afternoon setting", "lighting": { "type": "Warm aquarium LED from above combined with natural afternoon window light from the side", "quality": "Warm white LED with golden side-light from window, soft water surface shimmer, no studio lights, natural water caustics on substrate" }, "color_palette": { "dominant": "healthy warm teal-green", "accent": "golden light highlights, vivid fish blue" } },
  "style": { "artistic": "hyper-realistic aquarium photography, warm happy documentary moment", "camera": { "angle": "medium shot through glass at eye-level, slight warm glass reflection visible", "lens": "Sony 90mm f/2.8 Macro", "depth_of_field": "moderate, fish tack sharp, thermometer readable, background softly blurred" }, "mood": "warm, content, satisfying, documentary", "realism_details": "water surface light ripples casting caustic patterns on gravel, slight water spots on glass from previous cold condensation (now dried), heater glowing in background out of focus, natural light gradient from left (window) to right (darker)" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, oversaturated colors, studio backdrop, impossibly clean water"
}
```

### الشريحة 8 — الدرس (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography with text overlay",
  "camera_setup": "Canon EOS R5, RF 35mm f/1.4L VCM lens, ISO 400, f/1.4, 1/200s — heavily blurred background shot of real aquarium",
  "priority": { "primary": "Educational closing slide about aquarium heater importance with blurred real aquarium as background", "secondary": "Arabic heater tips with strong save CTA" },
  "subject": {
    "main": "A heavily blurred (f/1.4 bokeh) real aquarium scene as background — out-of-focus warm green plants, soft blue water, and a barely visible glowing heater creating warm bokeh circles. In the foreground, a real glass thermometer held by a human hand at slight angle, reading 26°C with the green safe zone clearly visible. The text overlay goes on top of this cinematic blurred background",
    "text_overlay": {
      "arabic_title": "💡 الدرس:",
      "arabic_text": "السخان = حياة أو موت! 🌡️",
      "arabic_tips": "✅ الحرارة المثالية: ٢٤-٢٨°C | ✅ استخدم سخان بمؤقت | ✅ دير بالك عالحرارة كل يوم",
      "arabic_question": "❓ شنو أخطر موقف صار ويّاك بحوضك؟ احكيلنا!",
      "arabic_cta": "💾 هالمعلومة ما كل الناس تعرفها — احفظها! | 📤 ارسله لصاحبك اللي عنده حوض!",
      "arabic_dm": "💬 أرسلنا 'سخان' بالخاص ونساعدك تختار السخان المناسب!",
      "position": "center_vertical",
      "font_style": "Cairo Bold Arabic, white on semi-transparent dark overlay",
      "font_size": "large"
    }
  },
  "environment": { "setting": "Real aquarium heavily blurred as bokeh background, semi-transparent dark overlay for text readability", "lighting": { "type": "Warm aquarium LED creating soft bokeh circles in background", "quality": "Natural, warm, soft focus" } },
  "style": { "artistic": "hyper-realistic photography with editorial text overlay, magazine style", "mood": "educational, warm, professional, actionable" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "flat gradient", "clip art", "stock photo feel", "cartoonish"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, flat gradient, clip art, generic stock photo, cartoon, illustration"
}
```

---

## 🎬 الدليل 3: "حماية الحوض من القطط" 🐈

### الشريحة 1 — الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Sony A7 IV, Sony FE 50mm f/1.4 GM lens, ISO 3200, f/2, 1/100s, low-light handheld",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Cat face and fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Cat face and fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph of a cat's face pressed against aquarium glass from the fish's POV inside the tank. Cat's features distorted through wet glass with nose prints and breath fog",
    "secondary": "Arabic horror-comedy title overlay"
  },
  "subject": {
    "main": "A real photograph shot from inside a home aquarium looking outward through the glass. A real tabby cat's face is pressed flat against the outside of the glass — its nose squished, whiskers bent against the surface, eyes wide and fixated with natural golden-yellow iris reflection from the tank LED. Cat's features are slightly distorted through the curved glass edge and water refraction. Visible nose print smudge and breath condensation on the glass where the cat is pressing. In the foreground inside the water, a real royal blue male Betta fighter fish with red-tipped halfmoon fins flared defensively, positioned lower in the frame. Natural paw print smudges on the glass around the cat's face from previous visits. Fine floating particles in water catching the LED light"
  },
  "text_overlay": {
    "arabic_text": "حماية الحوض من القطط 🐈🐟",
    "arabic_subtitle": "نصائح عملية لكل مربي",
    "position": "top_center",
    "font_style": "Cairo Bold Arabic, white with orange glow matching cat eyes",
    "font_size": "large"
  },
  "environment": {
    "setting": "Real home aquarium at evening, dim room with aquarium LED as primary light source",
    "lighting": {
      "type": "Aquarium LED strip from above reflecting in cat's eyes, dim ambient room light",
      "quality": "Natural low-light, cat's eyes catching tank LED reflection, no studio lights, natural water surface shimmer",
      "direction": "from above (aquarium LED) creating bottom-up illumination on cat's face through water"
    }
  },
  "style": {
    "artistic": "hyper-realistic pet vs aquarium photography, candid documentary moment",
    "camera": {
      "angle": "from inside tank looking out through glass at cat, eye-level with fish",
      "lens": "Sony 50mm f/1.4 GM",
      "depth_of_field": "shallow — Betta in foreground slightly soft, cat face sharp through glass, or vice versa"
    },
    "mood": "tense, humorous, candid documentary, relatable for pet owners",
    "realism_details": "cat whisker shadows on glass, nose smudge with moisture, old dried water spots on outer glass, slight algae in corner of glass, tank silicone seal visible at edge, ambient room furniture barely visible through cat silhouette"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "glowing supernatural eyes"],
    "style_raw": true
  },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, supernatural glow, oversaturated colors, studio backdrop"
}
```

### الشريحة 2 — الترصّد
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Canon EOS R3, Canon RF 35mm f/1.4L VCM lens, ISO 6400, f/1.8, 1/60s, low-light handheld",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Cat silhouette and fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real low-light photograph from inside an aquarium: cat's dark silhouette crouching behind the glass with eye-shine from tank LED, Betta fish nervously watching",
    "secondary": "Arabic suspense diary text"
  },
  "subject": {
    "main": "Shot from inside a real home aquarium looking outward through the glass into a dim room. A real tabby cat's dark silhouette is crouching low behind the aquarium, only its two eyes visible catching the tank LED — natural golden eye-shine (tapetum lucidum reflection), not supernatural glow. Faint outline of cat's ears and whiskers. Inside the tank, the royal blue male Betta fighter fish swimming nervously near a plant, fins twitching slightly. Tank LED is the only light source creating an eerie blue-green underwater glow. Room furniture faintly visible as dark shapes behind the cat. Old nose prints and paw smudges on the glass",
    "text_overlay": { "arabic_text": "القطط مفترسة بالغريزة — لازم تحمي حوضك 🐱⚠️", "position": "bottom_center", "font_style": "Cairo Bold Arabic, white with eerie glow", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium at night, dark room, tank LED only light source", "lighting": { "type": "Aquarium LED from above as sole light source, catching cat's retinal reflection", "quality": "Very low ambient light, high ISO grain visible, natural aquarium LED casting blue-green underwater glow, cat only visible by eye-shine" }, "color_palette": { "dominant": "deep dark teal aquarium glow", "accent": "golden cat eye-shine points" } },
  "style": { "artistic": "hyper-realistic low-light aquarium photography, candid night documentary", "camera": { "angle": "from inside tank looking outward through glass at cat silhouette, fish eye-level", "lens": "Canon RF 35mm f/1.4L", "depth_of_field": "moderate, fish in focus, cat silhouette slightly soft through glass" }, "mood": "suspenseful, quiet, eerie-humorous, candid documentary", "realism_details": "visible high-ISO noise grain from low light, cat eye-shine is natural tapetum reflection not supernatural, filter intake tube and heater visible at tank edges, water surface reflection on underside of lid, slight green algae on glass corner" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "supernatural glowing eyes", "horror movie effects"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, supernatural glow, horror effects, oversaturated colors"
}
```

### الشريحة 3 — الضربة!
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Nikon Z8, Nikon NIKKOR Z 50mm f/1.2 S lens, ISO 4000, f/1.8, 1/500s, high-speed burst capture",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Impact point and fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph from inside an aquarium: cat's paw pressing against the glass seen from underwater, paw pads visible through glass, water vibration ripples",
    "secondary": "Arabic shock text with action feel"
  },
  "subject": {
    "main": "A real orange tabby cat's paw pressed hard against aquarium glass, seen from inside the water looking outward. Paw pads clearly visible through the glass — pink toe beans, fur texture, slight claw tips. Water vibration ripples spreading from the impact point across the water surface. The royal blue male Betta fighter fish darting away in panic with motion blur on its trailing halfmoon fins. Fine sediment kicked up from the gravel bottom from water vibration. Paw print smudge forming on the glass in real-time. The cat's chin and whiskers faintly visible above the paw. Previous old paw and nose smudges on the glass nearby",
    "text_overlay": { "arabic_text": "الضربات المتكررة تسبب إجهاد مزمن للأسماك 💥⚠️", "position": "center", "font_style": "Cairo Bold Arabic, red with impact shake effect", "font_size": "extra large" }
  },
  "environment": { "setting": "Real home aquarium, sudden action moment, cat striking glass", "lighting": { "type": "Aquarium LED from above with ambient room light from behind cat", "quality": "Natural tank LED illuminating paw from below through water, room light backlighting cat's arm, no flash used, natural motion blur from action" }, "color_palette": { "dominant": "teal-green aquarium water", "accent": "orange cat fur through glass, disturbed sediment cloud" } },
  "style": { "artistic": "hyper-realistic high-speed aquarium photography, action documentary moment", "camera": { "angle": "from inside tank looking up at paw on glass, fish darting away in lower frame", "lens": "Nikon Z 50mm f/1.2 S", "depth_of_field": "shallow, paw pads tack sharp on glass, fish has slight motion blur from fleeing", "shutter_speed": "1/500s freezing water ripples" }, "mood": "shocking, sudden, comedic-dramatic, candid action", "realism_details": "water surface vibration rings from impact, fine gravel particles suspended in water from shock, cat's fur texture visible through glass, old dried water drips on outer glass, tank thermometer slightly swinging from vibration" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "cracked glass", "broken glass"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, cracked glass, broken glass, oversaturated colors, studio flash"
}
```

### الشريحة 4 — الهروب الجماعي
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Fujifilm X-T5, Fujinon XF 56mm f/1.2 R WR lens, ISO 3200, f/2, 1/250s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Fleeing fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph of a single Betta fish pressed against the far glass of an aquarium, as far from the cat side as possible, shot through the side glass",
    "secondary": "Arabic panic diary text"
  },
  "subject": {
    "main": "The royal blue male Betta fighter fish pressed flat against the far side glass of a real home aquarium, as far from where the cat was as possible. Its halfmoon red-tipped fins tucked tight, body angled defensively. Shot through the side glass showing the full width of the tank — empty open water on the cat side (near glass), the lone Betta cowering on the opposite far side. The fish looks small and vulnerable in the wide empty tank. Natural gravel substrate with a trail of disturbed sediment showing the fish's panicked swim path. A filter intake tube visible at one end. Plants slightly disturbed from the commotion. Floating particles still settling in the water",
    "text_overlay": { "arabic_text": "الإجهاد = ضعف مناعة + أمراض 💔🐟", "position": "top_center", "font_style": "Cairo Bold Arabic, white with motion blur", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium, wide shot showing full tank divide between danger side and safe side", "lighting": { "type": "Aquarium LED from above, slightly brighter on the cat side, dimmer on the far hiding side", "quality": "Natural tank LED, uneven light distribution across tank length, no studio lights" }, "color_palette": { "dominant": "deep teal tank water", "accent": "lone blue fish against far glass, muted colors from stress" } },
  "style": { "artistic": "hyper-realistic aquarium photography, wide establishing documentary shot", "camera": { "angle": "side view through glass showing full tank width, slightly low angle", "lens": "Fujifilm XF 56mm f/1.2", "depth_of_field": "deep enough to show full tank depth, fish sharp at far side" }, "mood": "panicked, lonely, vulnerable, comedic-relatable", "realism_details": "silicone seam visible at glass joins, water level line with slight mineral buildup, heater and thermometer visible as tank furniture, cat's tail shadow faintly visible on near glass, slight algae on gravel" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, multiple fish, other fish species, oversaturated colors"
}
```

### الشريحة 5 — خطة الدفاع
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Canon EOS R5, Canon RF 100mm f/2.8L Macro IS USM lens, ISO 2500, f/3.5, 1/200s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Flaring fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real macro photograph of a Betta fighter fish in full aggressive flare display facing a blurred cat nose pressed against the glass behind it",
    "secondary": "Arabic brave hero diary text"
  },
  "subject": {
    "main": "A magnificent real royal blue male Betta fighter fish in full aggressive display — gill opercula flared wide showing the red membrane underneath, all halfmoon fins extended to maximum span, body turned sideways in classic Betta threat posture. The fish faces a blurred cat's nose and whiskers pressed against the outside glass behind it. Shot in profile from the side showing the dramatic size contrast — tiny brave fish vs massive predator blur. The Betta's iridescent blue scales shimmer with natural color variation. Individual fin rays visible in the extended fins. Natural water column with some floating particles. Glass between the fish and cat shows old paw smudges and nose prints",
    "text_overlay": { "arabic_text": "غطاء محكم = حماية دائمة 🛡️✅", "position": "bottom_center", "font_style": "Cairo Bold Arabic, white with heroic glow", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium, Betta defending territory against cat through glass", "lighting": { "type": "Aquarium LED from above spotlighting the Betta, cat side dimmer", "quality": "Natural tank LED creating iridescent shimmer on Betta's scales, light bleeding through extended fin membranes, no studio lights" }, "color_palette": { "dominant": "deep teal aquarium water", "accent": "vivid royal blue and red of Betta's full flare display" } },
  "style": { "artistic": "hyper-realistic macro aquarium photography, behavioral documentation", "camera": { "angle": "side profile of Betta in flare display, cat blurred behind glass in background", "lens": "Canon RF 100mm f/2.8L Macro", "depth_of_field": "shallow, Betta tack sharp, cat nose and whiskers soft bokeh through glass" }, "mood": "heroic, comedic, inspiring, brave absurdity", "realism_details": "individual gill membrane texture visible during flare, fin rays casting micro shadows, natural scale pattern irregularities, slight water current moving fin edges, glass double reflection between fish and cat" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "multiple fish"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, multiple fish, other fish species, oversaturated colors"
}
```

### الشريحة 6 — الإلهاء
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Sony A7C II, Sony FE 40mm f/2.5 G lens, ISO 2000, f/2.5, 1/80s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph from inside an aquarium: the cat is now turning away from the glass, distracted by something in the room, tail and backside visible through glass",
    "secondary": "Arabic relief diary text"
  },
  "subject": {
    "main": "Shot from inside a real home aquarium looking outward through the glass. The tabby cat is now turning its head away from the tank, ears perked toward something else in the room — only the cat's fluffy tail, backside, and one ear visible through the glass in soft focus. The royal blue male Betta fighter fish inside the tank has stopped fleeing and is hovering cautiously in mid-water, fins still slightly clamped but starting to relax, watching the departing cat with its body angled toward the glass. The fish looks confused and relieved simultaneously. Old nose and paw prints still visible on the glass where the cat was pressing. Natural room light starting to come in from the side as the cat's body no longer blocks it",
    "text_overlay": { "arabic_text": "حط الحوض بمكان مرتفع ومستقر 🏠✅", "position": "bottom_center", "font_style": "Cairo Bold Arabic, white with relief tones", "font_size": "medium" }
  },
  "environment": { "setting": "Real home aquarium, cat turning away, danger passing", "lighting": { "type": "Aquarium LED from above with warm room ambient light now visible as cat moves away", "quality": "Transitioning from tense dark to slightly brighter as cat's shadow leaves the glass, natural warm room glow mixing with cool tank LED" }, "color_palette": { "dominant": "teal aquarium glow", "accent": "warm room light bleeding in, cat fur blur" } },
  "style": { "artistic": "hyper-realistic aquarium photography, candid relief moment documentary", "camera": { "angle": "from inside tank looking outward through glass at departing cat", "lens": "Sony FE 40mm f/2.5 G", "depth_of_field": "moderate, Betta sharp in mid-water, cat tail soft blur through glass" }, "mood": "relieved, confused, comedic aftermath, tension dissolving", "realism_details": "cat's departing shadow fading from glass, fresh smudge marks where cat was just pressing, water settling from earlier disturbance, glass surface imperfections, room furniture visible in background through glass" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "multiple fish", "tetra", "other fish species"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, multiple fish, other fish species, tetra, oversaturated colors"
}
```

### الشريحة 7 — النصر!
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography",
  "camera_setup": "A candid photograph shot on Nikon Z6 III, Nikon NIKKOR Z 85mm f/1.2 S lens, ISO 1000, f/2, 1/160s",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Victorious fish MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "A real photograph of the Betta fish swimming proudly with fully extended fins after the cat has left, peaceful calm aquarium, no cat visible",
    "secondary": "Arabic victory diary text"
  },
  "subject": {
    "main": "A real royal blue male Betta fighter fish swimming in proud, relaxed victorious circles in middle-water with its halfmoon red-tipped fins fully spread and flowing gracefully. The fish is alone in a real home aquarium that is now calm and peaceful again — no cat visible anywhere. Air bubbles rising naturally from the filter outflow, not like confetti but like a gentle bubble stream. Live plants looking lush, gently swaying in the filter current. A tiny nerite snail motionless on the glass in the background, its trail visible on the glass. Water is now settling and clearer after the disturbance. Natural gravel with slightly disturbed patches from earlier panic. The glass still has the cat's paw and nose smudges from earlier as residual evidence",
    "text_overlay": { "arabic_text": "حوض آمن = سمك هادي وألوان زاهية 💙✨", "position": "center", "font_style": "Cairo Bold Arabic, gold with confetti feel", "font_size": "large" }
  },
  "environment": { "setting": "Real home aquarium, peaceful calm after the storm, warm daytime lighting", "lighting": { "type": "Aquarium LED at full brightness combined with warm natural daylight from nearby window", "quality": "Warm, bright, full tank illumination, light playing on the Betta's iridescent scales, water surface shimmer casting caustic patterns on substrate" }, "color_palette": { "dominant": "bright healthy teal-green aquarium", "accent": "vivid royal blue and red of relaxed Betta fins, warm golden highlights" } },
  "style": { "artistic": "hyper-realistic aquarium photography, peaceful celebration documentary", "camera": { "angle": "medium shot through glass showing happy active Betta in well-lit tank", "lens": "Nikon Z 85mm f/1.2 S", "depth_of_field": "moderate, Betta sharp, snail and background plants softly blurred" }, "mood": "victorious, peaceful, relieved, warm humor", "realism_details": "residual cat smudges on glass from earlier, filter outflow creating gentle surface ripple, nerite snail trail on glass, slightly disturbed gravel patches, natural dust on aquarium rim, water level line visible" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "drawing", "unreal engine", "perfect textures", "exaggerated features", "cartoonish", "illustration", "digital art", "fantasy", "anime", "multiple fish", "confetti"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, drawing, unreal engine, perfect textures, exaggerated features, cartoon, illustration, digital art, multiple fish, confetti, party decorations, oversaturated colors"
}
```

### الشريحة 8 — الدرس (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic photography with text overlay",
  "camera_setup": "Canon EOS R5, RF 35mm f/1.4L VCM lens, ISO 800, f/1.4, 1/200s — heavily blurred aquarium with cat silhouette as background",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Text and overlay MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place all text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Educational closing slide about keeping cats away from aquariums, with blurred real aquarium and faint cat silhouette as cinematic background",
    "secondary": "Arabic safety tip with save CTA"
  },
  "subject": {
    "main": "A heavily blurred (f/1.4 bokeh) real aquarium scene as background — soft blue-green water glow, out-of-focus plants, and warm bokeh circles from tank LED. A faint cat silhouette barely visible as dark blur at the edge of frame. In the foreground, the glass surface with visible paw smudges and nose prints as subtle thematic elements. Text overlay goes on top of this cinematic blurred background with semi-transparent dark overlay for readability",
    "text_overlay": {
      "arabic_title": "💡 الدرس:",
      "arabic_text": "خلّي حوضك بمكان ما توصله القطوة أبداً! 🐈🚫",
      "arabic_question": "❓ شنو أغرب شي سوّته قطوتك مع الحوض؟ احكيلنا! 😂",
      "arabic_cta": "💾 احفظ النصيحة — تنقذ سمكتك! | 📤 ارسلها لصاحبك اللي عنده قطوة!",
      "arabic_dm": "💬 أرسلنا 'قطوة' بالخاص ونرسلك نصائح حماية الحوض!",
      "arabic_next": "➡️ الدليل القادم: سلوك الأسماك 🪞 | ⬅️ الدليل السابق: الحرارة الغلط 🌡️",
      "position": "center_vertical",
      "font_style": "Cairo Bold Arabic, white on semi-transparent dark overlay, CTA in coral #FF6F61",
      "font_size": "large"
    }
  },
  "environment": { "setting": "Real aquarium heavily blurred as bokeh background with cat silhouette blur, semi-transparent dark overlay for text", "lighting": { "type": "Aquarium LED creating warm bokeh circles in blurred background", "quality": "Natural, moody, soft focus" } },
  "style": { "artistic": "hyper-realistic photography with editorial text overlay, magazine style", "mood": "educational, fun, professional, actionable" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["CGI", "3D render", "painting", "flat gradient", "clip art", "stock photo feel", "cartoonish"], "style_raw": true },
  "negative_prompt": "--no CGI, 3D render, painting, flat gradient, clip art, generic stock photo, cartoon, illustration"
}
```

---



---

# 📚 الفئة 3: Species Spotlight (S5) — كاروسيل تعليمي

---

## 🐟 دليل Betta الكامل — 10 شرائح

### الشريحة 1 — صورة البطل
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Stunning studio portrait of a halfmoon Betta fish with fully spread iridescent blue-red fins against pure black background",
    "secondary": "Bold Arabic title overlay for educational carousel"
  },
  "subject": {
    "main": "Single male halfmoon Betta splendens with maximum fin spread. Iridescent blue body transitioning to deep red fins. Every fin ray visible. Crystal clear water. Side profile showing full display posture",
    "text_overlay": {
      "arabic_text": "كل ما تحتاج تعرفه عن سمكة Betta 🐟",
      "arabic_subtitle": "الدليل الكامل — ١٠ معلومات",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, white with subtle blue glow",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "pure black background, studio aquarium photography",
    "lighting": {
      "type": "Spotlight cinematic (Setup #3)",
      "key_light": "intensity 70%, single focused beam from 45° left, color_temperature 5600K",
      "fill_light": "intensity 15%, soft bounce from right",
      "rim_light": "intensity 40%, behind fish creating iridescent edge glow on fins",
      "quality": "makes every scale shimmer with iridescent rainbow reflections",
      "direction": "45 degrees from both sides, focus beam on fish center"
    },
    "color_palette": {
      "dominant": "pure black #000000",
      "secondary": "iridescent blue-red from Betta",
      "accent": "#00A884 seafoam subtle rim"
    }
  },
  "style": {
    "artistic": "National Geographic quality fish portrait",
    "camera": {
      "angle": "side profile, eye level with fish",
      "lens": "macro 100mm",
      "aperture": "f/4"
    },
    "mood": "stunning, educational, premium",
    "realism_details": "visible fin ray structure, subsurface scattering on translucent fins, iridescent scale micro-reflections, visible pores and micro-texture, water caustics on body"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner",
    "style": "small, #00A884 seafoam on dark pill, 85% opacity"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "plastic look", "AI artifacts", "oversaturated", "low quality"],
    "style_raw": true
  }
}
```

### الشريحة 2 — الأصل والتاريخ
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "size": "~6cm body, prominent dorsal and caudal fins",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "A male halfmoon Betta with iridescent blue-red fins swimming in a shallow Thai rice paddy with lush green rice plants",
    "secondary": "Arabic origin story text overlay"
  },
  "subject": {
    "main": "The character Betta (iridescent blue body, crimson red fin tips, halfmoon spread) swimming gracefully through shallow crystal-clear water in a Thai rice paddy. Bright green rice stalks rising around it. Golden tropical sunlight filtering through leaves creating dappled light on the water surface. A dragonfly resting on a rice stalk nearby. Sandy natural bottom with small pebbles visible",
    "text_overlay": {
      "arabic_text": "١. الأصل 🌏",
      "arabic_subtitle": "بيتا من حقول الأرز في تايلاند — اسمها يعني 'المحارب'",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, white text with dark semi-transparent bar behind",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "Thai rice paddy, shallow tropical water, natural outdoor",
    "lighting": {
      "type": "Golden Hour (Setup #1)",
      "key_light": "warm tropical sunlight from above-right, 5500K golden tone",
      "fill_light": "ambient green bounce from rice foliage",
      "quality": "dappled golden light through rice stalks, subsurface glow on fish fins"
    },
    "color_palette": {
      "dominant": "lush green rice fields #4CAF50",
      "secondary": "golden warm sunlight #FFD54F",
      "accent": "iridescent blue-red from Betta character"
    }
  },
  "style": {
    "artistic": "National Geographic wildlife photography",
    "camera": {
      "angle": "water surface level, slightly below looking up at fish",
      "lens": "macro 100mm f/2.8",
      "aperture": "f/4, shallow depth of field on fish, rice stalks softly blurred"
    },
    "mood": "educational, natural, breathtaking",
    "realism_details": "visible fin ray structure, iridescent scale micro-reflections, water surface tension visible, light refraction through shallow water, tiny air bubbles on plant stems"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "wild-type Betta", "short fins", "brownish fish", "different fish species"],
    "style_raw": true
  }
}
```

### الشريحة 3 — الحوض المثالي
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Diagram elements MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "size": "~6cm body, prominent dorsal and caudal fins",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Diagram-style photo of a perfect 5-gallon Betta tank setup with clear labeled equipment arrows",
    "secondary": "Arabic equipment labels pointing to each item"
  },
  "subject": {
    "main": "A pristine 20-liter (5-gallon) planted nano aquarium photographed from the front-side angle. Inside: the character Betta (iridescent blue body, crimson red fin tips) swimming mid-level. Equipment clearly visible with thin white arrow lines pointing to each: a small adjustable heater set to 26°C, a gentle sponge filter with air bubbles, a clip-on LED light on the rim, floating Amazon frogbit plants for shade, a coconut shell cave hideout, a glass stick-on thermometer. Substrate: fine dark sand with a few river stones. Background plants: Anubias and Java fern attached to driftwood",
    "text_overlay": {
      "arabic_text": "٢. الحوض المثالي 🏠",
      "arabic_labels": "💡 إضاءة LED ← | ← 🌡️ سخان ٢٦°C | ← 🫧 فلتر إسفنجي | ← 🌿 نباتات عائمة | ← 🪨 مخبأ",
      "position": "title top_center, labels as arrows pointing to each equipment piece",
      "font_style": "Cairo Bold Arabic, white labels on dark semi-transparent tags with thin arrow lines",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "clean aquarium setup on a dark wooden stand, dark room background",
    "lighting": {
      "type": "Cutter (Setup #5)",
      "key_light": "tank's own LED light illuminating from above, 6500K daylight",
      "fill_light": "subtle rim light behind tank creating edge glow on glass",
      "quality": "bright educational lighting, every piece of equipment clearly visible and identifiable"
    },
    "color_palette": {
      "dominant": "lush green planted tank #2E7D32",
      "secondary": "dark sand and driftwood browns",
      "accent": "iridescent blue-red Betta as focal point"
    }
  },
  "style": {
    "artistic": "educational product diagram photography, clean and organized",
    "camera": {
      "angle": "front-side 30° angle, eye level with tank center",
      "lens": "35mm wide angle to capture full tank",
      "aperture": "f/8 deep depth of field, everything in focus"
    },
    "mood": "helpful, clear, professional, saveable",
    "realism_details": "visible water surface ripples, tiny bubbles from sponge filter, condensation droplets on glass lid, green plant details sharp, Betta fin rays visible even at this distance"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "cluttered", "dirty tank", "different fish species", "overcrowded tank"],
    "style_raw": true
  }
}
```

### الشريحة 4 — درجة الحرارة والماء
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Infographic MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "realistic Betta silhouette watermark in background, subtle and elegant",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Clean modern infographic showing ideal Betta water parameters with large thermometer and pH scale graphics",
    "secondary": "Arabic water parameter numbers with clear visual hierarchy"
  },
  "subject": {
    "main": "Modern infographic design on dark teal gradient. CENTER: a large elegant glass thermometer graphic showing temperature scale with 24-28°C range highlighted in bright green glow, zones below in blue (cold) and above in red (hot). LEFT: a vertical pH scale bar with 6.5-7.5 highlighted in green. RIGHT: three circular gauge icons for Ammonia (must show 0 ppm in green), Nitrite (0 ppm in green), Nitrate (<20 ppm in yellow). BACKGROUND: subtle semi-transparent silhouette of the character Betta (blue-red halfmoon) as watermark behind the infographic elements. BOTTOM: a tip box with weekly water change reminder",
    "text_overlay": {
      "arabic_text": "٣. معايير الماء المثالية 💧",
      "arabic_params": "🌡️ الحرارة: ٢٤-٢٨°C | ⚗️ pH: ٦.٥-٧.٥ | ☠️ أمونيا: ٠ | 🧪 نتريت: ٠",
      "arabic_tip": "💡 غيّر ٢٥٪ من الماء أسبوعياً!",
      "position": "title top_center, params as labels on each graphic element, tip in bottom box",
      "font_style": "Cairo Bold Arabic, white on teal, tip in highlighted seafoam box",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "dark teal gradient background #004D61 to #002B36",
    "lighting": {
      "type": "flat infographic lighting with subtle glow effects on graphics"
    },
    "color_palette": {
      "dominant": "dark teal #004D61",
      "secondary": "green #4CAF50 for safe zones, red #F44336 for danger zones",
      "accent": "#00A884 seafoam for highlights and tip box"
    }
  },
  "style": {
    "artistic": "modern premium infographic design, Apple-style clean aesthetics",
    "mood": "educational, clean, must-save, professional"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "cluttered", "AI artifacts", "low contrast text", "hard to read numbers"],
    "style_raw": true
  }
}
```

### الشريحة 5 — التوافق
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Split content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "The RIGHT side calm Betta MUST match this character. The LEFT side shows a SECOND identical-looking Betta flaring aggressively",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Split image showing Betta compatibility — LEFT: two identical halfmoon Bettas flaring aggressively (red X), RIGHT: calm Betta peacefully above Corydoras catfish (green check)",
    "secondary": "Arabic compatibility labels with clear red/green color coding"
  },
  "subject": {
    "main": "Split composition with thin white vertical divider line in center. LEFT HALF: two male halfmoon Bettas (iridescent blue body, crimson red fins) facing each other aggressively, fins fully flared to 180°, gill plates open, mouths gaping — dramatic tension and aggression. Water slightly turbulent. A large red ❌ overlay. RIGHT HALF: one calm male halfmoon Betta (same blue-red coloring) swimming peacefully mid-water above a group of 4 cute Corydoras catfish (bronze colored, whiskered) resting on fine sand. Peaceful planted background with Anubias. A large green ✅ overlay",
    "text_overlay": {
      "arabic_text": "٤. التوافق 🐟",
      "arabic_text_left": "❌ ذكر مع ذكر = قتال!",
      "arabic_text_right": "✅ مع كوريدوراس = سلام",
      "arabic_tip": "لا تحط أكثر من ذكر واحد بنفس الحوض!",
      "position": "title top_center, left/right labels over respective halves, tip in bottom bar",
      "font_style": "Cairo Bold Arabic, red glow on left, green glow on right, white tip on dark bar",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "clean planted aquarium background, split by thin white vertical line",
    "lighting": {
      "type": "Spotlight cinematic (Setup #3)",
      "key_light": "dramatic side light on left (red-tinted for aggression), soft natural light on right (green-tinted for peace)",
      "quality": "clear and educational, each half has distinct lighting mood"
    },
    "color_palette": {
      "dominant_left": "warm aggressive reds and oranges",
      "dominant_right": "calm cool greens and blues",
      "accent": "iridescent blue-red Betta character consistent both sides"
    }
  },
  "style": {
    "artistic": "educational infographic photography hybrid, dramatic split comparison",
    "camera": {
      "angle": "side profile, eye level with fish",
      "lens": "50mm standard",
      "aperture": "f/5.6"
    },
    "mood": "informative, dramatic contrast, clear comparison",
    "realism_details": "visible fin ray structure on flaring Bettas, iridescent scale reflections, Corydoras whisker barbels visible, sand grain texture, plant leaf venation"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "different fish species for Betta", "wrong fin type", "different colored Betta"],
    "style_raw": true
  }
}
```

### الشريحة 6 — التغذية
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Infographic columns MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "Small realistic Betta in center between the two food columns, looking curiously at the good food side",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Clean infographic showing Betta feeding guide: LEFT column approved foods (green), RIGHT column forbidden foods (red), character Betta in center",
    "secondary": "Arabic feeding rules and food names"
  },
  "subject": {
    "main": "Modern two-column infographic on dark teal gradient. LEFT COLUMN (green header ✅ أكل صحي): four rounded photo cards stacked vertically showing: 1) Betta micro-pellets in a small dish, 2) frozen bloodworms (red, curled), 3) live daphnia (tiny translucent crustaceans), 4) freeze-dried brine shrimp. Each card has Arabic name label. RIGHT COLUMN (red header ❌ ممنوع): four cards showing: 1) bread crumbs, 2) white rice grains, 3) large tropical flakes (too big), 4) overfeeding pile of pellets (excessive amount). CENTER: the character Betta (iridescent blue body, crimson red fins, halfmoon) swimming vertically between columns, head turned toward the good food side with an eager expression",
    "text_overlay": {
      "arabic_text": "٥. دليل التغذية 🍽️",
      "arabic_rule": "⏱️ مرة-مرتين يومياً — كمية تنتهي في ٢ دقيقة فقط!",
      "arabic_labels_left": "حبوب بيتا | ديدان الدم | دافنيا | أرتيميا",
      "arabic_labels_right": "خبز ❌ | رز ❌ | رقائق كبيرة ❌ | كمية زائدة ❌",
      "position": "title top_center, rule in bottom highlighted box, labels under each food photo",
      "font_style": "Cairo Bold Arabic, green labels on left, red labels on right, white rule on seafoam box",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "dark teal gradient background #004D61 to #002B36",
    "lighting": {
      "type": "flat infographic lighting with soft spotlight on Betta center character"
    },
    "color_palette": {
      "dominant": "dark teal #004D61",
      "secondary": "green #4CAF50 for approved, red #F44336 for forbidden",
      "accent": "#00A884 seafoam for rule box and highlights"
    }
  },
  "style": {
    "artistic": "modern premium infographic with realistic food photography thumbnails",
    "mood": "educational, practical, saveable, must-bookmark",
    "realism_details": "realistic food textures in thumbnail cards, Betta fin rays visible, iridescent scales on character fish"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "AI artifacts", "cluttered", "different fish species", "wrong Betta color"],
    "style_raw": true
  }
}
```

### الشريحة 7 — الأمراض الشائعة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Grid content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "All 4 grid photos show the SAME character Betta but with different disease symptoms visible on it",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide — same blue-red halfmoon Betta with disease symptoms added"
  },
  "priority": {
    "primary": "Educational 2x2 grid showing 4 common Betta diseases, each photo shows the character Betta with visible symptoms",
    "secondary": "Arabic disease names and short symptom descriptions under each grid cell"
  },
  "subject": {
    "main": "2x2 grid of close-up photos on dark background, each showing the character Betta (iridescent blue body, crimson red halfmoon fins) with a specific disease: TOP-LEFT (1): Fin Rot — the Betta's fin edges are ragged, torn, and blackened, with tissue loss visible on the caudal fin. TOP-RIGHT (2): Ich (White Spot) — the Betta's body and fins covered in small white salt-grain dots scattered across blue scales. BOTTOM-LEFT (3): Velvet — the Betta has a dusty golden-brown coating on scales visible under side light, scales look less iridescent. BOTTOM-RIGHT (4): Swim Bladder Disease — the Betta is floating at an abnormal angle, slightly sideways, struggling at the surface. Each grid cell has a thin dark border and an Arabic label underneath",
    "text_overlay": {
      "arabic_text": "٦. الأمراض الشائعة 🏥",
      "arabic_labels": "١. تعفن الزعانف — حواف ممزقة سوداء | ٢. الإيك — نقط بيضاء كالملح | ٣. المخملية — غبار ذهبي على الجسم | ٤. المثانة الهوائية — السمكة تطفو مائلة",
      "position": "title top_center, labels in dark bar under each grid photo",
      "font_style": "Cairo Bold Arabic, white on dark semi-transparent bars, title with red warning accent",
      "font_size": "small-medium"
    }
  },
  "environment": {
    "setting": "pure dark background #1A1A2E, grid cells separated by thin dark borders",
    "lighting": {
      "type": "clinical educational lighting, each cell lit independently",
      "quality": "clear medical-style lighting to show symptoms, slightly harsh to reveal texture details"
    },
    "color_palette": {
      "dominant": "dark background #1A1A2E",
      "secondary": "warning amber #FFA726 for disease indicators",
      "accent": "red #F44336 for severity, #00A884 seafoam for branding"
    }
  },
  "style": {
    "artistic": "medical/veterinary photography, educational 2x2 grid, clinical clarity",
    "camera": {
      "angle": "close-up side profile for each cell, macro focus on affected areas",
      "lens": "macro 100mm",
      "aperture": "f/4 sharp detail on disease symptoms"
    },
    "mood": "informative, concern-driving, must-save, educational warning",
    "realism_details": "detailed disease textures — ragged fin edges with dark necrotic tissue, individual white ich spots with defined edges, velvet golden dust particles on scales, visible gill breathing distress"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "AI artifacts", "graphic gore", "different fish species", "wrong Betta coloring", "unrealistic disease depictions"],
    "style_raw": true
  }
}
```

### الشريحة 8 — أساسيات التكاثر
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "The male building the bubble nest is the character Betta, viewed from slightly below showing mouth and bubble creation",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Stunning intimate macro photo of the character Betta building a bubble nest at the water surface, bubbles catching light beautifully",
    "secondary": "Arabic breeding basics text overlay"
  },
  "subject": {
    "main": "Close-up intimate macro shot of the character male halfmoon Betta (iridescent blue body, crimson red fin tips) directly at the water surface. The fish's mouth is near the surface, carefully releasing a tiny bubble upward. Above the fish: a delicate dome of hundreds of tiny bubbles clustered together forming a bubble nest, each bubble catching light like a miniature lens creating rainbow micro-reflections. The fish's fins are slightly folded to allow precise positioning. Warm golden backlight shining through the bubble nest creating a magical glow. A few floating plants (Amazon frogbit) at the water surface near the nest providing anchor points",
    "text_overlay": {
      "arabic_text": "٧. التكاثر 🫧",
      "arabic_subtitle": "الذكر يبني عش الفقاعات بنفسه — علامة إنه جاهز!",
      "position": "bottom_center on dark semi-transparent bar",
      "font_style": "Cairo Bold Arabic, white text with subtle warm golden glow matching backlight",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "close-up at water surface level, bubble nest formation, shallow depth of field",
    "lighting": {
      "type": "Golden Hour (Setup #1)",
      "key_light": "warm golden backlight from behind/above at 5200K, shining through bubble nest",
      "fill_light": "soft ambient light bouncing off water surface from below",
      "rim_light": "golden edge glow on fish body from backlight",
      "quality": "warm intimate backlight creating lens-flare through individual bubbles, fairy-tale magical atmosphere"
    },
    "color_palette": {
      "dominant": "warm golden amber from backlight #FFB74D",
      "secondary": "iridescent blue-red Betta body reflecting warm light",
      "accent": "rainbow micro-reflections in bubbles"
    }
  },
  "style": {
    "artistic": "intimate macro photography, National Geographic quality",
    "camera": {
      "angle": "water surface level, slightly below looking up at bubble nest and fish",
      "lens": "macro 100mm f/2.8",
      "aperture": "f/2.8 extremely shallow depth of field, bubbles razor sharp, background dreamy blur"
    },
    "mood": "magical, intimate, fascinating, wonder-inducing",
    "realism_details": "individual bubble film iridescence, water surface tension meniscus visible, Betta's labyrinth organ breathing visible as small air intake, fin ray structure visible in warm backlight, micro-air bubbles on floating plant roots"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "different fish species", "wrong Betta color", "unrealistic bubbles"],
    "style_raw": true
  }
}
```

### الشريحة 9 — حقائق ممتعة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Infographic content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "Three small realistic illustrations of the character Betta, each in a different pose matching its fun fact",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Modern dark infographic showing 3 surprising Betta fun facts with the character Betta illustrated in each scenario",
    "secondary": "Arabic fun fact labels with playful icons"
  },
  "subject": {
    "main": "Modern premium infographic on dark gradient with 3 vertically stacked rounded fact cards with subtle glow borders. CARD 1 (top): 🪞 icon + a small realistic image of the character Betta (blue-red halfmoon) flaring aggressively at its own reflection in a mirror, fins fully spread. Label: 'يهاجم انعكاسه في المرآة!'. CARD 2 (middle): 🫁 icon + the character Betta at the water surface taking a breath of air, mouth at surface, tiny bubble visible. Label: 'يتنفس الهواء من السطح! (عضو المتاهة)'. CARD 3 (bottom): 🎨 icon + two versions of the character Betta side by side — one vivid bright blue-red (happy/healthy) and one slightly paler duller version (stressed/scared). Label: 'يغير لونه حسب مزاجه!'",
    "text_overlay": {
      "arabic_text": "٨. حقائق ممتعة 🤯",
      "arabic_facts": "🪞 يهاجم انعكاسه! | 🫁 يتنفس الهواء! | 🎨 يغير لونه حسب مزاجه!",
      "position": "title top_center, fact labels inside each card",
      "font_style": "Cairo Bold Arabic, white on colored glow-border cards, each card has its icon color theme",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "dark gradient #004D61 to #001A23, cards floating with subtle shadow and glow effects",
    "lighting": {
      "type": "flat infographic lighting with colored accent glows on each card border"
    },
    "color_palette": {
      "dominant": "dark teal gradient #004D61",
      "card_1_accent": "amber mirror glow #FFB74D",
      "card_2_accent": "light blue air glow #4FC3F7",
      "card_3_accent": "rainbow gradient border for color change fact",
      "accent": "#00A884 seafoam for highlights"
    }
  },
  "style": {
    "artistic": "modern premium infographic, playful but professional",
    "mood": "surprising, fun, shareable, must-share",
    "realism_details": "realistic Betta illustrations in each card showing actual behavior, mirror reflection visible, air bubble at surface, color intensity difference between happy/stressed fish"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "cluttered", "AI artifacts", "different fish species", "wrong Betta color"],
    "style_raw": true
  }
}
```

### الشريحة 10 — الخلاصة (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Silhouette and text MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "character_reference": {
    "species": "Male Halfmoon Betta splendens",
    "body_color": "deep iridescent royal blue with turquoise highlights on gill covers",
    "fin_color": "blue base transitioning to deep crimson red at fin tips",
    "fin_type": "halfmoon, 180-degree spread, flowing and translucent",
    "usage_in_this_slide": "Beautiful dramatic silhouette of the character Betta with light catching only the fin edges, recognizable as the same fish from all previous slides",
    "consistency": "MUST match this EXACT fish appearance in EVERY slide of this carousel"
  },
  "priority": {
    "primary": "Stunning closing slide with the character Betta as dramatic silhouette against brand gradient, bold Arabic CTA text",
    "secondary": "Save, share, and follow call-to-action in Arabic"
  },
  "subject": {
    "main": "The character halfmoon Betta as a dramatic dark silhouette centered in the image against a smooth gradient background (deep teal #004D61 transitioning to brand seafoam #00A884). The silhouette clearly shows the distinctive halfmoon fin shape at 180° spread, every fin ray visible as dark lines. Subtle rim light catches only the extreme edges of the fins, creating a thin glowing outline in white-seafoam. The silhouette is unmistakably the same fish from all previous slides — same head shape, same fin proportions. Clean modern design with generous whitespace around the fish",
    "text_overlay": {
      "arabic_text": "هل عندك بيتا؟ 🐟",
      "arabic_subtitle": "💾 احفظ هذا الدليل للرجوع إليه دائماً",
      "arabic_cta": "💬 شارك تجربتك في التعليقات!",
      "arabic_footer": "تابعنا @AQUAVO لمزيد من الأدلة 🌊",
      "position": "arabic_text above fish center, subtitle below fish, cta in rounded button shape, footer at bottom",
      "font_style": "Cairo Bold Arabic, white with subtle seafoam glow, CTA in #00A884 rounded box",
      "font_size": "large for title, medium for subtitle and CTA, small for footer"
    }
  },
  "environment": {
    "setting": "smooth gradient #004D61 deep teal to #00A884 seafoam, clean minimal design",
    "lighting": {
      "type": "dramatic backlight creating silhouette effect",
      "rim_light": "thin #00A884 seafoam edge glow on fin silhouette only",
      "quality": "high contrast silhouette, sharp clean edges"
    },
    "color_palette": {
      "dominant": "gradient #004D61 to #00A884",
      "secondary": "white text #FFFFFF",
      "accent": "#00A884 seafoam for CTA box and rim light"
    }
  },
  "style": {
    "artistic": "modern closing slide design, premium brand aesthetic, Apple keynote quality",
    "mood": "inspirational, call-to-action, brand-affirming, memorable",
    "realism_details": "silhouette fin ray lines visible, halfmoon shape clearly identifiable, rim light catching micro-texture of fin edges"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "different fish silhouette", "wrong fin shape", "cluttered design"],
    "style_raw": true
  }
}
```
```

---


---

# 🌍 الفئة 2: عوالم مصغرة (S1) — TikTok Photo Mode

---

## 🔴 المدينة الغارقة — حضارة عربية تحت الماء

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Ultra-realistic photograph of a custom aquarium containing a miniature sunken ancient Arab city underwater",
    "secondary": "Arabic text overlay for viral TikTok photo mode"
  },
  "subject": {
    "main": "Inside an aquarium: a detailed miniature sunken ancient Middle Eastern marketplace with tiny arches, domed buildings, and a minaret. Covered in moss and algae. Schools of small tetras swimming through the narrow streets between buildings. Fine sand substrate resembling desert dunes underwater",
    "text_overlay": {
      "arabic_text": "المدينة الغارقة 🕌",
      "arabic_subtitle": "ماذا لو غرقت مدينة عربية قديمة؟",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, gold color with dark shadow",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "large aquarium with dark background, dramatic lighting",
    "lighting": {
      "type": "Golden Hour cinematic (Setup #1)",
      "key_light": "intensity 70%, position 45° from upper left, color_temperature 4500K warm golden",
      "fill_light": "intensity 20%, scattered water ambient",
      "rim_light": "intensity 30%, behind miniature buildings creating depth",
      "quality": "cinematic volumetric god-rays through water, warm golden tones",
      "direction": "45 degrees from upper left"
    },
    "color_palette": {
      "dominant": "#004D61 deep teal water",
      "secondary": "warm golden god-rays",
      "accent": "#00A884 seafoam on moss/algae"
    }
  },
  "style": {
    "artistic": "ultra-photorealistic aquarium photography",
    "camera": {
      "angle": "slightly low angle, eye-level with miniature city",
      "lens": "50mm prime lens",
      "aperture": "f/2.8 shallow depth of field"
    },
    "mood": "epic, mystical, jaw-dropping",
    "realism_details": "visible water caustics on surfaces, micro-bubbles on decorations, subsurface scattering through water, natural lens vignette"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render look", "plastic toys", "unrealistic colors", "AI artifacts", "blurry text"],
    "style_raw": true
  }
}
```

## 🤖 Cyberpunk Tank — حوض المستقبل

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Ultra-realistic aquarium designed as a miniature cyberpunk city with neon lights underwater",
    "secondary": "Arabic futuristic text overlay"
  },
  "subject": {
    "main": "Inside a dark aquarium: miniature cyberpunk city with tiny neon signs in pink, blue and purple. Wire-like plants growing between buildings. GloFish (fluorescent tetras) swimming through neon-lit corridors. LED strips inside decorations creating light trails in foggy water",
    "text_overlay": {
      "arabic_text": "حوض المستقبل 🤖",
      "arabic_subtitle": "مدينة نيون تحت الماء",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, neon pink with cyan glow",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "dark room, aquarium is only light source with neon colors",
    "lighting": {
      "type": "neon multi-color from inside decorations",
      "quality": "high contrast neon against dark water",
      "direction": "multiple colored sources"
    }
  },
  "style": {
    "artistic": "cyberpunk photography meets aquarium art",
    "camera": {
      "angle": "straight on, slightly below center",
      "lens": "35mm"
    },
    "mood": "futuristic, mesmerizing, stop-scroll"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "blurry text", "low quality"],
    "style_raw": true
  }
}
```

## 🍄 عالم الفطر المتوهج — Mushroom Forest

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Magical aquarium designed as an underwater bioluminescent mushroom forest",
    "secondary": "Arabic wonder text overlay"
  },
  "subject": {
    "main": "Inside an aquarium: oversized glowing mushroom decorations emitting soft blue and green bioluminescent light. Tiny shrimp climbing on mushroom stems. Moss-covered driftwood shaped like ancient tree trunks. Firefly tetras creating dots of light. Foggy water creating ethereal atmosphere",
    "text_overlay": {
      "arabic_text": "غابة الفطر المتوهج 🍄✨",
      "arabic_subtitle": "عالم لا يصدقه عقل",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, glowing green-blue with sparkle effect",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "pitch dark aquarium with only bioluminescent glow",
    "lighting": {
      "type": "bioluminescent glow from inside decorations",
      "quality": "dreamy, soft, Avatar-like aesthetic"
    }
  },
  "style": {
    "artistic": "fantastical photorealism, Avatar underwater",
    "camera": {
      "angle": "low angle looking up at giant mushrooms",
      "lens": "wide angle 24mm"
    },
    "mood": "magical, otherworldly, jaw-dropping wonder"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "plastic look", "AI artifacts", "oversaturated"],
    "style_raw": true
  }
}
```

---

## 🔴 حوض Stranger Things — الـ Upside Down تحت الماء (4 صور — TikTok Photo Mode)

### الصورة 1 — البوابة المتوهجة (Hero Shot)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Ultra-realistic photograph of a custom aquarium designed as a Stranger Things Upside Down world with a glowing red portal gate in the center",
    "secondary": "Arabic viral text overlay for TikTok photo mode"
  },
  "subject": {
    "main": "A stunning custom aquarium viewed from the front. In the center stands a handcrafted miniature portal gate glowing with intense red-orange light — resembling the Rift to the Upside Down from Stranger Things. Dark twisted driftwood branches reach upward like dead trees. Java moss and Bucephalandra grow thick on the wood creating vine-like tendrils. A school of 15+ Cardinal Tetras (Paracheirodon axelrodi) swim near the portal — their electric blue horizontal stripe glowing against the red light. Dense red fog hugs the dark substrate (created by fine volcanic sand). The water has a slight reddish tint from the portal glow. Background plants are dark and overgrown — Cryptocoryne wendtii 'Brown' and Rotala rotundifolia 'Blood Red'. The overall atmosphere is eerie, cinematic, and jaw-dropping",
    "text_overlay": {
      "arabic_text": "حوض Stranger Things",
      "text_rules": "CRITICAL: Render text RIGHT-TO-LEFT. Arabic letters MUST be connected naturally. Do NOT mirror or flip text.",
      "position": "center of image, vertically and horizontally centered",
      "font_style": "large bold white Arabic text on a semi-transparent black rectangular bar spanning 80% width",
      "font_size": "72px equivalent — must be easily readable",
      "background_bar": "dark semi-transparent black rectangle behind text, rounded corners, 60% opacity",
      "text_count": "ONLY this one line of text. No subtitle. No additional text anywhere."
    }
  },
  "environment": {
    "setting": "custom themed aquarium, dark moody atmosphere, studio photography",
    "lighting": {
      "type": "Low Key dramatic (Setup #2) + practical red LED",
      "key_light": "intensity 40%, narrow beam from above creating shadows through branches",
      "fill_light": "intensity 0% — pure darkness on sides for maximum drama",
      "practical_light": "RED LED strip hidden behind portal decoration creating intense red volumetric glow",
      "rim_light": "intensity 20%, subtle blue-white edge light on fish and plant tips",
      "quality": "ultra dramatic chiaroscuro — the portal is the ONLY warm light source",
      "fog_effect": "dense low-lying fog across substrate catching red light"
    },
    "color_palette": {
      "dominant": "deep black void #0A0A0A",
      "secondary": "blood red portal glow #8B0000 to #FF4500",
      "accent": "electric blue Cardinal Tetra stripe — creates stunning contrast against red",
      "atmosphere": "dark teal undertone in water #001A1A"
    }
  },
  "style": {
    "artistic": "cinematic horror photography meets aquascaping — Netflix production design quality",
    "camera": {
      "angle": "straight on, slightly below center — hero establishing shot",
      "lens": "35mm wide angle to capture entire tank atmosphere",
      "aperture": "f/2.8 — sharp portal, slight depth falloff on edges"
    },
    "mood": "eerie, mesmerizing, cinematic horror beauty — guaranteed stop-scroll",
    "realism_details": "visible water surface ripples catching red light, light rays through fog creating god-rays, individual fish scales reflecting red and blue, substrate particle details, condensation droplets on glass edges, wood grain texture on driftwood"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "plastic look", "AI artifacts", "oversaturated neon", "visible tank equipment", "cheap decorations"],
    "style_raw": true,
    "reference_shows": "Stranger Things Season 1-4 Upside Down visual language"
  }
}
```

### الصورة 2 — عبور البوابة (Macro Close-up)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Extreme close-up photo of a single Cardinal Tetra fish silhouetted against a glowing red portal inside a Stranger Things themed aquarium",
    "secondary": "Minimal Arabic text adding mystery"
  },
  "subject": {
    "main": "Breathtaking macro shot inside the Stranger Things aquarium. A single Cardinal Tetra is captured mid-swim directly in front of the glowing red portal — its tiny body becomes a dark silhouette against the blazing red-orange light. The fish's electric blue lateral stripe glows like a neon line cutting through the darkness. Dark vine-like java moss tendrils frame the shot from above and sides — resembling the organic growths from the Upside Down. Micro-particles and debris float in the water catching the red light like embers. The portal glow creates a visible light cone with volumetric red fog. Behind the portal you can barely make out more twisted branches disappearing into darkness",
    "text_overlay": {
      "arabic_text": "لو دخلت ما ترجع",
      "text_rules": "CRITICAL: Render text RIGHT-TO-LEFT. Arabic letters MUST be connected naturally. Do NOT mirror or flip text.",
      "position": "bottom center of image, 15% from bottom edge",
      "font_style": "medium bold white Arabic text on semi-transparent black bar spanning 60% width",
      "font_size": "48px equivalent — readable but not dominant",
      "background_bar": "thin dark semi-transparent rectangle behind text, 50% opacity",
      "text_count": "ONLY this one line. No other text."
    }
  },
  "environment": {
    "setting": "inside aquarium, extreme close-up of portal area",
    "lighting": {
      "type": "Practical red backlight only — the portal IS the light source",
      "key_light": "RED portal glow — intensity 80%, creating silhouette of fish",
      "fill_light": "intensity 5% — minimal blue ambient to barely reveal fish scales",
      "quality": "dramatic silhouette photography — fish as negative space against blazing light"
    },
    "color_palette": {
      "dominant": "blazing red-orange #FF2200 from portal center",
      "secondary": "pitch black void around edges",
      "accent": "electric blue tetra stripe — single line of cool color in warm scene"
    }
  },
  "style": {
    "artistic": "underwater macro horror photography — like a frame from the actual show",
    "camera": {
      "angle": "eye-level with fish, shooting toward portal",
      "lens": "macro 100mm",
      "aperture": "f/2.0 — razor thin focus on fish, portal slightly soft"
    },
    "mood": "ominous, beautiful, hypnotic — you can't look away",
    "realism_details": "visible fin ray structures as dark lines against red light, subsurface scattering on translucent fins creating red glow, individual floating particles with red-orange bokeh, lens flare from portal light, chromatic aberration at edges"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "oversaturated", "visible equipment", "multiple text overlays"],
    "style_raw": true
  }
}
```

### الصورة 3 — أسماك في الضباب الأحمر (Atmospheric Mid-shot)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Atmospheric photograph of a school of glowing Cardinal Tetras swimming through dense red fog in a dark Stranger Things themed aquarium with vine-like tendrils hanging from above",
    "secondary": "Poetic Arabic text about another world"
  },
  "subject": {
    "main": "Mid-shot inside the Stranger Things aquarium focusing on the FISH. A tight school of 12+ Cardinal Tetras swim in formation through a corridor of dark twisted driftwood. Dense red-tinted fog rises from the substrate and swirls around the fish. Each Cardinal Tetra has a brilliant electric-blue horizontal stripe that GLOWS against the red atmosphere — creating a stunning visual contrast of cool blue vs warm red. Dark java moss hangs from branches above like the organic tendrils from the Upside Down. In the far background, the faint red glow of the portal is visible but out of focus — creating beautiful red bokeh circles. The fish appear to be swimming THROUGH another dimension. Tiny particle matter floats in the water like ash",
    "text_overlay": {
      "arabic_text": "عالم ثاني تحت الماي",
      "text_rules": "CRITICAL: Render text RIGHT-TO-LEFT. Arabic letters MUST be connected naturally. Do NOT mirror or flip text.",
      "position": "bottom third of image, centered horizontally",
      "font_style": "medium-large bold white Arabic text on semi-transparent dark bar",
      "font_size": "56px equivalent",
      "background_bar": "dark semi-transparent rectangle behind text, 55% opacity, rounded corners",
      "text_count": "ONLY this one line. No subtitle. No English text."
    }
  },
  "environment": {
    "setting": "inside dark aquarium, atmospheric mid-shot",
    "lighting": {
      "type": "Mixed practical — red background glow + subtle blue side light",
      "key_light": "distant red portal glow creating warm atmosphere from behind",
      "fill_light": "intensity 15%, cool blue side light from left revealing fish detail",
      "quality": "atmospheric, foggy, cinematic — think underwater horror film"
    },
    "color_palette": {
      "dominant": "deep red fog atmosphere #660000",
      "secondary": "electric blue Cardinal Tetra stripes — visual focal point",
      "accent": "dark green-black from overgrown plants",
      "contrast_note": "The BLUE of the tetras against RED fog = maximum visual impact"
    }
  },
  "style": {
    "artistic": "atmospheric underwater photography meets horror cinematography",
    "camera": {
      "angle": "slightly below fish level looking slightly upward",
      "lens": "50mm portrait lens",
      "aperture": "f/2.8 — school of fish sharp, background dreamy red bokeh"
    },
    "mood": "otherworldly, hauntingly beautiful, makes you hold your breath",
    "realism_details": "individual fish visible in school with slightly different positions and angles, visible blue stripe iridescence shifting on each fish, red fog swirling realistically around fish bodies, hanging moss detail with water droplets, depth layers with sharp fish vs soft background"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "oversaturated", "identical fish clones — each fish must look slightly different"],
    "style_raw": true
  }
}
```

### الصورة 4 — هل تجرأ تسويه؟ (CTA — Dramatic Low Angle)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 full screen story/TikTok",
    "safe_zone": "Keep key visuals away from UI edges. Avoid top 250px and bottom 400px.",
    "text_placement": "Place text in center 70% of screen. Leave margins for TikTok UI."
  },
  "priority": {
    "primary": "Dramatic low-angle photograph looking up through a Stranger Things themed aquarium showing the glowing red portal, swimming fish silhouettes, and twisted branches against light from above",
    "secondary": "Bold Arabic CTA challenging viewer to build this tank"
  },
  "subject": {
    "main": "Ultra-dramatic low angle shot looking UP through the aquarium from bottom. The red portal glows above like a hellish sun. Multiple Cardinal Tetras swim overhead — their bellies visible as dark silhouettes with blue stripe edges catching the red light. Twisted driftwood branches cross the frame diagonally like the bars of the Upside Down dimension. Water surface visible at top with light ripples creating abstract patterns. Red fog drifts upward through the water column. The entire composition feels like looking up from inside the Upside Down itself. A few floating plants on the surface create shadow patterns",
    "text_overlay": {
      "arabic_text": "تجرأ تسوي هالحوض",
      "text_rules": "CRITICAL: Render text RIGHT-TO-LEFT. Arabic letters MUST be connected naturally. Do NOT mirror or flip text.",
      "position": "center of image, vertically centered",
      "font_style": "extra large bold white Arabic text on wide semi-transparent black bar",
      "font_size": "80px equivalent — dominant and bold",
      "background_bar": "wide dark semi-transparent rectangle behind text, 65% opacity, spanning 85% of image width",
      "text_count": "ONLY this one line. No subtitle. No footer. No additional text."
    }
  },
  "environment": {
    "setting": "inside aquarium shot from below — dramatic upward perspective",
    "lighting": {
      "type": "Top-down dramatic with red practical light",
      "key_light": "red portal glow from center-top acting as primary light source",
      "fill_light": "intensity 10%, very subtle cool ambient",
      "rim_light": "water surface light creating ripple patterns on everything below",
      "quality": "dramatic, epic, cinematic — the kind of shot that gets 1M+ views"
    },
    "color_palette": {
      "dominant": "deep black with red gradient from portal #000000 to #CC0000",
      "secondary": "dark blue-grey silhouettes of fish",
      "accent": "water surface silver reflections contrasting against red"
    }
  },
  "style": {
    "artistic": "extreme perspective underwater photography — Stranger Things meets aquarium art",
    "camera": {
      "angle": "extreme low angle — looking straight UP through water",
      "lens": "ultra wide 16mm for dramatic perspective distortion",
      "aperture": "f/4 — everything in relative focus for epic scale"
    },
    "mood": "epic, challenging, awe-inspiring — makes viewer want to build this immediately",
    "realism_details": "water surface meniscus visible from below, fish belly textures, light refraction through water ripples creating caustic patterns, branch silhouette details, floating particle matter against red backlight, natural vignette from shooting upward"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "9:16"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "oversaturated", "visible tank rim or equipment", "cheap plastic decorations"],
    "style_raw": true
  }
}
```

---


---

# ❌ الفئة 4: Myth vs Fact (S6) — كاروسيل جدلي

---

## 🧠 "٥ خرافات يصدقها كل مبتدئ"

### الشريحة الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Graphic content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Bold graphic image showing a goldfish trapped in a tiny glass bowl with a giant red X crossing it out",
    "secondary": "Shocking Arabic title that stops scrolling"
  },
  "subject": {
    "main": "A sad goldfish cramped inside a tiny round glass bowl on a white table. Giant semi-transparent red X mark overlaid on the entire image. The goldfish looks unhappy and cramped",
    "text_overlay": {
      "arabic_text": "٥ خرافات عن الأسماك ❌",
      "arabic_subtitle": "كلها خطأ... وأنت تصدقها!",
      "position": "top_and_bottom",
      "font_style": "Cairo Bold Arabic, white on transparent dark bar",
      "font_size": "extra large"
    }
  },
  "environment": {
    "setting": "clean white background with dramatic red accent",
    "lighting": {
      "type": "bright studio lighting",
      "quality": "high contrast for impact"
    }
  },
  "style": {
    "artistic": "editorial photography with graphic overlay",
    "mood": "shocking, provocative, must-click"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

### شريحة خرافة — "ذاكرة ٣ ثواني"
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Split content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Split before/after myth-busting image about fish memory",
    "secondary": "Arabic myth vs fact with clear visual contrast"
  },
  "subject": {
    "main": "LEFT: cartoon-style brain icon with '3 seconds' timer (myths section). RIGHT: photograph of a goldfish navigating through an underwater maze successfully (facts section)",
    "text_overlay": {
      "arabic_myth": "❌ الخرافة: ذاكرة السمكة ٣ ثواني",
      "arabic_fact": "✅ الحقيقة: ذاكرتها تصل لأشهر!",
      "arabic_proof": "🧪 دراسة: السمك يتعلم حل المتاهات",
      "position": "top_myth, bottom_fact",
      "font_style": "Cairo Bold Arabic, red for myth, green for fact, white background bar",
      "font_size": "medium-large"
    }
  },
  "environment": {
    "setting": "split design: red-tinted left, green-tinted right"
  },
  "style": {
    "artistic": "educational infographic with real photo",
    "mood": "surprising, eye-opening"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

### شريحة خرافة — "الحوض الصغير يكفي"
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Comparison content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "Split comparison showing goldfish in tiny bowl vs goldfish in proper large tank", "secondary": "Arabic myth vs fact about tank size" },
  "subject": {
    "main": "LEFT: Cramped goldfish in a tiny round 1-gallon bowl, murky water, fish looks stressed. RIGHT: same species goldfish in a spacious 30-gallon planted tank, crystal clear water, fish looks vibrant and healthy",
    "text_overlay": { "arabic_myth": "❌ الخرافة: الحوض الصغير يكفي", "arabic_fact": "✅ الحقيقة: الجولد فيش يحتاج ٣٠ جالون على الأقل!", "arabic_proof": "💀 الحوض الصغير = موت بطيء", "position": "myth top, fact bottom", "font_style": "Cairo Bold Arabic, red myth, green fact", "font_size": "medium-large" }
  },
  "environment": { "setting": "split composition, red-tinted left, green-right" },
  "style": { "artistic": "editorial comparison photography", "mood": "shocking, educational" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts"], "style_raw": true }
}
```

### شريحة خرافة — "الضوء ٢٤ ساعة"
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Split content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "Split showing aquarium under 24/7 light with green algae vs proper 8-hour light cycle with clean tank", "secondary": "Arabic myth about light duration" },
  "subject": {
    "main": "LEFT: aquarium covered in ugly green algae, bright harsh light 24/7, everything green and gross. RIGHT: same tank but beautiful with 8hr light cycle, clean glass, healthy plants, timer visible on light",
    "text_overlay": { "arabic_myth": "❌ الخرافة: اترك الضوء مشتعلاً دائماً", "arabic_fact": "✅ الحقيقة: ٨ ساعات ضوء كافية — الباقي = طحالب!", "position": "myth top, fact bottom", "font_style": "Cairo Bold Arabic, red myth, green fact", "font_size": "medium-large" }
  },
  "environment": { "setting": "split composition" },
  "style": { "artistic": "before/after comparison photography", "mood": "educational, surprising" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts"], "style_raw": true }
}
```

### شريحة خرافة — "عمرها قصير"
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "Image of an ancient-looking large goldfish with Arabic text about real goldfish lifespan", "secondary": "Arabic myth vs fact about fish lifespan" },
  "subject": {
    "main": "A massive, old, beautiful goldfish (like a prize-winning Ranchu or Oranda) with flowing fins in a spacious pond. The fish looks aged and majestic. Clean clear water. Cherry blossom petals floating on surface",
    "text_overlay": { "arabic_myth": "❌ الخرافة: السمكة عمرها سنة أو اثنين", "arabic_fact": "✅ الحقيقة: الجولد فيش يعيش ٢٠-٣٠ سنة!", "arabic_proof": "🏆 أكبر جولد فيش عاش ٤٣ سنة!", "position": "myth top, fact center, proof bottom", "font_style": "Cairo Bold Arabic, red myth, green fact, gold proof", "font_size": "medium" }
  },
  "environment": { "setting": "Japanese garden pond, elegant", "lighting": { "type": "Golden Hour (Setup #1)", "quality": "warm sunset glow on water" } },
  "style": { "artistic": "fine art fish photography", "mood": "surprising, respectful, educational" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts"], "style_raw": true }
}
```

### شريحة الخاتمة — CTA
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Content MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": { "primary": "Clean CTA closing slide for the myths carousel", "secondary": "Arabic save and share CTA" },
  "subject": {
    "main": "Clean gradient background (#004D61 to #00A884) with subtle fish scale pattern texture. Five small myth icons crossed out",
    "text_overlay": {
      "arabic_text": "كم خرافة كنت تصدقها؟ 🤔",
      "arabic_subtitle": "💾 احفظ هذا المنشور | 📤 شاركه مع صديق يصدقها!",
      "arabic_footer": "تابعنا @AQUAVO — محتوى يومي عن الأسماك 🐟",
      "position": "center vertical", "font_style": "Cairo Bold Arabic, white", "font_size": "large"
    }
  },
  "environment": { "setting": "gradient #004D61 to #00A884" },
  "style": { "artistic": "modern closing slide", "mood": "engaging, call-to-action" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```



---

# 👁️ الفئة 5: صدمة بصرية (S3) — صورة واحدة توقف التصفح

---

## 🔮 السمكة المتوهجة في الظلام

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Jaw-dropping photograph of a Betta fish appearing to emit bioluminescent glow in pitch black water",
    "secondary": "Minimal Arabic text that adds mystery"
  },
  "subject": {
    "main": "A halfmoon Betta fish with flowing translucent fins in pitch black water. Fins appear to glow with bioluminescent blue and purple light emanating from the fish body. Iridescent scales shimmer like tiny LEDs. Water appears to have subtle particles catching the light. Single dramatic spotlight from above creating a cone of light around the fish",
    "text_overlay": {
      "arabic_text": "هل هذا حقيقي؟ 🔮",
      "position": "bottom_right_subtle",
      "font_style": "Cairo Bold Arabic, translucent white",
      "font_size": "small-medium"
    }
  },
  "environment": {
    "setting": "pitch black water, no visible tank walls",
    "lighting": {
      "type": "Low Key + Chiaroscuro hybrid (Setup #2 + #4)",
      "key_light": "intensity 60%, single hard beam from directly above, creating cone of light",
      "fill_light": "intensity 0% — NO fill, pure black shadows",
      "rim_light": "intensity 25%, bioluminescent glow emanating from fish body itself",
      "quality": "ultra dramatic chiaroscuro — one side lit, other side vanishes into void",
      "direction": "top-down single beam, no scatter",
      "negative_fill": "flag all sides to maximize shadow depth"
    },
    "color_palette": {
      "dominant": "pure black void",
      "secondary": "bioluminescent blue-purple glow",
      "accent": "#004D61 deep teal water hint"
    }
  },
  "style": {
    "artistic": "National Geographic meets fantasy, extreme drama",
    "camera": {
      "angle": "slightly below fish looking up",
      "lens": "macro 100mm",
      "aperture": "f/2.0 ultra shallow depth"
    },
    "mood": "mesmerizing, otherworldly, stop-scroll guaranteed",
    "realism_details": "subsurface scattering on translucent glowing fins, iridescent scale reflections like tiny LEDs, visible fin ray structure backlit, micro-bubbles catching spotlight, chromatic aberration at edges, natural lens vignette"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["cartoonish glow", "neon garish colors", "visible tank equipment", "3D render", "AI artifacts", "oversaturated"],
    "style_raw": true
  }
}
```

## 💎 ماكرو الحراشف — دروع ماسية

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Macro subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Extreme macro photograph of fish scales showing each scale as a tiny iridescent mirror reflecting rainbow light",
    "secondary": "Poetic Arabic text about hidden beauty"
  },
  "subject": {
    "main": "Extreme macro shot of Arowana fish scales. Each scale is geometrically perfect, overlapping like medieval armor plates. Rainbow iridescent light reflecting off each scale surface. Visible micro-texture ridges and patterns on each individual scale. Water droplets sitting on scale surface catching light",
    "text_overlay": {
      "arabic_text": "كل حرشفة... عالم بحد ذاتها 💎",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, gold color",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "macro studio with black background",
    "lighting": {
      "type": "ring light creating rainbow iridescence on scales",
      "quality": "scientific photography quality"
    }
  },
  "style": {
    "artistic": "scientific macro meets fine art photography",
    "camera": {
      "angle": "perpendicular to scale surface",
      "lens": "macro 1:1 magnification",
      "aperture": "f/8 deep focus on scales"
    },
    "mood": "awe, scientific wonder, beauty in details",
    "realism_details": "visible micro-texture ridges on each scale, subsurface scattering showing translucent edges, iridescent rainbow reflections, water droplet refraction, chromatic aberration at frame edges"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "plastic look", "oversaturated"],
    "style_raw": true
  }
}
```

## 👁️ ماكرو عين السمكة — بوابة لعالم آخر

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 carousel crop",
    "safe_zone": "Eye subject MUST be centered vertically. Top 15% and Bottom 15% of the image will be CROPPED OUT.",
    "text_placement": "Place text in center 80% vertical area. AVOID absolute top/bottom edges."
  },
  "priority": {
    "primary": "Extreme macro of a fish eye showing an entire miniature aquarium world reflected in the pupil",
    "secondary": "Philosophical Arabic text"
  },
  "subject": {
    "main": "Extreme close-up of a Discus fish eye. The golden iris has intricate radial patterns. In the black pupil, you can see a reflection of the entire planted aquarium and the photographer. Skin texture around the eye shows tiny iridescent dots. Visible sclera veins",
    "text_overlay": {
      "arabic_text": "ماذا ترى العيون التي تراقبنا؟ 👁️",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, white with gold accent",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "underwater, extremely close to fish face",
    "lighting": {
      "type": "catchlight in pupil, soft side lighting",
      "quality": "revealing iris detail and skin texture"
    }
  },
  "style": {
    "artistic": "ultra-realistic scientific macro photography",
    "camera": {
      "angle": "straight into the eye",
      "lens": "extreme macro with extension tubes"
    },
    "mood": "intimate, philosophical, mind-blowing detail",
    "realism_details": "visible iris striations, catchlight reflections in pupil, micro-veins in sclera, iridescent dots on surrounding skin, subsurface scattering on translucent eye membrane"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["cartoonish", "3D render", "AI artifacts", "blurry iris", "oversaturated"],
    "style_raw": true
  }
}
```

---

# 📊 الفئة 6: إنفوجرافيك (S8) — أعلى Saves

---

## ✅❌ جدول توافق الأسماك

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Professional fish compatibility chart infographic with Arabic labels showing which fish can live together",
    "secondary": "Must be clear, saveable, and shareable"
  },
  "subject": {
    "main": "Clean modern infographic grid chart. Rows and columns labeled with fish species icons: Betta, Goldfish, Neon Tetra, Corydoras, Guppy, Angel Fish, Oscar, Pleco. Grid cells contain green checkmark (✅) for compatible and red X (❌) for incompatible. Some cells have yellow warning (⚠️) for conditional compatibility",
    "text_overlay": {
      "arabic_title": "جدول توافق الأسماك 🐟",
      "arabic_subtitle": "احفظ هذا الجدول! قبل ما تشتري سمكة جديدة 💾",
      "arabic_footer": "AQUAVO — دليلك لعالم الأحواض",
      "position": "title top, subtitle bottom",
      "font_style": "Cairo Bold Arabic, dark on light background",
      "font_size": "title large, labels small, footer small"
    }
  },
  "environment": {
    "setting": "clean white background with subtle aqua gradient border",
    "lighting": {
      "type": "flat professional design lighting"
    }
  },
  "style": {
    "artistic": "modern minimalist infographic design",
    "mood": "professional, useful, must-save"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

---

# 🔄 الفئة 7: تحولات مستحيلة (S2) — قبل/بعد

---

## 💰 حوض ١٠$ مقابل حوض ١٠٠٠$

### الشريحة 1
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dramatic side-by-side comparison of a cheap ugly fish tank versus a stunning professional aquascape",
    "secondary": "Arabic price comparison text that shocks"
  },
  "subject": {
    "main": "Split image. LEFT: ugly small plastic fish bowl with fake neon gravel, plastic plant, cloudy green water, sad goldfish. RIGHT: breathtaking Takashi Amano-style nature aquascape with perfect hardscape, lush carpeting plants, crystal clear water, school of Cardinal tetras, CO2 bubbles",
    "text_overlay": {
      "arabic_text_left": "حوض ١٠$ 😬",
      "arabic_text_right": "حوض ١٠٠٠$ 🤩",
      "arabic_question": "أيهما عندك؟ 😂",
      "position": "text_left top-left, text_right top-right, question bottom-center",
      "font_style": "Cairo Bold Arabic, red left, gold right",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "split composition, stark contrast in quality"
  },
  "style": {
    "artistic": "documentary comparison photography",
    "mood": "shocking contrast, aspirational, discussion-starter"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

---

# 🎮 الفئة 8: تفاعلي (S4) — تعليقات

---

## 🔍 خمّن السمكة — لعبة زووم

### الشريحة 1 — ماكرو مقرّب جداً
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Extreme macro of a mystery fish showing only a tiny abstract pattern of scales and color, unrecognizable",
    "secondary": "Arabic guessing game text"
  },
  "subject": {
    "main": "Extreme macro shot showing only 5-6 scales of a Discus fish. The scales show concentric ring patterns in blue and orange. So zoomed in it looks abstract and unrecognizable as any specific fish",
    "text_overlay": {
      "arabic_text": "خمّن السمكة! 🔍",
      "arabic_subtitle": "اكتب اسمها في التعليقات 👇",
      "position": "top_and_bottom",
      "font_style": "Cairo Bold Arabic, yellow with dark outline",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "abstract macro, no context clues"
  },
  "style": {
    "artistic": "abstract macro art photography",
    "mood": "mysterious, playful, engagement-driving"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

### الشريحة 2 — زووم متوسط (تلميح)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": { "primary": "Medium zoom of the mystery fish showing more of the pattern but still not fully identifiable", "secondary": "Arabic hint text" },
  "subject": {
    "main": "Medium macro shot of a Discus fish showing about 30% of its body — the distinctive round body shape is now somewhat visible, along with the blue-orange vertical bar pattern. Still cropped enough that the species isn't immediately obvious to beginners",
    "text_overlay": { "arabic_text": "تلميح 🔎", "arabic_subtitle": "جسم مستدير... ألوان عمودية... 🤔", "position": "top_and_bottom", "font_style": "Cairo Bold Arabic, yellow with dark outline", "font_size": "medium" }
  },
  "environment": { "setting": "dark tank background, medium zoom" },
  "style": { "artistic": "teaser macro photography", "mood": "building suspense, engaging" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts", "full fish visible"], "style_raw": true }
}
```

### الشريحة 3 — الكشف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Beautiful full reveal shot of a Discus fish with same color pattern from the macro",
    "secondary": "Arabic reveal text with fun emoji"
  },
  "subject": {
    "main": "Full body portrait of a stunning Blue Diamond Discus fish in a dark planted tank. Same blue and orange pattern visible on scales. Fish is in full display with spread fins. Professional aquarium photography quality",
    "text_overlay": {
      "arabic_text": "الجواب: سمكة ديسكس! 🎉",
      "arabic_subtitle": "هل عرفتها؟ 🏆",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, gold with confetti feel",
      "font_size": "large"
    }
  },
  "style": {
    "artistic": "professional fish portrait photography",
    "mood": "reveal, celebration, satisfaction"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

---

# 🏗️ الفئة 9: Budget Build (S7) — حوض بميزانية

---

## 💵 "حوض مذهل بـ ٣٠ دولار فقط"

### الشريحة 1
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Stunning finished nano aquarium that looks expensive but costs only $30, with Arabic budget text",
    "secondary": "Aspirational but achievable feel"
  },
  "subject": {
    "main": "A beautiful 10-gallon nano planted aquarium on a clean desk. Java moss on driftwood, Anubias plants, natural gravel, 6 neon tetras, a single Betta fish. Clean water, simple but artistic hardscape. Next to it: a small receipt showing $30 total with items listed",
    "text_overlay": {
      "arabic_text": "حوض مذهل بـ ٣٠ دولار فقط! 💵",
      "arabic_subtitle": "الخطوات بالتفصيل ← اسحب",
      "position": "top_center",
      "font_style": "Cairo Bold Arabic, white on green gradient bar",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "clean modern desk, warm room lighting",
    "lighting": {
      "type": "natural window light + aquarium LED",
      "quality": "warm, inviting, aspirational"
    }
  },
  "style": {
    "artistic": "lifestyle aquarium photography",
    "mood": "inspiring, achievable, must-save"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

### الشريحة 2 — قائمة المشتريات
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": { "primary": "Flat lay photo of all budget aquarium supplies laid out with price tags", "secondary": "Arabic itemized shopping list" },
  "subject": {
    "main": "Clean flat lay on white background: 10-gallon glass tank ($10), bag of natural gravel ($3), small sponge filter ($5), driftwood piece ($4), Java moss portion ($3), Anubias plant ($3), small LED clip light ($2). Each item has a small handwritten price tag",
    "text_overlay": { "arabic_text": "الخطوة ١: قائمة المشتريات 🛒", "arabic_total": "المجموع: ٣٠$ فقط!", "position": "title top, total bottom", "font_style": "Cairo Bold Arabic, white on dark bar, green total", "font_size": "medium" }
  },
  "environment": { "setting": "clean white flat lay surface" },
  "style": { "artistic": "product flat lay photography", "mood": "organized, helpful, budget-friendly" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts", "messy"], "style_raw": true }
}
```

### الشريحة 3 — التربة والديكور
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": { "primary": "Step-by-step photo showing gravel being laid and driftwood positioned in empty tank", "secondary": "Arabic step instruction" },
  "subject": {
    "main": "Hands placing natural gravel into a clean 10-gallon tank. Driftwood already positioned artistically. Gravel being sloped higher in the back for visual depth. Clean workspace. Natural daylight",
    "text_overlay": { "arabic_text": "الخطوة ٢: التربة والخشب 🪨", "arabic_tip": "نصيحة: ارفع التربة في الخلف لعمق بصري!", "position": "title top, tip bottom", "font_style": "Cairo Bold Arabic, white", "font_size": "medium" }
  },
  "environment": { "setting": "clean desk, natural light, work in progress" },
  "style": { "artistic": "tutorial step photography", "mood": "instructional, easy to follow" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts"], "style_raw": true }
}
```

### الشريحة 4 — الزراعة والماء
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": { "primary": "Tank now filled with water, plants attached to driftwood, sponge filter running", "secondary": "Arabic planting step" },
  "subject": {
    "main": "The 10-gallon tank now filled with clear water. Java moss tied to driftwood with fishing line. Anubias attached to a rock. Sponge filter running, gentle bubbles rising. Water slightly cloudy (new tank). LED light clipped on the rim",
    "text_overlay": { "arabic_text": "الخطوة ٣: الزراعة + الماء 🌱💧", "arabic_tip": "⚠️ انتظر ٢٤ ساعة قبل إضافة الأسماك!", "position": "title top, tip bottom", "font_style": "Cairo Bold Arabic, white, warning in yellow", "font_size": "medium" }
  },
  "environment": { "setting": "desk, partially set up aquarium", "lighting": { "type": "natural window + LED clip light", "quality": "bright, tutorial" } },
  "style": { "artistic": "tutorial step photography", "mood": "satisfying, progress" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts"], "style_raw": true }
}
```

### الشريحة 5 — النتيجة النهائية (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": { "primary": "The finished beautiful budget tank with fish swimming, stunning result", "secondary": "Arabic result + save CTA" },
  "subject": {
    "main": "The completed stunning 10-gallon nano aquarium. Crystal clear water. Java moss fully covering driftwood. Anubias thriving. 6 neon tetras schooling. A beautiful male Betta swimming among the plants. Tank light creating perfect warm glow. The $30 receipt visible in the corner",
    "text_overlay": {
      "arabic_text": "النتيجة: حوض بـ ٣٠$ يبدو بألف! 🤩",
      "arabic_subtitle": "💾 احفظ الخطوات | 📤 شارك مع صديق يريد حوض!",
      "position": "title top, cta bottom", "font_style": "Cairo Bold Arabic, gold title, white CTA", "font_size": "large"
    }
  },
  "environment": { "setting": "clean modern desk, warm ambient lighting" },
  "style": { "artistic": "lifestyle aquarium photography, aspirational", "mood": "proud, inspiring, achievable" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner, 20px from edges", "font": "Inter Bold, 14px, #FFFFFF white", "icon_color": "#00A884 seafoam fish icon", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL across all images" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["cartoonish", "AI artifacts", "cluttered"], "style_raw": true }
}
```

---

# 🌊 الفئة 10: The Silent Tank (S9) — Cinemagraph

---

## 🧘 الحوض الصامت — سكون مذهل

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Ultra-cinematic photograph of a breathtaking aquarium in a dark room that makes viewers stare at it hypnotically",
    "secondary": "Minimal poetic Arabic text"
  },
  "subject": {
    "main": "A large stunning nature aquarium in a completely dark room. The tank is the only light source, casting blue-green glow on the wall behind it. Inside: perfect Amano-style aquascape with a valley layout, carpeting plants, towering rocks, fine mist of CO2 bubbles. A single Betta fish hovers motionless in the center of the valley",
    "text_overlay": {
      "arabic_text": "أحياناً... السكون أجمل من الحركة 🌊",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, soft white with cyan glow",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "pitch dark room, aquarium is only illumination",
    "lighting": {
      "type": "aquarium LED casting ambient glow on walls and furniture",
      "quality": "atmospheric, meditative, dreamy",
      "direction": "from inside tank outward"
    }
  },
  "style": {
    "artistic": "fine art aquarium photography, contemplative",
    "camera": {
      "angle": "straight on, eye level, slightly wide to show dark room",
      "lens": "35mm",
      "aperture": "f/1.8"
    },
    "mood": "meditative, hypnotic, makes viewer stop and stare"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF white",
    "icon_color": "#00A884 seafoam fish icon",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },
  "constraints": {
    "exclusions": ["busy composition", "multiple fish", "cluttered decorations", "visible equipment", "cartoonish", "AI artifacts"],
    "style_raw": true
  }
}
```

---

# 🔥 ٣ أفكار إضافية مبتكرة (لم تُستخدم في الريلزات)

---

## 💀 "اللون الذي يعني الموت" — صورة صادمة

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dramatic split image showing a fish changing from vibrant healthy colors to pale stressed colors",
    "secondary": "Alarming Arabic health warning text"
  },
  "subject": {
    "main": "Split image of the same Betta fish. LEFT: vibrant deep blue-red colors, spread fins, active posture. RIGHT: same fish but pale, clamped fins, listless posture, slightly cloudy eye. Both in identical tanks to show the fish is the only variable",
    "text_overlay": {
      "arabic_text_left": "سمكة صحية ✅",
      "arabic_text_right": "سمكة مريضة ❌",
      "arabic_title": "اللون يخبرك بكل شيء! 🚨",
      "arabic_save": "احفظ هذا... قد ينقذ سمكتك 💾",
      "position": "title top, labels over halves, save bottom",
      "font_style": "Cairo Bold Arabic, green left, red right",
      "font_size": "large"
    }
  },
  "style": {
    "artistic": "medical comparison editorial photography",
    "mood": "urgent, educational, lifesaving"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

## 🌈 "الحوض الذي يتغير لونه" — تحول مذهل

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "The same aquarium photographed 4 times showing how different LED color temperatures completely transform its appearance",
    "secondary": "Mind-blowing Arabic comparison text"
  },
  "subject": {
    "main": "2x2 grid of the SAME planted aquarium photographed under 4 different LED colors: Top-left: warm white (cozy golden), Top-right: cool white (crisp modern), Bottom-left: deep blue moonlight (mystical night), Bottom-right: sunrise pink-orange (dramatic dawn). Same fish, same plants, completely different moods",
    "text_overlay": {
      "arabic_title": "نفس الحوض... ٤ شخصيات مختلفة! 🌈",
      "arabic_labels": "دافئ 🟡 | بارد 🔵 | ليلي 🌙 | شروق 🌅",
      "arabic_question": "أي واحد تختار لغرفتك؟ 👇",
      "position": "title top, labels on each quadrant, question bottom",
      "font_style": "Cairo Bold Arabic, matching color of each quadrant",
      "font_size": "medium"
    }
  },
  "style": {
    "artistic": "comparison grid photography, same subject different moods",
    "mood": "surprising, decision-making, comment-driving"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

## 🏰 "أصغر حوض في العالم" — Mini Tank مع عدسة مكبرة

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Photograph of a tiny nano aquarium inside a glass jar on a desk, so small it needs a magnifying glass to see the details",
    "secondary": "Wonder-inducing Arabic text"
  },
  "subject": {
    "main": "A tiny 200ml glass jar aquarium sitting on a wooden desk next to a vintage magnifying glass. Inside the jar: impossibly detailed miniature aquascape with tiny moss, a single baby shrimp, micro air bubbles. The magnifying glass is positioned to show enlarged view of the shrimp inside. Books and a coffee cup in soft background blur",
    "text_overlay": {
      "arabic_text": "أصغر حوض في العالم 🔬",
      "arabic_subtitle": "تحتاج عدسة مكبرة لتراه!",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, white with warm wood tone shadow",
      "font_size": "medium-large"
    }
  },
  "environment": {
    "setting": "cozy desk setup, warm natural window light",
    "lighting": {
      "type": "warm golden hour window light",
      "quality": "soft, inviting, lifestyle photography"
    }
  },
  "style": {
    "artistic": "lifestyle macro with storytelling",
    "camera": {
      "angle": "45 degrees looking down at desk",
      "lens": "50mm",
      "aperture": "f/2.0 shallow depth"
    },
    "mood": "wonder, delight, share-worthy"
  },
  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  }
}
```

---


---

# 🧹 الفئة 12: الشغل الوصخ — الواقع اللي ما حد يراويك

> [!IMPORTANT]
> **الفكرة:** المبتدئ لما يشوف كل شي يلمع بصفحتك ويشوفحوضه فيه طحالب = ييأس ويترك الهواية.
> **راويه المشكلة والحل بصورة واقعية — هذا المحتوى اللي يبني ثقة حقيقية!**

> ⚠️ **القاعدة الذهبية #3:** لا تصير مثالي! أبيّن الطحالب الحقيقية، الماء العكر، الإيد وهي وسخة.
> اللهجة عراقية (القاعدة #1) + الصور لازم تكون **raw وواقعية** — بدون polish!

---

## 🟤 كاروسيل 1: "فلترك وصخ؟ عادي!" — 8 شرائح

### الشريحة 1 — الغلاف (الصدمة)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Hyper-realistic close-up of a disgustingly dirty aquarium filter sponge being held by a gloved hand, dripping brown murky water",
    "secondary": "Arabic shock title overlay"
  },
  "subject": {
    "main": "A hand wearing blue nitrile glove holding a canister filter sponge that is completely clogged with brown-green biological waste and detritus. Brown dirty water is dripping from it into a bucket below. The sponge is visibly compressed and saturated. Behind it, a clean aquarium with healthy fish is slightly visible but out of focus",
    "text_overlay": {
      "arabic_text": "🐟 AQUAVO",
      "arabic_subtitle": "فلترك وصخ؟ هذا طبيعي! 🤮",
      "arabic_episode": "دليل الصيانة الحقيقية",
      "position": "title top-right, subtitle center, episode bottom",
      "font_style": "Cairo Bold Arabic, white title, yellow-green subtitle for gross effect",
      "font_size": "extra_large"
    }
  },
  "environment": {
    "setting": "realistic home aquarium maintenance area, sink or bucket nearby",
    "lighting": {
      "type": "Hard Flash Photography (Setup #6)",
      "direction": "direct on-camera flash",
      "quality": "raw, harsh, unflattering — like someone took a phone photo mid-cleaning"
    }
  },
  "style": {
    "artistic": "raw documentary photography, NOT polished",
    "camera": {
      "angle": "close-up, slightly tilted like a casual phone shot",
      "lens": "28mm wide angle",
      "aperture": "f/4, moderate depth"
    },
    "mood": "gross but oddly satisfying, real, authentic"
  },
  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "top_center",
    "font": "Inter Bold, 16px, #FFFFFF",
    "icon_color": "#00A884",
    "background": "pill #000000 at 50% opacity, border-radius 12px",
    "consistency": "IDENTICAL across all images"
  },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": {
    "exclusions": ["clean polished look", "studio perfection", "stock photo aesthetic", "text", "logos other than AQUAVO", "watermarks"]
  },
  "seo": {
    "hashtags": ["#AQUAVO", "#AquariumMaintenance", "#FilterCleaning", "#FishKeeping"],
    "keywords": ["aquarium filter cleaning", "dirty filter sponge", "fish tank maintenance"]
  }
}
```

### الشريحة 2 — الطحالب البنية على الزجاج
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Realistic aquarium glass covered in brown diatom algae with a finger drawing a smiley face in it",
    "secondary": "Arabic relatable text"
  },
  "subject": {
    "main": "Inside view of an aquarium where the front glass is covered in a thin layer of brown diatom algae. A finger has drawn a sad smiley face :( in the algae on the glass. Behind the dirty glass, fish are swimming normally, plants are slightly visible. The brown film is realistic and patchy — thicker in corners, thinner in middle",
    "text_overlay": {
      "arabic_text": "الطحالب البنية 😩",
      "arabic_subtitle": "كل مبتدئ يمر بيها — وهي طبيعية!",
      "position": "top and bottom",
      "font_style": "Cairo Bold Arabic, white with brown shadow",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "home aquarium, natural room lighting",
    "lighting": {
      "type": "aquarium LED light from above, room ambient light",
      "quality": "natural mixed lighting, not studio"
    }
  },
  "style": {
    "artistic": "candid phone photography, imperfect framing",
    "camera": { "angle": "straight-on glass view", "lens": "phone camera 26mm", "aperture": "f/1.8" },
    "mood": "relatable, slightly humorous, frustrating but normal"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "constraints": { "exclusions": ["clean glass", "polished look", "studio lighting"] }
}
```

### الشريحة 3 — طحالب على النباتات
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Macro close-up of brown and green algae growing on aquarium plant leaves, realistic and ugly",
    "secondary": "Arabic diagnostic text"
  },
  "subject": {
    "main": "Extreme close-up of an Anubias leaf inside an aquarium completely covered in brown diatom algae and green spot algae. The leaf edges are visible but the surface is coated in fuzzy brown-green growth. A small Nerite snail is on one corner eating the algae. Other leaves in background also affected. Water is slightly cloudy",
    "text_overlay": {
      "arabic_text": "الطحالب على النباتات 🌿🟤",
      "arabic_subtitle": "السبب: إضاءة كثيرة + سماد قليل",
      "position": "top and bottom",
      "font_style": "Cairo Bold Arabic, white on semi-transparent dark bar",
      "font_size": "medium"
    }
  },
  "environment": {
    "setting": "inside planted aquarium, underwater macro",
    "lighting": { "type": "aquarium LED", "quality": "harsh direct aquarium light showing every detail of algae" }
  },
  "style": {
    "artistic": "documentary macro photography",
    "camera": { "angle": "extreme close-up macro", "lens": "macro 100mm", "aperture": "f/2.8 shallow depth" },
    "mood": "diagnostic, clinical, problem-identification"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 4 — تغيير الماء الحقيقي
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Overhead shot of aquarium water change in progress — siphon tube draining dirty brown water into a bucket",
    "secondary": "Arabic step-by-step overlay"
  },
  "subject": {
    "main": "Bird's eye view: a gravel vacuum siphon inserted into aquarium substrate, sucking up debris. A clear hose runs from the tank to a white bucket on the floor. The water in the bucket is visibly brown/yellow compared to the clearer tank water. Fish are swimming away from the siphon. Some gravel particles visible in the hose. Realistic home setting — towel on floor, water drops on surface",
    "text_overlay": {
      "arabic_text": "🔄 تغيير الماء الأسبوعي",
      "arabic_subtitle": "٢٥-٣٠٪ من الماء كل أسبوع = سمك سعيد",
      "position": "top title, bottom subtitle",
      "font_style": "Cairo Bold Arabic, white",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "home, aquarium on stand, bucket on floor",
    "lighting": { "type": "natural room light from window", "quality": "warm ambient, realistic home" }
  },
  "style": {
    "artistic": "overhead instructional photography",
    "camera": { "angle": "top-down 90 degrees", "lens": "24mm wide", "aperture": "f/5.6" },
    "mood": "instructional, no-nonsense, practical"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 5 — غسل الفلتر (الطريقة الصح)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Split comparison: LEFT wrong way (tap water killing bacteria), RIGHT correct way (squeezing filter in tank water)",
    "secondary": "Arabic right vs wrong comparison"
  },
  "subject": {
    "main": "Split screen with red X on left, green checkmark on right. LEFT SIDE: filter sponge under running tap water — clean but WRONG (bacteria dying). RIGHT SIDE: hands squeezing dirty filter sponge into a bucket of old tank water — dirty but CORRECT (bacteria preserved). Both shots realistic, close-up of hands working",
    "text_overlay": {
      "arabic_text": "❌ خطأ شائع | ✅ الطريقة الصحيحة",
      "arabic_left": " ❌ ماء الحنفية = تقتل البكتيريا!",
      "arabic_right": "✅ ماء الحوض القديم = تحافظ على البكتيريا",
      "position": "title top, labels on each side",
      "font_style": "Cairo Bold Arabic, red vs green",
      "font_size": "large"
    }
  },
  "environment": { "setting": "home bathroom/kitchen sink area" },
  "style": {
    "artistic": "educational split-screen comparison",
    "camera": { "angle": "close-up hands", "lens": "35mm", "aperture": "f/3.5" },
    "mood": "educational, urgent warning, practical"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 6 — الحوض بعد التنظيف (قبل/بعد)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dramatic before/after split of the same aquarium — LEFT dirty and algae-covered, RIGHT sparkling clean after maintenance",
    "secondary": "Arabic satisfying transformation text"
  },
  "subject": {
    "main": "Same aquarium, split down the middle. LEFT (Before): brown algae on glass, cloudy water, debris on substrate, plants covered in algae, dull colors. RIGHT (After): crystal clear water, clean glass, vibrant green plants, bright fish colors, clean white sand. The transformation is dramatic and satisfying. Arrow pointing from left to right",
    "text_overlay": {
      "arabic_text": "قبل ← بعد 🤩",
      "arabic_subtitle": "ساعة صيانة واحدة = هذا الفرق!",
      "position": "title top center, subtitle bottom",
      "font_style": "Cairo Bold Arabic, white",
      "font_size": "extra_large"
    }
  },
  "environment": { "setting": "same tank, different conditions" },
  "style": {
    "artistic": "before/after comparison photography",
    "camera": { "angle": "straight front view, identical framing both sides", "lens": "35mm", "aperture": "f/4" },
    "mood": "satisfying, motivational, achievable"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 7 — جدول الصيانة الأسبوعي
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Clean infographic showing weekly aquarium maintenance schedule checklist",
    "secondary": "Arabic weekly schedule with icons"
  },
  "subject": {
    "main": "Dark teal gradient background. A beautifully designed weekly maintenance checklist infographic with icons. Items: (1) تغيير ٢٥٪ ماء 🔄 (2) تنظيف الزجاج 🧽 (3) فحص الفلتر كل شهر 🔧 (4) اختبار الماء أسبوعياً 🧪 (5) إزالة الأوراق الميتة 🍂 (6) تنظيف الحصى بالسيفون 🪣. Each item has a checkbox icon. Professional infographic design with AQUAVO branding",
    "text_overlay": {
      "arabic_text": "📋 جدول الصيانة الأسبوعي",
      "arabic_items": "full checklist as described above",
      "position": "title top, items listed vertically",
      "font_style": "Cairo Bold Arabic, white on dark, icons colored",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "dark teal gradient background (#004D61 to #00A884)" },
  "style": { "artistic": "modern infographic design", "mood": "organized, professional, practical" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 8 — الدرس (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Motivational closing slide — clean tank with happy fish, maintenance tools neatly arranged beside it",
    "secondary": "Arabic motivational CTA with save and share triggers"
  },
  "subject": {
    "main": "A sparkling clean aquarium with vibrant fish swimming happily. Beside it on the counter: neatly arranged maintenance tools — siphon, algae scraper, water test kit, clean sponge. Everything organized and satisfying. The message: maintenance isn't scary, it's rewarding",
    "text_overlay": {
      "arabic_text": "💡 الحوض الوسخ مو عيب — تركه وسخ هو العيب!",
      "arabic_question": "❓ شنو أوسخ شي شفته بحوضك؟ احكيلنا بصراحة! 😂",
      "arabic_cta": "💾 احفظ الجدول عشان ما تنسى! | 📤 أرسله لصاحبك اللي حوضه وسخ 😂",
      "arabic_dm": "💬 أرسلنا 'تنظيف' بالخاص ونرسلك الدليل الكامل!",
      "arabic_next": "➡️ التالي: صيدلية الحوض — أدوية الطوارئ 💊",
      "position": "center_vertical, stacked",
      "font_style": "Cairo Bold Arabic, white on dark, CTA in #00A884 green",
      "font_size": "large"
    }
  },
  "environment": { "setting": "dark teal gradient (#004D61 to #00A884)" },
  "style": { "artistic": "motivational closing slide", "mood": "empowering, no-judgment, practical" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right corner", "font": "Inter Bold, 14px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "seo": {
    "hashtags": ["#AQUAVO", "#AquariumMaintenance", "#FishCare101", "#BrownAlgae", "#FilterCleaning"],
    "keywords": ["aquarium cleaning guide", "brown algae fix", "filter maintenance", "fish tank care"]
  }
}
```

# 💊 الفئة 13: صيدلية الحوض — أدوية الطوارئ اللي لازم تكون عندك

> [!WARNING]
> **هذا أهم من الأكل الملون!** السمكة ممكن تمرض بنص الليل — لازم تكون جاهز.
> المبتدئ ما يعرف شنو يشتري إلا لما يخسر سمكته الأولى. علّمه قبل لا يصير الشي!

---

## 💊 كاروسيل: "صيدلية الطوارئ" — 6 شرائح

### الشريحة 1 — الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dramatic overhead shot of aquarium emergency medical supplies laid out like a military medkit — organized and professional",
    "secondary": "Arabic pharmacy title"
  },
  "subject": {
    "main": "Bird's eye view of a dark surface (slate or dark wood). Neatly arranged aquarium supplies: coarse aquarium salt in a jar, methylene blue bottle with blue liquid, anti-fungal medication bottle, water dechlorinator drops, API water test kit with colorful test tubes, small net, quarantine tank visible in corner. Arranged like a flat-lay medical kit. Everything labeled and organized",
    "text_overlay": {
      "arabic_text": "صيدلية الحوض 💊🐟",
      "arabic_subtitle": "٦ أشياء لازم تكون عندك قبل ما تمرض سمكتك!",
      "position": "title top-center, subtitle bottom",
      "font_style": "Cairo Bold Arabic, white title, coral #FF6F61 subtitle for urgency",
      "font_size": "extra_large"
    }
  },
  "environment": {
    "setting": "dark flat-lay surface, overhead product photography",
    "lighting": { "type": "Spotlight (Setup #3)", "direction": "directly from above, single focused beam", "quality": "dramatic, each item casting small shadow" }
  },
  "style": {
    "artistic": "premium flat-lay product photography",
    "camera": { "angle": "top-down 90 degrees", "lens": "35mm", "aperture": "f/5.6 everything in focus" },
    "mood": "urgent, professional, must-save"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "seo": {
    "hashtags": ["#AQUAVO", "#FishCare101", "#AquariumMedicine", "#FishKeeping"],
    "keywords": ["aquarium first aid kit", "fish medicine", "emergency fish care"]
  }
}
```

### الشريحة 2 — ملح الأحواض الخشن
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Close-up of aquarium salt crystals being dissolved in a quarantine tank with a sick fish visible",
    "secondary": "Arabic educational text about salt treatment"
  },
  "subject": {
    "main": "Macro close-up of coarse aquarium salt (large white crystals) being poured by hand into a small quarantine tank. The salt is dissolving in the water creating swirling patterns. A slightly sick Goldfish with white spots (Ich) is visible in the background of the quarantine tank. The salt jar is partially visible with clear label",
    "text_overlay": {
      "arabic_text": "١. ملح الأحواض الخشن 🧂",
      "arabic_subtitle": "أقوى علاج أول — يعالج الإك والفطريات والإجهاد",
      "arabic_dosage": "الجرعة: ١ ملعقة كبيرة لكل ٢٠ لتر",
      "position": "title top, subtitle middle, dosage bottom in highlighted box",
      "font_style": "Cairo Bold Arabic, white, dosage in green highlight box",
      "font_size": "large"
    }
  },
  "environment": { "setting": "quarantine tank setup, simple bare tank", "lighting": { "type": "bright overhead light", "quality": "clinical, clear" } },
  "style": {
    "artistic": "medical/educational close-up",
    "camera": { "angle": "45 degree close-up", "lens": "50mm", "aperture": "f/2.8" },
    "mood": "educational, urgent, helpful"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 3 — الميثيلين بلو (صبغة زرقاء)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dramatic shot of methylene blue drops falling into water creating swirling blue patterns — visually stunning",
    "secondary": "Arabic medication info"
  },
  "subject": {
    "main": "A dropper releasing methylene blue drops into clear aquarium water. The blue dye is creating beautiful swirling patterns as it disperses — like ink in water. The blue is vivid and hypnotic. A quarantine tank is visible. The methylene blue bottle is partially visible in foreground",
    "text_overlay": {
      "arabic_text": "٢. ميثيلين بلو 💙",
      "arabic_subtitle": "مضاد بكتيري + فطري — أسرع علاج للجروح",
      "arabic_warning": "⚠️ يصبغ كل شي — استخدم بحذر!",
      "position": "title top, subtitle center, warning bottom",
      "font_style": "Cairo Bold Arabic, white, warning in yellow",
      "font_size": "large"
    }
  },
  "environment": { "setting": "dark background to show blue dye contrast", "lighting": { "type": "Low Key (Setup #2)", "quality": "dramatic backlight through water showing dye dispersion" } },
  "style": {
    "artistic": "macro fluid photography, cinematic",
    "camera": { "angle": "macro close-up of drops", "lens": "macro 100mm", "aperture": "f/2.8" },
    "mood": "visually mesmerizing, educational, important"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 4 — دواء الفطريات + دواء البكتيريا
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Two medication bottles side by side with split-screen showing fish diseases they treat",
    "secondary": "Arabic medication comparison"
  },
  "subject": {
    "main": "Split screen. LEFT: Anti-fungal medication bottle with a small image showing cotton-like white fungus growing on a fish's body. RIGHT: Anti-bacterial medication bottle with a small image showing red streaks and fin rot on a fish. Both bottles are real aquarium medication brands. Center dividing line between the two",
    "text_overlay": {
      "arabic_text": "٣. مضاد الفطريات | ٤. مضاد البكتيريا",
      "arabic_left": "🍄 فطريات = قطن أبيض على الجسم",
      "arabic_right": "🦠 بكتيريا = خطوط حمراء + تآكل الزعانف",
      "position": "title top, descriptions on each side",
      "font_style": "Cairo Bold Arabic, white",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "clean dark background" },
  "style": {
    "artistic": "medical comparison infographic",
    "camera": { "angle": "front product shot", "lens": "50mm", "aperture": "f/4" },
    "mood": "diagnostic, clinical, life-saving information"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 5 — مزيل الكلور + طقم الاختبار
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Water test kit with colorful test tubes showing different water parameters, dechlorinator bottle beside it",
    "secondary": "Arabic essential tools text"
  },
  "subject": {
    "main": "An API Master Test Kit opened showing colorful test tubes — ammonia (yellow-green), nitrite (blue-purple), pH (varying colors). Beside it, a bottle of water conditioner/dechlorinator. The test tubes are arranged in a row showing different colors like a rainbow. A color chart card is visible. Clean organized shot on dark surface",
    "text_overlay": {
      "arabic_text": "٥. مزيل الكلور | ٦. طقم اختبار الماء 🧪",
      "arabic_subtitle": "مزيل الكلور = لازم مع كل تغيير ماء\nالاختبار = تعرف المشكلة قبل ما تشوفها!",
      "position": "title top, subtitle center",
      "font_style": "Cairo Bold Arabic, white",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "dark surface, organized flat-lay", "lighting": { "type": "soft overhead", "quality": "clean product photography" } },
  "style": {
    "artistic": "product education photography",
    "camera": { "angle": "45 degree overhead", "lens": "35mm", "aperture": "f/4" },
    "mood": "organized, essential, must-buy"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 6 — القائمة الكاملة (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Clean infographic checklist of the complete aquarium first-aid kit with save CTA",
    "secondary": "Arabic complete pharmacy checklist"
  },
  "subject": {
    "main": "Dark gradient background (#004D61 to #00A884). A premium checklist infographic titled 'صيدلية الحوض الكاملة'. Items with checkboxes and emojis: ☑ ملح أحواض خشن 🧂 ☑ ميثيلين بلو 💙 ☑ مضاد فطريات 🍄 ☑ مضاد بكتيريا 🦠 ☑ مزيل كلور 💧 ☑ طقم اختبار ماء 🧪 ☑ حوض حجر صحي 🏥 ☑ شبكة صغيرة 🥅. Professional design with AQUAVO branding throughout",
    "text_overlay": {
      "arabic_text": "📋 القائمة الكاملة — اطبعها وعلّقها!",
      "arabic_cta": "💾 هالقائمة تنقذ سمكتك بنص الليل — احفظها الحين! 🌙",
      "arabic_share": "📤 أرسله لكل شخص عنده حوض — ممكن تنقذله سمكته!",
      "arabic_question": "❓ چم شي من القائمة عندك؟ اكتب الرقم! 🔢",
      "arabic_dm": "💬 أرسلنا 'صيدلية' بالخاص ونرسلك القائمة كاملة! 💊",
      "position": "title top, checklist center, CTAs bottom stacked",
      "font_style": "Cairo Bold Arabic, checklist in white, CTA in coral #FF6F61",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "dark AQUAVO gradient" },
  "style": { "artistic": "premium infographic checklist", "mood": "urgent, essential, must-save" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "seo": {
    "hashtags": ["#AQUAVO", "#FishCare101", "#AquariumMedicine", "#FishEmergency", "#FishKeeping"],
    "keywords": ["aquarium first aid", "fish medicine kit", "methylene blue fish", "aquarium salt treatment"]
  }
}
```

---

# 🌿 الفئة 14: النباتات المظلومة — مشاكل وحلول النباتات المائية

> [!IMPORTANT]
> **الملف مركّز ٩٠٪ على السمك — والنباتات مظلومة!**
> المبتدئ يشتري نبات ويموت عنده ويصير عنده عقدة.
> لازم نعلمه ليش نباتاته تصفر وإيش النباتات اللي ما تحتاج CO2.

---

## 🟡 كاروسيل 1: "ليش نباتاتي تصفر؟" — 6 شرائح

### الشريحة 1 — الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dramatic macro of a yellowing aquarium plant leaf underwater — half green half yellow, transition visible",
    "secondary": "Arabic frustrated question title"
  },
  "subject": {
    "main": "Extreme close-up underwater: a single aquarium plant leaf (Amazon Sword or Echinodorus) that is half healthy green and half dying yellow. The transition from green to yellow is gradual and realistic. Tiny bubbles on the green part (pearling). The yellow part shows brown spots and translucent edges. A small shrimp is sitting on the healthy green half. Background shows more struggling plants slightly out of focus",
    "text_overlay": {
      "arabic_text": "ليش نباتاتي دتصفر؟! 😩🌿",
      "arabic_subtitle": "التشخيص والعلاج بـ ٦ شرائح",
      "position": "title center, subtitle bottom",
      "font_style": "Cairo Bold Arabic, white title, yellow-green gradient text",
      "font_size": "extra_large"
    }
  },
  "environment": {
    "setting": "inside planted aquarium, underwater macro view",
    "lighting": { "type": "aquarium LED from above", "quality": "natural planted tank lighting, slightly warm" }
  },
  "style": {
    "artistic": "documentary macro photography, problem-focused",
    "camera": { "angle": "extreme close-up macro underwater", "lens": "macro 100mm", "aperture": "f/2.8 shallow depth" },
    "mood": "diagnostic, relatable frustration, hopeful"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "seo": {
    "hashtags": ["#AQUAVO", "#PlantedTank", "#AquariumPlants", "#YellowLeaves", "#FishKeeping"],
    "keywords": ["aquarium plant yellowing", "why are my aquarium plants dying", "plant deficiency"]
  }
}
```

### الشريحة 2 — تشخيص: نقص البوتاسيوم
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Close-up of plant leaf with pinholes and yellow edges — classic potassium deficiency symptoms",
    "secondary": "Arabic diagnostic text with solution"
  },
  "subject": {
    "main": "Underwater macro: a plant leaf (Java Fern or Hygrophila) showing classic potassium deficiency — small pinholes appearing in older leaves, edges turning yellow-brown while center stays green. Multiple leaves showing progressive symptoms from mild to severe. Diagnostic red circles highlighting the problem areas",
    "text_overlay": {
      "arabic_text": "نقص البوتاسيوم (K) 🟡",
      "arabic_symptoms": "الأعراض: ثقوب صغيرة + اصفرار الحواف",
      "arabic_solution": "✅ الحل: سماد بوتاسيوم سائل — نتيجة خلال أسبوع!",
      "position": "title top, symptoms middle, solution bottom in green box",
      "font_style": "Cairo Bold Arabic, white, solution highlighted in green",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "underwater planted tank", "lighting": { "type": "bright LED", "quality": "clinical diagnostic" } },
  "style": {
    "artistic": "medical diagnostic photography adapted for plants",
    "camera": { "angle": "macro close-up", "lens": "macro 100mm", "aperture": "f/2.8" },
    "mood": "clinical, diagnostic, solution-oriented"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 3 — تشخيص: نقص الحديد
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "New pale white/yellow leaves on aquarium plant while old leaves stay green — iron deficiency",
    "secondary": "Arabic iron deficiency diagnosis"
  },
  "subject": {
    "main": "Underwater shot of a Ludwigia or Rotala plant where the NEW growth tips are pale white-yellow, almost see-through, while the OLDER leaves below are still dark green. The contrast between new pale growth and old green growth is dramatic. The plant is clearly struggling at the top but healthy at the bottom",
    "text_overlay": {
      "arabic_text": "نقص الحديد (Fe) ⬜",
      "arabic_symptoms": "الأعراض: أوراق جديدة شاحبة/بيضاء — القديمة خضراء",
      "arabic_solution": "✅ الحل: سماد حديد سائل — الأوراق الجديدة تتلون خلال أيام!",
      "position": "title top, symptoms middle, solution bottom",
      "font_style": "Cairo Bold Arabic, white",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "planted aquarium, colorful background plants" },
  "style": {
    "artistic": "botanical diagnostic photography",
    "camera": { "angle": "side view close-up", "lens": "50mm", "aperture": "f/2.8" },
    "mood": "educational, diagnostic, hopeful"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 4 — إنفوجرافيك: دليل التشخيص السريع
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Infographic diagnostic chart — plant leaf symptoms mapped to nutrient deficiencies",
    "secondary": "Arabic quick diagnostic guide"
  },
  "subject": {
    "main": "Dark teal background. A professional infographic with a central plant leaf icon. Arrows pointing to different symptoms with their causes: (1) حواف صفراء → بوتاسيوم (2) أوراق جديدة بيضاء → حديد (3) ثقوب → بوتاسيوم (4) أوراق سفلية تموت → نيتروجين (5) نمو بطيء → CO2/إضاءة (6) طحالب على الأوراق → إضاءة كثيرة. Visual diagnostic flowchart design",
    "text_overlay": {
      "arabic_text": "🔍 دليل التشخيص السريع",
      "position": "title top center",
      "font_style": "Cairo Bold Arabic, white on dark teal",
      "font_size": "large"
    }
  },
  "environment": { "setting": "dark teal gradient (#004D61)" },
  "style": { "artistic": "medical diagnostic infographic", "mood": "organized, must-save, reference" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 5 — CTA الحفظ
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Motivational closing slide with healthy lush planted tank — the reward of proper plant care",
    "secondary": "Arabic save CTA"
  },
  "subject": {
    "main": "A lush, healthy planted aquarium bursting with vibrant green plants, red Rotala, carpeting plants, and happy shrimp grazing. Crystal clear water. This is the GOAL — what proper nutrition achieves. Beautiful lighting",
    "text_overlay": {
      "arabic_text": "💡 النبات السعيد = ماء نظيف = سمك سعيد!",
      "arabic_cta": "💾 احفظ دليل التشخيص — ترجعله كل ما تصفّر ورقة! 🌿",
      "arabic_question": "❓ شنو مشكلة نباتاتك؟ اكتب بالتعليقات ونساعدك!",
      "arabic_share": "📤 أرسلها لصاحبك اللي نباتاته تموت عنده 😂🌿",
      "arabic_dm": "💬 أرسلنا 'نباتات' بالخاص ونساعدك بالتشخيص!",
      "position": "center stacked",
      "font_style": "Cairo Bold Arabic, white, CTA in #00A884",
      "font_size": "large"
    }
  },
  "environment": { "setting": "dark gradient" },
  "style": { "artistic": "aspirational planted tank photography", "mood": "motivational, rewarding, community" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right", "font": "Inter Bold, 14px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

---

## 🌱 كاروسيل 2: "نباتات بدون CO2 — أحسن ١٠ نباتات للمبتدئين" — 6 شرائح

### الشريحة 1 — الغلاف
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Beautiful aquascape made ENTIRELY of easy no-CO2 plants — proving you don't need expensive equipment",
    "secondary": "Arabic encouraging title for beginners"
  },
  "subject": {
    "main": "A stunning aquarium filled with only easy, no-CO2 plants: Java Fern, Anubias, Java Moss, Amazon Sword, Vallisneria, and floating plants (Salvinia). The tank looks incredible despite being low-tech. Fish swimming through lush greenery. NO CO2 system visible. Simple hang-on-back filter and basic LED light only",
    "text_overlay": {
      "arabic_text": "نباتات بدون CO2 🌿💚",
      "arabic_subtitle": "أحسن ١٠ نباتات للمبتدئين — تعيش بالماء والنور بس!",
      "position": "title top-center, subtitle bottom",
      "font_style": "Cairo Bold Arabic, white title, green subtitle",
      "font_size": "extra_large"
    }
  },
  "environment": {
    "setting": "low-tech planted aquarium, no visible CO2 equipment",
    "lighting": { "type": "Golden Hour (Setup #1)", "quality": "warm glow through planted tank, inviting" }
  },
  "style": {
    "artistic": "aspirational low-tech aquascape photography",
    "camera": { "angle": "front view, slightly low angle hero shot", "lens": "35mm", "aperture": "f/2.8" },
    "mood": "encouraging, achievable, beautiful"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "seo": {
    "hashtags": ["#AQUAVO", "#PlantedTank", "#NoCO2", "#BeginnerPlants", "#AquariumPlants"],
    "keywords": ["easy aquarium plants no CO2", "beginner aquarium plants", "low tech planted tank"]
  }
}
```

### الشريحة 2 — Java Fern + Anubias
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Side-by-side beauty shots of Java Fern and Anubias attached to driftwood underwater — the two easiest plants",
    "secondary": "Arabic plant profiles"
  },
  "subject": {
    "main": "Split composition: LEFT — a lush Java Fern (Microsorum pteropus) with long wavy green leaves attached to dark driftwood, baby plantlets growing from leaf edges. RIGHT — Anubias Nana with thick round dark green leaves attached to a stone, a tiny flower blooming underwater. Both look stunning. Small shrimp visible on Anubias",
    "text_overlay": {
      "arabic_text": "🥇 الملكان: Java Fern + Anubias",
      "arabic_left": "جافا فيرن: اربطها بالخشب — لا تدفنها!",
      "arabic_right": "أنوبياس: أقوى نبات — تتحمل كل شي!",
      "arabic_tip": "⭐ يعيشون بدون CO2، بدون سماد، بدون إضاءة قوية!",
      "position": "title top, descriptions on sides, tip bottom in green box",
      "font_style": "Cairo Bold Arabic, white",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "underwater, both attached to hardscape", "lighting": { "type": "moderate LED", "quality": "natural planted tank" } },
  "style": {
    "artistic": "botanical profile photography",
    "camera": { "angle": "front view, both plants in frame", "lens": "50mm", "aperture": "f/3.5" },
    "mood": "educational, encouraging, beautiful"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 3 — النباتات العائمة
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Stunning top-down shot of floating aquarium plants covering surface with light filtering through — magical effect",
    "secondary": "Arabic floating plants info"
  },
  "subject": {
    "main": "Bird's eye view looking DOWN into an aquarium through a carpet of floating plants (Salvinia, Duckweed, Frogbit). Sunlight is filtering through gaps between the floating leaves creating magical dappled light patterns on fish swimming below. Long roots hanging down from floating plants. The effect is like an underwater forest canopy. Some fish are visible through the gaps",
    "text_overlay": {
      "arabic_text": "🍃 النباتات العائمة — أسهل شي بالدنيا!",
      "arabic_subtitle": "تمتص النيترات + تبطئ الطحالب + ظل للسمك",
      "arabic_warning": "⚠️ تتكاثر بسرعة — شيل الزيادة أسبوعياً!",
      "position": "title top, subtitle center, warning bottom",
      "font_style": "Cairo Bold Arabic, white, warning in yellow",
      "font_size": "large"
    }
  },
  "environment": { "setting": "top-down aquarium view", "lighting": { "type": "Golden Hour (Setup #1)", "quality": "warm sunlight filtering through floating plants" } },
  "style": {
    "artistic": "nature overhead photography, magical quality",
    "camera": { "angle": "top-down 90 degrees", "lens": "24mm wide", "aperture": "f/4" },
    "mood": "magical, easy, encouraging"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "top_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

### الشريحة 4 — القائمة الكاملة (CTA)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Beautiful infographic listing top 10 no-CO2 aquarium plants with difficulty ratings",
    "secondary": "Arabic complete plant list with save CTA"
  },
  "subject": {
    "main": "Dark teal gradient background. A premium infographic listing 10 plants with small icons: 1. Java Fern ⭐ سهل جداً 2. Anubias Nana ⭐ سهل جداً 3. Java Moss ⭐ سهل جداً 4. Amazon Sword ⭐⭐ سهل 5. Vallisneria ⭐⭐ سهل 6. Cryptocoryne ⭐⭐ سهل 7. Salvinia (عائمة) ⭐ سهل جداً 8. Frogbit (عائمة) ⭐ سهل جداً 9. Bacopa ⭐⭐ سهل 10. Hornwort ⭐ سهل جداً. Star ratings for difficulty. Each plant with tiny leaf icon",
    "text_overlay": {
      "arabic_text": "🌿 أفضل ١٠ نباتات بدون CO2",
      "arabic_cta": "💾 احفظ القائمة وخذها ويّاك للمحل!",
      "arabic_question": "❓ أي نبات عندك من القائمة؟ اكتب رقمه! 🔢",
      "arabic_share": "📤 ارسلها لصاحبك اللي يقول النباتات صعبة!",
      "arabic_dm": "💬 أرسلنا 'نبات' بالخاص ونرسلك القائمة الكاملة مع النصائح!",
      "position": "title top, list center, CTAs bottom",
      "font_style": "Cairo Bold Arabic, white on dark teal",
      "font_size": "medium"
    }
  },
  "environment": { "setting": "dark AQUAVO gradient" },
  "style": { "artistic": "premium reference infographic", "mood": "must-save, practical, encouraging" },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_center", "font": "Inter Bold, 16px, #FFFFFF", "icon_color": "#00A884", "background": "pill #000000 at 50% opacity, border-radius 12px", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" },
  "seo": {
    "hashtags": ["#AQUAVO", "#PlantedTank", "#NoCO2", "#EasyPlants", "#AquariumPlants", "#BeginnerFishKeeping"],
    "keywords": ["no CO2 aquarium plants", "easy beginner plants", "low tech plants list", "java fern care"]
  }
}
```

---

> ⚠️ **تذكير:** إذا Nano Banana Pro لم يكتب النص العربي بشكل مقروء، جرب:
> 1. أعد التوليد (Regenerate) 2-3 مرات
> 2. أضف النص يدوياً عبر Canva أو Photoshop
> 3. استخدم بروموت إضافي: `"Write this Arabic text clearly on the image: [النص]"`

---


---

## 💀 بروموت: Community Roast (حوض الكوارث)

### الشريحة 1 — صورة الحوض الكارثي
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic amateur photography",
  "camera_setup": "Shot on iPhone 13, direct flash ON, slightly high angle, unpolished",
  "composition_guide": {
    "format_intent": "9:16 portrait generation -> 4:5 crop",
    "safe_zone": "Center needs to show the mess clearly.",
    "text_placement": "Leave space at bottom for roast text."
  },
  "priority": {
    "primary": "A hyper-realistic photo of a 'beginner mistake' aquarium. It should look messy and neglected.",
    "secondary": "Comedy/cringe factor"
  },
  "subject": {
    "main": "A real photo of a neglected beginner fish tank. The water is slightly cloudy/milky (bacterial bloom). The gravel is bright neon pink and blue mixed. There is a generic plastic castle decoration in the center that looks cheap. Green spot algae visible on the front glass. A stick-on thermometer is crooked on the glass. The background is a messy living room reflection on the glass. The lighting is harsh direct flash, creating a 'deer in headlights' look. A few plastic plants that look obviously fake are floating or uprooted. No fish visible (or just a blur)",
    "text_overlay": {
      "arabic_text": "قصف جبهة 💀",
      "position": "bottom_center",
      "font_style": "Cairo Bold Arabic, red with fire effect",
      "font_size": "large"
    }
  },
  "environment": {
    "setting": "Messy beginner tank in a dim room",
    "lighting": { "type": "Direct camera flash reflection on glass", "quality": "Harsh, amateur, unappealing" }
  },
  "style": {
    "artistic": "amateur phone photography, flash photography, cringe aesthetic",
    "mood": "chaotic, messy, funny",
    "realism_details": "fingerprints on outside glass, water drying marks on glass, flash glare spot, dirty filter intake"
  },
  "aquavo_branding": { "logo_text": "🐟 AQUAVO", "position": "bottom_right", "font": "Inter Bold", "consistency": "IDENTICAL" },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5", "note": "Instagram Carousel format" }
}
```

---

## 🎮 بروموت: لعبة Real vs AI (حقيقي أم ذكاء اصطناعي؟)

### الخيار A — الكمال (يبدو AI)
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "cinematic perfection",
  "subject": {
    "main": "A statistically perfect aquascape. The water is invisible (crystal clear). The plants are lush, vibrant neon green and deep red, trimmed to geometric perfection. The lighting is divine, with god rays piercing through. A school of Neon Tetras is perfectly synchronized, all facing the same direction. The sand is perfectly white with no debris. It looks TOO good to be true.",
    "text_overlay": { "arabic_text": "A", "position": "top_left", "font_style": "Cairo Bold, white", "font_size": "large" }
  }
}
```

### الخيار B — "الزيف الواقعي" (يبدو حقيقي)
> **الهدف:** خداع المشاهد ليظن أنها صورة حقيقية (وهي AI).
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic raw photography",
  "camera_setup": "Shot on Samsung Galaxy S24, slightly grainy low light",
  "subject": {
    "main": "A raw, unedited photo of a beautiful planted tank, BUT with flaws that make it look real. There is a slight reflection of a window on the front glass. A few snail eggs are visible on the glass. The water surface has a bit of oil film. The sand has some fish poop or debris. The lighting is not perfect, maybe slightly uneven. A filter wire is visible hanging behind the tank. This imperfection makes it look 100% REAL.",
    "text_overlay": { "arabic_text": "B", "position": "top_left", "font_style": "Cairo Bold, white", "font_size": "large" }
  },
  "style": {
    "artistic": "raw phone photography, unedited",
    "realism_details": "reflection of a chair in the room on the glass, water level line visible (evaporation), algae on silicone seams"
  }
}
```

---

> **آخر تحديث:** فبراير 2026 | **الإصدار:** 4.0 — The Clinic Edition



---

> **آخر تحديث:** فبراير 2026 | **الإصدار:** 5.0 — النسخة المرتبة

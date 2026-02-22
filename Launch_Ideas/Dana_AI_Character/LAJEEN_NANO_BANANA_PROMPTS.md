# 🌊 بروموتات لجين — Nano Banana Pro (JSON Format)

> **الأداة:** Google Gemini (Nano Banana Pro) عبر Higgsfield أو Gemini مباشرة
> **النموذج:** `gemini-2.5-flash-image` (Nano Banana Pro)
> **الشخصية:** لجين — موظفة AQUAVO — عراقية 23 سنة

---

## ⚠️ لماذا Nano Banana Pro وليس Freepik؟

| المعيار | Freepik (Flux/Mystic) | Nano Banana Pro |
|---------|----------------------|-----------------|
| **الواقعية** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **ثبات الشخصية** | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **النصوص العربية** | ❌ ضعيف جداً | ✅ ممتاز |
| **التحكم JSON** | ❌ لا يدعم | ✅ كامل |
| **Negative Prompt** | ⚠️ Flux لا يدعم | ✅ مدعوم |
| **الدقة** | 2K | 4K |
| **السرعة** | بطيء | < 10 ثوانٍ |

---

## 🧬 لماذا ستوقف لجين السكرول؟ (مبني على 5 أبحاث علمية)

> [!IMPORTANT]
> كل ملمح في لجين مبني على **دراسة علمية محددة** — مو رأي شخصي.

| الملمح | ماذا يقول البحث العلمي | كيف طبقناه على لجين |
|--------|----------------------|--------------------|
| **العيون الكبيرة** | العيون هي **المؤشر #1 للجاذبية** — أقوى من أي ملمح آخر (NIH 2025). العيون الكبيرة تثير "babyfacedness" = ثقة + دفء | عيون لوزية **كبيرة بشكل لافت** مع بريق catchlight سينمائي |
| **البشرة المتوهجة** | البشرة اللامعة "luminous" تشد الانتباه **67% أكثر** من البشرة المطفية (Social Media Attention Study) | بشرة متوهجة بنضارة طبيعية + لمعان صحي |
| **الابتسامة الخفيفة** | التعبيرات الإيجابية تزيد الجاذبية **3 أضعاف** vs الوجه المحايد (Jan 2025 Study) | ابتسامة خفيفة واثقة — شفاه مفترقة قليلاً |
| **عظام الخد العالية** | أعلى 3 ملامح جاذبية عالمياً: عيون + عظام خد + شفاه (Meta Analysis) | عظام خد عالية محددة بشكل أنثوي |
| **التواصل البصري المباشر** | الوجه الذي ينظر مباشرة للكاميرا يوقف السكرول **2x أكثر** (Eye-tracking 2025) | نظرة مباشرة واثقة — "تحكي معاك" |
| **عدم التماثل الطفيف** | الوجه المتماثل 100% = علامة AI. الوجه الحقيقي فيه اختلاف **طفيف** (Feb 2025, 1500+ faces) | عدم تماثل طبيعي طفيف جداً |

---

## 🎯 هوية لجين الكاملة (تُنسخ في كل بروموت)

> [!CAUTION]
> **انسخ هذا البلوك بالضبط في كل بروموت** — هذا يضمن ثبات الشخصية 100%

```json
"lajeen_identity": {
  "name": "Lajeen",
  "role": "AQUAVO aquarium specialist — the prettiest girl in Baghdad who happens to be a fish expert",
  "age": "exactly 23 years old",
  "ethnicity": "stunningly beautiful authentic Iraqi Arab woman from central-southern Iraq",
  "ethnicity_exclusions": "NOT Turkish, NOT Levantine, NOT European, NOT South Asian, NOT Latina",
  "beauty_level": "effortlessly gorgeous — the kind of beauty that makes people stop scrolling",

  "face": {
    "shape": "soft oval with slight natural asymmetry for realism",
    "skin_tone": "warm luminous honey-wheat complexion, Fitzpatrick III-IV, warm golden-brown undertones",
    "skin_quality": "naturally clear, youthful, radiant, healthy glow — NOT matte, NOT flat. Visible natural pores and micro-texture but overall GLOWING with health. Soft rosy undertones on cheeks. Subsurface scattering visible on thin skin areas (nose tip, ears)",
    "cheekbones": "high, sculpted, beautifully defined — catches light naturally, creates elegant shadow underneath",
    "jawline": "delicate feminine jawline, well-defined but soft, tapers elegantly to a gentle chin",
    "forehead": "smooth, proportional, framed beautifully by hairline",
    "nose": "small refined elegant straight nose with medium bridge — contributes to balanced Iraqi profile",
    "lips": "naturally full soft lips with natural pink-rose color, clear Cupid's bow definition, slightly parted — inviting but not overtly sexual",
    "beauty_marks": "one tiny cute beauty mark on left cheek near mouth — signature detail"
  },

  "eyes": {
    "importance": "THE MOST CRITICAL FEATURE — eyes are the #1 scroll-stopper",
    "shape": "strikingly large dark brown doe eyes, almond-shaped with natural upward tilt",
    "size": "noticeably large and expressive — the first thing anyone notices about her face",
    "iris": "deep warm brown with golden-amber flecks near pupil, visible iris texture",
    "sclera": "bright clean white sclera — sign of youth and health",
    "lashes": "long, naturally thick black eyelashes — no falsies but naturally dramatic, individually visible",
    "catchlight": "CRITICAL: dramatic cinematic catchlight reflecting in both eyes — two bright sparkle points that make eyes look ALIVE. Window reflection style catchlight",
    "eyelid": "visible upper eyelid fold, soft hooded shape",
    "eyebrows": "perfectly shaped naturally thick dark eyebrows that frame her eyes beautifully — full, groomed but not drawn, slightly arched"
  },

  "hair": {
    "color": "jet black with natural shine, no highlights, catches light beautifully",
    "length": "long, flowing well past shoulders",
    "texture": "silky straight with very subtle natural soft waves",
    "style_default": "natural center part, loose flowing, a few soft strands framing her face",
    "style_work": "loose casual ponytail with intentional soft face-framing pieces",
    "detail": "individual hair strands visible, natural sheen that catches light like real hair in shampoo commercial"
  },

  "body": {
    "build": "healthy average feminine, natural proportions, not thin not heavy",
    "height_estimated": "165-168cm"
  },

  "expression_default": "subtle warm confident smile — lips slightly parted with a hint of teeth showing, like she is about to tell you a secret. Warm inviting eyes that make you feel seen. NOT blank neutral, NOT stone-faced. She looks friendly, approachable, and effortlessly beautiful.",

  "makeup": "absolutely ZERO — completely bare natural face. No foundation, no concealer, no lipstick, no lip gloss, no eyeshadow, no eyeliner, no mascara, no blush, no contour, no tinted moisturizer. Her natural beauty is the point — she doesn't NEED makeup.",

  "clothing_default": {
    "top": "turquoise fitted polo shirt with small white 'AQUAVO' logo on left chest",
    "fabric": "cotton, natural wrinkles from movement, fits well",
    "color": "rich saturated turquoise — aquarium company brand color"
  },

  "accessories": "none — no jewelry, no earrings, no necklace, no rings, no watch, no glasses"
}
```

---

## المرحلة 1: الصورة المرجعية الذهبية (Golden Reference)

> [!IMPORTANT]
> هذه **أهم صورة**. منها سنبني كل شيء. ولّد 4 مرات واختر الأفضل.

### 📸 البروموت — الصورة المرجعية الأمامية

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "ultra-realistic candid portrait photograph, editorial beauty",

  "camera_setup": "Shot on Canon EOS R5, 85mm RF f/1.8 portrait lens, f/1.8 aperture, ISO 400, tethered shooting",

  "subject": {
    "main": "Ultra-detailed candid portrait photograph of a stunningly beautiful young Iraqi Arab woman, exactly 23 years old. Authentic Iraqi Mesopotamian facial features from central-southern Iraq — NOT Turkish, NOT Levantine, NOT European, NOT South Asian. She is effortlessly gorgeous — the kind of face that stops you mid-scroll.",

    "skin": "Luminous warm honey-wheat skin complexion (Fitzpatrick III-IV) with golden-brown undertones and a healthy natural glow. Soft rosy undertones on cheeks. Skin has visible natural pores and micro-texture throughout — NOT airbrushed, NOT smoothed — but naturally clear, youthful, and RADIANT. Her skin catches the light and GLOWS with health. Subsurface scattering visible on thin skin areas.",

    "face_structure": "Soft oval face with slight natural asymmetry for realism. High sculpted cheekbones that catch light beautifully and create elegant shadows underneath. Small refined elegant straight nose with medium bridge. Delicate feminine jawline, well-defined but soft, tapers to a gentle chin. Smooth proportional forehead.",

    "lips": "Naturally full soft pink-rose lips with clear Cupid's bow definition. Lips slightly parted in a subtle sweet smile. Natural bare lip color — no lipstick, no gloss, no tint.",

    "eyes": "MOST IMPORTANT FEATURE: Strikingly large dark brown doe eyes, almond-shaped with natural upward tilt at outer corners. Deep warm brown irises with golden-amber flecks visible near pupil. Bright clean white sclera. Long naturally thick black eyelashes — individually visible, no falsies. Two bright dramatic cinematic catchlight reflections sparkling in both eyes — window reflection style, making eyes look ALIVE and mesmerizing. Perfectly shaped full dark eyebrows that frame her eyes beautifully — slightly arched, groomed but natural.",

    "beauty_mark": "A tiny cute beauty mark on her left cheek near her mouth — her signature detail.",

    "hair": "Long silky jet black hair with natural shine, no highlights. Flowing past shoulders with natural center part. A few soft strands framing her face. Individual hair strands visible, shiny and healthy, catching light beautifully.",

    "expression": "Subtle warm confident smile — lips slightly parted with just a hint of teeth visible. She looks directly at camera with warm inviting eyes and soft confident warmth. She looks youthful, friendly, genuinely happy, and effortlessly gorgeous. Her expression says 'I have something interesting to tell you'. NOT blank neutral, NOT stone-faced, NOT a wide grin.",

    "makeup": "Absolutely ZERO makeup. Completely bare natural face. No foundation, no concealer, no lipstick, no eyeshadow, no mascara, no blush, no contour. Her natural beauty is the point — she doesn't NEED makeup. Raw untouched skin.",

    "clothing": "Plain white crew-neck fitted cotton t-shirt. No logos, no patterns.",
    "accessories": "None. No jewelry, no earrings, no necklace, no rings."
  },

  "composition": {
    "framing": "Perfectly centered front-facing view",
    "angle": "Camera at exact eye level, intimate distance",
    "gaze": "Subject looking DIRECTLY into lens with warm engaging eye contact",
    "crop": "Head and shoulders framing, chest area and above visible",
    "focus": "Sharp critical focus on both eyes simultaneously, shallow depth of field with creamy bokeh, face tack-sharp"
  },

  "environment": {
    "background": "Solid clean seamless medium-gray backdrop. Nothing visible behind subject. No equipment, no props. Pure flat neutral gray.",
    "lighting": {
      "type": "Beauty lighting with warmth",
      "key": "Large softbox from front-left, slightly above eye level, creating gentle direction",
      "fill": "Secondary soft fill from right at 60 percent power",
      "bounce": "White reflector below chin for luminous under-chin fill",
      "quality": "Soft, warm-toned, flattering — makes her skin GLOW. No harsh shadows. Subtle directional light that sculpts her cheekbones and jawline while remaining soft.",
      "eye_light": "Dedicated small catchlight source creating two bright sparkle points in each eye"
    }
  },

  "style": {
    "artistic": "RAW photo aesthetic, editorial beauty portrait, Vogue-quality natural beauty shoot",
    "realism": "8K resolution, ultra-high detail, subtle film grain for photographic authenticity. Natural skin with visible micro-texture. Realistic pores on nose and cheeks. Individual eyelash strands visible. Iris texture visible in close inspection.",
    "mood": "Warm, inviting, captivating — you want to know this person",
    "color_grading": "Warm with subtle teal-orange undertones, cinematic color science"
  },

  "technical": {
    "resolution": "4k",
    "aspect_ratio": "4:5"
  },

  "constraints": {
    "exclusions": [
      "AI-generated looking", "plastic skin", "over-smoothed", "beauty-filtered",
      "airbrushed", "uncanny valley", "blank stare", "dead eyes",
      "cartoon", "anime", "illustration", "3D render", "oil painting",
      "makeup of any kind", "eyeshadow", "lipstick", "mascara", "heavy makeup",
      "dark background", "colored background", "dramatic harsh shadows",
      "studio equipment visible", "earrings", "jewelry", "accessories",
      "European features", "Turkish features", "South Asian features",
      "small eyes", "matte flat skin", "dull lifeless expression",
      "wide grin", "laughing", "teeth fully visible"
    ],
    "style_raw": true
  }
}
```

**الإعدادات:**
- **Model:** Nano Banana Pro (`gemini-2.5-flash-image`)
- **Aspect Ratio:** 4:5
- **عدد الصور:** 4 (ولّد 4 واختر الأفضل)

**معايير اختيار أفضل صورة:**
- [ ] ملامح عراقية واضحة (مو أوروبية أو لاتينية)
- [ ] بشرة حنطية عسلية (مو فاتحة جداً ولا غامقة جداً)
- [ ] بدون مكياج نهائياً (بدون ظل عيون!)
- [ ] عيون فيها catchlight (بريق حياة)
- [ ] شعر أسود طويل مستقيم
- [ ] خلفية رمادية نظيفة (بدون معدات)
- [ ] بدون إكسسوارات (بدون حلق!)

---

## المرحلة 2: صور الزوايا (Dataset — 7 زوايا إضافية)

> [!IMPORTANT]
> استخدم **Image Reference** في Gemini — ارفع الصورة المرجعية الذهبية واطلب نفس الملامح.

### 📸 الزاوية 1 — 3/4 View (يسار)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "reference": "Use the golden reference image — maintain EXACT same facial features",

  "subject": {
    "main": "Same young Iraqi woman from reference — exact same face, exact same features, same honey-wheat skin, same hazel-brown eyes, same long black hair, same thick eyebrows. Plain white t-shirt. No makeup. No accessories.",
    "expression": "Neutral resting face, calm gaze toward camera-right",
    "angle": "Three-quarter view turned slightly to the left, face angled 30-40 degrees from center. Camera slightly to subject's right."
  },

  "environment": {
    "background": "Solid clean seamless medium-gray backdrop, nothing visible",
    "lighting": { "type": "Flat beauty lighting, same as reference" }
  },

  "technical": { "resolution": "4k", "aspect_ratio": "4:5" },
  "constraints": { "exclusions": ["different person", "changed features", "makeup", "jewelry", "studio equipment visible"], "style_raw": true }
}
```

### 📸 الزاوية 2 — 3/4 View (يمين)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "reference": "Use the golden reference image — maintain EXACT same facial features",

  "subject": {
    "main": "Same young Iraqi woman from reference — exact same face. Plain white t-shirt. No makeup. No accessories.",
    "expression": "Neutral resting face, calm gaze toward camera-left",
    "angle": "Three-quarter view turned slightly to the right, face angled 30-40 degrees from center."
  },

  "environment": { "background": "Solid seamless medium-gray backdrop", "lighting": { "type": "Flat beauty lighting" } },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5" },
  "constraints": { "exclusions": ["different person", "makeup", "jewelry"], "style_raw": true }
}
```

### 📸 الزاوية 3 — Profile (يسار)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "reference": "Maintain EXACT same face from golden reference",

  "subject": {
    "main": "Same young Iraqi woman. Side profile view, face turned 90 degrees to camera's right. Strong jawline and nose profile visible. Long black hair falling behind shoulder. White t-shirt.",
    "expression": "Neutral, looking straight ahead (not at camera)"
  },

  "environment": { "background": "Solid seamless medium-gray backdrop", "lighting": { "type": "Flat beauty lighting with rim light on profile edge" } },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5" },
  "constraints": { "exclusions": ["different person", "makeup", "jewelry"], "style_raw": true }
}
```

### 📸 الزاوية 4 — Close-up (وجه قريب)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "reference": "Maintain EXACT same face from golden reference",

  "subject": {
    "main": "Extreme close-up of same young Iraqi woman's face. Fills the frame from hairline to chin. Every detail visible — pores on nose, individual eyelash hairs, iris texture, lip texture, eyebrow hairs. Natural skin micro-texture. Cinematic catchlight in both eyes.",
    "expression": "Neutral, looking directly into lens"
  },

  "environment": { "background": "Blurred seamless gray", "lighting": { "type": "Soft beauty lighting, emphasis on skin detail" } },
  "technical": { "resolution": "4k", "aspect_ratio": "1:1" },
  "constraints": { "exclusions": ["different person", "makeup", "airbrushed skin", "plastic texture"], "style_raw": true }
}
```

### 📸 الزاوية 5 — Low Angle (من تحت)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "reference": "Maintain EXACT same face from golden reference",

  "subject": {
    "main": "Same young Iraqi woman, camera looking up at her from slightly below chin level. Subtle hero angle. She looks confident. White t-shirt visible. Long black hair framing her face.",
    "expression": "Neutral with subtle confidence, looking down at lens"
  },

  "environment": { "background": "Solid gray, slightly foreshortened perspective", "lighting": { "type": "Flat beauty lighting" } },
  "technical": { "resolution": "4k", "aspect_ratio": "4:5" },
  "constraints": { "exclusions": ["different person", "makeup", "jewelry"], "style_raw": true }
}
```

---

## المرحلة 3: صور المحتوى (AQUAVO Scenes)

> [!TIP]
> هنا تبدأ لجين بلبس AQUAVO (بولو تيركواز) وبسياقات مختلفة.

### 🎬 المشهد 1 — لجين بجنب الحوض (العمل)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic candid portrait photography",
  "camera_setup": "Canon EOS R5, 50mm f/2.0, ISO 400",

  "subject": {
    "main": "Same young Iraqi woman from reference (Lajeen), 23 years old, honey-wheat skin, hazel-brown almond eyes, thick dark eyebrows, long black hair pulled back in a loose casual ponytail with soft face-framing strands. She is wearing a fitted turquoise polo shirt with a small white 'AQUAVO' logo on the left chest. Natural fabric wrinkles from movement. No makeup. No jewelry.",

    "action": "She is standing beside a large planted freshwater aquarium with lush green aquatic plants and colorful tropical fish. She looks at the tank with a focused caring expression, her right hand gently touching the glass. Warm natural expression — like a real employee who loves her job.",

    "composition": "Three-quarter angle view, medium shot from waist up"
  },

  "environment": {
    "setting": "Modern aquarium shop interior",
    "lighting": {
      "type": "Golden hour warm window light from camera-left as key, mixed with cool blue-green aquarium glow from behind-right",
      "quality": "Soft diffused, no harsh shadows, subtle rim light separating her from background"
    },
    "color_palette": { "dominant": "deep teal aquarium water", "accent": "turquoise polo + warm skin tones" }
  },

  "style": {
    "artistic": "Candid editorial portrait, authentic UGC creator feel",
    "realism_details": "Glass reflections, water shimmer in bokeh, teal light on her face, natural fabric wrinkles",
    "mood": "Professional, warm, approachable"
  },

  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },

  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF",
    "icon_color": "#00A884 seafoam green fish icon",
    "background": "rounded rectangle pill, #000000 at 50% opacity",
    "consistency": "IDENTICAL in every image"
  },

  "constraints": {
    "exclusions": ["CGI", "3D render", "cartoon", "illustration", "plastic skin", "heavy makeup", "different person", "European features"],
    "style_raw": true
  }
}
```

### 🎬 المشهد 2 — لجين تمسك منتج (Product Showcase)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic product portrait photography",
  "camera_setup": "Canon EOS R5, 85mm f/1.4, ISO 400",

  "subject": {
    "main": "Same Lajeen — Iraqi woman, 23, honey-wheat skin, hazel eyes, thick eyebrows, long black hair in ponytail, turquoise AQUAVO polo shirt. No makeup. No jewelry.",

    "action": "She is holding a small aquarium product bottle at chest height with both hands, showing it to the camera. She looks at camera with a friendly warm smile — natural, not exaggerated. The bottle has a turquoise and white label.",

    "composition": "Medium close-up shot, waist up, slightly angled body"
  },

  "environment": {
    "setting": "Aquarium shop",
    "lighting": { "type": "Soft professional studio-style lighting with subtle aquarium bokeh in background", "quality": "Warm color temperature, product well-lit" }
  },

  "style": { "artistic": "Product photography mixed with portrait — UGC creator recommending a product", "mood": "Trustworthy, friendly, genuine" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },

  "aquavo_branding": {
    "logo_text": "🐟 AQUAVO",
    "position": "bottom_right corner, 20px from edges",
    "font": "Inter Bold, 14px, #FFFFFF",
    "background": "pill #000000 at 50% opacity"
  },

  "constraints": { "exclusions": ["CGI", "3D render", "cartoon", "different person", "heavy makeup"], "style_raw": true }
}
```

### 🎬 المشهد 3 — لجين تشرح (Teaching)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic candid photography",
  "camera_setup": "Canon EOS R5, 50mm f/1.8",

  "subject": {
    "main": "Same Lajeen. Turquoise AQUAVO polo shirt. Hair in ponytail. No makeup. No jewelry.",

    "action": "She is pointing upward with her right index finger as if explaining something important. Enthusiastic knowledgeable expression — eyebrows slightly raised, subtle excited smile. She is a content creator teaching her audience. Her left hand is at her side.",

    "composition": "Medium close-up from slightly below eye level — subtle hero angle"
  },

  "environment": {
    "setting": "Modern aquarium shop with colorful fish tanks in soft bokeh behind her",
    "lighting": { "type": "Natural store lighting, warm", "quality": "Soft diffused, no harsh shadows" }
  },

  "style": { "artistic": "Candid educational content creator — like a real Instagram/TikTok creator explaining", "mood": "Energetic, knowledgeable, friendly" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["CGI", "cartoon", "different person", "makeup"], "style_raw": true }
}
```

### 🎬 المشهد 4 — لجين "لا تسوي جذي!" (Warning)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic candid photography",

  "subject": {
    "main": "Same Lajeen. Turquoise AQUAVO polo shirt. Hair in ponytail. No makeup. No jewelry.",

    "action": "She is looking at camera with a serious concerned expression, shaking her head slightly with her right hand raised palm-out in a stop gesture. Her expression says 'don't do that' — caring but firm. Eyebrows slightly furrowed.",

    "composition": "Medium shot, direct front angle at eye level"
  },

  "environment": {
    "setting": "Aquarium shop with soft blue-green bokeh",
    "lighting": { "type": "Natural window light, slightly dramatic", "quality": "Soft with subtle directional shadows for seriousness" }
  },

  "style": { "artistic": "Authentic social media content — warning/advice post", "mood": "Serious, caring, protective" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["CGI", "cartoon", "different person", "happy smile", "makeup"], "style_raw": true }
}
```

### 🎬 المشهد 5 — لجين 👍 (Thumbs Up — CTA)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "hyper-realistic candid photography",

  "subject": {
    "main": "Same Lajeen. Turquoise AQUAVO polo shirt. Hair in ponytail. No makeup. No jewelry.",

    "action": "She is giving a thumbs up with her right hand near her face, with a big genuine happy natural smile showing teeth. Her eyes are slightly squinted from the real smile — Duchenne smile. Energetic positive expression. Looking directly at camera.",

    "composition": "Medium close-up, slight angle"
  },

  "environment": {
    "setting": "Bright aquarium shop with colorful illuminated tanks in bokeh",
    "lighting": { "type": "Warm cheerful lighting, bright and positive" }
  },

  "style": { "artistic": "Authentic UGC creator photo — celebrating/approving", "mood": "Happy, energetic, positive" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["CGI", "cartoon", "different person", "fake smile", "makeup"], "style_raw": true }
}
```

---

## المرحلة 4: فريمات الفيديو (Kling AI — First to Last Frame)

> [!IMPORTANT]
> **الطريقة:** ولّد Start Frame + End Frame بـ Nano Banana ← ارفعهم على Kling AI ← First to Last Frame

### السيناريو: "أكبر غلطة يسويها صاحب حوض جديد"

### 🎬 كليب 1: Hook — الصدمة (0-4 ثواني)

**Start Frame:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",

  "subject": {
    "main": "Same Lajeen — 23, Iraqi, honey-wheat skin, hazel eyes, black hair in ponytail, turquoise AQUAVO polo. She is looking directly at camera with a serious concerned expression. Eyebrows slightly raised, eyes wide, mouth slightly open — as if she just saw someone make a terrible mistake. Hands at her sides.",
    "composition": "Medium close-up, front angle, waist up"
  },

  "environment": {
    "setting": "Modern aquarium shop with blue-green glowing tanks in soft bokeh",
    "lighting": { "type": "Golden hour window light from left + aquarium glow from right" }
  },

  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["smile", "happy", "cartoon", "different person", "makeup"], "style_raw": true }
}
```

**End Frame:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",

  "subject": {
    "main": "Same Lajeen — same features, same clothes. She is shaking her head, tilted slightly right. Right hand raised at chest level, palm facing outward in a gentle stop gesture. Expression says 'no no, don't do that' — caring but firm. Eyebrows slightly furrowed.",
    "composition": "Same framing as start frame"
  },

  "environment": { "setting": "Same aquarium shop, same lighting" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["smile", "cartoon", "different person", "makeup"], "style_raw": true }
}
```

**Kling AI Prompt:**
```
The woman transitions from a surprised wide-eyed look directly at camera to slowly shaking her head left then right while raising her right hand in a stop gesture. Her movement is natural and subtle. Her ponytail sways gently with the head movement. She blinks once naturally. The aquarium lights shimmer softly behind her. Smooth natural motion, 5 seconds.
```

---

### 🎬 كليب 2: المشكلة (4-8 ثواني)
### 🎬 كليب 3: الحل (8-13 ثواني)
### 🎬 كليب 4: CTA (13-17 ثواني)

> استخدم نفس نمط كليب 1 (Start + End Frame) — بدّل فقط الـ `action` و`expression`.
> راجع `DANA_NANO_BANANA_PROMPTS.md` للكليبات 2-4 (نفس الأفكار، ملامح لجين بدل دانا).

---

## 🔧 ترقية بـ Magnific AI (اختياري)

بعد التوليد، ارفع الصورة على Magnific AI:

```
Add micro pores, individual hair strands, sharp skin texture.
Enhance iris detail and catchlight reflections.
Sharpen fabric texture on turquoise polo shirt.
Add subtle film grain for photographic authenticity.
```

**Magnific Settings:**
| الإعداد | القيمة |
|---------|--------|
| Scale | 2x |
| Creativity | -3 |
| HDR | 0 |
| Resemblance | 3 |
| Fractality | 0 |

---

## ✅ قائمة فحص ثبات الشخصية

قبل اعتماد أي صورة، تحقق:

- [ ] **البشرة:** حنطية عسلية (مو فاتحة/مو غامقة)
- [ ] **العيون:** عسلية-بنية لوزية + catchlight
- [ ] **الحواجب:** كثيفة طبيعية عراقية
- [ ] **الشعر:** أسود طويل مستقيم
- [ ] **الأنف:** مستقيم متوسط (ملامح عراقية)
- [ ] **الشفاه:** ممتلئة طبيعية بلون طبيعي
- [ ] **المكياج:** صفر! (بدون ظل عيون أو أحمر شفاه)
- [ ] **الإكسسوارات:** صفر! (بدون حلق)
- [ ] **الأيدي:** 5 أصابع صحيحة
- [ ] **الملابس:** متسقة مع السياق
- [ ] **الواقعية:** بدون plastic skin أو uncanny valley
- [ ] **التناظر:** وجه فيه عدم تماثل طفيف طبيعي (مو مثالي 100%)

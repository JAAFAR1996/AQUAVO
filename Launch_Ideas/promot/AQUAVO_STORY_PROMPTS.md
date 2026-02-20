# 🏥 AQUAVO_STORY_PROMPTS_MASTER (The Clinic Edition)
> **الفلسفة:** أنت مو "صفحة سمك"، أنت **عيادة أحواض**. كل ستوري = **تشخيص** أو **فحص** أو **استشارة هندسية**.
> اللهجة: **عراقية صرفة**. النبرة: **استشاري مشغول ويعرف شغله**.

---

## 🎨 Visual Style Guide (The Abyss Standard)

| العنصر | المعيار |
|:---|:---|
| **الإضاءة** | Rembrandt Lighting (خلفية مظلمة، ضوء مركّز على الموضوع فقط) |
| **الزاوية** | Macro / Extreme Close-up حصراً |
| **المود** | غامض، طبّي/سريري، فخم |
| **ممنوع** | وجوه بشرية، ألوان فاقعة، ستايل كرتوني، إيموجي على الصورة |
| **اللون السائد** | أسود حالك (#050505) مع تدرجات Deep Teal (#004D40) |
| **الخط** | Cairo Bold (عربي) / SF Pro Display (إنجليزي) — أبيض فقط |
| **الكاميرا** | Sony A7R V, 90mm Macro, f/2.8, ISO 400 |

---

## 📋 DAILY STORY ROTATION (جدول التدوير اليومي)

---

### 🔬 TYPE A: التشخيص (The Diagnosis)
**الهدف:** خلّي المتابع يقلق على صحة حوضه، بعدين قدملّه الحل.

#### A-1: تآكل الزعانف (Fin Rot)

**الشريحة 1 — الصدمة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_style": "clinical macro photography",
  "camera_setup": "Sony A7R V, 90mm Macro, f/2.8, ISO 400",
  "subject": {
    "main": "Extreme macro of a Betta fish tail fin showing early signs of fin rot — jagged white edges, slight fraying, translucent deterioration at the tips. The fin tissue shows loss of color near the damaged edges. Dark moody water behind.",
    "composition": "Fin fills 60% of frame. Background is pure dark water gradient."
  },
  "environment": {
    "lighting": { "type": "Rembrandt — single directional light from upper left", "quality": "Clinical, sharp, revealing every defect" },
    "color_palette": { "dominant": "#0A0A0A (Near Black Water)", "accent": "#FFFFFF (Damaged Fin Edges)" }
  },
  "style": { "artistic": "Medical documentation photography", "mood": "Alarming, clinical, serious" },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "SF Pro Display Bold, 10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright colors", "text on image", "full fish body"], "style_raw": true }
}
```
**النص (عراقي):**
> هذا مو "عض".. هذا تآكل بكتيري (Fin Rot).
> يصير من تهمل تبديل المي.
> شايفه بحوضك قبل؟

**التفاعل:** `POLL: اي دمرني 😭 / لا حوضي نظيف 🛡️`

**الشريحة 2 — الحل:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A single bottle of aquarium anti-bacterial medicine standing upright on a wet dark surface. Next to it, a glass of crystal clear water. Backlit rim light. Extreme minimalist composition. Studio product shot.",
    "composition": "Bottle in bottom-left third. Rest is dark negative space for text."
  },
  "environment": { "lighting": { "type": "Backlit rim light", "quality": "Product commercial" } },
  "style": { "artistic": "Pharmaceutical product photography", "mood": "Solution, clinical hope" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> العلاج يبدأ **بتغيير ٥٠٪ من المي**، مو بس دوا.
> الدوا بماء وصخ **ما يشتغل**.

---

#### A-2: الطحالب النقطية (Green Spot Algae / GSA)

**الشريحة 1 — التشخيص:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Extreme close-up of aquarium front glass showing hard Green Spot Algae (GSA). Small, circular, dark green dots firmly attached to the glass surface. You can see the tank interior blurred behind. The texture of the algae is rough and hard-looking. Shot from outside the glass at a slight angle.",
    "composition": "Algae dots in sharp focus. Tank interior softly blurred behind glass."
  },
  "environment": { "lighting": { "type": "Side lighting revealing algae texture", "quality": "Clinical, diagnostic" } },
  "style": { "artistic": "Scientific documentation", "mood": "Problem identification" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> الطحالب النقطية (GSA).. كابوس الجام.
> تدرون شنو سببها الرئيسي؟

**التفاعل:** `QUIZ: ١. نقص فوسفات (PO4) ✅ / ٢. اضاءة زايدة`

**الشريحة 2 — الصدمة العلمية:**
**النص:**
> نعم، **نقص الفوسفات** يخلي هاي الطحالب تطلع.
> زيد التغذية، مو تقلل الاكل! (صدمة مو؟)

---

#### A-3: المي الصافي السام (Clear but Deadly)

**الشريحة 1 — الفخ:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Crystal clear aquarium water, beautifully lit. But ONE fish is gasping at the surface, mouth open, clearly in distress. The rest of the tank looks pristine and 'perfect'. The contradiction is the point — beautiful water, dying fish.",
    "composition": "Fish gasping at very top of frame. 70% of frame is the deceptively clear water below."
  },
  "environment": { "lighting": { "type": "Clean overhead LED", "quality": "Deceptively healthy looking" } },
  "style": { "artistic": "Documentary photography — revealing hidden danger", "mood": "Alarming contrast" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> المي "الصافي" مو شرط يكون "صحي".
> السمكة دتختنك رغم المي قزاز.. **ليش؟**

**التفاعل:** `SLIDER: نسبة الأمونيا 🔥`

**الشريحة 2 — العلم:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Close up of a water test kit vial held by fingers against a dark background. The liquid inside is bright yellow (indicating ammonia presence). The API color chart is slightly visible but blurred behind. Clinical, laboratory feel.",
    "composition": "Vial centered. Dark background. Dramatic."
  },
  "style": { "artistic": "Laboratory documentation", "mood": "Scientific proof" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> الأمونيا (بول السمك) غاز شفاف وسام.
> بدون بكتيريا نافعة، حوضك عبارة عن **غرفة غاز**.

---

#### A-4: النقطة البيضاء (Ich / White Spot Disease)

**الشريحة 1 — التشخيص:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Macro of a dark-colored fish body showing white spots (Ich disease). Tiny salt-grain-like white cysts scattered across the skin and fins. The fish looks stressed. Dark water background.",
    "composition": "Fish body fills frame. Focus on the white spots."
  },
  "style": { "artistic": "Veterinary diagnostic photography", "mood": "Urgent, medical" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> النقط البيض هاي مو "ملح".. هاي **طفيلي** يتغذى على سمكتك.
> اسمه الـ Ich. وإذا ما عالجته بـ ٤٨ ساعة، ينتشر لكل حوضك.

**التفاعل:** `POLL: صارلي قبل 😰 / أول مرة أعرف 🤯`

**الشريحة 2 — البروتوكول:**
**النص:**
> بروتوكول الطوارئ:
> ١. ارفع الحرارة لـ **30°C** (يسرّع دورة حياة الطفيلي).
> ٢. أضف **ملح أحواض** بنسبة 1 ملعقة/4 لتر.
> ٣. غيّر ٢٥٪ ماء يومياً لمدة أسبوع.
> ❌ لا توقف الفلتر أبداً.

---

#### A-5: ارتفاع النتريت (Nitrite Spike)

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Close-up of a water test vial showing PURPLE/MAGENTA color (indicating dangerously high Nitrite). The vial is held against the API test card, clearly in the 'danger' zone. Dark background. Urgent feel.",
    "composition": "Vial in center-left. Color card behind, slightly blurred."
  },
  "style": { "artistic": "Emergency diagnostic", "mood": "Red alert, critical" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> هذا اللون يعني سمكاتك **تتسمم ببطء الحين**.
> النتريت يحرق الخياشيم من داخل.
> آخر مرة فحصت الميّه شكد؟

**التفاعل:** `QUIZ: ١. أمس ✅ / ٢. شهر / ٣. فحص شنو؟ 💀`

---

### 🏛️ TYPE B: المهندس المعماري (The Architect)
**الهدف:** إظهار السلطة العلمية في التصميم (Aquascaping Authority).

#### B-1: ستايل إيواغومي (Iwagumi)

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Cinematic wide shot of an Iwagumi style aquascape. 3 carefully placed Seiryu stones (main stone, secondary, accent) on fine white sand. Minimal carpet plant (Monte Carlo). Crystal clear water. Extremely clean, minimalist, zen. Like a zen garden underwater.",
    "composition": "Rule of thirds. Main rock at golden ratio point. Massive negative space."
  },
  "environment": { "lighting": { "type": "Single overhead LED bar, slightly directional", "quality": "Museum gallery lighting" } },
  "style": { "artistic": "Architectural photography — Tadao Ando inspired minimalism", "mood": "Zen, expensive, deliberate" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> البساطة **هي أصعب أنواع الفن**.
> ستايل "إيواغومي".. تحبوه لو تحسوه فارغ؟

**التفاعل:** `POLL: فخامة 💎 / يرادله زرع 🌿`

---

#### B-2: طبقات التربة (Substrate Layers)

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Cross-section macro of aquarium substrate layers visible through the front glass. Bottom layer: coarse dark aquasoil. Middle layer: fine powder type soil. Top cosmetic layer: pale sand. You can see the distinct layers clearly through the glass. A few tiny plant roots penetrating down.",
    "composition": "Horizontal layers across the frame. Educational diagram feel."
  },
  "style": { "artistic": "Geological cross-section photography", "mood": "Engineering precision" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> ليش نخلي "باودر" فوك التربة الخشنة؟
> مو علمود الشكل بس..

**التفاعل:** `QUIZ: ١. لتثبيت الجذور الصغيرة ✅ / ٢. حتى المي ميغوش`

---

#### B-3: النسبة الذهبية (Golden Ratio in Aquascaping)

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A stunning Nature Aquarium style aquascape with a subtle golden ratio spiral overlay (thin white line). The focal stone sits exactly at the golden point. The composition is perfect. Dark, moody cinematic lighting.",
    "composition": "Golden spiral overlay visible but not overpowering."
  },
  "style": { "artistic": "Fine art + mathematical composition", "mood": "Intellectual, masterful" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> ليش بعض الأحواض تسحرك وبعضها "عادية"؟
> السر: **النسبة الذهبية** (1.618).
> نفس القاعدة اللي استخدمها دافنشي.

**التفاعل:** `SLIDER: كم تعطيه من 10؟ 💎`

---

### ⚙️ TYPE C: المعدات (The Hardware)
**الهدف:** بيع بدون بيع. ركّز على **الهندسة** مو على السعر.

#### C-1: أنابيب الستيل (Stainless Steel Pipes)

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "Close-up macro of stainless steel lily pipe (inlet and outlet) attached to a rimless aquarium. Focus on the brushed metal texture and the curved glass-like water surface near the outlet. The metal reflects a faint teal light from the tank. Premium product feel.",
    "composition": "Pipes in left third. Tank water in background, blurred."
  },
  "style": { "artistic": "Industrial design photography — like a Leica camera ad", "mood": "Engineering porn, premium" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> البلاستيك يخرب جمالية الحوض.
> الستيل مو بس شكل — الستيل **ما يجمع بكتيريا** وميتأكسد.

**التفاعل:** `Link Sticker: اضغط هنا للترقية 🔗`

---

#### C-2: الفلتر الخارجي (Canister Filter)

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "An opened canister filter showing the media baskets inside. Top basket: white filter floss. Middle: ceramic bio rings. Bottom: coarse sponge. Arranged neatly. Dark moody lighting. The filter body is matte black. Shot from above looking down into the canister.",
    "composition": "Top-down view. Layers visible. Clinical/surgical feel."
  },
  "style": { "artistic": "Technical product teardown photography — like iFixit", "mood": "Engineering breakdown, authority" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> الفلتر الخارجي **مو رفاهية**.. هو قلب الحوض.
> كل طبقة إلها وظيفة مختلفة:
> ⬜ ميكانيكي (ينظف الجزيئات)
> 🟤 بيولوجي (يكسر السموم)
> ⬛ كيميائي (يمتص الروائح)

**التفاعل:** `QUIZ: أي طبقة الأهم؟ ١. ميكانيكي / ٢. بيولوجي ✅ / ٣. كيميائي`

---

#### C-3: إضاءة LED الاحترافية

**الشريحة 1:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "subject": {
    "main": "A high-end aquarium LED light bar suspended above a planted tank. The light is ON and creates visible light rays (god rays) through the water. The tank below is lush green. Focus is on the sleek aluminum body of the light fixture. Reflection of the light on the water surface.",
    "composition": "Light bar at top. God rays going down. Plants at bottom, slightly blurred."
  },
  "style": { "artistic": "Product hero shot — like a Bang & Olufsen speaker ad", "mood": "Premium technology" },
  "technical": { "resolution": "4k", "aspect_ratio": "9:16" }
}
```
**النص:**
> الضوة الغلط = طحالب.
> الضوة الصح = **غابة تحت الماء**.
> الفرق مو بالسعر.. الفرق بالـ PAR والـ Spectrum.

**التفاعل:** `POLL: ضوتك شنو نوعها؟ LED احترافي 💡 / ضوة عادة من السوق 🔦`

---

### 🌡️ TYPE D: المؤشرات الحيوية (Vital Signs)
**الهدف:** ستوريات يومية سريعة (15 ثانية) — مراقبة صحة الحوض.

#### D-1: درجة الحرارة

**النص:**
> ☀️ فحص الصبح:
> الحرارة: **25.5°C** ✅
> الحرارة المثالية: 24-27°C
> فوك 30 = إجهاد. تحت 22 = مناعة ضعيفة.
> **شكد حرارة حوضك الحين؟**

**التفاعل:** `SLIDER: حرارة حوضك؟ 🌡️`

#### D-2: pH

**النص:**
> 🧪 فحص المساء:
> pH: **6.8** ✅ (مثالي للأسماك الاستوائية)
> تحت 6.0 = حامضي خطير
> فوك 8.0 = قاعدي مُجهد
> **فحصته اليوم؟**

**التفاعل:** `POLL: افحص يومياً 🔬 / ما عندي تست كت 🫠`

---

## 📅 جدول التدوير الشهري (30-Day Rotation Matrix)

| اليوم | الصباح | الظهر | المساء |
|:---|:---|:---|:---|
| **1** | Vital Signs: حرارة 🌡️ | **A-1:** تآكل الزعانف | B-1: إيواغومي |
| **2** | Vital Signs: pH 🧪 | **A-2:** الطحالب النقطية | C-1: أنابيب الستيل |
| **3** | Vital Signs: حرارة | **A-3:** المي الصافي السام | B-2: طبقات التربة |
| **4** | Vital Signs: pH | **A-4:** النقطة البيضاء | C-2: الفلتر الخارجي |
| **5** | Vital Signs: حرارة | **A-5:** ارتفاع النتريت | B-3: النسبة الذهبية |
| **6** | Vital Signs: pH | **Repost أفضل تشخيص** | C-3: إضاءة LED |
| **7** | **أوف** | **أوف** | **أوف** |
| **8-14** | تكرار مع تبديل المحتوى | — | — |
| **15-21** | أضف تشخيصات جديدة | — | — |
| **22-28** | أعد أفضل 7 ستوريات (best of) | — | — |
| **29-30** | **إعلان خاص / إطلاق منتج** | — | — |

---

## 📐 القواعد الذهبية (Golden Rules)

1. **كل ستوري = مشكلة + حل.** لا ستوريات "صباح الخير" أبداً.
2. **اللهجة عراقية 100%.** "ليش" مو "لماذا". "شكد" مو "كم". "دتموت" مو "تموت".
3. **الصورة تخوّف، النص يُطمئن.** (صدمة ← حل = اعتمادية).
4. **لا إيموجي فاقعة على الصور.** الإيموجي بالنص فقط (Poll/Quiz).
5. **كل Quiz له إجابة صادمة.** الإجابة الصحيحة دائماً هي اللي ما يتوقعوها.
6. **Dark Mode Only.** خلفيات سوداء أو داكنة جداً. النص أبيض فقط.

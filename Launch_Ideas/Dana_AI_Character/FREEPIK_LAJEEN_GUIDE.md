# 🎨 دليل بناء شخصية "لجين" على Freepik — خطوة بخطوة

> **التاريخ:** 21 فبراير 2026  
> **الهدف:** بناء شخصية لجين الرقمية باستخدام أدوات Freepik AI  
> **المتطلبات:** اشتراك Freepik فعال

---

## 📋 الخطة الكاملة (3 مراحل)

```
المرحلة 1: توليد الصورة المرجعية الذهبية (اليوم)
المرحلة 2: توليد الـ Dataset (8 زوايا) باستخدام Flux Kontext
المرحلة 3: استخدام الصور لإنتاج المحتوى
```

---

## 🔥 المرحلة 1: الصورة المرجعية الذهبية

> [!IMPORTANT]
> هذه أهم خطوة — الصورة الأولى هي الأساس لكل شيء بعدها

### الخطوة 1: افتح Image Generator

1. من الصفحة الرئيسية لـ Freepik، اضغط **Image Generator**
2. أو من القائمة الجانبية → **Image Generator**

### الخطوة 2: اختر النموذج الصحيح

> [!CAUTION]
> **اكتشاف مهم من البحث:** Freepik **Mystic V2** مبني على Flux + Stable Diffusion + Magnific AI
> ومدرّب من فريق مصورين محترفين — **أفضل من Flux Pro للوجوه الواقعية!**

- **🥇 الخيار الأول: Mystic V2** — أقوى نموذج في Freepik للواقعية (مُدرّب خصيصاً للبورتريه)
- 🥈 الخيار الثاني: Flux Pro — ممتاز أيضاً لكن Mystic أدق بالوجوه
- **لا تستخدم** Flux Schnell (سريع لكن جودة أقل)

### الخطوة 3: أدخل البروموت الأول (Front Facing)

> [!CAUTION]
> **Flux Pro لا يدعم Negative Prompt منفصل!**
> كل المنع يجب أن يكون **داخل البروموت نفسه**.
> Mystic V2 **يدعم** Negative Prompt — استخدمه إذا اخترت Mystic.

انسخ هذا البروموت **كاملاً بالضبط** والصقه في خانة الـ Prompt:

```
Photorealistic portrait photograph, RAW photo, shot on Canon EOS R5,
85mm portrait lens, f/2.0 aperture, ISO 100,
young Iraqi Arab woman, exactly 23 years old,
authentic Iraqi Mesopotamian facial features from central-southern Iraq,
NOT Turkish, NOT Levantine, NOT European, NOT South Asian,
warm honey-wheat skin complexion (Fitzpatrick scale III-IV),
golden-brown undertones, natural matte skin finish,
visible natural pores and fine skin texture,
clean healthy skin, very minimal blemishes only,
no excessive moles, no freckles, no acne, no scars.

Long straight dark black hair with natural shine, no highlights,
falling well past shoulders, natural center part,
hair strands visible individually.
Warm hazel-brown almond-shaped eyes with natural lash length,
no false eyelashes, no extensions,
cinematic catchlight reflecting in both eyes for lifelike sparkle,
subtle natural eye shape with visible upper eyelid fold,
naturally thick dark eyebrows.

Soft oval face with slight natural asymmetry for realism,
high but not sharp cheekbones,
straight delicate nose with medium bridge,
full natural lips with bare natural lip color,
well-defined but soft jawline, smooth forehead.

Neutral resting expression, lips gently closed,
NOT smiling, NOT frowning,
calm confident gaze directly into camera lens.

Absolutely ZERO makeup, completely bare natural face,
no foundation, no concealer, no lipstick, no lip gloss,
no eyeshadow, no eyeliner, no mascara, no blush, no contour,
no tinted moisturizer, no brow pencil,
raw untouched skin to capture true natural texture and tone.
Plain white crew-neck fitted cotton t-shirt, no logos, no patterns,
no jewelry, no earrings, no necklace, no rings, no accessories.

Perfectly centered front-facing view,
camera at exact eye level, subject looking directly into lens,
head and shoulders framing, chest area and above visible.

Sharp critical focus on both eyes simultaneously,
shallow depth of field, face tack-sharp, background softly blurred.

Flat beauty lighting setup,
large octabox softbox directly in front slightly above eye level,
secondary fill light from opposite side at 50 percent power,
white reflector below chin to eliminate under-chin shadows,
even soft exposure across entire face,
no harsh shadows, no specular hotspots on forehead or nose.

Solid clean seamless medium-gray backdrop,
absolutely nothing visible behind subject,
no studio equipment, no softbox, no light stands, no props,
no texture, no gradient, pure flat neutral gray wall only.

8K resolution, ultra-high detail, subtle film grain for authenticity,
natural skin with subtle micro texture only,
realistic visible pores on nose and cheeks,
NOT AI-generated looking, NOT plastic skin,
NOT over-smoothed, NOT beauty-filtered, NOT airbrushed,
real human appearance, no uncanny valley effect,
no smile, no cartoon, no anime, no illustration, no 3D render,
no oil painting, no stylized, no artistic filter,
no makeup of any kind visible on face,
no dark background, no colored background, no dramatic shadows,
no colored lighting, no lens flare, no bokeh dots in background,
no studio equipment visible, no earrings, no jewelry.
```

### الخطوة 4: إعدادات التوليد

> [!WARNING]
> Flux Pro **لا يدعم** Negative Prompt — اتركه فارغاً.
> Mystic V2 **يدعم** Negative Prompt — أدخل النص أدناه إذا استخدمت Mystic.

| الإعداد | Flux Pro | Mystic V2 |
|---------|----------|-----------|
| **Aspect Ratio** | 2:3 (Portrait) | 2:3 (Portrait) |
| **Style** | Realistic | Photo/Realistic |
| **Quality** | أعلى جودة | أعلى جودة |
| **Negative Prompt** | ⚠️ اتركه **فارغاً** | ✅ أدخل النص أدناه |

**Negative Prompt (لـ Mystic V2 فقط):**
```
smile, laugh, cartoon, anime, illustration, 3D render, oil painting,
stylized, heavy makeup, lipstick, eyeshadow, eyeliner, mascara, blush,
dark background, colored background, dramatic shadows, colored lighting,
lens flare, studio equipment, softbox visible, earrings, jewelry,
plastic skin, airbrushed, beauty filter, over-smoothed, uncanny valley,
excessive freckles, excessive moles, acne, scars
```

### الخطوة 5: ولّد واختر

1. اضغط **Generate** — ولّد 4 صور
2. **قيّم كل صورة** بهذه المعايير:

| المعيار | ✅ مقبول | ❌ مرفوض |
|---------|---------|---------|
| البشرة | عسلية قمحية طبيعية | بيضاء أوروبية أو داكنة جداً |
| الملامح | عراقية / شرق أوسطية | أوروبية أو شرق آسيوية |
| التعبير | محايد، ريلاكس | ابتسامة واضحة أو عبوس |
| البشرة | مسامات مرئية، طبيعية | ناعمة كالبلاستيك |
| الخلفية | رمادي محايد موحد | ألوان أو تدرجات |
| الشعر | أسود طويل طبيعي | ملوّن أو قصير جداً |

3. **اختر أفضل صورة واحدة** — هذي هي **"المرجع الذهبي"**
4. **حمّلها** (Download) بأعلى جودة
5. إذا ما عجبتك أي صورة — **عدّل البروموت وجرّب مرة ثانية**

> [!TIP]
> جرّب 3-5 مرات على الأقل. لا تقبل أول نتيجة — ابحث عن الكمال.

---

## 🔄 المرحلة 2: توليد Dataset بـ 8 زوايا (Flux Kontext)

> [!IMPORTANT]
> هذه المرحلة تستخدم ميزة **Character Consistency** في Freepik

### الطريقة: استخدام Flux Kontext لثبات الوجه

#### الخطوة 1: ارجع لـ Image Generator
- اختر نموذج **Flux Kontext** (أو Flux Context Max)
- إذا ما لقيته، ابحث عنه في قائمة النماذج

#### الخطوة 2: ارفع الصورة المرجعية
- ارفق **"المرجع الذهبي"** (الصورة من المرحلة 1) كـ **Reference Image**
- هذا يقفل هوية الوجه عبر كل الصور الجديدة

#### الخطوة 3: ولّد الزوايا الـ 7 الباقية

كل زاوية = بروموت منفصل مع نفس الصورة المرجعية:

---

**Prompt 02 — البروفايل الأيمن:**
```
Same woman from reference image.
Pure 90-degree right profile view,
only right side of face visible,
ear clearly visible, nose tip and lip profile sharp,
neutral expression, plain white t-shirt,
medium-gray studio background,
Canon EOS R5, 85mm lens, 8K, ultra-realistic.
```

---

**Prompt 03 — البروفايل الأيسر:**
```
Same woman from reference image.
Pure 90-degree left profile view,
only left side of face visible,
left ear clearly visible,
neutral expression, plain white t-shirt,
medium-gray studio background,
Canon EOS R5, 85mm lens, 8K, ultra-realistic.
```

---

**Prompt 04 — ثلاثة أرباع يمين:**
```
Same woman from reference image.
Classic three-quarter view, 45-degree rotation to her right,
both eyes visible, near eye sharp,
neutral expression, plain white t-shirt,
medium-gray studio background,
Canon EOS R5, 85mm lens, f/1.8, 8K, ultra-realistic.
```

---

**Prompt 05 — ثلاثة أرباع يسار:**
```
Same woman from reference image.
Three-quarter view, 45-degree rotation to her left,
both eyes visible,
neutral expression, plain white t-shirt,
medium-gray studio background,
Canon EOS R5, 85mm lens, f/1.8, 8K, ultra-realistic.
```

---

**Prompt 06 — زاوية منخفضة:**
```
Same woman from reference image.
Slight low-angle view, camera below eye level looking up,
underside of chin visible, nostrils slightly visible,
neutral expression, plain white t-shirt,
medium-gray studio background,
Canon EOS R5, 85mm lens, 8K, ultra-realistic.
```

---

**Prompt 07 — لقطة قريبة جداً:**
```
Same woman from reference image.
Extreme close-up, face fills 90% of frame,
every pore and skin texture visible,
individual eyebrow hairs visible, iris detail,
lip surface texture,
neutral expression, no makeup,
medium-gray background,
Canon EOS R5, 85mm macro, f/4.0, 8K.
```

---

**Prompt 08 — زاوية عالية:**
```
Same woman from reference image.
Slight high-angle view, camera above eye level looking down,
forehead prominent, chin receding in perspective,
eyes looking up toward camera,
neutral expression, plain white t-shirt,
medium-gray studio background,
Canon EOS R5, 85mm lens, 8K, ultra-realistic.
```

---

### الخطوة 4: راجع واختر

لكل زاوية:
1. ولّد 2-4 صور
2. اختر الأفضل (الأقرب للمرجع الذهبي)
3. **تأكد أن الوجه نفسه** — لا تتساهل!

### ✅ النتيجة النهائية للمرحلة 2:

```
📁 Lajeen_Dataset/
├── 01_front_facing.png      ← المرجع الذهبي
├── 02_right_profile.png
├── 03_left_profile.png
├── 04_three_quarter_right.png
├── 05_three_quarter_left.png
├── 06_low_angle.png
├── 07_extreme_closeup.png
└── 08_high_angle.png
```

---

## 🎬 المرحلة 3: إنتاج صور المحتوى

بعد ما يكون عندك الـ dataset، تقدر تنتج صور لجين في أي مكان:

### صور المحتوى (بنفس الوجه):

**لجين أمام حوض أسماك:**
```
Same woman from reference image.
Standing in front of a beautiful freshwater aquarium,
colorful tropical fish visible behind her,
wearing AQUAVO branded white t-shirt,
warm natural lighting, slight smile,
looking at camera, professional photo, 8K.
```

**لجين في محل أسماك:**
```
Same woman from reference image.
Inside a modern aquarium fish store,
shelves of aquariums behind her,
wearing AQUAVO branded hoodie,
pointing at a product while explaining,
natural indoor lighting, 8K, ultra-realistic.
```

**لجين تمسك منتج:**
```
Same woman from reference image.
Holding a fish food bottle in her hand,
showing it to camera with enthusiastic expression,
wearing AQUAVO branded t-shirt,
clean white background, studio lighting, 8K.
```

---

## ⚡ نصائح مهمة

> [!TIP]
> ### لو Flux Kontext غير متوفر في Freepik:
> 1. استخدم **Ideogram Character** (متوفر في Freepik) — يدعم صورة مرجعية واحدة
> 2. أو جرّب ميزة **Image Reference** في أي نموذج Flux متوفر
> 3. كحل أخير: ولّد كل الصور بـ Flux Pro مع نفس البروموت الكامل (بدون reference)

> [!WARNING]
> ### أخطاء شائعة تجنّبها:
> - ❌ لا تغيّر البروموت كثيراً بين الزوايا — غيّر فقط الـ Camera Angle
> - ❌ لا تقبل صورة مرجعية بجودة منخفضة
> - ❌ لا تنتقل للمرحلة 3 قبل ما تكون راضي 100% عن الـ dataset
> - ❌ لا تستخدم نماذج "artistic" أو "anime" — دائماً Realistic/Photo

---

## 📊 Checklist الإنجاز

- [ ] المرحلة 1: توليد المرجع الذهبي (Front Facing)
- [ ] المرحلة 2: توليد 7 زوايا إضافية بـ Flux Kontext
- [ ] مراجعة: كل الـ 8 صور نفس الوجه بالضبط؟
- [ ] المرحلة 3: أول صورة محتوى (لجين + حوض سمك)
- [ ] حفظ كل الصور بأعلى جودة في مجلد منظم

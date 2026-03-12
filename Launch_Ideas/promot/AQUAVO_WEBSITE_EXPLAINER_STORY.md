# 🌐 ستوري تعريفي بموقع AQUAVO — "شنو هذا الموقع؟!"

> **الهدف:** تعريف المتابعين الجدد بالموقع وفهم كل ميزة بسلسلة شرائح سريعة
> **النوع:** ستوري تعليمي — Website Tour
> **عدد الشرائح:** 7 شرائح (كل شريحة = ميزة واحدة)
> **اللهجة:** عراقية صرفة. النبرة: صاحبك اللي يشرحلك بحماس
> **الهايلايت:** 🌐 **الموقع**

---

## 📋 خطة الشرائح

| الشريحة | المحتوى | المدة |
|:--|:--|:--|
| 1 | المقدمة — التشويق | 5 ثواني |
| 2 | 🛒 المتجر الذكي | 5 ثواني |
| 3 | 🤖 Dr. AQUAVO — تشخيص بالذكاء الاصطناعي | 5 ثواني |
| 4 | 📖 المدونة والمقالات | 5 ثواني |
| 5 | 🧮 الحاسبات الذكية | 5 ثواني |
| 6 | 💬 المساعد الذكي | 5 ثواني |
| 7 | الخاتمة — CTA | 5 ثواني |

---

## الشريحة 1 — المقدمة (الصدمة)

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A dramatic cinematic hero shot for Instagram Story (9:16). A premium dark phone (iPhone 16 Pro style, natural titanium) floating at a slight angle against a deep dark background (#050505). The phone screen displays a glowing aquarium website interface — clean dark mode UI with teal (#00BCD4) accents, showing a stunning aquascape hero image. The screen emits a soft teal glow that illuminates the surrounding darkness, creating volumetric light rays emanating from the screen outward. Around the phone, floating semi-transparent icons orbit like satellites: a shopping cart, a medical cross, a brain/AI icon, a book, a calculator — all in teal wireframe style. At the bottom, water ripples reflect the phone from below, creating a mirror effect on a wet dark surface. The overall feel is premium tech product launch — like an Apple keynote reveal moment. IMPORTANT: Arabic text is rendered directly on the image.",
  "text_overlay": {
    "title": {
      "text": "🌐 تعرف على AQUAVO؟",
      "position": "top_center",
      "font_size": "32px",
      "color": "#FFFFFF",
      "background": "semi-transparent dark gradient at top (rgba(0,0,0,0.8))"
    },
    "subtitle": {
      "text": "أول موقع عراقي متكامل لعالم الأحواض!",
      "position": "below_title",
      "font_size": "18px",
      "color": "#00BCD4"
    },
    "bottom": {
      "text": "👆 اسحب وشوف شنو بيه!",
      "position": "bottom_center",
      "font_size": "16px",
      "color": "#FFFFFF",
      "background": "semi-transparent dark gradient at bottom"
    }
  },
  "color_palette": {
    "dominant": "#050505",
    "accent": "#00BCD4",
    "glow": "#004D61"
  },
  "aquavo_branding": {
    "logo_text": "AQUAVO",
    "position": "center_of_phone_screen",
    "font": "SF Pro Display Bold, 24px, #00BCD4"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "format": "PNG"
  },
  "constraints": {
    "exclusions": ["cartoon", "bright colors", "broken Arabic"],
    "style_raw": true
  }
}
```

**النص العراقي:**
```
🌐 تعرف على AQUAVO؟

أول موقع عراقي متكامل لعالم الأحواض!
مو بس متجر — هذا عالم كامل! 🐟

👆 اسحب وشوف شنو كُلش بيه...
```

**التفاعل:** `POLL: سمعت بيه قبل؟ (أي 🙌 / لا أول مرة 🤯)`

---

## الشريحة 2 — 🛒 المتجر الذكي

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A premium dark mode e-commerce product grid for Instagram Story (9:16). Deep black background with 4 product cards arranged in a 2x2 grid. Each card has a dark glass-morphism style (rgba(255,255,255,0.05)) with rounded corners and subtle border glow. Products shown: TOP-LEFT: A bottle of aquarium water conditioner on black background with green aura. TOP-RIGHT: Premium fish food container with warm golden aura. BOTTOM-LEFT: A CO2 diffuser set with crystal clear glass showing bubble pattern. BOTTOM-RIGHT: A sleek LED aquarium light bar with cool white beam visible. Each product card has a teal 'Add to Cart' button at the bottom and a price tag in white. Between the cards, subtle connecting lines suggest 'smart recommendations'. A floating AI sparkle icon (✨) suggests intelligent product suggestions. The overall feel is premium dark mode shopping experience — like a luxury app store. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "title": {
      "text": "🛒 متجر بكل شيء تحتاجه!",
      "position": "top_center",
      "font_size": "28px",
      "color": "#FFFFFF"
    },
    "features": [
      "✅ أجود المنتجات العالمية",
      "✅ توصيل لكل العراق",
      "✅ وصف علمي + تقييمات حقيقية",
      "✅ توصيات ذكية بالـ AI"
    ],
    "bottom_tip": {
      "text": "💡 كل منتج عليه وصف علمي يخليك تفهم شنو تشتري!",
      "color": "#00BCD4"
    }
  },
  "technical": { "resolution": "4K", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright backgrounds", "broken Arabic"], "style_raw": true }
}
```

**النص العراقي:**
```
🛒 أول شيء: المتجر!

مو متجر عادي — كل منتج عليه:
✅ وصف علمي مفصل
✅ تقييمات حقيقية من مربين
✅ توصيات ذكية (الـ AI يقترحلك شنو تحتاج!)

من فلاتر ومعدات.. لأدوية وعلاجات..
لحد معجون CO2 وأكل متخصص!

💡 كل شيء بمكان واحد — بدل ما تدور بـ ١٠ محلات!
```

**التفاعل:** `QUIZ: كم منتج بالموقع تتوقع؟ (50 / 100+ ✅ / 200+)`

---

## الشريحة 3 — 🤖 Dr. AQUAVO (التشخيص بالذكاء الاصطناعي)

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A dramatic dark mode AI diagnosis interface for Instagram Story (9:16). Center of frame: a realistic photo of a Betta fish with visible fin damage, displayed inside a dark scanning interface frame. Around the fish image, glowing teal scan lines sweep across — like a medical MRI scan in progress. To the right side, a floating diagnosis card appears in glassmorphism style showing: Disease name in Arabic (تآكل الزعانف), Confidence: 92%, Urgency badge (⚠️ متوسط), and 3 treatment step bullet points. At the top, a dark header with a stethoscope icon and 'Dr. AQUAVO' text in teal. Floating AI neural network nodes connect between the fish image and the diagnosis card — showing the AI 'thinking'. A subtle heartbeat-like pulse animation line runs across the bottom. The overall aesthetic is a premium medical AI dashboard — dark, clinical, trustworthy, futuristic. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "title": {
      "text": "🤖 Dr. AQUAVO — طبيب أسماكك!",
      "position": "top_center",
      "font_size": "26px",
      "color": "#FFFFFF"
    },
    "features": [
      "📸 صوّر سمكتك = تشخيص فوري!",
      "🧠 ذكاء اصطناعي يشخص 50+ مرض",
      "💊 خطة علاج كاملة + جدول زمني",
      "🤰 يكتشف الحمل + يقترح متابعة"
    ],
    "bottom_tip": {
      "text": "🔥 أول نظام بالعراق — صورة واحدة تكفي!",
      "color": "#FF6B6B"
    }
  },
  "technical": { "resolution": "4K", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright backgrounds", "broken Arabic"], "style_raw": true }
}
```

**النص العراقي:**
```
🤖 هذا أقوى شيء بالموقع!

Dr. AQUAVO — أول طبيب أسماك بالذكاء الاصطناعي:

📸 صوّر سمكتك بالموبايل
🧠 الـ AI يحلل الصورة ويشخص المرض
💊 يطلعلك خطة علاج كاملة!
📅 يحددلك موعد متابعة!
🤰 حتى يعرف إذا سمكتك حامل!

مو محتاج دكتور — عندك واحد بالموقع! 🔥

💡 مجاني — جربه الحين!
```

**التفاعل:** `SLIDER: شكد تثق بالذكاء الاصطناعي؟ 🤖`

---

## الشريحة 4 — 📖 المدونة والمقالات

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A premium dark mode blog/article list interface for Instagram Story (9:16). Deep black background (#050505). Three article preview cards stacked vertically with slight overlap. Each card (dark glassmorphism style) shows: a small thumbnail image (aquarium scene), article title in Arabic (white text), a brief excerpt in grey, and reading time badge. CARD 1: Thumbnail of a planted tank, title 'كيف تسوي Cycling للحوض الجديد؟', reading time '٧ دقائق'. CARD 2: Thumbnail of a Betta fish, title 'دليل المبتدئين لتربية البيتا', reading time '٥ دقائق'. CARD 3: Thumbnail of aquascape tools, title 'أفضل ١٠ نباتات مائية للمبتدئين', reading time '٦ دقائق'. A subtle search bar at the top with magnifying glass icon. The feel is a premium knowledge base — Medium meets Apple News in dark mode. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "title": {
      "text": "📖 مدوّنة AQUAVO — علم بالعراقي!",
      "position": "top_center",
      "font_size": "26px",
      "color": "#FFFFFF"
    },
    "features": [
      "📝 مقالات مكتوبة بلهجة عراقية مفهومة",
      "🔬 معلومات علمية موثوقة",
      "📚 من أساسيات المبتدئين للمحترفين",
      "🔍 SEO — تلقاها بقوقل مباشرة!"
    ],
    "bottom_tip": {
      "text": "💡 كل شيء تحتاج تعرفه — بمكان واحد!",
      "color": "#00BCD4"
    }
  },
  "technical": { "resolution": "4K", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright backgrounds", "broken Arabic"], "style_raw": true }
}
```

**النص العراقي:**
```
📖 مدوّنة AQUAVO

مو مترجمة — مكتوبة من مربين عراقيين!

📝 مقالات بلهجتنا — تفتهمها بدون قاموس!
🔬 كل معلومة عليها مصدر علمي
📚 من "كيف أبدأ" لحد "Aquascaping متقدم"

بابا ما تحتاج تدور بيوتيوب ساعتين —
المعلومة جاهزة بـ ٥ دقائق قراءة! ⏱️
```

**التفاعل:** `POLL: تقرأ مقالات؟ (أي أحب أتعلم 📚 / أفضل فيديو 📹)`

---

## الشريحة 5 — 🧮 الحاسبات الذكية

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A premium dark mode calculator/tools dashboard for Instagram Story (9:16). Deep black background with 4 tool cards arranged in a 2x2 grid. Each card is a glassmorphism dark rectangle with an icon and brief description. CARD 1 (Aquarium Volume): A 3D wireframe aquarium shape glowing teal, calculator icon, text 'حجم الحوض'. CARD 2 (Stocking Calculator): A fish silhouette with counting numbers, text 'عدد الأسماك المناسب'. CARD 3 (CO2 Calculator): A CO2 bubble diagram glowing green, text 'حاسبة CO2'. CARD 4 (Dosing Calculator): A medicine dropper with measurement marks, text 'جرعات الأسمدة'. Each card glows with its own color — teal, blue, green, amber. A central brain/AI icon connects all 4 cards with subtle glowing lines, suggesting intelligent computation. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "title": {
      "text": "🧮 أدوات ذكية — تحسب كل شيء!",
      "position": "top_center",
      "font_size": "26px",
      "color": "#FFFFFF"
    },
    "features": [
      "📐 حاسبة حجم الحوض (بالسم والبوصة)",
      "🐟 كم سمكة تكدر تحط؟ — يحسبلك!",
      "🌿 جرعات الأسمدة والـ CO2",
      "💧 حاسبة تغيير المي"
    ],
    "bottom_tip": {
      "text": "💡 وقّف التخمين — خلّي الرياضيات تشتغل!",
      "color": "#00BCD4"
    }
  },
  "technical": { "resolution": "4K", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright backgrounds", "broken Arabic"], "style_raw": true }
}
```

**النص العراقي:**
```
🧮 حاسبات ذكية — تحسبلك كل شيء!

وقّف التخمين:

📐 شكد لتر حوضك بالضبط؟
🐟 كم سمكة تكدر تحط بدون ازدحام؟
🌿 شكد CO2 يحتاج حوضك للزرع؟
💧 شكد مي تغيّر كل أسبوع؟

كلها محسوبة — بس دخّل الأرقام!

💡 مجانية — وتنحفظ بحسابك!
```

**التفاعل:** `QUIZ: كم لتر حوضك؟ (تحت 30 / 30-60 / فوك 60 💪)`

---

## الشريحة 6 — 💬 المساعد الذكي (AI Chat)

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A premium dark mode chat interface for Instagram Story (9:16). Deep black background showing a realistic chat conversation UI. The chat shows a conversation between a user and 'Dr. AQUAVO AI'. USER MESSAGE (right-aligned, dark blue bubble): 'سمكتي ما تاكل من يومين.. شنو السبب؟ 😰'. AI RESPONSE (left-aligned, dark teal bubble): A detailed, caring response in Arabic with bullet points about possible causes (water quality, stress, disease), followed by 3 quick-action buttons: 'شخّص بالصورة 📸', 'افحص معلمات الماء 🧪', 'تصفح العلاجات 💊'. The AI avatar is a teal circle with a brain icon. At the bottom, a message input field with microphone icon and send button. The chat interface has subtle glassmorphism effects and rounded message bubbles. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "title": {
      "text": "💬 مساعد ذكي — اسأله أي سؤال!",
      "position": "top_center",
      "font_size": "26px",
      "color": "#FFFFFF"
    },
    "features": [
      "🧠 يفهم عراقي + عربي + إنجليزي",
      "💡 يجاوبك بمعلومات علمية",
      "📸 يقدر يوجهك للتشخيص بالصورة",
      "🛒 يقترحلك المنتج المناسب"
    ],
    "bottom_tip": {
      "text": "💡 مثل ما تسأل صاحبك — بس هذا يعرف أكثر! 😄",
      "color": "#00BCD4"
    }
  },
  "technical": { "resolution": "4K", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright backgrounds", "broken Arabic"], "style_raw": true }
}
```

**النص العراقي:**
```
💬 مو عارف شنو المشكلة؟ اسأله!

المساعد الذكي يجاوبك على:

🤔 "سمكتي ما تاكل — شنو السبب؟"
🤔 "شنو أحسن فلتر لحوض ٦٠ لتر؟"  
🤔 "ليش المي صار أخضر؟"
🤔 "شنو الفرق بين API و Seachem؟"

يفهم عراقي ويجاوبك بالعراقي! 🇮🇶

💡 ٢٤ ساعة.. ٧ أيام.. ما يمل!
```

**التفاعل:** `TEXT STICKER: اكتبلي سؤال تبي تسأله! ✍️`

---

## الشريحة 7 — الخاتمة (CTA)

**بروموت الصورة:**
```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A powerful closing hero shot for Instagram Story (9:16). Deep dark background with the AQUAVO logo prominently centered — glowing teal text 'AQUAVO' with a subtle water ripple effect emanating from the letters. Below the logo, 5 small glowing icons in a horizontal row representing the features: 🛒 Cart, 🤖 AI Brain, 📖 Book, 🧮 Calculator, 💬 Chat — each in a small teal circle. Below the icon row, the website URL 'aquavoiq.com' in clean white text with a subtle underline glow effect. At the very bottom, a large glowing teal CTA button: 'زور الموقع الحين! 🚀'. The background has very subtle floating bubbles and aquatic light caustics, creating an underwater premium atmosphere. A faint teal gradient light comes from below, illuminating the logo from underneath — dramatic uplighting effect. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "title": {
      "text": "كُلش بمكان واحد! 🐟",
      "position": "top_center",
      "font_size": "28px",
      "color": "#FFFFFF"
    },
    "feature_icons_row": "🛒 + 🤖 + 📖 + 🧮 + 💬",
    "url": {
      "text": "aquavoiq.com",
      "position": "center",
      "font_size": "24px",
      "color": "#FFFFFF",
      "glow": "#00BCD4"
    },
    "cta": {
      "text": "🚀 زور الموقع الحين!",
      "position": "bottom_center",
      "font_size": "22px",
      "color": "#FFFFFF",
      "background": "solid teal (#00BCD4) rounded button with shadow"
    }
  },
  "technical": { "resolution": "4K", "aspect_ratio": "9:16" },
  "constraints": { "exclusions": ["cartoon", "bright backgrounds", "broken Arabic"], "style_raw": true }
}
```

**النص العراقي:**
```
كُلش بمكان واحد! 🐟

🛒 متجر — بكل شيء تحتاجه
🤖 دكتور ذكي — يشخص بالصورة
📖 مدونة — علم بالعراقي
🧮 حاسبات — تحسبلك كل شيء
💬 مساعد — يجاوبك ٢٤/٧

🌐 aquavoiq.com

🚀 سجّل مجاناً — وخلّي أسماكك بأحسن حال!
```

**التفاعل:** `LINK STICKER: aquavoiq.com → "زور الموقع! 🐟"`

---

## 🎵 Suno AI (لكل الشرائح — صوت واحد)

> ⚠️ **ملاحظة:** uplifting tech reveal = Apple keynote vibes + 118 BPM = energetic but not rushed + marimba + Rhodes = warm tech feel

- **Style:** `uplifting tech reveal, warm marimba and Rhodes piano hook, cinematic strings swell, inspirational, premium brand launch energy, instrumental, 118bpm, key of Ab major`
- **Lyrics:**
```
[Short Instrumental Intro]
(warm marimba 4-note ascending hook, Ab-C-Eb-Ab, clean and bright, subtle shaker groove, anticipation building)

[Catchy Hook]
(same marimba hook repeats 3x, Rhodes piano joins with lush chords underneath, light percussion enters, head-nodding groove, warm and inviting)

[Build]
(hook continues, cinematic strings rise gently, soft snare roll crescendo, bass synth adds depth, energy rising steadily like a product reveal)

[Drop]
(full arrangement bloom — marimba + Rhodes + strings + percussion all together, triumphant and warm, the product is revealed, goosebump moment, bass drops with authority)

[Outro]
(marimba hook alone with cathedral reverb, one final warm chord bloom, satisfying ending, brand logo moment)
```

---

## 🏷️ هاشتاقات الستوري

```
#aquavo #AQUAVO #أكوافو #أسماك_زينة #حوض_سمك
#أحواض_العراق #مربي_أسماك #aquarium #fishtank
#تشخيص_أسماك #AI_Fish #متجر_أسماك #العراق
#aquavoiq #planted_tank #بيتا #goldfish
```

---

## 📌 حفظ بالهايلايت: 🌐 **الموقع**

---

## 📐 القواعد

1. **كل شريحة = ميزة واحدة.** لا تخلط ميزتين بشريحة.
2. **اللهجة عراقية 100%.** "شنو" مو "ماذا". "تكدر" مو "تستطيع". "كُلش" مو "كل شيء".
3. **الصورة تُبهر، النص يشرح.** (الصورة premium → النص سهل وبسيط).
4. **Dark Mode Only.** خلفيات سوداء. النص أبيض + تيل فقط.
5. **كل شريحة 5 ثواني.** المتابع يقرأ بسرعة — كن مختصر!
6. **آخر شريحة = CTA.** دائماً وجّه للموقع!

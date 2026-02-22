# 🎨 لجين — بروموتات الفريمات V2 (خلفية غرفة بيضاء + كرسي)

> **التاريخ:** 21 فبراير 2026
> **السبب:** الخلفية التيركواز المائية في V1 تبيّن AI بشكل فوري
> **الحل:** خلفية جدار أبيض/كريمي + جلسة على كرسي خشبي = مثل TikTok حقيقي

---

## 🎯 لماذا هذه الخلفية هي الأفضل؟

```
❌ خلفية V1 (تيركواز مائية):
   - تبدو AI على طول
   - لون القميص التيركواز يتلاشى بالخلفية التيركواز
   - لا أحد يصوّر هكذا في الحياة الحقيقية

✅ خلفية V2 (جدار أبيض/كريمي + كرسي):
   - القميص التيركواز يبرز وينفجر أمام الأبيض (contrast ممتاز)
   - تبدو مثل TikTok creator حقيقية تصوّر بالبيت
   - طبيعية 100% — لا أحد يشك إنها AI
   - شائعة جداً: 80% من محتوى TikTok مسجّل بهذا الشكل
```

---

## 🔧 الإعدادات الثابتة (لكل الفريمات الـ 6)

انسخ هذا الـ BASE BLOCK وضعه في كل بروموت:

```json
"character_base": {
  "identity": "Same young Iraqi woman from the uploaded reference image, age 23",
  "ethnicity": "authentic Iraqi Arab woman — warm honey-wheat skin, Mesopotamian facial features",
  "hair": "long straight dark black hair, natural shine, center part, falls past shoulders",
  "skin": "warm honey-wheat complexion, natural visible pores, zero makeup",
  "clothing": "turquoise polo shirt AQUAVO brand (#2AAFAB color), small embroidered logo on left chest"
},

"environment": {
  "background": {
    "type": "plain smooth off-white matte wall",
    "color": "warm cream-white (#F8F4EE) — NOT bright white, NOT gray. Warm slightly yellowish-white like a real room wall",
    "texture": "natural plaster wall surface — subtle texture visible up close, NOT studio paper backdrop",
    "vignette": "very subtle darkening at far edges — creates soft natural depth",
    "FORBIDDEN": "NO patterns, NO bokeh circles, NO water effects, NO caustics, NO gradients, NO colored light on wall, NO AI-looking effects of any kind"
  },
  "chair": {
    "style": "simple minimal Scandinavian wooden chair — light natural oak wood, clean straight lines",
    "color": "light natural wood — beige-blonde oak tone",
    "visibility": "backrest partially visible behind her shoulders on both sides — completely natural",
    "seat": "she sits on the padded seat — white or light linen cushion",
    "NO": "NOT an office chair, NOT a gaming chair, NOT a throne. Simple, minimal, clean."
  },
  "floor": "NOT visible — cropped above the seat area"
},

"lighting": {
  "key": {
    "type": "soft natural window daylight",
    "direction": "from CAMERA-LEFT — 45 degrees, as if a large window is to the left",
    "quality": "diffused and soft — like overcast sky through a window, NOT harsh direct sun",
    "temperature": "warm clean daylight 5200K — warm but NOT orange or golden"
  },
  "fill": {
    "source": "gentle bounce from the white wall on camera-right",
    "power": "35% of key light — soft natural wrap",
    "effect": "reduces harsh shadows on right side of face naturally"
  },
  "shadows": "soft natural shadow on right side of face — realistic, NOT dramatic, NOT harsh",
  "mood": "bright, clean, natural — real person recording at home near a window",
  "NO": "NO dramatic studio lighting, NO golden hour glow, NO colored lighting, NO ring light halo"
},

"camera": {
  "device": "smartphone front camera quality — natural, slightly intimate",
  "aspect_ratio": "9:16 vertical portrait",
  "resolution": "4K clarity",
  "focus": "sharp focus on face and eyes",
  "depth_of_field": "slight background blur — wall is softly out of focus behind her"
}
```

---

## 🎬 فريم 1 — الهوك الغامض (0-3 ثوانٍ)

> ابتسامة خفيفة غامضة — رأس مايل بسيط — "أنا لجين 🐟 وهسة راح أخبرك شي..."

```json
{
  "model": "nanobanana-pro",
  "task_type": "image_generation_with_reference",
  "reference": "Upload the Lajeen character reference image",

  "priority": "Mysterious yet warm first impression — she is about to reveal something interesting",

  "face": {
    "expression": "subtle mysterious smile — calm and confident, like sharing a secret with a close friend",
    "eyes": {
      "gaze": "direct into camera — steady, soft, intriguing",
      "shape": "relaxed, natural width — NOT wide open, NOT squinting",
      "catchlights": "two small natural reflections visible in both irises",
      "expression": "quiet curiosity — 'I know something you'll want to hear'"
    },
    "eyebrows": {
      "position": "relaxed and level — one brow VERY slightly raised (natural asymmetry)",
      "expression": "calm intrigue, NOT dramatically raised"
    },
    "mouth": {
      "state": "CLOSED — very subtle knowing smile",
      "expression": "gentle upward curve at corners — NOT a full smile, just a hint",
      "lips": "natural color, softly pressed together with slight curve"
    }
  },

  "head": {
    "tilt": "VERY SLIGHT tilt to her RIGHT — about 5 degrees (camera-left). Casual and personal",
    "rotation": "facing camera directly",
    "chin": "neutral level — neither raised nor lowered"
  },

  "body": {
    "position": "sitting upright on a simple wooden chair",
    "posture": "relaxed upright — natural comfortable sitting, back straight but not stiff",
    "framing": "chest-and-above visible — waist-up portrait while seated",
    "shoulders": "level and relaxed, slightly open toward camera",
    "hands": "resting naturally in her lap — NOT visible in frame"
  },

  "environment": "USE BASE BLOCK environment above",
  "lighting": "USE BASE BLOCK lighting above",
  "camera": "USE BASE BLOCK camera above",

  "must_not": [
    "Do NOT make the smile wide — just a hint of mystery",
    "Do NOT raise eyebrows dramatically",
    "Do NOT show hands",
    "Do NOT use blue/teal background — WHITE WALL ONLY",
    "Do NOT make her look stiff — relaxed and natural sitting"
  ]
}
```

---

## 🎬 فريم 2 — الحماس (3-12 ثوانٍ)

> ابتسامة أعرض — حواجب مرفوعة — "أنا هنا علمودك! 💚"

```json
{
  "model": "nanobanana-pro",
  "task_type": "image_generation_with_reference",
  "reference": "Upload the Lajeen character reference image",

  "priority": "Genuine warm excitement — she is happy to help and connect with you",

  "face": {
    "expression": "warm genuine smile — wider than Frame 1, real Duchenne smile",
    "eyes": {
      "gaze": "direct into camera — bright and warm, alive with energy",
      "shape": "slightly wider open from excitement — natural, NOT cartoonish",
      "corners": "slight crinkling at outer corners — real smile indicator",
      "catchlights": "bright reflections, eyes look alive",
      "expression": "'I genuinely want to help you' energy — warmth and excitement combined"
    },
    "eyebrows": {
      "position": "RAISED — open and expressive, higher than Frame 1",
      "expression": "enthusiastic and welcoming"
    },
    "mouth": {
      "state": "CLOSED — warm full smile, lips pressed together in genuine happiness",
      "expression": "biggest closed-lip smile — cheeks pushed up naturally",
      "cheeks": "naturally lifted and rounded from the genuine smile"
    }
  },

  "head": {
    "tilt": "neutral — facing camera almost straight, perhaps 2-3 degrees to camera-right",
    "rotation": "facing camera directly",
    "chin": "slightly raised — open confident energy"
  },

  "body": {
    "position": "sitting on wooden chair, leaning VERY SLIGHTLY forward — engaged and enthusiastic",
    "posture": "upright with slight forward lean — like leaning toward a friend while talking",
    "framing": "chest-and-above, waist-up while seated",
    "shoulders": "open and slightly forward — engaged body language",
    "hands": "in lap, NOT visible in frame"
  },

  "environment": "USE BASE BLOCK environment above",
  "lighting": "USE BASE BLOCK lighting above",
  "camera": "USE BASE BLOCK camera above",

  "must_not": [
    "Do NOT show teeth — lips stay CLOSED even in this big smile",
    "Do NOT make her lean too far forward — just a subtle tilt",
    "Do NOT make it a fake performance smile — genuine Duchenne smile",
    "Do NOT use blue/teal background — WHITE WALL ONLY"
  ]
}
```

---

## 🎬 فريم 3 — الشرح بيد مفتوحة (12-28 ثوانٍ)

> يد يمنى مرفوعة بكف مفتوحة — تعبير خبيرة واثقة

```json
{
  "model": "nanobanana-pro",
  "task_type": "image_generation_with_reference",
  "reference": "Upload the Lajeen character reference image",

  "priority": "Professional expert explaining — confident knowledge, open and welcoming gesture",

  "face": {
    "expression": "confident professional warmth — 'I know what I'm talking about and I want to share it'",
    "eyes": {
      "gaze": "direct into camera — focused and intelligent",
      "shape": "slightly narrower than Frame 2 — more deliberate and focused",
      "catchlights": "same two natural reflections",
      "expression": "confident expertise — calm authority"
    },
    "eyebrows": {
      "position": "relaxed and level — one brow VERY slightly higher (natural asymmetry)",
      "expression": "calm confidence, NOT raised like Frame 2"
    },
    "mouth": {
      "state": "CLOSED — calm professional smile, smaller than Frame 2",
      "expression": "controlled warmth — professional but approachable",
      "lips": "gentle upward curve, natural color"
    }
  },

  "head": {
    "tilt": "VERY SLIGHT tilt to camera-right — about 3-4 degrees, opposite from Frame 1",
    "rotation": "facing camera directly",
    "chin": "slightly raised — confident posture"
  },

  "body": {
    "position": "sitting upright on wooden chair — BACK STRAIGHT, professional posture",
    "posture": "very upright and deliberate — most formal/professional body language of all frames",
    "framing": "slightly WIDER than Frames 1-2 — to include the right hand gesture",
    "shoulders": "pulled back slightly — open and confident, right shoulder slightly lower"
  },

  "right_hand": {
    "VISIBILITY": "VISIBLE — KEY ELEMENT of this frame",
    "position": "raised to chest level, about 15cm in front of body",
    "palm": "facing UPWARD — open explaining gesture",
    "fingers": {
      "thumb": "relaxed, slightly separated, pointing outward-upward",
      "index": "naturally extended, slightly curved — NOT pointing or stiff",
      "middle": "naturally extended, slightly curved, close to index",
      "ring": "naturally extended, slightly lower than middle",
      "pinky": "naturally extended, slightly curled inward — most relaxed"
    },
    "wrist": "relaxed, natural angle — NOT stiff or mechanical",
    "skin_detail": "visible knuckle creases, natural skin texture, clean short nails",
    "gesture_meaning": "open palm presenting gesture — 'let me explain these important points'"
  },

  "left_hand": "NOT visible — resting in lap below frame",

  "environment": "USE BASE BLOCK environment above",
  "lighting": {
    "base": "USE BASE BLOCK lighting",
    "hand_detail": "natural window light hits the raised palm from the left — visible hand texture and skin tone"
  },
  "camera": "USE BASE BLOCK camera above, slightly wider framing",

  "must_not": [
    "Do NOT make the hand stiff or robotic — fingers must look natural and relaxed",
    "Do NOT show left hand",
    "Do NOT make the smile as wide as Frame 2 — this is professional calm",
    "Do NOT add extra fingers — EXACTLY 5 fingers on right hand",
    "Do NOT use blue/teal background — WHITE WALL ONLY"
  ]
}
```

---

## 🎬 فريم 4 — يد على القلب (25-28 ثوانٍ)

> يد يمنى على الصدر — تعبير صادق دافئ — "مو بس متجر — عائلة! 💚"

```json
{
  "model": "nanobanana-pro",
  "task_type": "image_generation_with_reference",
  "reference": "Upload the Lajeen character reference image",

  "priority": "Deeply sincere emotional moment — hand on heart, genuine human connection",

  "face": {
    "expression": "warm sincere vulnerability — this is the emotional peak, 'I truly care about you'",
    "eyes": {
      "gaze": "direct into camera — soft, caring, slightly vulnerable",
      "shape": "slightly softer than Frame 3 — less focused, more emotionally open",
      "moisture": "very slight extra moisture in tear film — glistening warmly (NOT crying, just emotional)",
      "expression": "genuine care radiating — intimate and sincere"
    },
    "eyebrows": {
      "position": "softened — very slightly drawn together with empathy",
      "expression": "warm concern and sincere care, NOT frowning"
    },
    "mouth": {
      "state": "CLOSED — small intimate smile, SMALLER than Frame 2 and 3",
      "expression": "soft, small, genuine — NOT performative",
      "lips": "gently pressed with warm subtle upward curve"
    },
    "overall_warmth": "subtle natural flush on cheeks — very faint, emotional warmth"
  },

  "head": {
    "tilt": "very subtle downward nod — chin drops just a fraction, affirming sincerity",
    "rotation": "facing camera directly",
    "chin": "SLIGHTLY lowered from neutral — humble, sincere angle"
  },

  "body": {
    "position": "sitting on wooden chair, posture slightly softened — not as rigid as Frame 3",
    "framing": "waist-up portrait while seated",
    "shoulders": "slightly rounded forward — open vulnerable body language"
  },

  "right_hand": {
    "VISIBILITY": "VISIBLE — KEY ELEMENT: flat on left chest over the heart",
    "position": "flat against her chest on the LEFT side (her left), over the heart area",
    "touch": "GENTLE light touch — hand rests softly on fabric, NOT pressing hard",
    "palm": "flat against polo fabric — slight fabric indent visible under palm",
    "fingers": {
      "thumb": "rests naturally on fabric pointing toward left shoulder",
      "index": "extended flat on fabric, slight separation from middle",
      "middle": "extended flat on fabric, center spread",
      "ring": "extended flat on fabric, slightly lower",
      "pinky": "extended flat, slightly curled at tip"
    },
    "wrist": "crosses body diagonally from right side to left chest — natural crossing",
    "fabric": "polo fabric shows slight gentle indentation under palm — hand is TOUCHING fabric"
  },

  "left_hand": "NOT visible — below frame at her side",

  "environment": "USE BASE BLOCK environment above",
  "lighting": {
    "base": "USE BASE BLOCK lighting",
    "adjustment": "SLIGHTLY softer and warmer than other frames — fill increased 10%, more intimate mood",
    "shadows": "softer than Frames 1-3, more even and gentle"
  },
  "camera": "USE BASE BLOCK camera above",

  "must_not": [
    "Do NOT make the hand press HARD — gentle light touch only",
    "Do NOT make this theatrical — must feel natural and genuine",
    "Do NOT show left hand",
    "Do NOT make her look like crying — eyes glisten but NO tears",
    "Do NOT make smile wide — SMALL intimate smile only",
    "Do NOT add extra fingers — EXACTLY 5 on right hand",
    "Do NOT use blue/teal background — WHITE WALL ONLY"
  ]
}
```

---

## 🎬 فريم 5 — التعريف الشخصي (28-42 ثوانٍ)

> يدين في الحضن — ابتسامة متوسطة واثقة — ذقن مرفوع — "أنا لجين 👋 عمري 23 سنة"

> ⚠️ **يجب أن يختلف بوضوح عن فريم 4:** اليد تنزل + الذقن يرتفع + الابتسامة أكبر

```json
{
  "model": "nanobanana-pro",
  "task_type": "image_generation_with_reference",
  "reference": "Upload the Lajeen character reference image",

  "priority": "Personal confident self-introduction — proud but humble, like introducing yourself to a new friend",

  "face": {
    "expression": "warm personal confidence — she is telling you exactly who she is and why she is here",
    "eyes": {
      "gaze": "direct into camera — warm, personal, and determined",
      "shape": "open and clear — NOT glistening with emotion like Frame 4",
      "catchlights": "clear and bright reflections",
      "expression": "'I know my purpose and I'm excited to share it'"
    },
    "eyebrows": {
      "position": "relaxed but slightly raised — open honest expression",
      "expression": "confident and inviting — different from Frame 4's soft empathy"
    },
    "mouth": {
      "state": "CLOSED — warm personal smile",
      "expression": "MEDIUM smile — BIGGER than Frame 4's small intimate smile, SMALLER than Frame 2's big excited smile",
      "lips": "natural warm curve — genuine and confident"
    }
  },

  "head": {
    "tilt": "VERY SLIGHT tilt to her RIGHT — about 3 degrees, friendly and personal",
    "rotation": "facing camera directly",
    "chin": "SLIGHTLY RAISED — confidence and pride (OPPOSITE of Frame 4's lowered chin)"
  },

  "body": {
    "position": "sitting upright on wooden chair — OPEN confident posture",
    "posture": "upright and open — shoulders back, chest open, welcoming body language",
    "framing": "chest-and-above, waist-up while seated",
    "shoulders": "LEVEL and relaxed — open body language, 'here I am' energy",
    "hands": "resting naturally in lap — NOT visible. Logo fully visible on chest"
  },

  "logo": "FULLY VISIBLE on left chest — NOT covered by hand (unlike Frame 4)",

  "environment": "USE BASE BLOCK environment above",
  "lighting": {
    "base": "USE BASE BLOCK lighting",
    "adjustment": "slightly warmer than Frames 1-3, similar to Frame 4 but slightly brighter — intimate confident"
  },
  "camera": "USE BASE BLOCK camera above",

  "key_differences_from_frame_4": [
    "Hand: DOWN in lap, NOT on heart",
    "Chin: RAISED slightly (not lowered)",
    "Eyes: clear and confident (not glistening)",
    "Smile: medium confident (not small intimate)",
    "Shoulders: open and back (not rounded forward)",
    "Logo: fully visible (not covered)"
  ],

  "must_not": [
    "Do NOT put hand on heart — that was Frame 4",
    "Do NOT lower the chin — chin RAISED here",
    "Do NOT make eyes glistening — clear and confident",
    "Do NOT make the smile too small like Frame 4",
    "Do NOT round the shoulders — open confident posture",
    "Do NOT use blue/teal background — WHITE WALL ONLY"
  ]
}
```

---

## 🎬 فريم 6 — التوديع + CTA (42-50 ثوانٍ)

> أكبر ابتسامة + يد ترحّب — أعلى طاقة في الفيديو — "تابعنا @aquavo.iq ❤️"

```json
{
  "model": "nanobanana-pro",
  "task_type": "image_generation_with_reference",
  "reference": "Upload the Lajeen character reference image",

  "priority": "Most joyful energetic farewell — biggest genuine smile, waving hand, pure happiness",

  "face": {
    "expression": "BIGGEST most genuine smile of the entire 6-frame series — pure unbridled joy",
    "eyes": {
      "gaze": "direct into camera — but eyes SQUINTING from the big happy smile",
      "shape": "crinkled at outer corners — Duchenne smile, crow's feet lines appearing naturally",
      "catchlights": "bright reflections still visible despite squinting",
      "expression": "pure genuine joy — eyes partially close from the big smile"
    },
    "eyebrows": {
      "position": "RAISED — highest position of all 6 frames, animated delight",
      "expression": "open and happy, playful energy"
    },
    "mouth": {
      "state": "BARELY PARTED — lips very slightly open with natural joy",
      "expression": "biggest Duchenne smile — real, NOT a forced grin or theatrical expression",
      "teeth": "top teeth BARELY visible through the slightly parted lips — natural, NOT a wide open grin",
      "lips": "stretched wide with genuine happiness",
      "cheeks": "PUSHED UP HIGH — natural smile bunching creating under-eye fullness"
    },
    "flush": "natural slight flush on cheeks from joy and energy"
  },

  "head": {
    "tilt": "neutral to very slight playful tilt — 2-3 degrees either direction",
    "rotation": "facing camera directly",
    "chin": "slightly raised — open and confident"
  },

  "hair": {
    "base": "same long straight dark black hair",
    "movement": "one or two strands shifted slightly from the waving motion — subtle natural movement",
    "energy": "hair catches slightly more light — dynamic feel"
  },

  "body": {
    "position": "sitting on wooden chair — upright with open positive energy",
    "posture": "UPRIGHT and OPEN — shoulders back, chest open, radiating positive energy",
    "framing": "slightly WIDER than other frames — to fully include the waving right hand",
    "shoulders": "right shoulder slightly raised from the wave, left shoulder relaxed"
  },

  "right_hand": {
    "VISIBILITY": "VISIBLE — KEY ELEMENT: friendly wave goodbye",
    "position": "raised to SHOULDER LEVEL — slightly to camera-right of her face",
    "palm": "facing FORWARD toward camera — open palm friendly wave",
    "wave_style": "casual friendly mid-wave — like waving to a friend you'll see again soon, NOT stiff military wave",
    "fingers": {
      "thumb": "slightly separated, pointing outward — relaxed",
      "index": "extended, slightly spread from middle finger",
      "middle": "extended straight — tallest center finger of the wave",
      "ring": "extended, slightly lower, close to middle",
      "pinky": "extended but slightly curled inward naturally"
    },
    "wrist": "slight natural angle bend — NOT stiff. Casual wave position",
    "energy": "mid-motion feel — hand looks like it IS waving, not frozen in place"
  },

  "left_hand": "NOT visible — at her side below frame",

  "clothing": {
    "polo": "same turquoise AQUAVO polo #2AAFAB",
    "logo": "visible on left chest",
    "wrinkles": "slight natural fabric pull near right armpit from raised arm"
  },

  "environment": "USE BASE BLOCK environment above",
  "lighting": {
    "base": "USE BASE BLOCK lighting",
    "adjustment": "SLIGHTLY BRIGHTER than all other frames — more fill light (60-65%), open and positive mood",
    "mood": "bright, upbeat, energetic — most positive lighting of all 6 frames"
  },
  "camera": "USE BASE BLOCK camera above, slightly wider to include waving hand fully",

  "must_not": [
    "Do NOT make a stiff military wave — casual friendly wave ONLY",
    "Do NOT open the mouth wide in a theatrical grin — lips BARELY parted",
    "Do NOT show too many teeth — just a glimpse through slightly parted lips",
    "Do NOT crop the waving hand — it MUST be fully visible",
    "Do NOT add extra fingers — EXACTLY 5 on right hand",
    "Do NOT make this look posed — spontaneous and genuine",
    "Do NOT use blue/teal background — WHITE WALL ONLY"
  ]
}
```

---

## 📋 ملخص التغييرات من V1 → V2

| العنصر | V1 (القديم) | V2 (الجديد) |
|--------|------------|------------|
| **الخلفية** | ❌ تيركواز مائية + bokeh | ✅ جدار أبيض/كريمي مطفي |
| **الوضعية** | ❓ وقفة/جلسة غير محددة | ✅ جالسة على كرسي خشبي بسيط |
| **الإضاءة** | ❌ ذهبية درامية (تبدو AI) | ✅ ضوء نهار طبيعي من نافذة يسرى |
| **تعارض الألوان** | ❌ تيركواز على تيركواز | ✅ تيركواز على أبيض (contrast ممتاز) |
| **الإحساس** | ❌ "استوديو AI" | ✅ "TikTok creator حقيقية من البيت" |
| **الشخصية** | ✅ ممتازة | ✅ نفسها بدون تغيير |
| **التعابير** | ✅ جيدة | ✅ نفسها بدون تغيير |
| **تعليمات اليد** | ✅ دقيقة | ✅ نفسها بدون تغيير |

---

## ⚡ نصيحة مهمة عند التوليد

> [!IMPORTANT]
> **لو الخلفية طلعت رمادية أو بيضاء ناصعة جداً:**
> أضف هذا في البروموت: `"warm cream-white wall, NOT cold white, NOT gray, warm slightly yellow-white like a painted room wall in daylight"`

> [!TIP]
> **لو الكرسي ما ظهر بوضوح:**
> أضف: `"wooden chair backrest slightly visible over her shoulders on both sides"`

> [!WARNING]
> **الأهم: ثبات الخلفية عبر الـ 6 فريمات**
> كل فريم يجب أن يحتوي على نفس وصف الخلفية بالضبط — نسخ ولصق BASE BLOCK بدون تغيير

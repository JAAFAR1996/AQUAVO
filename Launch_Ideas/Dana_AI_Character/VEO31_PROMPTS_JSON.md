# 🎬 Veo 3.1 — بروموتات JSON كاملة للكليبات الـ 5

> **المصادر:** Google Cloud Blog + Leonardo.ai Docs + Replicate Blog + solvingtools.github.io
> **المنهج:** first_frame + last_frame + prompt JSON لكل كليب
> **⚠️ مهم:** المدة المدعومة مع Start+End Frame = 5 أو 8 ثوانٍ فقط

---

## 🔇 قاعدة الصمت العامة (تنطبق على كل الكليبات الـ 5)

```json
"global_rule": {
  "audio": "Quiet indoor ambient room tone only — NO dialogue, NO speech, NO voice, NO music. Audio will be replaced in post-production.",
  "lips": "LIPS ARE COMPLETELY FROZEN AND SEALED SHUT — zero lip movement in the entire video. No talking animation, no lip sync, no mouth opening, no speaking motion whatsoever. Lips pressed gently together and completely still like a photograph.",
  "reason": "This is a text-caption social media video — the character communicates through facial expressions and body language ONLY, never through mouth movement."
}
```

---

## 👤 تعريف الشخصية (ثابت لكل الكليبات)

```json
"character": {
  "id": "lajeen",
  "description": "Young Iraqi Arab woman, 23 years old. Warm honey-wheat skin tone, Mesopotamian facial features. Long straight dark black hair with natural shine, center part, falling past shoulders. Zero makeup — natural bare skin with visible pores. Wearing turquoise polo shirt color #2AAFAB with small AQUAVO embroidered logo on left chest. Sitting on a simple light natural oak wooden chair. Off-white cream wall background (#F8F4EE). Soft natural window daylight from camera-left."
}
```

---

## 🎬 كليب 1 — الهوك (5 ثوانٍ)
**فريم 1 (ابتسامة خفية هادئة) ← START | فريم 2 (ابتسامة أعرض دافئة) ← END**

```json
{
  "version": "veo-3.1",

  "input": {
    "first_frame": "UPLOAD_FRAME_1_IMAGE",
    "last_frame": "UPLOAD_FRAME_2_IMAGE"
  },

  "output": {
    "duration": "5s",
    "resolution": "1080p",
    "aspect_ratio": "9:16"
  },

  "character": {
    "id": "lajeen",
    "description": "Young Iraqi Arab woman, 23 years old. Warm honey-wheat skin. Long straight dark black hair. Zero makeup. Turquoise AQUAVO polo shirt. Sitting on simple oak wooden chair. Off-white cream wall background. Soft natural window daylight from camera-left.",
    "consistency": "Maintain exact same face, hair color, skin tone, clothing, chair, and background across all frames. No identity drift."
  },

  "scene": {
    "id": "clip_01_hook",
    "description": "Lajeen sitting calmly, transitions from a subtle mysterious expression to a warmer genuine closed-lip smile",

    "shot": {
      "type": "Medium close-up",
      "framing": "Chest and above, head centered",
      "camera_movement": "Completely static — no pan, no tilt, no zoom, no handheld shake",
      "lens": "Portrait lens feel — slight background blur, face tack-sharp",
      "angle": "Eye level — camera exactly at subject eye height"
    },

    "action": {
      "primary": "Her expression gradually warms from subtle calm to genuine closed-lip smile",
      "secondary": "One natural slow blink occurs at the midpoint",
      "micro": "Subtle natural breathing movement visible in shoulders",
      "lips": "COMPLETELY FROZEN AND SEALED SHUT — lips do not move even 1 millimeter. No talking, no lip sync, no mouth animation, no opening of any kind. Lips remain pressed gently together like a still photograph for the entire duration.",
      "head": "Stays nearly still — maximum 3-degree natural sway only",
      "hands": "Resting in lap, not visible in frame"
    },

    "lighting": {
      "type": "Soft natural window daylight",
      "direction": "From camera-left, 45 degrees",
      "quality": "Diffused and gentle — no harsh shadows",
      "temperature": "Warm clean 5200K",
      "consistency": "Lighting stays identical from first to last frame — no flicker, no color shift"
    },

    "environment": {
      "background": "Plain off-white cream matte wall — stationary, no movement",
      "chair": "Simple natural oak wooden chair — stationary",
      "objects": "None"
    },

    "audio": {
      "type": "quiet indoor ambient room tone — very subtle natural room sound only",
      "dialogue": "NO dialogue, NO speech, NO talking, NO voice",
      "music": "NO music",
      "sfx": "NO sound effects — only natural room ambience"
    },

    "quality": {
      "resolution": "4K ultra sharp",
      "skin": "Natural realistic skin texture with visible pores — NOT plastic or over-smoothed",
      "motion": "Smooth and natural — no jitter, no stutter, no ghosting",
      "stability": "Maximum frame stability — no temporal noise"
    }
  },

  "constraints": [
    "LIPS DO NOT MOVE AT ALL — completely frozen shut for the entire clip, zero lip animation",
    "This is a SILENT video — no speech, no talking, no lip sync of any kind",
    "Face identity must remain 100% consistent from first to last frame",
    "Camera is completely fixed — no movement of any kind",
    "Background wall is static — no motion blur on background",
    "Natural realistic appearance — NOT cinematic drama, NOT AI-looking"
  ]
}
```

---

## 🎬 كليب 2 — الحماس (6 ثوانٍ)
**آخر لقطة كليب 1 ← START | فريم 3 (يد مفتوحة شرح) ← END**

```json
{
  "version": "veo-3.1",

  "input": {
    "first_frame": "SCREENSHOT_LAST_FRAME_CLIP1",
    "last_frame": "UPLOAD_FRAME_3_IMAGE"
  },

  "output": {
    "duration": "5s",
    "resolution": "1080p",
    "aspect_ratio": "9:16"
  },

  "character": {
    "id": "lajeen",
    "description": "Same young Iraqi Arab woman from start frame. Warm honey-wheat skin. Long straight dark black hair. Zero makeup. Turquoise AQUAVO polo shirt. Sitting on simple oak wooden chair. Off-white cream wall background.",
    "consistency": "Maintain exact same face, hair color, skin tone, clothing, chair, and background. No identity drift."
  },

  "scene": {
    "id": "clip_02_excited",
    "description": "Lajeen transitions from warm smile to calm professional expression while her right hand rises into an open-palm explaining gesture",

    "shot": {
      "type": "Medium shot — slightly wider than clip 1 to include hand gesture",
      "framing": "Chest and above including right hand, head centered",
      "camera_movement": "Completely static — no movement",
      "lens": "Portrait lens feel — slight background blur",
      "angle": "Eye level"
    },

    "action": {
      "primary": "Her right hand slowly rises from her lap to chest level in a natural open-palm upward gesture",
      "secondary": "Her smile narrows slightly from warm excited to calm professional confidence",
      "posture": "She sits slightly more upright as the gesture develops",
      "lips": "COMPLETELY FROZEN AND SEALED SHUT — lips do not move even 1 millimeter. No talking, no lip sync, no mouth animation, no opening of any kind. Lips remain pressed gently together like a still photograph for the entire duration.",
      "head": "Very slight natural tilt — barely perceptible",
      "hand_detail": "Right palm faces upward, fingers naturally spread and relaxed, wrist at natural angle — NOT stiff or robotic"
    },

    "lighting": {
      "type": "Soft natural window daylight",
      "direction": "From camera-left, 45 degrees",
      "quality": "Diffused and gentle",
      "temperature": "Warm clean 5200K",
      "hand_lighting": "Natural window light catches the raised palm from the left — visible skin texture on hand",
      "consistency": "Identical lighting from first to last frame"
    },

    "environment": {
      "background": "Same plain off-white cream matte wall — stationary",
      "chair": "Same simple natural oak wooden chair — stationary",
      "objects": "None"
    },

    "audio": {
      "type": "quiet indoor ambient room tone — very subtle natural room sound only",
      "dialogue": "NO dialogue, NO speech, NO talking, NO voice",
      "music": "NO music",
      "sfx": "NO sound effects — only natural room ambience"
    },

    "quality": {
      "resolution": "4K ultra sharp",
      "hand": "Natural hand with exactly 5 fingers — realistic skin texture, knuckle creases visible",
      "motion": "Smooth and natural — hand movement fluid, not robotic",
      "stability": "Maximum frame stability"
    }
  },

  "constraints": [
    "LIPS DO NOT MOVE AT ALL — completely frozen shut for the entire clip, zero lip animation",
    "This is a SILENT video — no speech, no talking, no lip sync of any kind",
    "Face identity must remain 100% consistent throughout",
    "Camera is completely fixed — no movement",
    "Exactly 5 fingers on right hand — no extra or missing fingers",
    "Hand movement is smooth and organic — NOT mechanical or stiff"
  ]
}
```

---

## 🎬 كليب 3 — الشرح + يد على القلب (8 ثوانٍ)
**آخر لقطة كليب 2 ← START | فريم 4 (يد على القلب) ← END**

```json
{
  "version": "veo-3.1",

  "input": {
    "first_frame": "SCREENSHOT_LAST_FRAME_CLIP2",
    "last_frame": "UPLOAD_FRAME_4_IMAGE"
  },

  "output": {
    "duration": "8s",
    "resolution": "1080p",
    "aspect_ratio": "9:16"
  },

  "character": {
    "id": "lajeen",
    "description": "Same young Iraqi Arab woman from start frame. Warm honey-wheat skin. Long straight dark black hair. Zero makeup. Turquoise AQUAVO polo shirt. Sitting on simple oak wooden chair. Off-white cream wall background.",
    "consistency": "Maintain exact same face, hair color, skin tone, clothing throughout. No identity drift."
  },

  "scene": {
    "id": "clip_03_heart",
    "description": "Lajeen transitions from open-palm explaining gesture to placing her hand gently on her heart with a sincere emotional expression",

    "shot": {
      "type": "Medium close-up — waist and above",
      "framing": "Chest and above, includes hand movement arc",
      "camera_movement": "Completely static — no movement",
      "lens": "Portrait lens feel",
      "angle": "Eye level"
    },

    "action": {
      "primary": "Her right hand slowly lowers from open-palm position and gently comes to rest flat on her left chest over her heart",
      "secondary": "Her expression softens from professional confident to deeply warm and sincere",
      "emotion_arc": "Confident → Warm → Sincere emotional peak at the end",
      "eyes": "Gradually soften — slight increase in natural eye moisture by the end (glistening but NOT crying)",
      "smile": "Narrows from professional to small intimate genuine smile",
      "head": "Very subtle downward nod — chin drops just a fraction near the end",
      "lips": "COMPLETELY FROZEN AND SEALED SHUT — lips do not move even 1 millimeter. No talking, no lip sync, no mouth animation, no opening of any kind. Lips remain pressed gently together like a still photograph for the entire duration.",
      "hand_final": "Palm flat gently on left chest, fingers naturally spread on fabric — light touch NOT pressing hard"
    },

    "lighting": {
      "type": "Soft natural window daylight",
      "direction": "From camera-left, 45 degrees",
      "quality": "Slightly softer and warmer than previous clips — more intimate mood",
      "temperature": "5000K — slightly warmer than clips 1-2",
      "fill": "Increased fill light — softer shadows, more gentle and even",
      "consistency": "Smooth gradual warming of light from start to end of clip"
    },

    "environment": {
      "background": "Same plain off-white cream matte wall — stationary",
      "chair": "Same simple natural oak wooden chair — stationary",
      "objects": "None"
    },

    "audio": {
      "type": "quiet indoor ambient room tone — very subtle natural room sound only",
      "dialogue": "NO dialogue, NO speech, NO talking, NO voice",
      "music": "NO music",
      "sfx": "NO sound effects — only natural room ambience"
    },

    "quality": {
      "resolution": "4K ultra sharp",
      "hand": "Natural hand on chest — exactly 5 fingers, fabric indent visible under palm",
      "motion": "Slow deliberate hand movement — smooth and natural, emotional weight",
      "stability": "Maximum frame stability — no temporal noise"
    }
  },

  "constraints": [
    "LIPS DO NOT MOVE AT ALL — completely frozen shut for the entire clip, zero lip animation",
    "This is a SILENT video — no speech, no talking, no lip sync of any kind",
    "Face identity must remain 100% consistent — most critical clip for face stability",
    "Camera is completely fixed — no movement",
    "Exactly 5 fingers on right hand",
    "Hand touch is GENTLE — light pressure on fabric, not pressing hard",
    "Eyes glisten with emotion but absolutely NO tears",
    "Smile is SMALL and intimate — not wide"
  ]
}
```

---

## 🎬 كليب 4 — اللحظة الشخصية (8 ثوانٍ)
**آخر لقطة كليب 3 ← START | فريم 5 (جلوس واثق يدين في الحضن) ← END**

```json
{
  "version": "veo-3.1",

  "input": {
    "first_frame": "SCREENSHOT_LAST_FRAME_CLIP3",
    "last_frame": "UPLOAD_FRAME_5_IMAGE"
  },

  "output": {
    "duration": "8s",
    "resolution": "1080p",
    "aspect_ratio": "9:16"
  },

  "character": {
    "id": "lajeen",
    "description": "Same young Iraqi Arab woman from start frame. Warm honey-wheat skin. Long straight dark black hair. Zero makeup. Turquoise AQUAVO polo shirt with AQUAVO logo fully visible. Sitting on simple oak wooden chair. Off-white cream wall background.",
    "consistency": "Maintain exact same face, hair color, skin tone, clothing throughout. No identity drift."
  },

  "scene": {
    "id": "clip_04_personal",
    "description": "Lajeen transitions from sincere hand-on-heart moment to confident personal self-introduction posture",

    "shot": {
      "type": "Medium close-up",
      "framing": "Chest and above, head centered",
      "camera_movement": "Completely static — no movement",
      "lens": "Portrait lens feel",
      "angle": "Eye level"
    },

    "action": {
      "primary": "Her right hand slowly lifts from her chest and lowers back down to rest in her lap — out of frame",
      "secondary": "Her chin lifts slightly upward — posture becomes more confident and open",
      "tertiary": "Her shoulders open up — less rounded, more upright and welcoming",
      "smile": "Grows from small intimate to medium warm confident smile",
      "eyes": "Become clearer and more determined — the glistening of emotion fades to confident clarity",
      "lips": "COMPLETELY FROZEN AND SEALED SHUT — lips do not move even 1 millimeter. No talking, no lip sync, no mouth animation, no opening of any kind. Lips remain pressed gently together like a still photograph for the entire duration.",
      "logo": "AQUAVO logo becomes fully visible on left chest as hand moves away"
    },

    "lighting": {
      "type": "Soft natural window daylight",
      "direction": "From camera-left, 45 degrees",
      "quality": "Warm and intimate but slightly brighter than clip 3",
      "temperature": "5200K — warm but cleaner than clip 3",
      "consistency": "Stable lighting throughout"
    },

    "environment": {
      "background": "Same plain off-white cream matte wall — stationary",
      "chair": "Same simple natural oak wooden chair — stationary",
      "objects": "None"
    },

    "audio": {
      "type": "quiet indoor ambient room tone — very subtle natural room sound only",
      "dialogue": "NO dialogue, NO speech, NO talking, NO voice",
      "music": "NO music",
      "sfx": "NO sound effects — only natural room ambience"
    },

    "quality": {
      "resolution": "4K ultra sharp",
      "motion": "Smooth organic movement — posture shift feels natural not mechanical",
      "stability": "Maximum frame stability"
    }
  },

  "constraints": [
    "LIPS DO NOT MOVE AT ALL — completely frozen shut for the entire clip, zero lip animation",
    "This is a SILENT video — no speech, no talking, no lip sync of any kind",
    "Face identity must remain 100% consistent throughout",
    "Camera is completely fixed — no movement",
    "Posture change is gradual and natural — NOT sudden or jerky",
    "AQUAVO logo must be visible at end of clip"
  ]
}
```

---

## 🎬 كليب 5 — التوديع + الموجة (5 ثوانٍ)
**آخر لقطة كليب 4 ← START | فريم 6 (موجة + ابتسامة كبيرة) ← END**

```json
{
  "version": "veo-3.1",

  "input": {
    "first_frame": "SCREENSHOT_LAST_FRAME_CLIP4",
    "last_frame": "UPLOAD_FRAME_6_IMAGE"
  },

  "output": {
    "duration": "5s",
    "resolution": "1080p",
    "aspect_ratio": "9:16"
  },

  "character": {
    "id": "lajeen",
    "description": "Same young Iraqi Arab woman from start frame. Warm honey-wheat skin. Long straight dark black hair. Zero makeup. Turquoise AQUAVO polo shirt. Sitting on simple oak wooden chair. Off-white cream wall background.",
    "consistency": "Maintain exact same face, hair color, skin tone, clothing throughout. No identity drift."
  },

  "scene": {
    "id": "clip_05_farewell",
    "description": "Lajeen bursts into the biggest most genuine joyful smile while her right hand rises in a casual friendly wave",

    "shot": {
      "type": "Medium shot — slightly wider to include waving hand fully",
      "framing": "Waist and above, waving hand must be fully visible — NOT cropped",
      "camera_movement": "Completely static — no movement",
      "lens": "Portrait lens feel",
      "angle": "Eye level"
    },

    "action": {
      "primary": "Her right hand lifts from lap to shoulder level in a casual friendly wave — open palm facing camera",
      "secondary": "Her expression simultaneously bursts into the biggest genuine joyful smile of the entire video",
      "smile_detail": "Real Duchenne smile — eyes crinkle and squint naturally, crow's feet lines appear, cheeks push up high",
      "eyes": "Partially squinting from the big genuine smile — natural happy crinkle",
      "lips": "The ONLY allowed lip state: slightly parted from the big natural smile — a glimpse of top teeth from the joy of smiling, NOT from talking. Lips are static in this slightly parted smile position — NO talking motion, NO lip sync, NO speaking movement. The slight parting is purely from the smile muscle pull, completely frozen in place.",
      "wave_style": "Casual friendly mid-wave — like waving to a close friend, NOT stiff military wave",
      "hand_detail": "Palm facing camera, 5 fingers naturally spread, wrist has slight natural bend, wave is fluid not frozen",
      "energy": "Posture opens with positive energy — slight upward body lift from joy",
      "hair": "One or two strands shift slightly from the arm movement — subtle natural motion"
    },

    "lighting": {
      "type": "Soft natural window daylight",
      "direction": "From camera-left, 45 degrees",
      "quality": "SLIGHTLY BRIGHTER than all previous clips — most open positive lighting",
      "fill": "Increased fill light — less shadow, more even and joyful",
      "temperature": "5200K warm clean",
      "mood": "Bright upbeat energetic — the most positive lighting of all 5 clips"
    },

    "environment": {
      "background": "Same plain off-white cream matte wall — stationary",
      "chair": "Same simple natural oak wooden chair — stationary",
      "objects": "None"
    },

    "audio": {
      "type": "quiet indoor ambient room tone — very subtle natural room sound only",
      "dialogue": "NO dialogue, NO speech, NO talking, NO voice",
      "music": "NO music",
      "sfx": "NO sound effects — only natural room ambience"
    },

    "quality": {
      "resolution": "4K ultra sharp",
      "hand": "Natural waving hand — exactly 5 fingers, palm lines visible, clean natural nails",
      "motion": "Smooth fluid wave motion — natural and organic, NOT mechanical",
      "stability": "Maximum frame stability — no temporal noise"
    }
  },

  "constraints": [
    "LIPS DO NOT TALK — zero talking motion, zero lip sync, zero speaking animation",
    "This is a SILENT video — any lip movement must come ONLY from smiling muscles, never from speech",
    "Face identity must remain 100% consistent throughout",
    "Camera is completely fixed — no movement",
    "Exactly 5 fingers on right hand — no extra fingers",
    "Waving hand must be FULLY visible — not cropped at edge of frame",
    "Wave is casual and friendly — NOT stiff or formal",
    "Smile is genuine Duchenne — NOT a fake posed grin"
  ]
}
```

---

## 📋 جدول التنفيذ

| الكليب | first_frame | last_frame | المدة |
|--------|-------------|------------|-------|
| **كليب 1** | فريم 1 (صورة مباشرة) | فريم 2 (صورة مباشرة) | 5 ث |
| **كليب 2** | Screenshot آخر لقطة كليب 1 | فريم 3 (صورة مباشرة) | 5 ث |
| **كليب 3** | Screenshot آخر لقطة كليب 2 | فريم 4 (صورة مباشرة) | 8 ث |
| **كليب 4** | Screenshot آخر لقطة كليب 3 | فريم 5 (صورة مباشرة) | 8 ث |
| **كليب 5** | Screenshot آخر لقطة كليب 4 | فريم 6 (صورة مباشرة) | 5 ث |

---

## ⚠️ قواعد Veo 3.1 المؤكدة من البحث

```
✅ مدة Start+End Frame = 5 أو 8 ثوانٍ فقط (مؤكد من Leonardo.ai)
✅ aspect_ratio 9:16 لـ Reels/TikTok
✅ JSON format هو الأفضل للتحكم الدقيق
✅ حركة واحدة رئيسية لكل كليب (one action per scene)
✅ وصف الحركة فقط — لا تعيد وصف الشخصية من جديد
✅ character consistency block في كل كليب — ضروري
✅ لا Negative Prompts — استخدم Constraints فقط
```

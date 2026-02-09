# 🎬 V7 PRODUCTION MASTER GUIDE
## خرافة ذاكرة السمكة 3 ثواني
### 🎯 Nano Banana Pro + VEO 3.1 (Frames-to-Video)

---

## 🐟 Character Reference - MASTER DESCRIPTION

> **استخدم هذا الوصف الموحد في كل Prompt للحفاظ على الـ Consistency:**

```
3D Pixar-style cartoon orange Goldfish with large expressive googly eyes 
with white sclera and black pupils, small open mouth, smooth rounded body, 
translucent orange fins. Inside round glass fishbowl with slightly green-tinted 
water, small bubbles. Fishbowl sits on warm wooden surface. 
Warm golden sunlight from right side, teal bokeh background. 
Cinematic shallow depth of field. 9:16 vertical format.
```

---

## 🎞️ Frames-to-Video Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIP 1                                                              │
│  [START FRAME 1] ──────────VEO 3.1──────────▶ [END FRAME 1]         │
│                                                        ║             │
│                                                        ║ (SAME)      │
│                                                        ▼             │
│  CLIP 2                                                              │
│  [START FRAME 2] ──────────VEO 3.1──────────▶ [END FRAME 2]         │
│       ▲                                                ║             │
│       ║ (= END FRAME 1)                                ║ (SAME)      │
│                                                        ▼             │
│  CLIP 3                                                              │
│  [START FRAME 3] ──────────VEO 3.1──────────▶ [END FRAME 3]         │
│       ▲                                                ║             │
│       ║ (= END FRAME 2)                                ║ (SAME)      │
│                                                        ▼             │
│  ... وهكذا                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 📸 CLIP 1: THE HOOK (0-3 ثواني)
> **الرسالة:** "لحظة... شنو قلت؟!"

## 🖼️ START FRAME 1 - Nano Banana Pro Prompt:

```
3D Pixar-style cartoon orange Goldfish swimming calmly in center of frame, 
relaxed neutral expression, half-closed eyes, gentle smile. 
Large expressive eyes with white sclera and black pupils. 
Smooth rounded body, translucent orange fins flowing gently.
Inside round glass fishbowl with slightly green-tinted water, tiny bubbles.
Fishbowl on warm wooden surface.
Warm golden sunlight from right side, teal bokeh background.
Soft cinematic lighting, shallow depth of field.
Peaceful calm mood. 9:16 vertical format.
```

## 🖼️ END FRAME 1 - Nano Banana Pro Prompt:

```
3D Pixar-style cartoon orange Goldfish with SHOCKED surprised expression,
eyes WIDE OPEN and enlarged, raised eyebrows, mouth open in shock (O shape),
body slightly tilted backward in surprise, fins spread out.
Large expressive googly eyes with white sclera and black pupils.
Inside round glass fishbowl with slightly green-tinted water, bubbles rising.
Fishbowl on warm wooden surface.
Warm golden sunlight from right side, teal bokeh background.
Dramatic surprised lighting, shallow depth of field.
Shocked reaction mood. 9:16 vertical format.
```

## 🎬 VEO 3.1 Motion Description:

```
The calm goldfish suddenly reacts with shock. Eyes widen dramatically, 
eyebrows raise high, mouth drops open in surprise. Body jerks backward slightly.
Fins spread outward. Subtle water ripples from sudden movement.
Quick reaction timing - calm to shocked in 3 seconds.
```

---

# 📸 CLIP 2: THE MYTH "3 ثواني ❌" (3-8 ثواني)
> **الرسالة:** "يقولون السمكة تتذكر 3 ثواني فقط... خطأ!"

## 🖼️ START FRAME 2 - (= END FRAME 1)

```
[USE END FRAME 1 IMAGE - الصورة نفسها]
3D Pixar-style cartoon orange Goldfish with SHOCKED surprised expression,
eyes WIDE OPEN and enlarged, raised eyebrows, mouth open in shock...
```

## 🖼️ END FRAME 2 - Nano Banana Pro Prompt:

```
3D Pixar-style cartoon orange Goldfish with SKEPTICAL disapproving expression,
one eyebrow raised higher than other, slight frown, unimpressed look,
head tilted to side questioningly. 
Floating red digital stopwatch showing "00:03" with big RED X mark overlaid.
Red question mark icon floating above fish head.
Large expressive eyes with white sclera and black pupils looking at stopwatch.
Inside round glass fishbowl with slightly green-tinted water.
Fishbowl on warm wooden surface.
Warm light from right, teal bokeh background.
Skeptical "that's wrong" mood. 9:16 vertical format.
```

## 🎬 VEO 3.1 Motion Description:

```
Shocked fish transitions to skeptical. Stopwatch appears floating, 
counting 3-2-1. Big red X animates over stopwatch with shake effect.
Fish shakes head "no" slowly side to side, raises one eyebrow skeptically.
Question mark pops up above head. Debunking mood.
```

---

# 📸 CLIP 3: THE TRUTH "5 أشهر ✅" (8-13 ثواني)
> **الرسالة:** "الحقيقة: السمكة تتذكر لأشهر!"

## 🖼️ START FRAME 3 - (= END FRAME 2)

```
[USE END FRAME 2 IMAGE - الصورة نفسها]
3D Pixar-style cartoon orange Goldfish with SKEPTICAL disapproving expression,
one eyebrow raised higher than other...
```

## 🖼️ END FRAME 3 - Nano Banana Pro Prompt:

```
3D Pixar-style cartoon orange Goldfish with PROUD triumphant expression,
big confident smile, eyes sparkling with pride, chest puffed up,
wearing tiny black graduation cap on head at slight angle.
Floating calendar showing "5 MONTHS" with big GREEN checkmark.
Glowing yellow lightbulb icon and pink brain icon floating nearby.
Large expressive proud eyes with white sclera and black pupils.
Inside round glass fishbowl with slightly green-tinted water.
Fishbowl on warm wooden surface.
Bright warm celebratory lighting, teal bokeh background.
Triumphant victorious mood. 9:16 vertical format.
```

## 🎬 VEO 3.1 Motion Description:

```
Skeptical fish transforms to proud. Calendar pages flip dramatically 1-2-3-4-5.
Green checkmark animates in with sparkle burst effect.
Graduation cap pops onto fish head. Fish puffs up proudly, big smile grows.
Lightbulb glows brighter. Triumphant victory moment.
```

---

# 📸 CLIP 4: RECOGNITION (13-17 ثواني)
> **الرسالة:** "سمكتك تتعرف عليك!"

## 🖼️ START FRAME 4 - (= END FRAME 3)

```
[USE END FRAME 3 IMAGE - الصورة نفسها]
3D Pixar-style cartoon orange Goldfish with PROUD triumphant expression,
big confident smile, wearing tiny graduation cap...
```

## 🖼️ END FRAME 4 - Nano Banana Pro Prompt:

```
3D Pixar-style cartoon orange Goldfish with EXCITED joyful expression,
huge happy smile, eyes wide with joy and love, heart-shaped pupils,
swimming eagerly toward RIGHT side of frame toward human hand silhouette.
Floating pink heart shapes surrounding the fish.
Tail mid-wag like excited puppy. Fins spread in excitement.
Large expressive loving eyes with heart reflections.
Inside round glass fishbowl with slightly green-tinted water.
Human hand reaching toward fishbowl from right side, warm glow around hand.
Warm golden emotional lighting, teal bokeh background.
Emotional heartwarming reunion mood. 9:16 vertical format.
```

## 🎬 VEO 3.1 Motion Description:

```
Proud fish notices something, expression shifts to excited recognition.
Graduation cap falls off as fish rushes toward approaching hand silhouette.
Fish swims in excited circles, tail wags rapidly, hearts pop up around fish.
Emotional music moment - pet recognizing owner. Heartwarming climax.
```

---

# 📸 CLIP 5: CTA - AQUAVO (17-20 ثواني)
> **الرسالة:** "سمكتك تتذكرك... وتستاهل الأفضل"

## 🖼️ START FRAME 5 - (= END FRAME 4)

```
[USE END FRAME 4 IMAGE - الصورة نفسها]
3D Pixar-style cartoon orange Goldfish with EXCITED joyful expression,
swimming toward human hand...
```

## 🖼️ END FRAME 5 - Nano Banana Pro Prompt:

```
3D Pixar-style cartoon orange Goldfish with CONTENT peaceful expression,
gentle loving smile, soft half-closed eyes, relaxed happy pose,
looking directly at camera with one eye winking playfully.
Small pink heart and glowing brain icon floating beside fish.
Inside beautiful PLANTED AQUARIUM (not bowl) with green aquatic plants,
clean clear water, small bubbles, natural gravel bottom.
Plenty of space at TOP for text overlay / logo.
AQUAVO brand teal (#0D9488) color tones throughout.
Warm cozy content lighting, soft bokeh background.
Peaceful satisfied ending mood. 9:16 vertical format.
```

## 🎬 VEO 3.1 Motion Description:

```
Excited fish calms down, settles into planted aquarium (upgrade from bowl).
Fish turns to camera, gives knowing wink with one eye.
Gentle smile, content peaceful expression. Heart and brain icons glow softly.
Sparkles animate around fish. Space for logo/text to fade in.
Hopeful uplifting resolution. Call to action moment.
```

---

# 📋 MASTER FRAME REFERENCE TABLE

| Clip | Start Frame | End Frame | Duration | Key Action |
|------|------------|-----------|----------|------------|
| **1** | Calm fish | Shocked fish | 3s | Hook - Surprise reaction |
| **2** | Shocked fish *(from 1)* | Skeptical + Stopwatch ❌ | 5s | Myth debunk |
| **3** | Skeptical *(from 2)* | Proud + Calendar ✅ | 5s | Truth reveal |
| **4** | Proud *(from 3)* | Excited + Hearts | 4s | Recognition |
| **5** | Excited *(from 4)* | Winking + Aquarium | 3s | CTA |

---

# 🎨 CONSISTENCY CHECKLIST

| Element | Constant Value |
|---------|---------------|
| **Fish Style** | 3D Pixar-style, smooth, cartoon |
| **Fish Color** | Orange with translucent fins |
| **Eyes** | Large, white sclera, black pupils, googly style |
| **Container** | Round glass fishbowl (clips 1-4), Planted aquarium (clip 5) |
| **Water** | Slightly green-tinted, small bubbles |
| **Surface** | Warm wooden table |
| **Lighting** | Warm golden from right, teal bokeh background |
| **Format** | 9:16 vertical |
| **DOF** | Shallow depth of field, cinematic |

---

# 🚀 STEP-BY-STEP EXECUTION

## Phase 1: Generate All Frames (Nano Banana Pro)

```
Step 1: Generate START FRAME 1 (Calm fish)
Step 2: Generate END FRAME 1 (Shocked fish) ← SAVE AS START FRAME 2
Step 3: Generate END FRAME 2 (Skeptical + stopwatch) ← SAVE AS START FRAME 3
Step 4: Generate END FRAME 3 (Proud + graduation cap) ← SAVE AS START FRAME 4
Step 5: Generate END FRAME 4 (Excited + hearts) ← SAVE AS START FRAME 5
Step 6: Generate END FRAME 5 (Winking + aquarium)
```

**Total Images: 6 unique frames**

## Phase 2: Generate Videos (VEO 3.1 Frames-to-Video)

```
Step 1: Upload START FRAME 1 + END FRAME 1 → Generate CLIP 1
Step 2: Upload START FRAME 2 + END FRAME 2 → Generate CLIP 2
Step 3: Upload START FRAME 3 + END FRAME 3 → Generate CLIP 3
Step 4: Upload START FRAME 4 + END FRAME 4 → Generate CLIP 4
Step 5: Upload START FRAME 5 + END FRAME 5 → Generate CLIP 5
```

**Total Videos: 5 clips**

## Phase 3: Assembly (CapCut/Premiere)

```
1. Import all 5 clips
2. Arrange in sequence: Clip 1 → 2 → 3 → 4 → 5
3. Add voiceover (Arabic)
4. Add music/SFX
5. Add text overlays
6. Add AQUAVO logo at end
7. Export 9:16 for Reels/TikTok
```

---

# 🎵 AUDIO LAYER GUIDE

| Clip | Voiceover Text | SFX |
|------|----------------|-----|
| 1 | "لحظة..." | *Whoosh* - attention grab |
| 2 | "يقولون السمكة تتذكر 3 ثواني فقط" | *Buzz* - wrong answer |
| 3 | "الحقيقة... تتذكر لأشهر!" | *Ding ding* - correct |
| 4 | "وتتعرف على صاحبها!" | *Heartbeat* - emotional |
| 5 | "سمكتك تتذكرك... الرابط بالبايو" | *Uplifting resolution* |

---

*تم إنشاؤه: 24 يناير 2026*
*المشروع: AQUAVO V7 - خرافة ذاكرة السمكة*
*الأدوات: Nano Banana Pro + VEO 3.1*

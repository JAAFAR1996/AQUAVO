# 🎬 V7 - دليل البرومبتات الاحترافي
## خرافة ذاكرة السمكة 3 ثواني
### 📅 25 يناير 2026

---

## 📚 مبني على أبحاث:
- Google Veo 3.1 Motion Description Best Practices
- Kling AI First & Last Frame Technique
- Midjourney V6/V7 Character Consistency Methods

---

# 🧠 القواعد الذهبية للبرومبتات

## 1️⃣ هيكل البرومبت المثالي للصور:
```
[Shot Type] + [Subject Description] + [Expression/Action] + 
[Environment] + [Lighting] + [Camera/Composition] + 
[Style Keywords] + [Technical Specs]
```

## 2️⃣ هيكل البرومبت المثالي للفيديو (VEO):
```
[Camera Movement] + [Subject Action] + [Subtle Details] + 
[Timing] + [Mood/Atmosphere]
```

## 3️⃣ قواعد الاتساق (Consistency):
- ✅ استخدم **نفس الوصف الأساسي** في كل frame
- ✅ حافظ على **نفس الإضاءة** (Warm golden from right)
- ✅ حافظ على **نفس الكاميرا** (Slow dolly in)
- ✅ استخدم **--cref** في Midjourney للـ character reference

---

# 🐟 CHARACTER REFERENCE (للنسخ في كل Prompt)

```
CORE CHARACTER:
3D Pixar-style cartoon orange Goldfish character.
- Body: Smooth rounded orange body, translucent flowing fins
- Eyes: Large expressive googly eyes, white sclera, black pupils
- Mouth: Small expressive mouth
- Style: Clean geometric forms, soft subsurface scattering

ENVIRONMENT:
- Container: Round glass fishbowl with green-tinted water
- Surface: Warm wooden table/surface
- Background: Teal bokeh, out of focus

LIGHTING:
- Warm golden sunlight from RIGHT side
- Soft three-point lighting setup
- Subtle caustics in water

TECHNICAL:
- 9:16 vertical aspect ratio
- Cinematic shallow depth of field
- Film still quality, ultra-detailed
```

---

# 📸 CLIP 1: THE HOOK (0-3 ثواني)
> **المشهد:** سمكة هادئة تنصدم عند رؤية الساعة

---

## 🖼️ START FRAME 1 - Nano Banana / Midjourney Prompt:

```
Extreme close-up film still, 3D Pixar-style cartoon orange Goldfish 
swimming calmly in center of round glass fishbowl.

CHARACTER STATE:
- Expression: Relaxed, peaceful, content
- Eyes: Half-closed, gentle, soft gaze forward
- Mouth: Small gentle smile, closed
- Body: Floating still, fins flowing gently with water current
- Pose: Centered, balanced, serene

FLOATING ELEMENT:
- Vintage brass stopwatch floating in water beside fish
- Stopwatch display: "00:03" in red digits
- Stopwatch intact, polished, gleaming

ENVIRONMENT:
- Green-tinted fishbowl water with tiny rising bubbles
- Warm wooden surface beneath bowl
- Teal bokeh background, soft and dreamy

LIGHTING:
- Warm golden sunlight streaming from right side at 45-degree angle
- Soft caustic light patterns dancing on bowl glass
- Gentle rim light on fish fins

COMPOSITION:
- Rule of thirds: fish slightly left, stopwatch slightly right
- Shallow depth of field, stopwatch slightly soft
- Space at top for text overlay

STYLE:
3D Pixar animation style, clean geometric forms, soft subsurface 
scattering on fish skin, exaggerated expressive features, 
vibrant saturated colors, cinematic film still quality.

TECHNICAL:
9:16 vertical format, ultra-detailed, 8K quality render.
```

**Midjourney Parameters:**
```
--ar 9:16 --stylize 200 --v 7
```

---

## 🖼️ END FRAME 1 - Nano Banana / Midjourney Prompt:

```
Extreme close-up film still, 3D Pixar-style cartoon orange Goldfish 
with SHOCKED surprised expression inside round glass fishbowl.

CHARACTER STATE:
- Expression: Complete shock, disbelief, astonishment
- Eyes: WIDE OPEN, enlarged 2x normal size, pupils dilated
- Eyebrows: Raised HIGH, curved in surprise
- Mouth: Open wide in "O" shape, jaw dropped
- Body: Jerked backward slightly, fins spread outward in reaction
- Pose: Off-balance, tilted back 15 degrees

FLOATING ELEMENT (CRITICAL):
- The stopwatch is CRACKING and SHATTERING dramatically
- Glass shards and fragments floating in slow motion
- Crack lines radiating from center of stopwatch face
- Metal pieces separating, gears visible
- The "00:03" digits distorting and breaking apart

ENVIRONMENT:
- Fishbowl water with MORE bubbles from disturbance
- Glass shards catching light, creating sparkles
- Warm wooden surface, teal bokeh background

LIGHTING:
- Same warm golden light from right
- Dramatic highlight on fish's shocked eyes
- Light catching on floating glass fragments
- Slight motion blur on edges

COMPOSITION:
- Fish now center-left, recoiling
- Shattering stopwatch center-right
- Dynamic diagonal composition suggesting movement

STYLE:
3D Pixar animation style, peak emotional moment, exaggerated 
comedic surprise expression, dramatic action freeze-frame, 
cinematic film still quality.

TECHNICAL:
9:16 vertical format, ultra-detailed, 8K quality render.
```

**Midjourney Parameters:**
```
--ar 9:16 --stylize 200 --v 7 --cref [START FRAME 1 URL] --cw 80
```

---

## 🎬 VEO 3.1 Motion Description (Clip 1):

```
CAMERA:
Slow dolly in toward the fishbowl, steady and smooth, 
cinematic 24fps, shallow depth of field maintained throughout.

SUBJECT ACTION SEQUENCE:
1. (0.0-1.0s) Fish floating calmly, fins gently swaying, 
   peaceful breathing motion, bubbles rising slowly.
2. (1.0-1.5s) Fish notices the stopwatch, head turns slightly, 
   eyes begin to focus on it.
3. (1.5-2.5s) Stopwatch begins cracking - hairline fractures appear, 
   spread rapidly across glass face.
4. (2.5-3.0s) Fish REACTS - eyes snap wide open, body jerks backward, 
   mouth drops open, fins spread out in shock.
   Stopwatch SHATTERS - glass fragments explode outward in slow motion,
   gears and metal pieces separate, floating in water.

SUBTLE DETAILS:
- Caustic light patterns shift on bowl glass
- Bubbles accelerate from fish's sudden movement
- Glass shards catch golden light as they float
- Water ripples from the disturbance

TIMING:
3 seconds total. Calm for 1 second, transition 0.5 second, 
dramatic reaction 1.5 seconds.

MOOD:
Peaceful to SHOCKED. Comedic surprise. Dramatic reveal moment.
```

---

# 📸 CLIP 2: THE TRUTH (3-8 ثواني)
> **المشهد:** القطع المتحطمة تتحول لتقويم "5 أشهر"

---

## 🖼️ START FRAME 2:
```
[استخدم END FRAME 1 - السمكة المصدومة مع الساعة المتحطمة]
```

---

## 🖼️ END FRAME 2 - Nano Banana / Midjourney Prompt:

```
Extreme close-up film still, 3D Pixar-style cartoon orange Goldfish 
with PROUD triumphant expression inside round glass fishbowl.

CHARACTER STATE:
- Expression: Pride, confidence, vindication, "I told you so"
- Eyes: Bright, sparkling with pride, slightly narrowed smugly
- Eyebrows: One raised higher (confident/smug)
- Mouth: Big proud smile, teeth showing slightly
- Body: Puffed up chest, confident posture
- Pose: Head held high, slight tilt of pride
- ACCESSORY: Tiny black graduation cap on head, tilted at jaunty angle

FLOATING ELEMENT (TRANSFORMED):
- The shattered stopwatch pieces have MAGICALLY REFORMED
- Now a CALENDAR floating in water showing "5 MONTHS" 
- Calendar has GREEN GLOWING AURA around it
- Big GREEN CHECKMARK on the calendar
- Sparkles and magic particles surrounding it

ENVIRONMENT:
- Fishbowl water now calm again, soft bubbles
- Green magical glow reflecting in water
- Warm wooden surface, teal bokeh background

LIGHTING:
- Same warm golden from right
- Additional GREEN magical glow from calendar
- Triumphant celebratory lighting
- Sparkle highlights

COMPOSITION:
- Fish center-left, proud pose
- Glowing calendar center-right
- Graduation cap as focal detail
- Victory moment composition

STYLE:
3D Pixar animation style, triumphant hero moment, 
celebration aesthetic, magical transformation complete,
cinematic film still quality.

TECHNICAL:
9:16 vertical format, ultra-detailed, 8K quality render.
```

---

## 🎬 VEO 3.1 Motion Description (Clip 2):

```
CAMERA:
Slow dolly in continues, steady and smooth, 
cinematic 24fps, shallow depth of field.

SUBJECT ACTION SEQUENCE:
1. (0.0-1.0s) Shocked fish holds expression, watching floating shards.
2. (1.0-3.0s) MAGICAL TRANSFORMATION:
   - Glass shards begin glowing green
   - Pieces swirl together in spiral motion
   - Particles coalesce and reshape
   - Stopwatch fragments reform into calendar shape
3. (3.0-4.0s) Calendar solidifies, pages FLIP dramatically:
   "1 MONTH" → "2 MONTHS" → "3 MONTHS" → "4 MONTHS" → "5 MONTHS"
   Big GREEN CHECKMARK animates in with sparkle burst
4. (4.0-5.0s) Fish expression transforms:
   - Shock melts into realization
   - Smile grows, eyes brighten
   - Graduation cap POPS onto head with magical sparkle
   - Body puffs up with pride

SUBTLE DETAILS:
- Green magical particles floating
- Sparkle effects on calendar
- Graduation cap tassel swings
- Water has slight green tint from glow

TIMING:
5 seconds total. Hold 1s, transform 2s, reveal 1s, react 1s.

MOOD:
Magical revelation. Truth unveiled. Victory moment.
```

---

# 📸 CLIP 3: THE EMOTION (8-13 ثواني)
> **المشهد:** السمكة تتعرف على صاحبها

---

## 🖼️ START FRAME 3:
```
[استخدم END FRAME 2 - السمكة الفخورة مع قبعة التخرج]
```

---

## 🖼️ END FRAME 3 - Nano Banana / Midjourney Prompt:

```
Extreme close-up film still, 3D Pixar-style cartoon orange Goldfish 
with EXCITED joyful expression inside round glass fishbowl.

CHARACTER STATE:
- Expression: Pure joy, love, recognition, excitement
- Eyes: WIDE with happiness, sparkles/stars in pupils
- Mouth: Huge happy smile, open with joy
- Body: Swimming eagerly toward RIGHT side of frame
- Fins: Spread wide, moving rapidly in excitement
- Tail: Mid-wag like excited puppy
- NOTE: Graduation cap has FALLEN OFF (floating behind)

HUMAN ELEMENT:
- Human hand silhouette reaching toward fishbowl from RIGHT
- Hand has warm GOLDEN GLOW emanating from it
- Fingers gently approaching the glass
- Emotional connection visual

EMOTIONAL ELEMENTS:
- Pink heart shapes floating around fish (3-4 hearts)
- Warm pink/gold light rays between fish and hand
- Love and recognition atmosphere

ENVIRONMENT:
- Fishbowl water with excited bubbles
- Dropped graduation cap floating behind fish
- Warm wooden surface, teal bokeh background

LIGHTING:
- Warm golden from right (emphasized)
- Pink romantic glow overlay
- Emotional warm lighting setup
- Heartwarming atmosphere

COMPOSITION:
- Fish swimming toward right edge
- Hand approaching from right
- Hearts scattered around
- Reunion moment framing

STYLE:
3D Pixar animation style, peak emotional moment, 
heartwarming reunion scene, "pet recognizes owner" feeling,
cinematic film still quality.

TECHNICAL:
9:16 vertical format, ultra-detailed, 8K quality render.
```

---

## 🎬 VEO 3.1 Motion Description (Clip 3):

```
CAMERA:
Slow dolly in continues, warmth intensifying,
cinematic 24fps, shallow depth of field, 
slight warm color grade shift.

SUBJECT ACTION SEQUENCE:
1. (0.0-1.0s) Proud fish suddenly notices something off-screen right.
   - Head turns sharply
   - Eyes focus on something new
   - Expression shifts from pride to recognition
2. (1.0-2.0s) Human hand silhouette enters frame from right:
   - Warm golden glow surrounds hand
   - Hand reaches gently toward fishbowl
3. (2.0-4.0s) Fish REACTS with pure joy:
   - Graduation cap falls off, floats away
   - Fish swims RAPIDLY toward hand
   - Tail wags excitedly like puppy
   - Fins flutter with excitement
   - Expression transforms to pure happiness
4. (4.0-5.0s) Emotional peak:
   - Hearts pop up around fish (pop pop pop)
   - Fish presses against glass toward hand
   - Warm glow intensifies between them
   - Heartwarming connection moment

SUBTLE DETAILS:
- Graduation cap slowly sinking in background
- Bubbles from rapid swimming
- Heart particles floating upward
- Water ripples from movement

TIMING:
5 seconds total. Notice 1s, hand enters 1s, rush 2s, connection 1s.

MOOD:
Recognition. Joy. Love. Emotional reunion. "She remembers me!"
```

---

# 📸 CLIP 4: THE UPGRADE (13-17 ثواني)
> **المشهد:** الانتقال من الوعاء للأكواريوم

---

## 🖼️ START FRAME 4:
```
[استخدم END FRAME 3 - السمكة المتحمسة مع اليد]
```

---

## 🖼️ END FRAME 4 - Nano Banana / Midjourney Prompt:

```
Medium shot film still, 3D Pixar-style cartoon orange Goldfish 
with CONTENT peaceful expression inside beautiful PLANTED AQUARIUM.

CHARACTER STATE:
- Expression: Content, peaceful, satisfied, grateful
- Eyes: Soft, relaxed, half-closed with happiness
- Mouth: Gentle warm smile, peaceful
- Body: Relaxed floating, comfortable
- Fins: Flowing gently, at ease
- Pose: Looking around new home with wonder

NEW ENVIRONMENT (AQUARIUM UPGRADE):
- NOW in spacious PLANTED AQUARIUM (not small bowl!)
- Live green aquatic plants: Java fern, Anubias, Amazon sword
- Natural gravel/sand substrate at bottom
- Clean crystal clear water
- LED light from above
- MUCH more swimming space
- Professional aquarium setup

BRAND ELEMENTS:
- AQUAVO teal color (#0D9488) accent lighting
- Teal glow in background
- Premium "upgrade" feeling

LIGHTING:
- Soft diffused LED light from above
- AQUAVO teal accent glow
- Clean, modern aquarium lighting
- Peaceful ambient mood

COMPOSITION:
- Fish in center, surrounded by plants
- Spacious feeling, room to swim
- Plants frame the fish naturally
- Space at top for text/logo

STYLE:
3D Pixar animation style, peaceful resolution,
"happy ending" aesthetic, aspirational lifestyle,
cinematic film still quality.

TECHNICAL:
9:16 vertical format, ultra-detailed, 8K quality render.
```

---

## 🎬 VEO 3.1 Motion Description (Clip 4):

```
CAMERA:
Slow dolly in, smooth transition to new environment,
cinematic 24fps, shallow depth of field.

SUBJECT ACTION SEQUENCE:
1. (0.0-1.5s) MAGICAL TRANSITION:
   - Excited fish from previous scene
   - Swirl of magical particles
   - Environment TRANSFORMS around fish
   - Small bowl EXPANDS into large planted aquarium
2. (1.5-3.0s) Fish reacts to new home:
   - Looks around with wonder
   - Swims slowly through plants
   - Expression shifts to peaceful awe
3. (3.0-4.0s) Fish settles in:
   - Finds comfortable spot among plants
   - Relaxes, fins slow down
   - Content smile grows
   - Turns toward camera

SUBTLE DETAILS:
- Plants sway gently in current
- Bubbles rise from substrate
- LED light shimmer on water surface
- Fish explores new space

TIMING:
4 seconds total. Transform 1.5s, explore 1.5s, settle 1s.

MOOD:
Upgrade. Peace. "This is what she deserves."
```

---

# 📸 CLIP 5: THE CTA (17-20 ثواني)
> **المشهد:** الغمزة والدعوة للتفاعل

---

## 🖼️ START FRAME 5:
```
[استخدم END FRAME 4 - السمكة في الأكواريوم]
```

---

## 🖼️ END FRAME 5 - Nano Banana / Midjourney Prompt:

```
Medium-close shot film still, 3D Pixar-style cartoon orange Goldfish 
WINKING playfully at camera inside beautiful planted aquarium.

CHARACTER STATE:
- Expression: Playful, inviting, friendly, cheeky
- Eyes: ONE EYE CLOSED IN WINK, other eye bright and friendly
- Mouth: Warm knowing smile, friendly grin
- Body: Turned toward camera, direct engagement
- Fins: Relaxed, gentle movement
- Pose: Face-to-camera, breaking fourth wall

INTERACTIVE ELEMENT:
- Speech bubble floating from fish's mouth
- Inside speech bubble: Fish emoji "🐟"
- Bubble style: Rounded, cartoon, clean

SPACE FOR OVERLAY:
- PLENTY of empty space at TOP of frame
- Clear area for text overlay / CTA
- Room for AQUAVO logo placement

BRAND ELEMENTS:
- AQUAVO teal (#0D9488) color tones
- Teal glow in planted aquarium background
- Premium brand aesthetic

ENVIRONMENT:
- Planted aquarium with green plants
- Clean water, soft bubbles
- LED ambient lighting
- Professional setup

LIGHTING:
- Soft friendly lighting on fish face
- AQUAVO teal accent glow
- Inviting warm tones
- Social media optimized brightness

COMPOSITION:
- Fish in lower third
- Top 40% empty for text overlay
- Wink is clear and readable
- Direct eye contact with viewer

STYLE:
3D Pixar animation style, friendly invitation,
"join us" aesthetic, social media CTA optimized,
bright and inviting, cinematic film still quality.

TECHNICAL:
9:16 vertical format, ultra-detailed, 8K quality render.
```

---

## 🎬 VEO 3.1 Motion Description (Clip 5):

```
CAMERA:
Slow dolly in final approach, 
cinematic 24fps, shallow depth of field,
settling into final frame.

SUBJECT ACTION SEQUENCE:
1. (0.0-1.0s) Content fish turns toward camera:
   - Head rotates to face viewer directly
   - Eyes look straight at camera
   - Breaking the fourth wall
2. (1.0-2.0s) THE WINK:
   - Fish pauses for a beat
   - One eye slowly closes in deliberate wink
   - Smile grows slightly bigger
   - Playful, knowing expression
3. (2.0-3.0s) CTA moment:
   - Speech bubble with "🐟" pops up
   - Bubble animates in with slight bounce
   - Sparkles appear around fish
   - Inviting, friendly finale

SUBTLE DETAILS:
- Plants sway softly in background
- Gentle bubbles rise
- Warm ambient glow
- Space at top stays clear for text

TIMING:
3 seconds total. Turn 1s, wink 1s, bubble 1s.

MOOD:
Invitation. Connection. "Comment below!" Call to action.
Friendly, approachable, social media optimized ending.
```

---

# 📝 TEXT OVERLAYS (للتحرير النهائي)

| الثانية | النص العربي | الموقع |
|---------|-------------|--------|
| 0-3 | ❌ **"3 ثواني؟"** ❌ | وسط الشاشة |
| 3-8 | ✅ **"الحقيقة: 5 أشهر!"** ✅ | وسط الشاشة |
| 8-13 | 💕 **"تتعرف على صاحبها!"** | وسط الشاشة |
| 13-17 | 🌿 **"تستاهل الأفضل"** | وسط الشاشة |
| 17-20 | 🐟 **"اكتب 'سمكة' = خصم الحجز المبكر!"** | أعلى الشاشة |

---

# 🎵 AUDIO GUIDE

| Clip | الصوت (Voiceover) | SFX |
|------|-------------------|-----|
| 1 | "انتظر... هذا غلط!" | 🔊 Glass shattering, whoosh |
| 2 | "الحقيقة... تتذكر 5 أشهر!" | 🔊 Magic shimmer, page flip, ding! |
| 3 | "وتتعرف على صاحبها!" | 🔊 Heartbeat, emotional strings |
| 4 | "سمكتك تستاهل الأفضل" | 🔊 Peaceful ambient, water sounds |
| 5 | "اكتب 'سمكة' بالتعليقات!" | 🔊 Upbeat pop, notification ding |

---

# ✅ EXECUTION CHECKLIST

## Phase 1: الصور (Nano Banana / Midjourney)
- [ ] Generate START FRAME 1 (Calm + Stopwatch)
- [ ] Generate END FRAME 1 (Shocked + Shattered) 
- [ ] Generate END FRAME 2 (Proud + Calendar)
- [ ] Generate END FRAME 3 (Excited + Hearts)
- [ ] Generate END FRAME 4 (Content + Aquarium)
- [ ] Generate END FRAME 5 (Winking + Bubble)

**Total: 6 frames**

## Phase 2: الفيديو (VEO 3.1)
- [ ] Upload Frame 1 → Frame 1 End → Generate Clip 1
- [ ] Upload Frame 1 End → Frame 2 End → Generate Clip 2
- [ ] Upload Frame 2 End → Frame 3 End → Generate Clip 3
- [ ] Upload Frame 3 End → Frame 4 End → Generate Clip 4
- [ ] Upload Frame 4 End → Frame 5 End → Generate Clip 5

**Total: 5 clips**

## Phase 3: التحرير (CapCut/Premiere)
- [ ] Import all clips
- [ ] Add voiceover
- [ ] Add SFX
- [ ] Add text overlays
- [ ] Add AQUAVO logo
- [ ] Export 9:16

---

*تم الإنشاء: 25 يناير 2026*
*مبني على أحدث أبحاث: Google Veo, Kling AI, Midjourney*

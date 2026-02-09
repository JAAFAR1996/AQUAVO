# 🎬 AQUAVO - خرافة الـ Goldfish سهلة للمبتدئين
## النسخة V6 FINAL (Hybrid Style + Style Bible)

---

```yaml
# ═══════════════════════════════════════════════════════════════
# AQUAVO - GOLDFISH MYTH STORYBOARD V6 FINAL
# ═══════════════════════════════════════════════════════════════

project:
  name: "Goldfish Easy Myth BUSTED"
  duration: "30 seconds"
  format: "9:16 vertical"
  keyframes: 7

# ═══════════════════════════════════════════════════════════════
# STYLE BIBLE (ثابت لكل المشاهد)
# ═══════════════════════════════════════════════════════════════

style_bible:
  genre: "Educational Animation + Myth Busting"
  mood: "Informative → Emotional → Empowering"
  
  color_palette:
    primary: "Orange-gold (السمكة)"
    secondary: "Deep blue (الماء)"
    accent: "Green (النباتات)"
    warning: "Red (الخطأ ❌)"
    success: "Green (الصح ✅)"
  
  camera_language: |
    Simple clean moves only.
    One move per shot maximum.
    Static, Dolly, or Push only.
    No complex combinations.
  
  lighting:
    aquarium: "LED overhead, soft caustics"
    shop: "Warm yellow ambient"
    emotional: "Golden hour warm"
    sad: "Cold blue-gray"
  
  texture: "Realistic scales + Cartoon expressive eyes (Hybrid)"

# ═══════════════════════════════════════════════════════════════
# CHARACTER REFERENCE (Hybrid Style)
# ═══════════════════════════════════════════════════════════════

character:
  name: "Goldie"
  reference_file: "GOLDFISH_HYBRID_REFERENCE.jpg"
  style: "Pixar/Dreamworks Hybrid"
  
  description: |
    Realistic fish body with shiny orange-gold scales.
    Large expressive cartoon eyes (Dreamworks style).
    Natural fin textures, realistic proportions.
    Friendly curious personality.
  
  consistency_tag: |
    Same hybrid goldfish: realistic orange body with 
    shiny scales, large cartoon expressive eyes,
    curious friendly personality.

# ═══════════════════════════════════════════════════════════════
# NEGATIVE PROMPTS (تجنب هذه الأخطاء!)
# ═══════════════════════════════════════════════════════════════

negative_prompts:
  always_avoid:
    - "distorted fish anatomy"
    - "inconsistent character design"
    - "blurry or muddy scales"
    - "human-like fish body"
    - "multiple goldfish when one needed"
    - "wrong fish species"
    - "cartoon environment (keep realistic)"
    - "text in generated image"
    - "watermarks or logos"
    - "horizontal format"

# ═══════════════════════════════════════════════════════════════
# FRAME 1: HOOK
# ═══════════════════════════════════════════════════════════════

frame_1:
  id: 1
  time: "0-4s"
  purpose: "HOOK - Stop the scroll"
  
  shot: "Over-the-shoulder shot in pet store"
  camera: "Static → Slow dolly in"
  lighting: "Warm yellow pet store ambient"
  action: "Clerk hands bag with goldfish to excited child"
  key_detail: "Goldfish has worried eyes looking at camera"
  negative: "no happy goldfish, no cartoon store"
  
  prompt: |
    Over-the-shoulder shot, Pixar/Dreamworks hybrid style.
    Same hybrid goldfish: realistic orange body, shiny scales,
    large cartoon expressive eyes with worried expression.
    Camera behind child's shoulder (blur foreground).
    Pet store clerk handing plastic bag with goldfish.
    Warm yellow lighting, realistic aquarium store.
    50mm lens, f/2 shallow depth of field.
    Vertical 9:16 format, ultra-detailed.
    --no cartoon store, happy goldfish, distorted anatomy

  text: "محلات السمك كذبوا عليك! 😡"

# ═══════════════════════════════════════════════════════════════
# FRAME 2: SAD BOWL (POV)
# ═══════════════════════════════════════════════════════════════

frame_2:
  id: 2
  time: "4-8s"
  purpose: "HOLD - Build empathy"
  
  shot: "Fisheye POV from INSIDE the bowl"
  camera: "Static"
  lighting: "Cold blue-gray inside, warm outside"
  action: "Fish looks at camera pleading, trapped feeling"
  key_detail: "Distorted room through curved glass"
  negative: "no happy fish, no clear water"
  
  prompt: |
    Fisheye POV shot from INSIDE tiny fishbowl, hybrid style.
    Same hybrid goldfish: realistic body, cartoon sad eyes,
    extremely close to camera, pleading expression.
    Camera inside bowl looking out through curved glass.
    Child's bedroom distorted through curved glass.
    Cold lighting inside, warmer outside.
    Water caustics, claustrophobic trapped feeling.
    10mm fisheye, vertical 9:16 format.
    --no happy fish, cartoon room, clean water

  text: '"أنا محبوس هنا! 😰"'

# ═══════════════════════════════════════════════════════════════
# FRAME 3: SIZE SHOCK
# ═══════════════════════════════════════════════════════════════

frame_3:
  id: 3
  time: "8-13s"
  purpose: "OFFER - Educational shock"
  
  shot: "Extreme low-angle looking up"
  camera: "Static"
  lighting: "Dramatic underwater god rays"
  action: "Giant goldfish swims majestically above"
  key_detail: "Ruler showing 30cm"
  negative: "no small fish, no overhead angle"
  
  prompt: |
    Extreme low-angle shot looking up, hybrid style.
    Same hybrid goldfish but GIANT (30cm long).
    Camera at bottom of 380-liter aquarium looking up.
    Majestic flowing fins, proud confident expression.
    Ruler graphic showing "30 cm" beside fish.
    Dramatic god rays through water from above.
    Awe-inspiring atmosphere.
    24mm wide lens, vertical 9:16 format.
    --no small fish, overhead angle, cartoon water

  text: "😱 تنمو حتى 30 سم!"

# ═══════════════════════════════════════════════════════════════
# FRAME 4: COMPARISON
# ═══════════════════════════════════════════════════════════════

frame_4:
  id: 4
  time: "13-18s"
  purpose: "OFFER - Visual proof"
  
  shot: "High-angle overhead top-down"
  camera: "Static"
  lighting: "Bright clean infographic"
  action: "Two containers side by side comparison"
  key_detail: "5L bowl vs 285L tank dramatic difference"
  negative: "no side view, no single container"
  
  prompt: |
    High-angle overhead shot looking down, hybrid style.
    Two containers side by side on white surface.
    LEFT: Tiny 5L fishbowl, same goldfish small and sad, 
    red X mark floating above.
    RIGHT: Massive 285L aquarium, same goldfish 3x larger 
    and happy, green checkmark above.
    Dramatic size difference clearly visible.
    Strong graphic composition.
    35mm lens, bright lighting, vertical 9:16 format.
    --no side view, single container, equal sizes

  text: "الفرق = 57 ضعف!"

# ═══════════════════════════════════════════════════════════════
# FRAME 5: RELATE (EMOTIONAL)
# ═══════════════════════════════════════════════════════════════

frame_5:
  id: 5
  time: "18-22s"
  purpose: "RELATE - Emotional connection"
  
  shot: "Eye-level close-up portrait"
  camera: "Static"
  lighting: "Warm golden hour nostalgic"
  action: "Elderly wise fish looks at camera knowingly"
  key_detail: "Family photos in background"
  negative: "no young fish, no cold lighting"
  
  prompt: |
    Eye-level close-up portrait, hybrid style.
    Same goldfish but elderly version, white age patches.
    Deep rich orange scales, knowing gentle eyes.
    Wise content smile, direct eye contact.
    Pristine aquarium, family photos on wall behind
    (showing same fish at different ages).
    Warm nostalgic golden hour lighting.
    85mm portrait lens, f/1.8 shallow depth of field.
    Emotional atmosphere, vertical 9:16 format.
    --no young fish, cold lighting, empty background

  text: "تعيش 10-30 سنة! 📅"
  sub_text: "هل كانت أول سمكة ربيتها goldfish؟"

# ═══════════════════════════════════════════════════════════════
# FRAME 6: ALTERNATIVES
# ═══════════════════════════════════════════════════════════════

frame_6:
  id: 6
  time: "22-26s"
  purpose: "SOLUTION - Real beginner fish"
  
  shot: "Wide shot of aquarium"
  camera: "Slow push in"
  lighting: "Bright cheerful LED"
  action: "Three beginner fish swim happily"
  key_detail: "Labels with sizes for each fish"
  negative: "no goldfish in this frame, no sad fish"
  
  prompt: |
    Wide shot, hybrid style beginner aquarium (38L).
    Three types of happy fish swimming:
    - Purple-red Betta with flowing fins
    - Orange Guppy group of 3
    - School of 5 Neon Tetra blue stripes
    Each fish labeled with tank size.
    Clean crystal water, green plants, LED lighting.
    Friendly cartoon expressions, bright cheerful mood.
    35mm lens, vertical 9:16 format.
    --no goldfish, sad fish, dirty water

  text: "✅ سهلة فعلاً للمبتدئين"

# ═══════════════════════════════════════════════════════════════
# FRAME 7: CTA
# ═══════════════════════════════════════════════════════════════

frame_7:
  id: 7
  time: "26-30s"
  purpose: "CTA - Engagement"
  
  shot: "Eye-level portrait"
  camera: "Static"
  lighting: "Warm golden portrait"
  action: "Goldfish winks at camera"
  key_detail: "Friendly inviting smile"
  negative: "no sad fish, no side view"
  
  prompt: |
    Eye-level portrait, hybrid style.
    Same hybrid goldfish, healthy adult version.
    Centered in frame, direct eye contact.
    Left eye closed in playful wink, knowing smile.
    Warm confident friendly expression.
    Clean aquarium, soft green plant bokeh.
    Portrait lighting from top-right.
    85mm lens, f/1.8 shallow depth of field.
    Vertical 9:16 format.
    --no sad fish, side view, dark lighting

  text: "هل أنت جاهز للالتزام؟ 👇"
  cta: "💬 ما أول سمكة ربيتها؟"
  brand: "@aquavo.sa | AQUAVO"

# ═══════════════════════════════════════════════════════════════
# SUMMARY TABLE
# ═══════════════════════════════════════════════════════════════

summary:
  | # | Time | Purpose | Camera | Key Visual |
  |---|------|---------|--------|------------|
  | 1 | 0-4s | HOOK | OTS Dolly | محل + كذبة |
  | 2 | 4-8s | HOLD | Fisheye POV | داخل الحوض! |
  | 3 | 8-13s | OFFER | Low Angle | سمكة عملاقة |
  | 4 | 13-18s | OFFER | Overhead | مقارنة 5L vs 285L |
  | 5 | 18-22s | RELATE | Portrait | سمكة حكيمة |
  | 6 | 22-26s | SOLUTION | Wide Push | بدائل سهلة |
  | 7 | 26-30s | CTA | Portrait | غمزة! |
```

---

# 📋 PROMPTS للنسخ المباشر:

## Frame 1:
```
Over-the-shoulder shot, Pixar/Dreamworks hybrid style. Same hybrid goldfish: realistic orange body, shiny scales, large cartoon expressive eyes with worried expression. Camera behind child's shoulder (blur foreground). Pet store clerk handing plastic bag with goldfish. Warm yellow lighting, realistic aquarium store. 50mm lens, f/2 shallow depth of field. Vertical 9:16 format, ultra-detailed. --no cartoon store, happy goldfish, distorted anatomy
```

## Frame 2:
```
Fisheye POV shot from INSIDE tiny fishbowl, hybrid style. Same hybrid goldfish: realistic body, cartoon sad eyes, extremely close to camera, pleading expression. Camera inside bowl looking out through curved glass. Child's bedroom distorted through curved glass. Cold lighting inside, warmer outside. Water caustics, claustrophobic trapped feeling. 10mm fisheye, vertical 9:16 format. --no happy fish, cartoon room, clean water
```

## Frame 3:
```
Extreme low-angle shot looking up, hybrid style. Same hybrid goldfish but GIANT (30cm long). Camera at bottom of 380-liter aquarium looking up. Majestic flowing fins, proud confident expression. Ruler graphic showing "30 cm" beside fish. Dramatic god rays through water from above. Awe-inspiring atmosphere. 24mm wide lens, vertical 9:16 format. --no small fish, overhead angle, cartoon water
```

## Frame 4:
```
High-angle overhead shot looking down, hybrid style. Two containers side by side on white surface. LEFT: Tiny 5L fishbowl, same goldfish small and sad, red X mark floating above. RIGHT: Massive 285L aquarium, same goldfish 3x larger and happy, green checkmark above. Dramatic size difference clearly visible. Strong graphic composition. 35mm lens, bright lighting, vertical 9:16 format. --no side view, single container, equal sizes
```

## Frame 5:
```
Eye-level close-up portrait, hybrid style. Same goldfish but elderly version, white age patches. Deep rich orange scales, knowing gentle eyes. Wise content smile, direct eye contact. Pristine aquarium, family photos on wall behind (showing same fish at different ages). Warm nostalgic golden hour lighting. 85mm portrait lens, f/1.8 shallow depth of field. Emotional atmosphere, vertical 9:16 format. --no young fish, cold lighting, empty background
```

## Frame 6:
```
Wide shot, hybrid style beginner aquarium (38L). Three types of happy fish swimming: purple-red Betta with flowing fins, orange Guppy group of 3, school of 5 Neon Tetra blue stripes. Each fish labeled with tank size. Clean crystal water, green plants, LED lighting. Friendly cartoon expressions, bright cheerful mood. 35mm lens, vertical 9:16 format. --no goldfish, sad fish, dirty water
```

## Frame 7:
```
Eye-level portrait, hybrid style. Same hybrid goldfish, healthy adult version. Centered in frame, direct eye contact. Left eye closed in playful wink, knowing smile. Warm confident friendly expression. Clean aquarium, soft green plant bokeh. Portrait lighting from top-right. 85mm lens, f/1.8 shallow depth of field. Vertical 9:16 format. --no sad fish, side view, dark lighting
```

# 🏆 سيناريو الأوسكار: "الوحيد" | الإصدار الفيروسي
## THE LONELY ONE - Viral Edition | VEO 3.1 Optimized

---

```
████████████████████████████████████████████████████████████████████████████
█                                                                          █
█   🎬 THE LONELY ONE | الوحيد - VIRAL EDITION v5.0                       █
█   ───────────────────────────────────────────────                        █
█   Duration: 14 seconds | 2 Clips × 8s (trimmed)                          █
█   Story: FULL ARC (Reflection + Disappointment + Friends)                █
█   Frame Chaining: Clip 1 End = Clip 2 Start                              █
█   Audio: Single Unified Track (14 seconds)                               █
█                                                                          █
████████████████████████████████████████████████████████████████████████████
```

---

# ⚠️ حل مشكلة VEO (8 ثوانٍ فقط)

## الحل المختار: كليبين مع قص

```json
{
  "veo_14_second_solution": {
    "method": "2 Clips × 8 seconds = 16s → Trim to 14s",
    "workflow": [
      "1. توليد CLIP_A (8s): الوحدة + الانعكاس + الخيبة",
      "2. توليد CLIP_B (8s): وصول الأصدقاء + التحول + الفرح",
      "3. CLIP_A End Frame = CLIP_B Start Frame (تسلسل)",
      "4. قص في DaVinci: 7s من A + 7s من B = 14s",
      "5. تطبيق MASTER_AUDIO (14s) على الفيديو النهائي"
    ],
    "frame_chaining": {
      "CLIP_A_END": "سمكة حزينة بعد اكتشاف أن الانعكاس ليس حقيقياً",
      "CLIP_B_START": "نفس المشهد بالضبط، ثم موجة ماء من الأعلى"
    },
    "final_duration": "14 seconds",
    "loop": true
  }
}
```

---

# 📖 القصة الكاملة (Story Spine - Pixar)

```
ACT 1: السجن الجميل (0-3s)
   سمكة نيون تترا وحيدة في حوض مثالي، ألوانها باهتة
   
ACT 2: الأمل الزائف (3-6s)
   ترى انعكاسها في الزجاج، تظنه صديقاً، تسبح نحوه بأمل
   
ACT 3: الخيبة (6-8s)
   تلامس الزجاج، تدرك أنه وهم، تتراجع حزينة
   
ACT 4: الوصول (8-11s)
   موجة ماء من الأعلى، 5 أسماك جديدة تنزل برفق
   
ACT 5: التحول والفرح (11-14s)
   ألوان السمكة الأصلية تعود، تسبح مع المجموعة بسعادة
```

---

# 🎯 الهيكل الجديد: كليبين × 8 ثوانٍ

## CLIP A (8 ثوانٍ) - الوحدة والخيبة

```
ثانية 0-2:   😢 الوحدة (سمكة وحيدة، ألوان باهتة)
ثانية 2-4:   👀 الاكتشاف (ترى انعكاسها، تظنه صديقاً)
ثانية 4-6:   🏃 الأمل (تسبح نحو الانعكاس بحماس)
ثانية 6-8:   💔 الخيبة (تلامس الزجاج، تدرك الحقيقة)
```

## CLIP B (8 ثوانٍ) - التحول والفرح

```
ثانية 0-2:   😞 الحزن (نفس مشهد نهاية Clip A)
ثانية 2-4:   🌊 الأمل الحقيقي (موجة ماء، 5 أسماك تنزل)
ثانية 4-6:   ✨ التحول (ألوان السمكة تعود)
ثانية 6-8:   💛 الفرح (سباحة جماعية + CTA)
```

## القص النهائي

```
CLIP A: استخدام أول 7 ثوانٍ (0-7s)
CLIP B: استخدام أول 7 ثوانٍ (0-7s)
المجموع: 14 ثانية
```

---

# 🔊 UNIFIED AUDIO SOLUTION (الصوت الموحد)

## المشكلة:
كل كليب VEO يولد صوته الخاص = عدم اتساق.

## الحل:

```json
{
  "unified_audio_solution": {
    "workflow": {
      "step_1": "توليد موسيقى واحدة 8 ثوانٍ بـ SUNO/UDIO",
      "step_2": "توليد الفيديو بدون صوت (VEO mute OR remove audio)",
      "step_3": "دمج الموسيقى في DaVinci Resolve",
      "step_4": "إضافة SFX بشكل منفصل"
    },
    "veo_audio_handling": {
      "option_1": "توليد VEO بدون prompt صوتي = صمت",
      "option_2": "توليد VEO ثم إزالة الصوت في Post",
      "recommended": "option_2 - VEO ينتج فيديو أفضل مع audio prompt ثم نزيله"
    },
    "master_audio_8_seconds": true
  }
}
```

---

# 🎵 VEO AUDIO PROMPTS (مدمجة في توليد الفيديو)

> **ملاحظة:** VEO 3.1 يولد الصوت تلقائياً مع الفيديو. الـ Audio Prompts مدمجة في VEO prompt.

## CLIP_A Audio (8 ثوانٍ)

```json
{
  "clip_a_audio": {
    "generator": "VEO 3.1 (built-in)",
    "duration": 8,
    "timeline": {
      "0-2s": {
        "sound": "quiet underwater ambiance, single melancholic piano note, subtle bubbles",
        "mood": "isolation, loneliness, beautiful sadness",
        "dynamics": "quiet, sparse, empty feeling"
      },
      "2-4s": {
        "sound": "curious rising musical notes, gentle shimmer, fish movement sounds",
        "mood": "curiosity, awakening hope",
        "dynamics": "building gently"
      },
      "4-6s": {
        "sound": "hopeful ascending strings, swimming sounds toward glass",
        "mood": "excitement, anticipation",
        "dynamics": "building to crescendo"
      },
      "6-8s": {
        "sound": "sudden quiet drop, sad descending note, gentle glass tap sound",
        "mood": "disappointment, realization, sadness deeper",
        "dynamics": "sudden drop to quiet"
      }
    },
    "veo_audio_prompt": "Underwater aquarium ambiance with emotional piano underscore. Start with single melancholic piano note and quiet bubbles (0-2s). Add curious rising notes as fish notices something (2-4s). Build hopeful strings with swimming sounds (4-6s). Sudden quiet drop with sad descending note when fish touches glass (6-8s). No vocals. Cinematic emotional quality."
  }
}
```

## CLIP_B Audio (8 ثوانٍ)

```json
{
  "clip_b_audio": {
    "generator": "VEO 3.1 (built-in)",
    "duration": 8,
    "timeline": {
      "0-2s": {
        "sound": "continuation of sad quiet, then water splash/ripple sound from above",
        "mood": "sadness turning to attention",
        "dynamics": "quiet then sudden attention"
      },
      "2-4s": {
        "sound": "magical shimmer sounds, gentle descending notes for arriving fish",
        "mood": "surprise, real hope emerging",
        "dynamics": "building with wonder"
      },
      "4-6s": {
        "sound": "warm orchestral swell, transformation sparkle sounds, joyful swimming",
        "mood": "joy, transformation, relief",
        "dynamics": "full and rich"
      },
      "6-8s": {
        "sound": "celebration peak, synchronized swimming sounds, fade to gentle piano",
        "mood": "celebration, community, satisfaction",
        "dynamics": "full peak → gentle fade for loop"
      }
    },
    "veo_audio_prompt": "Underwater aquarium with emotional transformation. Start with quiet sadness then water splash from above (0-2s). Magical shimmer sounds as new fish descend gracefully (2-4s). Warm orchestral swell with transformation sparkle as colors brighten (4-6s). Joyful celebration with synchronized swimming, fading to gentle piano note (6-8s). No vocals. Seamless ending for loop."
  }
}
```

## تطبيق الصوت في VEO Prompt

> الـ Audio prompts أعلاه تُضاف إلى نهاية VEO video prompt:

```json
{
  "veo_prompt_with_audio": {
    "video_prompt": "[... visual prompt ...]",
    "audio_prompt": "[paste veo_audio_prompt from above]",
    "combined_format": "[video prompt]. Audio: [audio prompt]"
  }
}
```

---

# 🎨 CHARACTER BIBLE

{
  "character_bible": {
    "artistic_style": {
      "type": "Stylized 3D / Cartoon-ish",
      "reference": "Pixar-like without full cartoon exaggeration",
      "description": "Semi-realistic animated character with expressive features in photorealistic environment",
      "balance": "70% realistic details + 30% cartoon expressiveness"
    },
    
    "style_source": "EXACT match to AQUAVO goldfish character design",
    "reference_images": [
      "AQUAVO_goldfish_character_sheet.jpg",
      "AQUAVO_goldfish_video_plecos.jpg"
    ],
    
    "design_rules": {
      "STYLE_MATCH": "SAME Pixar style as AQUAVO goldfish",
      "BODY_SHAPE": "REAL Neon Tetra proportions (NOT goldfish round shape)",
      "artistic_approach": "Stylized 3D, Pixar-like, NOT full cartoon",
      "same_eye_style": true,
      "same_expression_range": true,
      "same_rendering_quality": true,
      "body_proportions": "DIFFERENT - use real Neon Tetra torpedo shape",
      "color_palette": "iridescent blue stripe + red-orange lower half"
    },
    
    "identity_anchor": {
      "species": "Blue Neon Tetra",
      "size": "scaled up for visibility",
      "style_type": "Stylized 3D - Pixar-like without full cartoon exaggeration",
      "body_shape": {
        "CRITICAL": "REAL Neon Tetra shape - NOT round like goldfish",
        "type": "torpedo / elongated / streamlined",
        "proportions": "slim, elegant, horizontal body",
        "silhouette": "stretched oval, NOT circle",
        "reference": "actual Neon Tetra fish anatomy"
      },
      "body_color": "iridescent blue neon stripe from eye to tail, red-orange lower half",
      "scales": "visible iridescent shimmer texture, realistic detail"
    },
    
    "eyes": {
      "CRITICAL": "SAME STYLE as this video frame - MUST maintain throughout video",
      "size": "40% larger than realistic (expressive but fits torpedo body)",
      "shape": "round with slight oval, friendly",
      "pupil": "large black with bright catchlight",
      "iris": "DARK BROWN / DARK AMBER color - warm but darker tone",
      "iris_hex": "#5D4037 to #6D4C41 range (dark warm brown)",
      "expression_brows": "subtle brow ridge for emotions",
      "catchlight": "always 2 catchlights for life",
      "placement": "on side of head (natural fish placement)",
      "consistency_note": "Eye color MUST remain DARK BROWN/AMBER in ALL frames and ALL fish - NOT light, NOT blue, NOT gray"
    },
    
    "mouth": {
      "style": "small, subtle, expressive (SAME as goldfish)",
      "expressions": ["neutral", "slight frown when sad", "tiny smile when happy"],
      "lips": "soft, not prominent"
    },
    
    "fins": {
      "style": "translucent, flowing, expressive",
      "dorsal": "small pointed fin on back",
      "tail": "forked, elegant",
      "pectoral": "small, used for expression"
    },
    
    "environment": {
      "CRITICAL": "100% REALISTIC aquarium (SAME as goldfish videos)",
      "background": "real planted aquarium with bokeh",
      "water": "crystal clear, visible caustics",
      "plants": "real Java fern, Anubias, moss",
      "glass": "visible aquarium glass when needed",
      "contrast": "Pixar fish in photorealistic setting"
    },
    
    "consistency_seed": 88721,
    
    "emotional_states": {
      "lonely": {
        "eyes": "drooping, brows angled down, looking away",
        "mouth": "slight frown curve",
        "colors": "desaturated, pale",
        "posture": "hunched, fins lowered",
        "reference": "goldfish sad expression"
      },
      "curious": {
        "eyes": "wide open, raised brows, focused",
        "mouth": "slightly open",
        "colors": "normal",
        "posture": "leaning forward, fins alert",
        "reference": "goldfish looking at finger in plecos video"
      },
      "disappointed": {
        "eyes": "drooping after realization",
        "mouth": "downturned",
        "colors": "fading",
        "posture": "pulling back",
        "reference": "goldfish skeptical look"
      },
      "joyful": {
        "eyes": "bright, slight squint from smiling, catchlights sparkling",
        "mouth": "tiny upward curve",
        "colors": "vibrant, saturated, glowing",
        "posture": "active swimming, fins spread",
        "reference": "goldfish happy expression"
      }
    },
    
    "prompt_keywords": {
      "always_include": [
        "AQUAVO goldfish style",
        "Pixar Dreamworks hybrid character",
        "large expressive eyes with catchlight",
        "rounded friendly body shape",
        "realistic aquarium background",
        "semi-realistic scales with iridescence"
      ],
      "never_include": [
        "photorealistic fish",
        "cartoon background",
        "small eyes",
        "flat design",
        "blue eyes",
        "gray eyes",
        "silver eyes",
        "cold colored eyes"
      ]
    }
  }
}
```

---

# 🎬 CLIP A: الوحدة والخيبة (8 ثوانٍ)

## 🖼️ CLIP_A_START_FRAME - بداية القصة

```json
{
  "frame_id": "START_FRAME",
  "model": "gemini-2.5-flash-image",
  "frame_type": "first_frame",
  "chain_from": null,
  "chain_to": "END_FRAME",
  
  "subject": {
    "main": "Single Blue Neon Tetra - Pixar/Dreamworks animated style",
    "style": "AQUAVO signature style - cartoon fish in realistic aquarium",
    "eyes": "LARGE expressive Pixar-style eyes, drooping sad, catchlight present",
    "body": "semi-realistic with iridescent scales, blue stripe, red-orange lower half",
    "colors": "MUTED and DULL - pale blue stripe, desaturated orange (sad state)",
    "emotion": "lonely, depressed, isolated - eyes tell the story",
    "position": "center frame, hovering low and still"
  },
  
  "environment": {
    "setting": "REALISTIC pristine planted aquarium (not cartoon background)",
    "background": "soft bokeh REAL green aquatic plants, caustic light patterns",
    "water": "crystal clear with realistic light refraction",
    "contrast": "cartoon fish in realistic setting - AQUAVO style"
  },
  
  "text_overlay": {
    "enabled": true,
    "text_arabic": "❓ هل تعرف ماذا يحدث لسمكة وحيدة؟",
    "position": "center safe zone (avoid top 250px, bottom 300px, right 120px)",
    "max_characters": 25,
    "style": {
      "font": "DIN Next Arabic Bold",
      "fallback_fonts": ["Cairo Bold", "Noto Sans Arabic Bold", "Tajawal Bold"],
      "color": "#FFFFFF",
      "stroke": "15pt #000000",
      "background": "rgba(0,0,0,0.7)",
      "size": "large, fills text box",
      "alignment": "center"
    },
    "animation": {
      "type": "word-by-word",
      "tool": "CapCut",
      "effect": "pop-in with bounce"
    },
    "safe_zone": "1080x1420 center area"
  },
  
  "lighting": {
    "mood": "low-key cinematic",
    "color_temperature": 4500,
    "tint": "cool blue",
    "key_light": "60%, camera left 45°",
    "rim_light": "20%, cool blue"
  },
  
  "style": {
    "artistic": "Pixar/Dreamworks hybrid - animated character in realistic environment",
    "camera": {
      "shot_type": "close-up",
      "angle": "eye level",
      "depth_of_field": "shallow bokeh on background"
    },
    "mood": "melancholic, beautiful but sad",
    "reference": "AQUAVO goldfish videos style"
  },
  
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "quality": "ultra-detailed"
  },
  
  "prompt": {
    "priority": {
      "primary": "Photorealistic close-up of lonely Blue Neon Tetra with muted colors",
      "secondary": "Arabic text baked into image at top safe zone"
    },
    "subject": {
      "main": "Single Blue Neon Tetra fish",
      "size": "3cm",
      "physical": "iridescent blue stripe nose-to-tail, red-orange lower half, translucent fins with visible rays, large expressive black eyes with silver reflection ring and catchlight",
      "emotional_state": "lonely, depressed, isolated",
      "color_state": "MUTED DULL desaturated",
      "behavior": "hovering motionless alone",
      "position": "center frame, slightly lower"
    },
    "realism_details": {
      "scales": "visible iridescent scales with subtle light reflection",
      "fins": "lowered showing depression, translucent with visible rays",
      "eyes": "large sad expressive with catchlight",
      "water": "caustic light patterns dancing on fish, subtle water particles"
    },
    "environment": {
      "setting": "pristine planted aquarium",
      "background": "soft bokeh green plants",
      "water": "crystal clear",
      "atmosphere": "melancholic beautiful"
    },
    "text_overlay": {
      "text": "🔬 الأسماك الاجتماعية تشعر بالوحدة...",
      "position": "top third safe zone",
      "style": "white bold sans-serif on semi-transparent dark box 70% opacity"
    },
    "cinematography": {
      "shot_type": "close-up",
      "lens": "macro f/2.8",
      "angle": "eye level",
      "depth_of_field": "shallow bokeh"
    },
    "lighting": {
      "style": "low-key cinematic",
      "color_temperature": "4500K cool blue",
      "key_light": "60% camera left 45 degrees",
      "rim_light": "20% cool blue",
      "contrast": "high contrast dramatic shadows"
    },
    "technical": {
      "resolution": "4K",
      "aspect_ratio": "9:16",
      "quality": "ultra-detailed photorealistic film still"
    },
    "exclusions": [
      "cartoon", "anime", "CGI", "3D render",
      "dead fish", "dirty water", "blurry",
      "watermark", "logo", "text artifacts",
      "extra fins", "plastic look", "oversaturated", "HDR effect"
    ]
  },
  
  "seed": 88721
}
```

---

## 🖼️ CLIP_A_END_FRAME - لحظة الخيبة (= CLIP_B_START_FRAME)

```json
{
  "frame_id": "CLIP_A_END_FRAME",
  "model": "gemini-2.5-flash-image",
  "frame_type": "last_frame_clip_a",
  "chain_from": "CLIP_A_START_FRAME",
  "chain_to": "CLIP_B_START_FRAME (same image)",
  "note": "هذه الصورة تُستخدم كـ END لـ Clip A و START لـ Clip B",
  
  "subject": {
    "main": "Single Blue Neon Tetra touching aquarium glass",
    "colors": "STILL MUTED - fish realizes reflection is not real",
    "emotion": "disappointment, sadness, loneliness confirmed",
    "action": "nose touching glass, looking at own reflection",
    "position": "near left glass wall of aquarium"
  },
  
  "environment": {
    "setting": "same pristine planted aquarium",
    "glass_wall": "visible glass with fish reflection",
    "background": "same plants, same lighting",
    "water": "crystal clear"
  },
  
  "text_overlay": {
    "enabled": true,
    "text_arabic": "💔 الانعكاس ليس صديقاً...",
    "position": "center safe zone",
    "max_characters": 20,
    "style": {
      "font": "DIN Next Arabic Bold",
      "fallback_fonts": ["Cairo Bold", "Noto Sans Arabic Bold"],
      "color": "#FFFFFF",
      "stroke": "15pt #000000",
      "background": "rgba(0,0,0,0.7)",
      "size": "medium-large",
      "alignment": "center"
    },
    "animation": {
      "type": "fade-in",
      "tool": "CapCut",
      "effect": "subtle appear with emotion"
    },
    "safe_zone": "center safe area"
  },
  
  "lighting": {
    "mood": "low-key sad",
    "color_temperature": 4500,
    "tint": "cool blue, same as start",
    "key_light": "50%, camera left",
    "rim_light": "15%, cool blue"
  },
  
  "style": {
    "artistic": "photorealistic film still",
    "camera": {
      "shot_type": "medium shot",
      "angle": "side angle showing glass",
      "depth_of_field": "shallow, reflection slightly out of focus"
    },
    "mood": "disappointment, realization"
  },
  
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "quality": "ultra-detailed"
  },
  
  "prompt": {
    "priority": {
      "primary": "Photorealistic shot of lonely Blue Neon Tetra touching glass",
      "secondary": "Show disappointment - reflection is not a real friend"
    },
    "subject": {
      "main": "Single Blue Neon Tetra touching aquarium glass",
      "size": "3cm",
      "physical": "iridescent blue stripe nose-to-tail, red-orange lower half",
      "emotional_state": "disappointment, sadness, realization",
      "color_state": "STILL MUTED - hope faded",
      "action": "nose touching glass, looking at own blurry reflection",
      "position": "near left glass wall"
    },
    "realism_details": {
      "glass": "visible glass wall with subtle reflection of fish",
      "reflection": "blurry, obviously not real",
      "scales": "still dull, not iridescent",
      "fins": "lowered in disappointment",
      "water": "caustic patterns, crystal clear"
    },
    "environment": {
      "setting": "same pristine planted aquarium",
      "glass_visible": true,
      "background": "soft bokeh green plants",
      "water": "crystal clear"
    },
    "text_overlay": {
      "text": "� الانعكاس ليس صديقاً...",
      "position": "center",
      "style": "white bold on semi-transparent dark box"
    },
    "cinematography": {
      "shot_type": "medium shot",
      "lens": "50mm f/2.8",
      "angle": "side angle showing glass wall",
      "depth_of_field": "fish sharp, reflection slightly blurry"
    },
    "lighting": {
      "style": "low-key cool",
      "color_temperature": "4500K cool blue",
      "key_light": "50% camera left",
      "rim_light": "15% cool blue"
    },
    "technical": {
      "resolution": "4K",
      "aspect_ratio": "9:16",
      "quality": "ultra-detailed photorealistic"
    },
    "exclusions": [
      "cartoon", "anime", "CGI", "3D render",
      "dead fish", "dirty water", "blurry fish",
      "watermark", "logo", "text artifacts",
      "extra fins", "plastic look", "oversaturated"
    ]
  },
  
  "seed": 88721
}
```

---

## 🎥 CLIP_A VEO 3.1 VIDEO PROMPT (الوحدة والخيبة - 8 ثوانٍ)

```json
{
  "clip_id": "CLIP_A",
  "model": "veo-3.1",
  "task_type": "video_generation",
  "duration_seconds": 8,
  "use_in_final": "0-7s (first 7 seconds)",
  "frame_mode": "first_to_last",
  "first_frame": "CLIP_A_START_FRAME image",
  "last_frame": "CLIP_A_END_FRAME image",
  
  "narrative_arc": {
    "0-2s": {
      "stage": "LONELINESS",
      "action": "Single lonely fish hovers motionless in corner, colors muted and dull",
      "camera": "slow push-in toward sad fish",
      "emotion": "isolation, sadness, beautiful prison"
    },
    "2-4s": {
      "stage": "DISCOVERY",
      "action": "Fish notices own reflection in glass wall, perks up thinking it's a friend",
      "camera": "pan to show glass wall and reflection",
      "emotion": "curiosity, hope awakening"
    },
    "4-6s": {
      "stage": "FALSE HOPE",
      "action": "Fish swims eagerly toward reflection, colors start to brighten slightly",
      "camera": "track fish swimming toward glass",
      "emotion": "excitement, anticipation, hope"
    },
    "6-8s": {
      "stage": "DISAPPOINTMENT",
      "action": "Fish touches glass with nose, realizes reflection is not real, droops sadly",
      "camera": "close-up on fish touching glass, seeing blurry reflection",
      "emotion": "disappointment, sadness confirmed, loneliness deeper"
    }
  },
  
  "subject": {
    "main": "Blue Neon Tetra fish - starts as 1, ends as school of 6",
    "identity_anchor": "3cm, iridescent blue stripe nose-to-tail, red-orange lower half, translucent fins, large expressive black eyes with silver ring",
    "color_transformation": "muted dull (0-2s) → brightening (2-4s) → vibrant brilliant (4-8s)"
  },
  
  "environment": {
    "setting": "pristine planted aquarium",
    "constants": "same plants, same stones, same composition",
    "lighting_note": "CONSTANT cool blue lighting throughout - NO color temperature changes"
  },
  
  "cinematography": {
    "camera_movement": {
      "0-2s": "slow push-in toward lonely fish",
      "2-4s": "slight tilt up to see arriving fish",
      "4-6s": "dynamic tracking following school formation",
      "6-8s": "slow pull-back to wide establishing shot"
    },
    "depth_of_field": "shallow throughout"
  },
  
  "lighting": {
    "constant": true,
    "color_temperature": "4800K cool blue consistent throughout entire video",
    "style": "cool underwater ambient with caustics",
    "key_light": "soft diffused from above",
    "fill_light": "aquarium ambient",
    "CRITICAL": "DO NOT change lighting or color temperature at any point"
  },
  
  "veo_audio": {
    "enabled": true,
    "prompt": "Underwater aquarium ambiance with emotional piano underscore. Start with single melancholic piano note and quiet bubbles (0-2s). Add curious rising notes as fish notices something (2-4s). Build hopeful strings with swimming sounds (4-6s). Sudden quiet drop with sad descending note when fish touches glass (6-8s). No vocals. Cinematic emotional quality."
  },
  
  "text_handling": {
    "note": "Text is BAKED INTO start/end frame images",
    "veo_generates": "video transition between text-embedded frames",
    "post_production": "no additional text needed"
  },
  
  "loop_engineering": {
    "last_frame_preparation": {
      "color_cooling": "slight blue tint at edges",
      "camera_position": "wide shot primes for close-up restart",
      "audio_sync": "piano note return matches start"
    },
    "connection_to_first_frame": {
      "color_match": "cooling end → cold start",
      "composition_match": "wide → close-up natural progression",
      "cross_fade": "200ms in editing"
    }
  },
  
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "frame_rate": 24,
    "quality": "maximum"
  },
  
  "negative_prompts": [
    "cartoon style",
    "anime",
    "CGI look",
    "dead fish",
    "dirty water",
    "blurry",
    "watermark",
    "logo"
  ],
  
  "seed": 88721,
  
  "prompt": {
    "priority": {
      "primary": "8-second photorealistic cinematic video with emotional transformation",
      "secondary": "First-to-Last Frame mode with text baked in start/end frames"
    },
    "character": {
      "identity": "Blue Neon Tetra fish",
      "size": "3cm",
      "physical": "iridescent blue stripe nose-to-tail, red-orange lower half, translucent fins with visible rays, large expressive black eyes with silver reflection ring",
      "transformation": "muted dull lonely → vibrant brilliant joyful"
    },
    "frames": {
      "start_frame": {
        "shot": "close-up",
        "subject": "single lonely tetra, MUTED DULL colors, fins lowered",
        "lighting": "4500K cool blue low-key",
        "text_baked": "🔬 الأسماك الاجتماعية تشعر بالوحدة...",
        "text_position": "top safe zone"
      },
      "end_frame": {
        "shot": "medium shot",
        "subject": "school of 6 VIBRANT BRILLIANT tetras swimming synchronized",
        "lighting": "5600K warm golden with blue edge creep for loop",
        "text_baked": "🐟 سمكتك تحتاج رفقة",
        "text_position": "bottom safe zone"
      }
    },
    "narrative_arc": {
      "0-2s": {
        "stage": "LONELINESS",
        "action": "lonely fish hovers motionless in cold blue light",
        "camera": "slow push-in toward sad eyes",
        "lighting": "4500K cool blue",
        "emotion": "isolation, sadness"
      },
      "2-4s": {
        "stage": "ARRIVAL",
        "action": "water surface ripples, 5 new tetras descend gracefully from above",
        "camera": "slight tilt up",
        "lighting": "warming to 4800K",
        "emotion": "surprise, hope emerging"
      },
      "4-6s": {
        "stage": "TRANSFORMATION",
        "action": "original fish colors brighten dramatically, blue stripe becomes iridescent, fish swims eagerly toward group, school forms with synchronized ballet-like swimming",
        "camera": "dynamic tracking",
        "lighting": "5400K warm golden",
        "emotion": "joy, connection"
      },
      "6-8s": {
        "stage": "JOY + LOOP PREP",
        "action": "joyful celebration peak, school swims beautifully together",
        "camera": "slowly pulls back to wide shot",
        "lighting": "5600K peak → 5200K subtle cooling at edges",
        "emotion": "celebration, satisfaction"
      }
    },
    "realism_details": {
      "environment": "pristine planted aquarium with soft bokeh green plants",
      "water": "crystal clear with subtle particles",
      "fish": "caustic light patterns on scales, natural fin flutter",
      "depth_of_field": "shallow throughout"
    },
    "loop_engineering": {
      "color_transition": "5600K peak warm → 5200K cooling at edges",
      "composition": "wide shot primes for close-up loop back",
      "audio_sync": "piano note return matches start"
    },
    "exclusions": [
      "cartoon", "anime", "CGI", "3D render",
      "dead fish", "floating fish", "dirty water", "algae",
      "blurry", "watermark", "logo",
      "extra fins", "merged fish", "distorted shapes",
      "plastic look", "oversaturated", "HDR effect",
      "text generation by VEO", "pet store tank", "overcrowded"
    ]
  }
}
```

---

# 🎬 CLIP B: الوصول والتحول والفرح (8 ثوانٍ)

## 🖼️ CLIP_B_START_FRAME (= CLIP_A_END_FRAME)

> **ملاحظة:** نفس صورة CLIP_A_END_FRAME - لا حاجة لتوليد صورة جديدة!

---

## 🖼️ CLIP_B_END_FRAME - الفرح والـ CTA

```json
{
  "frame_id": "CLIP_B_END_FRAME",
  "model": "gemini-2.5-flash-image",
  "frame_type": "last_frame_clip_b",
  "chain_from": "CLIP_B_START_FRAME",
  "chain_to": "CLIP_A_START_FRAME (loop)",
  "note": "هذه الصورة تُستخدم كـ END لـ Clip B ثم Loop إلى البداية",
  
  "subject": {
    "main": "School of 6 Blue Neon Tetras swimming together in joy",
    "colors": "VIBRANT BRILLIANT - iridescent blue stripes catching golden light",
    "emotion": "joyful, connected, alive, celebration",
    "position": "center frame, synchronized beautiful formation"
  },
  
  "environment": {
    "setting": "same pristine planted aquarium",
    "background": "same plants with warm golden lighting",
    "water": "crystal clear with active caustics",
    "transformation": "same place, now full of life"
  },
  
  "text_overlay": {
    "enabled": true,
    "text_arabic": "🐟 سمكتك تحتاج رفقة!",
    "cta_line": "� احفظ وشارك",
    "brand": "@aquavo.iq",
    "position": "bottom safe zone (above 300px from bottom)",
    "max_characters_per_line": 20,
    "style": {
      "font": "DIN Next Arabic Bold",
      "fallback_fonts": ["Cairo Bold", "Noto Sans Arabic Bold"],
      "color": "#FFFFFF",
      "cta_color": "#FFD700",
      "stroke": "15pt #000000",
      "background": "rgba(0,0,0,0.7)",
      "size": "large",
      "alignment": "center"
    },
    "animation": {
      "type": "staggered-appear",
      "tool": "CapCut",
      "effect": "line 1 first, then CTA with glow"
    },
    "safe_zone": "above 300px from bottom, away from UI elements"
  },
  
  "lighting": {
    "mood": "warm golden celebration",
    "color_temperature": 5600,
    "tint": "warm orange-gold with hint of blue at edges (loop prep)",
    "key_light": "80%, camera left 45°",
    "rim_light": "40%, golden glow behind school"
  },
  
  "loop_preparation": {
    "color_hint": "slight blue creep at frame edges",
    "composition_hint": "wider shot primes for close-up loop back",
    "audio_sync": "piano note return in audio"
  },
  
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "quality": "ultra-detailed"
  },
  
  "prompt": {
    "priority": {
      "primary": "Photorealistic medium shot of 6 joyful Blue Neon Tetras with vibrant colors",
      "secondary": "Arabic CTA text baked at bottom, slight blue edges for loop"
    },
    "subject": {
      "main": "School of 6 Blue Neon Tetras",
      "count": 6,
      "size": "3cm each",
      "physical": "iridescent blue stripe, red-orange lower half, translucent fins",
      "emotional_state": "joyful, connected, celebrating",
      "color_state": "VIBRANT BRILLIANT iridescent",
      "behavior": "synchronized swimming with fin flutter",
      "position": "center frame, beautiful formation"
    },
    "realism_details": {
      "scales": "visible iridescent scales catching golden light",
      "fins": "fully extended, translucent with visible rays",
      "eyes": "large expressive with golden catchlight",
      "water": "active caustic patterns, subtle particles"
    },
    "environment": {
      "setting": "same pristine planted aquarium",
      "background": "soft bokeh green plants with warm light",
      "water": "crystal clear"
    },
    "text_overlay": {
      "text": "🐟 سمكتك تحتاج رفقة | 💾 احفظ 📤 شارك | @aquavo.iq",
      "position": "bottom third safe zone",
      "style": "white bold on semi-transparent dark box"
    },
    "lighting": {
      "style": "golden hour cinematic",
      "color_temperature": "5600K warm",
      "key_light": "80% camera left",
      "rim_light": "40% golden glow",
      "loop_prep": "slight blue creep at edges"
    },
    "exclusions": [
      "cartoon", "anime", "CGI", "3D render",
      "dead fish", "dirty water", "blurry",
      "watermark", "logo", "text artifacts",
      "extra fins", "merged fish", "overcrowded"
    ]
  },
  
  "seed": 88721
}
```

---

## 🎥 CLIP_B VEO 3.1 VIDEO PROMPT (الوصول والفرح - 8 ثوانٍ)

```json
{
  "clip_id": "CLIP_B",
  "model": "veo-3.1",
  "task_type": "video_generation",
  "duration_seconds": 8,
  "use_in_final": "0-7s (first 7 seconds)",
  "frame_mode": "first_to_last",
  "first_frame": "CLIP_B_START_FRAME image (= CLIP_A_END_FRAME)",
  "last_frame": "CLIP_B_END_FRAME image",
  
  "narrative_arc": {
    "0-2s": {
      "stage": "DESPAIR (continuation)",
      "action": "Same sad fish at glass, suddenly notices water ripple from above",
      "camera": "hold on fish, then subtle tilt up",
      "lighting": "4500K cool blue, starting to warm",
      "emotion": "sadness, then sudden attention"
    },
    "2-4s": {
      "stage": "ARRIVAL",
      "action": "5 new tetras descend gracefully from above, lonely fish looks up with wide eyes",
      "camera": "tilt up to show arriving fish, then back to lonely fish reaction",
      "lighting": "4800K warming",
      "emotion": "surprise, real hope emerging"
    },
    "4-6s": {
      "stage": "TRANSFORMATION",
      "action": "Original fish colors brighten dramatically in real-time, swims eagerly toward group",
      "camera": "dynamic tracking following fish joining school",
      "lighting": "5400K warm golden",
      "emotion": "joy, connection, relief"
    },
    "6-8s": {
      "stage": "CELEBRATION + LOOP PREP",
      "action": "School of 6 swims together in synchronized beauty, original fish now vibrant",
      "camera": "slow pull-back to wide shot showing whole school",
      "lighting": "5600K peak warm → 5200K subtle cooling at edges",
      "emotion": "celebration, satisfaction, community"
    }
  },
  
  "subject": {
    "main": "Blue Neon Tetra fish - starts alone, ends in school of 6",
    "identity_anchor": "EXACT SAME fish design as in Start Frame image - same body, same eyes, same colors - ALL arriving fish must be identical copies of the original",
    "eye_rule": "CRITICAL: ALL fish (original AND arriving fish) must have IDENTICAL eye color as Start Frame - preserve exact eye appearance",
    "all_fish_identical": "The 5 new fish descending must be EXACT COPIES of the original fish - same size, same colors, same eye design",
    "color_transformation": "muted dull (0-2s) → brightening (2-4s) → vibrant brilliant (4-8s)"
  },
  
  "environment": {
    "setting": "same pristine planted aquarium as CLIP_A",
    "constants": "same plants, same stones, same glass wall visible at start",
    "lighting_note": "CONSTANT warm golden lighting throughout - matches joyful mood"
  },
  
  "cinematography": {
    "camera_movement": {
      "0-2s": "hold on sad fish, subtle tilt up noticing ripple",
      "2-4s": "tilt up for arriving fish, back to lonely fish reaction",
      "4-6s": "dynamic tracking following transformation and joining",
      "6-8s": "slow pull-back to wide establishing shot of school"
    },
    "depth_of_field": "shallow throughout"
  },
  
  "lighting": {
    "constant": true,
    "color_temperature": "5200K warm golden consistent throughout entire video",
    "style": "warm underwater ambient with golden caustics",
    "key_light": "soft golden from above",
    "fill_light": "aquarium ambient with warm tones",
    "CRITICAL": "DO NOT change lighting or color temperature at any point"
  },
  
  "loop_engineering": {
    "last_frame_preparation": {
      "color_cooling": "slight blue tint creeping in at edges",
      "camera_position": "wide shot primes for close-up restart at CLIP_A",
      "audio_sync": "piano note return matches CLIP_A start"
    }
  },
  
  "veo_audio": {
    "enabled": true,
    "prompt": "Underwater aquarium with emotional transformation. Start with quiet sadness then water splash from above (0-2s). Magical shimmer sounds as new fish descend gracefully (2-4s). Warm orchestral swell with transformation sparkle as colors brighten (4-6s). Joyful celebration with synchronized swimming, fading to gentle piano note (6-8s). No vocals. Seamless ending for loop."
  },
  
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "frame_rate": 24,
    "quality": "maximum"
  },
  
  "prompt": {
    "ABSOLUTE_FIRST_PRIORITY": "⚠️ CRITICAL: Create a SEAMLESS CINEMATIC TRANSITION. PRESERVE EXACT SAME FISH APPEARANCE (body shape, eye color, style) FROM START FRAME to END FRAME. ALL fish including arriving ones MUST have IDENTICAL design.",
    "transition_quality": {
      "method": "Create seamless cinematic transition between Start and End frames",
      "instruction": "Gradually transform from first image to second with smooth blending of colors, lighting, and perspective for continuous natural flow",
      "movement": "Camera gently follows the action with subtle dolly movements - avoid static or jerky motion",
      "cut_style": "Make the transition invisible and professional - no abrupt changes"
    },
    "priority": {
      "CRITICAL_FIRST": "PRESERVE EXACT fish design from Start Frame - ALL fish (original AND new arrivals) must have IDENTICAL eyes, body, and colors",
      "primary": "8-second seamless video showing arrival of friends and joyful transformation",
      "secondary": "Natural gradual transition from sad fish to celebrating school of 6",
      "eye_lock": "SAME eye color on ALL fish as in Start Frame - do not modify"
    },
    "character_consistency": {
      "reference": "Use Start Frame image as EXACT reference for ALL fish in entire video",
      "eyes": "SAME as in Start Frame - preserve exact eye color and style on ALL 6 fish",
      "body": "SAME as in Start Frame - all fish must be identical copies",
      "arriving_fish": "The 5 new fish MUST look exactly like the original fish - same species, same design, same eye color",
      "rule": "DO NOT change ANY aspect of fish design - maintain from first frame to last frame"
    },
    "narrative_arc": {
      "0-2s": {
        "stage": "DESPAIR",
        "action": "sad fish at glass notices water ripple above",
        "camera": "hold then tilt up",
        "emotion": "sadness turning to attention"
      },
      "2-4s": {
        "stage": "ARRIVAL",
        "action": "5 tetras descend, lonely fish looks up with hope",
        "camera": "tilt up, then back to fish reaction",
        "emotion": "surprise, real hope"
      },
      "4-6s": {
        "stage": "TRANSFORMATION",
        "action": "fish colors brighten dramatically, swims to group",
        "camera": "dynamic tracking",
        "emotion": "joy, connection"
      },
      "6-8s": {
        "stage": "CELEBRATION",
        "action": "school swims together, vibrant colors",
        "camera": "pull back to wide shot",
        "emotion": "celebration"
      }
    },
    "exclusions": [
      "cartoon", "anime", "CGI", "3D render",
      "dead fish", "dirty water", "blurry",
      "watermark", "logo", "extra fins", "merged fish",
      "blue eyes", "gray eyes", "silver eyes", "cold eye color"
    ],
    "eye_consistency": {
      "CRITICAL": "SAME eye appearance as in Start Frame image",
      "rule": "Preserve exact eye color from reference throughout entire video",
      "never": "Do not change eye color at any point"
    }
  },
  
  "seed": 88721
}
```

---

# 🔄 FRAME CHAINING WORKFLOW (14 ثانية)

```json
{
  "frame_chaining_workflow": {
    "description": "تسلسل الإطارات لكليبين متصلين = 14 ثانية",
    
    "two_clip_chain": {
      "CLIP_A": {
        "CLIP_A_START_FRAME": {
          "generates": "VEO CLIP_A start point",
          "text": "🔬 الأسماك الاجتماعية تشعر بالوحدة...",
          "story": "سمكة وحيدة بألوان باهتة"
        },
        "CLIP_A_END_FRAME": {
          "derived_from": "VEO CLIP_A end point",
          "text": "💔 الانعكاس ليس صديقاً...",
          "story": "سمكة تلامس الزجاج، خيبة أمل",
          "chains_to": "CLIP_B_START_FRAME (same image)"
        },
        "duration": "8s (use first 7s)"
      },
      "CLIP_B": {
        "CLIP_B_START_FRAME": {
          "source": "= CLIP_A_END_FRAME (same image)",
          "text": "same as CLIP_A_END",
          "story": "نفس مشهد الخيبة"
        },
        "CLIP_B_END_FRAME": {
          "generates": "VEO CLIP_B end point",
          "text": "🐟 سمكتك تحتاج رفقة | 💾 احفظ 📤 شارك",
          "story": "6 أسماك سعيدة بألوان زاهية",
          "loops_back_to": "CLIP_A_START_FRAME"
        },
        "duration": "8s (use first 7s)"
      }
    },
    
    "final_assembly": {
      "CLIP_A": "0-7s (first 7 seconds)",
      "CLIP_B": "0-7s (first 7 seconds)",
      "total": "14 seconds",
      "loop": "CLIP_B_END → CLIP_A_START"
    },
    
    "audio_handling": "Single unified 14s audio track applied to final edit"
  }
}
```

---

# 🎬 POST-PRODUCTION WORKFLOW

```json
{
  "post_production": {
    "software": "DaVinci Resolve",
    
    "step_1_import": {
      "files": [
        "VEO generated video (8s)",
        "MASTER_AUDIO track (8s)",
        "START_FRAME image (for thumbnail)",
        "END_FRAME image (for thumbnail)"
      ]
    },
    
    "step_2_audio": {
      "action": "Replace VEO audio with MASTER_AUDIO",
      "steps": [
        "Mute or delete VEO audio track",
        "Import MASTER_AUDIO WAV",
        "Align to video start",
        "Ensure loop is seamless at 8.0s mark"
      ]
    },
    
    "step_3_loop_check": {
      "action": "Verify seamless loop",
      "steps": [
        "Duplicate clip and place end-to-end",
        "Apply 200ms cross-fade at join point",
        "Test playback for smooth transition",
        "Adjust if needed"
      ]
    },
    
    "step_4_color_grade": {
      "lut": "Teal and Orange Cinematic",
      "adjustments": [
        "Match clip start to clip end for loop",
        "Ensure cold→warm→cold temperature arc",
        "Boost fish colors without oversaturation"
      ]
    },
    
    "step_5_export": {
      "format": "H.264",
      "resolution": "1080x1920",
      "frame_rate": 24,
      "bitrate": "20 Mbps",
      "audio": "AAC 256kbps"
    }
  }
}
```

---

# 📐 SAFE ZONES (النص في الصور)

```json
{
  "safe_zones": {
    "frame_size": "1080x1920",
    "text_areas": {
      "top_text_zone": {
        "position": "150-400px from top",
        "content": "🔬 الأسماك الاجتماعية تشعر بالوحدة...",
        "used_in": "START_FRAME"
      },
      "bottom_text_zone": {
        "position": "1500-1670px from top (above bottom 250px)",
        "content": "🐟 سمكتك تحتاج رفقة | 💾 احفظ 📤 شارك | @aquavo.sa",
        "used_in": "END_FRAME"
      }
    },
    "text_style": {
      "font": "Bold Sans-Serif (GT America, Sohne, or Graphik)",
      "color": "#FFFFFF white",
      "background": "rgba(0,0,0,0.7) semi-transparent black box",
      "contrast_ratio": "4.5:1 minimum",
      "arabic_alignment": "right-to-left, center"
    }
  }
}
```

---

# ✅ FINAL CHECKLIST v4.0

| المعيار | ✓ | الحل |
|---------|---|------|
| VEO 8 ثوانٍ | ✅ | كليب واحد 8 ثوانٍ كاملة |
| النص في الصور | ✅ | مخبوز في START_FRAME و END_FRAME |
| تسلسل الـ Frames | ✅ | END_FRAME يطابق START_FRAME للـ Loop |
| الصوت الموحد | ✅ | MASTER_AUDIO يُستبدل في Post |
| Loop Engineering | ✅ | تبريد الألوان + Piano note return |
| Character Consistency | ✅ | Seed 88721 + Identity Anchor |
| Safe Zones | ✅ | النص في المناطق الآمنة |

---

# 💡 CINEMATIC LIGHTING (الإضاءة السينمائية)

```json
{
  "lighting_progression": {
    "0-2s_low_key": {
      "style": "Low Key",
      "mood": "dramatic, mysterious, sad",
      "setup": {
        "key_light": "60%, camera left 45°, 4500K cool",
        "fill_light": "15%, camera right",
        "rim_light": "20%, cool blue tint"
      },
      "characteristics": [
        "dark overall tone",
        "subject emerges from shadows",
        "high contrast",
        "cinematic feel"
      ],
      "prompt_keywords": "low-key lighting, dark shadows, subject silhouetted, high contrast, moody"
    },
    "5-8s_golden_hour": {
      "style": "Golden Hour",
      "mood": "warm, hopeful, joyful",
      "setup": {
        "key_light": "80%, camera left 45°, 5600K warm",
        "fill_light": "35%, camera right",  
        "rim_light": "40%, golden glow behind subject"
      },
      "characteristics": [
        "soft golden glow",
        "warm color temperature",
        "gentle shadows",
        "dreamy atmosphere"
      ],
      "prompt_keywords": "golden hour lighting, warm soft glow, sun-kissed natural light, cinematic depth"
    },
    "transition_technique": {
      "method": "gradual temperature shift",
      "from": "4500K cool blue",
      "to": "5600K warm golden",
      "duration": "2-5s timeframe"
    }
  }
}
```

---

# 🎯 REALISM FORMULA (صيغة الواقعية)

```json
{
  "realism_formula": {
    "source": "Tim Koda @timkoda_",
    "purpose": "Make AI output look indistinguishable from real footage",
    
    "key_elements": {
      "lighting_direction": {
        "importance": "critical",
        "technique": "soft diffused from side and slightly top",
        "effect": "reveals texture without harsh shadows"
      },
      "focus_control": {
        "importance": "high",
        "technique": "sharp on subject, gentle falloff",
        "depth_of_field": "shallow"
      },
      "exclusions": {
        "importance": "critical",
        "must_exclude": [
          "heavy smoothing",
          "retouching",
          "filters",
          "text",
          "logos",
          "watermarks",
          "cartoon style",
          "anime",
          "CGI look"
        ]
      },
      "imperfections": {
        "importance": "essential for realism",
        "add": [
          "subtle water particles",
          "caustic light patterns",
          "natural color variation",
          "slight movement blur"
        ],
        "reason": "Perfect AI looks fake. Controlled imperfections = authentic"
      }
    },
    
    "fish_specific_realism": {
      "scales": "visible iridescent scales with light reflection",
      "fins": "translucent with visible rays",
      "eyes": "reflective with catchlight",
      "movement": "natural swimming motion, slight fin flutter",
      "water": "caustic light patterns, subtle particles"
    }
  }
}
```

---

# 📈 UPSCALING SETTINGS (إعدادات الترقية)

```json
{
  "upscaling_workflow": {
    "when": "After VEO generation, before final export",
    "tool": "Magnific AI or Topaz Video AI",
    
    "magnific_settings": {
      "preset": "Low (maximum control)",
      "scale": "2x",
      "enhancement": "Standard Ultra",
      "sliders": {
        "creativity": -3,
        "hdr": 0,
        "resemblance": 3,
        "fractality": 0,
        "engine": "Automatic"
      }
    },
    
    "topaz_video_settings": {
      "model": "Proteus",
      "scale": "2x",
      "denoise": "Low",
      "sharpen": "Medium"
    },
    
    "upscale_prompt": "Enhance underwater details, sharpen fish scales and iridescence, add micro caustic light patterns, maintain natural color variation",
    
    "fish_upscale_focus": [
      "iridescent scale detail",
      "translucent fin texture",
      "eye reflection clarity",
      "water caustic patterns"
    ]
  }
}
```

---

# 🚫 DETAILED NEGATIVE PROMPTS

```json
{
  "negative_prompts_detailed": {
    "quality_issues": {
      "items": ["worst quality", "low quality", "blurry", "grainy", "noise", "pixelated", "jpeg artifacts", "compression artifacts"],
      "priority": "high"
    },
    "style_issues": {
      "items": ["cartoon", "anime", "3D render", "CGI", "digital art", "illustration", "painting", "drawing", "sketch"],
      "priority": "critical - we need photorealism"
    },
    "fish_specific": {
      "items": ["dead fish", "floating fish", "fish out of water", "pet store tank", "overcrowded tank", "dirty water", "algae", "damaged fins"],
      "priority": "high"
    },
    "composition_issues": {
      "items": ["split frame", "out of frame", "cut off", "cropped badly", "empty space", "cluttered background"],
      "priority": "medium"
    },
    "unwanted_elements": {
      "items": ["text", "logo", "watermark", "signature", "human hands", "human face", "artificial decorations"],
      "priority": "high"
    },
    "ai_artifacts": {
      "items": ["extra fins", "merged fish", "distorted shape", "unnatural colors", "plastic look", "oversaturated", "HDR effect"],
      "priority": "critical"
    }
  },
  "combined_negative_prompt": "worst quality, low quality, blurry, cartoon, anime, 3D render, CGI, dead fish, dirty water, text, logo, watermark, extra fins, distorted, plastic look, oversaturated, HDR, artifacts"
}
```

---

# 🔧 COMPLETE WORKFLOW (سير العمل الكامل)

```json
{
  "complete_production_workflow": {
    "phase_1_preparation": {
      "step_1": "Review Character Bible (Blue Neon Tetra specs)",
      "step_2": "Set seed: 88721 for consistency",
      "step_3": "Prepare text overlay content (Arabic)"
    },
    
    "phase_2_image_generation": {
      "tool": "Gemini 2.5 Flash / Nano Banana Pro",
      "step_1": {
        "task": "Generate START_FRAME",
        "includes": ["lonely fish", "muted colors", "Arabic text at top"],
        "prompt_type": "JSON structured"
      },
      "step_2": {
        "task": "Generate END_FRAME",
        "includes": ["school of fish", "vibrant colors", "CTA text at bottom"],
        "prompt_type": "JSON structured"
      },
      "quality_check": "Verify text readability, fish consistency, lighting match"
    },
    
    "phase_3_audio_generation": {
      "tool": "SUNO or UDIO",
      "task": "Generate MASTER_AUDIO 8 seconds",
      "requirements": [
        "Seamless loop",
        "Emotional arc matching video",
        "Space for text overlay",
        "No vocals"
      ],
      "export": "WAV 48kHz/24bit"
    },
    
    "phase_4_video_generation": {
      "tool": "VEO 3.1",
      "mode": "First-to-Last Frame",
      "inputs": ["START_FRAME image", "END_FRAME image"],
      "duration": "8 seconds exactly",
      "prompt": "Detailed narrative arc with lighting transformation"
    },
    
    "phase_5_post_production": {
      "tool": "DaVinci Resolve",
      "steps": [
        "Import VEO video",
        "Remove VEO audio track",
        "Import and sync MASTER_AUDIO",
        "Apply Teal-Orange LUT",
        "Color match for loop continuity",
        "Add 200ms cross-fade for loop test",
        "Verify seamless loop playback"
      ]
    },
    
    "phase_6_upscaling": {
      "tool": "Magnific AI / Topaz",
      "when": "Optional - if more detail needed",
      "settings": "As specified in Upscaling section"
    },
    
    "phase_7_export": {
      "format": "H.264",
      "resolution": "1080x1920 (9:16)",
      "frame_rate": "24fps",
      "bitrate": "20 Mbps",
      "audio": "AAC 256kbps",
      "filename": "LONELY_ONE_8s_v1.mp4"
    }
  }
}
```

---

# 📋 خطوات التنفيذ

```
1️⃣ توليد START_FRAME (صورة مع نص عربي)
   └── Gemini/Nano Banana Pro
   
2️⃣ توليد END_FRAME (صورة مع CTA عربي)
   └── Gemini/Nano Banana Pro
   
3️⃣ توليد MASTER_AUDIO (8 ثوانٍ)
   └── SUNO/UDIO
   
4️⃣ توليد الفيديو (First-to-Last Frame)
   └── VEO 3.1 (8 ثوانٍ)
   
5️⃣ Post-Production
   └── DaVinci Resolve
   └── استبدال الصوت
   └── تطبيق LUT
   └── التحقق من Loop
   └── التصدير
```

---

```
████████████████████████████████████████████████████████████████████████████
█                                                                          █
█   🏆 "THE LONELY ONE" | VIRAL EDITION v4.0                               █
█   Duration: 8 seconds | VEO-Optimized                                    █
█   ✅ Text-in-Image    ✅ Frame Chaining    ✅ Unified Audio              █
█   ✅ Loop Engineering ✅ VEO 8s Solution   ✅ Realism Formula            █
█   ✅ Cinematic Light  ✅ Upscaling         ✅ Complete Workflow          █
█                                                                          █
████████████████████████████████████████████████████████████████████████████
```

---

**AQUAVO © 2026**

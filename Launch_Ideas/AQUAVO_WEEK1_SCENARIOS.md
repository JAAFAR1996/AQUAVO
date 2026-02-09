# 🏆 السيناريوهات الستة - AQUAVO الأسبوع الأول
## OSCAR-LEVEL SCENARIOS | VEO 3.1 OPTIMIZED | 15 SECONDS MAX

---

```
████████████████████████████████████████████████████████████████████████████
█                                                                          █
█   🎬 AQUAVO WEEK 1 - 6 VIRAL VIDEOS                                     █
█   ───────────────────────────────────────                                █
█   Duration: 10-15 seconds each                                           █
█   Style: Semi-realistic + Pixar eyes                                     █
█   Character Bible: UNIFIED across all videos                             █
█   Audio: MASTER_AUDIO_PROMPT for consistency                             █
█                                                                          █
████████████████████████████████████████████████████████████████████████████
```

---

# 📖 CHARACTER BIBLE (موحد لكل الفيديوهات)

```json
{
  "character_bible_unified": {
    "artistic_style": {
      "type": "Semi-realistic with Pixar-style eyes",
      "description": "Realistic fish anatomy + expressive cartoon eyes",
      "balance": "75% realistic + 25% stylized expressiveness"
    },
    
    "fish_design": {
      "eyes": {
        "size": "35% larger than realistic",
        "shape": "round with catchlight",
        "iris_color": "#5D4037 (dark amber/brown)",
        "pupil": "large black with 2 catchlights",
        "expression": "can show emotion through size and brow"
      },
      "body": "realistic proportions for each species",
      "scales": "visible iridescence with light reflection",
      "fins": "translucent, expressive, flowing"
    },
    
    "environment": {
      "background": "100% photorealistic planted aquarium",
      "water": "crystal clear with caustic light patterns",
      "plants": "real Java fern, Anubias, moss",
      "lighting": "LED aquarium light, natural look"
    },
    
    "technical": {
      "resolution": "4K (2160x3840)",
      "aspect_ratio": "9:16",
      "frame_rate": 30,
      "color_palette": {
        "primary": "#004D61 (deep teal)",
        "secondary": "#FF6F61 (coral)",
        "accent": "#00A884 (seafoam)"
      }
    },
    
    "safe_zones": {
      "top": "250px margin (TikTok/IG icons)",
      "bottom": "300px margin (captions area)",
      "right": "120px margin (TikTok buttons)",
      "text_area": "center 1080x1420px"
    },
    
    "lighting_block": {
      "key_light": "70%, left 45°, 5600K",
      "fill_light": "20%, right, 5600K",
      "rim_light": "30%, behind subject, 4500K",
      "practicals": "subtle aquarium LED strips"
    },
    
    "seed": 88721
  }
}
```

---

# 🎵 MASTER_AUDIO_PROMPT (للكل)

```json
{
  "master_audio_prompt": {
    "generator": "Suno AI / Udio",
    "duration": "15 seconds",
    "loopable": true,
    
    "specifications": {
      "tempo": "92 BPM",
      "mood": "curiosity → surprise → resolution",
      "instruments": [
        "soft piano melody",
        "ambient synth pads",
        "gentle underwater bubbles",
        "subtle percussion"
      ],
      "genre": "Ambient Lo-Fi with wonder elements",
      "vocals": "NO vocals (instrumental only)"
    },
    
    "timeline": {
      "0-3s": {
        "element": "hook sound + rising curiosity",
        "dynamics": "attention-grabbing start"
      },
      "3-8s": {
        "element": "building tension or wonder",
        "dynamics": "emotional core"
      },
      "8-12s": {
        "element": "revelation moment",
        "dynamics": "peak emotion"
      },
      "12-15s": {
        "element": "resolution + loop preparation",
        "dynamics": "gentle fade matching start"
      }
    },
    
    "prompt": "Create a 15-second loopable instrumental track. Tempo 92 BPM. Start with curious piano notes and subtle underwater ambiance. Build gently with soft synth pads. Include a small emotional peak around 10 seconds. End with same piano note as beginning for seamless loop. No vocals. Cinematic wonder feeling. Space for voice-over."
  }
}
```

---

# 🎬 VIDEO 1: خرافة البيتا لا تحتاج فلتر

## القصة (Story Spine)

```
ACT 1 (0-3s): الخطاف
   سمكة بيتا جميلة في كوب صغير، تبدو "سعيدة"
   النص: "سمكة البيتا لا تحتاج فلتر؟ 🤔"
   
ACT 2 (3-8s): الحقيقة الصادمة
   نفس السمكة بعد أسبوع: ألوان باهتة، زعانف متآكلة
   النص: "هذا ما يحدث فعلاً..."
   
ACT 3 (8-12s): البديل الصحيح
   نفس البيتا في حوض 20 لتر مع فلتر، ألوان زاهية
   النص: "الفلتر = حياة أطول ✨"
   
ACT 4 (12-15s): CTA + Loop
   السمكة ترفرف بسعادة
   النص: "🐟 سمكتك تستحق الأفضل"
```

## الحقائق العلمية (مصدر البحث)

```json
{
  "scientific_facts": {
    "source": "2024 coospider study",
    "fact_1": "Betta in unfiltered tanks: 30% lower oxygen at night",
    "fact_2": "Ammonia buildup causes fin rot within 1-2 weeks",
    "fact_3": "Beneficial bacteria need filter surface area",
    "minimum_tank": "5 gallons (20 liters) with gentle filter"
  }
}
```

## FRAME PROMPTS

### FRAME 1: START (الخطاف)

```json
{
  "frame_id": "V1_START",
  "model": "gemini-2.5-flash-image",
  
  "prompt": {
    "priority": {
      "primary": "Beautiful Betta fish in small glass bowl, seemingly content",
      "secondary": "Ironic beauty - looks pretty but is harmful setup"
    },
    
    "subject": {
      "main": "Red/Blue Halfmoon Betta fish",
      "size": "5cm body",
      "physical": "flowing fins, vibrant red-blue gradient colors",
      "eyes": "large expressive Pixar-style, dark amber iris, curious look",
      "position": "center of small glass bowl",
      "emotion": "appearing content but subtle fatigue in eyes"
    },
    
    "environment": {
      "container": "small glass fishbowl (1 liter)",
      "water": "crystal clear but empty - no plants, no filter",
      "background": "soft bokeh living room",
      "lighting": "warm ambient, 5600K"
    },
    
    "text_overlay": {
      "text": "سمكة البيتا لا تحتاج فلتر؟ 🤔",
      "position": "top safe zone",
      "style": "white bold on dark semi-transparent box"
    },
    
    "cinematography": {
      "shot_type": "medium close-up",
      "angle": "eye level",
      "depth_of_field": "shallow, fish sharp, background bokeh"
    },
    
    "lighting": {
      "mood": "warm but slightly ominous",
      "key_light": "70%, left 45°, 5600K",
      "fill_light": "20%, right"
    },
    
    "technical": {
      "resolution": "4K",
      "aspect_ratio": "9:16"
    }
  },
  
  "seed": 88721
}
```

### FRAME 2: MIDDLE (الحقيقة)

```json
{
  "frame_id": "V1_MIDDLE",
  "model": "gemini-2.5-flash-image",
  
  "prompt": {
    "priority": {
      "primary": "Same Betta fish but showing stress signs after 1 week",
      "secondary": "Visible deterioration - fin rot, pale colors"
    },
    
    "subject": {
      "main": "SAME Red/Blue Halfmoon Betta fish - deteriorated",
      "physical": "fins with white edges (fin rot start), colors MUTED and pale",
      "eyes": "same Pixar-style but drooping, tired, sad",
      "position": "near bottom of bowl, lethargic",
      "emotion": "suffering, tired, stressed"
    },
    
    "environment": {
      "container": "same small glass fishbowl",
      "water": "slightly cloudy, visible waste particles",
      "lighting": "cooler, 4500K, slight green tint"
    },
    
    "text_overlay": {
      "text": "هذا ما يحدث فعلاً... 💔",
      "position": "center safe zone",
      "style": "white bold on dark box"
    },
    
    "cinematography": {
      "shot_type": "close-up on face",
      "angle": "slightly low angle",
      "mood": "sad documentary style"
    }
  },
  
  "seed": 88721
}
```

### FRAME 3: END (الحل)

```json
{
  "frame_id": "V1_END",
  "model": "gemini-2.5-flash-image",
  
  "prompt": {
    "priority": {
      "primary": "Same Betta fish thriving in proper 20L tank with filter",
      "secondary": "Dramatic improvement - vibrant, active, healthy"
    },
    
    "subject": {
      "main": "SAME Red/Blue Halfmoon Betta fish - THRIVING",
      "physical": "fins fully spread, VIBRANT BRILLIANT colors, iridescent shimmer",
      "eyes": "bright, happy, catchlights sparkling",
      "position": "swimming actively mid-tank",
      "emotion": "joyful, energetic, healthy"
    },
    
    "environment": {
      "container": "proper 20L planted aquarium",
      "equipment": "visible gentle sponge filter with bubbles",
      "plants": "live plants - Anubias, Java fern",
      "water": "crystal clear with visible water movement",
      "lighting": "warm 5600K with LED strip accent"
    },
    
    "text_overlay": {
      "text": "🐟 سمكتك تستحق الأفضل",
      "position": "bottom safe zone",
      "style": "white bold on teal semi-transparent box"
    },
    
    "cinematography": {
      "shot_type": "wide medium showing tank",
      "angle": "eye level hero shot",
      "mood": "triumphant, hopeful"
    }
  },
  
  "seed": 88721
}
```

## VEO 3.1 VIDEO PROMPT

```json
{
  "clip_id": "VIDEO_1_BETTA_FILTER",
  "model": "veo-3.1",
  "duration_seconds": 15,
  "frame_mode": "first_to_last",
  
  "narrative_arc": {
    "0-3s": {
      "stage": "HOOK - The Myth",
      "visual": "Beautiful Betta in tiny bowl, looks content",
      "camera": "slow push-in to fish face",
      "text": "سمكة البيتا لا تحتاج فلتر؟ 🤔",
      "audio": "curious piano notes, subtle question feeling"
    },
    "3-8s": {
      "stage": "REALITY - The Truth",
      "visual": "SAME fish deteriorating - pale, fin rot, lethargic",
      "camera": "morph transition to sad state",
      "text": "هذا ما يحدث فعلاً... 💔",
      "audio": "sad descending notes, concern building"
    },
    "8-12s": {
      "stage": "SOLUTION - The Truth",
      "visual": "SAME fish now thriving in proper tank with filter",
      "camera": "warp zoom to beautiful setup reveal",
      "text": "الفلتر = حياة أطول ✨",
      "audio": "uplifting warm orchestral swell"
    },
    "12-15s": {
      "stage": "CTA + LOOP",
      "visual": "Fish swimming happily, fins flowing",
      "camera": "slow pull back, slight cool at edges for loop",
      "text": "🐟 سمكتك تستحق الأفضل",
      "audio": "resolution, piano note matching start"
    }
  },
  
  "veo_prompt": "Cinematic 15-second video of Betta fish transformation. START: Beautiful red-blue Halfmoon Betta in small glass bowl, large expressive Pixar-style eyes with dark amber iris, curious expression, warm lighting 5600K. Camera slow push-in. TRANSITION at 3s: Morph cut to SAME fish but deteriorated - fins with white rot edges, colors muted pale, eyes tired and sad, water slightly cloudy, cool lighting 4500K. Camera holds on sad face. TRANSITION at 8s: Warp zoom reveal to SAME fish now THRIVING in 20-liter planted aquarium with visible sponge filter bubbles, colors VIBRANT BRILLIANT, fins fully spread flowing, eyes bright happy with catchlights, live plants Java fern and Anubias, crystal clear water, warm golden lighting 5600K. Camera tracking fish swimming joyfully. END at 12-15s: Fish swimming happily, slow pull-back, slight cool tint at edges. Audio: Curious piano start, sad middle, uplifting warm resolution, loop-ready ending. 4K 9:16 aspect ratio. No watermarks.",
  
  "audio_prompt": "Underwater aquarium ambiance with emotional piano. Start curious questioning notes (0-3s). Transition to sad concerned descending melody (3-8s). Build to warm hopeful orchestral swell for reveal (8-12s). Resolve with gentle piano note matching start for loop (12-15s). No vocals. Cinematic quality.",
  
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "9:16",
    "frame_rate": 30
  },
  
  "seed": 88721
}
```

---

# 🎬 VIDEO 2: خرافة السمك لا يحس بالألم

## القصة (Story Spine)

```
ACT 1 (0-3s): الخطاف الصادم
   سنارة تخترق فم سمكة (ظل فقط، ليس دموياً)
   النص: "السمك لا يحس بالألم؟"
   
ACT 2 (3-8s): الحقيقة العلمية
   تكبير على دماغ السمكة مع إضاءة مناطق الألم
   النص: "العلم أثبت: نفس مستقبلات الألم! 🧠"
   
ACT 3 (8-12s): الرحمة
   سمكة سعيدة في بيئة مثالية
   النص: "الأسماك تشعر... وتستحق الرحمة"
   
ACT 4 (12-15s): CTA
   النص: "🐟 عاملها برفق"
```

## الحقائق العلمية

```json
{
  "scientific_facts": {
    "source": "Farm Forward research, Dr. Lynne Sneddon studies",
    "fact_1": "Fish have nociceptors (pain receptors) around mouth and head",
    "fact_2": "Rainbow trout injected with acid showed clear pain responses",
    "fact_3": "Fish have opioid receptors - would be meaningless without pain capability",
    "fact_4": "Brain activity during harmful stimuli comparable to mammals",
    "quote": "Dr. Sneddon: 'physiology, neurobiology, molecular biology and brain activity comparable to mammals'"
  }
}
```

## FRAME PROMPTS

### FRAME 1: START (الخطاف)

```json
{
  "frame_id": "V2_START",
  "model": "gemini-2.5-flash-image",
  
  "prompt": {
    "priority": {
      "primary": "Artistic silhouette of fish with hook - NOT graphic, tasteful",
      "secondary": "Question the myth, emotional impact"
    },
    
    "subject": {
      "main": "Silhouette of fish with fishing hook shadow",
      "style": "artistic shadow play, NOT graphic or bloody",
      "emotion": "questioning, thought-provoking"
    },
    
    "environment": {
      "background": "deep blue gradient, underwater feel",
      "lighting": "dramatic backlit silhouette"
    },
    
    "text_overlay": {
      "text": "السمك لا يحس بالألم؟ 🤔",
      "position": "top safe zone",
      "style": "white bold on dark gradient"
    },
    
    "mood": "serious, documentary, questioning"
  }
}
```

### FRAME 2: MIDDLE (العلم)

```json
{
  "frame_id": "V2_MIDDLE",
  "model": "gemini-2.5-flash-image",
  
  "prompt": {
    "priority": {
      "primary": "X-ray style view of fish brain with pain receptors highlighted",
      "secondary": "Scientific visualization, educational"
    },
    
    "subject": {
      "main": "Stylized fish with visible nervous system",
      "visualization": "glowing neural pathways, brain highlighted",
      "style": "scientific illustration meets cinematic"
    },
    
    "environment": {
      "background": "dark with subtle grid pattern",
      "effects": "glowing teal neural connections"
    },
    
    "text_overlay": {
      "text": "نفس مستقبلات الألم! 🧠",
      "position": "center safe zone",
      "style": "white bold, scientific feel"
    }
  }
}
```

### FRAME 3: END (الرحمة)

```json
{
  "frame_id": "V2_END",
  "model": "gemini-2.5-flash-image",
  
  "prompt": {
    "priority": {
      "primary": "Happy healthy fish in beautiful aquarium",
      "secondary": "Contrast with hook - fish deserves care"
    },
    
    "subject": {
      "main": "Beautiful tropical fish (Angel fish or similar)",
      "eyes": "large expressive Pixar-style, dark amber, happy",
      "physical": "vibrant colors, flowing fins, healthy",
      "emotion": "peaceful, content, safe"
    },
    
    "environment": {
      "setting": "lush planted aquarium",
      "plants": "variety of greens, moss, ferns",
      "water": "crystal clear, caustics dancing",
      "lighting": "warm golden 5600K"
    },
    
    "text_overlay": {
      "text": "🐟 عاملها برفق",
      "position": "bottom safe zone",
      "style": "white bold on teal box"
    }
  }
}
```

## VEO 3.1 VIDEO PROMPT

```json
{
  "clip_id": "VIDEO_2_FISH_PAIN",
  "model": "veo-3.1",
  "duration_seconds": 15,
  
  "veo_prompt": "Cinematic 15-second educational video about fish pain. START: Artistic silhouette of fish with fishing hook shadow against deep blue gradient, dramatic backlit, NOT graphic - tasteful shadow art. Camera static with slight zoom. TRANSITION at 3s: Dissolve to stylized x-ray visualization of fish with glowing teal neural pathways and highlighted brain regions, scientific illustration style. Text appears: 'نفس مستقبلات الألم! 🧠'. TRANSITION at 8s: Warm wipe to beautiful Angel fish with large Pixar-style expressive eyes (dark amber iris), vibrant colors, flowing gracefully in lush planted aquarium, crystal clear water with caustic light patterns, warm golden 5600K lighting. Camera tracking fish peacefully. END 12-15s: Fish swimming serenely, gentle pull back. Audio: Serious questioning tone start, scientific revelation middle, warm peaceful resolution end. 4K 9:16. No watermarks.",
  
  "audio_prompt": "Start with serious questioning low tones (0-3s). Add scientific discovery revelation sound - gentle 'aha' moment (3-8s). Transition to warm peaceful aquarium ambiance with gentle strings (8-15s). No vocals. Documentary quality.",
  
  "seed": 88721
}
```

---

# 🎬 VIDEO 3: خرافة الطعام الزائد مفيد

## القصة (Story Spine)

```
ACT 1 (0-3s): الخطاف
   يد تسكب كمية كبيرة من الطعام في الحوض
   النص: "أطعم سمكتي 3 مرات! 🍽️"
   
ACT 2 (3-8s): الكارثة
   مياه ملوثة، طحالب، سمكة منتفخة
   النص: "الطعام الزائد = سم بطيء ☠️"
   
ACT 3 (8-12s): القاعدة الذهبية
   كمية صغيرة من الطعام، سمكة صحية
   النص: "القاعدة: ما تأكله في دقيقتين فقط ⏱️"
   
ACT 4 (12-15s): CTA
   النص: "🐟 أقل = أكثر"
```

## الحقائق العلمية

```json
{
  "scientific_facts": {
    "source": "LiveAquaria, Aquarium Advice",
    "dangers": [
      "Uneaten food rots → pollutes water",
      "Ammonia and nitrite spikes (toxic)",
      "Algae blooms",
      "Bloating and swim bladder issues",
      "Cloudy smelly water"
    ],
    "rule": "Feed only what fish can eat in 2 minutes",
    "frequency": "Once daily is sufficient for most fish"
  }
}
```

## VEO 3.1 VIDEO PROMPT

```json
{
  "clip_id": "VIDEO_3_OVERFEEDING",
  "model": "veo-3.1",
  "duration_seconds": 15,
  
  "veo_prompt": "Cinematic 15-second video about overfeeding danger. START: Human hand pouring excessive fish food into aquarium, food flakes floating everywhere, goldfish with Pixar-style eyes looking confused. Camera from inside tank looking up at food avalanche. TRANSITION at 3s: Time-lapse effect - water turning cloudy greenish, algae growing on glass, uneaten food rotting on gravel, fish looking bloated and uncomfortable, eyes sad. Dramatic lighting shift to sickly green. TRANSITION at 8s: Clean contrast - crystal clear water, tiny pinch of food, happy goldfish with bright eyes eating properly, 2-minute timer graphic overlay. Warm healthy lighting. END 12-15s: Healthy fish swimming, clean tank beauty shot. Text throughout in safe zones. Audio: Playful start, warning tones middle, resolution end. 4K 9:16.",
  
  "audio_prompt": "Start with playful 'feeding time' feeling (0-3s). Shift to concerning warning tones with subtle alarm (3-8s). Warm resolution with 'aha' learning moment (8-15s). No vocals.",
  
  "seed": 88721
}
```

---

# 🎬 VIDEO 4: السمك يحلم!

## القصة (Story Spine)

```
ACT 1 (0-3s): الخطاف المفاجئ
   سمكة نائمة في الظلام
   النص: "هل تعلم؟ السمك يحلم! 💭"
   
ACT 2 (3-8s): العلم المذهل
   تكبير على دماغ السمكة مع موجات REM
   النص: "نشاط دماغي مشابه للبشر! 🧠"
   
ACT 3 (8-12s): التخيل الفني
   فقاعة حلم: السمكة تحلم بمحيط واسع
   النص: "ماذا تحلم سمكتك؟ 🌊"
   
ACT 4 (12-15s): CTA
   النص: "🐟 دعها تنام بسلام"
```

## الحقائق العلمية

```json
{
  "scientific_facts": {
    "source": "Stanford Medicine, Science News",
    "fact_1": "Zebrafish show REM-like sleep patterns",
    "fact_2": "Neural sleep patterns analogous to mammals",
    "fact_3": "Both slow-wave sleep and REM-like activity found",
    "fact_4": "Fish regulate sleep-wake rhythm (circadian)",
    "implication": "Fish need darkness for proper rest"
  }
}
```

## VEO 3.1 VIDEO PROMPT

```json
{
  "clip_id": "VIDEO_4_FISH_DREAMS",
  "model": "veo-3.1",
  "duration_seconds": 15,
  
  "veo_prompt": "Magical cinematic 15-second video about fish dreams. START: Peaceful nighttime aquarium, single Neon Tetra with Pixar-style expressive eyes (dark amber) floating still in corner, eyes slowly closing, moonlight blue ambiance, gentle bubbles. Camera slow push-in to sleeping fish. TRANSITION at 3s: Stylized brain visualization overlay - gentle pulsing neural activity, soft glowing waves representing REM-like patterns, scientific but magical feeling. TRANSITION at 8s: Dream bubble emerging from fish - inside bubble: vast ocean vista, coral reef paradise, fish 'dreaming' of freedom and beauty. Dreamy ethereal lighting, soft bokeh. Camera orbits dream bubble. END 12-15s: Back to peaceful sleeping fish, moonlight, gentle resolution. Audio: Lullaby-like ethereal tones throughout. 4K 9:16.",
  
  "audio_prompt": "Dreamy ethereal music throughout. Start with gentle nighttime aquarium bubbles and soft piano (0-3s). Add wonder-filled ascending notes for brain visualization (3-8s). Magical orchestral swell for dream sequence (8-12s). Gentle lullaby resolution (12-15s). No vocals.",
  
  "seed": 88721
}
```

---

# 🎬 VIDEO 5: كرسي متحرك لسمكة!

## القصة (Story Spine)

```
ACT 1 (0-3s): الخطاف العاطفي
   سمكة ذهبية مقلوبة في قاع الحوض، حزينة
   النص: "سمكة لا تستطيع السباحة... 💔"
   
ACT 2 (3-8s): البطل
   رجل يصنع كرسي متحرك صغير من أنابيب
   النص: "Derek صنع لها كرسي متحرك! ♿"
   
ACT 3 (8-12s): المعجزة
   السمكة تسبح طبيعياً مع الكرسي المتحرك
   النص: "والآن تسبح بسعادة! ✨"
   
ACT 4 (12-15s): CTA العاطفي
   النص: "🐟 لا تستسلم أبداً"
```

## الحقائق

```json
{
  "facts": {
    "source": "TODAY, Mashable, KENS5 San Antonio",
    "story": "Derek Burnett, aquarium manager in San Antonio, Texas",
    "problem": "Goldfish with incurable swim bladder disease - couldn't stay upright",
    "solution": "Built tiny wheelchair using zip ties, tubing, and Styrofoam",
    "result": "Fish can now swim upright and live normally",
    "emotional_hook": "One person's creativity saved a fish's life"
  }
}
```

## VEO 3.1 VIDEO PROMPT

```json
{
  "clip_id": "VIDEO_5_FISH_WHEELCHAIR",
  "model": "veo-3.1",
  "duration_seconds": 15,
  
  "veo_prompt": "Emotional cinematic 15-second story. START: Goldfish with Pixar-style sad expressive eyes (dark amber iris) stuck upside-down at bottom of tank, unable to swim, helpless and isolated. Muted colors, low-key sad lighting. Camera close-up on desperate eyes. TRANSITION at 3s: Hands of caring person (Derek) crafting tiny wheelchair from clear tubing, zip ties, and small Styrofoam float. Workshop lighting, warm hopeful yellow tones. Detail shots of construction. TRANSITION at 8s: SAME goldfish now with wheelchair harness attached, swimming UPRIGHT and freely! Eyes bright and happy, vibrant golden colors restored, wheelchair visible but not distracting. Celebration feeling, warm golden lighting. Camera tracking joyful swimming. END 12-15s: Wide shot of fish swimming happily with wheelchair, inspiring music peak. 4K 9:16.",
  
  "audio_prompt": "Start with melancholic hopeless piano (0-3s). Transition to hopeful building music as wheelchair is crafted (3-8s). Triumphant inspiring orchestral swell for swimming reveal (8-12s). Emotional resolution with uplifting peak (12-15s). No vocals. Cinematic emotional quality.",
  
  "seed": 88721
}
```

---

# 🎬 VIDEO 6: خرافة الضوء 24 ساعة

## القصة (Story Spine)

```
ACT 1 (0-3s): الخطاف
   حوض مضاء بشكل ساطع ليلاً
   النص: "حوضك مضاء 24 ساعة؟ ⚡"
   
ACT 2 (3-8s): الكارثة
   سمكة متوترة، طحالب، عيون منهكة
   النص: "الضوء الدائم = تعذيب! 😰"
   
ACT 3 (8-12s): الإيقاع الطبيعي
   ليل طبيعي في الحوض، سمكة نائمة بسلام
   النص: "8-12 ساعة ضوء فقط 🌙"
   
ACT 4 (12-15s): CTA
   النص: "🐟 أعطها ليلاً"
```

## الحقائق العلمية

```json
{
  "scientific_facts": {
    "source": "Frontiers Marine Science 2024, Landbased AQ",
    "fact_1": "Fish have circadian rhythm like humans",
    "fact_2": "24-hour light causes: stress, immune dysfunction, sleep disruption",
    "fact_3": "Light disrupts melatonin production",
    "fact_4": "Blue light at night disturbs fish eyes and sleep",
    "fact_5": "Algae grows more with 24-hour light while plants rest",
    "quote": "24-hour light in aquaculture kills millions of farmed fish yearly",
    "recommendation": "8-12 hours of light, complete darkness at night"
  }
}
```

## VEO 3.1 VIDEO PROMPT

```json
{
  "clip_id": "VIDEO_6_LIGHT_24H",
  "model": "veo-3.1",
  "duration_seconds": 15,
  
  "veo_prompt": "Cinematic 15-second video about aquarium lighting danger. START: Aquarium with harsh bright LED lights on at NIGHT (clock showing 2 AM visible), fish with Pixar-style eyes looking stressed, darting erratically, eyes wide with stress and exhaustion, harsh cold white lighting. Camera slight shake for anxiety. TRANSITION at 3s: Close-up on fish face - exhausted eyes, darting movement, visible stress. Algae blooming on glass. Green murky tint. Unhealthy atmosphere. TRANSITION at 8s: Same tank but NOW with lights OFF - peaceful moonlight blue ambiance only, same fish now resting peacefully in corner, eyes relaxed and closed, natural night behavior. Calm serene atmosphere. TRANSITION at 10s: Sunrise effect - gentle light returning after proper night, fish waking naturally, happy refreshed. END 12-15s: Healthy day cycle, fish swimming contentedly. Audio: Anxious tones start, peaceful night middle, gentle resolution end. 4K 9:16.",
  
  "audio_prompt": "Start with anxious unsettling electronic tones, slight buzzing (0-3s). Transition to calming night ambiance, gentle water sounds (3-10s). Peaceful morning awakening with soft piano and birds (10-15s). No vocals.",
  
  "seed": 88721
}
```

---

# 📋 PRODUCTION CHECKLIST

## لكل فيديو:

```
□ توليد START_FRAME (Gemini/Higgsfield)
□ توليد MIDDLE_FRAME إذا لزم
□ توليد END_FRAME 
□ توليد VEO Video (First-to-Last Frame)
□ إنشاء AUDIO Track (Suno/Udio)
□ إضافة النصوص العربية (CapCut)
□ تطبيق Safe Zones
□ Loop Testing
□ Export 4K 9:16
```

## الأدوات المطلوبة:

```
- Gemini 2.5 Flash Image (Image Generation)
- Google VEO 3.1 (Video Generation)
- Suno AI / Udio (Audio Generation)
- CapCut (Text Animation + Editing)
- DaVinci Resolve (Color Grading + Export)
```

---

# ✅ الخلاصة

**6 فيديوهات جاهزة للإنتاج:**

| # | العنوان | المدة | الرسالة الأساسية |
|---|---------|-------|------------------|
| 1 | خرافة البيتا | 15s | البيتا تحتاج فلتر |
| 2 | السمك يحس | 15s | الأسماك تشعر بالألم |
| 3 | الطعام الزائد | 15s | أقل طعام = أفضل |
| 4 | السمك يحلم | 15s | الأسماك تحتاج نوم |
| 5 | كرسي متحرك | 15s | قصة ملهمة حقيقية |
| 6 | ضوء 24 ساعة | 15s | الظلام ضروري |

**كل السيناريوهات مبنية على:**
- ✅ حقائق علمية موثقة (2024-2025)
- ✅ معادلة الدوبامين للخطاف
- ✅ Character Bible موحد
- ✅ Safe Zones لكل منصة
- ✅ Loop Engineering للإعادة
- ✅ MASTER_AUDIO_PROMPT للتناسق

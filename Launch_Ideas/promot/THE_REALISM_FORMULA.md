# 🎯 THE REALISM FORMULA by @timkoda_

[Tim Koda (@timkoda_) • Instagram profile](https://www.instagram.com/timkoda_/)

[timkoda_ on TikTok](https://www.tiktok.com/@timkoda_?is_from_webapp=1&sender_device=pc)

[www.linkedin.com](http://www.linkedin.com/in/timkoda)

## 📋 Overview

This is the exact formula I use to create hyper-realistic macro shots that actually go viral. Most AI content looks fake because creators skip these critical steps. This formula changes everything.

**What You'll Master:**

- JSON prompt engineering for photorealistic outputs
- Upscaling techniques that add real texture
- The exact settings I use for every macro shot
- How to avoid the "AI look" that kills engagement

---

## 🧬 STEP 1: JSON Prompt Structure

### The Foundation

Every great macro shot starts with a properly structured JSON prompt. Here's why most people fail: they don't give the AI enough context about the physical environment, lighting, and camera setup.

### 📸 SKIN TEXTURE PROMPT

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Ultra-detailed close-up image of human skin",
    "secondary": "Capture realistic texture, pores, and fine lines"
  },
  "task": "generate_image",
  "subject": {
    "main": "human skin",
    "attributes": {
      "physical": "natural skin with visible pores, fine lines, and texture",
      "pose": "neutral, natural state",
      "expression": "not applicable"
    }
  },
  "environment": {
    "setting": "macro photography studio",
    "time": "controlled lighting session",
    "weather": "not applicable",
    "lighting": {
      "type": "artificial",
      "direction": "side and slightly top",
      "quality": "soft, diffused lighting that reveals texture without harsh shadows"
    }
  },
  "style": {
    "artistic": "photorealistic",
    "camera": {
      "angle": "extreme close-up",
      "lens": "macro",
      "aperture": "shallow depth of field"
    },
    "mood": "clean, intimate, clinical realism",
    "color_palette": "natural beige and warm skin tones"
  },
  "technical": {
    "resolution": "high",
    "aspect_ratio": "9:16",
    "quality": "maximum"
  },
  "constraints": {
    "framing": "extreme macro crop with skin filling most of the vertical frame",
    "focus": "sharp focus on pores and fine lines with gentle falloff toward edges",
    "exclusions": [
      "heavy makeup",
      "foundation",
      "skin smoothing",
      "retouching",
      "filters",
      "text",
      "logos",
      "watermarks"
    ]
  },
  "context_awareness": {
    "real_world_logic": true,
    "physics_accurate": true
  },
  "output_specs": {
    "use_case": "skin texture realism study, editorial macro detail, cosmetic research visuals",
    "success_criteria": "clearly visible natural pores and fine skin texture with realistic lighting"
  }
}
```

**Key Elements:**

- **Lighting:** Soft, diffused from side and top creates dimension without harsh shadows
- **Focus:** Sharp on pores/lines, gentle falloff maintains realism
- **Exclusions:** Critical - no makeup, foundation, smoothing, or retouching
- **Mood:** Clinical but intimate - this creates the documentary feel

---

### 👁️ EYE DETAIL PROMPT

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Ultra-detailed close-up image of a human eye",
    "secondary": "Capture realistic iris texture, eyelashes, and natural skin detail"
  },
  "task": "generate_image",
  "subject": {
    "main": "human eye",
    "attributes": {
      "physical": "green-hazel iris with complex radial patterns, dark pupil, visible sclera veins",
      "pose": "eye open, looking straight toward the camera",
      "expression": "neutral and calm"
    }
  },
  "environment": {
    "setting": "macro photography studio",
    "time": "controlled lighting session",
    "weather": "not applicable",
    "lighting": {
      "type": "artificial",
      "direction": "front and slightly top",
      "quality": "soft, even lighting with a subtle catchlight reflection in the pupil"
    }
  },
  "style": {
    "artistic": "photorealistic",
    "camera": {
      "angle": "eye-level extreme close-up",
      "lens": "macro",
      "aperture": "shallow depth of field"
    },
    "mood": "clean, intimate, highly realistic",
    "color_palette": "natural skin tones with green and amber iris hues"
  },
  "technical": {
    "resolution": "high",
    "aspect_ratio": "9:16",
    "quality": "maximum"
  },
  "constraints": {
    "framing": "extreme close-up with the eye centered vertically and horizontally",
    "focus": "sharp focus on iris and eyelashes, soft falloff on surrounding skin",
    "exclusions": [
      "heavy makeup",
      "eyeliner",
      "mascara clumps",
      "retouching",
      "text",
      "logos",
      "watermarks"
    ]
  },
  "context_awareness": {
    "real_world_logic": true,
    "physics_accurate": true
  },
  "output_specs": {
    "use_case": "eye macro realism study, iris detail documentation, optometric visuals",
    "success_criteria": "clearly visible iris patterns, natural eyelashes, and realistic skin around the eye"
  }
}
```

**Key Elements:**

- **Catchlight:** Subtle reflection in pupil adds life
- **Iris Detail:** Complex radial patterns are essential
- **Sclera Veins:** Visible veins = realism
- **Eyelashes:** Natural, no mascara clumps

---

### 💋 LIP TEXTURE PROMPT

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Ultra-macro close-up of slightly parted woman's lips",
    "secondary": "Hyper-realistic skin and lip texture with intimate framing"
  },
  "task": "generate_image",
  "subject": {
    "main": "woman lips",
    "attributes": {
      "physical": "natural lips with visible fine lines, pores, and subtle dryness texture",
      "pose": "lips slightly parted, revealing a small portion of teeth",
      "expression": "neutral, intimate, unposed"
    }
  },
  "environment": {
    "setting": "studio macro photography",
    "time": "controlled session",
    "weather": "not applicable",
    "lighting": {
      "type": "artificial",
      "direction": "side and top",
      "quality": "soft but directional, emphasizing texture"
    }
  },
  "style": {
    "artistic": "photorealistic",
    "camera": {
      "angle": "extreme close-up",
      "lens": "macro",
      "aperture": "very shallow depth of field"
    },
    "mood": "intimate, raw, organic",
    "color_palette": "warm natural skin tones with muted pink lips"
  },
  "technical": {
    "resolution": "high",
    "aspect_ratio": "9:16",
    "quality": "maximum"
  },
  "constraints": {
    "framing": "extreme macro crop, lips dominating the vertical frame",
    "focus": "sharp on lip texture, soft falloff into shadows",
    "exclusions": [
      "eyes",
      "full nose",
      "teeth",
      "full face",
      "makeup",
      "lipstick",
      "gloss",
      "filters",
      "text",
      "logos",
      "watermarks"
    ]
  },
  "context_awareness": {
    "real_world_logic": true,
    "physics_accurate": true
  },
  "output_specs": {
    "use_case": "lip texture macro detail, beauty editorial, skincare documentation",
    "success_criteria": "clearly visible lip lines, natural texture, and organic moisture"
  }
}
```

**Key Elements:**

- **Texture Focus:** Fine lines, pores, subtle dryness
- **Lighting:** Side and top creates depth
- **Parted Lips:** Small teeth reveal adds intimacy
- **Raw Mood:** Organic, unpolished, real

---

### 👅 TONGUE TEXTURE PROMPT

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Ultra-macro photorealistic image of a human tongue",
    "secondary": "Emphasize organic texture and natural moisture"
  },
  "task": "generate_image",
  "subject": {
    "main": "human tongue",
    "attributes": {
      "physical": "pinkish surface with clearly visible taste buds, granular texture, natural moisture",
      "pose": "tongue extended forward, slightly curved",
      "expression": "neutral, non-sexualized"
    }
  },
  "environment": {
    "setting": "macro photography studio",
    "time": "controlled session",
    "weather": "not applicable",
    "lighting": {
      "type": "artificial",
      "direction": "side and top",
      "quality": "soft but directional, highlighting surface texture"
    }
  },
  "style": {
    "artistic": "photorealistic",
    "camera": {
      "angle": "extreme close-up",
      "lens": "macro",
      "aperture": "very shallow depth of field"
    },
    "mood": "clinical, organic, highly detailed",
    "color_palette": "natural pinks and warm flesh tones"
  },
  "technical": {
    "resolution": "high",
    "aspect_ratio": "9:16",
    "quality": "maximum"
  },
  "constraints": {
    "framing": "extreme macro crop, tongue filling most of the vertical frame",
    "focus": "sharp on papillae and surface moisture, soft falloff toward edges",
    "exclusions": [
      "lips",
      "teeth",
      "full face",
      "makeup",
      "piercings",
      "food",
      "text",
      "logos",
      "watermarks"
    ]
  },
  "context_awareness": {
    "real_world_logic": true,
    "physics_accurate": true
  },
  "output_specs": {
    "use_case": "tongue texture documentation, medical macro detail, anatomical study",
    "success_criteria": "clearly visible papillae and natural surface moisture with realistic organic texture"
  }
}
```

**Key Elements:**

- **Papillae:** Taste buds must be clearly visible
- **Moisture:** Natural wetness creates realism
- **Clinical Approach:** Documentary style, not sexualized
- **Texture:** Granular, organic surface detail

---

## 🚀 STEP 2: Upscale Settings

### Why Upscaling Matters

Most people think generation is everything. Wrong. The upscale is where you add the final layer of realism that separates amateur from professional.

### Magnific AI Settings

**Tool:** Magnific AI

**Configuration:**

- **Model:** Magnific
- **Preset:** Low (gives you maximum control)
- **Scale:** 2x (sweet spot for detail without artifacts)
- **Optimization:** Standard Ultra

**Sliders:**

- **Creativity:** -3 (we want to enhance, not reimagine)
- **HDR:** 0 (neutral - natural lighting already baked in)
- **Resemblance:** 3 (high - stay true to original)
- **Fractality:** 0 (no pattern repetition)
- **Engine:** Automatic (let AI choose optimal path)

**Why These Settings:**

- Low creativity prevents hallucinations
- High resemblance maintains your original vision
- Zero fractality avoids uncanny repetitive patterns
- 2x scale adds detail without processing artifacts

---

## ✨ STEP 3: Upscale Prompts

These prompts tell Magnific exactly what texture to add during upscaling.

### For Skin Texture:

```
Add micro pores, micro hairs and sharp skin texture.
```

### For Eye Detail:

```
Crispy skin texture with visible pores and micro hair on the surface.
```

### For Lip Texture:

```
Add micro pores, micro hairs and sharp skin texture.
```

### For Tongue Texture:

```
Add micro pores, micro hairs and sharp skin texture.
```

**Pro Tip:** Keep upscale prompts short and directive. You're not generating - you're enhancing.

---

## 🎓 Understanding The System

### Why This Works:

**1. Context Awareness**
The `real_world_logic: true` and `physics_accurate: true` flags force the AI to respect actual physics. Light behaves correctly. Skin texture follows biological rules.

**2. Exclusion Strategy**
What you exclude is as important as what you include. By explicitly blocking makeup, filters, and retouching, you force authentic texture.

**3. Lighting Direction**
"Side and top" lighting creates micro-shadows that reveal texture. Front lighting flattens everything.

**4. Shallow Depth of Field**
This is non-negotiable for macro work. It mimics real camera behavior and creates that cinematic separation.

**5. The Upscale Amplifier**
Generation gives you 70% realism. The upscale with targeted prompts delivers the final 30% that makes people stop scrolling.

---

## 💎 The Realism Formula Summary

```
Structured JSON Prompt
+
Precise Lighting Direction
+
Strategic Exclusions
+
Context Awareness Flags
+
Magnific Upscale (Low Creativity, High Resemblance)
+
Targeted Upscale Prompts
=
Hyper-Realistic Macro Content That Goes Viral
```

---

## 🎬 Next Steps

1. Copy these JSON prompts
2. Run them through your AI image generator
3. Upscale with Magnific using exact settings above
4. Add upscale prompts for final texture layer
5. Post and watch engagement explode

This is the formula nobody talks about because most creators don't understand the technical depth required for true realism.

Now you do.

---

## 🔒 Want More?

This is the foundation. The advanced workflows - including:

- Multi-pass upscaling techniques
- Color grading for cinematic looks
- Animation integration strategies
- Batch processing systems

...are either already on my IG page or coming soon 😉

---

**Created by @timkoda_**
*Realism isn't random. It's engineered.*

**– Tim Koda with love ❤️**

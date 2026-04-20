---
name: ai-image-prompting
description: When writing prompts for AI image generation (NanoBanana, Google Flow, Imagen 3, Midjourney, DALL-E). Use for product photography, marketing visuals, social media content, and any visual asset creation. Covers prompt structure, camera/lens specs, lighting, composition, negative prompts, and platform-specific techniques.
metadata:
  version: 1.0.0
  last_updated: 2026-04-18
---

# AI Image Prompting — Skill Guide 2026

## Core Rule: TEXT-FREE GENERATION

> AI models CANNOT reliably render text — especially Arabic.
> NEVER ask an AI image generator to write text on an image.
> Generate clean visuals → Add text in post-production (CapCut, Canva, Figma).

---

## The 2026 Pro Prompt Formula

### Structure (in this exact order):

```
[Subject] + [Action/Pose] + [Environment/Setting] + [Lighting] + [Camera/Lens] + [Style/Mood] + [Aspect Ratio] + [Composition Notes] + [Exclusions]
```

### Example:
```
A transparent aquarium gravel siphon vacuum in action inside a planted tank.
Dirty brown water visibly being sucked upward through the clear tube.
Lush green aquatic plants slightly out of focus in background.
Dramatic side key light from left, warm fill light.
Shot on Canon R5, 85mm macro lens, f/2.0.
Professional product photography, photorealistic, editorial quality.
Vertical 9:16 aspect ratio.
Product fills top and bottom thirds — center band left as dark negative space.
No text, no typography, no labels, no watermarks, no logos.
```

---

## Building Blocks

### 1. Subject (ALWAYS first)
- Lead with the primary subject to anchor AI focus
- Be specific: "a matte black stainless steel aquarium heater" NOT "a heater"
- Describe material/texture: "transparent tube," "brushed steel," "matte black finish"

### 2. Action/State
- What is the subject doing? "in action," "installed inside tank," "laid out on surface"
- For split-screens: "Side-by-side comparison" or "Diptych"

### 3. Environment/Setting
- Where: "inside a planted freshwater aquarium," "on dark slate surface"
- Context: "surrounded by lush green plants," "crystal clear water"
- Background: "dark moody background," "out of focus bokeh"

### 4. Lighting (Critical for quality)

| Lighting Type | When to Use | Keywords |
|---|---|---|
| **Three-point** | Standard product | "three-point studio lighting" |
| **Side key** | Drama/texture | "dramatic side key light from left" |
| **Rim/backlight** | Silhouette/edge | "rim lighting defining edges" |
| **Golden hour** | Warm/inviting | "golden hour warm backlighting" |
| **Softbox** | Even/clean | "diffused softbox lighting" |
| **Chiaroscuro** | High contrast | "chiaroscuro high contrast lighting" |

### 5. Camera/Lens (Forces "pro photography" training data)

| Lens | Best For | Keywords |
|---|---|---|
| **35mm** | Full scene/context | "35mm lens, f/4.0, natural perspective" |
| **50mm** | Standard product | "50mm lens, f/2.8, clean perspective" |
| **85mm** | Portrait/detail | "85mm lens, f/1.8, shallow depth of field, creamy bokeh" |
| **Macro** | Extreme close-up | "macro lens, extreme close-up, ultra-detailed texture" |

| Camera Body | Adds | Keywords |
|---|---|---|
| **Hasselblad** | Medium format luxury | "Shot on Hasselblad X2D" |
| **Canon R5** | Pro detail | "Shot on Canon R5" |
| **Sony A7R V** | Resolution | "Shot on Sony A7R V" |
| **RED** | Cinematic | "Shot on RED Komodo" |

### 6. Style/Mood
- "Professional product photography, photorealistic"
- "Editorial, magazine-quality"
- "Commercial, high-end, premium"
- "ASMR-quality, serene, meditative"
- "Documentary-style, forensic close-up"

### 7. Aspect Ratio
- Always specify: "Vertical 9:16 aspect ratio" for reels
- Reinforce: "tall portrait orientation" or "full vertical frame"

### 8. Composition for Text Overlay
- **The Negative Space Rule:** Tell AI WHERE to leave space
- "Center band (30%-65% vertically) left as clean dark space"
- "Product fills top and bottom thirds"
- "Key elements in upper and lower portions of frame"

### 9. Exclusions (CRITICAL — always include)
```
No text, no typography, no labels, no logos, no watermarks,
no icons, no arrows, no checkmarks, no X marks,
no Arabic characters, no English characters,
no blurry edges, no distorted shapes, no plastic texture,
no cartoon, no illustration, no oversaturated colors.
```

---

## Split-Screen / Before-After Prompts

### The "Identity Lock" Formula:
```
[Layout: "Professional vertical split-screen diptych"]
+ [Global Style: "consistent studio lighting, 85mm lens, photorealistic"]
+ [Left Side: "dirty/old/broken state — describe visually"]
+ [Right Side: "clean/new/working state — describe visually"]
+ [Product Lock: "identical product placement and proportions on both sides"]
+ [Exclusions: standard list]
```

### Important:
- Do NOT use "red X" or "green checkmark" labels — these are text/icons
- Show the contrast through VISUAL DIFFERENCE only (lighting, water clarity, fish health)
- Use color temperature difference: LEFT = cold/dim/yellow, RIGHT = warm/bright/blue-white

---

## NanoBanana / Google Flow Specific Tips

### Unique Features:
1. **Ingredients (Reference Images):** Upload product photos as "ingredients" — AI maintains consistency
2. **Iterative Editing:** Don't regenerate from scratch — use follow-up prompts to refine
3. **Scribble-to-Edit:** Highlight a specific area and prompt to change just that area
4. **Avoid Negative Phrasing:** Instead of "no cars," describe scene without them: "empty street"

### Prompt Length:
- Keep under 80-100 words for best focus
- If longer, AI may "forget" early instructions
- Use the anti_ai_global field for style context, keep frame prompts focused

### Quality Boosters:
- "ultra-detailed textures"
- "8K resolution"
- "sharp focus throughout"
- "professional color grading"
- "photorealistic, not illustration"

---

## Common Mistakes to Avoid

| Mistake | Why It Fails | Fix |
|---|---|---|
| Asking AI to write Arabic text | AI cannot render Arabic script correctly | Add text in CapCut/Canva |
| Using "labeled with red X" | AI generates messy icons/text | Use visual contrast (color/light) only |
| Prompt too long (200+ words) | AI loses focus on early instructions | Keep under 100 words per frame |
| No camera/lens specification | AI uses "generic illustration" data | Always specify camera + lens |
| No exclusions | AI adds random text/watermarks | Always end with exclusion list |
| Asking for both text AND image quality | Text ruins the entire image | Text-free generation is absolute |

---

## Workflow: From Prompt to Final Reel Frame

```
1. Write nano_banana_prompt (TEXT-FREE, visual only)
2. Generate image in NanoBanana/Google Flow
3. If close but not perfect → use iterative refinement (don't start over)
4. If unwanted text appeared → use inpainting to remove it
5. Export clean image
6. Import to CapCut
7. Add text overlays using capcut_text_overlay instructions
8. Position text in safe zone (28%-68%)
```

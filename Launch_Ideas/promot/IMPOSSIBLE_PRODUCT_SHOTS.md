# How to Handle Impossible Product Shots by @timkoda_

[Tim Koda (@timkoda_) • Instagram profile](https://www.instagram.com/timkoda_/)

[timkoda_ on TikTok](https://www.tiktok.com/@timkoda_?is_from_webapp=1&sender_device=pc)

[www.linkedin.com](http://www.linkedin.com/in/timkoda)

Clients ask for impossible product photography. Most creators say no or quote $15K production costs.

I deliver in 10 minutes using this 3-step system.

---

## Introduction

Impossible shots aren't impossible anymore.

A client wanted luxury product photography in settings that don't physically exist. No photographer could deliver. Production would cost $15K+.

I delivered 50 variations in 10 minutes using AI.

This is the exact 3-step system I use.

---

## Step 1: Extract Visual Intent (Claude Project)

**What it does:**
Analyzes client brief and moodboard to extract complete visual direction before generating anything.

**The process:**

- Upload client brief + moodboard to Claude Project
- AI extracts emotional core (mood, feeling, atmosphere)
- Identifies visual influences (art style, film references, design movements)
- Defines color palette precisely
- Specifies lighting setup and direction
- Determines composition structure
- Catalogs textures and materials
- Establishes scale and perspective
- Outputs structured Visual Intent Document

**Why this matters:**
Most creators jump straight to prompting and waste hours iterating randomly. This step gives you a complete creative direction in 2 minutes. Everything after this is execution, not guessing.

**Key insight:**
The Visual Intent Document becomes your creative brief. Every decision is documented. Every generation follows this blueprint.

---

### Visual Intent Framework

Use this framework for every project. It ensures nothing is missed.

[Visual_Intent_Framework.pdf](attachment:7a2f2369-8fef-4491-93e2-7c7bf551f5f3:Visual_Intent_Framework.pdf)

This framework covers:

- Emotional core analysis
- Visual influences and references
- Color palette definition
- Lighting specifications
- Composition structure
- Texture and materiality
- Scale and perspective
- Subject style and realism level

Follow this framework inside your Claude Project for consistent, professional results every time.

---

## Step 2: Generate & Iterate Pipeline

**What it does:**
Transforms Visual Intent into actual images, then refines until perfect.

**The pipeline:**

Use this prompt to get product consistency : 

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "editing",
  "priority": {
    "primary": "Create an ultra-consistent 360° packshot of the same product (product consistency) plus a ready-to-use e-commerce '360° product sheet'.",
    "secondary": "Rely on reliable online information (exact product name, materials, official colors, design details) to avoid any shape or branding errors."
  },
  "parameters": {
    "task": "sequential_edit",
    "input_requirements": {
      "reference_images": [
        {
          "id": "PRODUCT_REF_1",
          "role": "main_reference_image",
          "notes": "Cleanest possible photo, main front view of the product, good studio-like lighting."
        }
      ],
      "optional_inputs": [
        {
          "type": "url",
          "value": "PRODUCT_URL_OPTIONAL",
          "notes": "Official product page or manufacturer link if available."
        },
        {
          "type": "text",
          "value": "PRODUCT_NAME_AND_MODEL",
          "notes": "Example: 'Sony WH-1000XM5 Black' / 'Dyson Airwrap Complete Long Nickel/Copper'."
        }
      ]
    },
    "web_research": {
      "enabled": true,
      "research_goals": [
        "Identify the exact product name and model/reference",
        "Verify overall silhouette, proportions, textures (matte/plastic/metal/glass), logo/typography and placement",
        "Confirm official colors, finishes, and relevant variants (do NOT mix variants)",
        "Collect 3–5 reliable reference images (manufacturer, major retailers, trusted reviews) strictly for visual validation"
      ],
      "source_priority": [
        "official_manufacturer_site",
        "official_documentation",
        "major_retailers",
        "trusted_reviews"
      ],
      "constraints": {
        "no_unverified_details": true,
        "no_logo_invention": true,
        "no_feature_hallucination": true
      }
    },
    "consistency_lock": {
      "mode": "product_lock",
      "preserve": [
        "silhouette",
        "proportions",
        "design_details",
        "logo_and_typography_placement",
        "materials_and_textures",
        "colors_and_finishes"
      ],
      "allow_changes": [
        "object_rotation_only",
        "minor_reflection_adjustments_for_consistency",
        "drop_shadow",
        "minimal_perspective_adjustment_if_needed_for_turntable"
      ],
      "strictness": 0.92
    },
    "render_setup": {
      "environment": {
        "background": "pure_white",
        "surface": "slightly_neutral_light_gray",
        "shadow": "soft_realistic_shadow_under_product",
        "reflection": "optional_very_subtle_reflection_10_percent"
      },
      "lighting": {
        "type": "studio_softbox",
        "quality": "diffused",
        "direction": "three_point_lighting",
        "notes": "Clean e-commerce look, no dramatic contrast."
      },
      "camera": {
        "angle": "eye_level_or_slight_high",
        "lens": "normal_50mm_equivalent",
        "distortion": "minimal",
        "framing": "centered_with_consistent_padding"
      }
    },
    "transformations": [
      {
        "step": 1,
        "action": "Clean the reference image: remove dust/imperfections, correct white balance, unify pure white background, keep the product unchanged.",
        "validate": "Product matches the reference exactly, crisp edges, uniform white background, soft realistic shadow."
      },
      {
        "step": 2,
        "action": "Generate a 360° turntable sequence: create 24 views (same exact product) at 15° increments around the vertical axis (0° to 345°). Product stays centered, same scale, same horizon, same shadow.",
        "validate": "Between frames, only rotation changes. No drift in shape, color, logo, or texture. Perfect consistency."
      },
      {
        "step": 3,
        "action": "Assemble a '360° product sheet' (contact sheet) on white background: 6x4 grid (24 frames) with even margins. Add minimal header: product name + model + official color (web-verified only).",
        "validate": "Clean e-commerce-ready sheet, perfect alignment, no invented information."
      }
    ],
    "batch": {
      "mode": "angle_sweep",
      "iterations": [
        {
          "variable": "rotation_degrees",
          "values": [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345]
        }
      ]
    }
  },
  "constraints": {
    "brand_safety": {
      "no_fake_branding": true,
      "no_wrong_model_mix": true
    },
    "image_integrity": {
      "no_shape_drift": true,
      "no_texture_drift": true,
      "no_color_shift": true,
      "no_logo_movement": true
    },
    "composition": {
      "consistent_scale": true,
      "consistent_centering": true,
      "consistent_shadow_style": true,
      "uniform_white_background": true
    }
  },
  "output_specs": {
    "deliverables": [
      {
        "name": "turntable_frames",
        "format": "png",
        "background": "solid_white",
        "count": 24,
        "naming": "PRODUCTNAME_MODEL_COLOR_###deg.png"
      },
      {
        "name": "product_sheet_360",
        "format": "png",
        "layout": "grid_6x4",
        "labels": {
          "header": "product_name_model_color_official",
          "frame_labels": "optional_degrees_small"
        }
      }
    ],
    "quality": {
      "resolution": "4k",
      "sharpness": "high",
      "compression": "lossless_or_minimal"
    },
    "aspect_ratio": {
      "frames": "1:1",
      "sheet": "4:3"
    },
    "metadata": {
      "include_synthid": true,
      "attribution": "ai_generated"
    },
    "success_criteria": [
      "24 perfectly consistent frames with no product identity drift",
      "Clean, uniform white background across all images",
      "Consistent, realistic shadows",
      "Crisp, aligned, e-commerce-ready 360° sheet",
      "Product name/model/color included only if web-verified (omit otherwise)"
    ]
  }
}
```

### Generation

- Use Visual Intent Document to create initial prompts
- Generate base concept (Midjourney, Flux, Stable Diffusion)
- Produce 10-20 variations exploring different angles/compositions
- Select strongest 3-5 concepts

### Iteration

- Refine selected concepts
- Adjust composition, lighting, color based on Visual Intent
- Generate variations of each concept
- Test different perspectives and details

### Inpainting

- Fix specific elements that need refinement
- Adjust product details, lighting, background elements
- Control precise areas without regenerating entire image
- Maintain overall composition while perfecting details

**Why this matters:**
Raw AI generation is never final. This iterative process takes good concepts and makes them client-ready. Inpainting gives you surgical control over every element.

**Key insight:**
Generate broad first, refine narrow. Don't try to get perfection in one shot. Build systematically.

---

## Step 3: Final Polish (Upscale & Refinement)

**What it does:**
Takes client-ready concepts and makes them indistinguishable from $15K photography.

**The process:**

### Upscaling

- Scale to 4K+ production resolution
- Use AI upscalers (Topaz, Magnific, or built-in tools)
- Maintain detail clarity at high resolution
- Ensure print-ready quality

### Micro-Refinement

- Perfect texture grain and surface details
- Refine lighting behavior and falloff
- Add subtle imperfections (makes it look real)
- Control reflection and shadow details
- Polish color grading to exact brand standards

**Why this matters:**
This step separates amateur AI work from professional output. Clients can't tell the difference between this and real photography. The micro-details make it believable.

**Key insight:**
Real photography has imperfections. Perfect AI looks fake. This step adds controlled imperfections that make images feel authentic.

**What clients see:**
Photoshoot-level realism. No production team. No location. No physics limitations.

---

**– Tim Koda with love ❤️**

# 🎯 YEE Products 16-20 - Professional AI Prompts
> **ملف 05: المنتجات من 16 إلى 20 - معيار الاستوديو العالمي**

---

## 📑 فهرس المنتجات

- **Product 16:** YYH-189 Algaecide (5 صور - Enhancement)
- **Product 17:** YYH-207 Methylene Blue Alt (4 صور - New)
- **Product 18:** YAN-804 Multivitamin Salt (4 صور - 1 Enhancement + 3 New)
- **Product 19:** YAN-915 Multivitamin Box (4 صور - New)
- **Product 20:** YAA-009 Culture Bricks (4 صور - New)

**إجمالي الصور:** 21 صورة
**معيار الإنتاج:** Apple/Amazon Professional Photography

---

# 📁 Product 16: YYH-189 | Algaecide 500ml
**المسار:** `client\public\images\products\yee\YYH-189`
**عدد الصور:** 5 (جميعها Enhancement)

---

## 🖼️ صورة 1: Hero Shot - Product with Aquarium Context
**الملف:** `algaecide_hero.jpg`
**النوع:** Hero Shot with Problem-Solution Visual

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Enhance YEE Algaecide 500ml bottle as powerful algae control solution",
    "secondary": "Maintain exact bottle shape, YEE branding, and label details",
    "tertiary": "Create dramatic before/after algae control visualization"
  },
  "subject": {
    "main": "YEE Algaecide 500ml bottle - reference image locked",
    "attributes": {
      "physical": "Green plastic bottle with pump dispenser, YEE logo prominent, 500ml capacity label, algae control formula text, safety instructions visible",
      "material": "Semi-transparent green plastic showing liquid inside",
      "branding": "YEE logo sharp and readable, product name clear",
      "details": "Pump mechanism in perfect condition, bottle cap secure"
    },
    "integrity": "100% shape preservation, no distortion"
  },
  "environment": {
    "setting": "Professional aquarium maintenance studio",
    "background": {
      "composition": "Split-screen concept - left side showing algae-covered glass (green murky water), right side showing crystal clear water after treatment",
      "depth": "Soft bokeh on aquarium background, product in sharp focus",
      "elements": "Healthy fish visible in clear water section, natural aquatic plants"
    },
    "lighting": {
      "type": "Rembrandt studio lighting with environmental fill",
      "key_light": "45-degree angle from top-left creating depth on bottle",
      "fill_light": "Soft white fill from right reducing harsh shadows",
      "rim_light": "Subtle backlight separating product from background",
      "quality": "Professional commercial photography standard",
      "color_temperature": "5500K neutral daylight with slight cool tint for clinical feel",
      "shadows": "Natural soft shadows grounding the product",
      "highlights": "Controlled specular highlights on pump dispenser and bottle cap"
    }
  },
  "style": {
    "artistic": "Commercial product photography with problem-solution narrative",
    "camera": {
      "lens": "85mm portrait lens for flattering perspective",
      "aperture": "f/4 for moderate depth of field",
      "shot_type": "Hero product shot at eye level",
      "angle": "Slight 3/4 turn showing front and side label"
    },
    "mood": "Powerful, effective, professional maintenance solution",
    "color_grading": "Clean commercial look with slight contrast boost"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for Instagram/E-commerce",
    "quality": "Maximum sharpness on product, bokeh on background",
    "file_format": "High-quality JPEG or PNG"
  },
  "constraints": {
    "exclusions": [
      "No blur on product labels",
      "No dead fish or severe algae damage imagery",
      "No cartoon or unrealistic effects",
      "No competing brand logos",
      "No text overlays except watermark"
    ],
    "requirements": [
      "YEE logo must be perfectly readable",
      "Bottle shape exactly as reference",
      "Professional lighting without overexposure",
      "Natural product presentation"
    ]
  },
  "output_specs": {
    "color_space": "sRGB for web",
    "bit_depth": "8-bit",
    "optimization": "Optimized for fast web loading"
  }
}
```

---

## 🖼️ صورة 2: Application Demonstration Shot
**الملف:** `algaecide_application.jpg`
**النوع:** Lifestyle Usage Demonstration

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Show proper application method of YEE Algaecide with hand dispensing into aquarium",
    "secondary": "Demonstrate ease of use and precise dosing with pump mechanism",
    "tertiary": "Communicate safety and professional aquarium care"
  },
  "subject": {
    "main": "YEE Algaecide bottle being used by hand",
    "attributes": {
      "physical": "Same bottle from reference image, pump being pressed by hand",
      "action": "Liquid being dispensed from pump into aquarium water",
      "hand": "Professional-looking hand with natural skin tone, clean nails, confident grip",
      "dosing": "Precise measured drops falling into water"
    },
    "integrity": "Exact bottle shape and branding maintained"
  },
  "environment": {
    "setting": "Home aquarium during maintenance routine",
    "background": {
      "composition": "Blurred planted aquarium in background, water surface visible in foreground",
      "depth": "Shallow depth of field focusing on bottle and hand action",
      "elements": "Clear water, healthy aquarium environment, natural daylight through window"
    },
    "lighting": {
      "type": "Natural window light with soft diffusion",
      "direction": "Soft daylight from side window creating natural shadows",
      "quality": "Bright, clean, optimistic morning light",
      "color_temperature": "5800K natural daylight",
      "atmosphere": "Approachable, safe, routine maintenance mood"
    }
  },
  "style": {
    "artistic": "Lifestyle product photography showing real-world usage",
    "camera": {
      "lens": "50mm standard lens for natural perspective",
      "aperture": "f/2.8 for subject isolation",
      "shot_type": "Medium close-up action shot",
      "angle": "Eye-level or slightly above looking down into aquarium"
    },
    "mood": "Easy, safe, routine aquarium care",
    "narrative": "Empowering hobbyist taking control of algae problem"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "16:9 for landscape presentation",
    "quality": "Sharp on hand and bottle, soft bokeh on background",
    "motion": "Frozen moment capturing dispensing action"
  },
  "constraints": {
    "exclusions": [
      "No spills or messy application",
      "No anxious or worried facial expressions if face visible",
      "No cluttered background",
      "No competing products visible"
    ],
    "requirements": [
      "Professional hand appearance",
      "Clear demonstration of pump mechanism",
      "Safe and controlled application",
      "Positive maintenance narrative"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Web-ready"
  }
}
```

---

## 🖼️ صورة 3: Before/After Comparison Infographic
**الملف:** `algaecide_before_after.jpg`
**النوع:** Problem-Solution Comparison

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "PRESERVE_PRODUCT",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create compelling before/after split-screen showing algae elimination",
    "secondary": "Position YEE Algaecide bottle at center division as the solution",
    "tertiary": "Communicate dramatic transformation and product effectiveness"
  },
  "subject": {
    "main": "YEE Algaecide bottle centered between before/after scenes",
    "attributes": {
      "physical": "Reference bottle perfectly preserved at center",
      "position": "Vertical split with product as dividing element",
      "scale": "Product prominent but not oversized, natural proportion"
    },
    "integrity": "100% bottle accuracy from reference"
  },
  "environment": {
    "setting": "Split-screen aquarium transformation",
    "left_side": {
      "condition": "Algae-covered aquarium glass",
      "elements": "Green film on glass, cloudy water, stressed fish, poor visibility",
      "lighting": "Murky, dim, unappealing green tint",
      "mood": "Problem state, neglected maintenance"
    },
    "right_side": {
      "condition": "Crystal clear aquarium after treatment",
      "elements": "Spotless clean glass, clear water, vibrant healthy fish, thriving plants",
      "lighting": "Bright, clear, sparkling clean water",
      "mood": "Solution state, professional care result"
    },
    "lighting": {
      "type": "Dramatic split lighting emphasizing contrast",
      "left": "Dim murky green lighting showing problem",
      "center": "Spotlight on product as hero solution",
      "right": "Bright clear lighting showing success",
      "quality": "Dramatic transformation narrative"
    }
  },
  "style": {
    "artistic": "Advertising infographic with transformation story",
    "camera": {
      "lens": "50mm for balanced perspective",
      "aperture": "f/5.6 for clarity across both sides",
      "shot_type": "Straight-on split-screen composition",
      "symmetry": "Perfect vertical division with product centered"
    },
    "mood": "Transformation, hope, effectiveness, professional results",
    "narrative": "From problem to solution with YEE Algaecide"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for social media",
    "quality": "High sharpness throughout for infographic clarity",
    "composition": "Perfect 50/50 split with product bridge"
  },
  "constraints": {
    "exclusions": [
      "No dead fish or severely damaged tanks",
      "No unrealistic cartoon transformations",
      "No exaggerated algae horror scenes",
      "No fake or manipulated results"
    ],
    "requirements": [
      "Realistic before/after scenarios",
      "Product perfectly centered and readable",
      "Clear visual storytelling",
      "Professional commercial advertising quality"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for social media sharing"
  }
}
```

---

## 🖼️ صورة 4: Detail Shot - Pump Mechanism Close-up
**الملف:** `algaecide_pump_detail.jpg`
**النوع:** Technical Detail Macro

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Extreme close-up of pump dispenser mechanism showing precision and quality",
    "secondary": "Highlight ease of use and accurate dosing feature",
    "tertiary": "Communicate professional-grade quality construction"
  },
  "subject": {
    "main": "Pump dispenser top of YEE Algaecide bottle",
    "attributes": {
      "physical": "White/green pump mechanism with spring-action top, dosing aperture visible",
      "material": "High-quality plastic with smooth finish",
      "details": "Pump tube visible inside bottle neck, precise dosing chamber, quality threads",
      "scale": "Macro perspective showing fine manufacturing detail"
    },
    "integrity": "Exact pump design from reference image"
  },
  "environment": {
    "setting": "Product photography macro studio",
    "background": {
      "type": "Soft gradient blur transitioning from white to soft aqua blue",
      "elements": "Abstract water droplet effects in far background bokeh",
      "depth": "Extreme shallow depth of field, background completely defocused"
    },
    "lighting": {
      "type": "Macro studio lighting with texture emphasis",
      "key_light": "Strong side lighting at 60-degree angle revealing pump texture",
      "fill_light": "Soft white fill from opposite side preventing pure black shadows",
      "rim_light": "Subtle backlight creating separation from background",
      "quality": "High-end macro product photography",
      "color_temperature": "5500K neutral white",
      "shadows": "Controlled shadows showing dimensionality",
      "highlights": "Specular highlights on pump surface showing quality plastic"
    }
  },
  "style": {
    "artistic": "Technical product macro photography",
    "camera": {
      "lens": "100mm macro lens with 1:1 magnification capability",
      "aperture": "f/8 for sufficient depth on pump mechanism",
      "shot_type": "Extreme close-up detail shot",
      "angle": "Slight overhead angle showing pump action",
      "focus": "Critical focus on pump nozzle and dosing chamber"
    },
    "mood": "Precision, quality, professional equipment",
    "aesthetic": "Apple-style product detail photography"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "1:1 square for detail focus",
    "quality": "Maximum sharpness on pump, smooth bokeh on background",
    "focus_stacking": "If needed for extended depth of field"
  },
  "constraints": {
    "exclusions": [
      "No dust or imperfections on pump",
      "No fingerprints or smudges",
      "No scratches or wear marks",
      "No distracting background elements"
    ],
    "requirements": [
      "Perfect pump cleanliness and condition",
      "Sharp detail on all in-focus areas",
      "Professional macro lighting",
      "Quality manufacturing visible"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "High-quality detail preservation"
  }
}
```

---

## 🖼️ صورة 5: E-commerce White Background
**الملف:** `algaecide_white_bg.jpg`
**النوع:** Catalog/E-commerce Standard

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Clean e-commerce product shot on pure white background",
    "secondary": "Maintain exact bottle shape, colors, and branding accuracy",
    "tertiary": "Amazon/marketplace standard photography"
  },
  "subject": {
    "main": "YEE Algaecide 500ml bottle - complete full view",
    "attributes": {
      "physical": "Entire bottle from base to pump top visible, front label facing camera",
      "branding": "YEE logo perfectly readable, all text clear and sharp",
      "color": "Accurate green bottle color, no color cast",
      "condition": "Perfect new product condition, no wear or damage"
    },
    "integrity": "100% accurate to reference image"
  },
  "environment": {
    "setting": "Professional e-commerce photography studio",
    "background": {
      "type": "Pure white (#FFFFFF)",
      "treatment": "Completely blown out white background with no texture",
      "shadows": "Natural soft shadow directly under bottle for grounding"
    },
    "lighting": {
      "type": "High-key e-commerce lighting",
      "setup": "Soft box overhead and front, white reflectors on sides",
      "quality": "Even, shadowless illumination with minimal shadows",
      "color_temperature": "5500K neutral daylight",
      "exposure": "Bright but not overexposed, preserving product detail",
      "goal": "Amazon/eBay marketplace standard lighting"
    }
  },
  "style": {
    "artistic": "E-commerce catalog photography",
    "camera": {
      "lens": "85mm portrait lens for accurate proportions",
      "aperture": "f/11 for complete depth of field",
      "shot_type": "Straight-on full product shot",
      "angle": "Eye-level, perfectly perpendicular to label",
      "positioning": "Centered in frame with equal margins"
    },
    "mood": "Clean, accurate, trustworthy product representation",
    "aesthetic": "Marketplace standard photography"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "1:1 square for marketplace compatibility",
    "quality": "Maximum sharpness throughout entire bottle",
    "background": "Pure white knockout suitable for transparent background"
  },
  "constraints": {
    "exclusions": [
      "No shadows except minimal product grounding shadow",
      "No reflections or glare obscuring labels",
      "No color cast or tinting",
      "No background texture or gradients",
      "No props or lifestyle elements"
    ],
    "requirements": [
      "Pure white background",
      "Perfect product clarity",
      "Accurate colors and branding",
      "Professional marketplace quality",
      "All text perfectly readable"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "background": "Can be knocked out to transparent PNG if needed",
    "optimization": "Optimized for marketplace upload"
  }
}
```

---

# 📁 Product 17: YYH-207 | Methylene Blue Alternative Solution 600ml
**المسار:** `client\public\images\products\yee\YYH-207`
**عدد الصور:** 4 (جميعها New Generation)

---

## 🖼️ صورة 1: Hero Shot - Laboratory Medical Aesthetic
**الملف:** `methylene_blue_hero.jpg`
**النوع:** Medical-Grade Hero Shot

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT change the bottle color - it is WHITE, not blue or transparent",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Enhance the EXACT product from reference image - WHITE OPAQUE bottle with blue label",
    "secondary": "Maintain 100% product accuracy - do NOT create a different bottle",
    "tertiary": "Add professional pharmaceutical background while preserving original product"
  },
  "subject": {
    "main": "YEE Methylene Blue Solution 600ml - EXACT as reference image",
    "CRITICAL_DESCRIPTION": "THIS IS A WHITE OPAQUE PLASTIC BOTTLE - NOT TRANSPARENT, NOT BLUE BOTTLE",
    "attributes": {
      "bottle_color": "WHITE OPAQUE plastic - NOT transparent, NOT blue, NOT clear",
      "bottle_shape": "Tall rectangular bottle with curved shoulders, white flip-top cap",
      "cap": "White flip-top dispensing cap - NOT screw cap",
      "label": "Blue label with bubble/water imagery, YEE logo at top, Methylene text in blue, Chinese characters 亚甲基蓝溶液",
      "label_image": "Blue bubbles/water drops artwork on the label",
      "size_marking": "600ml shown on label, 净含量: 600ml",
      "branding": "YEE logo (green/teal colored) at top of label",
      "text_on_label": "Methylene · 亚甲基蓝溶液, Methylene Blue Solution"
    },
    "integrity": "100% preservation - this is a WHITE bottle, never generate blue or transparent bottle"
  },
  "environment": {
    "setting": "Professional pharmaceutical studio - clean medical feel",
    "background": {
      "composition": "Soft gradient background, light grey to white",
      "depth": "Clean minimal background letting product stand out",
      "elements": "NO laboratory equipment unless very subtle and out of focus"
    },
    "lighting": {
      "type": "Clean pharmaceutical product lighting",
      "key_light": "Soft diffused light from 45-degree angle",
      "fill_light": "Gentle fill to reduce shadows",
      "quality": "Professional e-commerce photography standard",
      "color_temperature": "5500K neutral daylight",
      "atmosphere": "Clean, medical, professional"
    }
  },
  "style": {
    "artistic": "Clean pharmaceutical product photography",
    "camera": {
      "lens": "85mm portrait lens",
      "aperture": "f/8 for full product sharpness",
      "shot_type": "Hero product shot",
      "angle": "Straight-on or slight 3/4 angle showing label clearly"
    },
    "mood": "Professional, medical-grade, trustworthy",
    "color_grading": "Neutral accurate colors - preserve white bottle appearance"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for Instagram/E-commerce",
    "quality": "Sharp on entire product and label"
  },
  "constraints": {
    "CRITICAL_EXCLUSIONS": [
      "ABSOLUTELY NO transparent or blue colored bottles",
      "ABSOLUTELY NO changing the white bottle to any other color",
      "NO creating a different bottle design than the reference",
      "NO altering the label design or content"
    ],
    "exclusions": [
      "No transparent bottles",
      "No blue glass or plastic bottles",
      "No screw caps",
      "No label modifications"
    ],
    "requirements": [
      "WHITE OPAQUE bottle exactly as reference",
      "White flip-top cap as shown in reference",
      "Blue label with bubble artwork preserved",
      "YEE green logo visible",
      "Chinese text preserved"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Web-ready"
  }
}
```

---

## 🖼️ صورة 2: Blue Liquid Pour/Drip Action Shot
**الملف:** `methylene_blue_pour.jpg`
**النوع:** Dynamic Action Photography

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Capture mesmerizing moment of blue liquid being poured from bottle",
    "secondary": "Freeze liquid in mid-air showing flowing motion and dramatic color",
    "tertiary": "Communicate precision dosing and beautiful blue color payoff"
  },
  "subject": {
    "main": "YEE Methylene Blue bottle tilted with liquid pouring out",
    "attributes": {
      "bottle": "EXACT YEE 600ml WHITE OPAQUE bottle with blue label, white flip-top cap",
      "liquid": "Stream of deep royal blue liquid flowing from bottle opening",
      "motion": "Liquid frozen mid-pour showing beautiful flowing ribbon effect",
      "droplets": "Blue droplets frozen in mid-air around main stream",
      "receiving": "Laboratory measuring cup or aquarium water receiving the pour"
    }
  },
  "environment": {
    "setting": "Clean studio with pure white or dark background",
    "background": {
      "type": "Dark gradient (navy blue to black) emphasizing blue liquid glow",
      "elements": "Minimal distractions, all attention on liquid motion",
      "depth": "Completely blurred background"
    },
    "lighting": {
      "type": "High-speed photography lighting with dramatic blue accent",
      "key_light": "Strong light from behind liquid making it glow brilliantly",
      "fill_light": "Soft white fill from front lighting bottle label",
      "accent": "Blue gel light from side enhancing liquid color",
      "quality": "High-speed flash freezing motion perfectly",
      "color_temperature": "6000K bright daylight",
      "effect": "Backlit liquid glowing like blue gemstone",
      "shutter_speed": "1/8000 second to freeze droplets in perfect clarity"
    }
  },
  "style": {
    "artistic": "High-speed liquid photography with artistic composition",
    "camera": {
      "lens": "100mm macro lens for close-up action detail",
      "aperture": "f/5.6 for balance of sharpness and background blur",
      "shot_type": "Action freeze photography",
      "angle": "Side angle capturing pour trajectory and bottle",
      "timing": "Perfect moment when stream creates elegant curve"
    },
    "mood": "Dynamic, precise, mesmerizing, scientific beauty",
    "aesthetic": "Commercial liquid photography (perfume/beverage advertising style)"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "16:9 for cinematic presentation",
    "quality": "Sharp focus on liquid stream and bottle, clean freeze of motion",
    "timing": "Captured at peak aesthetic moment of pour"
  },
  "constraints": {
    "exclusions": [
      "No blurry liquid motion (must be frozen sharp)",
      "No messy spills or chaotic splashing",
      "No uncontrolled background elements",
      "No cheap or amateur lighting"
    ],
    "requirements": [
      "Perfect motion freeze with high-speed flash",
      "Glowing blue liquid showcasing color",
      "Clean professional composition",
      "Bottle branding still visible",
      "Elegant flowing aesthetic"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "High-quality for advertising use"
  }
}
```

---

## 🖼️ صورة 3: Scientific Molecular Visualization
**الملف:** `methylene_blue_molecular.jpg`
**النوع:** Scientific Infographic Overlay

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create scientific visualization showing methylene blue molecular structure",
    "secondary": "Position YEE bottle alongside scientific diagram for educational credibility",
    "tertiary": "Communicate pharmaceutical-grade formula and scientific backing"
  },
  "subject": {
    "main": "YEE Methylene Blue bottle with molecular structure overlay",
    "attributes": {
      "product": "YEE 600ml WHITE OPAQUE bottle with blue label positioned on left side of frame",
      "scientific_overlay": "Methylene blue molecular structure diagram (C16H18ClN3S) displayed as floating holographic 3D model",
      "visualization": "Blue molecular bonds and atoms connected in accurate chemical structure",
      "educational_elements": "Chemical formula text, molecular weight, therapeutic properties labels"
    }
  },
  "environment": {
    "setting": "Clean scientific laboratory or medical research facility",
    "background": {
      "type": "Cool blue-grey gradient with subtle grid pattern suggesting scientific precision",
      "elements": "Abstract DNA helix or cellular patterns in far background",
      "depth": "Layered composition with product in foreground, molecule in mid-ground, abstract science background"
    },
    "lighting": {
      "type": "Clinical scientific lighting with holographic glow effects",
      "product_light": "Clean white studio lighting on bottle",
      "molecular_glow": "Blue luminescent glow emanating from molecular structure",
      "ambient": "Cool clinical blue ambient lighting",
      "quality": "Scientific documentary/educational photography standard",
      "color_temperature": "5000K neutral with blue accent",
      "effect": "Molecular structure appears to float in 3D space with soft glow"
    }
  },
  "style": {
    "artistic": "Scientific educational infographic with product placement",
    "camera": {
      "lens": "50mm standard lens for natural perspective",
      "aperture": "f/8 for extended depth of field across composition",
      "shot_type": "Composite image combining product photo with scientific graphics",
      "angle": "Straight-on view for clarity and readability"
    },
    "mood": "Scientific, educational, trustworthy, pharmaceutical-grade",
    "aesthetic": "Medical textbook or scientific journal illustration quality"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "16:9 for educational/presentation format",
    "quality": "High clarity on both product and scientific graphics",
    "composition": "Balanced layout with product and scientific information"
  },
  "constraints": {
    "exclusions": [
      "No overly complex or cluttered scientific diagrams",
      "No inaccurate chemical structures",
      "No competing product comparisons",
      "No fear-based disease imagery"
    ],
    "requirements": [
      "Scientifically accurate molecular representation",
      "Clean professional scientific visualization",
      "Product clearly visible and branded",
      "Educational value with aesthetic appeal",
      "Trust-building scientific credibility"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Suitable for educational materials and advertising"
  }
}
```

---

## 🖼️ صورة 4: Treatment Success - Healthy Fish Result
**الملف:** `methylene_blue_result.jpg`
**النوع:** Benefit Visualization

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Show successful treatment result with healthy vibrant fish in crystal clear water",
    "secondary": "Position YEE Methylene Blue bottle as the hero product responsible for healing",
    "tertiary": "Communicate hope, healing, and effective fish health care"
  },
  "subject": {
    "main": "Healthy fish swimming in clear aquarium with YEE bottle visible",
    "attributes": {
      "fish": "Vibrant healthy tropical fish (goldfish, betta, or tropical community fish) with bright colors and active behavior",
      "health_indicators": "Clear eyes, intact fins, vibrant scales, active swimming",
      "water": "Crystal clear aquarium water with no cloudiness",
      "product": "YEE Methylene Blue WHITE OPAQUE bottle with blue label positioned elegantly near aquarium (on stand or shelf)",
      "narrative": "Visual story showing product led to this healthy result"
    }
  },
  "environment": {
    "setting": "Beautiful home aquarium in clean modern living space",
    "background": {
      "aquarium": "Well-maintained planted aquarium with healthy ecosystem",
      "elements": "Natural aquatic plants, clean gravel substrate, proper filtration visible",
      "depth": "Aquarium in focus, home environment softly blurred background",
      "atmosphere": "Peaceful, successful, rewarding fishkeeping experience"
    },
    "lighting": {
      "type": "Natural aquarium lighting with warm ambient home lighting",
      "aquarium_light": "Bright LED aquarium light showcasing plant and fish colors",
      "ambient": "Soft warm daylight from window or home lamps",
      "product_light": "Subtle spotlight on YEE bottle emphasizing it as solution",
      "quality": "Lifestyle photography with professional polish",
      "color_temperature": "5500K natural daylight with warm accents",
      "mood_lighting": "Optimistic, peaceful, success-oriented atmosphere"
    }
  },
  "style": {
    "artistic": "Lifestyle product photography with success narrative",
    "camera": {
      "lens": "35mm wide angle for environmental context",
      "aperture": "f/4 for moderate depth showing both aquarium and product",
      "shot_type": "Environmental lifestyle shot showing product benefit",
      "angle": "Eye level or slightly below showing aquarium and product together",
      "composition": "Rule of thirds with fish and product as focal points"
    },
    "mood": "Success, hope, healing, healthy fishkeeping, satisfaction",
    "narrative": "This product saved my fish - testimonial visual story"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for social media testimonial post",
    "quality": "Sharp on fish and product, soft on background",
    "color": "Vibrant natural fish colors, clean water clarity"
  },
  "constraints": {
    "exclusions": [
      "No sick or damaged fish",
      "No cloudy or dirty water",
      "No dead or floating fish",
      "No equipment clutter",
      "No depressing or negative imagery"
    ],
    "requirements": [
      "Healthy vibrant fish as stars",
      "Crystal clear water quality",
      "YEE bottle visible and credited",
      "Positive healing narrative",
      "Professional lifestyle photography quality"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for testimonial and success story marketing"
  }
}
```

---

# 📁 Product 18: YAN-804 | Multivitamin Mineral Salt 500g
**المسار:** `client\public\images\products\yee\YAN-804`
**عدد الصور:** 4 (1 Enhancement + 3 New)

---

## 🖼️ صورة 1: Hero Shot - Premium Salt Packaging (Enhancement)
**الملف:** `multivitamin_salt_hero.jpg`
**النوع:** Hero Product Shot with Enhancement

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Enhance YEE Multivitamin Mineral Salt 500g packaging as premium marine care product",
    "secondary": "Maintain exact box/bag design, branding, and product information",
    "tertiary": "Elevate presentation to luxury marine supplement level"
  },
  "subject": {
    "main": "YEE Multivitamin Mineral Salt 500g package - reference locked",
    "attributes": {
      "physical": "Standing pouch or box packaging with YEE branding, 500g weight clearly marked",
      "design": "Professional marine supplement packaging with mineral/vitamin graphics",
      "branding": "YEE logo prominent, 'Multivitamin Mineral Salt' text clear",
      "information": "Ingredient list, dosage instructions, marine care benefits visible",
      "color_scheme": "Ocean blue and white professional marine care palette"
    },
    "integrity": "100% package design preservation from reference"
  },
  "environment": {
    "setting": "Premium marine aquarium supply studio",
    "background": {
      "composition": "Soft focus marine reef aquarium in background with colorful saltwater fish and corals",
      "color": "Deep ocean blue gradient transitioning to turquoise",
      "depth": "Reef aquarium visible but softly blurred, creating premium context",
      "elements": "Clownfish, tangs, or marine angelfish swimming in background bokeh, vibrant coral silhouettes"
    },
    "lighting": {
      "type": "Premium marine product photography lighting",
      "key_light": "Soft diffused light from 45-degree creating dimensional depth",
      "fill_light": "Cool blue fill light suggesting ocean environment",
      "rim_light": "Bright rim light separating product from background with halo effect",
      "quality": "High-end marine supplement advertising standard",
      "color_temperature": "6000K daylight with cool blue ocean accent",
      "atmosphere": "Premium marine care, reef aquarium specialty",
      "special_effects": "Subtle sparkle highlights on package suggesting mineral crystals"
    }
  },
  "style": {
    "artistic": "Premium marine aquarium product photography",
    "camera": {
      "lens": "85mm portrait lens for flattering perspective",
      "aperture": "f/4 for product clarity with background context",
      "shot_type": "Hero product shot at eye level",
      "angle": "Slight 3/4 angle showing front and side panels"
    },
    "mood": "Premium, marine specialty, reef care, scientific nutrition",
    "color_grading": "Rich ocean blues with crystal clear highlights"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for Instagram/E-commerce",
    "quality": "Maximum sharpness on package, beautiful bokeh on reef background",
    "enhancement": "Elevate to premium marine supplement presentation"
  },
  "constraints": {
    "exclusions": [
      "No generic or cheap appearance",
      "No freshwater fish in background (must be marine species)",
      "No competing brand products",
      "No label distortion or blur"
    ],
    "requirements": [
      "Exact package design from reference",
      "YEE branding perfectly clear",
      "Premium marine specialty presentation",
      "Reef aquarium context appropriate",
      "Professional supplement photography quality"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for premium e-commerce presentation"
  }
}
```

---

## 🖼️ صورة 2: Mineral Crystal Macro Detail (New)
**الملف:** `multivitamin_salt_crystals.jpg`
**النوع:** Macro Product Detail

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create stunning macro shot of mineral salt crystals showing purity and quality",
    "secondary": "Capture individual crystal structure with beautiful light refraction",
    "tertiary": "Communicate premium grade minerals and natural quality"
  },
  "subject": {
    "main": "Heap of white/translucent mineral salt crystals",
    "attributes": {
      "physical": "Individual salt crystals ranging from fine powder to small crystal chunks",
      "texture": "Crystalline structure with facets catching light like diamonds",
      "color": "Pure white to slightly translucent crystals with subtle rainbow light refraction",
      "scale": "Macro perspective showing individual crystal detail",
      "surface": "Crystals resting on dark slate stone or black surface for contrast"
    }
  },
  "environment": {
    "setting": "Macro photography studio with controlled lighting",
    "background": {
      "type": "Dark gradient (black to deep blue) creating luxury contrast",
      "treatment": "Smooth bokeh with no distracting elements",
      "depth": "Extreme shallow depth of field isolating crystal heap"
    },
    "lighting": {
      "type": "Dramatic macro lighting emphasizing crystal brilliance",
      "key_light": "Strong side lighting at 70-degree angle creating crystal sparkle",
      "fill_light": "Soft white fill preventing pure black shadows",
      "rim_light": "Backlight creating diamond-like sparkle on crystal edges",
      "quality": "Jewelry photography lighting standard",
      "color_temperature": "5500K neutral creating natural crystal appearance",
      "effect": "Light refracting through crystals creating micro rainbows and sparkle",
      "atmosphere": "Precious mineral, premium quality, natural purity"
    }
  },
  "style": {
    "artistic": "Luxury macro product photography (diamond/jewelry style)",
    "camera": {
      "lens": "100mm macro lens with 2:1 magnification",
      "aperture": "f/5.6 for balance of sharpness and bokeh",
      "shot_type": "Extreme close-up macro detail",
      "angle": "Slightly overhead angle looking down on crystal heap",
      "focus": "Critical focus on foreground crystals with gradual bokeh"
    },
    "mood": "Premium, pure, natural, mineral quality, luxury ingredient",
    "aesthetic": "High-end mineral supplement advertising"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "1:1 square for detail focus",
    "quality": "Extreme sharpness on in-focus crystals, smooth bokeh falloff",
    "focus_stacking": "Multiple exposures combined for extended depth if needed"
  },
  "constraints": {
    "exclusions": [
      "No clumped or dirty appearance",
      "No moisture or contamination visible",
      "No cheap or industrial salt appearance",
      "No distracting background elements"
    ],
    "requirements": [
      "Crystal brilliance and sparkle",
      "Pure clean appearance",
      "Luxury mineral presentation",
      "Sharp macro detail",
      "Premium supplement quality"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "High detail preservation for premium presentation"
  }
}
```

---

## 🖼️ صورة 3: Marine Fish Health Benefit Visualization (New)
**الملف:** `multivitamin_salt_benefits.jpg`
**النوع:** Benefit Infographic

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create compelling visual showing healthy vibrant marine fish with YEE Multivitamin Salt package",
    "secondary": "Communicate benefits: vibrant colors, strong immunity, healthy growth",
    "tertiary": "Position product as essential marine fish nutrition supplement"
  },
  "subject": {
    "main": "YEE Multivitamin Salt package with healthy colorful marine fish",
    "attributes": {
      "product": "YEE 500g package positioned prominently in foreground or mid-ground",
      "fish": "Stunning marine fish species (clownfish, royal dottyback, flame angelfish, yellow tang) showcasing brilliant colors",
      "health_indicators": "Vibrant natural colors, active behavior, healthy fins and scales",
      "composition": "Product and fish arranged to show cause-and-effect relationship"
    }
  },
  "environment": {
    "setting": "Pristine marine reef aquarium with professional lighting",
    "background": {
      "type": "Beautiful coral reef aquascape with live corals and rocks",
      "elements": "Colorful soft corals, live rock structures, crystal clear saltwater",
      "depth": "Reef aquarium as context, product in sharp focus",
      "atmosphere": "Thriving marine ecosystem with perfect water parameters"
    },
    "lighting": {
      "type": "Premium reef aquarium lighting showcasing fish colors",
      "aquarium_light": "High-quality LED reef lighting with blue and white spectrum",
      "product_light": "Subtle additional light highlighting product package",
      "ambient": "Cool ocean blue ambient lighting",
      "quality": "Professional marine aquarium photography",
      "color_temperature": "14000K reef aquarium spectrum creating vibrant blue atmosphere",
      "effect": "Fish colors pop brilliantly under reef lighting",
      "atmosphere": "Healthy thriving reef ecosystem"
    }
  },
  "style": {
    "artistic": "Marine aquarium lifestyle photography with product placement",
    "camera": {
      "lens": "50mm standard lens for natural perspective",
      "aperture": "f/4 for balance of product and fish clarity",
      "shot_type": "Environmental product shot showing real-world benefit",
      "angle": "Eye level capturing both product and swimming fish",
      "composition": "Product positioned as foundation of healthy marine environment"
    },
    "mood": "Vibrant, healthy, thriving marine life, premium care",
    "narrative": "This product creates this beautiful healthy result"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "16:9 for landscape presentation",
    "quality": "Sharp on both product and fish, clear coral detail",
    "color": "Vibrant accurate marine fish colors under reef lighting"
  },
  "constraints": {
    "exclusions": [
      "No sick or pale fish",
      "No algae-covered or neglected aquarium",
      "No freshwater fish (must be true marine species)",
      "No competing products visible"
    ],
    "requirements": [
      "Healthy vibrant marine fish",
      "Clean professional reef aquarium",
      "YEE product clearly visible and credited",
      "Benefit narrative clear",
      "Premium marine care presentation"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for marine aquarium community sharing"
  }
}
```

---

## 🖼️ صورة 4: Dosing Instruction Flat Lay (New)
**الملف:** `multivitamin_salt_dosing.jpg`
**النوع:** Educational Flat Lay

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create clean flat lay showing proper dosing and usage of YEE Multivitamin Salt",
    "secondary": "Include measuring spoon, product package, and visual dosing guide",
    "tertiary": "Communicate ease of use and precise supplementation"
  },
  "subject": {
    "main": "YEE Multivitamin Salt package with measuring tools and instruction visual",
    "attributes": {
      "product": "YEE 500g package positioned as central element",
      "measuring_spoon": "Stainless steel or white plastic measuring spoon filled with mineral salt",
      "salt_sample": "Small portion of salt displayed showing texture and purity",
      "instructions": "Visual guide showing dosing per gallon/liter (can be graphic overlay or printed card)",
      "composition": "Clean organized flat lay arrangement"
    }
  },
  "environment": {
    "setting": "Clean studio flat lay surface",
    "background": {
      "type": "White marble, light grey stone, or ocean blue surface",
      "treatment": "Clean minimal background with no distractions",
      "texture": "Subtle natural stone or painted surface texture"
    },
    "lighting": {
      "type": "Flat lay overhead lighting",
      "setup": "Soft diffused overhead lighting creating minimal shadows",
      "quality": "Even illumination across entire flat lay composition",
      "color_temperature": "5500K neutral daylight",
      "atmosphere": "Clean, organized, instructional",
      "shadows": "Minimal natural shadows for dimensionality without distraction"
    }
  },
  "style": {
    "artistic": "Instructional flat lay product photography",
    "camera": {
      "lens": "50mm standard lens for flat lay",
      "aperture": "f/8 for full depth of field across composition",
      "shot_type": "Overhead bird's eye view",
      "angle": "Perfectly perpendicular overhead shot",
      "composition": "Organized grid or circular arrangement with product as focal point"
    },
    "mood": "Clean, organized, educational, user-friendly",
    "aesthetic": "Pinterest-style instructional flat lay"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "1:1 square for social media tutorial",
    "quality": "Sharp focus throughout entire flat lay",
    "composition": "Balanced arrangement with clear visual hierarchy"
  },
  "constraints": {
    "exclusions": [
      "No cluttered or messy arrangement",
      "No unreadable instructions or measurements",
      "No cheap or amateur presentation",
      "No competing products"
    ],
    "requirements": [
      "Clean organized composition",
      "YEE product clearly featured",
      "Measuring tools visible and clear",
      "Professional instructional quality",
      "Easy to understand visual guide"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for tutorial and instruction sharing"
  }
}
```

---

# 📁 Product 19: YAN-915 | Multivitamin Mineral Salt Box 500g
**المسار:** `client\public\images\products\yee\YAN-915`
**عدد الصور:** 4 (جميعها New)

---

## 🖼️ صورة 1: Premium Box Packaging Hero (New)
**الملف:** `multivitamin_box_hero.jpg`
**النوع:** Premium Box Hero Shot

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create premium hero shot of YEE Multivitamin Mineral Salt rigid box packaging",
    "secondary": "Communicate luxury marine supplement presentation and gift-worthy quality",
    "tertiary": "Position as premium alternative to basic pouch packaging"
  },
  "subject": {
    "main": "YEE Multivitamin Mineral Salt 500g rigid box",
    "attributes": {
      "physical": "High-quality cardboard box with premium finish (matte lamination or soft-touch coating)",
      "design": "Professional marine care design with YEE branding, mineral graphics, reef fish imagery",
      "box_style": "Standing rigid box with flip-top lid or sliding drawer design",
      "branding": "YEE logo prominent on front panel, 500g weight clearly marked",
      "information": "Product benefits, mineral composition, dosage on side panels",
      "finish": "Premium matte or soft-touch coating suggesting luxury supplement"
    }
  },
  "environment": {
    "setting": "Luxury marine aquarium supply studio with premium atmosphere",
    "background": {
      "composition": "Elegant dark gradient background (deep navy to black) creating luxury jewelry box aesthetic",
      "elements": "Soft focus premium reef aquarium in far background with vibrant corals",
      "depth": "Background heavily blurred focusing all attention on premium box",
      "props": "Box positioned on natural driftwood or polished stone pedestal"
    },
    "lighting": {
      "type": "Luxury product photography lighting (jewelry/cosmetics standard)",
      "key_light": "Soft beauty dish from 45-degree creating smooth gradients on box",
      "fill_light": "Cool blue fill light suggesting ocean premium theme",
      "rim_light": "Strong rim light creating premium halo effect around box edges",
      "quality": "High-end cosmetics/supplement advertising standard",
      "color_temperature": "5500K neutral with cool blue accent",
      "atmosphere": "Luxury, premium marine care, gift-worthy presentation",
      "effect": "Box appears to glow subtly with premium quality aura"
    }
  },
  "style": {
    "artistic": "Luxury packaging photography (perfume/cosmetics style)",
    "camera": {
      "lens": "85mm portrait lens for flattering compression",
      "aperture": "f/4 for box clarity with elegant background blur",
      "shot_type": "Hero product shot slightly below eye level (looking slightly up at product)",
      "angle": "3/4 angle showing front and side panels clearly"
    },
    "mood": "Luxury, premium, gift-worthy, marine specialty, professional-grade",
    "color_grading": "Rich deep tones with premium highlights"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for Instagram premium product posts",
    "quality": "Tack sharp on box with beautiful smooth bokeh",
    "material_rendering": "Box finish and texture rendered with luxury quality"
  },
  "constraints": {
    "exclusions": [
      "No generic or cheap box appearance",
      "No damaged or bent corners",
      "No competing products",
      "No cluttered background"
    ],
    "requirements": [
      "Premium luxury box presentation",
      "YEE branding perfectly clear",
      "High-end supplement packaging quality",
      "Gift-worthy aesthetic",
      "Professional luxury photography"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for premium e-commerce"
  }
}
```

---

## 🖼️ صورة 2: Box Open Revealing Contents (New)
**الملف:** `multivitamin_box_open.jpg`
**النوع:** Unboxing Lifestyle Shot

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create satisfying unboxing moment showing box opened with mineral salt package inside",
    "secondary": "Communicate premium packaging experience and attention to detail",
    "tertiary": "Show inner packaging protection and product presentation"
  },
  "subject": {
    "main": "YEE Multivitamin Salt box opened revealing contents",
    "attributes": {
      "box": "Premium box with lid lifted or drawer pulled out",
      "contents": "Sealed mineral salt package nestled inside box, possibly with protective tissue paper or foam",
      "inner_packaging": "Professional inner presentation showing care in packaging",
      "measuring_spoon": "Included measuring spoon visible if part of package",
      "instruction_card": "Product information card or dosing guide visible inside lid"
    }
  },
  "environment": {
    "setting": "Clean lifestyle unboxing setup on wooden table or marble surface",
    "background": {
      "type": "Soft focus home or aquarium room environment",
      "surface": "Natural wood table, marble countertop, or clean white surface",
      "depth": "Background softly blurred showing home aquarium environment",
      "atmosphere": "Premium unboxing experience at home"
    },
    "lighting": {
      "type": "Natural lifestyle lighting with subtle drama",
      "key_light": "Soft window light from side creating natural shadows",
      "fill_light": "Gentle fill from opposite side for balance",
      "quality": "Premium lifestyle product photography",
      "color_temperature": "5500K natural daylight",
      "atmosphere": "Satisfying unboxing moment, discovery, premium reveal",
      "effect": "Light emphasizing quality of inner packaging and presentation"
    }
  },
  "style": {
    "artistic": "Lifestyle unboxing photography (Apple/luxury tech style)",
    "camera": {
      "lens": "50mm standard lens for natural perspective",
      "aperture": "f/4 for focus on open box with context visible",
      "shot_type": "Slightly overhead angle capturing unboxing moment",
      "angle": "45-degree angle showing both exterior box and revealed contents",
      "composition": "Box positioned to guide eye from exterior to interior reveal"
    },
    "mood": "Satisfying, premium unboxing experience, attention to detail",
    "narrative": "Premium product deserves premium packaging"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for social media unboxing posts",
    "quality": "Sharp on open box and contents, soft on background",
    "depth": "Moderate depth of field showing unboxing experience"
  },
  "constraints": {
    "exclusions": [
      "No damaged or crushed packaging",
      "No cheap or amateur unboxing setup",
      "No cluttered surroundings",
      "No hands unless professionally manicured and styled"
    ],
    "requirements": [
      "Premium unboxing aesthetic",
      "Clear view of interior packaging quality",
      "YEE branding visible on both box and contents",
      "Professional lifestyle photography",
      "Satisfying reveal moment captured"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for unboxing experience sharing"
  }
}
```

---

## 🖼️ صورة 3: Side-by-Side with Pouch Version (New)
**الملف:** `multivitamin_box_vs_pouch.jpg`
**النوع:** Product Comparison Shot

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Show YEE Multivitamin Salt in both box and pouch versions side by side",
    "secondary": "Communicate packaging options for different customer preferences",
    "tertiary": "Position box as premium option without devaluing pouch version"
  },
  "subject": {
    "main": "YEE Multivitamin Salt box (YAN-915) and pouch (YAN-804) displayed together",
    "attributes": {
      "box_version": "Premium rigid box packaging on left or right side",
      "pouch_version": "Standard standing pouch packaging beside box",
      "positioning": "Both products given equal respect, box slightly more prominent",
      "branding": "YEE logos clear on both packages, product names visible",
      "size_indication": "Both marked as 500g showing same quantity different packaging"
    }
  },
  "environment": {
    "setting": "Clean product comparison studio setup",
    "background": {
      "type": "Neutral gradient background (white to soft blue) not favoring either package",
      "treatment": "Clean professional e-commerce style",
      "depth": "Minimal depth, focus on clear product comparison",
      "atmosphere": "Objective product information presentation"
    },
    "lighting": {
      "type": "Even product comparison lighting",
      "setup": "Soft box lighting from both sides creating even illumination",
      "quality": "E-commerce standard with no dramatic shadows",
      "color_temperature": "5500K neutral daylight",
      "evenness": "Equal lighting on both products for fair comparison",
      "atmosphere": "Informative, clear, unbiased product comparison"
    }
  },
  "style": {
    "artistic": "Product catalog comparison photography",
    "camera": {
      "lens": "50mm standard lens for accurate proportions",
      "aperture": "f/8 for complete depth of field on both products",
      "shot_type": "Straight-on dual product shot",
      "angle": "Eye level showing both packages clearly",
      "composition": "Balanced side-by-side arrangement with equal prominence"
    },
    "mood": "Informative, clear choice, option availability",
    "narrative": "Same great product, choose your preferred packaging"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "16:9 for wide comparison presentation",
    "quality": "Sharp focus on both packages equally",
    "consistency": "Matched exposure and color between both products"
  },
  "constraints": {
    "exclusions": [
      "No visual bias favoring one package over other",
      "No price tags or pricing comparison",
      "No competing brands",
      "No cluttered background"
    ],
    "requirements": [
      "Both packages clearly visible",
      "Equal photographic treatment",
      "YEE branding clear on both",
      "Professional comparison presentation",
      "Clear size/quantity indication (both 500g)"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for product comparison pages"
  }
}
```

---

## 🖼️ صورة 4: Gift Presentation Lifestyle (New)
**الملف:** `multivitamin_box_gift.jpg`
**النوع:** Gift-Worthy Lifestyle Shot

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Position YEE Multivitamin Salt box as perfect gift for aquarium hobbyists",
    "secondary": "Create warm gift-giving atmosphere suggesting thoughtful present",
    "tertiary": "Communicate premium quality worthy of gifting to fellow aquarists"
  },
  "subject": {
    "main": "YEE Multivitamin Salt premium box presented as gift",
    "attributes": {
      "product": "YEE box in pristine condition positioned as featured gift item",
      "presentation": "Box placed elegantly, possibly with subtle gift wrap accent or ribbon",
      "gift_context": "Positioned among other premium aquarium supplies or on gift table",
      "card": "Optional aquarium-themed greeting card nearby suggesting gift occasion"
    }
  },
  "environment": {
    "setting": "Warm home environment suggesting gift-giving occasion",
    "background": {
      "type": "Cozy home setting with beautiful aquarium visible in background",
      "elements": "Comfortable living room, planted aquarium, warm natural light",
      "depth": "Background softly blurred showing homey aquarist environment",
      "atmosphere": "Warm, thoughtful, special occasion for aquarium hobbyist"
    },
    "lighting": {
      "type": "Warm natural lifestyle lighting",
      "key_light": "Soft golden hour window light creating warm inviting atmosphere",
      "ambient": "Warm home lamps or aquarium light in background",
      "quality": "Lifestyle photography with emotional warmth",
      "color_temperature": "4500K warm daylight creating cozy atmosphere",
      "mood_lighting": "Inviting, thoughtful, special occasion",
      "effect": "Light creating emotional connection and gift-worthy presentation"
    }
  },
  "style": {
    "artistic": "Lifestyle gift photography with emotional narrative",
    "camera": {
      "lens": "50mm standard lens for natural perspective",
      "aperture": "f/2.8 for soft background blur with gift in focus",
      "shot_type": "Environmental lifestyle shot showing gift context",
      "angle": "Slightly above eye level creating flattering perspective",
      "composition": "Product positioned as focal point in warm home setting"
    },
    "mood": "Thoughtful, warm, special occasion, hobbyist appreciation",
    "narrative": "Perfect gift for the aquarium hobbyist in your life"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for lifestyle social posts",
    "quality": "Sharp on product, soft romantic bokeh on background",
    "color": "Warm inviting color grading"
  },
  "constraints": {
    "exclusions": [
      "No generic or cold gift presentation",
      "No price tags visible",
      "No excessive gift wrap hiding product",
      "No cluttered or messy environment"
    ],
    "requirements": [
      "YEE product clearly visible as featured gift",
      "Warm inviting atmosphere",
      "Aquarium hobby context clear",
      "Thoughtful gift-giving narrative",
      "Professional lifestyle photography quality"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for gift guide and holiday marketing"
  }
}
```

---

# 📁 Product 20: YAA-009 | High Energy Culture Bricks
**المسار:** `client\public\images\products\yee\YAA-009`
**عدد الصور:** 4 (جميعها New)

---

## 🖼️ صورة 1: Hero Shot - Professional Bio Media (New)
**الملف:** `culture_bricks_hero.jpg`
**النوع:** Professional Filtration Hero

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create professional hero shot of YEE High Energy Culture Bricks as premium biological filtration media",
    "secondary": "Communicate porous structure, beneficial bacteria colonization, and industrial aquaculture quality",
    "tertiary": "Position as serious biological filtration solution for advanced aquarists"
  },
  "subject": {
    "main": "YEE High Energy Culture Bricks - stack of ceramic bio media bricks",
    "attributes": {
      "physical": "Rectangular porous ceramic bricks (approximately 10x5x3cm each) stacked in architectural arrangement",
      "texture": "Highly porous volcanic rock-like surface with visible micropores and chambers",
      "color": "Natural earth tones (brown, terracotta, grey) suggesting fired ceramic",
      "quantity": "Stack of 5-8 bricks arranged to show different angles and porous structure",
      "branding": "YEE logo stamp or label on packaging visible near brick stack"
    }
  },
  "environment": {
    "setting": "Professional aquaculture equipment studio",
    "background": {
      "composition": "Industrial aquaculture setting with large filter system or fish farm tanks in soft focus",
      "color": "Deep blue-grey industrial aquarium equipment environment",
      "depth": "Background heavily blurred showing context without distraction",
      "elements": "Filtration equipment, canister filter components, or commercial fish farming setup in background"
    },
    "lighting": {
      "type": "Dramatic side lighting emphasizing texture and porous structure",
      "key_light": "Strong side light at 70-degree angle creating dramatic shadows in brick pores",
      "fill_light": "Soft fill from opposite side preserving detail in shadows",
      "rim_light": "Backlight separating bricks from background with edge highlights",
      "quality": "Industrial product photography with artistic drama",
      "color_temperature": "5000K neutral with slight warm tone emphasizing natural ceramic",
      "atmosphere": "Professional, industrial-grade, serious biological filtration",
      "effect": "Light dramatically revealing porous structure and surface texture"
    }
  },
  "style": {
    "artistic": "Industrial product photography with architectural presentation",
    "camera": {
      "lens": "85mm portrait lens for flattering perspective",
      "aperture": "f/5.6 for brick clarity with background context",
      "shot_type": "Hero product shot at eye level",
      "angle": "Slight 3/4 angle showing brick stack architecture and porous sides"
    },
    "mood": "Professional, industrial-grade, biological filtration power, aquaculture quality",
    "color_grading": "Earthy natural tones with industrial contrast"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for Instagram/E-commerce",
    "quality": "Sharp detail on porous texture, professional background blur",
    "texture_rendering": "Porous ceramic texture rendered with high detail"
  },
  "constraints": {
    "exclusions": [
      "No cheap or amateur appearance",
      "No algae or dirt on bricks (must be clean new product)",
      "No competing filtration media",
      "No cluttered aquarium hobby setup"
    ],
    "requirements": [
      "Professional industrial filtration presentation",
      "Porous structure clearly visible",
      "YEE branding present",
      "Aquaculture-grade quality communicated",
      "Dramatic texture emphasis"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for professional aquaculture marketing"
  }
}
```

---

## 🖼️ صورة 2: Macro Porous Structure Detail (New)
**الملف:** `culture_bricks_macro.jpg`
**النوع:** Extreme Macro Texture

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Extreme close-up macro shot showing porous structure and micropores of culture brick",
    "secondary": "Communicate massive surface area for beneficial bacteria colonization",
    "tertiary": "Show scientific/technical quality of biological filtration media"
  },
  "subject": {
    "main": "Extreme close-up of YEE Culture Brick porous surface",
    "attributes": {
      "physical": "Highly magnified view of ceramic brick surface showing thousands of micropores and chambers",
      "texture": "Volcanic rock-like porous texture with visible cavities and channels",
      "detail": "Individual pore openings visible, rough ceramic texture, fired clay structure",
      "scale": "Macro perspective making small pores look like caves and tunnels",
      "scientific": "Surface structure suggesting massive colonization potential for nitrifying bacteria"
    }
  },
  "environment": {
    "setting": "Macro photography studio with controlled lighting",
    "background": {
      "type": "Completely blurred abstract background (dark blue or black)",
      "treatment": "Smooth bokeh with no recognizable elements",
      "depth": "Extreme shallow depth of field isolating surface texture"
    },
    "lighting": {
      "type": "Dramatic macro lighting emphasizing depth and texture",
      "key_light": "Raking side light at sharp angle creating deep shadows in pores",
      "fill_light": "Minimal fill preserving dramatic texture shadows",
      "quality": "Scientific macro photography standard",
      "color_temperature": "5500K neutral white revealing natural ceramic color",
      "effect": "Light creating extreme three-dimensional texture effect",
      "atmosphere": "Scientific, technical, massive surface area visualization"
    }
  },
  "style": {
    "artistic": "Scientific macro photography (SEM microscope aesthetic)",
    "camera": {
      "lens": "100mm macro lens with extension tubes for extreme magnification",
      "aperture": "f/11 for extended depth across porous surface",
      "shot_type": "Extreme close-up macro detail",
      "angle": "Raking angle across surface emphasizing depth of pores",
      "focus": "Focus stacking for extended sharpness across textured surface"
    },
    "mood": "Scientific, technical, massive biological capacity, aquaculture research",
    "aesthetic": "Scientific documentation/research photography"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "1:1 square for detail focus",
    "quality": "Maximum sharpness on porous texture with focus stacking",
    "magnification": "High magnification showing individual pore structure"
  },
  "constraints": {
    "exclusions": [
      "No dirt or contamination in pores",
      "No algae or biofilm (must show clean new product)",
      "No distracting background elements",
      "No soft or blurry macro focus"
    ],
    "requirements": [
      "Extreme sharpness on porous texture",
      "Dramatic lighting revealing depth",
      "Scientific documentation quality",
      "Clear visualization of massive surface area",
      "Professional macro technique"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "High detail preservation for technical documentation"
  }
}
```

---

## 🖼️ صورة 3: Bacteria Colonization Visualization (New)
**الملف:** `culture_bricks_bacteria.jpg`
**النوع:** Scientific Visualization

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Create scientific visualization showing beneficial bacteria colonization on YEE Culture Bricks",
    "secondary": "Illustrate nitrogen cycle bacteria (Nitrosomonas, Nitrobacter) living in brick pores",
    "tertiary": "Communicate biological filtration science and bacterial ecosystem establishment"
  },
  "subject": {
    "main": "YEE Culture Brick with scientific bacteria visualization overlay",
    "attributes": {
      "brick": "Culture brick as base subject showing porous structure",
      "bacteria_visualization": "Artistic/scientific rendering of beneficial bacteria colonies in and on brick surface",
      "representation": "Bacteria shown as glowing bio-luminescent colonies (green/blue glow) coating brick surface and filling pores",
      "scientific_accuracy": "Suggestion of biofilm formation and bacterial colonization patterns",
      "educational_graphics": "Nitrogen cycle arrows or labels showing ammonia → nitrite → nitrate conversion"
    }
  },
  "environment": {
    "setting": "Scientific educational visualization environment",
    "background": {
      "type": "Dark blue-black gradient suggesting aquarium water environment",
      "elements": "Abstract nitrogen cycle graphics (NH3, NO2, NO3 molecular formulas) floating in background",
      "depth": "Layered composition with brick foreground, bacteria mid-ground, cycle graphics background",
      "atmosphere": "Educational scientific documentation aesthetic"
    },
    "lighting": {
      "type": "Scientific visualization lighting with bio-luminescent effects",
      "brick_light": "Standard product lighting on culture brick",
      "bacteria_glow": "Green/blue bioluminescent glow from bacterial colonies",
      "ambient": "Cool scientific blue ambient lighting",
      "quality": "Educational documentary/textbook illustration standard",
      "color_temperature": "5000K neutral with cool blue scientific accent",
      "effect": "Bacteria appear to glow showing active living colonization",
      "atmosphere": "Scientific, educational, biological process visualization"
    }
  },
  "style": {
    "artistic": "Scientific educational visualization (documentary/textbook style)",
    "camera": {
      "lens": "50mm standard lens for clear presentation",
      "aperture": "f/8 for clarity across visualization layers",
      "shot_type": "Straight-on educational documentation shot",
      "angle": "Eye level showing brick and bacteria visualization clearly"
    },
    "mood": "Scientific, educational, biological filtration process, nitrogen cycle",
    "aesthetic": "Educational documentary/aquaculture research presentation"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "16:9 for educational presentation",
    "quality": "Clear focus on both brick and visualization elements",
    "composition": "Balanced educational layout with clear visual hierarchy"
  },
  "constraints": {
    "exclusions": [
      "No scary or gross bacteria imagery",
      "No scientifically inaccurate representations",
      "No overly complex or cluttered diagrams",
      "No competing filtration products"
    ],
    "requirements": [
      "Scientifically appropriate bacteria visualization",
      "Clear educational value",
      "YEE product central to presentation",
      "Nitrogen cycle connection clear",
      "Professional educational quality"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for educational content and scientific marketing"
  }
}
```

---

## 🖼️ صورة 4: Installation in Filter System (New)
**الملف:** `culture_bricks_installation.jpg`
**النوع:** Usage Demonstration

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "enhancement",
  "reference_image_policy": "STRICT_ADHERENCE",
  "product_preservation": {
    "mode": "ABSOLUTE_LOCK",
    "rules": [
      "DO NOT modify, alter, or change the product in any way",
      "DO NOT add elements to the product that don't exist in the reference",
      "DO NOT remove any details from the product",
      "DO NOT change product colors, shape, or proportions",
      "DO NOT reposition labels, logos, or text on the product",
      "PRESERVE 100% of the original product appearance"
    ],
    "allowed_changes": "ONLY background, lighting, and environment can be enhanced",
    "product_lock": true
  },
  "watermark": {
    "enabled": true,
    "position": "bottom_right_corner (fixed)",
    "content": "AQUAVO Logo only (no text, no website)",
    "style": "Semi-transparent (30% opacity)",
    "size": "10% of image width"
  },
  "priority": {
    "primary": "Show YEE Culture Bricks installed in professional filter system demonstrating real-world usage",
    "secondary": "Communicate proper installation and integration into biological filtration setup",
    "tertiary": "Position as essential component of professional aquarium filtration"
  },
  "subject": {
    "main": "YEE Culture Bricks installed inside canister filter or sump biological chamber",
    "attributes": {
      "bricks": "Multiple culture bricks arranged in filter media tray or basket",
      "filter_system": "Professional canister filter or aquarium sump with biological filtration chamber",
      "installation": "Bricks properly stacked or arranged showing correct usage",
      "water_flow": "Visual indication of water flowing through bricks (subtle water movement or flow arrows)",
      "context": "Professional filter setup showing bricks as biological filtration stage"
    }
  },
  "environment": {
    "setting": "Aquarium filter system maintenance or installation scenario",
    "background": {
      "type": "Aquarium equipment room or sump area",
      "elements": "Filter plumbing, other filtration media visible, professional aquarium system",
      "depth": "Background softly blurred focusing on brick installation",
      "atmosphere": "Professional aquarium maintenance, serious filtration system"
    },
    "lighting": {
      "type": "Instructional documentation lighting",
      "key_light": "Clear bright lighting illuminating filter internals",
      "quality": "Tutorial/instructional photography standard",
      "color_temperature": "5500K neutral daylight for accurate color",
      "atmosphere": "Educational, instructional, professional installation",
      "clarity": "Even lighting showing installation details clearly"
    }
  },
  "style": {
    "artistic": "Instructional/tutorial product photography",
    "camera": {
      "lens": "35mm wide angle for environmental context",
      "aperture": "f/5.6 for balance of detail and context",
      "shot_type": "Installation documentation shot",
      "angle": "Angle showing both bricks and surrounding filter system",
      "composition": "Clear view of proper brick placement in filter"
    },
    "mood": "Instructional, professional installation, proper usage demonstration",
    "narrative": "This is how professionals use YEE Culture Bricks"
  },
  "technical": {
    "resolution": "8K (7680x4320)",
    "aspect_ratio": "4:5 for tutorial posts",
    "quality": "Clear focus on installation with context visible",
    "instruction_value": "Clear enough for educational tutorial use"
  },
  "constraints": {
    "exclusions": [
      "No dirty or algae-covered equipment",
      "No incorrect installation methods shown",
      "No cluttered or messy filter area",
      "No competing filtration products prominently shown"
    ],
    "requirements": [
      "Proper brick installation clearly shown",
      "Professional filter system quality",
      "YEE product clearly identifiable",
      "Instructional value clear",
      "Professional aquarium system context"
    ]
  },
  "output_specs": {
    "color_space": "sRGB",
    "bit_depth": "8-bit",
    "optimization": "Optimized for tutorial and installation guide content"
  }
}
```

---

# ✅ ملخص ملف 05

**إجمالي المنتجات:** 5
**إجمالي الصور:** 21
**Enhancement:** 6 صور
**New Generation:** 15 صورة

## المنتجات:
1. ✅ YYH-189 Algaecide (5 صور - Enhancement)
2. ✅ YYH-207 Methylene Blue Alt (4 صور - New)
3. ✅ YAN-804 Multivitamin Salt (4 صور - 1 Enhancement + 3 New)
4. ✅ YAN-915 Multivitamin Box (4 صور - New)
5. ✅ YAA-009 Culture Bricks (4 صور - New)

---

**تم إنشاء الملف:** 7 فبراير 2026
**المعيار:** Apple/Amazon Professional Product Photography
**Watermark:** AQuavo.vercel.app on all images
**الجودة:** 8K Resolution - Professional Commercial Standard

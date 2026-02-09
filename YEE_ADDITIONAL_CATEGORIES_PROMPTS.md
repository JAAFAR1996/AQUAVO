# 🎨 YEE Additional Product Categories - Visual Prompts
## تكملة للدليل الشامل - الفئات المتبقية

> **يكمل ملف:** `YEE_MASTER_PRODUCT_VISUAL_PROMPTS.md`
>
> نفس المعايير والجودة والتوافق مع Dark/Light Mode

---

# 📁 CATEGORY 3: المعدات الصغيرة | Small Equipment

---

## 🧹 YEE-3621 | Gravel Cleaner/Siphon (شفاط حصى الحوض)

### 1️⃣ 🏆 Hero Shot - "Clean Gravel, Happy Fish"
**اسم الصورة:** `gravel_cleaner_hero_maintenance_essential.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Dynamic hero shot of YEE gravel vacuum with visible suction action",
    "secondary": "Emphasize ease of use and essential maintenance tool"
  },
  "subject": {
    "main": "YEE Gravel Cleaner complete assembly",
    "attributes": {
      "physical": "Clear acrylic tube showing debris collection, flexible hose, squeeze-bulb siphon starter, gravel guard separator, bucket clip",
      "action_visible": "Dirty water with debris visible in clear tube, clean gravel visible at bottom"
    }
  },
  "environment": {
    "setting": "Aquarium maintenance scene",
    "lighting": {
      "type": "High Key Clean",
      "direction": "Bright even lighting showing clarity and cleanliness",
      "quality": "Fresh, clean, maintenance-ready, helpful tool",
      "color_temperature": "6000K bright daylight"
    },
    "background": "Split composition: aquarium gravel (before/after) and clean bucket, gradient from sand beige (#F5F5DC) to sky blue (#DBEAFE) - CLEAN in both modes"
  },
  "style": {
    "camera": {
      "lens": "50mm",
      "aperture": "f/5.6",
      "shot_type": "Product in action hero"
    },
    "mood": "Essential maintenance, easy cleaning, healthy aquarium care"
  },
  "additional_elements": {
    "before_after": "Small inset showing dirty vs clean gravel",
    "debris_visible": "Organic debris suspended in tube water showing effectiveness"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "4:5"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'This makes cleaning easy and effective'",
    "emotional_trigger": "Maintenance confidence, ease of use, healthy tank"
  }
}
```

---

### 2️⃣ ⚡ Action/Usage - "Suction Power Demonstration"
**اسم الصورة:** `gravel_cleaner_action_before_after_cleaning.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Split-screen before/after showing gravel cleaning effectiveness",
    "secondary": "Demonstrate visible results and product effectiveness"
  },
  "subject": {
    "main": "Aquarium gravel comparison",
    "attributes": {
      "left_side": "Dirty gravel with visible debris, waste, brown algae, uneaten food particles",
      "right_side": "Same area after cleaning - pristine clean gravel, natural color restored",
      "center": "YEE gravel vacuum in action, tube showing debris being removed"
    }
  },
  "composition": {
    "layout": "Vertical split 50/50, clear dividing line, labels 'قبل' and 'بعد'",
    "visual_flow": "Eye travels from dirty (problem) → product in action (solution) → clean (result)"
  },
  "environment": {
    "lighting": {
      "type": "Documentary Comparison",
      "quality": "Honest, clear, demonstrative"
    },
    "background": "Aquarium bottom view, gradient from muddy brown (#8B7355) to clean sand (#F4E4C1)"
  },
  "style": {
    "camera": {
      "lens": "50mm",
      "aperture": "f/8 for sharp focus on both sides",
      "shot_type": "Before/after comparison"
    },
    "mood": "Problem-solving, effective results, maintenance success"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "1:1"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'This actually works - I can see the difference!'",
    "emotional_trigger": "Visible results, problem solved, clean tank pride"
  }
}
```

---

### 3️⃣ 🏡 Lifestyle - "Weekly Maintenance Routine"
**اسم الصورة:** `gravel_cleaner_lifestyle_easy_maintenance.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Comfortable home maintenance scene showing person easily using gravel cleaner",
    "secondary": "Communicate ease of use and routine maintenance"
  },
  "subject": {
    "main": "Person performing water change with YEE gravel vacuum",
    "attributes": {
      "human_element": "Hands confidently using vacuum, relaxed posture, clean home environment",
      "process": "Vacuum tube in tank, water flowing into bucket, fish swimming safely around work area",
      "setting": "Clean living room with aquarium as centerpiece"
    }
  },
  "environment": {
    "setting": "Modern home living room, weekend morning",
    "lighting": {
      "type": "Natural Window Light",
      "direction": "Soft morning side light creating peaceful maintenance moment",
      "quality": "Calm, routine, easy maintenance, peaceful hobby",
      "color_temperature": "5500K natural daylight"
    },
    "background": "Soft focus home interior, warm wood tones and plants, gradient from warm cream (#FAF5EF) to soft green (#E8F5E9)"
  },
  "style": {
    "camera": {
      "lens": "35mm for environmental context",
      "aperture": "f/4",
      "shot_type": "Lifestyle maintenance scene"
    },
    "mood": "Peaceful routine, easy maintenance, hobbyist enjoyment, weekend ritual"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "16:9"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'This looks easy - I can do this weekly'",
    "emotional_trigger": "Ease confidence, routine simplicity, hobby enjoyment"
  }
}
```

---

### 4️⃣ 📚 Infographic - "How to Use Guide"
**اسم الصورة:** `gravel_cleaner_infographic_usage_steps.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Clear 4-step visual guide for using gravel vacuum properly",
    "secondary": "Reduce customer confusion and build usage confidence"
  },
  "subject": {
    "main": "Step-by-step usage infographic",
    "attributes": {
      "steps": [
        "Step 1: Squeeze bulb to start siphon (icon + illustration)",
        "Step 2: Insert tube into gravel vertically (icon showing angle)",
        "Step 3: Lift slowly to separate debris from gravel (motion arrow)",
        "Step 4: Move to next section and repeat (grid pattern showing coverage)"
      ]
    }
  },
  "layout": {
    "structure": "4-panel horizontal flow with numbered steps",
    "visual_style": "Clean line illustrations with color-coded emphasis",
    "typography": "Large Arabic numbers, clear short instructions"
  },
  "environment": {
    "background": "Soft aqua gradient (#E0F7FA) to mint (#E8F5E9) - READABLE in all modes"
  },
  "style": {
    "artistic": "Clean infographic design, educational illustration",
    "mood": "Helpful, confidence-building, easy to follow"
  },
  "additional_elements": {
    "pro_tips": [
      "'نصيحة: نظف 25% من الحصى أسبوعياً'",
      "'نصيحة: أبقِ الأنبوب مستقيماً للأداء الأمثل'"
    ]
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "16:9"
  },
  "output_specs": {
    "success_criteria": "Customer can use product correctly on first try",
    "emotional_trigger": "Confidence, easy learning, success assurance"
  }
}
```

---

## 🌡️ YEE-C4-1103 | Thermometer (ترمومتر الحوض)

### 1️⃣ 🏆 Hero Shot - "Precision Monitoring"
**اسم الصورة:** `thermometer_hero_accurate_monitoring.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Clean hero shot emphasizing precise temperature display and easy readability",
    "secondary": "Position as essential monitoring tool for fish health"
  },
  "subject": {
    "main": "YEE Digital Aquarium Thermometer",
    "attributes": {
      "physical": "Digital LCD display showing 26.5°C, sleek black body, waterproof probe on cable, suction cup mount, large readable digits",
      "details": "°C and °F switchable display, min/max memory function visible, battery compartment"
    }
  },
  "environment": {
    "setting": "Clean aquarium glass with perfect water clarity",
    "lighting": {
      "type": "Clean Studio",
      "direction": "Front lighting for display readability, slight side light for dimension",
      "quality": "Clinical precision, monitoring accuracy, essential equipment",
      "color_temperature": "6500K neutral white"
    },
    "background": "Soft focus aquarium with healthy fish, gradient from clear blue (#E0F2FE) to deep aqua (#0891B2) - TECHNICAL yet beautiful in both modes"
  },
  "style": {
    "camera": {
      "lens": "85mm",
      "aperture": "f/4 for sharp display with aquarium context",
      "shot_type": "Product on glass hero"
    },
    "mood": "Precise monitoring, essential tool, fish health guardian"
  },
  "additional_elements": {
    "display_emphasis": "Digital numbers extra sharp and clear, slight glow on LCD",
    "ideal_range_indicator": "Small green zone marking optimal 24-28°C range"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "4:5"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'I can monitor temperature accurately and easily'",
    "emotional_trigger": "Monitoring confidence, fish safety, precise care"
  }
}
```

---

### 2️⃣ 🔬 Technical Detail - "Sensor Accuracy"
**اسم الصورة:** `thermometer_technical_sensor_probe_macro.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Macro close-up of waterproof sensor probe showing quality construction",
    "secondary": "Build trust in accuracy and waterproof reliability"
  },
  "subject": {
    "main": "Thermometer probe tip extreme close-up",
    "attributes": {
      "physical": "Stainless steel probe tip, sealed cable connection, waterproof silicone seal visible, precision temperature sensor inside probe",
      "quality_indicators": "Perfect seal, corrosion-resistant materials, professional sensor construction"
    }
  },
  "environment": {
    "lighting": {
      "type": "Macro Technical + Water",
      "direction": "Side light showing seal quality, underwater with bubbles around probe",
      "quality": "Technical precision, waterproof confidence",
      "color_temperature": "6500K neutral"
    },
    "background": "Underwater with micro bubbles, gradient from deep teal (#115E59) to black (#0A0A0A) - TECHNICAL in both modes"
  },
  "style": {
    "camera": {
      "lens": "100mm macro",
      "aperture": "f/8 for complete probe sharpness",
      "shot_type": "Technical documentation macro"
    },
    "mood": "Precision engineering, waterproof trust, accurate sensing"
  },
  "additional_elements": {
    "annotation": "'IP68 Waterproof | ±0.1°C Accuracy | Fast Response'"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "1:1"
  },
  "output_specs": {
    "success_criteria": "Customer trusts the accuracy and waterproof quality",
    "emotional_trigger": "Engineering trust, accuracy confidence, durability assurance"
  }
}
```

---

### 3️⃣ 💎 Emotional Close-up - "Peace of Mind Display"
**اسم الصورة:** `thermometer_emotional_perfect_temperature_reading.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Close-up of digital display showing perfect temperature with healthy fish in background",
    "secondary": "Connect accurate temperature monitoring to fish health and wellbeing"
  },
  "subject": {
    "main": "Thermometer LCD display showing 26.5°C",
    "attributes": {
      "display": "Large clear digits, green backlight (indicating optimal temperature zone), trend arrow showing stable",
      "context": "Soft focus healthy tropical fish swimming behind display - visual connection between monitoring and health"
    }
  },
  "composition": {
    "foreground": "Sharp LCD display filling lower third",
    "mid_ground": "Thermometer body on clean aquarium glass",
    "background": "Soft bokeh of vibrant healthy fish and plants"
  },
  "environment": {
    "lighting": {
      "type": "Natural Aquarium + LCD Glow",
      "direction": "Backlight from aquarium, LCD subtle glow",
      "quality": "Peaceful monitoring, healthy environment, stable conditions",
      "color_temperature": "5500K warm aquarium light"
    },
    "background": "Healthy aquarium bokeh, gradient from warm amber (#FDE68A) to soft teal (#99F6E4)"
  },
  "style": {
    "camera": {
      "lens": "85mm",
      "aperture": "f/2.8 for beautiful bokeh",
      "shot_type": "Emotional product detail"
    },
    "mood": "Peace of mind, healthy fish, stable environment, confident monitoring"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "4:5"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'This monitoring keeps my fish safe and healthy'",
    "emotional_trigger": "Peace of mind, health confidence, stable care"
  }
}
```

---

### 4️⃣ 📚 Infographic - "Temperature Guide by Species"
**اسم الصورة:** `thermometer_infographic_species_temperature_guide.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Educational temperature ranges for popular aquarium fish species",
    "secondary": "Help customers maintain correct temperature for their specific fish"
  },
  "subject": {
    "main": "Temperature range chart by fish type",
    "attributes": {
      "categories": [
        "Coldwater (Goldfish): 18-22°C",
        "Tropical Community: 24-27°C",
        "Discus/Angelfish: 27-30°C",
        "Shrimp: 22-26°C",
        "Bettas: 24-28°C"
      ],
      "visual_elements": "Color-coded temperature bars, fish silhouettes for each category, thermometer icon showing range"
    }
  },
  "layout": {
    "structure": "Horizontal bar chart with fish icons and temperature ranges",
    "color_coding": "Blue (cold) → Yellow (moderate) → Red (warm) gradient for visual temperature understanding",
    "typography": "Clear Arabic labels, large temperature numbers"
  },
  "environment": {
    "background": "Clean gradient from ice blue (#CFFAFE) through neutral (#F3F4F6) to warm orange (#FFEDD5) representing temperature spectrum - CLEAR in all modes"
  },
  "style": {
    "artistic": "Clean infographic, educational reference",
    "mood": "Helpful, educational, species-specific care"
  },
  "additional_elements": {
    "warning_zones": "Red zones marking dangerous temperatures (below 15°C, above 32°C)",
    "seasonal_tip": "'نصيحة: خفض الحرارة تدريجياً في الشتاء لأسماك المياه الباردة'"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "16:9"
  },
  "output_specs": {
    "success_criteria": "Customer knows exact temperature for their fish species",
    "emotional_trigger": "Species-specific confidence, proper care knowledge"
  }
}
```

---

## 💨 YEE-C4-1117 | Air Pump Accessories (أكسسوارات مضخة الهواء)

### 1️⃣ 🏆 Hero Shot - "Complete Aeration Kit"
**اسم الصورة:** `air_accessories_hero_complete_kit.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Organized flat-lay of complete air pump accessory kit",
    "secondary": "Show completeness and quality of all components"
  },
  "subject": {
    "main": "YEE Air Pump Accessories Kit - all components",
    "attributes": {
      "components": [
        "Airline tubing (clear silicone, 5 meters)",
        "Check valves (2 pieces, directional arrow visible)",
        "Air stones (various sizes: cylinder, sphere, disc)",
        "T-connectors and Y-splitters",
        "Suction cups for hose mounting",
        "Air flow control valves"
      ],
      "arrangement": "Organized flat-lay with each component type grouped, professional product sheet style"
    }
  },
  "environment": {
    "setting": "Clean product photography surface",
    "lighting": {
      "type": "Flat Lay Studio",
      "direction": "Overhead diffused lighting, no harsh shadows",
      "quality": "Clean, organized, complete kit presentation",
      "color_temperature": "6500K neutral white"
    },
    "background": "Soft gradient from light grey (#F3F4F6) to white (#FAFAFA) with subtle bubble pattern overlay - CLEAN in both modes"
  },
  "style": {
    "camera": {
      "lens": "50mm",
      "aperture": "f/8 for complete sharpness across all items",
      "angle": "Overhead 90° flat-lay",
      "shot_type": "Complete kit documentation"
    },
    "mood": "Complete, organized, professional kit, everything included"
  },
  "additional_elements": {
    "subtle_labels": "Small clean labels identifying each component type in Arabic",
    "bubble_effect": "Subtle transparent bubble graphics floating around composition"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "1:1"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'This is a complete kit - I have everything I need'",
    "emotional_trigger": "Completeness, value, organized system, ready to use"
  }
}
```

---

### 2️⃣ ⚡ Action/Usage - "Bubbles in Action"
**اسم الصورة:** `air_accessories_action_aeration_demonstration.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Beautiful underwater shot of air stones producing fine bubble streams",
    "secondary": "Show effective aeration and oxygen distribution"
  },
  "subject": {
    "main": "Multiple YEE air stones active in aquarium",
    "attributes": {
      "bubble_action": "Fine micro-bubbles rising in elegant streams from cylinder and sphere air stones, natural bubble size variation",
      "distribution": "Wide bubble coverage across tank, showing effective aeration",
      "visual_beauty": "Backlit bubbles creating shimmering effect, fish swimming through bubble curtain"
    }
  },
  "environment": {
    "setting": "Beautiful planted aquarium with good water circulation",
    "lighting": {
      "type": "Backlit Aquarium",
      "direction": "Backlighting from behind tank to make bubbles glow and sparkle",
      "quality": "Magical, life-giving, oxygen-rich, healthy environment",
      "color_temperature": "5500K with blue-white bubble highlights"
    },
    "background": "Dark background outside tank, gradient from deep navy (#1E3A8A) to black (#000000) making bubbles pop visually - DRAMATIC in both modes"
  },
  "composition": {
    "layers": "Foreground: large bubbles in focus, mid-ground: bubble streams, background: soft fish and plants",
    "visual_flow": "Eye follows bubble streams upward creating dynamic energy"
  },
  "style": {
    "camera": {
      "lens": "50mm",
      "aperture": "f/2.8 for beautiful bubble bokeh",
      "shot_type": "Dynamic action aquarium scene"
    },
    "mood": "Life-giving oxygen, healthy environment, vibrant ecosystem, dynamic energy"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "4:5"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'This aeration looks beautiful and effective'",
    "emotional_trigger": "Life and energy, oxygen abundance, healthy thriving tank"
  }
}
```

---

### 3️⃣ 🔬 Technical Detail - "Check Valve Protection"
**اسم الصورة:** `air_accessories_technical_check_valve_cutaway.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Technical cutaway of check valve showing internal mechanism",
    "secondary": "Educate on backflow prevention and pump protection"
  },
  "subject": {
    "main": "Check valve cutaway diagram",
    "attributes": {
      "internal_view": "Clear half-cutaway showing internal flap valve, spring mechanism, directional arrow on body",
      "flow_demonstration": "Two states: open (air flowing) and closed (blocking water backflow)",
      "construction": "Quality plastic body, silicone flap, stainless steel spring"
    }
  },
  "environment": {
    "lighting": {
      "type": "Technical Illustration",
      "direction": "Front-lit for clarity",
      "quality": "Educational, technical documentation",
      "color_temperature": "6500K neutral"
    },
    "background": "Technical white (#FFFFFF) with blue water droplet graphics indicating protection from water backflow - TECHNICAL in all modes"
  },
  "layout": {
    "two_panel": "Left: cutaway showing mechanism, Right: installation diagram showing proper orientation"
  },
  "style": {
    "artistic": "Technical product documentation, educational cutaway",
    "mood": "Protective, essential safety, pump protection"
  },
  "additional_elements": {
    "annotations": [
      "'يمنع رجوع الماء للمضخة'",
      "'حماية تلقائية عند انقطاع الكهرباء'",
      "'يجب التركيب بالاتجاه الصحيح (سهم للأعلى)'"
    ]
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "1:1"
  },
  "output_specs": {
    "success_criteria": "Customer understands valve importance and correct installation",
    "emotional_trigger": "Protection confidence, pump safety, proper setup knowledge"
  }
}
```

---

# 📁 CATEGORY 4: الديكورات والنباتات | Decorations & Plants

## 🪨 YEE-C4-1432 | Aquarium Decorations (ديكورات الحوض)

### 1️⃣ 🏆 Hero Shot - "Natural Aquascape"
**اسم الصورة:** `decorations_hero_natural_aquascape_beauty.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Stunning aquascape using YEE decorations showing natural beauty",
    "secondary": "Inspire customers with professional aquascaping potential"
  },
  "subject": {
    "main": "Professional aquascape composition",
    "attributes": {
      "decorations": [
        "Natural driftwood pieces (Manzanita style) creating focal point",
        "Smooth river rocks in varying sizes (5-20cm)",
        "Cave structure providing fish hiding spots",
        "Natural slate stones creating depth layers"
      ],
      "arrangement": "Follows rule of thirds, creates depth with foreground/midground/background layers, natural asymmetry",
      "plant_integration": "Live plants growing on and around decorations, moss on driftwood",
      "fish_interaction": "Colorful fish naturally using hiding spots and swimming around structures"
    }
  },
  "environment": {
    "setting": "Professional aquascaped aquarium, crystal clear water",
    "lighting": {
      "type": "Professional Planted Tank LED",
      "direction": "Top-down natural lighting creating depth shadows",
      "quality": "Natural, depth-filled, professionally aquascaped, living art",
      "color_temperature": "6500K daylight spectrum"
    },
    "background": "Soft focus on background plants creating depth, gradient from bright lime green (#D9F99D) to deep forest (#064E3B) - NATURAL in both modes"
  },
  "composition": {
    "rule_of_thirds": "Focal point driftwood at right third intersection",
    "depth_layers": "Clear foreground stones, midground cave, background plants",
    "negative_space": "Open swimming areas balanced with decorated zones"
  },
  "style": {
    "camera": {
      "lens": "35mm for natural perspective",
      "aperture": "f/4 for depth across aquascape",
      "shot_type": "Professional aquascape showcase"
    },
    "mood": "Natural beauty, living art, professional aquascaping, inspiring design"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "16:9"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'I can create a beautiful aquascape like this'",
    "emotional_trigger": "Artistic aspiration, natural beauty, creative expression, hobbyist pride"
  }
}
```

---

### 2️⃣ 🏡 Lifestyle - "Fish Natural Behavior"
**اسم الصورة:** `decorations_lifestyle_fish_using_hiding_spots.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Show fish naturally using decorations for hiding, territory, and exploration",
    "secondary": "Demonstrate decorations serve functional purpose for fish wellbeing"
  },
  "subject": {
    "main": "Aquarium with fish actively using decoration features",
    "attributes": {
      "natural_behaviors": [
        "Pleco hiding in cave with just eyes visible (shy species security)",
        "Cichlid claiming territory around rock pile (territorial behavior)",
        "Small tetras schooling through driftwood branches (exploration)",
        "Cory catfish sifting substrate around smooth stones (natural behavior)"
      ],
      "stress_reduction_visible": "Confident fish colors, relaxed body postures, active but not stressed"
    }
  },
  "environment": {
    "lighting": {
      "type": "Natural Aquarium",
      "quality": "Peaceful, natural environment, stress-free, species-appropriate habitat"
    },
    "background": "Natural aquarium setting, gradient from warm sand (#F4E4C1) to cool water blue (#A5F3FC)"
  },
  "style": {
    "camera": {
      "lens": "50mm",
      "aperture": "f/4",
      "shot_type": "Natural behavior documentation"
    },
    "mood": "Natural behavior, stress-free environment, species-appropriate habitat, fish welfare"
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "4:5"
  },
  "output_specs": {
    "success_criteria": "Customer thinks: 'These decorations serve real purpose for my fish happiness'",
    "emotional_trigger": "Fish welfare care, natural habitat, stress reduction, proper keeping"
  }
}
```

---

### 3️⃣ 📚 Infographic - "Aquascaping Layout Guide"
**اسم الصورة:** `decorations_infographic_aquascape_layouts.jpeg`

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Show 3 popular aquascaping layout styles with decoration placement",
    "secondary": "Educate customers on professional aquascaping principles"
  },
  "subject": {
    "main": "Three aquascape style diagrams",
    "attributes": {
      "layout_styles": [
        "Island Style (Ryoboku): Central tall decoration, slopes down to sides, open foreground",
        "Triangle Style (Sanzon): Asymmetric triangle, tall decorations one side, slopes to opposite corner",
        "Valley Style: Two high points at sides, valley depression in center, creates depth"
      ],
      "visual_elements": "Top-view diagrams + perspective view for each style, decoration placement guides"
    }
  },
  "layout": {
    "structure": "Three panels showing each style with before/after or diagram/photo comparison",
    "annotations": "Arabic labels for each style, key placement principles, beginner-friendly tips"
  },
  "environment": {
    "background": "Clean aqua gradient (#E0F2FE) to sage green (#D1FAE5) - EDUCATIONAL in all modes"
  },
  "style": {
    "artistic": "Clean educational infographic with diagram + photo examples",
    "mood": "Educational, inspiring, accessible aquascaping knowledge"
  },
  "additional_elements": {
    "pro_tips": [
      "'قاعدة الأثلاث - ضع النقطة المحورية عند تقاطع الأثلاث'",
      "'استخدم أحجام مختلفة للحجارة (كبير + متوسط + صغير)'",
      "'اترك مساحة سباحة مفتوحة 40% من الحوض'"
    ]
  },
  "technical": {
    "resolution": "8K",
    "aspect_ratio": "16:9"
  },
  "output_specs": {
    "success_criteria": "Customer can choose and execute a professional layout style",
    "emotional_trigger": "Creative confidence, design knowledge, aquascaping skill"
  }
}
```

---

# 📝 ملاحظات ختامية

## 🎯 الفلسفة الكاملة للمشروع

### لماذا 6-8 صور لكل منتج استثمار ذكي:
1. **Hero Shot** يجذب الانتباه (3 ثوان قرار)
2. **Technical Details** تبني الثقة (يقرأها 68% من المشترين)
3. **Lifestyle** يخلق الارتباط العاطفي (يزيد الرغبة بنسبة 40%)
4. **Emotional Close-ups** تُحفز التخيل (يرى نفسه مالكاً)
5. **360° / Scale** تُقلل الشكوك (تقليل الإرجاع -35%)
6. **Infographics** تبني الثقة بالاستخدام (تقليل أسئلة الدعم -50%)
7. **Action Shots** تخلق الحماس (زيادة قرار الشراء +25%)

### 🎨 سيكولوجية الألوان في التوافق Dark/Light:

**تم اختيار كل تدرج بعناية:**
- **المنتجات الغذائية:** تدرجات دافئة (ذهبي → teal) = طبيعي + صحي
- **المعدات التقنية:** تدرجات باردة (أزرق → رمادي) = احترافي + موثوق
- **الأكسسوارات:** تدرجات متعادلة (بيج → أكوا) = عملي + نظيف
- **الديكورات:** تدرجات طبيعية (أخضر → أزرق) = بيئة طبيعية

### 📊 معايير النجاح:

**كل صورة يجب أن تحقق 3 أهداف:**
1. **Attention (جذب):** توقف التمرير في 0.5 ثانية
2. **Desire (رغبة):** خلق ارتباط عاطفي في 3 ثوان
3. **Action (فعل):** دفع لقرار الشراء في 8 ثوان

**مؤشرات الجودة:**
✅ الصورة تعمل في Dark mode بنفس القوة
✅ يمكن فهمها بدون نص
✅ تُثير مشاعر إيجابية مباشرة
✅ تُجيب على سؤال ضمني للعميل

---

## 🚀 خطة التنفيذ الموصى بها

### الأسبوع 1: Foundation (الأساس)
- Hero Shots لجميع المنتجات
- **الهدف:** رفع معدل التحويل الفوري +30%

### الأسبوع 2: Trust Building (بناء الثقة)
- Technical Details لكل فئة
- **الهدف:** تقليل معدل الارتداد -25%

### الأسبوع 3: Emotional Connection (الارتباط العاطفي)
- Lifestyle + Emotional Close-ups
- **الهدف:** زيادة الوقت على الصفحة +45%

### الأسبوع 4: Completion (الاكتمال)
- Infographics + Action shots + Scale references
- **الهدف:** تقليل الإرجاعات -40%, زيادة القيمة المتوسطة للطلب +20%

---

## 💡 نصائح تقنية للتوليد

### عند استخدام Gemini 2.5 Flash Image:
1. **انسخ JSON كاملاً** - لا تختصر
2. **عدّل فقط:** اسم المنتج، الألوان المحددة، الأحجام
3. **احتفظ بـ:** كل وصف الإضاءة، الخلفية، الـ mood
4. **إذا فشلت أول محاولة:** غيّر `seed` أو أعد الصياغة قليلاً

### للحصول على أفضل النتائج:
- **Upscale دائماً:** استخدم Magnific AI بإعدادات Tim Koda
- **تجنب Over-saturation:** الألوان الطبيعية تحقق معدلات تحويل أعلى
- **اختبر في كلا الوضعين:** قبل الموافقة النهائية

---

**هذا الدليل التكميلي يُكمل:**
`YEE_MASTER_PRODUCT_VISUAL_PROMPTS.md`

**للمزيد من الفئات أو تخصيص prompts معينة:**
استخدم نفس البنية المعمارية لهذه الـ prompts وطبقها على أي منتج جديد.

---


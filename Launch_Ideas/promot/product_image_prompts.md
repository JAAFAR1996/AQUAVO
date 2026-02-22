# 🛒 بروموتات صور المنتجات — للموقع (AQUAVO E-commerce)

> **📌 الهدف:** توليد صور منتجات احترافية بجودة عالية لاستخدامها في صفحات المنتجات على موقع AQUAVO
> **🎯 الصيغة:** كل بروموت بصيغة JSON تفصيلية جاهزة للتوليد
> **📐 الأبعاد:** 1:1 (مربع) مناسب لعرض المنتجات في الموقع

---

## 1️⃣ حجر الهواء الأسطواني — Air Stone (الصورة الرئيسية)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "product": "Cylinder Air Stone — Blue Ceramic",
  "prompt_narrative": "A hyper-realistic professional e-commerce product photograph of blue cylindrical ceramic aquarium air stones. Shot with a Canon EOS R5 and RF 100mm f/2.8L Macro IS USM lens at ISO 100 in a commercial product photography studio. The main focus is a large air stone (50×100mm) positioned at center-right on a clean, ultra-white seamless backdrop with a subtle reflection on a glossy white acrylic surface. The ceramic texture is clearly visible — micro-porous blue surface with tiny irregular holes that create the fine bubbles. 4-5 smaller air stones of progressively decreasing sizes are arranged behind and to the left in a diagonal line, going from medium (30×70mm, 25×50mm) to tiny (15×25mm, 10×25mm). Each stone has a blue plastic air connector nozzle on top. The arrangement is clean and intentional — like an Apple product lineup shot. The stones are deep matte blue (not shiny) with natural ceramic surface variation. A thin clear silicone airline tube (4mm diameter) is elegantly coiled behind the largest stone, catching the light. NO text, NO watermarks, NO branding on the image — pure product photography.",
  "camera_simulation": {
    "camera_body": "Canon EOS R5",
    "lens": "RF 100mm f/2.8L Macro IS USM",
    "aperture": "f/8 (all stones sharp, slight natural background falloff on smallest stones)",
    "shutter_speed": "1/125s",
    "iso": "100 (clean, noise-free studio shot)",
    "white_balance": "5500K (neutral studio daylight)",
    "focus_mode": "Focus stacking — all products sharp",
    "style": "Premium e-commerce product photography — Amazon Best Seller listing quality"
  },
  "composition": {
    "layout": "Largest stone at right-center (hero position), smaller stones cascading to the left in a diagonal line from large to small",
    "framing": "Slightly elevated camera angle (15-20 degrees) showing both the top connector and the cylindrical body",
    "focus": "All stones tack-sharp — focus stacking technique",
    "negative_space": "Clean white space above and to the sides — room for website UI elements",
    "reflection": "Subtle mirror reflection on glossy white surface beneath stones"
  },
  "lighting": {
    "key_light": {
      "type": "Large softbox overhead and slightly behind (Elinchrom Rotalux 150cm) — creates clean, even illumination",
      "color_temp": "5500K daylight balanced"
    },
    "fill_light": {
      "type": "White bounce card on left side — fills shadows gently",
      "intensity": "50% of key — soft shadow detail retention"
    },
    "accent_light": {
      "type": "Rim light from behind-right highlighting the ceramic texture and blue color depth",
      "effect": "Subtle edge glow on stone surfaces showing the porous texture"
    },
    "background": {
      "type": "Pure white seamless paper sweep — slightly overexposed at edges for clean e-commerce look"
    }
  },
  "color_palette": {
    "stones": "#3366AA to #4488CC (natural blue ceramic — NOT uniform, shows material variation)",
    "connectors": "#2255AA (darker blue plastic nozzle)",
    "airline_tube": "Clear/transparent with slight warm refraction",
    "background": "#FFFFFF pure white",
    "surface_reflection": "#F0F0F0 subtle grey on glossy surface",
    "shadows": "Soft, diffused, warm-grey tones — NOT harsh black"
  },
  "product_details": {
    "material_texture": "Micro-porous ceramic — visible tiny holes across surface (this is what creates fine bubbles). NOT smooth plastic. Real ceramic surface with slight irregularities.",
    "connector": "Blue plastic air inlet nozzle on top — cylindrical with ribbed grip for airline tube attachment",
    "sizes_visible": "5 stones showing the range: ~50×100mm (hero), ~30×70mm, ~25×50mm, ~15×25mm, ~10×25mm",
    "color_variation": "Natural ceramic color variation — slightly lighter at edges, deeper blue in grooves"
  },
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1 (square — website product grid)",
    "format": "PNG",
    "color_space": "sRGB",
    "background": "Pure white (#FFFFFF) — ready for website use"
  },
  "constraints": {
    "must_include": [
      "Multiple blue ceramic air stones arranged from large to small",
      "Visible micro-porous ceramic texture on all stones",
      "Blue plastic air connectors on top of each stone",
      "Clear airline tube accent",
      "Clean white studio background with subtle reflection",
      "Professional e-commerce lighting — soft, even, premium"
    ],
    "exclusions": [
      "NO text or watermarks on the image",
      "NO branding or logos",
      "NO background environment (pure white studio)",
      "NO cartoon or illustration style",
      "NO harsh shadows or dark mood",
      "NO fish or aquarium in frame — product only",
      "NO unrealistic colors — natural blue ceramic"
    ],
    "critical_rules": [
      "The stones must look like REAL CERAMIC — porous texture is KEY",
      "The blue color must be natural ceramic blue — NOT neon or electric blue",
      "The arrangement must feel INTENTIONAL and PREMIUM — like an Apple product lineup",
      "Background must be PURE WHITE for e-commerce website compatibility",
      "All stones must be SHARP — professional focus stacking",
      "The image should make a customer feel they are buying a QUALITY product"
    ],
    "style_raw": true
  }
}
```

---

## 2️⃣ حجر الهواء الأسطواني — Air Stone (صورة بيئة الاستخدام)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "product": "Cylinder Air Stone — In-use Lifestyle Shot",
  "prompt_narrative": "A hyper-realistic photograph of a blue ceramic cylinder air stone actively producing fine micro-bubbles inside a beautiful planted freshwater aquarium. Shot through the front aquarium glass with a Sony A7R V and FE 90mm f/2.8 Macro G OSS lens at ISO 400. The air stone sits on dark ADA Amazonia aqua soil substrate at the bottom of the tank, with a thin clear airline tube (4mm) running from the stone upward along the back glass. A dense column of ultra-fine, silvery micro-bubbles rises straight up from the stone's porous surface, creating a shimmering, champagne-like curtain of tiny bubbles that catch the LED light beautifully. The bubbles are NOT large round bubbles — they are extremely fine, almost mist-like, rising in a dense column. Behind the stone (out of focus in beautiful creamy bokeh): lush green Rotala rotundifolia stems, a piece of dark Dragon Stone with Anubias nana attached, and a carpet of Monte Carlo (Micranthemum). The water is crystal clear with very slight tannin warmth. LED light from above creates visible light rays (caustics) through the bubble column. Two small Neon Tetras swim in the mid-background, adding life. The overall mood is peaceful, serene, and high-quality — this image should make the customer WANT this product in their aquarium.",
  "camera_simulation": {
    "camera_body": "Sony A7R V",
    "lens": "FE 90mm f/2.8 Macro G OSS",
    "aperture": "f/4 (stone sharp, background beautifully blurred)",
    "shutter_speed": "1/200s (freeze bubble motion, but slight motion trails on fastest bubbles)",
    "iso": "400 (slight natural grain in dark areas)",
    "white_balance": "6000K (warm LED aquarium light)",
    "focus_mode": "Single point AF on air stone — tack sharp",
    "style": "Aquarium lifestyle photography — ADA Nature Aquarium promotional quality"
  },
  "composition": {
    "layout": "Air stone positioned at lower-third intersection, bubble column rising through center-right of frame",
    "framing": "Through-glass shot, slight angle showing depth of planted tank",
    "focus": "Razor-sharp on air stone and nearest bubbles, gradual bokeh falloff on plants and fish",
    "negative_space": "Upper portion shows clear water with rising bubbles fading into distance"
  },
  "lighting": {
    "key_light": {
      "type": "Overhead Chihiros WRGB II LED bar — creates natural downward gradient",
      "effect": "Beautiful light rays (caustics) visible through the bubble column — shimmer effect"
    },
    "bubble_light": {
      "type": "Each micro-bubble catches LED light — creating tiny bright sparkles in the column",
      "effect": "Champagne-like shimmer — premium feel"
    }
  },
  "color_palette": {
    "stone": "#3366AA (deep blue ceramic — standing out against dark substrate)",
    "bubbles": "Silver-white with slight blue refraction — NOT opaque white",
    "substrate": "#2C1F10 (dark brown ADA soil)",
    "plants": "#2D5A27 to #4CAF50 (various green tones)",
    "water": "Crystal clear with very faint golden warmth",
    "fish": "Neon Tetra blue-red stripe glow in background"
  },
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1 (square — website product gallery)",
    "format": "PNG",
    "color_space": "sRGB"
  },
  "constraints": {
    "must_include": [
      "Blue ceramic air stone clearly visible on dark substrate",
      "Dense column of ULTRA-FINE micro-bubbles rising (NOT large round bubbles)",
      "Planted aquarium background in soft bokeh",
      "LED light caustics through bubble column",
      "Clear airline tube visible",
      "1-2 small fish in background for scale and life"
    ],
    "exclusions": [
      "NO text or watermarks",
      "NO large cartoon-like bubbles — must be fine mist-like",
      "NO dirty or cloudy water",
      "NO bare tank — must have plants and hardscape",
      "NO artificial or neon colors"
    ],
    "critical_rules": [
      "The BUBBLES are the STAR — they must look incredibly fine and dense, like champagne",
      "The air stone's blue ceramic must be clearly visible against dark substrate",
      "The planted tank must look PREMIUM — ADA Nature Aquarium quality",
      "Light interaction with bubbles must create visible SHIMMER effect",
      "Overall mood: peaceful, premium, makes customer want this in their tank"
    ],
    "style_raw": true
  }
}
```

---

## 3️⃣ الفلتر الإسفنجي — Sponge Filter (الصورة الرئيسية — الحجمين)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "product": "Sponge Filter XY-180 (Large) + XY-2835 (Small)",
  "prompt_narrative": "A hyper-realistic professional e-commerce product photograph showing TWO black aquarium sponge filters side by side on a clean white studio background. Shot with a Canon EOS R5 and RF 85mm f/1.2L lens (stopped to f/8) at ISO 100. LEFT (LARGER — XY-180): A cylindrical black bio-sponge filter with deep vertical grooves/ridges cut into the foam body. The sponge is dense open-cell foam with visible micro-pore texture — matte black. It sits on a round black ABS plastic base with a circular weighted bottom plate. On top of the sponge, a cylindrical opening (2.1cm diameter) accepts a clear transparent acrylic tube (7cm tall, 2cm diameter) which serves as the air lift tube. The sponge measures approximately 7.5cm diameter × 9cm tall. RIGHT (SMALLER — XY-2835): Same design but noticeably smaller — approximately 5.5cm wide × 7cm tall. Similar vertical grooves, same black foam material, same style black base, with a smaller clear tube on top (5.5cm tall, 1.5cm diameter). Both filters are photographed at a slight angle (20 degrees) showing the round top opening and the cylindrical profile. The size difference between the two is immediately obvious and compelling. A subtle product shadow falls beneath each filter on the glossy white surface. NO text, NO watermarks, NO packaging — pure clean product shot.",
  "camera_simulation": {
    "camera_body": "Canon EOS R5",
    "lens": "RF 85mm f/1.2L USM (stopped to f/8)",
    "aperture": "f/8 (both filters tack-sharp)",
    "shutter_speed": "1/125s",
    "iso": "100",
    "white_balance": "5500K neutral",
    "focus_mode": "Focus stacking — both products pin-sharp",
    "style": "Premium twin-product comparison shot — like Bose speaker size comparison photos"
  },
  "composition": {
    "layout": "Large filter (XY-180) on the LEFT, small filter (XY-2835) on the RIGHT. Slight overlap of their personal space but clearly separate products. The large one dominates slightly — hero positioning.",
    "framing": "Slightly elevated angle (20 degrees) — shows the top opening with clear tube AND the cylindrical profile with grooves",
    "focus": "Both products tack-sharp from top to base — focus stacking",
    "negative_space": "Clean white above and to sides — website-ready",
    "scale_comparison": "The size difference is the KEY visual statement — customer instantly sees the two options"
  },
  "lighting": {
    "key_light": {
      "type": "Large overhead softbox (Elinchrom 150cm) — even, soft, wrapping illumination",
      "color_temp": "5500K daylight balanced"
    },
    "fill_light": {
      "type": "White bounce cards on both sides — fill the deep grooves in the sponge with gentle light",
      "importance": "CRITICAL: the grooves must have visible shadow depth but NOT be pitch black"
    },
    "accent_light": {
      "type": "Backlight creating subtle rim light on the clear tubes — making them glow slightly",
      "effect": "The transparent tubes catch light beautifully — shows their clarity"
    },
    "background": {
      "type": "Pure white seamless sweep — slightly overexposed edges for clean cutout potential"
    }
  },
  "color_palette": {
    "sponge": "#1A1A1A to #2D2D2D (dense matte black foam — NOT shiny, NOT grey, NOT blue-black)",
    "base_plastic": "#0D0D0D (glossy black ABS plastic base — slightly reflective)",
    "clear_tube": "Crystal clear acrylic — almost invisible but catching light for definition",
    "background": "#FFFFFF pure white",
    "shadows": "Soft warm-grey (#E0E0E0) contact shadows on white surface"
  },
  "product_details": {
    "sponge_texture": "Dense open-cell foam with visible micro-pore structure. The vertical grooves are deep (about 5mm) and evenly spaced around the circumference — approximately 8-10 grooves per filter. The foam surface is slightly rough/matte — NOT smooth or plasticky.",
    "base": "Round black ABS plastic disc with a central column that the sponge sits on. Slight weight to anchor the filter underwater. Small slots or holes for water intake visible at the base junction.",
    "clear_tube": "Acrylic or hard plastic tube. Crystal clear. This is where the airline tube connects from the air pump — air bubbles rise through this tube creating the airlift suction effect.",
    "size_difference": "XY-180: ~7.5cm ⌀ × 9cm H with 7cm tube. XY-2835: ~5.5cm W × 7cm H with 5.5cm tube. The large one is approximately 40% bigger in every dimension."
  },
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1 (square — website product grid)",
    "format": "PNG",
    "color_space": "sRGB",
    "background": "Pure white (#FFFFFF) — ready for website direct use"
  },
  "constraints": {
    "must_include": [
      "TWO sponge filters — large (XY-180) and small (XY-2835) side by side",
      "Clear size difference immediately visible",
      "Visible deep vertical grooves in black foam",
      "Visible micro-pore foam texture",
      "Clear transparent tubes on top of each",
      "Black plastic bases",
      "Clean white background for e-commerce use",
      "Subtle product shadows for grounding"
    ],
    "exclusions": [
      "NO text, watermarks, or branding on image",
      "NO packaging or boxes",
      "NO aquarium environment — studio shot only",
      "NO grey sponge — must be deep BLACK",
      "NO shiny/glossy sponge surface — must be MATTE foam",
      "NO cartoon or illustration",
      "NO airline tubing connected (shown separately for clarity)"
    ],
    "critical_rules": [
      "The BLACK FOAM TEXTURE is essential — visible micro-pores and groove depth",
      "SIZE COMPARISON is the hero of this image — customer must instantly see the two options",
      "The clear tubes must look TRANSPARENT and real — light catching through them",
      "The bases must look SOLID and weighted — quality impression",
      "Background MUST be pure white for website product page compatibility",
      "Overall impression: durable, quality, professional aquarium equipment"
    ],
    "style_raw": true
  }
}
```

---

## 4️⃣ الفلتر الإسفنجي — Sponge Filter (صورة بيئة الاستخدام)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "product": "Sponge Filter XY-180 — In-use Lifestyle Shot",
  "prompt_narrative": "A hyper-realistic photograph of a black sponge filter (XY-180 model) actively working inside a small freshwater aquarium breeding tank. Shot through clean glass with a Sony A7R V and FE 90mm f/2.8 Macro G at ISO 400. The sponge filter sits on the right side of a 30-liter rimless aquarium (low-iron glass, clean). The clear airlift tube on top has a continuous gentle stream of small air bubbles rising through it — the characteristic airlift action that draws water through the sponge. The black cylindrical foam body with its deep vertical grooves is clearly visible, sitting on its black base among dark aqua soil substrate. A thin clear airline tube runs from the top of the filter upward and out of frame (connecting to an external air pump). The STAR of the image is what's AROUND the filter: 3-4 tiny baby guppy fry (2-3mm each) swimming safely near the sponge — demonstrating that this filter is SAFE for baby fish (its key selling point). In the background (soft bokeh): a few stems of Bacopa monnieri, some Java Moss on a small piece of driftwood, and one adult female guppy in the mid-ground. The water is crystal clear. The lighting is warm, inviting LED from above. The mood is: SAFETY, LIFE, NURTURE — this filter protects the smallest fish.",
  "camera_simulation": {
    "camera_body": "Sony A7R V",
    "lens": "FE 90mm f/2.8 Macro G OSS",
    "aperture": "f/4 (filter sharp, background soft bokeh)",
    "shutter_speed": "1/160s",
    "iso": "400",
    "white_balance": "5800K",
    "style": "Aquarium breeding journal photography — intimate, warm, nurturing feel"
  },
  "composition": {
    "layout": "Sponge filter at right-third, baby fry scattered near the filter body at center",
    "framing": "Through-glass shot, straight-on with slight downward tilt",
    "focus": "Sharp on sponge filter and nearest baby fry, gentle bokeh on plants and adult fish",
    "key_moment": "The baby fry swimming safely NEXT to the filter = the selling point captured"
  },
  "lighting": {
    "key_light": {
      "type": "Warm LED bar overhead — Chihiros C2 style",
      "effect": "Creates warm, inviting atmosphere — nurture and safety feeling"
    },
    "bubble_light": {
      "type": "Air bubbles in clear tube catching light — small bright sparkles rising",
      "effect": "Shows the filter is ACTIVE and working"
    }
  },
  "color_palette": {
    "sponge": "#1A1A1A (matte black foam with groove shadows)",
    "substrate": "#2C1F10 (dark ADA soil)",
    "plants": "#3D7A3D (healthy green)",
    "fry": "Tiny translucent silver-grey bodies with visible eye dots",
    "adult_guppy": "Colorful female guppy in bokeh — soft orange/grey",
    "water": "Crystal clear with faint warm tint"
  },
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1 (square — website gallery image)",
    "format": "PNG",
    "color_space": "sRGB"
  },
  "constraints": {
    "must_include": [
      "Black sponge filter clearly visible and identifiable",
      "Air bubbles rising through clear tube (filter actively working)",
      "3-4 TINY baby fry swimming safely near the sponge",
      "Planted tank environment (not bare)",
      "Clear airline tube connected",
      "Warm, nurturing lighting"
    ],
    "exclusions": [
      "NO text or watermarks",
      "NO dead or stressed fish",
      "NO dirty or cloudy water",
      "NO large fish that wouldn't be near a sponge filter",
      "NO bare tank without plants"
    ],
    "critical_rules": [
      "BABY FRY near the filter is the HERO MOMENT — shows filter safety for breeding",
      "The sponge filter must look SOLID and CLEAN — quality equipment",
      "Bubbles in airlift tube must be VISIBLE — shows active operation",
      "Overall mood: SAFE, WARM, LIFE-GIVING — makes customer trust this product for breeding",
      "The image tells a STORY: this filter keeps baby fish alive"
    ],
    "style_raw": true
  }
}
```

---

## 5️⃣ مضخة الهواء SunSun CT-202 — (الصورة الرئيسية)

> 📌 **ارفق صورة CT-202 الأصلية مع هذا البروموت**

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "edit",
  "prompt": "Take this exact air pump from the attached image and place it on a clean pure white (#FFFFFF) studio background. Keep the pump design, shape, colors, and proportions EXACTLY as shown in the attached image — do NOT change or reimagine the product design in any way. Remove ALL text, Chinese characters, dimension labels, arrows, and annotations from the image. Remove the background completely. Show the pump from a 3/4 angle (front-left view, slightly elevated 15 degrees). Add a subtle soft reflection beneath the pump on a glossy white surface. Add professional studio lighting: soft overhead key light, fill from left, and subtle rim light separating the product from the background. Place one clear silicone airline tube (4mm) loosely coiled beside the pump. Output: clean, professional e-commerce product photo on pure white background, ready for website use. NO text, NO watermarks, NO labels — product only.",
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1",
    "format": "PNG",
    "background": "#FFFFFF pure white"
  },
  "constraints": {
    "critical_rules": [
      "The pump must be IDENTICAL to the attached image — same shape, same colors, same details",
      "Do NOT invent or change the product design — copy it exactly from the reference",
      "Remove ALL text, arrows, dimensions, and Chinese characters",
      "Background must be pure white for e-commerce website",
      "Professional studio lighting — soft, even, premium"
    ]
  }
}
```

---

## 6️⃣ مضخة الهواء SunSun CT-202 — (صورة بيئة الاستخدام)

> 📌 **ارفق صورة CT-202 الأصلية مع هذا البروموت**

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "edit",
  "prompt": "Take this exact air pump from the attached image and place it in a lifestyle scene NEXT TO a beautiful planted aquarium. Keep the pump design EXACTLY as shown in the attached image — do NOT change the product at all. Scene: The pump sits on a warm wooden surface to the right of a 60-liter rimless planted aquarium. Two clear silicone airline tubes run from the back of the pump into the aquarium, connecting to two blue ceramic air stones on the substrate. Both air stones produce dense fine micro-bubbles rising upward. The aquarium has lush green plants (Rotala, Java Fern, Monte Carlo carpet), crystal clear water, warm LED lighting from above, and 5-6 small Neon Tetras swimming. Remove ALL text, Chinese characters, dimension labels, and annotations from the pump — show only the clean product in its environment. Warm, inviting room lighting. The composition tells the story: pump → tubes → air stones → bubbles → happy fish.",
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1",
    "format": "PNG"
  },
  "constraints": {
    "critical_rules": [
      "The pump must be IDENTICAL to the attached image — do NOT redesign it",
      "Remove ALL text, arrows, and Chinese characters from the pump",
      "The aquarium must look beautiful, planted, and alive",
      "Airline tubes must be neat and organized — not tangled",
      "Overall mood: premium, warm, functional — 'I want this setup at home'"
    ]
  }
}
```




```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "edit",
  "product": "SunSun CT-202 Dual Outlet Air Pump — 4W",
  "reference_image": {
    "path": "[أرفق صورة CT-202 الأصلية هنا]",
    "usage": "استخدم الصورة المرجعية كمصدر رئيسي لشكل وتصميم المنتج. انسخ نفس التصميم بالضبط: اللون الأبيض الأمامي مع الخطوط الأفقية، الأسود العلوي والخلفي، الشكل المستطيل، وزر التشغيل. لا تتخيل تصميماً جديداً.",
    "what_to_replicate": [
      "الشكل المستطيل المدمج بالضبط كما في الصورة",
      "اللون الأبيض الأمامي مع خطوط التهوية الأفقية",
      "الأسود العلوي والخلفي",
      "زر التشغيل الأمامي",
      "النسب: 12×7×6 سم كما موضح بالصورة"
    ]
  },
  "prompt_narrative": "Using the REFERENCE IMAGE as the EXACT design source: recreate this specific air pump (SunSun CT-202) in a professional e-commerce product photograph. The product must look IDENTICAL to the reference image in shape, proportions, color scheme (white front with horizontal slits, black top/back), and button placement. Shot with a Canon EOS R5 at ISO 100 in a clean white studio. Place the pump on a clean ultra-white seamless backdrop with a subtle reflection on a glossy white surface. Camera angle: classic 3/4 product shot (30 degrees from front-left) showing both the white front face and the black top panel. Add one thin clear silicone airline tube (4mm) elegantly placed beside the pump. CRITICAL: The pump design must match the reference image EXACTLY — do NOT invent a different design. Remove all Chinese text and branding from the reference — output a clean, text-free version. NO text, NO watermarks, NO characters visible.",
  "camera_simulation": {
    "camera_body": "Canon EOS R5",
    "lens": "RF 100mm f/2.8L Macro IS USM",
    "aperture": "f/8 (entire pump sharp)",
    "shutter_speed": "1/125s",
    "iso": "100",
    "white_balance": "5500K neutral daylight",
    "focus_mode": "Single-shot AF — entire product sharp",
    "style": "Premium small electronics product photography — like Bose or Apple accessory shots"
  },
  "composition": {
    "layout": "Pump at center-right, slightly rotated 30 degrees showing front + top. Airline tube loosely coiled to the left.",
    "framing": "3/4 angle from front-left, slightly elevated (15 degrees) to show the black top panel",
    "focus": "Entire pump tack-sharp from front to back",
    "negative_space": "Clean white space on all sides — website-ready cropping",
    "reflection": "Subtle mirror reflection on glossy white surface beneath pump"
  },
  "lighting": {
    "key_light": {
      "type": "Large overhead softbox — even, soft illumination emphasizing the white front panel texture",
      "color_temp": "5500K"
    },
    "fill_light": {
      "type": "White bounce card on right side — showing the horizontal slit details clearly",
      "importance": "The horizontal ventilation slits must have visible depth and shadow definition"
    },
    "accent_light": {
      "type": "Rim light from behind — creating subtle edge definition where white meets black panels",
      "effect": "Clean separation of white front and black top/back"
    },
    "background": {
      "type": "Pure white seamless — overexposed at edges for clean e-commerce look"
    }
  },
  "color_palette": {
    "front_panel": "#F5F5F5 to #FFFFFF (clean white with slight shadow variation in slits)",
    "top_back_panels": "#1A1A1A (matte black — NOT glossy, NOT grey)",
    "power_button": "Small dark circle with subtle LED indicator dot",
    "airline_tube": "Clear/transparent silicone",
    "background": "#FFFFFF pure white",
    "shadows": "Soft warm-grey contact shadows on white surface"
  },
  "product_details": {
    "front_face": "Clean white panel with ~15-18 horizontal ventilation slits running from edge to edge. Slits are evenly spaced, thin (1-2mm), and create an elegant minimal pattern. A small round power button/indicator (5-6mm diameter) is positioned near the bottom-center.",
    "top_panel": "Flat matte black — smooth with no visible features from this angle",
    "back_panel": "Matte black with two small air outlet nozzles (4mm each) protruding slightly — for dual airline tube connections. Power cord exits from the bottom-back.",
    "overall_shape": "Compact rectangular box, 12×7×6 cm, with slightly rounded edges (2mm radius). Clean minimal design — looks like a modern small electronic device, NOT a cheap plastic box.",
    "build_quality": "Smooth ABS plastic with tight seam lines — premium consumer electronics feel"
  },
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1 (square — website product grid)",
    "format": "PNG",
    "color_space": "sRGB",
    "background": "Pure white (#FFFFFF)"
  },
  "constraints": {
    "must_include": [
      "White front panel with horizontal ventilation slits clearly visible",
      "Black top and back panels — clean two-tone design",
      "Small power button on front face",
      "Compact rectangular shape (12×7×6 cm proportions)",
      "Clear airline tube accessory beside the pump",
      "Clean white studio background",
      "Professional soft lighting showing texture depth in slits"
    ],
    "exclusions": [
      "NO text, watermarks, or branding on image",
      "NO Chinese characters visible anywhere",
      "NO price tags or packaging",
      "NO aquarium environment — studio only",
      "NO unrealistic glow effects",
      "NO glossy or shiny white — must be clean matte white"
    ],
    "critical_rules": [
      "The TWO-TONE DESIGN (white front + black top/back) is the KEY visual identity",
      "The HORIZONTAL SLITS on the white front face must be clearly defined with shadow depth",
      "The pump must look COMPACT and MODERN — like a premium mini electronic device",
      "Background MUST be pure white for website product page",
      "The proportions must match: taller than wide (12cm H × 7cm W × 6cm D)",
      "Overall impression: clean, quiet, reliable, modern aquarium equipment"
    ],
    "style_raw": true
  }
}
```

---

## 6️⃣ مضخة الهواء SunSun CT-202 — (صورة بيئة الاستخدام)

> 📌 **مرجع:** المضخة بيضاء/سوداء مدمجة موضوعة بجانب حوض، مع أنبوبين هواء شفافين موصولين بحجرين هواء داخل الحوض.

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "edit",
  "product": "SunSun CT-202 Air Pump — In-use Lifestyle Shot",
  "reference_image": {
    "path": "[أرفق صورة CT-202 الأصلية هنا]",
    "usage": "استخدم الصورة المرجعية لنسخ تصميم المضخة بالضبط ثم ضعها في بيئة استخدام (بجانب حوض). المنتج يجب أن يكون مطابق تماماً للصورة المرجعية."
  },
  "prompt_narrative": "Using the REFERENCE IMAGE as the EXACT design source for the air pump: place this specific pump (SunSun CT-202 — white front with horizontal slits, black top/back, compact 12×7×6cm rectangle) in a lifestyle setting. The pump design must be IDENTICAL to the reference image. Shot with a Sony A7R V at ISO 200. The pump sits on a clean wooden shelf NEXT TO a beautiful 60-liter rimless planted aquarium. Two clear silicone airline tubes run from the back of the pump into the aquarium, connecting to two blue ceramic air stones producing dense micro-bubbles. The aquarium has lush plants (Rotala, Java Fern, Monte Carlo), 5-6 Neon Tetras, and crystal clear water with warm LED lighting. The pump's white front face faces the viewer at a slight angle. CRITICAL: The pump must look exactly like the reference image — same shape, same white/black color split, same horizontal slits. Remove all Chinese text — clean product only.",
  "camera_simulation": {
    "camera_body": "Sony A7R V",
    "lens": "FE 35mm f/1.4 GM (wider angle to capture pump + tank together)",
    "aperture": "f/4 (pump sharp, aquarium slightly softer but contents visible)",
    "shutter_speed": "1/100s",
    "iso": "200",
    "white_balance": "5500K (neutral — balancing room light and aquarium LED)",
    "focus_mode": "AF on air pump — primary subject, tank secondary",
    "style": "Aquarium lifestyle photography — premium setup showcase, 'this could be your desk' feel"
  },
  "composition": {
    "layout": "Air pump on right side of frame on wooden surface, aquarium filling left 60% of frame. Airlines create a visual connection between them.",
    "framing": "Wide enough to show both pump and aquarium in context — environmental product shot",
    "focus": "Pump is sharp (primary), aquarium contents visible but slightly softer depth of field",
    "key_visual": "The airline tubes connecting pump to aquarium are the VISUAL BRIDGE — showing the system in action",
    "story_flow": "Eye travels: pump → tubes → air stones → bubbles → fish — complete product story in one image"
  },
  "lighting": {
    "aquarium_light": {
      "type": "Chihiros WRGB II LED bar above tank — warm, natural planted aquarium lighting",
      "effect": "LED light catches the rising bubbles from both air stones — sparkle effect"
    },
    "room_light": {
      "type": "Soft natural daylight from a window to the right (out of frame) — illuminates the pump and wooden surface",
      "effect": "Warm, inviting, homey atmosphere"
    },
    "accent": {
      "type": "The aquarium itself acts as a light source — glowing with LED warmth against the room"
    }
  },
  "color_palette": {
    "pump_front": "#F5F5F5 (clean white)",
    "pump_top": "#1A1A1A (matte black)",
    "wooden_surface": "#8B6914 to #A0784C (warm natural wood — walnut or oak)",
    "aquarium_water": "Crystal clear with faint warm tint from LED",
    "air_stones": "#3366AA (blue ceramic visible through glass)",
    "bubbles": "Silver-white micro-sparkles against dark tank background",
    "plants": "#2D5A27 to #4CAF50 (lush greens)",
    "fish": "Neon Tetra blue-red glow"
  },
  "product_details": {
    "pump_position": "On wooden surface, right of tank. White front facing viewer at ~20 degree angle. Black top visible. Compact 12×7×6 cm size — looks small and unobtrusive next to the aquarium.",
    "airline_tubes": "Two clear 4mm silicone tubes. Neatly routed — NOT tangled or messy. Show organized setup.",
    "air_stones_in_tank": "Two blue ceramic cylinders on dark substrate at opposite ends — both actively bubbling with fine micro-bubble columns",
    "power_cord": "Thin black cord trailing behind pump — minimal, not distracting"
  },
  "technical": {
    "resolution": "4K (3840×3840)",
    "aspect_ratio": "1:1 (square — website product gallery)",
    "format": "PNG",
    "color_space": "sRGB"
  },
  "constraints": {
    "must_include": [
      "CT-202 pump clearly visible on wooden surface beside aquarium",
      "TWO airline tubes connecting pump to TWO air stones inside tank",
      "Both air stones actively producing fine micro-bubbles",
      "Beautiful planted aquarium with live fish",
      "Clean, organized setup — premium lifestyle feel",
      "Warm natural lighting mixing room light and aquarium LED"
    ],
    "exclusions": [
      "NO text or watermarks",
      "NO messy or tangled tubes",
      "NO dirty or cloudy aquarium",
      "NO bare tank without plants",
      "NO Chinese text or branding on pump",
      "NO dark or moody atmosphere — must be warm and inviting"
    ],
    "critical_rules": [
      "The COMPLETE SYSTEM must be visible: pump → tubes → stones → bubbles — tells the whole story",
      "The pump must look COMPACT and UNOBTRUSIVE next to the tank — not oversized",
      "The aquarium must look BEAUTIFUL and ALIVE — customer envisions this setup at home",
      "Airline tubes must be NEAT and ORGANIZED — shows quality setup",
      "Overall mood: 'I want this on my desk' — premium, clean, functional, beautiful",
      "The two bubble columns are the PAYOFF — showing the dual-output advantage of CT-202"
    ],
    "style_raw": true
  }
}
```

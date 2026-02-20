# 🎨 بروموتات دليل البداية السريعة — بصيغة TODAY.md
## AQUAVO Quick Start Guide — Immersive Visual Prompts

---

# 🔵 اللوح 1 — الغلاف: "البوابة"

> الحوض الفارغ = بوابة لعالم سحري يلوح عبر الزجاج

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Book cover illustration for an aquarium quick start guide. The scene is a magical gateway between two worlds: the top third shows a warm, cozy room with soft golden light, a wooden shelf, and a brand new empty glass aquarium sitting on it, glowing with potential. The bottom two-thirds show what the aquarium WILL become — a breathtaking underwater paradise visible THROUGH the glass, with lush freshwater plants (Anubias, Java Fern, Vallisneria), colorful freshwater fish (bettas with flowing fins, glowing neon tetras, guppies), elegant driftwood covered in moss, smooth river rocks, and god rays penetrating from above. This is a FRESHWATER planted aquarium — not saltwater, not marine, no coral reefs. The glass of the aquarium acts as a portal between the mundane world and the magical underwater world. A subtle infinity-fish logo watermarked in teal at the top center. The color transition goes from warm amber at top to deep teal at bottom. Cinematic lighting, volumetric light rays through water, hyper-detailed illustration style mixing realism with fantasy. Magical, inviting, makes you want to dive in. Elegant illustrated guidebook style, modern flat illustration with subtle 3D depth, teal (#0D7377) and navy (#0A1F3B) color palette with white accents, soft watercolor texture overlay, premium print-ready quality. IMPORTANT: Arabic text is rendered directly on the image as an integrated design element.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL (right-to-left)",
    "font": "Cairo Bold — or any clean modern Arabic font",
    "rendering_note": "All text must be SHARP, READABLE, and PROPERLY CONNECTED Arabic letters — no broken/disconnected characters",
    "title": {
      "text": "دليل البداية السريعة 🚀",
      "position": "center (over the glass portal area)",
      "font_size": "28px",
      "color": "#FFFFFF",
      "background": "semi-transparent dark gradient overlay (rgba(0,0,0,0.5))",
      "style": "Bold, centered, inviting — magical feel"
    },
    "subtitle": {
      "text": "حوضك فارغ اليوم... بس بعد 8 خطوات راح يصير عالم! 🌊",
      "position": "below title",
      "font_size": "16px",
      "color": "#E0F7FA"
    },
    "bottom_cta": {
      "text": "← افتح وابدأ الرحلة",
      "position": "bottom_center",
      "font_size": "14px",
      "color": "#00BCD4",
      "background": "semi-transparent dark gradient at bottom"
    }
  },
  "composition": {
    "layout": "Top 33% = warm room with empty tank, Bottom 67% = underwater paradise through glass",
    "framing": "The aquarium glass is the portal — sharp edge divides two worlds",
    "focus": "Both worlds equally detailed — glass edge is the focal transition"
  },
  "lighting": {
    "top_section": {
      "type": "Warm golden ambient — cozy room feel",
      "color_temp": "3000K (warm)",
      "mood": "Homey, inviting, real world"
    },
    "bottom_section": {
      "type": "Underwater volumetric god rays — teal and blue shimmer",
      "color_temp": "6500K (cool teal)",
      "mood": "Magical, fantasy, underwater paradise"
    }
  },
  "color_palette": {
    "dominant_top": "#FFF5E6 (warm ivory)",
    "dominant_bottom": "#0D7377 (AQUAVO teal)",
    "transition": "Warm amber → Deep teal gradient through glass",
    "accent": "#0A1F3B (navy)",
    "text": "#FFFFFF"
  },
  "aquavo_branding": {
    "logo": "Infinity-fish logo — teal watermark at top center",
    "position": "top_center",
    "opacity": "60%"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "7:9",
    "format": "PNG",
    "print_ready": "350 DPI, CMYK"
  },
  "constraints": {
    "must_include": [
      "Arabic title: دليل البداية السريعة",
      "Empty glass aquarium as portal between two worlds",
      "Warm room above — underwater paradise below",
      "AQUAVO infinity-fish logo watermark",
      "God rays penetrating through water",
      "Lush freshwater plants (Anubias, Java Fern, Vallisneria), freshwater fish (bettas, neon tetras, guppies), driftwood with moss, river rocks visible through glass"
    ],
    "exclusions": ["cartoon", "anime", "broken Arabic letters", "English-only text", "neon colors", "coral reefs", "saltwater", "marine fish", "clownfish", "anemone", "ocean", "sea creatures"],
    "critical_rules": [
      "Arabic text must be PERFECTLY RENDERED — connected letters, proper RTL",
      "The portal effect must be IMMEDIATELY clear — two worlds divided by glass",
      "Top = reality, Bottom = dream — the contrast sells the guide",
      "Text readability is NON-NEGOTIABLE — clear on print"
    ],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 2 — "اختار عرشك"

> المشهد من زاوية تحت مائية — الحوض مثل عرش مهيب. مكان صح ✅ ومكان خطأ ❌

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Illustrated guidebook panel showing choosing the right location for an aquarium. Split composition viewed from slightly underwater perspective, looking UP through the water surface at a beautifully lit room. LEFT SIDE (marked with glowing green checkmark): a sturdy wooden stand in a calm corner, away from windows, power outlet nearby — the aquarium sits like a throne, radiating calm teal glow, peaceful and stable. RIGHT SIDE (marked with glowing red X): same aquarium precariously placed on flimsy table near bright window with harsh sunlight streaming in, green algae wisps growing on glass, unstable and dangerous. Small illustrated icons float in water between scenes: thermometer showing stable temp with checkmark, sun with warning X, weight icon showing 1L=1kg. Freshwater aquatic plants (Anubias, Java Fern, floating Salvinia) frame the bottom edges naturally. Teal-to-white gradient flows upward. Clean infographic style with whimsical underwater elements. Educational yet enchanting. Elegant illustrated guidebook style, modern flat illustration with subtle 3D depth, teal (#0D7377) and navy (#0A1F3B) palette, soft watercolor texture overlay, premium print-ready. IMPORTANT: Arabic text rendered directly on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED Arabic letters",
    "title": {
      "text": "الخطوة 1 📍 اختار عرش حوضك",
      "position": "top_center",
      "font_size": "24px",
      "color": "#FFFFFF",
      "background": "semi-transparent dark gradient at top"
    },
    "left_side_label": {
      "main_text": "✅ مكان هادي + بعيد عن الشمس",
      "sub_items": ["✅ سطح قوي (1 لتر = 1 كيلو!)", "✅ قريب من كهرباء"],
      "position": "LEFT side",
      "main_color": "#00BCD4 (teal — CORRECT)"
    },
    "right_side_label": {
      "main_text": "❌ جنب الشباك ❌ طاولة ضعيفة",
      "position": "RIGHT side",
      "main_color": "#FF6B6B (red — WRONG)"
    },
    "bottom_tip": {
      "text": "⚠️ حوض 60 لتر = 60 كيلو!",
      "position": "bottom_center",
      "font_size": "15px",
      "color": "#FFD54F",
      "background": "semi-transparent dark gradient at bottom"
    }
  },
  "composition": {
    "layout": "50/50 vertical split — LEFT=correct, RIGHT=wrong",
    "framing": "Underwater POV looking up through water surface at room",
    "focus": "Both sides equally sharp — contrast is key"
  },
  "lighting": {
    "left_side": { "type": "Calm teal LED glow — peaceful corner", "mood": "Safe, inviting" },
    "right_side": { "type": "Harsh direct sunlight — overexposed window", "mood": "Dangerous, wrong" }
  },
  "color_palette": {
    "dominant": "#E0F2F1 (light mint — panel 2 color)",
    "accent_correct": "#00BCD4 (teal)",
    "accent_wrong": "#FF6B6B (red)",
    "text": "#FFFFFF"
  },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Arabic step title", "LEFT correct placement with green ✅", "RIGHT wrong placement with red ❌", "Weight warning 60L=60kg", "Underwater perspective looking up", "Floating infographic icons"],
    "exclusions": ["cartoon", "anime", "broken Arabic", "English-only", "coral reefs", "saltwater", "marine fish", "ocean elements"],
    "critical_rules": ["Arabic PERFECTLY RENDERED", "Correct vs wrong must be IMMEDIATELY obvious", "Educational infographic feel", "Text readability NON-NEGOTIABLE"],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 3 — "ابني عالمك"

> تحت الماء بالكامل — حصى يسقط كنجوم متساقطة، ديكور يترتب كمدينة صغيرة

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Enchanting illustrated guidebook panel showing setting up substrate and decorations in an aquarium. Fully underwater perspective — we are INSIDE the tank looking around. Colorful natural gravel falls through water in slow motion like tiny shimmering stars, settling into a perfect layered bed at bottom creating a miniature landscape of hills and valleys. Human hands seen from above water surface, slightly distorted by refraction, carefully arranging beautiful branching driftwood and smooth river rocks that look like ancient ruins of a tiny underwater city. Small aquatic plants being gently planted, delicate roots reaching into gravel. A white ceramic plate sits on gravel with crystal-clear water being poured gently onto it to avoid disturbing substrate — clever trick visualized beautifully. Tiny air bubbles rise everywhere in spiraling trails. Scene feels deeply meditative and magical — like building a tiny living world. Warm amber light filters from above creating god rays and caustic patterns on gravel. Four numbered step icons subtly integrated as floating teal circles: wash, layer, arrange, pour. Teal, sandy beige, warm amber palette. Elegant illustrated guidebook style, 3D depth, watercolor texture, premium print-ready. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED",
    "title": { "text": "الخطوة 2 🧹 ابني عالمك", "position": "top_center", "font_size": "24px", "color": "#FFFFFF", "background": "dark gradient" },
    "steps": [
      { "number": "①", "label": "اغسل الحصى (بدون صابون أبداً! 🚫)", "position": "floating beside washing scene", "color": "#00BCD4" },
      { "number": "②", "label": "سمك 3-5 سم بالقاع", "position": "beside gravel layer", "color": "#00BCD4" },
      { "number": "③", "label": "رتب الديكور: كبير بالخلف ← صغير بالأمام", "position": "beside driftwood", "color": "#00BCD4" },
      { "number": "④", "label": "صب الماء على صحن عشان ما يخرب!", "position": "beside plate trick", "color": "#00BCD4" }
    ],
    "bottom_tip": { "text": "💡 كل حبة حصى = أساس حياة جديدة", "position": "bottom_center", "font_size": "14px", "color": "#00BCD4" }
  },
  "composition": { "layout": "Full underwater interior view — gravel falling from top, arranged world at bottom", "focus": "Gravel particles mid-fall + arranged landscape" },
  "lighting": { "key_light": { "type": "Warm amber from above — god rays through water surface", "mood": "Meditative, magical, warm" } },
  "color_palette": { "dominant": "#B2DFDB (light teal — panel 3)", "gravel": "#D4A574 (sandy)", "water": "#80CBC4", "accent": "#0D7377" },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Gravel falling like stars through water", "Hands arranging driftwood/rocks from above", "Plate trick for pouring water", "4 numbered steps as floating icons", "Air bubbles rising"],
    "exclusions": ["cartoon", "anime", "broken Arabic", "English-only", "coral reefs", "saltwater", "marine elements"],
    "critical_rules": ["Arabic PERFECTLY RENDERED", "Scene must feel MEDITATIVE and magical", "Underwater perspective — viewer is inside tank", "Text readability NON-NEGOTIABLE"],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 4 — "نبض الحياة"

> الفلتر = قلب ينبض، السخان = شمس صغيرة، الإضاءة = ضوء الحياة — أعضاء حية مو آلات

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Illustrated guidebook panel showing installing equipment in an aquarium, depicted as giving the tank its heartbeat and soul. Artistic underwater scene where three pieces of equipment are drawn as magical life-giving organs connected by flowing energy: The FILTER on left illustrated as a glowing teal biological heart with flowing current lines pulsing outward like heartbeat rhythm, particles cleaned from water leaving sparkly trails. The HEATER in center glows warm amber/orange aura, circular temperature gauge showing 25°C, radiating warmth like tiny underwater sun with concentric heat rings. The LIGHT above shines down as golden beams through water surface, small clock overlay showing 8 hours only, cute tiny green algae monster characters at edge as playful warning. Flowing current lines connect all three in circular energy diagram showing unified system. Atmosphere of sleeping underwater world about to awaken — dark but glimmering. Bioluminescent particles float lazily. Beautiful, educational, enchanting, mysterious. Elegant guidebook style, flat illustration with 3D depth, teal/navy palette, watercolor texture. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED",
    "title": { "text": "الخطوة 3 ⚙️ نبض الحياة", "position": "top_center", "font_size": "24px", "color": "#FFFFFF", "background": "dark gradient" },
    "equipment_labels": [
      { "icon": "💨", "label": "الفلتر = قلب الحوض — ينظف ويحرك", "position": "beside filter heart" },
      { "icon": "🌡️", "label": "السخان = دفء الحوض — 25°م (انتظر 30 دق!)", "position": "beside heater sun" },
      { "icon": "💡", "label": "الإضاءة = شمس الحوض — 8 ساعات بس!", "position": "beside light" }
    ],
    "bottom_warning": { "text": "⏰ استخدم تايمر! أكثر من 8 ساعات = 🟢 طحالب!", "position": "bottom_center", "font_size": "14px", "color": "#FFD54F" }
  },
  "composition": { "layout": "Three equipment pieces as glowing organs connected by energy flow lines", "focus": "Circular diagram showing unified system" },
  "lighting": { "key_light": { "type": "Bioluminescent glow from equipment + golden beams from above", "mood": "Awakening, mysterious, magical" } },
  "color_palette": { "dominant": "#4DB6AC (medium teal — panel 4)", "filter_glow": "#0D7377", "heater_glow": "#FF8A65 (amber)", "light_glow": "#FFD54F (golden)" },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Filter as glowing teal heart", "Heater as amber sun with 25°C gauge", "Light with 8hr clock", "Cute algae monster warning", "Energy flow connecting all three", "Bioluminescent particles"],
    "exclusions": ["cartoon", "anime", "broken Arabic", "English-only", "realistic equipment photos", "coral reefs", "saltwater", "marine elements"],
    "critical_rules": ["Equipment must look like LIVING ORGANS not machines", "Arabic PERFECTLY RENDERED", "Energy flow diagram must be clear", "Text readability NON-NEGOTIABLE"],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 5 — "إكسير الحياة"

> أهم لوح! ماء عادي يتحول لماء حي — كيمياء سحرية، بكتيريا كنجوم مضيئة

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "The most dramatic panel of the guidebook — Preparing the Water shown as alchemical magical transformation. Vertically composed scene against dark navy background: at top, ordinary tap water flows down like shimmering waterfall. As it passes through glowing teal potion bottle with water drop icon (water conditioner), water transforms — toxic chlorine particles shown as tiny angry red/orange molecules with evil faces dissolve, pop, vanish in sparks. Below, second mystical bottle with bacteria icon releases millions of tiny bioluminescent beneficial bacteria spreading through water like golden and teal stardust, like galaxies forming — they glow teal/gold trailing light as they colonize water. At bottom, water fully transformed into living, breathing, crystal-clear liquid with subtle magical golden shimmer and floating light particles. Large ornate hourglass on right shows 24-48 hours with golden sand falling. Dramatic red warning skull icon: chlorine + fish = danger. Overall feeling: pure alchemy — turning dead water into living magical water. Mystical, dramatic, cinematic volumetric lighting. Dark navy background, intensely glowing elements. Elegant guidebook style, 3D depth. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED",
    "title": { "text": "الخطوة 4 💧 إكسير الحياة", "position": "top_center", "font_size": "24px", "color": "#FFFFFF", "background": "dark gradient" },
    "warning_banner": { "text": "⚠️ الخطوة الأهم!", "position": "below title", "font_size": "18px", "color": "#FF6B6B" },
    "flow_steps": [
      { "icon": "🚰", "text": "ماء حنفية", "position": "top of flow" },
      { "icon": "➕", "text": "مزيل كلور (جرعة واحدة!)", "position": "beside first bottle" },
      { "icon": "➕", "text": "بكتيريا نافعة (النجوم الصغيرة!)", "position": "beside second bottle" },
      { "icon": "⏳", "text": "انتظر 24-48 ساعة", "position": "beside hourglass" },
      { "icon": "✅", "text": "الماء صار حي!", "position": "at transformed water" }
    ],
    "danger_warning": { "text": "🔴 لا تحط سمك بماء جديد = الكلور يگتله!", "position": "bottom area", "font_size": "14px", "color": "#FF4444" },
    "bottom_tip": { "text": "💊 تحتاج: مزيل كلور + بكتيريا (موجودة عدنا! 😉)", "position": "bottom_center", "color": "#00BCD4" }
  },
  "composition": { "layout": "Vertical flow — tap water top → transformation middle → living water bottom", "focus": "Glowing bacteria stardust spreading through dark water" },
  "lighting": { "key_light": { "type": "Bioluminescent glow from bacteria + bottle glow against dark navy", "mood": "Mystical, dramatic, high contrast" } },
  "color_palette": { "dominant": "#0A1F3B (dark navy)", "bacteria": "#0D7377 + #FFD700 (teal-gold stardust)", "chlorine": "#FF4444 (angry red)", "potion": "#00BCD4 (teal glow)" },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Tap water flowing down as waterfall", "Teal potion bottle dissolving red chlorine molecules", "Bacteria bottle releasing golden-teal stardust", "Hourglass showing 24-48 hours", "Skull warning for chlorine danger", "Transformed crystal-clear water at bottom"],
    "exclusions": ["cartoon", "anime", "bright cheerful colors", "broken Arabic", "coral reefs", "saltwater", "marine elements"],
    "critical_rules": ["This is the MOST DRAMATIC panel — high contrast, cinematic", "Bacteria must look like STARDUST/GALAXIES", "Chlorine molecules must look ANGRY and TOXIC", "Arabic PERFECTLY RENDERED", "Dark navy background is ESSENTIAL"],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 6 — "الضيوف الأوائل"

> السمكة الأولى تدخل قصرها — لحظة عجب وسحر

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Magical guidebook panel showing adding fish for the first time. Most emotional panel — pure wonder. Underwater perspective inside beautifully set-up aquarium with lush substrate, green plants, elegant driftwood, smooth rocks. At water surface, translucent plastic bag floats half-submerged — inside, beautiful colorful freshwater betta fish or a group of neon tetras peer out with wide, curious, amazed eyes at magnificent new home. Warm golden light pours through from above creating heavenly god rays. Three-step acclimation sequence flowing downward: Step 1 — sealed bag floating on surface with 15-minute timer, Step 2 — bag opened with small cup gently pouring tank water in, Step 3 — gentle net releasing fish into new world, surrounded by celebration bubbles, sparkles, golden light trails. Existing plants seem to welcome fish — leaves slightly leaning toward it, as if ecology greets first inhabitant. Crescent moon icon at bottom — lights off first day. Pure magic, wonder, tender care. Warm, soft, deeply emotional. Elegant guidebook style, 3D depth, teal/deep green with golden accents, watercolor texture. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED",
    "title": { "text": "الخطوة 5 🐟 الضيوف الأوائل", "position": "top_center", "font_size": "24px", "color": "#FFFFFF", "background": "dark gradient" },
    "steps": [
      { "number": "①", "label": "حط الكيس يطفو 15 دق ⏱️ (تعديل الحرارة)", "position": "beside floating bag" },
      { "number": "②", "label": "افتح الكيس + أضف ماء الحوض شوية شوية — 15 دق", "position": "beside open bag" },
      { "number": "③", "label": "طلع السمكة بالشبچة 🚫 لا تصب ماء الكيس!", "position": "beside net release" }
    ],
    "bottom_tip": { "text": "🌙 طفي الضوء أول يوم — خليهم يتعودون بهدوء", "position": "bottom_center", "color": "#FFD54F" }
  },
  "composition": { "layout": "3-step sequence flowing top to bottom — bag floating → bag open → fish free", "focus": "Fish's amazed eyes looking at new home" },
  "lighting": { "key_light": { "type": "Warm golden god rays from above — heavenly atmosphere", "mood": "Emotional, wonder, golden warmth" } },
  "color_palette": { "dominant": "#00695C (deep teal — panel 6)", "golden": "#FFD700", "water": "#80CBC4", "sparkles": "#FFFFFF + #FFD700" },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Fish in bag with wide curious eyes", "3-step acclimation sequence", "Celebration bubbles and sparkles at release", "Plants leaning toward fish welcoming it", "Moon icon for lights off", "Beautiful set-up tank from previous panels"],
    "exclusions": ["cartoon", "anime", "broken Arabic", "scary fish", "dead fish", "coral reefs", "saltwater", "marine fish", "clownfish"],
    "critical_rules": ["Most EMOTIONAL panel — viewer must feel wonder", "Fish eyes must show CURIOSITY and AMAZEMENT", "Plants welcoming fish = tank ecology greeting its first inhabitant", "Arabic PERFECTLY RENDERED"],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 7 — "الحب اليومي"

> الروتين اليومي كطقس حب — إطعام كهدية، تنظيف كمسح لوحة ثمينة

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Warm guidebook panel showing daily care and feeding in thriving mature aquarium. Tank completely alive and flourishing — colorful freshwater fish (neon tetras, guppies, corydoras, a betta) swim happily among dense lush green freshwater plants, elegant driftwood with java moss, stunning decorations. Panel gracefully split into two connected scenes by flowing water: TOP HALF — Feeding: gentle caring hand from above sprinkles tiny pinch of fish food flakes falling like colorful confetti, excited fish swim upward. Small clock shows twice daily, visual measuring guide shows tiny pinch with green checkmark vs large pile with red X. BOTTOM HALF — Weekly Maintenance as loving ritual: gentle hand holds gravel siphon removing 25% water with measuring line on glass, algae scraper magnet cleans front glass revealing crystal clarity, bucket of fresh conditioned water with sparkles waits. Calendar icon shows weekly checkmarks. Cute cartoon beneficial bacteria character on filter sponge looks worried, holding tiny warning about washing in old tank water never tap water. Overall mood: nurturing, caring, peaceful — like tending beloved garden. Elegant guidebook style, navy/teal with golden accents, watercolor texture. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED",
    "title": { "text": "الخطوة 6+7 الحب اليومي 💙", "position": "top_center", "font_size": "24px", "color": "#FFFFFF", "background": "dark gradient" },
    "feeding_section": {
      "header": "🍽️ التغذية:",
      "items": ["✅ مرتين/يوم", "✅ رشة صغيرة (بدقيقتين ياكلونها)", "❌ الغلطة #1: أكل كثير!"]
    },
    "maintenance_section": {
      "header": "🔄 كل أسبوع:",
      "items": ["□ غيّر 25% ماء", "□ نظف الزجاج", "□ شيل بقايا الأكل"]
    },
    "filter_warning": { "text": "🧽 اغسل الفلتر بماء الحوض القديم ⚠️ مو بماء الحنفية! (تموت البكتيريا!)", "position": "bottom area", "color": "#FFD54F" }
  },
  "composition": { "layout": "Split: Top 50% = feeding scene, Bottom 50% = maintenance scene, connected by flowing water", "focus": "Both halves equally important" },
  "lighting": { "key_light": { "type": "Warm balanced aquarium LED — thriving ecosystem feel", "mood": "Nurturing, peaceful, garden-like" } },
  "color_palette": { "dominant": "#0A1F3B (navy — panel 7)", "accent": "#0D7377 (teal)", "golden": "#FFD54F", "plants": "#4CAF50" },
  "aquavo_branding": { "logo_text": "AQUAVO", "position": "bottom_right", "font": "10px, #FFFFFF at 40% opacity" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Hand sprinkling food like confetti", "Fish swimming up excitedly", "Pinch vs pile comparison (✅ vs ❌)", "Siphon removing 25% water", "Algae scraper cleaning glass", "Cute bacteria character warning", "Calendar with weekly checkmarks"],
    "exclusions": ["cartoon", "anime", "broken Arabic", "dirty messy tank", "coral reefs", "saltwater", "marine fish"],
    "critical_rules": ["Must feel like LOVING CARE not chores", "Bacteria character must be CUTE and worried", "Arabic PERFECTLY RENDERED", "Text readability NON-NEGOTIABLE"],
    "style_raw": true
  }
}
```

---

# 🔵 اللوح 8 — "عالمك صار جاهز!"

> الحوض تحفة فنية كاملة — حلم أصبح حقيقة + دعوة للتصوير والمشاركة

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Grand finale panel — Your World is Ready. Absolutely stunning, breathtaking underwater scene showing fully mature thriving aquarium at peak beauty. Dense lush vibrant plants create underwater forest canopy — tall vallisneria in back, java fern and anubias in middle, carpeting plants in front. Colorful freshwater fish swim in harmony — a school of glowing neon tetras catching the light, a majestic betta with flowing fins gliding through, peaceful corydoras catfish foraging on the bottom, tiny cherry shrimp perched on moss-covered driftwood. This is a FRESHWATER planted aquarium — lush green plants, natural driftwood, river rocks, NO coral reefs, NO saltwater elements. Decorations look like ancient mystical ruins — driftwood with moss archways, river rocks as natural terraces. Bioluminescent elements glow softly — tiny particles of golden and teal light float like magical fireflies. Brilliant golden god rays pour through perfectly clear water creating dancing caustic patterns. Scene so beautiful it feels like another dimension. Lower portion gracefully transitions to clean white space with phone camera icon suggesting photograph this, social media icons, circular teal QR code area, and AQUAVO logo space. Message clear: this beauty deserves sharing. Feeling: accomplishment, wonder, pride — YOU built this world. Premium, cinematic, National Geographic quality. Elegant guidebook style with photorealistic underwater elements. IMPORTANT: Arabic text rendered on image.",
  "text_overlay": {
    "language": "Arabic (Iraqi dialect)",
    "direction": "RTL",
    "font": "Cairo Bold",
    "rendering_note": "SHARP, READABLE, PROPERLY CONNECTED",
    "title": { "text": "✨ عالمك صار جاهز!", "position": "top_center", "font_size": "28px", "color": "#FFFFFF", "background": "dark gradient" },
    "subtitle": { "text": "شفت شلون 8 خطوات حولت علبة زجاج فارغة لعالم كامل؟ أنت سويت هذا. 💙", "position": "center overlay", "font_size": "16px", "color": "#E0F7FA" },
    "contact_section": {
      "items": ["🆘 تحتاج مساعدة؟", "📱 @aquavo_iq", "💬 واتساب: [رقم]", "🌐 aquavo.iq"],
      "position": "lower white area — right side"
    },
    "ugc_cta": {
      "text": "🎁 تبي خصم؟ 📸 صوّر حوضك → 📱 ستوري → 🏷️ تاگ @aquavo_iq ← نرسلك كود الخصم بالدايركت!",
      "hashtag": "#حوضي_مع_اكوافو 💙",
      "position": "lower white area — center"
    },
    "qr_code": { "position": "bottom_left", "style": "Teal circular border" },
    "logo": { "position": "bottom_right", "style": "AQUAVO infinity-fish logo" }
  },
  "composition": { "layout": "Top 70% = stunning underwater paradise, Bottom 30% = clean white contact/CTA area", "focus": "Maximum beauty and awe in underwater scene" },
  "lighting": { "key_light": { "type": "Golden god rays + bioluminescent glow throughout", "mood": "Magical, accomplished, proud, otherworldly" } },
  "color_palette": { "dominant": "#0D7377 (AQUAVO teal) + #FFD700 (gold bioluminescence)", "navy": "#0A1F3B", "white_area": "#FFFFFF", "sparkles": "#FFD700 + #00BCD4" },
  "aquavo_branding": { "logo": "Full AQUAVO infinity-fish logo", "position": "bottom_right of white area", "style": "Full color, prominent" },
  "technical": { "resolution": "4K", "aspect_ratio": "7:9", "format": "PNG", "print_ready": "350 DPI, CMYK" },
  "constraints": {
    "must_include": ["Breathtaking underwater paradise at peak beauty", "Multiple fish species in harmony", "Bioluminescent floating particles", "God rays through clear water", "Phone camera icon for UGC", "QR code area", "AQUAVO logo", "Contact info section", "UGC discount CTA with hashtag"],
    "exclusions": ["cartoon", "anime", "broken Arabic", "dull colors", "empty tank", "coral reefs", "saltwater", "marine fish", "clownfish", "anemone", "ocean"],
    "critical_rules": ["This must be the MOST BEAUTIFUL panel — magazine cover quality", "Bioluminescent glow is ESSENTIAL", "Arabic PERFECTLY RENDERED", "UGC CTA must be clear and prominent", "Transition from underwater to white area must be GRACEFUL"],
    "style_raw": true
  }
}
```

---

# 🖼️ بروموت البانوراما (الدليل مفتوح بالكامل)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Ultra-wide epic panoramic illustration of complete 8-panel accordion guidebook for AQUAVO, fully unfolded on wooden table. Panels create one continuous underwater journey right-to-left (Arabic): Panel 1 (right) warm room with empty aquarium glowing amber. Panel 2 transitions with water at edges. Panel 3 fully underwater — gravel falling like stars, driftwood city. Panel 4 equipment as glowing organs — teal heart filter, amber sun heater. Panel 5 dramatically dark — alchemical water transformation, stardust bacteria. Panel 6 emotional fish entering new home, golden light. Panel 7 thriving ecosystem, feeding/care rituals. Panel 8 (left) ultimate underwater paradise, bioluminescent glow, god rays, magic. Color progression: warm amber (right) → teal shades → deep navy → bioluminescent teal-gold (left). Subtle white space on each panel for Arabic text. Overall effect: one continuous underwater landscape telling complete visual story. AQUAVO infinity-fish logo on first and last panels. Premium print quality, watercolor texture, cinematic lighting.",
  "composition": { "layout": "8 connected panels in horizontal strip — continuous underwater landscape", "direction": "Right-to-left (Arabic reading direction)" },
  "color_palette": { "panel_1": "#FFF5E6", "panel_2": "#E0F2F1", "panel_3": "#B2DFDB", "panel_4": "#4DB6AC", "panel_5": "#0D7377", "panel_6": "#00695C", "panel_7": "#0A1F3B", "panel_8": "#0D7377 + gold" },
  "technical": { "resolution": "4K", "aspect_ratio": "8:1", "format": "PNG" },
  "constraints": {
    "must_include": ["8 distinct but connected panels", "Continuous color progression", "Each panel recognizable as its step", "AQUAVO logos on panels 1 and 8"],
    "exclusions": ["broken Arabic", "disconnected panels", "same color throughout", "coral reefs", "saltwater", "marine fish", "ocean elements"],
    "critical_rules": ["Panels must flow as ONE continuous image", "Color progression must be smooth and obvious", "Overall effect = underwater journey from surface to depths"],
    "style_raw": true
  }
}
```

---

# 🎬 بروموت واحد موحد — كل الـ 8 ألواح كـ Keyframes (نسخة مفصلة)

> **بروموت واحد يولّد كل الألواح بنفس تفاصيل البروموتات الأصلية بالضبط**

```
Generate 8 separate illustrated panels for an accordion-fold aquarium quick start guidebook. Each panel is a KEYFRAME — generate them one by one with IDENTICAL art style across all 8: elegant illustrated guidebook style, modern flat illustration with subtle 3D depth, soft watercolor texture overlay, hyper-detailed, premium print-ready quality (350 DPI, CMYK, 4K resolution, 7:9 aspect ratio, PNG format). Color palette: teal (#0D7377), navy (#0A1F3B), white accents. This is strictly a FRESHWATER planted aquarium guide — absolutely NO coral reefs, NO saltwater, NO marine fish, NO clownfish, NO anemone, NO ocean, NO sea creatures. All Arabic text must be PERFECTLY RENDERED with properly connected letters, RTL direction, Cairo Bold font, SHARP and READABLE — text readability is NON-NEGOTIABLE on every panel. AQUAVO branding: "AQUAVO" text at bottom_right of each panel, 10px, #FFFFFF at 40% opacity.

════════════════════════════════════════════════════════════════
KEYFRAME 1 / 8: "البوابة" — THE GATEWAY (Book Cover)
════════════════════════════════════════════════════════════════

SCENE: Book cover illustration for an aquarium quick start guide. The scene is a magical gateway between two worlds: The TOP THIRD shows a warm, cozy room with soft golden light, a wooden shelf, and a brand new EMPTY glass aquarium sitting on it, glowing with potential. The BOTTOM TWO-THIRDS show what the aquarium WILL become — a breathtaking underwater paradise visible THROUGH the glass, with lush freshwater plants (Anubias, Java Fern, Vallisneria), colorful freshwater fish (bettas with flowing fins, glowing neon tetras, guppies), elegant driftwood covered in moss, smooth river rocks, and god rays penetrating from above. This is a FRESHWATER planted aquarium — not saltwater, not marine, no coral reefs. The glass of the aquarium acts as a PORTAL between the mundane world and the magical underwater world. A subtle infinity-fish logo watermarked in teal at the top center. The color transition goes from warm amber at top to deep teal at bottom. Cinematic lighting, volumetric light rays through water, hyper-detailed illustration style mixing realism with fantasy. Magical, inviting, makes you want to dive in. IMPORTANT: Arabic text is rendered directly on the image as an integrated design element.

COMPOSITION:
- Layout: Top 33% = warm room with empty tank, Bottom 67% = underwater paradise through glass
- Framing: The aquarium glass is the portal — sharp edge divides two worlds
- Focus: Both worlds equally detailed — glass edge is the focal transition

LIGHTING:
- Top section: Warm golden ambient — cozy room feel, 3000K (warm), homey, inviting, real world
- Bottom section: Underwater volumetric god rays — teal and blue shimmer, 6500K (cool teal), magical, fantasy

COLOR PALETTE:
- Dominant top: #FFF5E6 (warm ivory)
- Dominant bottom: #0D7377 (AQUAVO teal)
- Transition: Warm amber → Deep teal gradient through glass
- Accent: #0A1F3B (navy)
- Text: #FFFFFF

BRANDING: Infinity-fish logo — teal watermark at top_center, 60% opacity

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "دليل البداية السريعة 🚀" — center (over the glass portal area), 28px, #FFFFFF, semi-transparent dark gradient overlay (rgba(0,0,0,0.5)), Bold, centered, inviting — magical feel
- Subtitle: "حوضك فارغ اليوم... بس بعد 8 خطوات راح يصير عالم! 🌊" — below title, 16px, #E0F7FA
- Bottom CTA: "← افتح وابدأ الرحلة" — bottom_center, 14px, #00BCD4, semi-transparent dark gradient at bottom

MUST INCLUDE: Arabic title "دليل البداية السريعة", Empty glass aquarium as portal between two worlds, Warm room above — underwater paradise below, AQUAVO infinity-fish logo watermark, God rays penetrating through water, Lush freshwater plants (Anubias, Java Fern, Vallisneria), freshwater fish (bettas, neon tetras, guppies), driftwood with moss, river rocks visible through glass
MUST NOT: cartoon, anime, broken Arabic letters, English-only text, neon colors, coral reefs, saltwater, marine fish, clownfish, anemone, ocean, sea creatures
CRITICAL: The portal effect must be IMMEDIATELY clear — two worlds divided by glass. Top = reality, Bottom = dream — the contrast sells the guide.

════════════════════════════════════════════════════════════════
KEYFRAME 2 / 8: "اختار عرشك" — CHOOSE YOUR THRONE
════════════════════════════════════════════════════════════════

SCENE: Split composition viewed from slightly underwater perspective, looking UP through the water surface at a beautifully lit room. LEFT SIDE (marked with glowing green checkmark): a sturdy wooden stand in a calm corner, away from windows, power outlet nearby — the aquarium sits like a throne, radiating calm teal glow, peaceful and stable. RIGHT SIDE (marked with glowing red X): same aquarium precariously placed on flimsy table near bright window with harsh sunlight streaming in, green algae wisps growing on glass, unstable and dangerous. Small illustrated icons float in water between scenes: thermometer showing stable temp with checkmark, sun with warning X, weight icon showing 1L=1kg. Freshwater aquatic plants (Anubias, Java Fern, floating Salvinia) frame the bottom edges naturally. Teal-to-white gradient flows upward. Clean infographic style with whimsical underwater elements. Educational yet enchanting.

COMPOSITION:
- Layout: 50/50 vertical split — LEFT=correct, RIGHT=wrong
- Framing: Underwater POV looking up through water surface at room
- Focus: Both sides equally sharp — contrast is key

LIGHTING:
- Left side: Calm teal LED glow — peaceful corner, Safe, inviting
- Right side: Harsh direct sunlight — overexposed window, Dangerous, wrong

COLOR PALETTE:
- Dominant: #E0F2F1 (light mint)
- Accent correct: #00BCD4 (teal)
- Accent wrong: #FF6B6B (red)
- Text: #FFFFFF

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "الخطوة 1 📍 اختار عرش حوضك" — top_center, 24px, #FFFFFF, semi-transparent dark gradient at top
- Left side label: "✅ مكان هادي + بعيد عن الشمس" — LEFT side, #00BCD4 (teal — CORRECT)
  - Sub items: "✅ سطح قوي (1 لتر = 1 كيلو!)", "✅ قريب من كهرباء"
- Right side label: "❌ جنب الشباك ❌ طاولة ضعيفة" — RIGHT side, #FF6B6B (red — WRONG)
- Bottom tip: "⚠️ حوض 60 لتر = 60 كيلو!" — bottom_center, 15px, #FFD54F, semi-transparent dark gradient at bottom

MUST INCLUDE: Arabic step title, LEFT correct placement with green ✅, RIGHT wrong placement with red ❌, Weight warning 60L=60kg, Underwater perspective looking up, Floating infographic icons
MUST NOT: cartoon, anime, broken Arabic, English-only, coral reefs, saltwater, marine fish, ocean elements
CRITICAL: Correct vs wrong must be IMMEDIATELY obvious. Educational infographic feel.

════════════════════════════════════════════════════════════════
KEYFRAME 3 / 8: "ابني عالمك" — BUILD YOUR WORLD
════════════════════════════════════════════════════════════════

SCENE: Fully underwater perspective — we are INSIDE the tank looking around. Colorful natural gravel falls through water in slow motion like tiny shimmering stars, settling into a perfect layered bed at bottom creating a miniature landscape of hills and valleys. Human hands seen from above water surface, slightly distorted by refraction, carefully arranging beautiful branching driftwood and smooth river rocks that look like ancient ruins of a tiny underwater city. Small aquatic plants being gently planted, delicate roots reaching into gravel. A white ceramic plate sits on gravel with crystal-clear water being poured gently onto it to avoid disturbing substrate — clever trick visualized beautifully. Tiny air bubbles rise everywhere in spiraling trails. Scene feels deeply meditative and magical — like building a tiny living world. Four numbered step icons subtly integrated as floating teal circles: wash, layer, arrange, pour.

COMPOSITION:
- Layout: Full underwater interior view — gravel falling from top, arranged world at bottom
- Focus: Gravel particles mid-fall + arranged landscape

LIGHTING:
- Key light: Warm amber from above — god rays through water surface and caustic patterns on gravel
- Mood: Meditative, magical, warm

COLOR PALETTE:
- Dominant: #B2DFDB (light teal)
- Gravel: #D4A574 (sandy)
- Water: #80CBC4
- Accent: #0D7377

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "الخطوة 2 🧹 ابني عالمك" — top_center, 24px, #FFFFFF, dark gradient
- Step ①: "اغسل الحصى (بدون صابون أبداً! 🚫)" — floating beside washing scene, #00BCD4
- Step ②: "سمك 3-5 سم بالقاع" — beside gravel layer, #00BCD4
- Step ③: "رتب الديكور: كبير بالخلف ← صغير بالأمام" — beside driftwood, #00BCD4
- Step ④: "صب الماء على صحن عشان ما يخرب!" — beside plate trick, #00BCD4
- Bottom tip: "💡 كل حبة حصى = أساس حياة جديدة" — bottom_center, 14px, #00BCD4

MUST INCLUDE: Gravel falling like stars through water, Hands arranging driftwood/rocks from above, Plate trick for pouring water, 4 numbered steps as floating icons, Air bubbles rising
MUST NOT: cartoon, anime, broken Arabic, English-only, coral reefs, saltwater, marine elements
CRITICAL: Scene must feel MEDITATIVE and magical. Underwater perspective — viewer is inside tank.

════════════════════════════════════════════════════════════════
KEYFRAME 4 / 8: "نبض الحياة" — HEARTBEAT OF LIFE
════════════════════════════════════════════════════════════════

SCENE: Artistic underwater scene where three pieces of equipment are drawn as magical life-giving organs connected by flowing energy. The FILTER on left illustrated as a glowing teal biological heart with flowing current lines pulsing outward like heartbeat rhythm, particles cleaned from water leaving sparkly trails. The HEATER in center glows warm amber/orange aura, circular temperature gauge showing 25°C, radiating warmth like tiny underwater sun with concentric heat rings. The LIGHT above shines down as golden beams through water surface, small clock overlay showing 8 hours only, cute tiny green algae monster characters at edge as playful warning. Flowing current lines connect all three in circular energy diagram showing unified system. Atmosphere of sleeping underwater world about to awaken — dark but glimmering. Bioluminescent particles float lazily. Beautiful, educational, enchanting, mysterious.

COMPOSITION:
- Layout: Three equipment pieces as glowing organs connected by energy flow lines
- Focus: Circular diagram showing unified system

LIGHTING:
- Key light: Bioluminescent glow from equipment + golden beams from above
- Mood: Awakening, mysterious, magical

COLOR PALETTE:
- Dominant: #4DB6AC (medium teal)
- Filter glow: #0D7377
- Heater glow: #FF8A65 (amber)
- Light glow: #FFD54F (golden)

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "الخطوة 3 ⚙️ نبض الحياة" — top_center, 24px, #FFFFFF, dark gradient
- Filter label: 💨 "الفلتر = قلب الحوض — ينظف ويحرك" — beside filter heart
- Heater label: 🌡️ "السخان = دفء الحوض — 25°م (انتظر 30 دق!)" — beside heater sun
- Light label: 💡 "الإضاءة = شمس الحوض — 8 ساعات بس!" — beside light
- Bottom warning: "⏰ استخدم تايمر! أكثر من 8 ساعات = 🟢 طحالب!" — bottom_center, 14px, #FFD54F

MUST INCLUDE: Filter as glowing teal heart, Heater as amber sun with 25°C gauge, Light with 8hr clock, Cute algae monster warning, Energy flow connecting all three, Bioluminescent particles
MUST NOT: cartoon, anime, broken Arabic, English-only, realistic equipment photos, coral reefs, saltwater, marine elements
CRITICAL: Equipment must look like LIVING ORGANS not machines. Energy flow diagram must be clear.

════════════════════════════════════════════════════════════════
KEYFRAME 5 / 8: "إكسير الحياة" — ELIXIR OF LIFE [MOST DRAMATIC PANEL]
════════════════════════════════════════════════════════════════

SCENE: The most dramatic panel — Preparing the Water shown as alchemical magical transformation. Vertically composed scene against DARK NAVY background: at top, ordinary tap water flows down like shimmering waterfall. As it passes through glowing teal potion bottle with water drop icon (water conditioner), water transforms — toxic chlorine particles shown as tiny angry red/orange molecules with evil faces dissolve, pop, vanish in sparks. Below, second mystical bottle with bacteria icon releases millions of tiny bioluminescent beneficial bacteria spreading through water like golden and teal stardust, like galaxies forming — they glow teal/gold trailing light as they colonize water. At bottom, water fully transformed into living, breathing, crystal-clear liquid with subtle magical golden shimmer and floating light particles. Large ornate hourglass on right shows 24-48 hours with golden sand falling. Dramatic red warning skull icon: chlorine + fish = danger. Overall feeling: pure alchemy — turning dead water into living magical water. Mystical, dramatic, cinematic volumetric lighting. Dark navy background, intensely glowing elements.

COMPOSITION:
- Layout: Vertical flow — tap water top → transformation middle → living water bottom
- Focus: Glowing bacteria stardust spreading through dark water

LIGHTING:
- Key light: Bioluminescent glow from bacteria + bottle glow against dark navy
- Mood: Mystical, dramatic, high contrast

COLOR PALETTE:
- Dominant: #0A1F3B (dark navy) — ESSENTIAL
- Bacteria: #0D7377 + #FFD700 (teal-gold stardust)
- Chlorine: #FF4444 (angry red)
- Potion: #00BCD4 (teal glow)

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "الخطوة 4 💧 إكسير الحياة" — top_center, 24px, #FFFFFF, dark gradient
- Warning banner: "⚠️ الخطوة الأهم!" — below title, 18px, #FF6B6B
- Flow step 1: 🚰 "ماء حنفية" — top of flow
- Flow step 2: ➕ "مزيل كلور (جرعة واحدة!)" — beside first bottle
- Flow step 3: ➕ "بكتيريا نافعة (النجوم الصغيرة!)" — beside second bottle
- Flow step 4: ⏳ "انتظر 24-48 ساعة" — beside hourglass
- Flow step 5: ✅ "الماء صار حي!" — at transformed water
- Danger warning: "🔴 لا تحط سمك بماء جديد = الكلور يگتله!" — bottom area, 14px, #FF4444
- Bottom tip: "💊 تحتاج: مزيل كلور + بكتيريا (موجودة عدنا! 😉)" — bottom_center, #00BCD4

MUST INCLUDE: Tap water flowing down as waterfall, Teal potion bottle dissolving red chlorine molecules, Bacteria bottle releasing golden-teal stardust, Hourglass showing 24-48 hours, Skull warning for chlorine danger, Transformed crystal-clear water at bottom
MUST NOT: cartoon, anime, bright cheerful colors, broken Arabic, coral reefs, saltwater, marine elements
CRITICAL: This is the MOST DRAMATIC panel — high contrast, cinematic. Bacteria must look like STARDUST/GALAXIES. Chlorine molecules must look ANGRY and TOXIC. Dark navy background is ESSENTIAL.

════════════════════════════════════════════════════════════════
KEYFRAME 6 / 8: "الضيوف الأوائل" — FIRST GUESTS [MOST EMOTIONAL PANEL]
════════════════════════════════════════════════════════════════

SCENE: Most emotional panel — pure wonder. Underwater perspective inside beautifully set-up aquarium with lush substrate, green plants, elegant driftwood, smooth rocks. At water surface, translucent plastic bag floats half-submerged — inside, beautiful colorful freshwater betta fish or a group of neon tetras peer out with wide, curious, amazed eyes at magnificent new home. Warm golden light pours through from above creating heavenly god rays. Three-step acclimation sequence flowing downward: Step 1 — sealed bag floating on surface with 15-minute timer, Step 2 — bag opened with small cup gently pouring tank water in, Step 3 — gentle net releasing fish into new world, surrounded by celebration bubbles, sparkles, golden light trails. Existing plants seem to welcome fish — leaves slightly leaning toward it, as if ecology greets first inhabitant. Crescent moon icon at bottom — lights off first day. Pure magic, wonder, tender care. Warm, soft, deeply emotional.

COMPOSITION:
- Layout: 3-step sequence flowing top to bottom — bag floating → bag open → fish free
- Focus: Fish's amazed eyes looking at new home

LIGHTING:
- Key light: Warm golden god rays from above — heavenly atmosphere
- Mood: Emotional, wonder, golden warmth

COLOR PALETTE:
- Dominant: #00695C (deep teal)
- Golden: #FFD700
- Water: #80CBC4
- Sparkles: #FFFFFF + #FFD700

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "الخطوة 5 🐟 الضيوف الأوائل" — top_center, 24px, #FFFFFF, dark gradient
- Step ①: "حط الكيس يطفو 15 دق ⏱️ (تعديل الحرارة)" — beside floating bag
- Step ②: "افتح الكيس + أضف ماء الحوض شوية شوية — 15 دق" — beside open bag
- Step ③: "طلع السمكة بالشبچة 🚫 لا تصب ماء الكيس!" — beside net release
- Bottom tip: "🌙 طفي الضوء أول يوم — خليهم يتعودون بهدوء" — bottom_center, #FFD54F

MUST INCLUDE: Fish in bag with wide curious eyes, 3-step acclimation sequence, Celebration bubbles and sparkles at release, Plants leaning toward fish welcoming it, Moon icon for lights off, Beautiful set-up tank from previous panels
MUST NOT: cartoon, anime, broken Arabic, scary fish, dead fish, coral reefs, saltwater, marine fish, clownfish
CRITICAL: Most EMOTIONAL panel — viewer must feel wonder. Fish eyes must show CURIOSITY and AMAZEMENT. Plants welcoming fish = tank ecology greeting its first inhabitant.

════════════════════════════════════════════════════════════════
KEYFRAME 7 / 8: "الحب اليومي" — DAILY LOVE
════════════════════════════════════════════════════════════════

SCENE: Tank completely alive and flourishing — colorful freshwater fish (neon tetras, guppies, corydoras, a betta) swim happily among dense lush green freshwater plants, elegant driftwood with java moss, stunning decorations. Panel gracefully split into two connected scenes by flowing water: TOP HALF — Feeding: gentle caring hand from above sprinkles tiny pinch of fish food flakes falling like colorful confetti, excited fish swim upward. Small clock shows twice daily, visual measuring guide shows tiny pinch with green checkmark vs large pile with red X. BOTTOM HALF — Weekly Maintenance as loving ritual: gentle hand holds gravel siphon removing 25% water with measuring line on glass, algae scraper magnet cleans front glass revealing crystal clarity, bucket of fresh conditioned water with sparkles waits. Calendar icon shows weekly checkmarks. Cute cartoon beneficial bacteria character on filter sponge looks worried, holding tiny warning about washing in old tank water never tap water. Overall mood: nurturing, caring, peaceful — like tending beloved garden.

COMPOSITION:
- Layout: Split: Top 50% = feeding scene, Bottom 50% = maintenance scene, connected by flowing water
- Focus: Both halves equally important

LIGHTING:
- Key light: Warm balanced aquarium LED — thriving ecosystem feel
- Mood: Nurturing, peaceful, garden-like

COLOR PALETTE:
- Dominant: #0A1F3B (navy)
- Accent: #0D7377 (teal)
- Golden: #FFD54F
- Plants: #4CAF50

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "الخطوة 6+7 الحب اليومي 💙" — top_center, 24px, #FFFFFF, dark gradient
- Feeding section header: "🍽️ التغذية:"
  - "✅ مرتين/يوم"
  - "✅ رشة صغيرة (بدقيقتين ياكلونها)"
  - "❌ الغلطة #1: أكل كثير!"
- Maintenance section header: "🔄 كل أسبوع:"
  - "□ غيّر 25% ماء"
  - "□ نظف الزجاج"
  - "□ شيل بقايا الأكل"
- Filter warning: "🧽 اغسل الفلتر بماء الحوض القديم ⚠️ مو بماء الحنفية! (تموت البكتيريا!)" — bottom area, #FFD54F

MUST INCLUDE: Hand sprinkling food like confetti, Fish swimming up excitedly, Pinch vs pile comparison (✅ vs ❌), Siphon removing 25% water, Algae scraper cleaning glass, Cute bacteria character warning, Calendar with weekly checkmarks
MUST NOT: cartoon, anime, broken Arabic, dirty messy tank, coral reefs, saltwater, marine fish
CRITICAL: Must feel like LOVING CARE not chores. Bacteria character must be CUTE and worried.

════════════════════════════════════════════════════════════════
KEYFRAME 8 / 8: "عالمك صار جاهز!" — YOUR WORLD IS READY! [GRAND FINALE]
════════════════════════════════════════════════════════════════

SCENE: Grand finale. Absolutely stunning, breathtaking underwater scene showing fully mature thriving aquarium at peak beauty. Dense lush vibrant plants create underwater forest canopy — tall vallisneria in back, java fern and anubias in middle, carpeting plants in front. Colorful freshwater fish swim in harmony — a school of glowing neon tetras catching the light, a majestic betta with flowing fins gliding through, peaceful corydoras catfish foraging on the bottom, tiny cherry shrimp perched on moss-covered driftwood. This is a FRESHWATER planted aquarium — lush green plants, natural driftwood, river rocks, NO coral reefs, NO saltwater elements. Decorations look like ancient mystical ruins — driftwood with moss archways, river rocks as natural terraces. Bioluminescent elements glow softly — tiny particles of golden and teal light float like magical fireflies. Brilliant golden god rays pour through perfectly clear water creating dancing caustic patterns. Scene so beautiful it feels like another dimension. Lower portion gracefully transitions to clean white space with phone camera icon suggesting photograph this, social media icons, circular teal QR code area, and AQUAVO logo space. Message clear: this beauty deserves sharing. Feeling: accomplishment, wonder, pride — YOU built this world. Premium, cinematic, National Geographic quality. Photorealistic underwater elements.

COMPOSITION:
- Layout: Top 70% = stunning underwater paradise, Bottom 30% = clean white contact/CTA area
- Focus: Maximum beauty and awe in underwater scene

LIGHTING:
- Key light: Golden god rays + bioluminescent glow throughout
- Mood: Magical, accomplished, proud, otherworldly

COLOR PALETTE:
- Dominant: #0D7377 (AQUAVO teal) + #FFD700 (gold bioluminescence)
- Navy: #0A1F3B
- White area: #FFFFFF
- Sparkles: #FFD700 + #00BCD4

BRANDING: Full AQUAVO infinity-fish logo — bottom_right of white area, Full color, prominent

TEXT OVERLAY (Arabic, Iraqi dialect, RTL, Cairo Bold):
- Title: "✨ عالمك صار جاهز!" — top_center, 28px, #FFFFFF, dark gradient
- Subtitle: "شفت شلون 8 خطوات حولت علبة زجاج فارغة لعالم كامل؟ أنت سويت هذا. 💙" — center overlay, 16px, #E0F7FA
- Contact section (lower white area — right side):
  - "🆘 تحتاج مساعدة؟"
  - "📱 @aquavo_iq"
  - "💬 واتساب: [رقم]"
  - "🌐 aquavo.iq"
- UGC CTA (lower white area — center): "🎁 تبي خصم؟ 📸 صوّر حوضك → 📱 ستوري → 🏷️ تاگ @aquavo_iq ← نرسلك كود الخصم بالدايركت!"
  - Hashtag: "#حوضي_مع_اكوافو 💙"
- QR code: bottom_left, Teal circular border
- Logo: bottom_right, AQUAVO infinity-fish logo

MUST INCLUDE: Breathtaking underwater paradise at peak beauty, Multiple fish species in harmony, Bioluminescent floating particles, God rays through clear water, Phone camera icon for UGC, QR code area, AQUAVO logo, Contact info section, UGC discount CTA with hashtag
MUST NOT: cartoon, anime, broken Arabic, dull colors, empty tank, coral reefs, saltwater, marine fish, clownfish, anemone, ocean
CRITICAL: This must be the MOST BEAUTIFUL panel — magazine cover quality. Bioluminescent glow is ESSENTIAL. UGC CTA must be clear and prominent. Transition from underwater to white area must be GRACEFUL.

════════════════════════════════════════════════════════════════
GLOBAL STYLE CONSISTENCY RULES (Apply to ALL 8 keyframes)
════════════════════════════════════════════════════════════════

ART STYLE: Elegant illustrated guidebook, modern flat illustration with subtle 3D depth, soft watercolor texture overlay — IDENTICAL across all 8 panels. Hyper-detailed, premium quality.

COLOR PROGRESSION across panels (smooth gradient journey):
Panel 1: #FFF5E6 (warm ivory) → Panel 2: #E0F2F1 (light mint) → Panel 3: #B2DFDB (light teal) → Panel 4: #4DB6AC (medium teal) → Panel 5: #0D7377 (deep teal) → Panel 6: #00695C (deep teal-green) → Panel 7: #0A1F3B (dark navy) → Panel 8: #0D7377 + #FFD700 (teal-gold bioluminescence)

TYPOGRAPHY: All Arabic text — Cairo Bold font, RTL direction, PERFECTLY RENDERED connected letters, SHARP and READABLE. Semi-transparent dark gradient backgrounds behind text for readability. Title at top_center of each panel at 24-28px in #FFFFFF.

TECHNICAL: 4K resolution, 7:9 aspect ratio, PNG format, 350 DPI, CMYK color mode, print-ready premium quality.

ABSOLUTE EXCLUSIONS (NEVER in any panel): cartoon style, anime style, broken/disconnected Arabic letters, English-only text, neon colors, coral reefs, saltwater fish, marine fish, clownfish, anemone, ocean scenes, sea creatures.
```

---

*آخر تحديث: فبراير 2026 — AQUAVO*

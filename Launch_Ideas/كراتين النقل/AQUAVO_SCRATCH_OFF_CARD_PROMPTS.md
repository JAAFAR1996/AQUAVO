# 🎨 بروموتات بطاقة الكشط — AQUAVO Scratch-Off Card Prompts
## Image Generation Prompts — بصيغة TODAY.md

---

> **ملاحظة مهمة:** النص العربي يُضاف لاحقاً بـ Canva/Photoshop — البروموتات تولّد التصميم فقط!

---

# 🔵 البروموت 1 — الوجه الأمامي (البطاقة العادية)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Top-down flat lay product photograph of a premium scratch-off discount card for an aquarium e-commerce brand called AQUAVO. The card is credit-card sized (90x55mm), made of thick 400gsm cardstock with a luxurious Soft-Touch matte finish. The design features a rich gradient background flowing from dark navy (#0A1F3B) on the left to deep teal (#0D7377) on the right, with a subtle elegant wave pattern overlay creating depth. At the top center: a refined infinity-fish logo in white with a subtle Spot UV glossy shine effect catching the light. Below the logo: the brand name 'AQUAVO' in elegant white sans-serif typography with subtle gold (#FFD700) accent line underneath. The centerpiece is THREE silver holographic scratch-off rectangles arranged in a horizontal row, each approximately 20x15mm, with iridescent rainbow holographic shimmer reflecting light beautifully — they look premium, shiny, and extremely satisfying to scratch. Each scratch zone has a subtle number embossed (1, 2, 3). Below the scratch zones: a thin gold decorative divider line. The card sits on a dark slate surface with a single gold coin positioned nearby (for scratching), a few gold confetti pieces scattered artfully, and the edge of a teal AQUAVO shipping box visible in the corner. The overall mood is premium, exciting, mysterious — like opening a luxury gift. Professional overhead product photography, sharp focus on holographic scratch areas catching light, shallow depth of field on background elements, moody dramatic lighting from upper-left creating elegant shadows. Shot with 50mm macro lens, f/4. 4K resolution.",
  "text_overlay": {
    "note": "DO NOT render Arabic text in the AI image — text will be added in Canva/Photoshop",
    "placeholder_text": "Use English placeholder text only: 'AQUAVO' brand name, numbers '1 2 3' on scratch zones",
    "font": "Clean sans-serif (Montserrat or similar)",
    "colors": "White text on dark background, gold accents"
  },
  "composition": {
    "layout": "Top-down flat lay — card centered, props arranged around edges",
    "card_orientation": "Horizontal (landscape — credit card format)",
    "focal_point": "Three holographic scratch-off zones — maximum shimmer and light play",
    "negative_space": "Minimal — card fills 60% of frame, dark surface fills rest"
  },
  "lighting": {
    "key_light": {
      "type": "Soft directional light from upper-left — creates elegant shadows under card",
      "mood": "Premium, mysterious, exciting"
    },
    "accent_light": {
      "type": "Spot light hitting holographic scratch zones — maximum rainbow shimmer",
      "effect": "Holographic areas catch light and create iridescent rainbow reflections"
    }
  },
  "color_palette": {
    "card_background": "Gradient: #0A1F3B (navy) → #0D7377 (teal)",
    "scratch_zones": "Holographic silver with rainbow iridescence",
    "logo": "#FFFFFF (white) with Spot UV shine",
    "accents": "#FFD700 (gold)",
    "surface": "Dark slate/charcoal — #1A1A2E"
  },
  "aquavo_branding": {
    "logo": "Infinity-fish logo — white with Spot UV effect",
    "position": "top_center of card",
    "brand_name": "AQUAVO — white elegant typography below logo"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "3:2",
    "format": "PNG",
    "print_ready": "350 DPI, CMYK"
  },
  "constraints": {
    "must_include": [
      "Credit-card sized card with Soft-Touch matte finish visible",
      "Navy-to-teal gradient background with wave pattern",
      "THREE holographic silver scratch-off zones in a row",
      "Holographic shimmer and rainbow reflections on scratch zones",
      "AQUAVO infinity-fish logo at top in white",
      "Gold coin nearby for scratching",
      "Gold confetti pieces scattered",
      "Dark premium surface"
    ],
    "exclusions": [
      "Arabic text",
      "broken text",
      "cheap-looking design",
      "bright colors",
      "cartoon style",
      "coral reefs",
      "saltwater elements",
      "cluttered composition"
    ],
    "critical_rules": [
      "Scratch zones MUST look holographic and iridescent — premium feel",
      "Card must feel LUXURIOUS — like opening a high-end gift",
      "NO Arabic text — will be added later in design software",
      "Overall mood: mysterious + exciting + premium",
      "The 3 scratch zones are the hero element — maximum visual impact"
    ],
    "style_raw": true
  }
}
```

---

# 🔵 البروموت 2 — الوجه الأمامي بعد الكشط (Reveal!)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Top-down flat lay product photograph of a scratched AQUAVO discount card — the exciting REVEAL moment! Same premium credit-card sized card (90x55mm) with navy-to-teal gradient background and wave pattern. The LEFT scratch zone has been scratched off — silver holographic coating partially removed revealing golden text underneath showing '15%' in bold celebratory gold typography with a small star/sparkle icon, the revealed area has a warm golden glow effect. The MIDDLE scratch zone is FULLY INTACT — untouched silver holographic surface still shimmering. The RIGHT scratch zone is also FULLY INTACT — holographic silver gleaming. Silver scratch-off shavings and tiny metallic particles are scattered naturally on the card surface and the dark slate table around it, catching the light like tiny stars. A gold coin sits nearby with metallic dust on its edge — clearly used for scratching. Small gold confetti pieces around. The feeling is EXCITEMENT — like a lottery winner moment! The contrast between the scratched golden reveal and the untouched silver zones creates beautiful visual tension. Sharp focus on the revealed '15%', slightly softer on intact zones. Professional product photography, overhead angle, dramatic side lighting making metallic particles sparkle. 4K resolution.",
  "text_overlay": {
    "note": "Only render '15%' in the scratched zone — no Arabic text",
    "revealed_text": "15% in bold gold on white background — visible through scratched area",
    "font": "Bold, celebratory font with sparkle effect"
  },
  "composition": {
    "layout": "Top-down flat lay — scratched card as hero, metallic shavings tell the story",
    "focal_point": "The scratched zone revealing '15%' — maximum excitement",
    "story": "One zone scratched (reveal!), two zones remaining (mystery!) = visual tension"
  },
  "lighting": {
    "key_light": {
      "type": "Dramatic side lighting — metallic shavings and particles sparkle like stars",
      "mood": "Exciting, celebratory, lottery-winner energy"
    }
  },
  "color_palette": {
    "revealed_area": "#FFD700 (gold text) on #FFFFFF (white background)",
    "intact_zones": "Holographic silver — still shimmering with possibility",
    "shavings": "Silver metallic catching light",
    "card": "Navy → teal gradient"
  },
  "aquavo_branding": {
    "logo": "AQUAVO infinity-fish logo still visible at top of card",
    "position": "top_center"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "3:2",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "ONE zone scratched showing '15%' in gold",
      "TWO zones still intact with holographic silver",
      "Silver scratch-off shavings scattered on card and table",
      "Gold coin with metallic dust on edge",
      "Sense of excitement and celebration",
      "Metallic particles catching dramatic light"
    ],
    "exclusions": ["Arabic text", "all zones scratched", "cheap look", "cartoon", "coral reefs"],
    "critical_rules": [
      "The CONTRAST between scratched reveal and intact mystery zones is KEY",
      "Metallic shavings must look REAL and naturally scattered",
      "The '15%' reveal must feel like a CELEBRATION",
      "NO Arabic text — added later",
      "Intact zones create 'what if?' — Near-Miss psychology visible!"
    ],
    "style_raw": true
  }
}
```

---

# 🔵 البروموت 3 — الوجه الخلفي

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Top-down flat lay product photograph of the BACK side of a premium scratch-off discount card for AQUAVO aquarium brand. Credit-card sized (90x55mm), thick 400gsm white matte cardstock. The back has a STRUCTURED VERTICAL LAYOUT with clearly separated sections from top to bottom: SECTION 1 (TOP): A small clipboard/instructions emoji icon followed by three numbered lines (1, 2, 3) with placeholder English text representing usage steps — each line starts with a circled number (①②③). These are placeholder lines where Arabic instructions will be added later. SECTION 2 (CENTER — HERO): A prominent rounded-corner rectangle with a teal (#0D7377) dashed border, CENTERED on the card. Inside: a small key icon, placeholder label text, and below it a code 'AQ-7K3M-R2D5' in dark navy (#0A1F3B) bold monospace font (Courier/Monaco style). This is the unique discount code area — it is the LARGEST and MOST PROMINENT element on the back. SECTION 3 (BELOW CODE): Two lines with small icons — a phone/globe icon with 'aquavo.iq' placeholder text, and a chat bubble icon with a placeholder phone number format '07XX-XXX-XXXX'. SECTION 4 (TERMS): Two small lines with clock icon showing '30' and money icon showing '50,000' — placeholder for validity terms (Arabic added later). SECTION 5 (DIVIDER): A thin horizontal teal line separating terms from social section. SECTION 6 (SOCIAL CTA): A camera icon, a hashtag icon with placeholder hashtag text, a gift icon with placeholder text — this is the social media sharing call-to-action zone. SECTION 7 (BOTTOM): A small fish icon with 'AQUAVO' brand text centered — the brand tagline footer. The overall design is CLEAN and STRUCTURED — white background, dark navy text, teal accents only. Generous spacing between sections. The card sits on the same dark slate surface, positioned next to the front side of the card (partially visible showing holographic scratch zones). A gold coin and small confetti pieces nearby. Professional overhead product photography, even soft lighting, sharp focus. 4K resolution.",
  "text_overlay": {
    "note": "Use English placeholder text ONLY — ALL Arabic text will be added later in Canva/Photoshop",
    "code_text": "AQ-7K3M-R2D5 in bold monospace font — this is the hero element",
    "brand_text": "AQUAVO — centered at bottom as tagline",
    "instruction_numbers": "① ② ③ — numbered steps at top (Arabic text added later)",
    "contact_placeholder": "aquavo.iq and 07XX-XXX-XXXX as placeholder contact info",
    "social_placeholder": "Hashtag icon + camera icon in social CTA section"
  },
  "composition": {
    "layout": "Top-down flat lay — back of card centered, front card visible at edge",
    "design_layout": "7 structured vertical sections: instructions → code box → contact → terms → divider → social CTA → brand tagline",
    "focal_point": "The discount code rectangle in the CENTER — largest and most prominent element",
    "spacing": "Generous vertical spacing between each section — clean and breathable"
  },
  "lighting": {
    "key_light": {
      "type": "Soft even overhead lighting — white card requires balanced illumination",
      "mood": "Clean, professional, trustworthy"
    }
  },
  "color_palette": {
    "background": "#FFFFFF (white card)",
    "text": "#0A1F3B (dark navy — all text and icons)",
    "accents": "#0D7377 (teal — code box border, divider line, brand accents)",
    "code_box_border": "#0D7377 (teal dashed rounded rectangle)",
    "code_text": "#0A1F3B (dark navy bold monospace)",
    "surface": "#1A1A2E (dark slate table)"
  },
  "aquavo_branding": {
    "logo": "Small infinity-fish icon + 'AQUAVO' text at bottom center as tagline",
    "position": "bottom_center",
    "tagline_style": "Fish icon followed by brand name — like a footer signature"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "3:2",
    "format": "PNG",
    "print_ready": "350 DPI, CMYK"
  },
  "constraints": {
    "must_include": [
      "White matte card — clean structured layout",
      "THREE numbered instruction lines at top (①②③) with placeholder text",
      "PROMINENT discount code box with teal dashed border containing 'AQ-7K3M-R2D5'",
      "Contact info line with globe and chat icons",
      "Terms line with clock and money icons",
      "Thin teal horizontal divider line",
      "Social CTA section with camera, hashtag, and gift icons",
      "AQUAVO brand tagline at bottom with fish icon",
      "Front of card visible at edge for context"
    ],
    "exclusions": ["Arabic text", "QR code", "cluttered design", "colorful backgrounds", "cartoon", "coral reefs"],
    "critical_rules": [
      "Layout must have 7 CLEARLY SEPARATED vertical sections — not jumbled together",
      "Code box is the HERO — largest, most prominent, centered element",
      "NO Arabic text — ALL text added later in Canva/Photoshop",
      "NO QR code — the description does NOT include a QR code",
      "White space between sections is INTENTIONAL — keeps it clean and readable",
      "Use ICONS (emoji-style) to represent each section's purpose visually",
      "The card should feel EASY TO READ — like clear instructions, not a cluttered receipt"
    ],
    "style_raw": true
  }
}
```

---

# 🔵 البروموت 4 — البطاقة الذهبية النادرة (1%)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Stunning top-down flat lay product photograph of an ULTRA-RARE gold scratch-off card for AQUAVO aquarium brand — the legendary 1-in-100 golden card! Same credit-card size (90x55mm) but ENTIRELY premium gold treatment. Background is a rich deep black (#0A0A0A) with subtle gold particle texture — like looking into deep space filled with gold dust. The AQUAVO infinity-fish logo is rendered in shining gold foil at top center, catching light with metallic luster. Brand name 'AQUAVO' below in gold foil typography. Three scratch zones are GOLD holographic instead of silver — rich warm gold with orange-gold iridescent shimmer, even more premium and eye-catching than the regular silver version. A subtle embossed crown or star icon is pressed into the card above the scratch zones. The card edges have a thin gold foil border frame. The card sits on black velvet fabric (luxurious texture visible) with real gold confetti pieces scattered around, a gold coin, and dramatic spotlighting creating a halo of warm golden light around the card. Small sparkle effects where gold foil catches light. This card screams RARE, EXCLUSIVE, LEGENDARY — anyone who receives it knows immediately it's special. Ultra-premium product photography, dramatic moody lighting with golden highlights, sharp macro detail on gold foil textures. 4K resolution.",
  "text_overlay": {
    "note": "English only — 'AQUAVO' in gold foil, numbers '1 2 3' on scratch zones",
    "brand_name": "AQUAVO — gold foil typography"
  },
  "composition": {
    "layout": "Top-down flat lay on black velvet — golden card as centerpiece",
    "focal_point": "Gold holographic scratch zones + gold foil logo",
    "mood_setting": "Like photographing a rare artifact or precious jewel"
  },
  "lighting": {
    "key_light": {
      "type": "Dramatic warm spotlight from above — creates golden halo around card",
      "mood": "Legendary, exclusive, treasure-like"
    },
    "accent_light": {
      "type": "Side light catching gold foil and holographic textures",
      "effect": "Gold foil reflects warm light, holographic zones shimmer with golden iridescence"
    }
  },
  "color_palette": {
    "card_background": "#0A0A0A (deep black) with gold particle texture",
    "gold_foil": "#FFD700 → #FFA000 (warm gold gradient)",
    "scratch_zones": "Gold holographic with warm iridescence",
    "surface": "Black velvet with subtle texture",
    "confetti": "Gold metallic pieces"
  },
  "aquavo_branding": {
    "logo": "Infinity-fish logo in GOLD FOIL — shining metallic",
    "position": "top_center",
    "brand_name": "AQUAVO — gold foil embossed typography"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "3:2",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "ALL-GOLD premium card — black background with gold elements",
      "Gold foil AQUAVO logo — metallic shine visible",
      "THREE gold holographic scratch zones (not silver!)",
      "Gold foil border frame around card edges",
      "Black velvet surface — luxurious texture",
      "Gold confetti and coin as props",
      "Golden spotlight halo effect",
      "Embossed crown or star icon"
    ],
    "exclusions": ["Silver scratch zones", "cheap look", "Arabic text", "bright background", "cartoon", "coral reefs"],
    "critical_rules": [
      "This card must look LEGENDARY — like holding a treasure",
      "Gold foil textures must be REALISTIC — light reflections essential",
      "Immediately recognizable as DIFFERENT from regular silver card",
      "Black + Gold only — no other colors except AQUAVO teal on logo optionally",
      "Anyone seeing this card should think 'I WANT THIS!'"
    ],
    "style_raw": true
  }
}
```

---

# 🔵 البروموت 5 — الفلات لاي الكامل (كل العناصر)

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Magazine-quality overhead flat lay photograph showing the complete AQUAVO scratch-off card experience arranged beautifully on a dark wooden surface. The arrangement tells a visual story from left to right: on the LEFT, a closed teal AQUAVO mailer box with the infinity-fish sticker seal visible. In the CENTER-LEFT, the scratch-off card front side (navy-to-teal gradient with three holographic silver scratch zones gleaming). CENTER, a gold coin positioned as if ready to scratch. CENTER-RIGHT, a second card that has been scratched — one zone revealing '20%' in gold, silver shavings scattered artfully around it to show the action happened. On the RIGHT, the card flipped showing the back side (white, clean, code area visible). Scattered around all elements: small gold confetti pieces, a tiny sprig of preserved greenery, silver metallic shavings from the scratching. A finger (human hand, natural skin tone) reaches in from the bottom-right corner holding a coin mid-scratch on another card — capturing the ACTION of scratching in real-time. The composition flows like a narrative: RECEIVE → SCRATCH → REVEAL → USE CODE. Warm moody lighting from upper-left, all metallic elements catch light beautifully. Professional styled product photography, perfectly arranged, magazine editorial quality. High resolution, 4K.",
  "composition": {
    "layout": "Left-to-right narrative flow: box → unscratched card → coin → scratched card → back side",
    "story_flow": "RECEIVE → SCRATCH → REVEAL → USE CODE",
    "hero_element": "The mid-scratch action — hand with coin",
    "styling": "Magazine editorial flat lay — intentional but natural arrangement"
  },
  "lighting": {
    "key_light": {
      "type": "Warm directional from upper-left — dramatic but elegant shadows",
      "mood": "Lifestyle editorial — warm, inviting, exciting"
    }
  },
  "color_palette": {
    "surface": "Dark walnut wood — warm undertones",
    "cards": "Navy/teal gradient (front), white (back)",
    "metallic": "Silver holographic + gold accents + gold confetti",
    "box": "Teal (#0D7377) with white logo"
  },
  "aquavo_branding": {
    "logo_on_box": "AQUAVO infinity-fish sticker on mailer box",
    "logo_on_cards": "AQUAVO logo visible on both card sides"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "4:3",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "AQUAVO mailer box (closed, sticker seal visible)",
      "Unscratched card showing 3 holographic zones",
      "Scratched card revealing '20%' with silver shavings",
      "Card back showing code area",
      "Gold coin — used for scratching",
      "Human hand/finger mid-scratch action",
      "Gold confetti scattered",
      "Silver metallic shavings from scratching",
      "Dark wood surface"
    ],
    "exclusions": ["Arabic text", "cluttered mess", "cheap props", "cartoon", "coral reefs", "bright white background"],
    "critical_rules": [
      "Must tell a STORY — the narrative flow from receive to reveal is essential",
      "Human hand adds LIFE and ACTION — not just static products",
      "Magazine editorial quality — could be published in a design magazine",
      "All metallic elements (holographic, foil, shavings) must CATCH LIGHT beautifully",
      "NO Arabic text — added later"
    ],
    "style_raw": true
  }
}
```

---

# 🔵 البروموت 6 — مقارنة: بطاقة عادية vs ذهبية

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Dramatic product comparison photograph showing two AQUAVO scratch-off cards side by side on a dark surface. LEFT: the regular card with navy-to-teal gradient and three SILVER holographic scratch zones — beautiful but standard. RIGHT: the ultra-rare GOLDEN card with deep black background and three GOLD holographic scratch zones, gold foil logo and border — unmistakably special and legendary. Both cards are credit-card sized (90x55mm), positioned at a slight angle to each other for dynamic composition. A subtle golden glow radiates from the right (golden) card casting warm light on the surface, while the left (regular) card has a cooler teal ambient glow. Between the two cards: a gold coin. The visual contrast between silver and gold, between standard and legendary, tells the whole story without words. A small text overlay could read 'Regular vs. RARE' but this will be added in post. Dark charcoal concrete surface. Dramatic split lighting — cool blue-teal light on left card, warm golden light on right card. Sharp focus on both cards equally. Professional comparison product photography, editorial quality. 4K.",
  "composition": {
    "layout": "Side-by-side comparison — regular (left) vs golden rare (right)",
    "angle": "Both cards at slight dynamic angles — not perfectly parallel",
    "focal_point": "Both cards equally sharp — the contrast IS the focus",
    "visual_story": "Standard beauty vs legendary rarity — the golden card is clearly special"
  },
  "lighting": {
    "split_lighting": {
      "left": "Cool teal-blue ambient — complements the regular silver card",
      "right": "Warm golden spotlight — makes the golden card glow like treasure"
    }
  },
  "color_palette": {
    "regular_card": "Navy #0A1F3B → Teal #0D7377 gradient, silver holographic",
    "golden_card": "Deep black #0A0A0A, gold foil #FFD700, gold holographic",
    "surface": "Dark charcoal concrete",
    "coin": "Gold metallic"
  },
  "aquavo_branding": {
    "regular_logo": "White infinity-fish on regular card",
    "golden_logo": "Gold foil infinity-fish on golden card"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "16:9",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "Two cards side by side — clear visual comparison",
      "Regular card: silver scratch zones, navy-teal gradient",
      "Golden card: gold scratch zones, black background, gold foil",
      "Split lighting — cool left, warm right",
      "Gold coin between the cards",
      "Both AQUAVO logos visible"
    ],
    "exclusions": ["Arabic text", "more than 2 cards", "cartoon", "coral reefs", "messy arrangement"],
    "critical_rules": [
      "The CONTRAST between regular and golden must be DRAMATIC and IMMEDIATE",
      "Golden card must look CLEARLY more premium — like it belongs in a museum",
      "Split lighting reinforces the comparison — essential technique",
      "Both cards must look premium — the golden is just EXTRA legendary",
      "NO Arabic text — added later"
    ],
    "style_raw": true
  }
}
```

---

# ⚙️ نصائح التوليد

| النصيحة | التفاصيل |
|---------|----------|
| **لا تكتب عربي** | AI يشوّه النص العربي — ولّد فارغة أو إنجليزي، وغيّره بـ Canva |
| **`--no text`** | بـ Midjourney عشان ما يحط نص مشوّه |
| **نسبة العرض** | `--ar 3:2` للبطاقة الأفقية، `--ar 4:3` للفلات لاي |
| **Stylize** | `--s 50-75` للواقعية (مهم للبطاقات!) |
| **الإضاءة** | تأكد الهولوغرافيك يلمع — "holographic shimmer catching light" |
| **الخلفية** | Dark slate/charcoal = فاخر | Black velvet = أسطوري (للذهبية) |
| **عدة زوايا** | ولّد: overhead, 45-degree, close-up macro on scratch zones |

---

*آخر تحديث: فبراير 2026 — AQUAVO*

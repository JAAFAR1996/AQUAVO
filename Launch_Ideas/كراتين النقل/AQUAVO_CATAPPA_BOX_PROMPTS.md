# 🎨 AQUAVO Catappa Extract — Drawer Box Image Prompts

> **Purpose:** Use these prompts with AI image generators (Gemini 2.5 / Midjourney / DALL-E 3)
> **Product:** Premium Catappa Extract — 10 PLA Biodegradable Pyramid Tea Bags
> **Box Type:** Drawer-style sliding box (200×85×45mm)
> **Brand Colors:** Deep Forest Green (#1B3A2D) + Warm Gold (#C8A96E) + Ivory (#F5F0E8)
> **Finishes:** Soft-touch matte + Spot UV + Gold hot foil + Blind debossing

---

# ═══════════════════════════════════════════
# 📦 DRAWER BOX — CATAPPA EXTRACT
# 📐 Sleeve: 200×85×45mm | Tray: 195×80×40mm
# 📋 البروموتات: 1 - 6
# ═══════════════════════════════════════════

---

## 🌿 Prompt 1: Drawer Box — Hero 3/4 Angle (Closed)

> 💡 **Style:** Ultra-premium luxury packaging photography
> 🎯 **Goal:** First impression — the box must look like it costs $100+

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Ultra-premium studio product photograph of a luxury drawer-style sliding box (200×85×45mm) for a premium aquarium botanical brand called AQUAVO. The box is fully closed, showing the outer sleeve at a 3/4 angle from the upper-right revealing the front face and right side panel simultaneously. OUTER SLEEVE: Deep forest green (#1B3A2D) background with soft-touch matte lamination creating a velvety texture across the entire surface. CENTER FRONT: The brand name 'AQUAVO' in warm gold (#C8A96E) hot foil stamping with wide letter-spacing (tracked capitals) in an elegant high-contrast serif typeface (Playfair Display style). The gold foil catches the studio light creating a lustrous metallic shimmer. Below the brand name, a thin gold ornamental divider line with a small diamond accent. Below that, 'PREMIUM CATAPPA EXTRACT' in spot UV gloss varnish — the text is the same dark green color but with a high-gloss coating that creates a dramatic matte-vs-gloss contrast visible at certain angles, catching light like liquid glass. Below in smaller ivory (#F5F0E8) italic serif text: 'Terminalia Catappa Leaf Infusion'. Near the bottom: '✦ 10 Biodegradable Pyramid Tea Bags ✦' in ivory text, and '100% Natural' with thin line ornaments. A subtle blind-debossed pattern of Terminalia catappa (Indian almond) leaves covers the background — visible only at certain angles when light rakes across the surface, adding a hidden tactile dimension. A small gold foil leaf icon sits above the AQUAVO wordmark. RIGHT SIDE PANEL: Small 'AQUAVO' text at top, 'Natural Water Conditioner' and 'Blackwater Formula' in ivory, with a small gold leaf icon. The box sits on a dark charcoal surface (#1A1A1A) creating dramatic contrast. Professional studio lighting with a key light from the upper-left catching the gold foil shimmer and a rim light from behind creating a subtle glow along the box edges.",
  "text_on_product": {
    "items": [
      { "text": "AQUAVO", "location": "front center — gold hot foil, tracked capitals, serif", "style": "gold foil stamping, Playfair Display Bold, letter-spacing +150" },
      { "text": "PREMIUM CATAPPA EXTRACT", "location": "front below brand name", "style": "spot UV gloss on matte — same green with glossy coating" },
      { "text": "Terminalia Catappa Leaf Infusion", "location": "front below product name", "style": "italic serif, ivory (#F5F0E8)" },
      { "text": "✦ 10 Biodegradable Pyramid Tea Bags ✦", "location": "front lower section", "style": "ivory text, small sans-serif" },
      { "text": "100% Natural", "location": "front bottom", "style": "ivory with thin line ornaments" },
      { "text": "AQUAVO", "location": "right side panel top", "style": "small ivory" },
      { "text": "Natural Water Conditioner", "location": "right side panel center", "style": "ivory" },
      { "text": "Blackwater Formula", "location": "right side panel below", "style": "ivory" }
    ]
  },
  "camera_simulation": {
    "lens": "85mm prime",
    "aperture": "f/4.0",
    "iso": "100",
    "angle": "3/4 angle from upper-right — reveals front face + right side",
    "distance": "medium — box fills 65% of frame",
    "style": "luxury cosmetics/perfume packaging photography — Chanel-level"
  },
  "composition": {
    "layout": "box slightly off-center, positioned on lower-right third",
    "background": "#1A1A1A dark charcoal seamless surface",
    "rule_of_thirds": "gold AQUAVO logo at center-left intersection",
    "negative_space": "generous dark space around box — creates gallery feel",
    "depth": "shallow depth — front crisp, back slightly softer"
  },
  "lighting": {
    "key_light": "large softbox from upper-left at 45° — soft diffused, rakes across surface to reveal debossed leaf pattern",
    "accent_light": "focused spot from upper-right — catches gold foil, creates brilliant shimmer",
    "rim_light": "subtle backlight — creates thin bright edge glow along box silhouette",
    "fill_light": "minimal — dark shadows preserved for drama",
    "spot_UV_highlight": "light angle specifically chosen so spot UV text catches reflection and visibly contrasts with matte surface",
    "mood": "dramatic, editorial, luxury brand campaign"
  },
  "color_palette": {
    "box_background": "#1B3A2D (deep forest green — soft-touch matte)",
    "gold_foil": "#C8A96E (warm champagne gold — metallic catch-light)",
    "ivory_text": "#F5F0E8 (warm off-white)",
    "surface_background": "#1A1A1A (dark charcoal)",
    "spot_UV": "transparent high-gloss coating on green text"
  },
  "material_details": {
    "sleeve": "350gsm FSC art board, rigid, premium weight",
    "finish": "soft-touch matte lamination — velvety texture, zero fingerprints",
    "foil": "gold hot foil stamping — real metallic warmth",
    "spot_UV": "high-gloss UV varnish on 'PREMIUM CATAPPA EXTRACT' text only",
    "debossing": "blind deboss — Terminalia catappa leaf pattern, no ink, texture only",
    "edge_quality": "clean, precise edges — no rough cuts"
  },
  "technical": {
    "resolution": "4K (3840×2880)",
    "aspect_ratio": "4:3",
    "format": "PNG",
    "color_space": "sRGB"
  },
  "constraints": {
    "must_include": [
      "deep forest green soft-touch matte sleeve",
      "gold hot foil 'AQUAVO' wordmark with metallic shimmer",
      "spot UV gloss contrast on 'PREMIUM CATAPPA EXTRACT'",
      "subtle blind-debossed leaf pattern on surface",
      "ivory text elements",
      "small gold leaf icon above brand name",
      "drawer-style box structure (visible seam line where drawer meets sleeve)"
    ],
    "exclusions": ["cartoon", "illustration", "bright colors", "glossy surface overall", "nature background", "plants around box", "any product visible outside box"],
    "critical_rules": [
      "The soft-touch matte finish MUST be visually evident — velvety, non-reflective surface",
      "Gold foil must shimmer realistically — not flat yellow ink",
      "Spot UV must show visible matte-vs-gloss contrast",
      "Debossed leaf pattern should be subtle — seen at angles only",
      "Overall feel: luxury perfume/cosmetics level, NOT a cardboard box",
      "Text must be crisp and legible — no blurry letters",
      "The box should look like it belongs in Harrods or a luxury boutique"
    ],
    "style_raw": true
  }
}
```

---

## 🌿 Prompt 2: Drawer Box — The Slide-Out Reveal

> 💡 **Style:** The money shot — drawer half-pulled, pyramid bags peeking out
> 🎯 **Goal:** Capture THE unboxing moment that makes people film and share

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "A stunning unboxing hero photograph of the AQUAVO Premium Catappa Extract drawer box with the inner tray pulled halfway out of the deep forest green (#1B3A2D) outer sleeve. The sleeve remains stationary while the ivory (#F5F0E8) inner tray slides out from the right side, revealing a row of neatly arranged PLA biodegradable pyramid tea bags inside. The pyramid bags are translucent amber/golden mesh material with visible dark catappa extract granules inside, each bag connected to an unbleached cotton string with a small ivory tag hanging over the edge. The tags show 'AQUAVO' in tiny gold text. The inner tray surface is clean ivory/off-white with a subtle embossed AQUAVO watermark. The outer sleeve shows the full front design: gold foil 'AQUAVO', spot UV 'PREMIUM CATAPPA EXTRACT', and the blind-debossed leaf pattern catching side light beautifully. The half-open drawer creates a dramatic diagonal line across the composition. Shot on a dark marble surface with warm brown and grey veining. Dramatic side lighting from the left creates deep shadows under the extended tray and highlights the gold foil on the sleeve. The pyramid bags inside are the hero — they glow slightly amber where light passes through the translucent PLA material. The composition evokes anticipation and discovery.",
  "text_on_product": {
    "items": [
      { "text": "AQUAVO", "location": "outer sleeve front — gold hot foil", "style": "tracked serif capitals, metallic gold" },
      { "text": "PREMIUM CATAPPA EXTRACT", "location": "outer sleeve front — spot UV", "style": "gloss on matte contrast" },
      { "text": "Terminalia Catappa Leaf Infusion", "location": "outer sleeve — italic", "style": "ivory serif italic" },
      { "text": "AQUAVO", "location": "each tea bag tag (tiny)", "style": "gold micro-text on ivory tag" }
    ]
  },
  "camera_simulation": {
    "lens": "50mm prime",
    "aperture": "f/2.8 — shallow depth for dreamy bokeh on far tags",
    "iso": "200",
    "angle": "30° from above — looking down into the half-open drawer",
    "distance": "medium-close — box fills 75% of frame",
    "style": "luxury unboxing reveal — editorial cosmetics photography"
  },
  "composition": {
    "hero_element": "the half-pulled drawer revealing amber pyramid bags",
    "diagonal_line": "drawer edge creates strong diagonal — dynamic energy",
    "focus_point": "nearest pyramid bag in sharp focus, far bags in soft bokeh",
    "background": "dark marble surface with subtle veining",
    "depth_layers": "sleeve text (medium) → nearest bag (sharp) → far bags (bokeh)"
  },
  "lighting": {
    "key_light": "dramatic side light from left — rakes across sleeve showing debossed pattern",
    "accent_light": "warm spot from above-right — illuminates pyramid bags from behind, creating amber glow through translucent PLA",
    "rim_light": "backlight catching gold foil edge and sleeve silhouette",
    "shadow": "deep shadow under extended tray — creates dramatic depth",
    "mood": "warm, intimate, luxurious discovery moment"
  },
  "color_palette": {
    "sleeve": "#1B3A2D (deep forest green matte)",
    "tray": "#F5F0E8 (ivory inner surface)",
    "gold_foil": "#C8A96E (warm gold shimmer)",
    "pyramid_bags": "translucent amber/golden PLA mesh",
    "catappa_extract": "dark reddish-brown granules inside bags",
    "tags": "#F5F0E8 ivory with gold text",
    "surface": "dark marble (#2A2A2A with natural veining)"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "4:3",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "drawer box half-open — tray extending from sleeve",
      "visible PLA pyramid tea bags neatly arranged inside tray",
      "amber/golden translucent pyramid bag material",
      "cotton strings with small ivory tags",
      "gold foil AQUAVO on sleeve catching light",
      "spot UV text contrast visible"
    ],
    "exclusions": ["flat-lay view", "fully open box", "products scattered", "bright background", "cartoon"],
    "critical_rules": [
      "The half-open drawer is THE hero composition — creates anticipation",
      "Pyramid bags must look premium — translucent, amber-toned PLA, not cheap plastic",
      "Gold foil must shimmer realistically in the lighting",
      "This must look like the most Instagram-worthy unboxing moment",
      "The image should make viewers want to BUY immediately"
    ]
  }
}
```

---

## 🌿 Prompt 3: Drawer Box — Back Panel Info Design

> 💡 **Style:** Clean information design — readable product photography
> 🎯 **Goal:** Show the back panel with all text perfectly readable

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Straight-on front view of the back panel of the AQUAVO Premium Catappa Extract drawer box. The back panel features a clean, well-organized information layout on the deep forest green (#1B3A2D) soft-touch matte surface. TOP: small gold foil AQUAVO logo centered. ABOUT SECTION: beneath a thin gold line with 'ABOUT' header in small tracked ivory capitals, body text in ivory (#F5F0E8) reads: 'Each pyramid bag contains a concentrated blend of pure Terminalia catappa (Indian Almond) leaf extract — rich in natural tannins, humic acids, and beneficial compounds.' BENEFITS SECTION: six bullet points with small gold diamond markers (✦): 'Lowers pH naturally', 'Releases beneficial tannins', 'Antibacterial & antifungal properties', 'Reduces fish stress', 'Enhances natural color vibrancy', 'Ideal for Betta, shrimp & tropical fish'. HOW TO USE SECTION: three numbered steps in ivory text: '1. Brew the bag in a cup of warm water outside the tank.', '2. Wait 5–10 minutes until the water turns amber.', '3. Remove the bag and pour the clear extract into the aquarium to maintain a clean aquascape without leaf debris.' DOSAGE: '1 bag per 40–80 liters of aquarium water.' DETAILS: Contents, Material, Shelf Life columns. BOTTOM: eco-certification icons (FSC, PLA Compostable), 'aquavo.com | @aquavo.iq', QR code in a thin gold border frame, barcode, 'Made with ♥ in Iraq'. Typography hierarchy uses serif for headers, sans-serif for body text, all in ivory on dark green. Clean, elegant, pharmaceutical-grade information design.",
  "text_on_product": {
    "items": [
      { "text": "AQUAVO", "location": "top center", "style": "small gold foil logo" },
      { "text": "ABOUT", "location": "section header", "style": "small tracked ivory capitals" },
      { "text": "Each pyramid bag contains a concentrated blend of pure Terminalia catappa (Indian Almond) leaf extract — rich in natural tannins, humic acids, and beneficial compounds.", "location": "about body", "style": "ivory 8pt sans-serif" },
      { "text": "HOW TO USE", "location": "section header", "style": "small tracked ivory capitals" },
      { "text": "1. Brew the bag in a cup of warm water outside the tank.", "location": "step 1", "style": "ivory" },
      { "text": "2. Wait 5–10 minutes until the water turns amber.", "location": "step 2", "style": "ivory" },
      { "text": "3. Remove the bag and pour the clear extract into the aquarium to maintain a clean aquascape without leaf debris.", "location": "step 3", "style": "ivory" },
      { "text": "aquavo.com | @aquavo.iq", "location": "bottom", "style": "ivory small text" },
      { "text": "Made with ♥ in Iraq", "location": "very bottom", "style": "ivory micro text" }
    ]
  },
  "camera_simulation": {
    "lens": "90mm macro",
    "aperture": "f/8.0 — everything tack-sharp",
    "iso": "100",
    "angle": "straight-on 0° — perfectly parallel to back panel",
    "distance": "close — back panel fills 90% of frame",
    "style": "clean information design photography — pharmaceutical/luxury beauty"
  },
  "composition": {
    "layout": "back panel fills frame, perfectly centered and square",
    "background": "none visible — panel fills frame",
    "focus": "every character tack-sharp and readable"
  },
  "lighting": {
    "key_light": "even, flat studio lighting — no shadows on text",
    "fill": "matched from both sides — no directional shadow",
    "mood": "clean, clinical, professional — maximum readability"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "3:4 (vertical — back panel is taller than wide)",
    "format": "PNG"
  },
  "constraints": {
    "critical_rules": [
      "ALL text must be perfectly legible and crisp",
      "Typography hierarchy must be clear — headers vs body vs fine print",
      "The information design must look clean and organized — not cramped",
      "QR code must be visible and appear scannable",
      "This is a reference image for the actual printer — accuracy is critical"
    ]
  }
}
```

---

## 🌿 Prompt 4: Drawer Box — Overhead Flat-Lay (Fully Open)

> 💡 **Style:** Instagram flat-lay — everything laid out beautifully
> 🎯 **Goal:** Show all components of the packaging system

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Overhead bird's-eye flat-lay photograph of the complete AQUAVO Premium Catappa Extract packaging system, beautifully arranged on a warm white linen fabric surface. CENTER: the ivory inner tray with 10 PLA biodegradable pyramid tea bags neatly arranged in 2 rows of 5, each bag containing dark amber catappa extract granules visible through the translucent golden PLA mesh. Cotton strings with ivory tags fan out elegantly from each bag. LEFT: the deep forest green outer sleeve lying flat showing the front design — gold foil AQUAVO, spot UV text, debossed leaf pattern. UPPER-RIGHT: a single pyramid tea bag removed from the tray, placed on its own to show detail — the pyramidal 3D tetrahedron shape clearly visible, with tag reading 'AQUAVO' on front and 'Brew. Pour. Enjoy.' on back. LOWER-LEFT: a small dried Terminalia catappa leaf (brown, ovate shape) placed as a natural prop to show the raw ingredient. LOWER-RIGHT: a clear glass cup with amber-colored brewed catappa extract tea, showing the result of brewing one bag. Warm natural daylight from the upper-left window, creating soft shadows. The arrangement feels curated, intentional, and Instagram-perfect — botanical luxury meets aquarium science.",
  "text_on_product": {
    "items": [
      { "text": "AQUAVO", "location": "outer sleeve — gold foil", "style": "metallic gold tracked serif" },
      { "text": "PREMIUM CATAPPA EXTRACT", "location": "outer sleeve — spot UV", "style": "gloss on matte" },
      { "text": "AQUAVO", "location": "tea bag tag front", "style": "tiny gold foil" },
      { "text": "Brew. Pour. Enjoy.", "location": "tea bag tag back", "style": "tiny dark green italic serif" },
      { "text": "CATAPPA EXTRACT", "location": "tea bag tag back above tagline", "style": "tiny dark green sans-serif" }
    ]
  },
  "camera_simulation": {
    "lens": "35mm prime",
    "aperture": "f/4.0",
    "iso": "200",
    "angle": "90° directly overhead — true bird's-eye flat-lay",
    "style": "curated botanical flat-lay — Kinfolk magazine aesthetic"
  },
  "composition": {
    "layout": "intentional spacing between all elements — everything breathes",
    "background": "warm white linen fabric with subtle texture (#FAF7F2)",
    "arrangement": "tray center, sleeve left, single bag upper-right, leaf lower-left, cup lower-right",
    "rule_of_thirds": "tray occupies center, props at corners",
    "negative_space": "generous — elegant and uncluttered"
  },
  "lighting": {
    "key_light": "natural window light from upper-left — warm, soft, golden-hour quality",
    "shadow_quality": "soft directional shadows falling lower-right",
    "color_temperature": "warm 4500K — cozy, inviting, botanical",
    "mood": "serene, curated, natural luxury"
  },
  "color_palette": {
    "linen": "#FAF7F2 (warm white)",
    "sleeve": "#1B3A2D (deep forest green)",
    "tray": "#F5F0E8 (ivory)",
    "gold_foil": "#C8A96E",
    "pyramid_bags": "translucent amber/golden PLA",
    "catappa_extract": "dark reddish-brown inside bags",
    "brewed_tea": "warm amber liquid (#8B5E3C)",
    "dried_leaf": "brown with natural veining (#6B4226)"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "1:1 (square — optimized for Instagram feed)",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "inner tray with 10 pyramid bags visible (2×5 arrangement)",
      "outer sleeve lying flat showing front design",
      "single pyramid bag isolated showing 3D tetrahedron shape",
      "tag showing 'Brew. Pour. Enjoy.' tagline",
      "glass cup with brewed amber catappa extract",
      "dried catappa leaf as natural prop"
    ],
    "exclusions": ["fish", "aquarium", "water tank", "cluttered scene", "dark background"],
    "critical_rules": [
      "The pyramid bags must clearly show their 3D tetrahedron shape",
      "Cotton strings and tags should be arranged elegantly — not tangled",
      "The amber brewed liquid in the cup is a key selling point — must be visible",
      "Overall composition must feel like a high-end botanical brand — not pet store",
      "This image should work as AQUAVO's hero Instagram post"
    ]
  }
}
```

---

## 🌿 Prompt 5: Tea Bag Tag — Macro Close-Up

> 💡 **Style:** Ultra-close macro product photography
> 🎯 **Goal:** Show the micro-branding detail on the tiny tag

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Extreme macro close-up photograph of a single AQUAVO tea bag tag (28×32mm) attached to an unbleached cotton string, which connects to a PLA biodegradable pyramid tea bag visible in soft bokeh behind it. TAG FRONT (in focus): Ivory/off-white (#F5F0E8) textured cotton paper (300gsm) with visible fiber texture. A small minimalist leaf icon debossed at the top center. Below it, 'AQUAVO' wordmark gold foil stamped in elegant serif capitals — the metallic gold catches light beautifully against the matte paper. The tag has slightly rounded corners. The cotton string passes through a small hole at the top of the tag, knotted neatly. TAG BACK (visible at an angle in secondary position): Another identical tag turned to show the reverse side — 'CATAPPA EXTRACT' in small dark green (#1B3A2D) sans-serif text at top, a thin horizontal line divider, then 'Brew. Pour. Enjoy.' in italic dark green serif text below. Behind both tags, the connected pyramid tea bag floats in beautiful creamy bokeh — its amber translucent PLA mesh and dark catappa granules creating a warm golden glow. The surface beneath is dark slate (#2A2A2A) with natural stone texture. Ultra-shallow depth of field with the front tag perfectly sharp and everything else dissolving into dreamy bokeh.",
  "text_on_product": {
    "items": [
      { "text": "AQUAVO", "location": "tag front — center, gold foil", "style": "gold hot foil stamp, serif capitals" },
      { "text": "CATAPPA EXTRACT", "location": "tag back — top", "style": "dark green sans-serif, small" },
      { "text": "Brew. Pour. Enjoy.", "location": "tag back — below divider line", "style": "dark green italic serif" }
    ]
  },
  "camera_simulation": {
    "lens": "100mm macro",
    "aperture": "f/2.0 — ultra-shallow depth of field",
    "iso": "200",
    "angle": "45° — showing front tag face with back tag at angle",
    "distance": "very close — tag fills 60% of frame",
    "style": "luxury macro product photography — jewelry-level detail"
  },
  "composition": {
    "hero_element": "the 28×32mm tag with gold foil AQUAVO",
    "focus_point": "gold foil text on front tag = sharpest point in image",
    "bokeh": "creamy, warm, circular — pyramid bag dissolves into golden blur",
    "depth_layers": "tag (tack-sharp) → string (medium) → pyramid bag (beautiful bokeh)",
    "background": "dark slate surface (#2A2A2A)"
  },
  "lighting": {
    "key_light": "small focused light from upper-left — highlights gold foil shimmer and paper texture",
    "backlight": "warm amber glow through pyramid bag in bokeh — ethereal warmth",
    "fill": "minimal — dark shadows for drama",
    "mood": "intimate, detailed, precious — like photographing a piece of jewelry"
  },
  "material_details": {
    "tag_paper": "300gsm FSC textured cotton paper — visible natural fiber grain",
    "tag_finish": "uncoated, natural tactile feel",
    "gold_foil": "hot foil stamp — real metallic warmth, catches micro-reflections",
    "string": "unbleached cotton — natural cream color, slightly fuzzy texture",
    "debossed_leaf": "subtle pressed impression in paper — no ink, texture only"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "4:3",
    "format": "PNG"
  },
  "constraints": {
    "critical_rules": [
      "The tag is only 28×32mm — it must read as SMALL and precious",
      "Gold foil must look like REAL metallic foil — not yellow ink",
      "Paper texture must be visible — natural cotton fiber grain",
      "The 'Brew. Pour. Enjoy.' tagline is a key branding element — must be legible",
      "The pyramid bag in bokeh adds warmth — it should glow amber"
    ]
  }
}
```

---

## 🌿 Prompt 6: Drawer Box — Lifestyle Usage Scene

> 💡 **Style:** Warm lifestyle photography — the product IN USE
> 🎯 **Goal:** Show HOW to use the product — the brew-and-pour method

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "prompt_narrative": "Warm lifestyle photograph showing the AQUAVO Premium Catappa Extract being used beside a beautiful planted aquarium. On a clean light oak wooden shelf or table surface: the deep forest green AQUAVO drawer box sits with the drawer slightly pulled out, one pyramid bag removed. Next to the box, a clear glass cup or beaker filled with warm water shows a pyramid tea bag steeping — the water has turned a rich amber/tannin color as the catappa extract infuses. The cotton string and ivory tag hang over the rim of the cup with 'AQUAVO' visible on the tag. Behind the cup and box, slightly out of focus, a stunning planted freshwater nano aquarium (20-30cm) with lush green aquatic plants (Anubias, Java Fern, Bucephalandra), a piece of natural driftwood, and a few small tropical fish (Neon Tetras or a Betta) swimming. The aquarium has warm LED lighting creating a golden-green glow. The scene tells the complete story: premium box → brew the bag → pour into tank. Natural window light from the left blends with the aquarium's warm glow. The overall mood is serene, natural, and aspirational — this is someone's peaceful aquarium corner at home. Shallow depth of field keeps the box and cup sharp while the aquarium provides a beautiful contextual bokeh backdrop.",
  "text_on_product": {
    "items": [
      { "text": "AQUAVO", "location": "box sleeve — gold foil", "style": "metallic gold, visible but not hero" },
      { "text": "AQUAVO", "location": "tea bag tag on cup rim", "style": "tiny gold text on ivory tag" }
    ]
  },
  "camera_simulation": {
    "lens": "50mm prime",
    "aperture": "f/2.5 — shallow depth, aquarium in soft focus",
    "iso": "400",
    "angle": "eye-level, slightly from left — natural viewing angle",
    "distance": "medium — box + cup + aquarium all in frame",
    "style": "warm editorial lifestyle — Kinfolk / aquarium hobbyist aesthetic"
  },
  "composition": {
    "foreground": "AQUAVO box (sharp) + glass cup with steeping bag (sharp)",
    "midground": "transition zone — soft focus",
    "background": "planted nano aquarium with warm LED glow (beautiful bokeh)",
    "story": "the complete usage journey: box → brew → pour → beautiful tank",
    "rule_of_thirds": "cup at left-center, aquarium fills right half"
  },
  "lighting": {
    "key_light": "natural window light from left — warm, soft, golden-hour",
    "aquarium_light": "warm white LED from inside tank — creates golden-green glow in bokeh",
    "color_temperature": "warm 4000K — cozy, serene, peaceful",
    "shadow_quality": "soft, natural, no harsh edges",
    "mood": "peaceful, aspirational, 'I want this in my home'"
  },
  "color_palette": {
    "box": "#1B3A2D (deep forest green)",
    "gold_foil": "#C8A96E",
    "brewed_catappa": "#8B5E3C (warm amber tannin water)",
    "oak_surface": "#D4B896 (light oak wood)",
    "aquarium_plants": "various greens (#2D5F2D to #4A7C59)",
    "aquarium_light": "warm golden-green glow"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "16:9 (cinematic — optimized for website banner or YouTube thumbnail)",
    "format": "PNG"
  },
  "constraints": {
    "must_include": [
      "AQUAVO drawer box with drawer slightly open",
      "glass cup with pyramid bag steeping in amber-colored water",
      "tag visible on cup rim",
      "planted freshwater aquarium in background (NOT marine/saltwater)",
      "warm natural lighting"
    ],
    "exclusions": ["marine fish", "coral", "saltwater", "sea creatures", "clinical/lab setting", "messy scene", "dark room"],
    "critical_rules": [
      "The aquarium must be FRESHWATER planted — NOT marine/saltwater",
      "The amber brewed water is a KEY visual — shows the product working",
      "The scene must feel aspirational — 'I want this peaceful corner'",
      "The box must be identifiable but not overpowering — it's a lifestyle shot",
      "Fish must be freshwater species ONLY (Tetras, Betta, Guppies, Rasboras)"
    ]
  }
}
```

---

> **Version:** 1.0
> **Created:** February 26, 2026
> **Product:** AQUAVO Premium Catappa Extract
> **Total Prompts:** 6

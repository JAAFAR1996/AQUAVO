# 🎨 دليل برومبتات منتجات YEE للذكاء الاصطناعي
## YEE Products AI Visual Production Prompts

> **مرجع شامل لإنشاء صور إعلانية احترافية لجميع منتجات YEE**
> 
> مستوحى من: COMPLETE_AI_VISUAL_PRODUCTION_GUIDE.md

---

# 📑 فهرس المحتويات

1. [إعدادات عامة للمنتجات المائية](#1-إعدادات-عامة)
2. [أغذية الأسماك](#2-أغذية-الأسماك)
3. [معالجات المياه والأدوية](#3-معالجات-المياه)
4. [السخانات](#4-السخانات)
5. [أجهزة القياس](#5-أجهزة-القياس)
6. [مواد الفلترة](#6-مواد-الفلترة)
7. [معدات التربية والتفريخ](#7-معدات-التربية)
8. [إكسسوارات الحوض](#8-إكسسوارات-الحوض)
9. [برومبتات الفيديو والتحريك](#9-برومبتات-الفيديو)

---

# 1. إعدادات عامة للمنتجات المائية

## 1.1 الخلفية المثالية للمنتجات المائية

### خلفية أحواض السمك الفاخرة
```
Professional aquarium product photography setup with blurred planted aquarium background, crystal-clear water with subtle light rays, tropical fish silhouettes in soft bokeh, deep teal and emerald gradient, PRODUCT positioned on natural driftwood or black volcanic stone, studio rim lighting emphasizing product form, shot on Sony A7R V with 90mm macro lens, f/4, professional product advertising quality
```

### خلفية استوديو مائية
```
Ultra-clean studio product shot with water droplets effect, pure gradient background transitioning from deep ocean blue to aqua teal, soft caustic light patterns on surface, PRODUCT centered with dramatic three-point lighting, rim light creating product halo, wet surface reflections, 4K resolution, luxury aquarium brand aesthetic
```

### خلفية طبيعة مائية
```
Cinematic product placement in natural aquatic environment, morning mist over calm lake surface, golden hour lighting with warm reflections, PRODUCT emerging from water with droplets frozen in motion, nature documentary quality, shot on ARRI Alexa with prime lens, shallow depth of field, National Geographic style
```

---

## 1.2 قالب JSON الأساسي للمنتجات

```json
{
  "model": "gemini-2.5-flash-image",
  "task_type": "generation",
  "priority": {
    "primary": "Create professional aquarium product advertisement",
    "secondary": "Maintain exact product shape, branding, and textures"
  },
  "subject": {
    "main": "[PRODUCT NAME]",
    "attributes": {
      "physical": "[exact dimensions, colors, materials]",
      "branding": "YEE logo visible and sharp"
    }
  },
  "environment": {
    "setting": "professional studio with aquatic elements",
    "background": "[gradient/aquarium/water effects]",
    "lighting": {
      "type": "three-point studio lighting",
      "quality": "soft diffused with rim highlights",
      "direction": "45-degree key, fill from opposite, rim from behind"
    }
  },
  "style": {
    "artistic": "commercial product photography",
    "camera": {
      "angle": "[hero shot / 45-degree / close-up]",
      "lens": "85mm portrait or 90mm macro"
    },
    "mood": "premium, clean, professional"
  },
  "technical": {
    "resolution": "4K",
    "aspect_ratio": "4:5 for Instagram, 9:16 for Reels",
    "quality": "maximum sharpness"
  },
  "constraints": {
    "exclusions": ["blur", "noise", "watermarks", "text overlays", "competing products"]
  }
}
```

---

# 2. أغذية الأسماك 🐟

## 2.1 C1-1113 | طعام سمك صغير متكامل 0.6mm 75g

### برومبت الصورة الرئيسية
```
Professional product photograph of YEE Small Fish Feed bottle (75g, 0.6mm micro pellets), positioned on smooth white marble surface with scattered micro pellets creating leading lines toward product, dramatic studio lighting with soft shadows, crystal clear acrylic container showcasing golden-amber pellet color, YEE branding prominently displayed, background gradient from pure white to soft aqua blue, school of tiny neon tetras in ethereal bokeh behind product, shot on Phase One XF with 80mm lens, f/5.6, luxury fish food advertising quality
```

### برومبت نمط الماكرو
```
Extreme close-up macro shot of YEE micro fish pellets 0.6mm, individual pellets visible with precise spherical shape, golden-amber color with subtle texture variations, pellets scattered on reflective black surface with water droplet effects, dramatic side lighting revealing pellet surface detail, shallow depth of field creating soft background blur, scientific precision aesthetic, shot with Canon MP-E 65mm macro lens at 3:1 magnification
```

### برومبت الاستخدام
```
Lifestyle product shot showing YEE fish food being dispensed above crystal-clear nano aquarium, golden micro pellets falling in slow-motion through water, excited small fish (neon tetras, guppies) swimming toward food, underwater caustic lighting effects, split-level shot showing both above and below waterline, bright cheerful mood, morning sunlight streaming through window, 4K cinematic quality
```

---

## 2.2 C1-1073 | طعام أسماك البيتا 0.8mm 130g

### برومبت الصورة الرئيسية
```
Premium product photography of YEE Betta Fish Food 130g bottle, sophisticated dark studio environment, product positioned on black obsidian stone, single magnificent Halfmoon Betta fish swimming in soft bokeh background with iridescent fins catching light, deep crimson and royal purple color palette, dramatic Rembrandt lighting emphasizing product textures, YEE logo with subtle metallic sheen, shot on Hasselblad H6D with 100mm lens, f/4, premium pet food aesthetic
```

### برومبت تفاعلي
```
Dynamic action shot of Betta fish attacking YEE food pellet with explosive speed, frozen motion photography capturing water splash and pellet in fish's mouth, dramatic lighting creating rim light on Betta's flowing fins, deep blue-black background with bokeh bubbles, high-speed photography aesthetic, powerful and energetic mood, shot at 1/8000 shutter speed, professional wildlife photography quality
```

---

## 2.3 C1-1082-2A | طعام محاكاة الدود الأحمر 0.5mm 115g

### برومبت الصورة الرئيسية
```
Artistic product photograph of YEE Imitation Red Worm Feed bottle, warm studio lighting mimicking golden hour, red-orange pellets visible through clear container creating vibrant color accent, natural wood display base with moss accent, tropical fish aquarium in dreamy background bokeh, rich earth tones with pops of coral red, product hero shot from 30-degree angle, shot on Nikon Z9 with 85mm f/1.4, luxury aquarium food branding
```

### برومبت طبيعي
```
Nature-inspired product shot of YEE red worm feed with real bloodworm reference, side-by-side comparison showing natural worm color matching pellet color, educational infographic style, clean scientific presentation with measurement scale, bright even lighting, white background with subtle shadows, product transparency showing pellet consistency, informative advertising style
```

---

## 2.4 C1-1065 | حبوب عائمة درجة المسابقات 45% بروتين 300g

### برومبت الصورة الرئيسية
```
Championship-grade product photography of YEE Competition Grade Floating Pellets 45% protein bag, dynamic composition with scattered golden pellets floating on water surface, professional competition aquarium in background with prize-winning goldfish, trophy and medal elements in bokeh, powerful gold and black color scheme, dramatic stadium-style lighting, product positioned at victory angle, shot on RED Komodo with premium lens, sports achievement aesthetic
```

### برومبت علمي
```
Scientific product visualization of YEE High Protein fish food, cross-section diagram showing pellet composition, protein percentage infographic overlay, nutrition comparison chart style, clean medical/scientific aesthetic, bright laboratory lighting, product floating in test tube with magnified view, educational content quality, professional research presentation style
```

---

## 2.5 C1-1066 | طعام الروبيان الزينة 40% بروتين 260g

### برومبت الصورة الرئيسية
```
Elegant product photography of YEE Ornamental Shrimp Food 260g, positioned on natural aquarium moss carpet, colony of vibrant Crystal Red Shrimp (CRS) grazing in artistic bokeh background, soft green and red color harmony, gentle diffused lighting mimicking planted tank ambient, product showcasing premium Japanese packaging design, zen aquascape aesthetic, shot on Fujifilm GFX with 110mm lens, tranquil luxury feel
```

### برومبت ماكرو للروبيان
```
Macro product shot showing YEE shrimp food pellet being consumed by single Crystal Red Shrimp, extreme close-up capturing shrimp's feeding behavior, pellet texture visible with shrimp claws, crystalline water with micro bubbles, shallow depth of field isolating subject, scientific documentary style, soft diffused aquarium lighting, professional aquaculture photography
```

---

## 2.6 C1-1086 | أرتيميا مجففة 18g 225ml

### برومبت الصورة الرئيسية
```
Premium freeze-dried product photography of YEE Brine Shrimp 225ml container, golden-orange artemia visible through clear container, scattered brine shrimp pieces on black slate surface, dramatic rim lighting creating product halo, deep ocean blue gradient background, water splash frozen in motion near product, nutritional premium quality feel, shot on Sony A1 with 90mm macro, f/5.6, high-end aquarium nutrition branding
```

---

## 2.7 C1-1124 | طعام بيتا 3 في 1 15g

### برومبت مصغر فاخر
```
Boutique product photography of YEE 3-in-1 Betta Food mini container 15g, positioned on elegant marble pedestal, single stunning Betta fish portrait in background with flowing fins, luxury cosmetics-style presentation, soft feminine lighting with pink and purple accents, reflective surface showing product mirror image, premium small-format packaging aesthetic, shot with beauty dish lighting, high-fashion product style
```

---

## 2.8 C1-1125 | وليمة سلطعون الناسك المجففة 55g

### برومبت الصورة الرئيسية
```
Exotic pet food photography of YEE Hermit Crab Freeze-Dried Feast 55g, beach-themed studio setup with real sand and small shells, hermit crab specimen in natural pose near product, tropical sunset gradient background with palm silhouette, warm golden lighting, product positioned at dynamic angle, adventure and exotic pet care mood, vacation tropical aesthetic, shot on Canon R5 with 70-200mm lens
```

---

## 2.9 YYY-078 | بيض الأرتيميا الجديد 80g مع مفرخة

### برومبت مجموعة كاملة
```
Complete kit product photography of YEE Brine Shrimp Eggs with hatcher bottle set, all components arranged in organized flat-lay composition, white bottle with feeder accessories, scattered orange brine shrimp eggs creating color accent, baby fish feeding infographic style, clean bright studio lighting, educational product presentation, step-by-step usage suggestion, new parent aquarist aesthetic, friendly approachable branding
```

---

# 3. معالجات المياه والأدوية 💧

## 3.1 YYH-125 | منظف البقع البيضاء 300ml

### برومبت الصورة الرئيسية
```
Medical-grade product photography of YEE White Spot Cleaner 300ml, pharmaceutical presentation style, product positioned on clinical white surface, subtle blue medical cross motif in background, healthy tropical fish in crystal clear water (before/after concept), sterile laboratory lighting, trust and healing mood, product safety seal visible, professional fish medicine advertising, shot on Phase One with 80mm lens
```

### برومبت المقارنة (قبل/بعد)
```
Split-screen product advertisement for YEE White Spot treatment, left side showing sick fish with ich spots in murky water, right side showing same fish healthy in crystal clear water, YEE product bottle centered at division line, dramatic transformation visualization, hope and recovery narrative, veterinary medical advertising quality, clean professional presentation
```

---

## 3.2 YYH-207 | محلول الميثيلين الأزرق 600ml

### برومبت الصورة الرئيسية
```
Dramatic product photography of YEE Methylene Blue Solution 600ml, positioned on laboratory equipment background (flasks, graduated cylinders), deep royal blue liquid visible through bottle, artistic blue liquid drip frozen in motion, scientific medical aesthetic, cool blue lighting scheme, professional aquaculture treatment branding, pharmaceutical grade presentation, shot on Hasselblad with 80mm lens
```

### برومبت علمي
```
Scientific visualization of YEE Methylene Blue molecular structure overlay on product shot, laboratory testing environment, petri dishes and microscope in background bokeh, blue gradient lighting, medical research aesthetic, educational content style, trust-building professional presentation, clean clinical mood
```

---

## 3.3 C2-1016 | بكتيريا نافعة بروبيوتيك 760ml/400ml

### برومبت الصورة الرئيسية
```
Clean product photography of YEE Probiotic Bottle (760ml), positioned alongside thriving planted aquarium with crystal clear water, microscopic bacteria visualization overlay in artistic style, healthy ecosystem narrative, green and blue nature-inspired color palette, fresh clean lighting, product benefit visualization showing balanced aquarium environment, wellness and health aesthetic, shot on Sony A7R V with 85mm lens
```

### برومبت المقارنة
```
Before/after split composition for YEE Probiotic product, left side showing cloudy water with stressed fish, right side showing crystal clear water with vibrant active fish, product positioned at center transition point, transformation success story, scientific backing aesthetic, aquarium wellness branding
```

---

## 3.4 YYH-039 | مزيل الكلور ومثبت المياه 535ml

### برومبت الصورة الرئيسية
```
Essential aquarium product photography of YEE Chlorine Remover and Water Stabilizer 535ml, shown being added to freshly filled aquarium, water droplet splash effect from product application, protective shield visual concept around fish, safety and care narrative, bright optimistic lighting, new aquarium setup scenario, beginner-friendly approachable branding, trust and reliability aesthetic
```

---

## 3.5 YYH-173 | مضاد الإجهاد ومثبت المياه 500ml

### برومبت الصورة الرئيسية
```
Calming product photography of YEE Anti-Stress Water Stabilizer 500ml, serene aquarium environment with relaxed fish behavior, soft diffused lighting creating peaceful atmosphere, lavender and soft blue color accents, zen aquascape background, stress-free wellness aesthetic, gentle product application visualization, spa-like tranquil mood, caring aquarist narrative
```

---

## 3.6 YYH-189 | مبيد الطحالب 500ml

### برومبت الصورة الرئيسية
```
Problem-solving product photography of YEE Algaecide 500ml, dramatic before/after concept with algae-covered tank transforming to crystal clear, product positioned as hero solution, powerful cleaning action visualization, bright clinical lighting, precision targeting concept art, professional maintenance product branding, industrial strength meets aquarium safety aesthetic
```

---

## 3.7 YAN-804/915 | ملح معادن وفيتامينات 500g

### برومبت الصورة الرئيسية
```
Premium mineral product photography of YEE Multivitamin Mineral Salt 500g box, scattered mineral crystals on dark slate surface catching light like gems, tropical saltwater fish in background bokeh (clownfish, tangs), ocean and reef color palette, luxury marine care branding, crystal structure macro detail, health and vitality narrative, shot on Phase One with macro capabilities
```

---

## 3.8 YYH-053 | أزرق الميثيلين الكلاسيكي 235ml

### برومبت مصغر أنيق
```
Classic product photography of YEE Blue Methylene Solution 235ml in signature blue bottle, vintage apothecary aesthetic with modern twist, positioned on aged wood surface, subtle blue liquid glow effect, timeless trusted remedy narrative, nostalgic yet professional branding, warm amber accent lighting, reliable medication aesthetic
```

---

# 4. السخانات 🌡️

## 4.1 YEE-3006/3007/3008 | سخان ستانلس ستيل (50W/100W/200W)

### برومبت الصورة الرئيسية
```
Industrial-grade product photography of YEE Stainless Steel Heater series (50W/100W/200W displayed together), arranged in ascending size order on brushed metal surface, dramatic rim lighting emphasizing polished steel finish, steam/heat wave visual effect rising from heaters, temperature gauge overlay graphics, precision engineering aesthetic, professional aquarium equipment branding, shot on Hasselblad with 80mm lens, f/8
```

### برومبت الفعالية
```
Product demonstration shot of YEE Steel Heater submerged in aquarium, heat gradient visualization with color spectrum (blue cold to red warm), tropical fish comfortably swimming near heater, temperature stability graph overlay, winter protection narrative, reliable heating concept, engineering precision aesthetic, technical product documentation style
```

### برومبت المقارنة (السلسلة الكاملة)
```
Product lineup photography of YEE Steel Heater family: 50W small tank, 100W medium tank, 200W large tank, each paired with corresponding tank size silhouette, clear sizing guide presentation, professional catalog aesthetic, clean comparison layout, buying guide visualization, organized product documentation style
```

---

## 4.2 C4-1432 | سخان كوارتز 100W

### برومبت الصورة الرئيسية
```
Premium product photography of YEE Quartz Heating Rod 100W, translucent quartz tube visible with internal heating element glowing red-orange, artistic heat radiation visualization, positioned in crystal clear planted aquarium, warm lighting emphasizing heating function, advanced technology aesthetic, Japanese quality craftsmanship feel, shot on Sony A1 with 100mm macro
```

---

## 4.3 C4-1103 | سخان بلاك وارير 100W

### برومبت الصورة الرئيسية
```
Powerful product photography of YEE Black Warrior Heater 100W, matte black finish with aggressive design language, positioned on volcanic rock surface, dramatic low-key lighting with red accent highlights, warrior/strength naming reflected in visual treatment, gaming aesthetic crossover, bold masculine branding, stealth technology feel, shot with hard directional lighting
```

---

## 4.4 C4-1117 | سخان مستوى منخفض 30W

### برومبت خزان صغير
```
Compact product photography of YEE Low Water Level Heater 30W, positioned in elegant nano aquarium (5-10 gallon), Betta fish swimming nearby, desktop aquarium lifestyle setting, cozy home office environment in background bokeh, space-efficient design emphasis, small-tank specialist branding, friendly approachable aesthetic, shot on Canon R5 with 35mm lens for environmental context
```

---

# 5. أجهزة القياس والاختبار 🔬

## 5.1 C3-1010 | جهاز اختبار الأمونيا / النيترايت

### برومبت الصورة الرئيسية
```
Scientific product photography of YEE Water Test Kit (Ammonia/Nitrite), laboratory aesthetic with test tubes containing color-graded samples, comparison color chart visible, precision dropper in action, clean clinical lighting, water quality monitoring concept, professional aquaculture testing branding, educational scientific presentation, shot on macro lens with even lighting
```

### برومبت تعليمي
```
Instructional product photography of YEE Test Kit usage demonstration, step-by-step visual guide layout, numbered action sequence, hands performing test with clear results, beginner-friendly presentation, educational content quality, clear easy-to-follow aesthetic, infographic integration ready
```

---

## 5.2 C4-1123 | شرائط اختبار 9 في 1 (50 شريط)

### برومبت الصورة الرئيسية
```
Convenient product photography of YEE 9-in-1 Test Strips bucket, colorful test strip dipped in water showing multiple parameter results, comparison chart prominently displayed, quick-easy-accurate messaging, time-saving convenience narrative, modern efficient aquarium maintenance, bright cheerful lighting, approachable consumer product branding
```

### برومبت استخدام
```
Lifestyle product shot of YEE Test Strips in real aquarium maintenance scenario, aquarist hand holding strip comparing to color chart, beautiful planted tank in background, weekend maintenance routine aesthetic, hobby enjoyment narrative, friendly community feel, natural home lighting, relatable everyday usage
```

---

## 5.3 YEE-3606 | ميزان حرارة إلكتروني خارجي

### برومبت الصورة الرئيسية
```
Modern tech product photography of YEE External Electronic Thermometer, sleek digital display showing precise temperature reading, attached to elegant rimless aquarium, clean minimalist design emphasis, smart home aesthetic, precision monitoring concept, contemporary aquarium technology branding, shot on neutral gradient background with soft reflections
```

---

# 6. مواد الفلترة 🧫

## 6.1 YFF-042 | حلقات سيراميك نانو مختلطة

### برومبت الصورة الرئيسية
```
Close-up product photography of YEE Nano Ceramic Rings mixed pack, various media types artistically arranged (ceramic rings, bio balls, activated carbon), microscopic bacteria colonization visualization overlay, beneficial bacteria concept art, clean water transformation narrative, scientific filtration aesthetic, macro detail shot with studio lighting, f/11 for extended depth of field
```

### برومبت الماكرو
```
Extreme macro photography of YEE ceramic ring porous surface structure, micropore detail visible showing bacteria colonization potential, scientific SEM-style presentation, educational biological content, filter media technology showcase, professional aquaculture research aesthetic
```

---

## 6.2 YLC-409/410 | مواد فلترة 6 في 1 / 16 في 1

### برومبت الصورة الرئيسية
```
Comprehensive product photography of YEE Multi-Stage Filter Media kit (6-in-1 and 16-in-1 versions), layer-by-layer exploded view showing each media type, water flow direction visualization, complete filtration system concept, educational product documentation, professional aquarium equipment catalog style, clean organized presentation
```

---

## 6.3 NYH-006 | مواد فلترة 3D

### برومبت الصورة الرئيسية
```
Innovative product photography of YEE 3D Filter Media, unique three-dimensional structure showcased, water flow through porous material visualization, advanced technology aesthetic, next-generation filtration concept, modern cutting-edge branding, blue gradient background emphasizing water theme, shot with dramatic side lighting revealing 3D texture
```

---

## 6.4 YLL-087 | قطن فلتر 6D أزرق 50×40 سم

### برومبت الصورة الرئيسية
```
Clean product photography of YEE 6D Blue Filter Cotton (50x40cm, 2-pack), layered filter material showing density and structure, water droplet filtration visualization, pure clean water concept, bright blue product color emphasized, mechanical filtration effectiveness, simple reliable aesthetic, practical aquarium maintenance product
```

---

## 6.5 YAA-009 | طوب استزراع عالي الطاقة

### برومبت الصورة الرئيسية
```
Industrial product photography of YEE High Energy Culture Bricks, brick-like bio media stacked in architectural arrangement, beneficial bacteria bloom visualization, nitrogen cycle diagram overlay, heavy-duty filtration concept, professional aquaculture equipment aesthetic, commercial fish farm quality branding
```

---

# 7. معدات التربية والتفريخ 🐣

## 7.1 C4-1008 | صندوق عزل معلق كبير

### برومبت الصورة الرئيسية
```
Caring product photography of YEE Large Suspension Isolation Box, positioned inside planted aquarium, pregnant livebearer fish (guppy/molly) inside box, protective barrier concept, baby fry swimming safely in separated compartment, nurturing breeding success narrative, soft ambient aquarium lighting, life cycle documentation aesthetic
```

---

## 7.2 YSL-506 | مفرخة هوائية مزدوجة كبيرة

### برومبت الصورة الرئيسية
```
Functional product photography of YEE Double Chamber Pneumatic Incubator, air bubbles rising through both chambers, egg hatching process visualization, brine shrimp eggs in one chamber / hatching artemia in other, continuous production concept, efficient breeding equipment branding, professional aquaculture hatchery aesthetic
```

---

## 7.3 YKL-018 | مفرخة أكريليك 20×10×10

### برومبت الصورة الرئيسية
```
Clear product photography of YEE Acrylic Incubator box (20x10x10cm), crystal clear acrylic material showcased, small fish fry swimming inside, positioned on desktop aquarium setup, home breeding success story, transparent viewing advantage emphasized, hobbyist breeding equipment aesthetic, approachable beginner-friendly branding
```

---

# 8. إكسسوارات الحوض 🐠

## 8.1 YGG-135 | موزع فقاعات معدني 50mm

### برومبت الصورة الرئيسية
```
Elegant product photography of YEE 50mm Mineral Ball Bubble Diffuser, fine micro-bubbles rising from diffuser surface, positioned in planted aquarium with backlit bubble column, zen meditation aesthetic, oxygen-rich healthy tank concept, peaceful relaxation mood, soft aquarium lighting, bubble detail frozen in motion
```

---

## 8.2 YTZ-300 | مضخة هواء Xiaobai 3W

### برومبت الصورة الرئيسية
```
Compact product photography of YEE Xiaobai Single-Hole Air Pump 3W, positioned on minimalist desk setup, quiet operation concept with whisper visualiation, nano tank companion product, small form factor emphasized, desktop aquarium lifestyle, modern compact design branding, shot with soft even lighting
```

---

## 8.3 YFF-049/052 | تربة نباتات مائية 1.5L/3L

### برومبت الصورة الرئيسية
```
Natural product photography of YEE Aquatic Plant Soil (fine/coarse grain), rich dark substrate scattered artistically, lush planted aquarium in background, carpet plants and stem plants thriving, Takashi Amano nature aquarium aesthetic, growth and vitality concept, earthy natural color palette, soft ambient planted tank lighting
```

### برومبت النمو
```
Before/after comparison of planted tank with YEE soil substrate, left showing newly planted sparse tank, right showing same tank 3 months later with lush growth, transformation success story, plant growth testimony, nature aquarium journey documentation, inspiring hobbyist content
```

---

## 8.4 CLS-107 | فرشاة تنظيف مغناطيسية كبيرة

### برومبت الصورة الرئيسية
```
Practical product photography of YEE Magnetic Cleaning Brush (large blue), shown in action cleaning aquarium glass, before/after glass clarity visualization, easy maintenance concept, no wet hands convenience, effortless algae removal, practical aquarium tool branding, lifestyle usage demonstration
```

---

## 8.5 PYD-200 | منظف رواسب الحوض 200ml

### برومبت الصورة الرئيسية
```
Problem-solving product photography of YEE Fish Tank Descaling Agent 200ml, dramatic before/after glass clarity transformation, hard water stain removal visualization, crystal clear result emphasis, professional tank maintenance, restoration and renewal concept, cleaning product advertising aesthetic
```

---

## 8.6 YEE-3656/C5-1144 | خرطوم مقوى 16mm

### برومبت الصورة الرئيسية
```
Industrial product photography of YEE Reinforced Tubing coil, flexible yet durable material demonstrated, water flow capability visualization, canister filter setup context, professional aquarium plumbing aesthetic, reliable equipment branding, technical product documentation style
```

---

## 8.7 YEE-3621 | خرطوم هوائي مبطن 1.7m

### برومبت الصورة الرئيسية
```
Durable product photography of YEE Air Tubing with padded wall (1.7m), kink-resistance demonstration, bubble flow visualization inside tube, long-lasting durability concept, quality construction emphasis, reliable air supply branding, practical aquarium accessories aesthetic
```

---

## 8.8 C4-1067 | معالج طبقة الزيت 3W

### برومبت الصورة الرئيسية
```
Clean product photography of YEE 3W Oil Film Processor, surface skimmer in action removing oil film, before/after water surface clarity, crystal clear surface result, elegant nano tank context, surface perfection concept, advanced maintenance equipment branding
```

---

# 9. برومبتات الفيديو والتحريك 🎬

## 9.1 برومبت التحريك الأساسي (Kling/Seedream)

```
A single hand firmly grips the YEE [PRODUCT NAME], fingers wrapped naturally around it. The grip subtly tightens as the wrist makes a quick micro-adjustment showing control and intent.

The arm snaps upward throwing the product forcefully into the air like a solid physical object. The [PRODUCT NAME] travels upward with believable weight and momentum, rotating slightly from the throw force.

At the exact apex of the throw, a brief bullet-time freeze activates. The product hangs suspended mid-air as the camera smoothly orbits around it, revealing:
- Product texture and branding
- Material quality and finish
- YEE logo from multiple angles
- Light interaction and reflections

Lighting is soft studio daylight with rim highlights.

Bullet-time ends instantly. Gravity resumes.

The product drops and impacts on smooth water surface, creating realistic water splash with droplets frozen in motion. Product settles on water, floating perfectly.

Final frame locks into a strong hero shot of [PRODUCT NAME] with aquarium backdrop in soft bokeh, tropical fish swimming past.
Shallow depth of field.
Crisp detail.
Premium aquarium product advertising quality.
```

---

## 9.2 برومبت دوران المنتج (VEO3)

```
Camera slowly orbits 180 degrees around the floating YEE [PRODUCT NAME]. Smooth dolly movement. The product rotates gently as camera circles, revealing all sides and YEE branding. Dramatic rim lighting emphasizes edges and textures. Deep aquarium blue gradient background with subtle caustic light patterns. Professional product showcase quality.
```

---

## 9.3 برومبت الماكرو التفاعلي

```
Extreme macro zoom into YEE [PRODUCT] surface details. Camera pushes forward smoothly, revealing:
- Material texture at microscopic level
- Brand printing quality
- Product craftsmanship details
- Surface finish and coating

Cinematic focus rack from product exterior to interior contents (if applicable). Crystal clear aquarium water droplets on product surface catching light. Professional macro product videography.
```

---

## 9.4 برومبت الاستخدام السينمائي

```
Golden hour lighting streams through window onto beautiful planted aquarium. Hand enters frame holding YEE [PRODUCT], applying/using product with confident expertise. Product interaction creates subtle visual effect (water change, food dispensing, treatment application).

Healthy colorful fish react positively, swimming actively. Camera captures moment of aquarium harmony - fish thriving, plants pearling, crystal clear water.

Warm emotional lighting. Care and nurturing narrative. Premium lifestyle aquarium content quality.
```

---

# 10. إعدادات الترقية (Magnific AI)

## للمنتجات المائية

```
Settings:
- Model: Magnific
- Preset: Low
- Scale: 2x
- Enhancement: Standard Ultra

Sliders:
- Creativity: -3
- HDR: 2
- Resemblance: 3
- Fractality: 0
- Engine: Automatic

Upscale Prompt:
Add micro water droplets, subtle product surface imperfections, realistic material textures, sharp label typography, natural light reflections on packaging.
```

---

# 11. ملاحظات الإنتاج

## 11.1 نصائح عامة

1. **الحفاظ على هوية العلامة التجارية YEE**
   - الشعار يجب أن يكون واضحاً ومقروءاً دائماً
   - استخدم ألوان YEE الرسمية (الأزرق، الأبيض)

2. **الاتساق عبر خطوط المنتجات**
   - نفس أسلوب الإضاءة لمنتجات نفس الفئة
   - خلفيات متسقة لكل سلسلة

3. **التركيز على الفوائد**
   - أظهر المنتج في سياق الاستخدام
   - قبل/بعد للمنتجات العلاجية

## 11.2 قائمة التحقق قبل التوليد

- [ ] اسم المنتج صحيح
- [ ] الحجم/الوزن مذكور
- [ ] شعار YEE مطلوب
- [ ] الخلفية مناسبة للفئة
- [ ] نسبة الأبعاد محددة (4:5 أو 9:16)
- [ ] الإضاءة متوافقة مع الدليل

---

**تم إنشاء هذا الدليل بناءً على:**
- COMPLETE_AI_VISUAL_PRODUCTION_GUIDE.md
- Tim Koda Production Techniques
- معايير تصوير المنتجات 2026

---

> **ملاحظة:** استبدل `[PRODUCT NAME]` و `[PRODUCT]` باسم المنتج الفعلي عند الاستخدام.

---

**الإصدار:** 1.0.0
**تاريخ الإنشاء:** 5 فبراير 2026
**المشروع:** AQUAVO / FIST-LIVE

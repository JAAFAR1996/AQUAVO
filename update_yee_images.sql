-- YEE Product Images Database Update Script
-- Updates thumbnail and images columns to match actual files on disk
-- Generated: 2026-02-19

BEGIN;

-- 1. yee-acrylic-incubator-201010
UPDATE products SET
  thumbnail = '/images/products/yee/yee-acrylic-incubator-201010/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-acrylic-incubator-201010/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-acrylic-incubator-201010/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-acrylic-incubator-201010/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-acrylic-incubator-201010';

-- 2. yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces
UPDATE products SET
  thumbnail = '/images/products/yee/yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces/Make_it_three_4k_202602060318.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces';

-- 3. yee-floating-grain (folder: yee-c1-1065)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1065/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1065/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1065/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1065/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-floating-grain-competition-grade-45-high-protein-15mm-small-particles-300g-bag';

-- 4. yee-c1-1066-shrimp-food
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1066-shrimp-food/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1066-shrimp-food/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1066-shrimp-food/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1066-shrimp-food/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-c1-1066-shrimp-food';

-- 5. yee-c1-1069-sample-pack
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1069-sample-pack/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1069-sample-pack/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1069-sample-pack/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1069-sample-pack/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-c1-1069-sample-pack';

-- 6. yee-betta-fish-food (folder: yee-c1-1073) - has 1 old file remaining
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1073/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1073/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1073/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1073/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c1-1073/betta_premium_1766966225085.png"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-betta-fish-food-08mm-130g-new';

-- 7. yee-all-in-one microparticles (folder: yee-c1-1082-2a)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1082-2a/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1082-2a/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1082-2a/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1082-2a/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-all-in-onemicroparticles02mm210g';

-- 8. yee-freeze-dried-brine-shrimp (folder: yee-c1-1086)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-aquarium-freeze-dried-brine-shrimp-chunks-18g-225ml';

-- 9. yee-small-fish-feed (folder: yee-c1-1113)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-small-fish-feed-all-in-one-06mm-75g';

-- 10. yee-betta-3-in-1 (folder: yee-c1-1124)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (1).jpeg',
  images = '["/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (3).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-brand-3-in-1-betta-fish-food-15g';

-- 11. yee-hermit-crab-food (folder: yee-c1-1125)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-aqua-hermit-crab-freeze-dried-feast-55g';

-- 12. yee-nitrifying-bacteria (folder: yee-c2-1005)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-aquarium-nitrifying-bacteria-probiotics-capsules-50-capsules';

-- 13. yee-ammonia-probiotics (folder: yee-c2-1016)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-aquarium-cleansing-ammonia-series-active-probiotics-760ml';

-- 14. yee-ammonia-nitrogen-tester (folder: yee-c3-1010)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c3-1010/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c3-1010/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c3-1010/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c3-1010/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c3-1010/Make_it_100_4k_202602061417.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-ammonia-nitrogen-testercan-test-about-60-timesaccurate-and-fast-nitrite-test-kitcan-test-about-100-timesaccurate-and-fast';

-- 15. yee-oil-film-processor (folder: yee-c4-1067) - mixed: keep existing + add new
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1067/H80b7b602d18d486b852569c28f35a43f3.png',
  images = '["/images/products/yee/yee-c4-1067/H80b7b602d18d486b852569c28f35a43f3.png", "/images/products/yee/yee-c4-1067/Gemini_Generated_Image_4xmbb94xmbb94xmb.png", "/images/products/yee/yee-c4-1067/Gemini_Generated_Image_8u0x6x8u0x6x8u0x.png", "/images/products/yee/yee-c4-1067/Gemini_Generated_Image_gxbaqbgxbaqbgxba.png", "/images/products/yee/yee-c4-1067/Gemini_Generated_Image_lhlo44lhlo44lhlo.png", "/images/products/yee/yee-c4-1067/_model_gemini25flashimage_4k_20260 (4).jpeg", "/images/products/yee/yee-c4-1067/Translate_the_writings_4k_202602061538.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-3w-oil-film-processor';

-- 16. yee-black-warrior-heater (folder: yee-c4-1103)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1103/_model_gemini25flashimage_4k_20260 (5).jpeg',
  images = '["/images/products/yee/yee-c4-1103/_model_gemini25flashimage_4k_20260 (5).jpeg", "/images/products/yee/yee-c4-1103/_model_gemini25flashimage_4k_20260 (6).jpeg", "/images/products/yee/yee-c4-1103/Translate_to_arabic_4k_202602061743.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-black-warrior-heater-100w';

-- 17. yee-9-in-1-test-kit (folder: yee-c4-1123-1a)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260 (3).jpeg", "/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260 (4).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-novice-level-50-9-in-1bucketwith-comparison-chart';

-- 18. yee-quartz-heater (folder: yee-c4-1432)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c4-1432/Translate_it_to_4k_202602071303.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-brand-aquarium-quartz-heating-rod-100w';

-- 19. yee-magnetic-brush (folder: yee-cls-107-magnetic-brush)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-cls-107-magnetic-brush/_model_gemini25flashimage_4k_20260 (3).jpeg',
  images = '["/images/products/yee/yee-cls-107-magnetic-brush/_model_gemini25flashimage_4k_20260 (3).jpeg", "/images/products/yee/yee-cls-107-magnetic-brush/_model_gemini25flashimage_4k_20260 (4).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-cls-107-magnetic-brush';

-- 20. yee-high-energy-culture-bricks
UPDATE products SET
  thumbnail = '/images/products/yee/yee-high-energy-culture-bricks/_model_gemini25flashimage_4k_20260 (8).jpeg',
  images = '["/images/products/yee/yee-high-energy-culture-bricks/_model_gemini25flashimage_4k_20260 (8).jpeg", "/images/products/yee/yee-high-energy-culture-bricks/_model_gemini25flashimage_4k_20260 (9).jpeg", "/images/products/yee/yee-high-energy-culture-bricks/_model_gemini25flashimage_4k_20260 (10).jpeg", "/images/products/yee/yee-high-energy-culture-bricks/_model_gemini25flashimage_4k_20260 (11).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-high-energy-culture-bricks';

-- 21. yee-3d-filter-material (folder: yee-nyh-006) - completely new images
UPDATE products SET
  thumbnail = '/images/products/yee/yee-nyh-006/82fem2np31rmy0cw6ysb12nytc.png',
  images = '["/images/products/yee/yee-nyh-006/82fem2np31rmy0cw6ysb12nytc.png", "/images/products/yee/yee-nyh-006/dp1992srv9rmr0cw6yraangw2c.png", "/images/products/yee/yee-nyh-006/dp1992srv9rmr0cw6yraangw2c (1).png", "/images/products/yee/yee-nyh-006/xfyk8zwb09rmt0cw6yrbjfz4gc.png", "/images/products/yee/yee-nyh-006/yxcfpc7d4srmr0cw6yr9qvjw7r.png"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-3d-filter-material';

-- 22. yee-descaling-agent (folder: yee-pyd-200)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-pyd-200/_model_gemini25flashimage_4k_20260 (33).jpeg',
  images = '["/images/products/yee/yee-pyd-200/_model_gemini25flashimage_4k_20260 (33).jpeg", "/images/products/yee/yee-pyd-200/_model_gemini25flashimage_4k_20260 (34).jpeg", "/images/products/yee/yee-pyd-200/_model_gemini25flashimage_4k_20260 (35).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-fish-tank-descaling-agent-200ml';

-- 23. yee-tubing (folder: yee-reinforced-tube)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-reinforced-tube/_model_gemini25flashimage_4k_20260 (32).jpeg',
  images = '["/images/products/yee/yee-reinforced-tube/_model_gemini25flashimage_4k_20260 (32).jpeg", "/images/products/yee/yee-reinforced-tube/Change_the_other_4k_202602091926.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-3656-tubing';

-- 24. yee-multivitamin-salt-500g (folder: yee-yan-804)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yan-804/_model_gemini25flashimage_4k_20260 (4).jpeg',
  images = '["/images/products/yee/yee-yan-804/_model_gemini25flashimage_4k_20260 (4).jpeg", "/images/products/yee/yee-yan-804/_model_gemini25flashimage_4k_20260 (5).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-multivitamin-mineral-salt-500g';

-- 25. yee-multivitamin-salt-yan-915 (folder: yee-yan-915)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yan-915/_model_gemini25flashimage_4k_20260 (6).jpeg',
  images = '["/images/products/yee/yee-yan-915/_model_gemini25flashimage_4k_20260 (6).jpeg", "/images/products/yee/yee-yan-915/_model_gemini25flashimage_4k_20260 (7).jpeg", "/images/products/yee/yee-yan-915/Remove_the_bag_4k_202602091218.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-500g-multivitamin-salt-box-yan-915';

-- 26. yee-nano-culture-ring (folder: yee-yff-042)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (12).jpeg',
  images = '["/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (12).jpeg", "/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (13).jpeg", "/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (14).jpeg", "/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (15).jpeg", "/images/products/yee/yee-yff-042/Beneficial_bacteria_colonization_4k_202602091.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-nano-culture-ring-mixed-pack';

-- 27. yee-6-in-1-filter (folder: yee-ylc-409)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ylc-409/_model_gemini25flashimage_4k_20260 (19).jpeg',
  images = '["/images/products/yee/yee-ylc-409/_model_gemini25flashimage_4k_20260 (19).jpeg", "/images/products/yee/yee-ylc-409/_model_gemini25flashimage_4k_20260 (20).jpeg", "/images/products/yee/yee-ylc-409/Translate_into_arabic_4k_202602091405.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-six-in-one-filter-material-500g';

-- 28. yee-16-in-1-filter (folder: yee-ylc-410)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ylc-410/Translate_it_into_4k_202602091413.jpeg',
  images = '["/images/products/yee/yee-ylc-410/Translate_it_into_4k_202602091413.jpeg", "/images/products/yee/yee-ylc-410/Translate_into_arabic_4k_202602091416.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-16-in-1-filter-material-25kg';

-- 29. yee-pneumatic-incubator (folder: yee-ysl-506) - mixed
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ysl-506/H0267f4a67d47412fb7efbf41fe4febbab.png',
  images = '["/images/products/yee/yee-ysl-506/H0267f4a67d47412fb7efbf41fe4febbab.png", "/images/products/yee/yee-ysl-506/Aa924fd34a4c64911bcf3cb85ac8c626aX.jpg", "/images/products/yee/yee-ysl-506/H970574f0c765471fae8401a441d21e5d7.png", "/images/products/yee/yee-ysl-506/_model_gemini25flashimage_4k_20260 (29).jpeg", "/images/products/yee/yee-ysl-506/_model_gemini25flashimage_4k_20260 (30).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-large-pneumatic-incubator-double-room';

-- 30. yee-oxygen-pump (folder: yee-ytz-300)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (25).jpeg',
  images = '["/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (25).jpeg", "/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (26).jpeg", "/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (27).jpeg", "/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (28).jpeg", "/images/products/yee/yee-ytz-300/At_the_bottom_4k_202602091620.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-xiaobai-single-hole-oxygen-pump-3w-non-adjustable-ytz-300';

-- 31. yee-mineral-bubble-diffuser (folder: yee-ygg-135)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (21).jpeg',
  images = '["/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (21).jpeg", "/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (22).jpeg", "/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (23).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-50mm-ball-mineral-bubble-diffuser';

-- 32. yee-chlorine-removal (folder: yee-yyh-039) - mixed
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-039/Gemini_Generated_Image_8pjzhr8pjzhr8pjz.png',
  images = '["/images/products/yee/yee-yyh-039/Gemini_Generated_Image_8pjzhr8pjzhr8pjz.png", "/images/products/yee/yee-yyh-039/_model_gemini25flashimage_4k_20260 (3).jpeg", "/images/products/yee/yee-yyh-039/_model_gemini25flashimage_4k_20260 (4).jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-yee-blue-classic-chlorine-removal-water-stabilizer-535ml';

-- 33. yee-anti-stress (folder: yee-yyh-173)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-173/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-yyh-173/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-yyh-173/Make_this_suitable_4k_202602081927.jpeg", "/images/products/yee/yee-yyh-173/Translated_into_arabic_4k_202602082050.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-anti-stress-water-stabilizer';

-- 34. yee-algaecide (folder: yee-yyh-189)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-189/_model_gemini25flashimage_4k_20260 (3).jpeg',
  images = '["/images/products/yee/yee-yyh-189/_model_gemini25flashimage_4k_20260 (3).jpeg", "/images/products/yee/yee-yyh-189/From_the_second_4k_202602082107.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-algaecide-500ml-new-style';

-- 35. yee-methylene-blue-600ml (folder: yee-yyh-207)
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-207/_model_gemini25flashimage_4k_20260 (5).jpeg',
  images = '["/images/products/yee/yee-yyh-207/_model_gemini25flashimage_4k_20260 (5).jpeg", "/images/products/yee/yee-yyh-207/Regarding_the_writings_4k_202602090516.jpeg", "/images/products/yee/yee-yyh-207/Wipe_the_betta_4k_202602090520.jpeg"]'::jsonb,
  updated_at = now()
WHERE id = 'yee-methylene-blue-solution-600ml';

COMMIT;

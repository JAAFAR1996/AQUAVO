-- =====================================================
-- تحديث صور YEE - الجزء 2 (26 منتج)
-- =====================================================

-- 28. yee-led-318-light → بدون صور (لا يوجد مجلد)
UPDATE products SET
  thumbnail = '',
  images = '[]'::jsonb
WHERE id = 'yee-led-318-light';

-- 29. yee-methylene-blue-solution-600ml → yee-yyh-207
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-207/_model_gemini25flashimage_4k_20260 (5).jpeg',
  images = '["/images/products/yee/yee-yyh-207/_model_gemini25flashimage_4k_20260 (5).jpeg", "/images/products/yee/yee-yyh-207/Regarding_the_writings_4k_202602090516.jpeg", "/images/products/yee/yee-yyh-207/Wipe_the_betta_4k_202602090520.jpeg"]'::jsonb
WHERE id = 'yee-methylene-blue-solution-600ml';

-- 30. yee-multivitamin-mineral-salt-500g → yee-yan-804
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yan-804/_model_gemini25flashimage_4k_20260 (4).jpeg',
  images = '["/images/products/yee/yee-yan-804/_model_gemini25flashimage_4k_20260 (4).jpeg", "/images/products/yee/yee-yan-804/_model_gemini25flashimage_4k_20260 (5).jpeg"]'::jsonb
WHERE id = 'yee-multivitamin-mineral-salt-500g';

-- 31. yee-nano-culture-ring-mixed-pack → yee-yff-042
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (12).jpeg',
  images = '["/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (12).jpeg", "/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (13).jpeg", "/images/products/yee/yee-yff-042/_model_gemini25flashimage_4k_20260 (14).jpeg", "/images/products/yee/yee-yff-042/Beneficial_bacteria_colonization_4k_202602091.jpeg"]'::jsonb
WHERE id = 'yee-nano-culture-ring-mixed-pack';

-- 32. yee-new-shelled-eggs-140g
UPDATE products SET
  thumbnail = '/images/products/yee/yee-new-shelled-eggs-140g-200ml-white-bottle-feeder/Gemini_Generated_Image_rh0d6nrh0d6nrh0d.png',
  images = '["/images/products/yee/yee-new-shelled-eggs-140g-200ml-white-bottle-feeder/Gemini_Generated_Image_rh0d6nrh0d6nrh0d.png", "/images/products/yee/yee-new-shelled-eggs-140g-200ml-white-bottle-feeder/Gemini_Generated_Image_pf298spf298spf29.png", "/images/products/yee/yee-new-shelled-eggs-140g-200ml-white-bottle-feeder/artemia_45_angle_1766974692506.png", "/images/products/yee/yee-new-shelled-eggs-140g-200ml-white-bottle-feeder/artemia_closeup_1766974736833.png"]'::jsonb
WHERE id = 'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder';

-- 33. yee-novice-level-50-9-in-1 → yee-c4-1123-1a
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260 (3).jpeg", "/images/products/yee/yee-c4-1123-1a/_model_gemini25flashimage_4k_20260 (4).jpeg"]'::jsonb
WHERE id = 'yee-novice-level-50-9-in-1bucketwith-comparison-chart';

-- 34. yee-refill9-in-1 → yee-c4-1123-2a
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1123-2a/Gemini_Generated_Image_uwcbbhuwcbbhuwcb.png',
  images = '["/images/products/yee/yee-c4-1123-2a/Gemini_Generated_Image_uwcbbhuwcbbhuwcb.png", "/images/products/yee/yee-c4-1123-2a/Hf0bb47e7bf69484d820880639680f208u.jpg", "/images/products/yee/yee-c4-1123-2a/H53c3fb12cf68461d8b90533eeff0de294.jpg"]'::jsonb
WHERE id = 'yee-refill9-in-1refill50-pieces';

-- 35. yee-six-in-one-filter-material-500g → yee-ylc-409
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ylc-409/_model_gemini25flashimage_4k_20260 (19).jpeg',
  images = '["/images/products/yee/yee-ylc-409/_model_gemini25flashimage_4k_20260 (19).jpeg", "/images/products/yee/yee-ylc-409/_model_gemini25flashimage_4k_20260 (20).jpeg", "/images/products/yee/yee-ylc-409/Translate_into_arabic_4k_202602091405.jpeg"]'::jsonb
WHERE id = 'yee-six-in-one-filter-material-500g';

-- 36. yee-steel-heater → YEE-3006
UPDATE products SET
  thumbnail = '/images/products/yee/YEE-3006/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/YEE-3006/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/YEE-3006/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/YEE-3006/1.jpeg", "/images/products/yee/YEE-3006/2 (1).jpeg", "/images/products/yee/YEE-3006/2 (2).jpeg"]'::jsonb
WHERE id = 'yee-steel-heater';

-- 37. yee-tank-601515 → بدون صور (لا يوجد مجلد)
UPDATE products SET
  thumbnail = '',
  images = '[]'::jsonb
WHERE id = 'yee-tank-601515';

-- 38. yee-water-grass-mud → yee-yff-049
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yff-049/He8c97e453c0e40c5b39893aa5c04486aA.png',
  images = '["/images/products/yee/yee-yff-049/He8c97e453c0e40c5b39893aa5c04486aA.png", "/images/products/yee/yee-yff-049/Gemini_Generated_Image_5qz32m5qz32m5qz3.png", "/images/products/yee/yee-yff-049/Ha0ff399e58c94123842aaf69b9fac55fH.png", "/images/products/yee/yee-yff-049/H2235ee3ec72f438fb91f01d80d447b5bf.png"]'::jsonb
WHERE id = 'yee-water-grass-mud';

-- 39. yee-white-spot-cleaner-300ml → yee-yyh-125
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-125/Gemini_Generated_Image_1d370x1d370x1d37.png',
  images = '["/images/products/yee/yee-yyh-125/Gemini_Generated_Image_1d370x1d370x1d37.png", "/images/products/yee/yee-yyh-125/Gemini_Generated_Image_z7zc9uz7zc9uz7zc.png", "/images/products/yee/yee-yyh-125/Gemini_Generated_Image_f8qrrvf8qrrvf8qr.png"]'::jsonb
WHERE id = 'yee-white-spot-cleaner-300ml';

-- 40. yee-xiaobai-oxygen-pump → yee-ytz-300
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (25).jpeg',
  images = '["/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (25).jpeg", "/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (26).jpeg", "/images/products/yee/yee-ytz-300/_model_gemini25flashimage_4k_20260 (27).jpeg", "/images/products/yee/yee-ytz-300/At_the_bottom_4k_202602091620.jpeg"]'::jsonb
WHERE id = 'yee-xiaobai-single-hole-oxygen-pump-3w-non-adjustable-ytz-300';

-- 41. yee-yee-50mm-ball-mineral-bubble → yee-ygg-135
UPDATE products SET
  thumbnail = '/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (21).jpeg',
  images = '["/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (21).jpeg", "/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (22).jpeg", "/images/products/yee/yee-ygg-135/_model_gemini25flashimage_4k_20260 (23).jpeg"]'::jsonb
WHERE id = 'yee-yee-50mm-ball-mineral-bubble-diffuser';

-- 42. yee-hermit-crab-feast → yee-c1-1125
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1125/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb
WHERE id = 'yee-yee-aqua-hermit-crab-freeze-dried-feast-55g';

-- 43. yee-ammonia-probiotics-760ml → yee-c2-1016
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c2-1016/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb
WHERE id = 'yee-yee-aquarium-cleansing-ammonia-series-active-probiotics-760ml';

-- 44. yee-freeze-dried-brine-shrimp → yee-c1-1086
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1086/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb
WHERE id = 'yee-yee-aquarium-freeze-dried-brine-shrimp-chunks-18g-225ml';

-- 45. yee-bacteria-capsules → yee-c2-1005
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c2-1005/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb
WHERE id = 'yee-yee-aquarium-nitrifying-bacteria-probiotics-capsules-50-capsules';

-- 46. yee-black-warrior-heater → yee-c4-1103
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1103/_model_gemini25flashimage_4k_20260 (5).jpeg',
  images = '["/images/products/yee/yee-c4-1103/_model_gemini25flashimage_4k_20260 (5).jpeg", "/images/products/yee/yee-c4-1103/_model_gemini25flashimage_4k_20260 (6).jpeg", "/images/products/yee/yee-c4-1103/Translate_to_arabic_4k_202602061743.jpeg"]'::jsonb
WHERE id = 'yee-yee-black-warrior-heater-100w';

-- 47. yee-chlorine-removal → yee-yyh-039
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-039/_model_gemini25flashimage_4k_20260 (3).jpeg',
  images = '["/images/products/yee/yee-yyh-039/_model_gemini25flashimage_4k_20260 (3).jpeg", "/images/products/yee/yee-yyh-039/_model_gemini25flashimage_4k_20260 (4).jpeg", "/images/products/yee/yee-yyh-039/Gemini_Generated_Image_8pjzhr8pjzhr8pjz.png"]'::jsonb
WHERE id = 'yee-yee-blue-classic-chlorine-removal-water-stabilizer-535ml';

-- 48. yee-methylene-blue-235ml → yee-yyh-053
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyh-053/Gemini_Generated_Image_20oi0v20oi0v20oi.png',
  images = '["/images/products/yee/yee-yyh-053/Gemini_Generated_Image_20oi0v20oi0v20oi.png", "/images/products/yee/yee-yyh-053/Gemini_Generated_Image_80i77280i77280i7.png"]'::jsonb
WHERE id = 'yee-yee-blue-classic-methylene-blue-solution-235ml';

-- 49. yee-betta-3in1-15g → yee-c1-1124
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (1).jpeg',
  images = '["/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c1-1124/_model_gemini25flashimage_4k_20260 (3).jpeg"]'::jsonb
WHERE id = 'yee-yee-brand-3-in-1-betta-fish-food-15g';

-- 50. yee-quartz-heater → yee-c4-1432
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c4-1432/_model_gemini25flashimage_4k_20260 (2).jpeg", "/images/products/yee/yee-c4-1432/Translate_it_to_4k_202602071303.jpeg"]'::jsonb
WHERE id = 'yee-yee-brand-aquarium-quartz-heating-rod-100w';

-- 51. yee-small-fish-feed-06mm → yee-c1-1113
UPDATE products SET
  thumbnail = '/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260.jpeg',
  images = '["/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260.jpeg", "/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260 (1).jpeg", "/images/products/yee/yee-c1-1113/_model_gemini25flashimage_4k_20260 (2).jpeg"]'::jsonb
WHERE id = 'yee-yee-small-fish-feed-all-in-one-06mm-75g';

-- 52. yee-yyh-006-antibacterial → بدون صور (لا يوجد مجلد)
UPDATE products SET
  thumbnail = '',
  images = '[]'::jsonb
WHERE id = 'yee-yyh-006-antibacterial';

-- 53. yee-yyy-078-brine-shrimp-eggs
UPDATE products SET
  thumbnail = '/images/products/yee/yee-yyy-078-brine-shrimp-eggs/Gemini_Generated_Image_rh0d6nrh0d6nrh0d.png',
  images = '["/images/products/yee/yee-yyy-078-brine-shrimp-eggs/Gemini_Generated_Image_rh0d6nrh0d6nrh0d.png", "/images/products/yee/yee-yyy-078-brine-shrimp-eggs/Gemini_Generated_Image_pf298spf298spf29.png", "/images/products/yee/yee-yyy-078-brine-shrimp-eggs/artemia_45_angle_1766974692506.png", "/images/products/yee/yee-yyy-078-brine-shrimp-eggs/artemia_closeup_1766974736833.png"]'::jsonb
WHERE id = 'yee-yyy-078-brine-shrimp-eggs';

-- تحديث تكاليف المنتجات — شراء د = cost_price | شحن/ق = packaging_cost | خشب = insert_cost
-- شغّل هذا في Neon Console → SQL Editor

-- سخانات
UPDATE products SET cost_price = 3768, packaging_cost = 3177, insert_cost = 0 WHERE name ILIKE '%50W pure steel heating rod%' OR name ILIKE '%YSH-50%';
UPDATE products SET cost_price = 3896, packaging_cost = 3266, insert_cost = 0 WHERE name ILIKE '%100W pure steel heating rod%' OR name ILIKE '%YSH-100%';
UPDATE products SET cost_price = 3918, packaging_cost = 3266, insert_cost = 0 WHERE name ILIKE '%200W pure steel heating rod%' OR name ILIKE '%YSH-200%';
UPDATE products SET cost_price = 14835, packaging_cost = 3292, insert_cost = 0 WHERE name ILIKE '%quartz heating rod%' AND name ILIKE '%100%';
UPDATE products SET cost_price = 5352, packaging_cost = 3248, insert_cost = 0 WHERE name ILIKE '%Black Warrior Heater%' OR name ILIKE '%Black Warrior%100W%';

-- فلتر / هواء
UPDATE products SET cost_price = 1777, packaging_cost = 3106, insert_cost = 0 WHERE name ILIKE '%Xiaobai%oxygen pump%' OR name ILIKE '%single-hole oxygen pump%';
UPDATE products SET cost_price = 3967, packaging_cost = 3168, insert_cost = 0 WHERE name ILIKE '%3W oil film processor%' OR name ILIKE '%oil film%';

-- فيتامين / هواء
UPDATE products SET cost_price = 2371, packaging_cost = 3106, insert_cost = 0 WHERE name ILIKE '%50mm Ball Mineral Bubble Diffuser%' OR name ILIKE '%Ball Mineral Bubble%';

-- إكسسوارات
UPDATE products SET cost_price = 557,  packaging_cost = 3062, insert_cost = 0 WHERE name ILIKE '%1.5 meters%thickened%' OR name ILIKE '%Enhanced version 1.5%';
UPDATE products SET cost_price = 1392, packaging_cost = 3195, insert_cost = 0 WHERE name ILIKE '%1.7 meter%airbag%' OR name ILIKE '%Thickened airbag%';
UPDATE products SET cost_price = 4068, packaging_cost = 3168, insert_cost = 0 WHERE name ILIKE '%Large suspended isolation box%';
UPDATE products SET cost_price = 1505, packaging_cost = 3168, insert_cost = 0 WHERE name ILIKE '%pneumatic incubator%double%' OR name ILIKE '%Large pneumatic incubator%';
UPDATE products SET cost_price = 4347, packaging_cost = 3257, insert_cost = 0 WHERE name ILIKE '%Acrylic incubator%20%10%';
UPDATE products SET cost_price = 0,    packaging_cost = 3230, insert_cost = 0 WHERE name ILIKE '%three-color adjustable%3.5W%' OR name ILIKE '%Yee%3.5W%double-row%';
UPDATE products SET cost_price = 0,    packaging_cost = 3700, insert_cost = 0 WHERE name ILIKE '%magnetic cleaning brush%large%';
UPDATE products SET cost_price = 1672, packaging_cost = 1534, insert_cost = 0 WHERE name ILIKE '%electronic thermometer%' OR name ILIKE '%External%thermometer%';

-- مكنسة تنظيف
UPDATE products SET cost_price = 12588, packaging_cost = 3780, insert_cost = 0 WHERE name ILIKE '%30W low water level%' OR name ILIKE '%High configuration 30W%';

-- فلتر (مواد بيولوجية)
UPDATE products SET cost_price = 4624, packaging_cost = 3257, insert_cost = 0 WHERE name ILIKE '%6D filter cotton%' OR name ILIKE '%New upgraded 6D%';
UPDATE products SET cost_price = 1991, packaging_cost = 3611, insert_cost = 0 WHERE name ILIKE '%Nano Culture Ring%';
UPDATE products SET cost_price = 1262, packaging_cost = 3345, insert_cost = 0 WHERE name ILIKE '%High energy culture bricks%';
UPDATE products SET cost_price = 2538, packaging_cost = 3514, insert_cost = 0 WHERE name ILIKE '%3D filter material%';
UPDATE products SET cost_price = 3961, packaging_cost = 5207, insert_cost = 0 WHERE name ILIKE '%16-in-1 filter material%' OR name ILIKE '%filter material%2.5kg%';
UPDATE products SET cost_price = 1477, packaging_cost = 3523, insert_cost = 0 WHERE name ILIKE '%Six-in-one filter material%' OR name ILIKE '%filter material%500g%';

-- أحواض
UPDATE products SET cost_price = 9548,  packaging_cost = 8132,  insert_cost = 6188  WHERE name ILIKE '%400x230x250%' OR name ILIKE '%400*230*250%';
UPDATE products SET cost_price = 14793, packaging_cost = 12565, insert_cost = 8214  WHERE name ILIKE '%500x270x300%' OR name ILIKE '%500*270*300%';
UPDATE products SET cost_price = 19032, packaging_cost = 16288, insert_cost = 7351  WHERE name ILIKE '%600x300x350%' OR name ILIKE '%600*300*350%';
UPDATE products SET cost_price = 13059, packaging_cost = 13097, insert_cost = 5044  WHERE name ILIKE '%35%35%35%6mm%' OR (name ILIKE '%35×35%' AND name ILIKE '%6mm%');
UPDATE products SET cost_price = 17555, packaging_cost = 16022, insert_cost = 6781  WHERE name ILIKE '%40X40X40%' OR name ILIKE '%40x40x40%' OR name ILIKE '%40*40*40%';
UPDATE products SET cost_price = 27617, packaging_cost = 20632, insert_cost = 10667 WHERE name ILIKE '%60%40%40%8mm%' OR (name ILIKE '%60*40*40%' AND name ILIKE '%8mm%');
UPDATE products SET cost_price = 26290, packaging_cost = 7902,  insert_cost = 5155  WHERE name ILIKE '%60%15%15%' OR name ILIKE '%side stream%60%';
UPDATE products SET cost_price = 3633,  packaging_cost = 6441,  insert_cost = 0     WHERE name ILIKE '%Water grass mud%coarse%3K%' OR name ILIKE '%coarse%3%kg%mud%';
UPDATE products SET cost_price = 1156,  packaging_cost = 1906,  insert_cost = 0     WHERE name ILIKE '%descaling agent%' OR name ILIKE '%Fish tank descal%';

-- غذاء
UPDATE products SET cost_price = 958,  packaging_cost = 1648, insert_cost = 0 WHERE name ILIKE '%Yee Small Fish Feed%0.6mm%' OR name ILIKE '%All-in-One%0.6mm%75g%';
UPDATE products SET cost_price = 2736, packaging_cost = 2087, insert_cost = 0 WHERE name ILIKE '%Goldfish Orchid Longevity%' OR name ILIKE '%Orchid Longevity Jade%';
UPDATE products SET cost_price = 1474, packaging_cost = 1729, insert_cost = 0 WHERE name ILIKE '%Betta fish food%0.8mm%' OR name ILIKE '%Betta%130g%';
UPDATE products SET cost_price = 2052, packaging_cost = 1713, insert_cost = 0 WHERE name ILIKE '%Imitation red worm%' OR name ILIKE '%red worm feed%';
UPDATE products SET cost_price = 1307, packaging_cost = 2087, insert_cost = 0 WHERE name ILIKE '%Floating Grain%Competition Grade%' OR name ILIKE '%45% High%Floating%';
UPDATE products SET cost_price = 2584, packaging_cost = 1583, insert_cost = 0 WHERE name ILIKE '%40% High Protein%Ornamental%' OR name ILIKE '%High Protein%Special Food%';
UPDATE products SET cost_price = 2508, packaging_cost = 1697, insert_cost = 0 WHERE name ILIKE '%Shelled Eggs%80g%' OR name ILIKE '%New Shelled Eggs%';
UPDATE products SET cost_price = 1930, packaging_cost = 1664, insert_cost = 0 WHERE name ILIKE '%Hermit Crab%Freeze-Dried%' OR name ILIKE '%Aqua-Hermit Crab%';
UPDATE products SET cost_price = 0,    packaging_cost = 1583, insert_cost = 0 WHERE name ILIKE '%coated paper hanger%' OR name ILIKE '%Fish feed%hanger%';
UPDATE products SET cost_price = 1581, packaging_cost = 1859, insert_cost = 0 WHERE name ILIKE '%Microparticles%0.2mm%210g%' OR name ILIKE '%All-in-one%0.2mm%';
UPDATE products SET cost_price = 2569, packaging_cost = 2087, insert_cost = 0 WHERE name ILIKE '%Ranchu goldfish%1.5mm%' OR name ILIKE '%Ranchu%formulated%';
UPDATE products SET cost_price = 1368, packaging_cost = 1583, insert_cost = 0 WHERE name ILIKE '%Freeze-dried Brine Shrimp%' OR name ILIKE '%Brine Shrimp Chu%';
UPDATE products SET cost_price = 730,  packaging_cost = 1551, insert_cost = 0 WHERE name ILIKE '%3-in-1 Betta Fish Food%15g%' OR name ILIKE '%Betta%15g%';
UPDATE products SET cost_price = 1870, packaging_cost = 4020, insert_cost = 0 WHERE name ILIKE '%Water grass mud%fine%1.5%' OR name ILIKE '%mud%fine%1.5K%';
UPDATE products SET cost_price = 0,    packaging_cost = 1794, insert_cost = 0 WHERE name ILIKE '%Cherlam%slow-sinking%' OR name ILIKE '%slow-sinking%130g%';

-- علاج
UPDATE products SET cost_price = 1092, packaging_cost = 2054, insert_cost = 0 WHERE name ILIKE '%White Spot Cleaner%300ml%';
UPDATE products SET cost_price = 1414, packaging_cost = 2590, insert_cost = 0 WHERE name ILIKE '%Methylene blue solution%600ml%' OR name ILIKE '%Methylene blue%600%';
UPDATE products SET cost_price = 1718, packaging_cost = 1583, insert_cost = 0 WHERE name ILIKE '%Bactericidal%antibacterial%instant%' OR name ILIKE '%antibacterial%powder%';
UPDATE products SET cost_price = 684,  packaging_cost = 1859, insert_cost = 0 WHERE name ILIKE '%Yee Blue Classic%Methylene Blue%' OR name ILIKE '%Blue Classic%Methylene%';

-- كيماوي
UPDATE products SET cost_price = 3557, packaging_cost = 2899, insert_cost = 0 WHERE name ILIKE '%Cleansing Ammonia%760%' OR name ILIKE '%Acti%760%';
UPDATE products SET cost_price = 2098, packaging_cost = 2363, insert_cost = 0 WHERE name ILIKE '%Cleansing Ammonia%400%' OR name ILIKE '%Acti%400%';
UPDATE products SET cost_price = 1094, packaging_cost = 2493, insert_cost = 0 WHERE name ILIKE '%Chlorine Removal%' OR name ILIKE '%Yee Blue Classic%Chlorine%';
UPDATE products SET cost_price = 1392, packaging_cost = 2477, insert_cost = 0 WHERE name ILIKE '%Anti-stress water stabilizer%500ml%';
UPDATE products SET cost_price = 1713, packaging_cost = 2574, insert_cost = 0 WHERE name ILIKE '%Anti-stress water stabilizer%1000ml%';
UPDATE products SET cost_price = 1292, packaging_cost = 1599, insert_cost = 0 WHERE name ILIKE '%Nitrifying Bacteria%50%' AND (name ILIKE '%50G%' OR name ILIKE '%50ML%' OR name ILIKE '% 50%');
UPDATE products SET cost_price = 1930, packaging_cost = 1648, insert_cost = 0 WHERE name ILIKE '%Nitrifying Bacteria%100%' AND (name ILIKE '%100G%' OR name ILIKE '%100ML%' OR name ILIKE '% 100%');
UPDATE products SET cost_price = 1392, packaging_cost = 2412, insert_cost = 0 WHERE name ILIKE '%Algaecide%500ml%';
UPDATE products SET cost_price = 304,  packaging_cost = 2347, insert_cost = 0 WHERE name ILIKE '%Multivitamin mineral salt%500g%' AND name NOT ILIKE '%box%' AND name NOT ILIKE '%YAN%';
UPDATE products SET cost_price = 1322, packaging_cost = 2428, insert_cost = 0 WHERE name ILIKE '%Multivitamin Salt Box%' OR name ILIKE '%YAN-915%';
UPDATE products SET cost_price = 1611, packaging_cost = 1551, insert_cost = 0 WHERE name ILIKE '%9 in 1%Refill%' OR name ILIKE '%Refill%50 pieces%';

-- اختبار
UPDATE products SET cost_price = 4362, packaging_cost = 2330, insert_cost = 0 WHERE name ILIKE '%Ammonia nitrogen tester%' OR name ILIKE '%ammonia%tester%60%';
UPDATE products SET cost_price = 4362, packaging_cost = 2330, insert_cost = 0 WHERE name ILIKE '%Nitrite test kit%' OR name ILIKE '%Nitrite%100 times%';
UPDATE products SET cost_price = 2462, packaging_cost = 1632, insert_cost = 0 WHERE name ILIKE '%9-in-1%Bucket%' OR name ILIKE '%Novice%50%9-in-1%';

-- التحقق — شوف كم منتج اتحدث بتكلفة غير صفرية
SELECT COUNT(*) AS updated_products FROM products
WHERE (cost_price > 0 OR packaging_cost > 0) AND deleted_at IS NULL;

-- عرض النتائج
SELECT name, cost_price, packaging_cost, insert_cost
FROM products
WHERE (cost_price > 0 OR packaging_cost > 0) AND deleted_at IS NULL
ORDER BY name;
